import { createClient } from "npm:@supabase/supabase-js@2.95.0";

const ALLOWED_ORIGINS = new Set([
  "https://leadlift-gt3rs.vercel.app",
  "https://gt3rs-dream.vercel.app",
  "https://lead-lift-revenue-systems-d1d564e6.base44.app"
]);

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const enc = new TextEncoder();
const clean = (v: unknown, max: number) =>
  typeof v === "string" ? v.trim().slice(0, max) : "";
const json = (data: unknown, status: number, origin: string, headers: Record<string,string> = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Access-Control-Allow-Origin": ALLOWED_ORIGINS.has(origin) ? origin : "null",
      "Vary": "Origin",
      ...headers,
    },
  });

async function sha256(s: string) {
  const d = new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(s)));
  return Array.from(d, x => x.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") ?? "";
  const cors = {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.has(origin) ? origin : "null",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
    "Vary": "Origin",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { status: ALLOWED_ORIGINS.has(origin) ? 204 : 403, headers: cors });
  }
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405, origin);
  if (origin && !ALLOWED_ORIGINS.has(origin)) return json({ error: "Origin not allowed" }, 403, origin);

  const length = Number(req.headers.get("content-length") ?? 0);
  if (length > 10_000) return json({ error: "Request too large" }, 413, origin);
  let body: Record<string, unknown>;
  try {
    const raw = await req.text();
    if (enc.encode(raw).byteLength > 10_000) return json({ error: "Request too large" }, 413, origin);
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw Error("bad payload");
    body = parsed;
  } catch {
    return json({ error: "Invalid request" }, 400, origin);
  }
  // Honeypot. Silently ignore automated form fills.
  if (clean(body.website_url, 200)) return json({ ok: true }, 200, origin);

  const business_name = clean(body.business_name, 120);
  const contact_name = clean(body.contact_name, 100);
  const email = clean(body.email, 180).toLowerCase();
  const phone = clean(body.phone, 35);
  const industry = clean(body.industry, 80) || "Other";
  const monthly_enquiries = clean(body.monthly_enquiries, 50) || "Not sure";
  const current_process = clean(body.current_process, 800);
  const challenge = clean(body.challenge, 1500);
  if (business_name.length < 2 || contact_name.length < 2 || !emailPattern.test(email) || body.consent_to_contact !== true) {
    return json({ error: "Please provide your business, name, a valid email and agree to be contacted about this request." }, 400, origin);
  }

  const svcUrl = Deno.env.get("SUPABASE_URL");
  const svcKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!svcUrl || !svcKey) return json({ error: "Service temporarily unavailable" }, 503, origin);
  const db = createClient(svcUrl, svcKey, { auth: { persistSession: false } });

  // Only server-observed connection metadata is used, never any browser-supplied form field.
  // IP metadata may be absent behind proxies; an unattributed bucket is used instead.
  const ip = req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip") || "unattributed";
  const ipHash = await sha256(svcKey.slice(0, 32) + "|ip|" + ip);
  const emailHash = await sha256(svcKey.slice(0, 32) + "|email|" + email);
  const minutes15 = new Date(Date.now() - 15 * 60_000).toISOString();
  const day1 = new Date(Date.now() - 24 * 60 * 60_000).toISOString();
  const hour1 = new Date(Date.now() - 60 * 60_000).toISOString();

  const [fromIp, fromEmail, globalCount] = await Promise.all([
    db.from("lead_submission_attempts").select("*", { count: "exact", head: true }).eq("ip_fingerprint", ipHash).gte("created_at", minutes15),
    db.from("lead_submission_attempts").select("*", { count: "exact", head: true }).eq("email_fingerprint", emailHash).gte("created_at", day1),
    db.from("lead_submission_attempts").select("*", { count: "exact", head: true }).gte("created_at", hour1)
  ]);
  if ([fromIp, fromEmail, globalCount].some(x => x.error)) return json({ error: "Please try again later." }, 503, origin);
  if ((fromIp.count ?? 0) >= 5 || (fromEmail.count ?? 0) >= 1 || (globalCount.count ?? 0) >= 60) {
    return json({ error: "A request from this contact or connection was received recently. Please try again later." }, 429, origin, { "Retry-After": "3600" });
  }

  const attempt = await db.from("lead_submission_attempts").insert({ ip_fingerprint: ipHash, email_fingerprint: emailHash, action: "submitted" });
  if (attempt.error) return json({ error: "Please try again later." }, 503, origin);
  const result = await db.from("inbound_leads").insert({
    business_name, contact_name, email, phone, industry,
    monthly_enquiries, current_process, challenge,
    source: "gt3rs-marketing-site", utm_source:clean(body.utm_source,60),utm_medium:clean(body.utm_medium,60),utm_campaign:clean(body.utm_campaign,60), consent_to_contact: true, consent_at: new Date().toISOString()
  }).select("id").single();
  if (result.error) return json({ error: "We could not save your request. Please try again later." }, 503, origin);
  return json({ ok: true, reference: result.data.id }, 201, origin);
});