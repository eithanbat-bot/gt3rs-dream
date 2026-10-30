# LeadLift Mail — Hosted Auth redirect and SMTP setup
Updated 30 October 2026.

**Status:** The web app and Supabase `register-leadlift-user` Edge Function both use the exact HTTPS callback `https://leadlift-gt3rs.vercel.app/assistant.html`. Hosted Supabase Auth configuration is **not** changed by GitHub commits or local `supabase/config.toml` edits. Its Site URL was independently observed to be `http://localhost:3000` in a redirect diagnostic. The following dashboard changes are still required.

## Hosted Supabase Auth URL configuration (must be applied in Dashboard)

1. Open https://supabase.com/dashboard/project/rqbvdgzjpepgobablqhv/auth/url-configuration (or Authentication → URL Configuration).
2. Change **Site URL** to `https://leadlift-gt3rs.vercel.app` (not localhost).
3. In **Redirect URLs**, add exactly `https://leadlift-gt3rs.vercel.app/assistant.html`. A same-origin callback is preferred to an overly broad wildcard.
4. Save. Leave **Confirm Email** enabled in Authentication → Providers → Email.
5. The confirmation template's CTA must use Supabase's `{{ .ConfirmationURL }}` so the token stays with Supabase and the resulting allowed redirect returns to LeadLift. See `supabase/email-templates/confirmation.html`.
6. Existing emails with previously issued localhost links need a **new** confirmation message; changes cannot rewrite old links.

These steps are for the **hosted production** project; adding an `[auth]` section in `supabase/config.toml` only configures a local Supabase environment and does not change the hosted project.

## Recommended transactional email provider — Resend

Do not reuse unrelated brands' domains. First choose a domain owned by LeadLift; e.g. a future `auth.your-leadlift-domain.example` subdomain.

1. Create/sign in to a Resend account: https://resend.com/
2. In Resend → Domains, add and verify the owned sending domain. Add exact SPF, DKIM and MX DNS records shown by Resend. Configure DMARC appropriately. Do not invent DKIM or MX values: they are domain/region-specific.
3. In Resend, create a narrowly scoped sending API key. **Never paste keys into a public chat, GitHub, frontend code or a document.**
4. In Supabase Authentication → SMTP Settings enable custom SMTP with:

| Field | Value |
|---|---|
| SMTP Host | `smtp.resend.com` |
| SMTP Port | `465` (TLS) or `587` (STARTTLS) |
| SMTP User | `resend` |
| SMTP Password | Your Resend API key (enter privately) |
| Sender email | `no-reply@auth.your-leadlift-domain.example` or another verified address |
| Sender name | `LeadLift Mail` |

5. Keep email confirmation enabled and the email template body from `supabase/email-templates/confirmation.html` under Authentication → Email Templates → Confirm signup.
6. Use a **new test account with an authorized email inbox**: sign up, inspect sender and confirmation link, confirm, verify final URL is `https://leadlift-gt3rs.vercel.app/assistant.html`, and verify the Supabase `leadlift_user_accounts.email_verified_at` value is populated on subsequent sign-in.
7. Test resend-verification, passwordless sign-in, unrecognized signup handling, invalid/expired links, and rate limiting. Set appropriate per-IP and per-email limits; consider CAPTCHA for public signup. Supabase may still impose service-level email rate limits.
8. Set sender DNS and transactional email separate from marketing sending. Do not send advertising through the authentication sender.

## Production acceptance criteria
- Redirect from a newly issued Supabase confirmation URL lands on LeadLift, **never localhost**.
- Real verification email delivered from a domain LeadLift controls.
- No SMTP credential exposed in client code, GitHub or the database.
- Auth user is email-verified, user ID links subscription placeholder, and signup IP remains service-only with a 90-day retention policy.
- No billing or marketing consent inferred from account registration.

*Source:* Supabase Auth [Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls) and [SMTP](https://supabase.com/docs/guides/auth/auth-smtp); Resend [SMTP](https://resend.com/docs/send-with-smtp).
