import {createClient} from "npm:@supabase/supabase-js@2.58.0";
const supabaseUrl=Deno.env.get("SUPABASE_URL")||"";
const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
const publicKey=Deno.env.get("SUPABASE_ANON_KEY")||"";
const admin=createClient(supabaseUrl,serviceKey,{auth:{autoRefreshToken:false,persistSession:false}});
const authClient=createClient(supabaseUrl,publicKey,{auth:{autoRefreshToken:false,persistSession:false}});
const originAllowed="https://leadlift-gt3rs.vercel.app";
const redirectTo=originAllowed+"/assistant.html?verification=complete";
function response(data:unknown,status=200){
 return new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":originAllowed,"Access-Control-Allow-Methods":"POST,OPTIONS","Access-Control-Allow-Headers":"Content-Type,Authorization,apikey","Cache-Control":"no-store","Vary":"Origin"}});
}
function clientIP(req:Request):{ip:string|null,source:string}{
 const names=["cf-connecting-ip","x-real-ip","x-forwarded-for"];
 for(const name of names){
   const raw=req.headers.get(name);
   if(!raw)continue;
   // The gateway/proxy supplies this network metadata. It is not proof of identity;
   // callers may influence forwarding headers in some deployments.
   const candidate=(name==="x-forwarded-for"?raw.split(",")[0]:raw).trim();
   const validIPv4=/^(?:\d{1,3}\.){3}\d{1,3}$/.test(candidate)&&candidate.split(".").every(p=>+p<=255);
   const validIPv6=/^[a-fA-F0-9:]{2,45}$/.test(candidate)&&candidate.includes(":");
   if(validIPv4||validIPv6)return {ip:candidate,source:name};
 }
 return {ip:null,source:"unavailable"};
}
function authError(error:any){
 const code=String(error?.code||"");
 const msg=String(error?.message||"");
 if(code==="email_address_not_authorized"||/authorized|SMTP|email provider/i.test(msg))return "Verification email delivery is not configured for this address. The operator must configure a production SMTP sender in Supabase.";
 if(code==="over_email_send_rate_limit"||Number(error?.status)===429)return "Email sending is rate-limited. Try again later or contact the operator.";
 if(code==="signup_disabled")return "Account registration is disabled in Supabase Authentication settings.";
 if(code==="email_exists"||code==="user_already_exists")return "If an account already exists, sign in or use password recovery.";
 return msg.slice(0,180)||"Registration could not be completed.";
}
async function upsertFromUser(user:any){
 if(!user?.id||!user.email)throw Error("Verified user identity missing");
 const verified=user.email_confirmed_at||user.confirmed_at||null;
 const {data:existing,error:readErr}=await admin.from("leadlift_user_accounts").select("user_id").eq("user_id",user.id).maybeSingle();
 if(readErr)throw readErr;
 const payload:any={email:String(user.email).toLowerCase(),email_verified_at:verified,updated_at:new Date().toISOString()};
 const result=existing?await admin.from("leadlift_user_accounts").update(payload).eq("user_id",user.id):await admin.from("leadlift_user_accounts").insert({user_id:user.id,...payload});
 if(result.error)throw result.error;
 const {data:row,error}=await admin.from("leadlift_user_accounts").select("user_id,email,email_verified_at,subscription_status").eq("user_id",user.id).single();
 if(error)throw error;
 return row;
}
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:{"Access-Control-Allow-Origin":originAllowed,"Access-Control-Allow-Methods":"POST,OPTIONS","Access-Control-Allow-Headers":"Content-Type,Authorization,apikey"}});
 if(req.method!=="POST")return response({error:"Only POST supported"},405);
 const origin=req.headers.get("Origin");
 if(origin&&origin!==originAllowed)return response({error:"Origin not permitted"},403);
 const size=Number(req.headers.get("content-length")||"0");
 if(size>5000)return response({error:"Request too large"},413);
 let body:any={};
 try{body=await req.json()}catch{return response({error:"Invalid JSON"},400)}
 const action=String(body.action||"");
 if(action==="profile"){
   const jwt=(req.headers.get("Authorization")||"").replace(/^Bearer\s+/i,"");
   if(!jwt||jwt===publicKey||jwt===serviceKey)return response({error:"Login required"},401);
   const {data,error}=await admin.auth.getUser(jwt);
   if(error||!data.user)return response({error:"Invalid login"},401);
   if(!data.user.email_confirmed_at)return response({error:"Verify your email address before accessing the account"},403);
   try{return response({account:await upsertFromUser(data.user)})}catch(e){console.error("User profile write error",String(e).slice(0,150));return response({error:"Profile unavailable"},503)}
 }
 const email=String(body.email||"").trim().toLowerCase();
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)||email.length>254)return response({error:"Enter a valid email address"},400);
 if(action==="resend"){
   const {error}=await authClient.auth.resend({type:"signup",email,options:{emailRedirectTo:redirectTo}});
   if(error)return response({error:authError(error)},error.status===429?429:503);
   return response({ok:true,message:"If this address has an unverified account, a new verification email will be sent."});
 }
 if(action!=="register")return response({error:"Unknown action"},400);
 if(body.privacyAcknowledged!==true)return response({error:"Please acknowledge the privacy notice"},400);
 const password=String(body.password||"");
 if(password.length<10||password.length>128)return response({error:"Use a password between 10 and 128 characters"},400);
 const {data,error}=await authClient.auth.signUp({
   email,password,
   options:{emailRedirectTo:redirectTo,data:{product:"leadlift_mail"}}
 });
 if(error)return response({error:authError(error)},error.status===429?429:503);
 const user=data.user;
 const isRealNewUser=!!user?.id&&Array.isArray(user.identities)&&user.identities.length>0&&
   Date.now()-new Date(user.created_at||0).getTime()<120000;
 if(isRealNewUser){
   try{
     await upsertFromUser(user);
     const network=clientIP(req);
     const {error:networkError}=await admin.from("leadlift_registration_network").insert({
       user_id:user.id,signup_ip:network.ip,ip_source:network.source,
       expires_at:new Date(Date.now()+90*86400000).toISOString()
     });
     if(networkError&&networkError.code!=="23505")throw networkError;
   }catch(e){
     console.error("LeadLift user link failed",String(e).slice(0,150));
     return response({ok:false,error:"Account signup was received, but registration tracking needs attention. Contact support before retrying."},503);
   }
 }
 // Deliberately do not expose user IDs or existence details to unauthenticated signups.
 return response({ok:true,verification_required:true,message:"If registration was accepted, check your inbox for a verification link. Sign in after verifying your email."});
});
