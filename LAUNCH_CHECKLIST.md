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

## CSP must stay Report-Only until violation logs are clean

**Trigger**: any time `vercel.json`'s `Content-Security-Policy-Report-Only`
header is touched, a new external script/iframe/embed is added anywhere in
the app, or the follow-up PR to promote it to an enforced
`Content-Security-Policy` is considered.

**Why**: added 2026-08-03 (security sweep PR 5). CSP is the app's primary
XSS containment layer — Base44 stores the auth token in `localStorage` (no
HttpOnly cookie option), an accepted platform limitation alongside no-2FA
(see `BASE44_PLATFORM_NOTES.md`), so a successful script injection can steal
the session directly. That makes a wrong CSP entry two-sided: too loose and
it does nothing to contain XSS; too strict and it silently breaks checkout,
Turnstile, embeds, or analytics — with no error a user would ever report,
since the broken thing usually just fails quiet (a blocked iframe, a
swallowed fetch). Report-Only mode ships the full allowlist without
enforcing it, so violations surface in Vercel logs (grep `[csp-report]`,
served by `api/csp-report.js`) against real production traffic first.

**Check**: before ever promoting the header to enforced
`Content-Security-Policy`, grep production logs for `[csp-report]` over a
representative window (a normal week, covering at least one guest RSVP
submission, one checkout, one guest-website music/embed view) and confirm
zero unexpected violations. Any violation from a legitimate first-party
flow means the allowlist is missing an entry — fix the policy, not the
feature. Only once that's clean should the report-only header be renamed to
`Content-Security-Policy` (and the old, narrower enforced header it
replaces removed).

## Rollback runbook

**Trigger**: production (main / openinvite.com.au) is visibly broken right
after a merge — a bad deploy, not a data problem.

**Why**: added 2026-08-03 alongside the activation-mismatch cron
(`api/cron/check-activation-mismatch.js`) — that cron will now often be the
thing that notices something is wrong at 2am, so the recovery steps it
should point at need to already be written down, not improvised under
pressure.

**Steps — instant rollback to the last known-good deployment**:
1. Vercel dashboard → the `openinvite` project → Deployments. Find the last
   deployment that was known-good (the one before the bad merge), confirm
   its git commit is the one you expect, then use its `···` menu →
   **Instant Rollback** (or **Promote to Production**). This repoints
   production traffic at that build immediately — no rebuild, seconds not
   minutes.
   - CLI equivalent: `vercel rollback <deployment-url-or-id>` (add `-y` to
     skip the confirmation prompt). `vercel rollback status` shows whether
     one is in progress.
2. Rollback reverts the **deployed code/assets only**. It does not touch
   Vercel env vars, DNS, or anything in Base44 (data, entity schema, RLS
   rules) — those are separate systems a code rollback cannot reach.
3. Once rolled back, open (don't merge) a revert PR against the bad commit
   on GitHub so `main`'s history matches what's actually live, and the next
   normal deploy doesn't silently re-introduce the same bug.

**Do NOT roll back if the bad merge included a Base44 schema change**
(a new/renamed/removed field on an entity, a changed RLS rule). Rolling
back the *code* in that case leaves the *old* code running against the
*new* schema — often worse than the original bug, since the old code was
never written to handle the new shape and can fail in ways nobody tested
for. In that situation: fix forward (a small targeted patch) instead of
rolling back, or coordinate reverting the schema change itself in Base44
*before* any code rollback. Check `BASE44_PLATFORM_NOTES.md` and the
merged PR's diff for any entity-schema touch before choosing rollback over
fix-forward.
