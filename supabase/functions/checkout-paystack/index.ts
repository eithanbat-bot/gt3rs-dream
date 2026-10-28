import { createClient } from "npm:@supabase/supabase-js@2.95.0";
const ORIGIN="https://leadlift-gt3rs.vercel.app";
const headers={"Access-Control-Allow-Origin":ORIGIN,"Access-Control-Allow-Headers":"authorization,content-type,apikey","Access-Control-Allow-Methods":"POST,OPTIONS","Content-Type":"application/json","Cache-Control":"no-store"};
const reply=(d:unknown,s=200)=>new Response(JSON.stringify(d),{status:s,headers});
Deno.serve(async(req:Request)=>{
if(req.method==="OPTIONS")return new Response(null,{status:204,headers});
if(req.method!=="POST")return reply({error:"Method not allowed"},405);
if(req.headers.get("origin")!==ORIGIN)return reply({error:"Origin not allowed"},403);
const secret=Deno.env.get("PAYSTACK_SECRET_KEY");
if(!secret?.startsWith("sk_live_"))return reply({error:"Checkout is not open yet. Request a demo while merchant verification is completed."},503);
const jwt=req.headers.get("authorization")?.replace(/^Bearer\s+/i,"");
if(!jwt)return reply({error:"Sign in first"},401);
const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false}});
const {data:{user}}=await db.auth.getUser(jwt);if(!user?.email)return reply({error:"Authentication required"},401);
let body:any;try{body=await req.json()}catch{return reply({error:"Invalid body"},400);}
const id=String(body?.workspace_id||"");
const {data:ws}=await db.from("client_workspaces").select("id,owner_user_id,status").eq("id",id).eq("owner_user_id",user.id).maybeSingle();
if(!ws)return reply({error:"Workspace not found"},404);
if(ws.status==="active")return reply({error:"Workspace already activated"},409);
if(ws.status!=="pending_payment")return reply({error:"Workspace not eligible for purchase"},409);
const reference="LL"+crypto.randomUUID().replaceAll("-","");
const price=490000; // R4,900 in cents. Six-month access, up to 250 leads/month.
const {error:insertErr}=await db.from("client_orders").insert({workspace_id:id,gateway_reference:reference,amount_subunits:price,currency:"ZAR",status:"pending"});
if(insertErr)return reply({error:"Could not initiate order"},500);
const response=await fetch("https://api.paystack.co/transaction/initialize",{
method:"POST",headers:{"Authorization":"Bearer "+secret,"Content-Type":"application/json"},
body:JSON.stringify({email:user.email,amount:String(price),currency:"ZAR",reference,
callback_url:ORIGIN+"/portal.html?checkout=returned",
metadata:JSON.stringify({workspace_id:id,product:"LeadLift Inbox - six months",reference})})
}).catch(()=>null);
if(!response)return reply({error:"Payment provider unavailable"},503);
const json:any=await response.json().catch(()=>null);
if(!response.ok||!json?.status||!json?.data?.authorization_url?.startsWith("https://checkout.paystack.com/"))
return reply({error:"Payment could not be initialized. Please try later."},503);
return reply({checkout_url:json.data.authorization_url,reference});
});