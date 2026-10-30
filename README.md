# GT3 RS Dream — LeadLift revenue project

**Live customer-facing site:** https://leadlift-gt3rs.vercel.app/

**Industry guides:** https://leadlift-gt3rs.vercel.app/solar-enquiry-checklist.html and https://leadlift-gt3rs.vercel.app/property-maintenance-enquiry-checklist.html

**Deployment:** Vercel project `leadlift-gt3rs` (production manually deployed from repository files until GitHub ↔ Vercel integration is installed).

This repository is the operating code for **LeadLift Revenue Systems**, a South African B2B lead-conversion implementation service.

## What is real
- A public marketing website built here and deployed separately.
- Supabase project `rqbvdgzjpepgobablqhv` holds inbound enquiries, prospect research, sales activity, and rate-limit counters.
- A public `submit-lead` Supabase Edge Function validates consent and enquiries. Only the server inserts records; anonymous clients cannot read business records.
- The original [LeadLift MVP](https://lead-lift-revenue-systems-d1d564e6.base44.app) has an interactive lead-response demo.

## Commercial positioning
Starting quotes: R25,000 implementation, R7,500 monthly management, tailored to scope. Nothing guarantees more leads or appointments. No working WhatsApp/Google/email integration is claimed before onboarding and authorization.

## Compliance
POPIA section 69: researched prospects are **not** marketing subscribers. Do not send unsolicited sales email, direct messages or calls without proper consent or a valid customer exception. A one-time prescribed request for consent may be permissible where the recipient has not refused. Record consent, identity and opt-out methods. No scraped or bought email blasts.

## Operations
- The website submits to the Supabase Edge Function, not to public database tables.
- Service-role keys must remain exclusively in Supabase Edge environment variables (never in client-side JavaScript or this repository).
- Protected database tables have RLS enabled and no anonymous read or write policies.
- Check changes before publishing; run the browser form and responsive tests; review Supabase security advisors.

## Sales status
Revenue and contacted prospects remain **zero** until confirmed by verifiable events. Business listings in the prospect research table are *uncontacted*.

## Deployment
GitHub repository is the Vercel production source. The app is a static HTML/CSS/JavaScript site in the repository root and uses no paid build tooling.

## Sellable LeadLift Inbox product (28 October 2026)

- **Public product:** https://leadlift-gt3rs.vercel.app/inbox.html
- **Interactive buyer demo:** https://leadlift-gt3rs.vercel.app/portal.html?demo=1
- **Customer portal:** https://leadlift-gt3rs.vercel.app/portal.html
- **Customer guide:** https://leadlift-gt3rs.vercel.app/customer-guide.html
- **Embeddable script:** https://leadlift-gt3rs.vercel.app/widget.js
- **Backend:** Supabase GT3 RS project; `client_workspaces`, `client_leads`, `client_orders`, `client_widget_attempts`, `client_support_tickets`, with tenant RLS and no anonymous direct reads.
- **Functions:** `create-workspace`, `client-enquiry`, `checkout-paystack` and `paystack-webhook`. Checkout and activation require a Paystack `sk_live_` secret configured securely in the runtime, signed webhook verification and an actual paid order. No merchant has been configured yet and no paid activation has been tested.
- **Product:** R4,900 for six months hosted access, one owner, one authorized HTTPS domain, up to 250 enquiries/rolling 30 days; renewal quoted separately. No message-sending or calendar automation included.
- **Social + Google Ads assets:** `marketing/social-launch-copy.md` and `marketing/google-ads-search-draft.md`. DRAFT / not published or funded. Publishing requires authorized brand accounts, advertiser verification and approved budget.
- **Production code:** published to Vercel by source-file deployment. GitHub-to-Vercel automatic linking is not yet enabled because the Vercel GitHub integration is absent.
- **Handover and commercial dependencies:** `sales/product-handover-checklist.md`. Seller legal identity and full terms must be completed before payment collection. Legal and platform identification cannot be misrepresented to conceal the seller.
- **Verification:** production routes returned HTTP 200; backend rejected anonymous workspace creation 401, disabled checkout 503, invalid widget 404; static module script syntax checked and widget parser passed. Full genuine customer payment/webhook, interactive browser UI and multi-tenant access tests with real accounts are not yet verified. Do not state that there are paying customers unless the database and payment provider confirm it.


## LeadLift Mail B2B inbox copilot (30 October 2026)
- **Deployed web app and fictional interactive demo:** https://leadlift-gt3rs.vercel.app/assistant.html?demo=1
- **Product plan / launch checklist:** [LEADLIFT_MAIL_PLAN.md](LEADLIFT_MAIL_PLAN.md)
- **Backend source:** [supabase/functions/mail-assistant/index.ts](supabase/functions/mail-assistant/index.ts)
- **Database:** mailbox accounts, messages, voice profiles, OAuth states and audit logging. Owner-isolated RLS; server-side encrypted tokens.
- **What is ready:** demo and web UI, API with OAuth connect/sync/train/draft/send operations, review-only sending controls, rule-based purchase-intent scores and 500-sent-item style training workflow.
- **What is not live:** OAuth application registration/secrets for Google and Microsoft, encryption key, client consent/verification, actual mailbox integration tests, scheduled background sync, autonomous sending, calibrated conversion probabilities, paid subscriptions. Do not claim a mailbox connection or real email automation has been tested.

## LeadLift Mail account signup and verification (30 October 2026)
- Signup UI: https://leadlift-gt3rs.vercel.app/assistant.html?signup=1
- Supabase signup endpoint: `supabase/functions/register-leadlift-user/index.ts` (POST `register`, `resend`; authenticated POST `profile`).
- Supabase Auth user ID links `leadlift_user_accounts` (email, verified timestamp, subscription status: not_subscribed) with `leadlift_registration_network` (IP when observed, proxy header source, expiry). No customer access to registration IP. Access is service-role only.
- Supabase Email Auth is enabled, signup permitted, email confirmation required (`mailer_autoconfirm=false` checked via Auth public settings endpoint on 30 Oct).
- Default Supabase Auth SMTP is not production capable for arbitrary addresses (authorized team emails only; low hourly quota). **Configure custom SMTP and allowed Auth redirect URI** `https://leadlift-gt3rs.vercel.app/assistant.html?verification=complete` via Supabase dashboard before offering public verification.
- `pg_cron` cleanup `leadlift_purge_signup_ip_daily` executes once per day to purge network rows past 90 days. IP metadata is for account security only, never payment identity or marketing.
- Exact account pages and API validation tests performed; **real verification delivery and full account sign-in need a controlled test with a permitted email inbox and confirmed SMTP**, not simulated success.
- No subscription provider or payment charge is configured as part of registration.
