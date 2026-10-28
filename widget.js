// LeadLift Inbox embeddable form. No secrets in this file.
(()=>{"use strict";
const script=document.currentScript;const token=script?.dataset?.workspace||"";
const root=document.createElement("div");
root.className="leadlift-form";root.style.cssText="max-width:560px;background:#fff;color:#132f3c;border:1px solid #d7e7e4;border-radius:16px;padding:24px;box-shadow:0 8px 30px #102b390e;font-family:system-ui,Arial,sans-serif";
const h=document.createElement("h2");h.textContent="Request a callback";h.style.cssText="font-size:23px;margin:0 0 7px";
const p=document.createElement("p");p.textContent="Tell us about your project. Our team will review your enquiry.";p.style.cssText="font-size:14px;color:#526974;margin:0 0 20px";
const form=document.createElement("form");
const fields=[
["contact_name","Your name","text",true],
["contact_email","Email address","email",true],
["contact_phone","Phone (optional)","tel",false]
];
function makeField(id,label,type,required){const wrap=document.createElement("label");wrap.style.cssText="display:block;font-size:13px;font-weight:650;margin-bottom:15px";wrap.textContent=label;const inp=document.createElement("input");inp.type=type;inp.name=id;inp.required=required;inp.maxLength=type==="tel"?35:180;inp.style.cssText="display:block;margin-top:5px;width:100%;box-sizing:border-box;padding:12px;border-radius:8px;border:1px solid #c4d9d3;font:inherit";wrap.appendChild(inp);return wrap;}
fields.forEach(v=>form.appendChild(makeField(...v)));
const msgLabel=document.createElement("label");msgLabel.textContent="What do you need help with?";msgLabel.style.cssText="display:block;font-size:13px;font-weight:650;margin-bottom:15px";
const message=document.createElement("textarea");message.name="message";message.required=true;message.minLength=4;message.maxLength=2500;message.rows=4;message.style.cssText="display:block;margin-top:5px;width:100%;box-sizing:border-box;padding:12px;border-radius:8px;border:1px solid #c4d9d3;font:inherit";msgLabel.appendChild(message);form.appendChild(msgLabel);
const trap=document.createElement("input");trap.name="website_url";trap.tabIndex=-1;trap.autocomplete="off";trap.style.display="none";trap.setAttribute("aria-hidden","true");form.appendChild(trap);
const consentLabel=document.createElement("label");consentLabel.style.cssText="display:flex;gap:10px;align-items:flex-start;font:12px/1.5 system-ui;color:#415b63";const consent=document.createElement("input");consent.type="checkbox";consent.name="consent_to_contact";consent.required=true;consent.style.cssText="margin-top:3px";consentLabel.appendChild(consent);const consentText=document.createElement("span");consentText.textContent="I agree to the business using my details to respond to this enquiry, not to send unrelated promotional messages.";consentLabel.appendChild(consentText);form.appendChild(consentLabel);
const btn=document.createElement("button");btn.type="submit";btn.textContent="Send enquiry";btn.style.cssText="margin-top:19px;width:100%;padding:13px 18px;border:0;border-radius:8px;background:#106d5a;color:#fff;font:700 14px system-ui;cursor:pointer";form.appendChild(btn);
const status=document.createElement("p");status.setAttribute("role","status");status.style.cssText="margin:12px 0 0;color:#215f4c;font-size:13px";form.appendChild(status);
form.addEventListener("submit",async(e)=>{e.preventDefault();if(!form.reportValidity())return;btn.disabled=true;btn.textContent="Submitting…";status.textContent="";
try{const fd=new FormData(form);const payload=Object.fromEntries(fd.entries());payload.consent_to_contact=consent.checked;payload.workspace_token=token;
const resp=await fetch("https://rqbvdgzjpepgobablqhv.supabase.co/functions/v1/client-enquiry",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
const result=await resp.json().catch(()=>({}));if(!resp.ok)throw Error(result.error||"Could not send enquiry");status.textContent="Thank you. Your enquiry has been received for review.";form.reset();}
catch(err){status.textContent=err.message||"Unable to submit";status.style.color="#a43a36";}
finally{btn.disabled=false;btn.textContent="Send enquiry";}});
root.append(h,p,form);script?.insertAdjacentElement("afterend",root);
})();