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
  // Rate limits and both inserts run in one Postgres transaction. A failed lead
  // insert cannot leave an attempt that blocks a genuine visitor's retry.
  const { data, error } = await db.rpc("submit_lead_atomic", {
    p_ip_fingerprint: ipHash,
    p_email_fingerprint: emailHash,
    p_business_name: business_name,
    p_contact_name: contact_name,
    p_email: email,
    p_phone: phone,
    p_industry: industry,
    p_monthly_enquiries: monthly_enquiries,
    p_current_process: current_process,
    p_challenge: challenge,
    p_utm_source: clean(body.utm_source, 60),
    p_utm_medium: clean(body.utm_medium, 60),
    p_utm_campaign: clean(body.utm_campaign, 60)
  });
  if (error) {
    console.error("Atomic lead persistence failed", error.code ?? "unknown");
    return json({ error: "We could not save your request. Please try again later." }, 503, origin);
  }
  if (data?.status === "rate_limited") {
    const seconds = Number(data.retry_after_seconds) || 3600;
    return json({ error: "A request from this contact or connection was received recently. Please try again later." },
      429, origin, { "Retry-After": String(seconds) });
  }
  if (data?.status === "invalid") {
    return json({ error: "Please check the request details and try again." }, 400, origin);
  }
  if (data?.status !== "saved" || typeof data.lead_id !== "string") {
    return json({ error: "We could not confirm your request was saved. Please try again later." }, 503, origin);
  }
  return json({ ok: true, reference: data.lead_id }, 201, origin);
});