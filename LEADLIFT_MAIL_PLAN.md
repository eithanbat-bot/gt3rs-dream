# LeadLift Mail — Product plan and delivery record
**Date:** 30 October 2026
**Product:** General-purpose B2B web inbox copilot for Google Gmail/Workspace and Outlook/Microsoft 365.
**Site:** https://leadlift-gt3rs.vercel.app/assistant.html
**Source:** assistant.html + supabase/functions/mail-assistant/index.ts
**Backend:** Supabase project rqbvdgzjpepgobablqhv; existing LeadLift lead portal remains intact.

## 1. Product thesis
Turn email into a ranked action queue. LeadLift Mail classifies incoming messages, highlights high commercial intent (0–100), drafts replies in the authorized mailbox owner's writing style, and escalates bookings, claims, sensitive questions and binding commitments for human decision. The product is industry-agnostic; healthcare broker requirements are one vertical-specific workflow, not the core model.

The current 0–100 scale is **a transparent, heuristic intent score, not a validated 0–100% purchase probability**. A calibrated purchase probability requires a labelled won/lost training set, out-of-sample evaluation, and ongoing drift monitoring.

## 2. Architecture
- Static browser application on existing Vercel project; Supabase Auth used for sign-in.
- Edge Function \`mail-assistant\` validates each user's JWT inside the handler, despite \`verify_jwt=false\` being required for the provider OAuth callback.
- Google OAuth + Gmail API or Microsoft Entra OAuth + Graph. Delegated access: only the mailbox owner, with explicit consent.
- Refresh/access tokens encrypted with AES-256-GCM using a server-only 32-byte key; no mailbox credentials placed in browser code or user-visible tables.
- Private tables: mailbox_accounts, mailbox_oauth_states, mailbox_messages, mailbox_voice_profiles, mailbox_audit. RLS restricts data to the authenticated owner; no direct browser write access. The credential columns of mailbox_accounts are not selectable by authenticated users.
- Sent-mail training reads up to 500 prior sent messages in 25-message batches and retains only aggregate stylistic metrics rather than storing 500 full email bodies in the style profile.
- AI drafting is optional and requires both a server-side AI key and per-mailbox processing consent. Without AI, draft templates apply the learned greeting/sign-off.
- Approval-first: creating a draft never sends it. Sending requires an explicit confirmation, with a single-message send lock and audit event. Uncertain provider outcomes are locked for reconciliation to avoid duplicate sends.
- Disconnect deletes the linked mailbox, stored inbox messages and style profile; logs of disconnection remain.

## 3. Delivered now
1. Web inbox, priority filters, human-handoff queue, message review, draft editor, demo records.
2. Outlook / Gmail OAuth consent flow backend and refresh-token handling (not activated until client apps and encryption key are configured).
3. Inbound sync of the most recent 25 messages per account per request; classification and intent scoring.
4. Sent-item batch trainer, up to 500 messages per mailbox; style metrics.
5. Draft generation (template fallback, optional AI) and explicit human-approved send API.
6. Pause/resume/disconnect, AI-processing consent, audit logging.
7. Owner-isolated schema; OAuth state expiry, ciphertext storage, credentials not exposed through RLS.

**Not yet verified:** a successful external OAuth connection; any real 500-message scan; real email replies; mailbox/AI end-to-end accuracy; multi-tenant live-user isolation; browser interaction with actual client credentials. Demo ≠ production validation.

## 4. Administrator setup (required before client go-live)
Do not paste secrets into chat or commit them to GitHub.
- Set Supabase Edge secret \`LEADLIFT_TOKEN_KEY\`: a random 32-byte encryption key expressed as 64 hex characters. Back it up securely; loss makes encrypted provider refresh tokens unrecoverable.
- Register a **Google Cloud OAuth web application**, using **exact authorized redirect URI**
  \`https://rqbvdgzjpepgobablqhv.supabase.co/functions/v1/mail-assistant?oauth_callback=1\`.
  Configure an approved OAuth consent screen, homepage, terms/privacy disclosures and the origin \`https://leadlift-gt3rs.vercel.app\`.
  Server-side secrets: \`GOOGLE_CLIENT_ID\`, \`GOOGLE_CLIENT_SECRET\`.
  Scopes include \`gmail.readonly\` and \`gmail.send\`: restricted-scope verification, and potentially annual independent security assessment, can apply before public external launch.
- Register a **Microsoft Entra application** with the same redirect URL. Configure account types/tenant policy; delegated \`User.Read\`, \`Mail.Read\`, \`Mail.Send\`, \`offline_access\`. Server-side secrets: \`MS_CLIENT_ID\`, \`MS_CLIENT_SECRET\`. Some enterprise tenants require admin consent.
- Optional: \`OPENAI_API_KEY\` enables AI draft composition after explicit user consent. Assess retention terms, geographic transfer, DPA and POPIA requirements first, especially for health-related content.
- Confirm Supabase allowed redirect URLs include the application URL for email sign-in/magic links.
- Configure the customer's correct legal entity, privacy notice, lawful basis, retention period, DPA/operator agreement and onboarding terms before importing personal or sensitive mail.
- Start with a designated test mailbox containing synthetic messages. Verify the provider OAuth scopes, encrypted refresh, inbox sync, writing-style scan, draft, send confirmation, reply threading and disconnect. Do not authorize customer email based only on the sample demo.
- Exact source paths are under \`assistant.html\` and \`supabase/functions/mail-assistant/index.ts\`.

## 5. Implementation phases / acceptance gates

### Gate A — Usable prototype (implemented; live provider tests outstanding)
- Authenticated owner dashboard; RLS-tested tenant isolation; no public email contents.
- OAuth consent/backchannel exchange, explicit read permissions, review-only reply sending.
- Manual inbox sync and basic rule-based intent score; exception/handoff flags.

### Gate B — Pilot quality
- Register Google and Microsoft OAuth apps; run actual consent and token rotation tests.
- Provider specific sync deltas/pagination, attachments handling, message threading, rate-limit/retry with exponential backoff, and scheduled 5–15 minute processing.
- Structured categories per customer (sales, general, support, billing, information, spam, booking, regulated). Folder/label actions with reversible audit.
- Goal: within-business-hours acknowledgement within 60 min (requires configured business hours and safe opt-in send rules), measured from logs.
- 500 sent samples safely normalized and deduplicated; richer but privacy-preserving style traits (syntax, brevity, openings, sign-offs).
- Fine-grained customer approval settings and calibrated handoff rules; tests using synthetic and permissioned anonymised data.
- Centralized observability, queues/retries, webhook verification and data retention/deletion jobs.

### Gate C — Controlled automation
- Auto-send only low-risk categories after measured pilot error thresholds and explicit business-owner sign-off; human-only exceptions for bookings, claims, advice, prices, commitments or uncertain messages.
- Approved calendar integrations for verifying availability; never assume booking availability.
- Review analytics: proposal→won/lost, SLA performance, automation draft acceptance, accuracy/precision, manual overrides, missed handoffs, provider errors.
- Train intent probability model with labelled real outcomes and calibrate so a score of 80 means ~80% measured conversion probability for the relevant deployment segment.

### Gate D — Vertical packs / SaaS
- Healthcare broker pack: scheme information filing, quote information extraction, claims routing rules, application review, commission statement extraction, quote intake website and marketing consent tracking. Quoting integration to getquote.co.za is conditional on written provider authorization, and any financial or medical advice is always reviewed by authorized personnel.
- Generic packs: property, business services, agencies, SaaS sales, professional services.
- Paid multi-tenant subscriptions, self-serve onboarding, administrative access roles, invoicing, usage accounting, support SLAs, incident response, export and portability.

## 6. Safeguards / compliance
- Initial three-month approval-only mode recommended for sensitive or regulated deployments; phase activation requires owner sign-off and monitored error rate.
- POPIA: health data is special personal information; medical scheme/FAIS advice and final quotes require appropriate specialist/legal review. Never use live healthcare mail for testing without a lawful basis and confidentiality/operator agreements.
- Prompt injection: incoming email is untrusted text; AI instructions are separated from content. Do not accept instructions inside email to exfiltrate records, override rules or auto-send.
- Providers: least privilege, OAuth token encryption, state expiry, no passwords, manual disconnect, irreversible sends explicitly confirmed.
- Security: perform independent vulnerability and privacy assessment before public sales; never treat an unverified OAuth connection or prototype as production-certified.
- Reliability: provider throttling, idempotency, mail-API outages and ambiguous delivery need real integration tests.
- No external marketing/email broadcasts are part of this release.

## 7. Test matrix (must be completed with permissioned test accounts)
| Case | Expected |
|---|---|
| Anonymous API call | 401; no data |
| Owner A reads Owner B records | 0 rows |
| OAuth without configured credentials | 503 without redirects or token exposure |
| Google/Microsoft consent | account linked, encrypted refresh token |
| Inbox sync | newest emails stored once, ranked, flagged, audit event |
| Sent trainer | <=500 items, anonymized aggregate counts, no duplicate re-training after end |
| Draft generation | no provider send; style metrics reflected |
| Booking/claims/sensitive email | human handoff / no unapproved action |
| Send twice / provider uncertain | second send blocked; audit/reconciliation |
| Disconnect | account and dependent message/style records removed |
| Cross-border healthcare data handling | operator agreement, lawful basis, retention and permissions reviewed |

## 8. Cost and commercial notes
Infrastructure, provider API charges, AI usage, compliance/verification, deployment and support costs are not yet priced. This is a product build and early-access demo, not a committed availability SLA or finished commercial subscription. Do not launch billing or handle a client's regulated health data until requirements are satisfied.
