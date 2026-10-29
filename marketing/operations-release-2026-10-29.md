# LeadLift operations and production release — 29 October 2026

## Production deployment
- **Vercel deployment:** `dpl_GeVEE9iBmNRKT8RnUfHSA5jTp5Z9`, production `READY` on 29 October 2026.
- **Production alias:** `leadlift-gt3rs.vercel.app` assigned with no alias error.
- **Published source set:** 11 root static files fetched from `main`, including `lead-response-audit.html`, `index.html`, `sitemap.xml`, `inbox.html`, `portal.html`, `customer-guide.html`, `widget.js`, privacy and two industry checklists.
- **Preflight passed:** audit title/canonical, homepage link, sitemap URL, customer-guide content, merchant-disabled disclosure, portal noindex and no embedded Paystack secret.
- **Vercel file inventory verified:** audit file exists in the new production deployment; it was absent from the prior production deployment `dpl_AvG2Vsvv5MJGfNHyxmjBEHsJXs2u`.
- **Verification limit:** direct external HTTP GET of the production hostname was unavailable from this execution environment. Vercel READY + assigned alias + deployed file inventory are verified; do not claim an independently measured HTTP 200, page views or search indexing. Follow up with public GET for `/`, `/lead-response-audit.html`, `/sitemap.xml`, `/inbox.html` and `/portal.html?demo=1`.

## Database and evidence-based commercial metrics
Supabase project: `rqbvdgzjpepgobablqhv`. Read-only SQL checks on 29 October 2026:
- `inbound_leads`: **0** rows. One historical `lead_submission_attempts` entry dated 28 October and a matching HTTP 201 log do **not** establish a currently retained, genuine lead.
- `prospect_accounts`: **12**, all `marketing_permission=unrequested` and `pipeline_stage=research`.
- `sales_activity`: **0**.
- `outreach_queue`: **3** consent-request drafts, all `sender_identity_verified=false`, no sent timestamps or confirmed Gmail message IDs.
- `client_workspaces`, `client_orders`, `client_leads`, `client_support_tickets`: **0** each.
- Confirmed sends **0**, qualified inbound **0**, proposals **0**, activated customer workspaces **0**, paid orders **0**, verified cash received **R0**. Do not count the three illustrative demo records as real customers.

## Customer fulfilment and merchant
- The `checkout-paystack` edge function rejects checkout with HTTP 503 unless a `sk_live_` Paystack merchant secret is present. The signed `paystack-webhook` verifies HMAC and re-queries the provider before marking an order paid and activating a workspace.
- A Paystack merchant identity and successful real payment remain unverified; **checkout must be described as unavailable**, regardless of a customer portal or checkout button.
- `customer-guide.html` exists in the deployed source, but there are no active workspaces or genuine customers to deliver instructions to. No handover or support response was sent.

## Communications and paid marketing
- Gmail search for LeadLift-related messages since 20 October: **no matching emails**. Inbox since 27 October: no prospect reply. Other unrelated outgoing mail was excluded from LeadLift metrics.
- Metricool reports **no connected social networks** for the available brand. No posts were published. Google Ads account/budget/advertiser verification were not established, so **no ads were created or funded**.
- No direct marketing or one-time consent request was sent. Preserve Section 69 refusal checks, sender verification, and explicit permission requirements.

## Next highest-value actions
1. Independently verify public HTTP 200 and content on the production alias; confirm the audit CTA and demo form render on mobile.
2. Complete the legal seller/merchant identity, commercial terms and live Paystack verification **before** enabling checkout or claiming the product can be purchased.
3. Connect an authorized **brand-only** social account if desired; publish educational resources without fabricated outcomes, then track genuine inbound enquiries in Supabase.
4. On any verified paid activation, deliver the existing customer guide through an authorized channel and handle genuine support tickets.
