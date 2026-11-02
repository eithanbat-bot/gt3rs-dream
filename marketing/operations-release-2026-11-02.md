# LeadLift GT3 RS — verified operations release (2 November 2026)

## Scope and evidence
Project: Supabase `rqbvdgzjpepgobablqhv`; repository `eithanbat-bot/gt3rs-dream`; production `leadlift-gt3rs.vercel.app`. Observations made on 2026-11-02 after querying live database tables, Gmail and Vercel. Counts below exclude rolled-back test transactions.

| Evidence-backed metric | Count |
| --- | ---: |
| Retained genuine inbound leads | 0 |
| Research-only prospect accounts | 12 |
| Marketing-consented prospect accounts | 0 |
| Consent-request drafts, unsent | 3 |
| Confirmed outbound marketing sends | 0 |
| Sales activity records | 0 |
| Customer workspaces (including active) | 0 |
| Client orders (including paid) | 0 |
| Client leads | 0 |
| Client support tickets | 0 |
| Verified cash revenue | R0 |

All 12 researched accounts remain `marketing_permission=unrequested` and `pipeline_stage=research`. The 3 outreach queue items are drafts with `sender_identity_verified=false`, no confirmed message IDs or send times. No messages were sent. Gmail searches for relevant inbound and sent messages found no matches. Metricool reports no connected social network. No authorized Google Ads spend was performed or inferred.

The single `lead_submission_attempts` row dated 28 October has no retained `inbound_leads` row. It is **not** evidence of a genuine customer, and its cause is not established. Historical logs were not sufficient to attribute it.

## Lead-capture reliability remediation
Previously, Edge Function `submit-lead` version 2 recorded an attempt before writing the lead. A failed lead insert could leave a 24-hour email rate-limit lockout. On 2 November:
- Applied production database migration `leadlift_atomic_inbound_submission_v1`, implementing service-role-only `submit_lead_atomic` RPC.
- The RPC serializes the global low-volume quota with a transaction advisory lock, checks per-IP (5/15m), per-email (1/24h), and global (60/h) limits, inserts the retained lead and attempt in one transaction, and returns an explicit saved or rate-limited status. A failed insert rolls back the transaction.
- Restricted execution privileges to `service_role` (and function owner `postgres`); not exposed to `anon` or `authenticated`.
- Committed updated Edge Function source and deployed `submit-lead` **version 3 ACTIVE** with its existing public JWT setting and origin allowlist unchanged.
- Executed a **BEGIN / ROLLBACK** SQL test: first submission returned `saved`, second identical submission returned `rate_limited` with 86400-second retry guidance. Post-rollback verification confirmed **0 test leads persisted**, **0 genuine leads**, and the original single historical attempt only.
- This validates the database transaction and limiter logic, but is **not** a full browser-to-edge end-to-end test, and does not establish why the 28 October attempt lacked a retained lead. Issue #2 remains open for controlled edge, failure and concurrency testing.

Source: `supabase/functions/submit-lead/index.ts` and `supabase/migrations/20261102062500_leadlift_atomic_inbound_submission_v1.sql`.

## Organic inbound improvement
Published a new, original, factual guide: `/website-lead-capture-checklist.html`. It covers eight operational checks: persistence before success, retry, duplicates, anti-spam controls, data minimization, ownership, outcome measurement and end-to-end testing. Added a homepage link and sitemap entry.

Production deployment: `dpl_3HoGGTxQuXDzdpgRN6SLGGyT97w1`, Git SHA `533db69fed0b8c6faf0d4f789bbdd355c9aebbee`, state **READY**, production alias `leadlift-gt3rs.vercel.app`. Vercel's website fetch returned **HTTP 200** with expected content for the guide, homepage and sitemap. A separate unauthenticated web fetch was not available, so independent public browser verification remains outstanding. No traffic, ranking, clicks or conversions are claimed.

## Payments, fulfilment and permissions
No paid order, merchant verification evidence, active workspace or support ticket exists. The presence of checkout and webhook code is not proof of a functioning live merchant. Do not present checkout as live until merchant verification, seller terms, and an authorized end-to-end transaction are documented. No customer handover email was needed or sent.

No prospect direct marketing was authorized: consent is unrecorded, all three one-time consent drafts lack verified sender identity, and no refusal overrides were attempted. POPIA Section 69 safeguards remain in force. No personal-profile posts, social posts or paid ads were made.

## Exact remaining blockers and next actions
1. Complete a controlled browser-to-edge form test, including server failure, safe retry, concurrency and persistence, without polluting production sales metrics; investigate the unexplained 28 October attempt. Issue #2 stays open.
2. Independently verify the public website route from an unauthenticated browser.
3. Verify the live merchant, seller terms and an authorized test payment before claiming checkout works or activating a paid client.
4. Establish verified business-owned social or email sender identity and documented permissions before any direct marketing. Paid ads require an approved budget.
5. Measure real inbound traffic and qualified demo requests; prioritize distribution over adding more unmeasured content.

No fabricated customers, sends, clicks, sales, payments or revenue were recorded.