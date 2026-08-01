# Launch checklist — standing checks

Not a one-time audit (see the unmerged `audit/launch-readiness` branch for
that). This file is for narrow, recurring checks that must be re-run
whenever their specific trigger condition happens again — add to it, don't
let it become a general audit doc.

## Webhook destination URL must exactly match the canonical www domain

**Trigger**: any time the production domain, DNS, or www/non-www redirect
configuration changes.

**Why**: found 2026-08-01 during PR #234's (gift/promo codes) live evidence
run. Stripe's webhook endpoint was configured as
`https://openinvite.com.au/api/webhooks/stripe` (no `www`). The app's own
domain 307-redirects bare `openinvite.com.au` to `www.openinvite.com.au`,
and Stripe treats a redirect response as a delivery failure rather than
following it. Every `checkout.session.completed` event was silently dying
on that redirect — `api/webhooks/stripe.js` never received a single one, so
no paying customer's plan was ever activated by the webhook. No code was at
fault; this was purely a Stripe Dashboard config value one hop short of the
real endpoint. It was only caught because the evidence-gate policy (no
payments PR merges without a live, real end-to-end run) forced someone to
actually complete a real checkout and watch for the plan to land, rather
than trusting `npm run build` and a code review.

**Check**: in the Stripe Dashboard, Developers → Webhooks → the production
endpoint, confirm the destination URL matches the app's canonical host
exactly (`www.openinvite.com.au`, not the bare apex) with no redirect hop in
between. Then run a real live-mode $0 (or minimal) checkout end to end and
confirm the plan actually activates in both the UI and the database —
config that "looks right" in the dashboard is not itself proof of delivery.
