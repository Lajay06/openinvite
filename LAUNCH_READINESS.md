# Launch readiness

*Read-only audit. No code changes. Assesses whether the product is ready for real couples to sign up and use end-to-end, as of this branch's base commit on `main`.*

---

## (1) The complete new-couple journey

**Status: READY**, with one nuance worth naming explicitly (not a defect).

| Step | Verdict | Evidence |
|---|---|---|
| Signup | READY | `src/pages/Register.jsx:34,47-51` — real `base44.auth.register`/`verifyOtp`, redirects to `/Dashboard`. No `WeddingDetails` record is created at signup; that's deliberate lazy-creation in onboarding, not a bug. |
| Onboarding | READY | `src/pages/Onboarding.jsx:171-189` (`persistDraftStep`) writes a draft record as soon as a couple name exists, serialized through a ref chain (`:106`) so out-of-order writes can't clobber each other. Final save (`:257`) is phased and **verifies via a fresh re-fetch** (`verifyOnboardingSave`, `:319`) before showing success, with a retry banner on failure (`:393-416`) rather than silently advancing. Resume-after-refresh (`:139-158`) is exactly what the 2 known pre-existing `onboarding.mjs` test failures cover — a narrow, already-tracked gap, not a broken flow. |
| Build wedding, zero data | READY | `src/pages/StudioWebsite.jsx:170-198,247-249` — a brand-new wedding (`existing === null`) falls back to a complete `DEFAULT` object covering every field the builder reads; a loading guard (`:437`) prevents any render before `details` populates. No premature `.someArray[0]` crash found. |
| Publish | READY | Consistent with PR #85 (published render-tree fix) and PR #86 (Guide/Getting Here routing fix), both merged to `main` this session. `PublishModal.jsx` requires a real slug before allowing publish (see item 3 below for a caveat on its own error handling, not its publish gate). |
| Guest RSVP submission | READY, two-step by design | `WeddingRSVPPage.jsx` (the `/rsvp` page on the published site) is **not** the RSVP form itself — it only requests a personal invite link via `POST /api/rsvp-link-request` (`:24`). The real submission happens on the separate token-based `src/components/rsvp/RSVPPage.jsx:355` (`POST /api/rsvp-submit`). `api/rsvp-submit.js:108` resolves the guest **server-side from the token**, never from a client-supplied guest id, and writes append-only `RsvpResponse` rows (`wedding_id`/`guest_id`/`event_id`/`status`/`meal_choice`/`plus_ones`/`plus_one_names`, `:120-138`). Worth naming in this report only because a two-page, personal-link flow could otherwise be mistaken for a broken single-page RSVP form. |
| Couple sees the response | READY | `src/lib/resolveMyWedding.js:90-123` (`getMyGuestsWithRsvp`) reads the same `RsvpResponse` rows filtered by `wedding_id`, using `rsvpAggregation.js` with **identical field names** to the writer, and overlays them onto each `Guest` record. `src/pages/Guests.jsx:105` calls this directly — confirmed the real couple-facing page, not a dead alternate. |

**No breaks or dead-ends found across signup → onboarding → build → publish → RSVP write → RSVP read.**

---

## (2) Payment — Stripe / Ultra upgrade

**Status: BLOCKER.**

