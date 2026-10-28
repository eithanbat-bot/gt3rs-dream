import { createClient } from "npm:@supabase/supabase-js@2.95.0";
const reply=(status:number)=>new Response("OK",{status,headers:{"Content-Type":"text/plain","Cache-Control":"no-store"}});
const encoder=new TextEncoder();
function hex(buffer:ArrayBuffer){return [...new Uint8Array(buffer)].map(x=>x.toString(16).padStart(2,"0")).join("");}
function equalHex(a:string,b:string){if(a.length!==b.length)return false;let c=0;for(let i=0;i<a.length;i++)c|=a.charCodeAt(i)^b.charCodeAt(i);return c===0;}
Deno.serve(async(req:Request)=>{
if(req.method!=="POST")return reply(405);
const secret=Deno.env.get("PAYSTACK_SECRET_KEY");
if(!secret)return reply(503);
const raw=await req.text();
if(raw.length>32000)return reply(413);
const sig=req.headers.get("x-paystack-signature")||"";
const key=await crypto.subtle.importKey("raw",encoder.encode(secret),{name:"HMAC",hash:"SHA-512"},false,["sign"]);
const expected=hex(await crypto.subtle.sign("HMAC",key,encoder.encode(raw)));
if(!equalHex(sig,expected))return reply(401);
let evt:any;try{evt=JSON.parse(raw)}catch{return reply(400);}
if(evt?.event!=="charge.success")return reply(200);
const ref=String(evt?.data?.reference||"");
if(!/^LL[a-f0-9]{32}$/.test(ref))return reply(200);
const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false}});
const {data:order}=await db.from("client_orders").select("*").eq("gateway_reference",ref).maybeSingle();
if(!order)return reply(200);
if(order.status==="paid"){
 const {data:ws}=await db.from("client_workspaces").select("status").eq("id",order.workspace_id).maybeSingle();
 if(ws?.status==="active")return reply(200);
 // Recover if a prior attempt recorded the payment but could not activate access.
}
if(order.status!=="pending"&&order.status!=="paid")return reply(409);
if(Number(evt.data.amount)!==order.amount_subunits||evt.data.currency!=="ZAR")return reply(400);
// Re-query Paystack so a forged callback or redirect can never activate a workspace.
const verification=await fetch("https://api.paystack.co/transaction/verify/"+encodeURIComponent(ref),{headers:{Authorization:"Bearer "+secret}}).catch(()=>null);
if(!verification||!verification.ok)return reply(503);
const verify:any=await verification.json().catch(()=>null);
if(!verify?.status||verify?.data?.status!=="success"||verify.data.reference!==ref||
Number(verify.data.amount)!==order.amount_subunits||verify.data.currency!=="ZAR")return reply(400);
const now=new Date(),expires=new Date(now);expires.setUTCMonth(expires.getUTCMonth()+6);
if(order.status==="pending"){
const {error:e1}=await db.from("client_orders").update({status:"paid",gateway_transaction_id:String(verify.data.id),paid_at:now.toISOString()}).eq("id",order.id).eq("status","pending");
if(e1)return reply(503);
}
const originalPaidAt=order.paid_at?new Date(order.paid_at):now;
const accessEnd=new Date(originalPaidAt);accessEnd.setUTCMonth(accessEnd.getUTCMonth()+6);
const {error:e2}=await db.from("client_workspaces").update({status:"active",activated_at:originalPaidAt.toISOString(),access_expires_at:accessEnd.toISOString()}).eq("id",order.workspace_id).eq("status","pending_payment");
if(e2)return reply(503);
return reply(200);
});