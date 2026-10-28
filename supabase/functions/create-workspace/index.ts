import { createClient } from "npm:@supabase/supabase-js@2.95.0";
const ORIGIN="https://leadlift-gt3rs.vercel.app";
const cors={"Access-Control-Allow-Origin":ORIGIN,"Access-Control-Allow-Headers":"authorization,content-type,apikey","Access-Control-Allow-Methods":"POST,OPTIONS","Content-Type":"application/json","Vary":"Origin"};
function reply(data:unknown,status=200){return new Response(JSON.stringify(data),{status,headers:cors});}
Deno.serve(async(req:Request)=>{
if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
if(req.method!=="POST")return reply({error:"Method not allowed"},405);
if(req.headers.get("origin")!==ORIGIN)return reply({error:"Origin not allowed"},403);
const jwt=req.headers.get("authorization")?.replace(/^Bearer\s+/i,"");
if(!jwt)return reply({error:"Sign in first"},401);
const key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,url=Deno.env.get("SUPABASE_URL")!;
const db=createClient(url,key,{auth:{persistSession:false}});
const {data:{user},error:authError}=await db.auth.getUser(jwt);
if(authError||!user?.email)return reply({error:"Authentication required"},401);
let body:any;try{body=await req.json()}catch{return reply({error:"Invalid request"},400);}
const business_name=String(body?.business_name||"").trim().slice(0,120);
const domain=String(body?.domain||"").trim().toLowerCase().replace(/^https?:\/\//,"").replace(/\/$/,"");
if(business_name.length<2||!/^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/.test(domain)||domain.length>180)
return reply({error:"Enter a business name and a public HTTPS website domain (example: example.co.za)"},400);
const {data:prior}=await db.from("client_workspaces").select("id,status").eq("owner_user_id",user.id).maybeSingle();
if(prior)return reply({ok:true,workspace_id:prior.id,status:prior.status});
const {data, error}=await db.from("client_workspaces").insert({owner_user_id:user.id,business_name,allowed_origin:"https://"+domain,status:"pending_payment"}).select("id,status").single();
if(error)return reply({error:"Could not create workspace"},500);
return reply({ok:true,workspace_id:data.id,status:data.status},201);
});