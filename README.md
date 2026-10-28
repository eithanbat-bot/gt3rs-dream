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
