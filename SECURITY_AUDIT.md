# Security audit — Openinvite

Read-only review. No code changes were made as part of this audit. Findings are ranked **critical / high / medium / low**. Locations are `file:line` where a specific line is meaningful; some findings span many call sites and list a representative sample plus a total count.

All findings were independently verified against the current `main` branch (post PR #63–#68) by reading the cited files directly — this is not a second-hand summary.

---

## 1. Tenant isolation

**Background:** `src/lib/resolveMyWedding.js` is the established fix pattern (`getMyWeddingDetails()`, `getMyInvitation()`, `getMyLiveStream()`): `base44.auth.me()` → `.filter({created_by_id: me.id})` → most-recent non-`is_test` record. It was correctly extended to `LiveStream` this session (PR #65, merged). The question for every other call site is whether it follows this pattern or the older, broken `entity.list()` / `entity.list('-created_date')[0]` pattern — which silently returns the single most-recent record **across the whole app**, regardless of who's asking, exactly as the LiveStream bug did before the fix.

### Anonymous, guest-facing surface (the published `/w/:weddingSlug` site)

| Severity | Location | Finding | Fix |
|---|---|---|---|
| **CRITICAL** | `src/components/guest-website/MultiPageWeddingWebsite.jsx:110` | `base44.entities.WeddingDetails.list()` — unfiltered, called on every load of every published wedding site. Ships **every couple's entire WeddingDetails record** (incl. `websitePassword`, emergency contacts, vendor phone numbers, all Guest Suite content) to any anonymous visitor's browser, then finds the match client-side by slug. Falls back to `details[0]` — an **arbitrary other couple's wedding** — if the slug doesn't match. Confirmed live: this is the component actually mounted at the public `/w/:weddingSlug` route. | Resolve via `base44.entities.WeddingDetails.filter({slug: weddingSlug})` server-side; never `.list()` on this entity from an anonymous surface. |
| **CRITICAL** | `src/components/guest-website/sections/OurStorySection.jsx:27` | `base44.entities.Photo.list()` — unfiltered. Displays `allPhotos.slice(0, 8)` with **no filtering by wedding at all** (the `wedding.id` in the effect's dependency array is never actually used in the query). Any couple's "our story" section can render a different couple's uploaded photos, and the full cross-tenant photo table is exposed on the wire to every anonymous visitor. | Filter by `wedding_id` (or the resolved wedding's id) before use. |
| **HIGH** | `src/components/guest-website/sections/TravelSection.jsx:26` | `base44.entities.Hotel.list()` — unfiltered, no filter at all. Every couple's guest travel page shows the identical platform-wide hotel list; the full list is exposed to anonymous visitors regardless of relevance. | Scope by wedding/owner, or confirm `Hotel` is meant to be a shared reference table (if so, downgrade — but verify with product before relying on that). |

### Authenticated dashboard surface

A systemic pattern: roughly **40 additional call sites** across dashboard pages call `.list()` on per-couple entities (`Guest`, `Budget`, `Vendor`, `Schedule`, `Photo`, `GuestMessage`, `MoodboardItem`) with no `created_by_id` filter — the exact bug class already fixed for `LiveStream`/`WeddingDetails`/`Invitation`, just not yet migrated everywhere. Representative sample (not exhaustive):

`Layout.jsx:264`, `Header.jsx:31`, `Dashboard.jsx:135`, `Guests.jsx:105`, `Messages.jsx:67`, `Seating.jsx:99`, `WeddingParty.jsx:311`, `Checklist.jsx:199-201`, `DailyBriefing.jsx:116-118`, `DailyUpdate.jsx:108-110`, `src/lib/avaContext.js:6-8`, `StudioHub.jsx:18`, `StudioShareTab.jsx:31`, `Calendar.jsx:67`, `Catering.jsx:52`, `Budget.jsx:183`, `Styling.jsx:51,92`, `Beauty.jsx:104,222`, `Vendors.jsx:88`, `Moodboard.jsx:64`, `UniverseStudio.jsx:20`, `ReceivedGifts.jsx:72`, `src/components/guests/ImportGuestModal.jsx:105`, `AIWeddingAssistant.jsx:37`, `src/pages/PhotoGallery.jsx:59`, and more.

| Severity | Scope | Finding | Fix |
|---|---|---|---|
| **CRITICAL** | ~40 call sites above (see §2 for why this is exploitable, not theoretical) | Since Base44 does not enforce owner-scoping server-side (confirmed in §2), **any logged-in couple** can read — and via the returned record ids, potentially write to — every other couple's guest list (names, emails, phones, dietary info, RSVPs), budget, vendors, schedule, photos, and private messages, just by having any account and loading these pages. | Migrate every one of these to the `resolveMyWedding.js`-style `created_by_id`-filtered pattern. This is the single largest remediation item in this audit. |

**Note:** `src/pages/WeddingWebsite.jsx` (a separate, apparently legacy/preview page, mounted at `/WeddingWebsite` via the `Pages` registry in `pages.config.js`) also contains ~9 unfiltered `.list()` calls (`Guest`, `RegistryItem`, `CustomGift`, `Hotel`, `Restaurant`, `StoryMilestone`, `Photo`, `LiveStream`, `CustomEventPage`, `WebsiteTheme`). **Correction to an earlier draft of this finding:** this route is *not* anonymously reachable — `/WeddingWebsite` is not in `App.jsx`'s `PUBLIC_PATH_SET` and doesn't match the `/w/`or `/rsvp/` prefixes `isPublicPath()` allows, so it falls through to the main app's route tree, which wraps the entire `Pages` registry (including this one) in `<ProtectedRoute>` (verified: `ProtectedRoute.jsx` renders `<Navigate to="/login">` when `!isAuthenticated`). It **is** reachable by any authenticated user, though — folding it into the same CRITICAL finding above rather than treating it separately. Consider also confirming whether this page is dead code superseded by `MultiPageWeddingWebsite.jsx`, and retiring it if so.

**Already correctly scoped** (no action needed): `src/lib/resolveMyWedding.js` itself; `GuestSuiteLiveStream.jsx` / `LiveStreaming.jsx` (migrated to `getMyLiveStream`); `WeddingGuestbookPage.jsx:37` (`.filter({wedding_id})`); `WeddingPollsPage.jsx` (writes scoped to a wedding id obtained elsewhere); `src/components/guest-website/GuestWebsite.jsx:18` (`.filter({slug: weddingSlug})` — the correct pattern for anonymous guest access, for comparison against the broken one above).

**Total confirmed unscoped call sites: ~43** (3 anonymous-reachable = critical/high; ~40 authenticated-only = critical, contingent on §2's enforcement-model finding, which is confirmed).

---

## 2. Public API surface

**Entity inventory** (39 total, via Base44 MCP `list_entity_schemas`): `GuestMessage`, `Task`, `SongRequest`, `VendorBooking`, `Music`, `VowSpeech`, `Invitation`, `WeddingDetails`, `Photo`, `VendorReview`, `ReceivedGift`, `WebsiteTheme`, `RegistryItem`, `RegistryProduct`, `ThemeDetails`, `CustomEventPage`, `VenueAsset`, `Vendor`, `Table`, `UserPayment`, `Note`, `CustomGift`, `VendorTask`, `Restaurant`, `Hotel`, `StreamChat`, `MoodboardItem`, `Photographer`, `LiveStream`, `Event`, `Schedule`, `Budget`, `StoryMilestone`, `QuoteRequest`, `Guest`, `VendorLog`, `Collaborator`, `GuestbookEntry`, `User`.

**No entity-level permission/RLS metadata is visible via the MCP schema tool.** It returns only JSON-Schema data shapes (types, enums, defaults, descriptions) — no `permissions`, `rls`, `public`, or `access_level` keys appear anywhere at the entity level.

### The load-bearing finding

| Severity | Finding | Fix |
|---|---|---|
| **HIGH (systemic)** | Base44 does **not** scope `.list()`/`.filter()` server-side by record owner. `src/api/base44Client.js` configures the SDK with `requiresAuth: false`, and a call with no `created_by_id`/`wedding_id`/`slug` filter returns **every record of that entity across every couple in the app** to whatever caller makes the request — authenticated or not. This is confirmed directly: `scripts/test-persistence.mjs` talks to the raw Base44 REST API with a bearer token and its own ownership-isolation tests exist *specifically because* an unfiltered query returns cross-tenant data. There is no platform-side safety net — every finding in §1 is real precisely because of this. | If Base44 supports entity-level row-level-security / owner-scoping rules, configure them as defense-in-depth so a forgotten filter in app code fails safe instead of leaking data. If it doesn't, the only mitigation is disciplined, complete migration of every call site to explicit ownership filters (§1), since there is no server-side backstop. |

No entity permission model beyond "any bearer token, or no token, gets `requiresAuth: false` client behavior" was found. Whether *anonymous* (fully unauthenticated) requests can reach the Base44 REST API directly was not separately load-tested in this audit (would require an out-of-band request outside the app) — treat as likely, given the client SDK itself doesn't gate on auth.

---

## 3. Serverless endpoints (`api/`, 24 files)

| Severity | File | Finding | Fix |
|---|---|---|---|
| **CRITICAL** | `api/send-invites.js` | No auth check at all (confirmed: zero references to auth/token/verify in the file). Accepts up to 200 arbitrary recipients plus attacker-controlled `customSubject`/`customBody`/`rsvpUrl`, and batch-sends via Resend from the warmed `hello@openinvite.com.au` domain. Only IP rate-limited (20/min) — a ready-made phishing/spam relay. | Require a verified Base44 session token (same pattern as `on-signup.js`) and check the `guests[]` list against the caller's own Guest records before sending. |
| **CRITICAL** | `api/create-portal-session.js` | Accepts a client-supplied `customerId` with **no ownership check and no auth** (confirmed: `customerId` is read straight from `req.body` and passed to Stripe with no cross-check). Anyone who obtains or guesses another user's Stripe customer id gets a full Stripe Billing Portal session — view/change payment methods, cancel the subscription — for that account. | Derive `customerId` server-side from the caller's verified Base44 identity; never trust a client-submitted value for this. |
| **HIGH** | `api/send-email.js` | No auth check; any caller can send any of 5 fixed templates to any `to` address with attacker-controlled `name`/`plan` fields. Open relay, IP-rate-limited only (5/min). | Same fix as `send-invites.js` — require verified caller identity, restrict `to` to the caller's own address. |
| **HIGH** | `api/spotify-callback.js` | OAuth `state` param is read but never validated against a server-issued nonce — no CSRF protection on the OAuth flow. Access/refresh tokens are base64-encoded (trivially reversible, not encryption) and passed back via a redirect **query string**, landing in browser history and platform access logs. Refresh token is long-lived. | Validate `state` against a server-side nonce; hand off tokens via a short-lived server session/cookie instead of a URL. |
| **MEDIUM** | `api/rsvp-link-request.js` | No Turnstile/CAPTCHA — only IP rate limiting (5/60s). Could be scripted to spam a target inbox with legitimate-looking "here's your RSVP link" emails. | Add the same `verifyTurnstileToken` gate already used by `guestbook-submit.js`. |
| **MEDIUM** | `api/places.js`, `place-details.js`, `places-photo.js`, `places-search.js` | No auth, no rate limiting, wildcard `*` CORS on all four — proxies a paid Google API key with no abuse ceiling. | Add per-IP rate limiting via the existing `_lib/security.js` helper. |
| **MEDIUM** | `api/_lib/security.js`, `api/webhooks/stripe.js`, `api/cron/send-onboarding-emails.js` | Three independent "fail-open if env var unset" designs: Turnstile verification is skipped if `TURNSTILE_SECRET_KEY` is unset; the Stripe webhook trusts an unsigned body if `STRIPE_WEBHOOK_SECRET` is unset; the cron endpoint allows unauthenticated triggering if `CRON_SECRET` is unset. All three log a warning but proceed anyway. | Confirm all three secrets are actually set in the Vercel production environment (not just documented as required); consider making these fail closed instead of open. |
| **LOW** | `api/create-checkout-session.js` | `priceId` is shape-validated (`price_...` prefix) but not whitelisted against the app's two known plan prices — could be used to create a checkout session for any other price object in the Stripe account. | Whitelist against the two configured price-id env vars. |
| **LOW** | `api/on-signup.js` | No rate limiting (every other email-sending endpoint has one). Lower impact since it only emails the verified caller's own address. | Add the existing `checkRateLimit` helper. |
| Good, no action | `api/admin/stats.js`, `api/guestbook-submit.js`, `api/verify-signup.js` | Properly gated: `admin/stats` checks a token-to-email match; `guestbook-submit` enforces Turnstile and fails closed; `verify-signup` has rate limiting, Turnstile, and a disposable-email-domain check. | — |
| Note, accepted risk | `api/verify-signup.js` | This is an advisory pre-check the frontend calls before `base44.auth.register()` — nothing stops a scripted client from calling Base44's signup directly and skipping it. Inherent to a client-SDK-driven auth model. | Flag as accepted risk, not independently fixable from this repo. |

---

## 4. Tokens & enumeration

| Item | Assessment |
|---|---|
| `rsvp_link_id` generation | `crypto.randomUUID()` (`src/pages/Guests.jsx:279`, `src/components/guests/SendInvitesModal.jsx:337`, `src/components/messages/WhatsAppCompose.jsx:54`) — cryptographically random UUID v4, ~122 bits of entropy. **Not brute-forceable. No finding.** |
| Guest token scope | `src/components/rsvp/RSVPPage.jsx:212` resolves the guest via `Guest.filter({rsvp_link_id: token})`, and every subsequent read/write in the file uses `guest.id` taken from that lookup's own result — never a client-supplied/editable guest id. **A valid token cannot be used to act on a different guest through this page.** One caveat carried over from §2: since this is a direct client-side Base44 SDK call, the *real* enforcement boundary is Base44's entity permissions, not this app-level check — if `Guest.update` is permitted for any caller by an arbitrary id server-side (which §2 suggests is likely, given no RLS was found), this token check is a UI convenience, not a hard security boundary. |

| Severity | Location | Finding | Fix |
|---|---|---|---|
| **LOW** | `api/rsvp-link-request.js:155-158` | The catch-all 500 path is only reachable via the "guest found" branch (the Resend call) — a persistent pattern of 500-for-one-email vs. always-200-for-another is a faint, noisy email-enumeration side channel. Everything else about this endpoint is well-built: identical `{sent:true}` response regardless of match (`:114`, `:154`), guest data never returned to the client, IP-rate-limited (5/60s, `:89`). | Wrap the Resend call so any failure still returns the neutral 200. |
| **LOW** | `api/rsvp-link-request.js` | Rate limiting is per-IP only, not per-email; distributed requests bypass it. | Add a secondary per-email limiter. |
| Not a finding | Wedding slugs (`/w/alex-sam`) | Intentionally human-guessable — by design for a public wedding site, not a flaw. A `PasswordGate.jsx` component exists for couples who want to gate access further. | No action needed. |

---

## 5. Secrets

| Severity | Finding | Fix |
|---|---|---|
| **CRITICAL** | Hardcoded, live Google Maps API key committed to source: `AIzaSyD-9tSrke72PouQMnMX-a7eZSW0jkFMBWY` in `src/components/event-details/VenueSearch.jsx:5` and `src/components/shared/LocationPicker.jsx:3` (the latter loads it directly into a public `<script src="...&key=...">` tag). Confirmed present in both files, identical key. This directly contradicts this project's own CLAUDE.md rule ("NEVER use a VITE_GOOGLE_* client-side key... Server-side proxy only") — it isn't even an env var, just a checked-in string. | Revoke/rotate this key in Google Cloud Console immediately, add HTTP-referrer restrictions to whatever replaces it, and route both components through the existing server-side `api/places*.js` proxies instead of calling Google directly from the client. |

No other hardcoded secrets found (`sk_`, `pk_`, `whsec_`, other `AIza` patterns all clean). `.env`, `.env.local`, and `.env.*` are gitignored; only `.env.example` is tracked.

**Env var inventory:**

- **Server-only** (`process.env.*`, never bundled — safe): `BASE44_ADMIN_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `GOOGLE_PLACES_API_KEY`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_CLIENT_ID`, `TURNSTILE_SECRET_KEY`, `CRON_SECRET`, `SENTRY_AUTH_TOKEN`, `BASE44_TEST_EMAIL`/`BASE44_TEST_PASSWORD`, `APP_URL`.
- **Client-exposed** (`import.meta.env.VITE_*`, bundled into browser JS — all appropriate to be public): `VITE_APP_URL`, `VITE_BASE44_APP_ID`, `VITE_POSTHOG_KEY`/`VITE_POSTHOG_HOST`, `VITE_SENTRY_DSN`, `VITE_CRISP_WEBSITE_ID`, `VITE_SPOTIFY_CLIENT_ID` (OAuth client ids are meant to be public), `VITE_STRIPE_PRO_PRICE_ID`/`VITE_STRIPE_ULTRA_PRICE_ID`, `VITE_TURNSTILE_SITE_KEY` (site keys are meant to be public). None of these are secret-shaped — the actual violation is the hardcoded Maps key above, not a `VITE_` leak of something that should have stayed server-side.

---

## 6. Data exposure

| Severity | Finding | Fix |
|---|---|---|
| **MEDIUM** | Sentry `replayIntegration()` is enabled (10% of sessions, 100% on error) and Sentry initializes globally at `src/main.jsx:1` (app entrypoint) — not scoped to the authenticated dashboard, so Session Replay is active on anonymous guest-facing pages too (RSVP forms, guestbook). `sendDefaultPii: false` is explicitly set (good), but no explicit `maskAllText`/`blockAllMedia` replay config was found — the app relies on the SDK's default masking rather than a verified, explicit policy. | Explicitly configure and verify replay text/input masking (`maskAllText: true`, mask selectors for RSVP/guestbook form fields), or disable replay on guest-facing routes entirely. |
| **LOW** | Several `api/*.js` files log recipient email addresses on send: `api/send-email.js:143`, `api/on-signup.js:112`, `api/cron/send-onboarding-emails.js` (multiple lines), `api/webhooks/stripe.js:105`. These land in Vercel function logs (team-only access, not public), but are a broader-than-necessary PII surface. | Log a truncated/hashed identifier instead of the full address where the address itself isn't needed for debugging. |
| Not a finding | PII in URLs | No query-string email/phone/name patterns found anywhere in `src/` or `api/`. Clean. |
| Not a finding | PostHog (`src/lib/analytics.js`) | `identify()` is called only in `LoginScreen.jsx:232` and `Dashboard.jsx:130`, with the logged-in **account owner's own** email/name — standard SaaS practice. No guest PII sent to PostHog anywhere. |
| Not a finding | Console logging of secrets | No tokens, API keys, or full guest objects found logged anywhere. The `key present: true/false` boolean checks (`send-email.js:93`, `create-portal-session.js:10`, `create-checkout-session.js:15`) are safe by design. |
| Investigated, not confirmed | "+Add Photo" admin control visible to anonymous visitors | The only functional upload control (`src/pages/PhotoGallery.jsx`, with `Photo.create` and literal "Add Photo" text) is registered in the `Pages` map and — per §1's routing analysis — falls inside `App.jsx`'s `<ProtectedRoute>` block, unreachable by anonymous visitors (hits `/login` first). The only other "Add photo" text is a static, non-interactive placeholder in `src/components/website-builder/WBWebsitePreview.jsx:574`, also behind the same protected `/website-editor` route. The actual guest-facing photos page, `src/components/guest-website/pages/WeddingPhotosPage.jsx`, has no upload/edit control at all — pure read-only display. A broader grep of the entire `guest-website/` tree for `isOwner`/`isEditable`/`canEdit`/`isAdmin` conditional-rendering patterns returned zero matches — there is no admin-affordance-gating pattern present to leak in the current codebase. **This finding did not reproduce.** If it was observed live on the production site, it may already have been fixed, or may point at a URL/screenshot worth cross-checking directly rather than treating as an open item here. |
| Adjacent to §1 | `src/pages/PhotoGallery.jsx:59` | `base44.entities.Photo.list('-created_date')` — the same unscoped "most recent record app-wide" pattern already fixed for LiveStream. Auth-gated (not anonymous-reachable) but means any logged-in user could see another couple's photos. Already folded into §1's ~40-site count. | Migrate to a `created_by_id`-filtered pattern. |

---

## 7. Dependency check (`npm audit`)

**32 total findings: 1 critical, 11 high, 19 moderate, 1 low.** Fix availability noted where `npm audit` reports one.

| Severity | Package | Issue | Fix available? |
|---|---|---|---|
| **CRITICAL** | `jspdf` | ReDoS + DoS | Yes, but major version bump (`4.2.1`, semver-major) |
| **HIGH** | `xlsx` | Prototype pollution + ReDoS | **No fix available** — no patched version currently published |
| **HIGH** | `react-router`, `react-router-dom`, `@remix-run/router` | Open-redirect / XSS via untrusted redirect paths | Yes |
| **HIGH** | `lodash` | Prototype pollution (`_.unset`/`_.omit`), code injection via `_.template` | Yes |
| **HIGH** | `glob` | Command injection via CLI `-c`/`--cmd` (build-tool dependency, not runtime-reachable by end users) | Yes |
| **HIGH** | `minimatch`, `picomatch` | ReDoS via crafted glob patterns (build-tool dependencies) | Yes |
| **HIGH** | `rollup` | Arbitrary file write via path traversal (build-time only) | Yes |
| **HIGH** | `vite` | NTLMv2 hash disclosure / `server.fs.deny` bypass (dev-server only, Windows-specific) | Yes |
| **LOW** | `flatted` | Unbounded recursion DoS / prototype pollution | Yes |

**Fix:** run `npm audit fix` for the items with a non-major fix available; separately evaluate the `jspdf` major-version bump (check for breaking changes in whatever PDF-generation feature uses it) and find an alternative to `xlsx` or accept the risk with awareness, since no patched version exists upstream. The `glob`/`minimatch`/`picomatch`/`rollup`/`vite` findings are build-tooling dependencies, not code shipped to end users — lower real-world priority than the runtime-facing `react-router`/`lodash`/`xlsx`/`jspdf` issues.

---

## 8. Third-party inventory (for the privacy policy)

| Service | Data sent | Where in code |
|---|---|---|
| **Base44** | All wedding/guest/RSVP/guestbook/theme data; user accounts; actual photo file uploads (`base44.integrations.Core.UploadFile`) | Throughout `src/`, `scripts/`, `api/*` (client SDK + `BASE44_ADMIN_KEY` server-side) |
| **Vercel** | Hosting, request logs, cron triggers, environment variables | Platform-level |
| **Resend** | Guest/couple email addresses, names, wedding details, RSVP links | `api/send-invites.js`, `send-email.js`, `on-signup.js`, `rsvp-link-request.js`, `webhooks/stripe.js` |
| **Stripe** | Couple's email, payment method, plan/price metadata | `create-checkout-session.js`, `create-portal-session.js`, `webhooks/stripe.js`, `admin/stats.js` |
| **PostHog** | Couple's email + full name (on `identify()`), event names, auto-captured full page URLs on every route change (`capture_pageview: true`) | `src/lib/analytics.js` |
| **Sentry** | Error stack traces; Session Replay (10% of sessions, 100% on error) — `sendDefaultPii: false` set, replay masking config not explicitly verified (see §6) | `src/lib/sentry.js` |
| **Crisp** | Couple's email + full name on chat `identify` | `src/lib/crisp.js`, `LoginScreen.jsx`, `Layout.jsx` |
| **Cloudinary** | No user data — hosts only static marketing/stock imagery (login backgrounds, feature-page images); confirmed not used for any guest/couple uploads | `LoginScreen.jsx`, `HeroSection.jsx`, `FeatureInvitations.jsx`, etc. |
| **Google Places** | Search queries (venue/vendor names, locations) couples type in; no PII beyond that | `api/places*.js`, `place-details.js` (plus the two hardcoded-key client call sites flagged in §5) |
| **Spotify** | Couple's Spotify profile (display name, avatar), OAuth access/refresh tokens (see §3 CSRF/token-in-URL finding) | `api/spotify-*.js` |
| **Cloudflare Turnstile** | Client IP, challenge token | `api/_lib/security.js`, `verify-signup.js`, `guestbook-submit.js` |

---

## Fix-first list

Ordered by real-world risk (exploitability × blast radius), not by section:

1. **Rotate the hardcoded Google Maps API key** (`VenueSearch.jsx:5`, `LocationPicker.jsx:3`) — revoke in Google Cloud Console, add referrer restrictions, route through the existing `api/places*.js` proxies. *(§5, one-line code fix + a console action)*
2. **Lock down `api/create-portal-session.js`** — stop trusting a client-supplied `customerId`; derive it from the caller's verified identity. Currently allows any caller who obtains/guesses a Stripe customer id to open that account's billing portal. *(§3)*
3. **Lock down `api/send-invites.js` and `api/send-email.js`** — add caller-identity verification; both are currently open, attacker-controlled email relays riding a warmed sending domain. *(§3)*
4. **Migrate the ~40 remaining unscoped dashboard entity queries** to the `resolveMyWedding.js` `created_by_id`-filtered pattern — this is the largest single remediation item and the one with the widest blast radius (every couple's guest PII, budget, vendors, messages). *(§1)*
5. **Fix the 3 unscoped queries on the anonymous published site** (`MultiPageWeddingWebsite.jsx:110`, `OurStorySection.jsx:27`, `TravelSection.jsx:26`) — these are reachable with zero authentication at all. *(§1)*
6. **Fix `api/spotify-callback.js`** — validate OAuth `state`, stop passing tokens via URL. *(§3)*
7. **Confirm entity-level permission/RLS options with Base44** and enable them if available, as a server-side backstop — right now a single forgotten filter anywhere in the app is a full data leak, with no platform-level safety net. *(§2)*
8. **Add Turnstile to `api/rsvp-link-request.js`**; add per-email rate limiting alongside the existing per-IP limiter. *(§3, §4)*
9. **Verify `TURNSTILE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `CRON_SECRET` are actually set in Vercel production** — all three currently fail open if unset. *(§3)*
10. **Run `npm audit fix`** for the packages with a non-major fix available; evaluate the `jspdf` major bump and the unpatched `xlsx` dependency separately. *(§7)*
11. **Explicitly configure Sentry Session Replay masking** (or disable replay on guest-facing routes) rather than relying on SDK defaults. *(§6)*
12. Minor cleanup: whitelist `priceId` in `create-checkout-session.js`; add rate limiting to `on-signup.js`; stop logging full email addresses in the email-sending endpoints. *(§3, §6)*
