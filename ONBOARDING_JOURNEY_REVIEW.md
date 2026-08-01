# Onboarding journey review — signup → plan → payment → dashboard

**Date**: 2026-08-01, reviewed against `main` after the marketing/auth/pricing batch
(#228, #230, #231, #232, #233).
**Method**: static code read of every file in the path below — `Register.jsx`,
`Login.jsx`, `AuthLayout.jsx`, `ChoosePlan.jsx`, `checkoutSession.js`,
`create-checkout-session.js`, `api/webhooks/stripe.js`, `PaymentSuccess.jsx`,
`Onboarding.jsx`, `Dashboard.jsx`, `Account.jsx`'s Billing tab, `Home.jsx`,
`App.jsx`'s route table. **Not** a live browser click-through — the browser
connection has been unstable this session (see PR #234's evidence-run notes).
Anything here that depends on actual rendered/animated behaviour rather than
code logic is flagged as unverified, not claimed as confirmed.

**Quality bar requested**: Google one-tap smoothness — minimum clicks, no dead
ends, no redundant screens, fast perceived transitions.

---

## Decisions (2026-08-01, owner review)

- **Finding 1** (paying customers skip onboarding) — **FIXED, PR7.**
  `PaymentSuccess.jsx` now routes to `/onboarding` when the user's onboarding
  is incomplete and `/Dashboard` when it's already done, using the exact same
  completion check (`isOnboardingComplete`, now shared with `Onboarding.jsx`'s
  own guard, in `src/lib/resolveMyWedding.js`) so an existing user upgrading
  mid-product is never re-onboarded. The dead `showWelcomeBanner`/
  `dismissWelcome` code in `Dashboard.jsx` was deleted rather than repaired —
  the routing fix replaces its purpose. Zero changes to payment verification,
  the webhook, or `isPastPlanStep` plan gating.
- **Finding 2** (no password visibility toggle) — **FIXED, PR7.** One shared
  `PasswordInput` component (`src/components/ui/password-input.jsx`) used by
  both `Register.jsx`'s two password fields and `Login.jsx`'s one — not two
  independently-drifting implementations.
- **Finding 3** (OAuth isn't true one-tap) — **queued, post-launch.** Real
  integration work (e.g. Google Identity Services auto-prompt), out of scope
  for this batch.
- **Finding 4** (`/signup` → `/register` extra hop) — **accepted as-is, no
  action.** Reviewed and intentionally not changed.
- **Finding 5** (full-page reload on auth success) — **accepted as-is, no
  action.** Reviewed; the underlying `AuthContext` mount-only session check
  is a deliberate tradeoff, not a bug. Not changed in this batch.

---

## The journey as currently wired

1. **Marketing entry** — `Home.jsx`'s hero/pricing/footer CTAs all call
   `handleCTA` → `window.location.href = '/signup'` (full page reload) → `App.jsx`
   route table client-redirects `/signup` → `/register` (`<Navigate replace>`).
   `Features.jsx`/`About.jsx`/`FAQ.jsx`/`Universes.jsx` link to `/signup` the
   same way. `Pricing.jsx`'s CTAs go straight to `/register?plan=...`.
2. **Register** (`Register.jsx`) — split-layout with photo carousel
   (`AuthLayout.jsx`, from #231). Four OAuth buttons (Google/Microsoft/Facebook/
   Apple) stacked above an "or" divider, then email/password/confirm-password/
   submit. Password signup shows an inline 6-digit OTP step
   (`base44.auth.register` → `verifyOtp`/`resendOtp`); OAuth skips OTP entirely
   (provider-handled). Every successful path — OTP verify or any OAuth
   callback — does a **full page reload** (`window.location.href`, not
   `navigate()`) to `/choose-plan`, documented inline as required because
   `AuthContext` only re-checks session on mount.
3. **Login** (`Login.jsx`) — same layout/OAuth set, single password field,
   "Forgot password?" link. Same full-reload-to-`/choose-plan` pattern.
4. **Plan gate** (`ChoosePlan.jsx`) — single canonical checkpoint
   (`isPastPlanStep`) every auth path routes through regardless of entry
   method. Three cards: Free (14-day trial, no card) → `/onboarding`; Pro
   US$49 / Ultra US$99 → `startCheckout()` → Stripe-hosted checkout.
5. **Payment** — `checkoutSession.js`'s `startCheckout`/`resolveCheckoutPriceId`
   is shared between `ChoosePlan.jsx` and `Account.jsx`'s in-app upgrade path,
   USD-first with an AUD fallback. Clear, single-sourced error states
   (network, non-JSON, backend error) surfaced inline on the page, not a
   silent failure.
6. **Plan activation** — `api/webhooks/stripe.js` writes `User.plan` +
   `planActivatedAt` off the verified `checkout.session.completed` event only,
   idempotent on replay. Correctly never trusts a client-supplied plan.
7. **Post-payment** — `PaymentSuccess.jsx` polls `base44.auth.me()` (1.5s ×
   8 ≈ 12s) waiting for the webhook write, then either "You're all set" → **a
   button to `/Dashboard`**, or (rare) a "taking longer than usual" state
   pointing at `/account`.
8. **Free-trial path only**: `ChoosePlan.jsx`'s `goFree` sends the user to
   `/onboarding` — an 8-step wizard (names, date, location, guest count,
   wedding type, Ava intro, universe/theme, fork) plus a branching "path A"
   (guest list, budget, vendors, cultural notes, inspiration) before a
   completion screen, writing to `WeddingDetails` as it goes (resumable
   drafts).
9. **In-app upgrade** (existing users, `Account.jsx` Billing tab) — same
   `create-checkout-session` call, redirects back to `/Dashboard?checkout=success`
   (tracked in `Dashboard.jsx`'s mount effect).

---

## Findings, most important first

### 1. Paying customers skip onboarding entirely — and the fallback is dead code
**This is the headline finding.** `PaymentSuccess.jsx`'s "done" state sends a
Pro/Ultra buyer straight to `/Dashboard`. Nothing in that path — not
`PaymentSuccess.jsx`, not `Dashboard.jsx` — ever routes them through
`/onboarding`. A paying customer can complete checkout without ever being
asked their wedding date, partner names, venue, guest count, or a universe/
theme — the exact fields the rest of the app (Guest Suite, website builder,
`WeddingDetails`) is built around.

The intended safety net is visibly there but **not wired up**:
`Dashboard.jsx:104/170` compute `showWelcomeBanner` (true when
`!currentUser.onboardingCompleted`) and `Dashboard.jsx:217-220` define a
`dismissWelcome` handler that marks `onboardingCompleted: true` — but
`showWelcomeBanner` is never read in the JSX. Grep confirms only two
occurrences of the identifier: the `useState` declaration and the one
`setShowWelcomeBanner(true)` call. **The banner cannot render.** A Pro/Ultra
buyer who skipped the free-trial-only wizard currently lands on a Dashboard
that shows zero guests, zero budget, zero schedule, with no prompt of any
kind explaining why or what to do next — and no path back into the
onboarding wizard is offered anywhere in `Dashboard.jsx`.

Free-trial signups don't have this gap (they're routed to `/onboarding`
directly from `goFree`), so this only affects the two paying tiers — the
segment least likely to tolerate friction, and the one that already handed
over a card.

**Recommendation**: either route Pro/Ultra buyers through (at minimum a
short version of) the onboarding wizard before `/Dashboard`, or fix and wire
up the welcome banner so it actually renders and links into `/onboarding`
for anyone who lands on the dashboard without a real `WeddingDetails`
record — not just a cosmetic dismiss action.

### 2. Two full password fields, no visibility toggle
`Register.jsx` requires `password` + `confirmPassword`, both masked, with no
show/hide affordance on either. A typo in either field only surfaces after
submit ("Passwords do not match"), forcing a retype of both. A single
password field with a visibility toggle (or dropping confirm entirely, which
most modern signup flows have — a wrong password just means "forgot
password" later) would cut a full field and a common error loop out of the
one flow OAuth doesn't cover.

### 3. OAuth is four stacked clickable buttons, not a one-tap prompt
Google/Microsoft/Facebook/Apple are all present and correctly skip OTP, but
none of them use the actual "one-tap" pattern (e.g. Google Identity
Services' auto-prompt overlay) — every provider still requires a deliberate
click to even begin. If "Google one-tap smoothness" is the literal bar being
asked for, this is the biggest structural gap relative to it: nothing here
is zero-click for a returning Google session.

### 4. `/signup` → `/register` is an unnecessary extra hop
`Home.jsx` (and `About.jsx`/`Features.jsx`/`FAQ.jsx`/`Universes.jsx`) point
their CTAs at `/signup` via `window.location.href` — a full page reload —
which then client-redirects to `/register` inside `App.jsx`'s route table.
That's a full app boot-and-redirect cycle where a direct link to `/register`
(or an SPA `navigate('/register')`) would land one hop sooner. Likely
inherited from wanting a stable, memorable marketing URL — reasonable, but
worth pointing `/signup` itself at a server-level redirect (or just linking
`/register` directly from marketing pages) rather than paying for it with a
full reload on every entry.

### 5. Full-page reloads at both auth-success points, by design
`Register.jsx` (post-OTP) and `Login.jsx` (post-password/OAuth) both use
`window.location.href = choosePlanUrl` rather than React Router `navigate()`,
documented inline as necessary because `AuthContext` only re-checks session
state on mount. This is a correct, deliberate tradeoff, not a bug — but it
does mean every login/signup pays for a full white-screen reload rather than
an instant SPA transition, which is exactly the kind of thing that reads as
"not quite one-tap smooth" even though nothing is actually broken. Worth a
follow-up look at whether `AuthContext` could expose a manual
re-check/refresh method so these could become `navigate()` calls instead —
out of scope for this report, flagging for later.

### 6. What's already solid — don't disturb these
- **Single canonical plan gate.** `isPastPlanStep()` in `ChoosePlan.jsx` is
  the one place that decides whether any auth path (password or any of 4
  OAuth providers, login or register) needs the plan step — no drift
  possible between entry points.
- **Server-verified plan activation.** The webhook is the only writer of
  `User.plan`, idempotent, never trusts a client-supplied plan or query
  param — `PaymentSuccess.jsx` correctly treats its own `?plan=` as a display
  hint only and polls for the real value.
- **Shared checkout logic.** `ChoosePlan.jsx` and `Account.jsx`'s upgrade
  path both go through the same `checkoutSession.js`, so pricing/currency
  logic can't drift between "new signup" and "existing user upgrading."
  Confirmed by PR #233's now-merged fix: `Account.jsx`'s billing label used
  to claim "USD X charged" while actually billing the AUD price — that class
  of bug structurally can't recur now that both paths resolve currency the
  same way.
- **Resumable onboarding.** The wizard persists a draft `WeddingDetails`
  record as it goes and rehydrates on refresh — a free-trial user who
  abandons partway through doesn't lose progress or get a duplicate record
  (the "Alex & Sam" incident fix referenced in `Onboarding.jsx`'s comments).
- **Honest error states throughout checkout.** Network failure, non-JSON
  response, and backend error all get distinct, actionable copy rather than
  a generic failure or silent hang.

---

## Not verified in this pass (needs a live browser run)
- Actual visual smoothness/timing of the two full-page-reload transitions
  (auth → choose-plan) and the Stripe-hosted checkout redirect.
- Whether the carousel crossfade (`AuthLayout.jsx`/`ImageSlider`) performs
  well on first paint vs. a placeholder flash.
- Mobile behavior of the split auth layout below `md` (the photo panel is
  `hidden md:block` — confirmed in code that it's dropped, not confirmed how
  the single-column form looks/feels on a phone).
- What a Pro/Ultra buyer's Dashboard genuinely looks like on first load with
  a zero-guest, zero-budget, zero-schedule, and (per finding #1) possibly no
  `WeddingDetails` record at all — recommend this be the first thing checked
  live once the browser connection is stable, since it's the most consequential
  finding here.
