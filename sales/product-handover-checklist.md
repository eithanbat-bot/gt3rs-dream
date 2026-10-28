# LeadLift Inbox — pre-sale scope and customer handover checklist (draft)
Version 1, 28 October 2026. **This is not an executed contract.**
Before collecting payment, verify the legal seller, company registration/trading identity (where applicable), address/contact particulars, banking/merchant verification, tax status, refund policy and consumer rights, business customer details, SLA and any relevant data-processing agreement.

## Included in fixed-scope software package
- One verified owner account, one workspace and one approved HTTPS origin for the embeddable form
- Owner-only authenticated dashboard with pipeline stages, notes, urgency indication and CSV export
- Public enquiry widget running on that approved domain with explicit per-enquiry response consent
- Six months of hosted access after successfully verified payment; no guaranteed extension beyond that term
- Maximum 250 stored enquiries per rolling 30 days; simple browser widget and request-based rate limits
- Support requests recorded inside the customer portal for manual review

## Exclusions
- No WhatsApp, SMS, calendar, Google Ads, email sending or proprietary model API integration
- No promise of leads, appointments, revenue, traffic, placement or legal compliance
- No multi-user admin team, custom reports, uptime SLA or custom integration in the fixed price
- No purchased prospect lists, outbound marketing automation or direct customer calls

## Price
R4,900 one-off for the initial six months. Renewal after six months is quoted separately; prospective buyers must know that continued access requires a renewal, not implied lifetime access. No payment may be taken before valid merchant account and final seller terms are available.

## Order and provisioning lifecycle
1. Customer signs up with a real email and completes confirmation where required.
2. They create one business workspace and prove/enter the domain they control. System creates status `pending_payment`.
3. A verified merchant checkout is initiated server-side for ZAR 4,900; no client-side secret API keys.
4. The processor sends a signed webhook event; backend verifies HMAC, transaction reference, status, amount and currency.
5. Only that verified event enables `active` access, setting activation/expiry dates.
6. Customer signs in, copies the embed script, tests the form, and can access the dedicated user guide.
7. Support is lodged in the private portal and resolved by an actual operator.

## Prior to customer delivery / go-live
- [x] Database RLS configured and private tables not readable by anon
- [x] Public widget and owner portal source created
- [x] Payment initializer and signed webhook function deployed
- [ ] Legally verified merchant and Paystack live key configured
- [ ] Seller identity and full contract terms completed and approved
- [ ] Real authorized customer purchase via verified payment webhook tested end-to-end
- [ ] Customer domain ownership verified (current v1 validates only URL origin at submission; enter business domain truthfully)
- [ ] Production-scale anti-bot review/captcha and support operating procedures finalized
- [ ] Automated billing/renewal handling configured (not in v1)

**Do not describe a product as delivered to a paying customer until there is evidence of a verified payment and working activation.**