| Check | Verdict | Evidence |
|---|---|---|
| Checkout session creation | WORKING, incomplete | `api/create-checkout-session.js:47-59` creates a real Stripe Checkout session (real secret key, real price ID, real hosted redirect). But it destructures only `{ priceId }` (`:32`) — silently drops `userId`/`userEmail` even though both frontend callers send them (`src/pages/PlanSelection.jsx:61`, `src/pages/Pricing.jsx:128`). No `client_reference_id`/`customer_email` is ever set on the session. Stripe has no way to know *which app user* paid. |
| Webhook plan activation | **DEAD CODE** | `api/webhooks/stripe.js:78-110`, the `checkout.session.completed` handler, only sends a Resend purchase-confirmation email (`:98-108`). Zero `base44.entities` writes anywhere in the file. Signature verification itself is real (`stripe.webhooks.constructEvent`, `:63`) — but the handler body never touches the database. A valid, signed webhook event does nothing but email the couple congratulating them on a plan they don't receive. |
| `user.plan` gate | **NOT WIRED** | Repo-wide grep for any write of `plan: 'ultra'` / `.plan =` in `src/` and `api/` returns zero real assignments on `main`. `StudioGuestSuite.jsx`'s `canAccess = plan === 'ultra' \|\| plan === 'free'` gate reads a field no code path ever sets after a real payment. |
| The fix already exists | **PARKED, unmerged** | Branch `fix/payment-plan-activation` (PR #17, `gh pr view 17` → `state: DRAFT`) contains a correct-looking fix: sets `client_reference_id`/`customer_email` on the checkout session, resolves the tier from the Stripe price ID (tamper-resistant), and does a real `PUT` to Base44's REST API to write `{ plan, planActivatedAt }` using a `BASE44_ADMIN_KEY` env var (presence in Vercel not verifiable from the repo). |

**Can a real couple pay right now and get Ultra? No.** Checkout takes real money; nothing deployed ever updates the paying user's plan. They'd be charged and remain locked out of Ultra, requiring a manual database fix. **This is launch-critical and must be fixed before any paid launch** — merging and deploying PR #17 (after re-verifying it against the current `main`, since it predates PRs #79-86) is the direct path.

---

## (3) Error handling on unhappy paths

**Status: NEEDS-WORK.**

| Path | Verdict | Evidence |
|---|---|---|
| Builder save | SENSIBLE | `StudioWebsite.jsx:369-388` (`doSave`) — wrapped in try/catch, shows `toast.error('Failed to save')` on rejection. |
| `PublishModal.jsx` writes | **SILENT-FAILURE** | `togglePublish`/`saveSlug`/`updateField` (`:39-42, 45-49, 51-55`) have zero try/catch around any of the three `base44.entities.WeddingDetails.update()` calls. A rejected promise throws unhandled with no toast — a click on Publish/Save/toggle appears to just do nothing on failure. |
| Wedding-by-slug fetch (guest site) | **BROKEN** | `src/lib/weddingBySlug.js:22-33` catches both network errors and non-2xx responses (including a real 500) and returns `null` in all cases — indistinguishable from "wedding not found." `MultiPageWeddingWebsite.jsx`'s `if (!result) { navigate('/'); return; }` silently bounces the guest to the homepage with zero explanation. A transient server error reads identically to "this link is wrong." |
| RSVP magic-link request | SENSIBLE | `WeddingRSVPPage.jsx:19-35` — client-side email validation, Turnstile CAPTCHA, try/catch → renders "Something went wrong — please try again in a moment" (`:128`). |
| RSVP token lookup | SENSIBLE | `RSVPPage.jsx:272-321` — invalid/expired token renders "This link has expired or is invalid" (`:454`). |
| RSVP submit failure | SENSIBLE but crude | `RSVPPage.jsx:383` — a native, unbranded `alert('Something went wrong. Please try again.')` rather than a styled toast. Functional, not silent, but visibly off-brand against the rest of the polished UI. |

Two real fixes needed before launch: **`PublishModal.jsx`'s silent-failure writes**, and **`weddingBySlug.js` distinguishing "not found" from "server error"** so a guest isn't misled about a broken link that's actually a transient outage.

---

## (4) Empty states — brand-new wedding, zero data

**Status: NEEDS-WORK** — one real, high-visibility bug; otherwise consistent and sensible.

| Page | Verdict | Evidence |
|---|---|---|
| **Home page hero** | **BROKEN** | `WeddingHomePage.jsx:162-166` — `new Date(weddingDetails.weddingDate).toLocaleDateString(...)` with no guard. A brand-new wedding's `weddingDate` defaults to `''` (`StudioWebsite.jsx:172`), so `new Date('')` is `Invalid Date` and the guest-facing hero — the very first thing every guest sees — literally renders the text **"Invalid Date."** |
| Guestbook | SENSIBLE | `WeddingGuestbookPage.jsx:201` — explicit `entries.length === 0` empty-state branch. |
| Polls | SENSIBLE | `WeddingPollsPage.jsx:400-413` — "The couple hasn't opened any polls yet — check back closer to the date." |
| Transport / Experience Guide | SENSIBLE | Confirmed in the prior routing-fix session — same "will be added here by the couple" pattern, now reachable on both pages after PR #86. |

The "Invalid Date" bug is the single highest-visibility item in this whole report — it's on the page every guest lands on first, for any wedding the couple hasn't fully configured yet (i.e. likely the common case in the first hour after signup, exactly when a couple might send a preview link to family to show it off).

---

## (5) Security — Low findings + closed-item re-verification

Source: `SECURITY_AUDIT.md` (branch `audit/security`, commit `b772eed`).

**The two documented Low findings — both independently confirmed STILL OPEN:**
1. **`api/create-checkout-session.js:39-44`** — `priceId` is still only shape-validated (`isValidPriceId`), not whitelisted against the two known price env vars. Worse than documented on re-check: `:44` (`priceId === PRO_PRICE_ID ? 'pro' : 'ultra'`) means *any* valid-shaped priceId that isn't the Pro price silently resolves to `'ultra'` metadata — not just an unwhitelisted price passing through, but a wrong-tier assignment.
2. **`api/on-signup.js`** — no rate-limiting (grep for `checkRateLimit`/`RateLimit` returns nothing).

**Spot-check of 4 closed findings:**
- `api/send-invites.js:37,67` / `api/send-email.js:51,110-111` — both call `verifyBase44User(req)` before sending. **CONFIRMED CLOSED.**
- `api/create-portal-session.js:21,26` — `customerId` now derived from `caller.stripeCustomerId` (server-verified), not client input. **CONFIRMED CLOSED.**
- `api/spotify-callback.js:45-58` — `state` validated against a server-set `spotify_oauth_state` cookie. **CONFIRMED CLOSED.**
- **Hardcoded Google Maps key (`VenueSearch.jsx:5`, `LocationPicker.jsx:3`) — CLOSED IN LETTER ONLY, not in substance.** The literal string is gone (PR #69), replaced with `import.meta.env.VITE_GOOGLE_MAPS_API_KEY` — still bundled into browser JS, still calling Google Maps JS/Photo APIs directly from the client. This violates this project's own CLAUDE.md rule ("NEVER use a VITE_GOOGLE_* client-side key... Server-side proxy only") — the exact pattern already fixed correctly for Google *Places* (`api/places.js`/`api/places-search.js`) was never applied to Google *Maps*. Recommend reopening this finding rather than treating it as closed.

---

## (6) Ops — monitoring and alerting

**Status: BLOCKER for a paid product, NEEDS-WORK at minimum for any launch.**

| Item | Verdict | Evidence |
|---|---|---|
| Uptime monitoring | **MISSING** | No `/api/health` endpoint, no healthcheck/Pingdom/statuspage reference anywhere in the repo. `vercel.json`'s only cron is `send-onboarding-emails` (daily). CLAUDE.md/WORKFLOW.md have zero mentions of monitoring practice. A published guest wedding site going down — the exact scenario a paying couple's family and friends would hit on the wedding day itself — is only discovered by a complaint. |
| Billing-failure alerting | **MISSING** | `api/webhooks/stripe.js:69,117` only `console.error()`s signature/handler failures — lands in passive Vercel function logs, nobody is paged. Sentry (confirmed present via `sentry-vite-plugin` in the build) is **frontend-only** — zero Sentry references anywhere in `api/`. |
| General ops posture | Manual only | No status page, no incident runbook found. Monitoring is "check the Vercel dashboard/logs by hand." |

Both of these directly caused friction earlier this session (per the goal's own framing) and remain unaddressed. Given weddings are date-critical, single-point-of-failure events for the end customer, uptime monitoring on published sites is not a nice-to-have.

---

## (7) Other launch-embarrassment risks

- **The Stripe checkout ↔ webhook `userId` gap (item 2) and the plan-activation dead code compound each other**: even after merging PR #17, the checkout session must also start passing `userId`/`client_reference_id` correctly for the webhook's Base44 write to have a user to target. These are two halves of one fix — don't merge the webhook half without the checkout half.
- **The Google Maps client-side key (item 5)** is a live, running-in-production exposed-key issue on a marketing/venue-search surface a prospective (not-yet-paying) customer could hit before ever signing up — a bad first impression if noticed, and a real cost/abuse risk regardless.
- **The "Invalid Date" home-page bug (item 4)** is the kind of thing a couple previewing their own site minutes after signing up will see immediately and may read as "this product is broken," even though the rest of the builder works correctly.

---

## Prioritised launch-blocker list

**MUST fix before launch:**
1. **[Blocker] Wire Stripe → plan activation.** Merge and re-verify PR #17 (`fix/payment-plan-activation`) against current `main`, ensuring both halves land together: checkout session sets `client_reference_id`/`customer_email`, and the webhook writes `plan`/`planActivatedAt` to the correct user. Confirm `BASE44_ADMIN_KEY` is actually set in the Vercel production environment before relying on it. Without this, the product cannot sell anything.
2. **[Blocker] Fix `WeddingHomePage.jsx`'s unguarded `new Date(weddingDetails.weddingDate)`** so an empty/unset wedding date renders a sensible placeholder ("Date coming soon" or similar) instead of literal "Invalid Date" on the first page every guest sees.
3. **[Blocker] Stand up minimal ops monitoring**: an automated uptime check against a couple of live `/w/:slug` pages (even a simple cron + alert), and route Stripe webhook errors (`api/webhooks/stripe.js`) to Sentry or an equivalent alert channel instead of only `console.error`.

**Should fix before launch (high customer-facing risk, not fully blocking):**
4. Fix the two open Low security findings — whitelist `priceId` against known price IDs (`api/create-checkout-session.js:39-44`) and add rate-limiting to `api/on-signup.js`.
5. Move the Google Maps key (`VenueSearch.jsx`/`LocationPicker.jsx`) behind a server-side proxy, matching the pattern already used correctly for Google Places.
6. Add try/catch + user-facing error feedback to `PublishModal.jsx`'s three write actions (currently silent on failure).
7. Make `weddingBySlug.js` distinguish "wedding not found" from "server/network error" so guests aren't told a working link is broken during a transient outage.

**Can ship after launch (lower severity / cosmetic):**
8. Replace the native `alert()` on RSVP submit failure (`RSVPPage.jsx:383`) with a styled, on-brand error toast.
