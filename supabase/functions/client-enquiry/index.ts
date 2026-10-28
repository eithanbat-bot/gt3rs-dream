import { createClient } from "npm:@supabase/supabase-js@2.95.0";
const base={"Access-Control-Allow-Methods":"POST,OPTIONS","Access-Control-Allow-Headers":"content-type","Vary":"Origin","Content-Type":"application/json","Cache-Control":"no-store"};
const respond=(d:unknown,s:number,origin:string)=>new Response(JSON.stringify(d),{status:s,headers:{...base,"Access-Control-Allow-Origin":origin}});
const clean=(v:any,max:number)=>typeof v==="string"?v.trim().slice(0,max):"";
Deno.serve(async(req:Request)=>{
const origin=req.headers.get("origin")||"";
if(req.method==="OPTIONS")return new Response(null,{status:204,headers:{...base,"Access-Control-Allow-Origin":origin}});
if(req.method!=="POST")return respond({error:"Method not allowed"},405,"null");
const raw=await req.text();if(raw.length>8000)return respond({error:"Payload too large"},413,"null");
let body:any;try{body=JSON.parse(raw)}catch{return respond({error:"Invalid request"},400,"null");}
const token=clean(body?.workspace_token,64);
if(!/^[a-f0-9-]{36}$/i.test(token))return respond({error:"Form unavailable"},404,"null");
const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false}});
const {data:ws}=await db.from("client_workspaces").select("id,allowed_origin,status,access_expires_at").eq("widget_token",token).maybeSingle();
if(!ws||ws.status!=="active"||!ws.access_expires_at||new Date(ws.access_expires_at)<=new Date())return respond({error:"This form is not active"},403,"null");
if(origin!==ws.allowed_origin)return respond({error:"Domain not authorized"},403,"null");
if(clean(body?.website_url,100))return respond({ok:true},200,origin);
const contact_name=clean(body.contact_name,100);
const contact_email=clean(body.contact_email,180).toLowerCase();
const contact_phone=clean(body.contact_phone,35);
const message=clean(body.message,2500);
const consent=body.consent_to_contact===true;
if(contact_name.length<2||!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(contact_email)||message.length<4||!consent)
return respond({error:"Provide a name, email, enquiry and consent to be contacted about it."},400,origin);
const ip=req.headers.get("cf-connecting-ip")||req.headers.get("x-real-ip")||"unattributed";
const seed=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!.slice(0,32);
const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(seed+"|"+ip));
const ip_hash=Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,"0")).join("");
const from=new Date(Date.now()-15*60000).toISOString();
const [recent,month]=await Promise.all([
db.from("client_widget_attempts").select("id",{count:"exact",head:true}).eq("workspace_id",ws.id).eq("ip_hash",ip_hash).gte("created_at",from),
db.from("client_leads").select("id",{count:"exact",head:true}).eq("workspace_id",ws.id).gte("created_at",new Date(Date.now()-30*86400000).toISOString())
]);
if(recent.error||month.error)return respond({error:"Temporarily unavailable"},503,origin);
if((recent.count||0)>=4)return respond({error:"Please try again later"},429,origin);
if((month.count||0)>=250)return respond({error:"Form capacity reached. Contact this business directly."},429,origin);
const {error:attemptErr}=await db.from("client_widget_attempts").insert({workspace_id:ws.id,ip_hash});
if(attemptErr)return respond({error:"Temporarily unavailable"},503,origin);
const urgent=/urgent|asap|today|tomorrow|emergency|this week/i.test(message);
const {error}=await db.from("client_leads").insert({workspace_id:ws.id,contact_name,contact_email,contact_phone,message,consent_to_contact:true,urgency:urgent?"priority":"normal"});
if(error)return respond({error:"Unable to save enquiry"},503,origin);
return respond({ok:true,message:"Enquiry received; the business will review your request."},201,origin);
});