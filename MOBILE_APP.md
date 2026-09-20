# Openinvite mobile app v0

Branch `mobile/app-shell`. Built against `MOBILE_APP_GOAL.md`, informed by
`MOBILE_AUDIT.md` (the 390px audit of the existing dashboard).

## Phase 0: inventory

### The platform, as found

| Thing | Where | What the mobile shell reuses |
|---|---|---|
| Router | `src/App.jsx`, `react-router-dom` v6 `BrowserRouter`. Authenticated routes sit under one `<ProtectedRoute>` in `AuthenticatedApp`; `pages.config.js` auto-registers `/PascalCase` routes. | `/m/*` registered beside the dashboard's guard with its own `ProtectedRoute` (so it can return to `/m` after login); `/m/preview/*` registered outside any guard, dev only. |
| Auth | Base44 (`@base44/sdk`), not Supabase. `src/lib/AuthContext.jsx` exposes `useAuth()` with `user`, `isAuthenticated`, `isLoadingAuth`, `logout`. Token in `localStorage.base44_access_token`. Email + password via `base44.auth.loginViaEmailPassword`; Google / Apple via a full-page redirect to `base44.app` that returns `?access_token=` to `from_url`. `Login.jsx` honors `?next=`. | `useAuth()` for the user, `logout` for sign out. Unauthenticated `/m` sends to `/login?next=%2Fm`. |
| Data client | `src/api/base44Client.js` (`base44.entities.*`, wrapped by the trial write guard). Ownership-scoped readers in `src/lib/resolveMyWedding.js`: `getMyWeddingDetails()`, `putMyWeddingDetails()`, `getMyRecords(entity, sort)`, `getMyGuestsWithRsvp()`. Guest writes go through `src/lib/guestWrites.js` (`createGuest`, `updateGuest`, `deleteGuest`, which call `/api/my-guests`). | Exactly these. No new endpoints, no new entities. |
| Plan gating | `src/lib/trialStatus.js` `getTrialStatus(user)` (`plan`, `isPaid`, `trialActive`, `daysLeft`); `canAccessUltra(user)`. Checkout in `src/lib/checkoutSession.js`, billing portal in `Account.jsx`. | `getTrialStatus` for the Account plan row. Every checkout / upgrade / portal CTA is hidden when `isNative()`. |
| Ava | `src/components/layout/AvaChatPod.jsx` (self-contained: builds context, calls the LLM, renders action cards; props `onClose, openDetail, messages, setMessages, dismissed, setDismissed, onClear`). Opened from anywhere via `openAva()` in `src/lib/avaOpen.js`. | The pod is rendered unchanged inside a full-height mobile bottom sheet; its fixed 380x520 inline size is overridden by a scoped stylesheet under `.oi-mobile-root`. Scope, prompts and tools untouched. |
| Existing mobile handling | One breakpoint at 1024px in `Layout.jsx` + `index.css`: a 64px white top bar with a hamburger that opens a left `Sheet` drawer. No bottom tab bar, no safe-area handling, no `viewport-fit=cover`. See `MOBILE_AUDIT.md`. | Nothing. The shell is a separate tree under `/m`. |
| Universe / site | `WeddingDetails.activeUniverse`, `slug`, `websiteEnabled`, `coverPhoto`; `src/lib/universeCatalog.js` `getUniverse(id)`; sample hero via `getSampleWedding(id)?.coverPhoto` (as `StudioHub.jsx` does). Site URL is `${origin}/w/${slug}`. | Site tab reads these; share uses the same URL. |
| Countdown / names | `src/lib/weddingCountdown.js` `daysUntilWedding`, `countdownLabel`; couple names from `couple1Name` / `couple2Name` (as `Layout.jsx`). | Home hero. |
| Git hooks | `.githooks/pre-commit` refuses undeclared new files (`STAGE_PATHS=... git commit`); `pre-push` runs payments-freeze, no-credentials, canon-branch, docs-channel, then `npm run lint`. | Every commit declares its paths. |

### Desktop route map

Scope column: **v0** = built as a mobile screen; **row** = reachable from a mobile row that hands off to the desktop page (in-app on the web, the live site in the system browser natively); **later** = not in v0. Updated after Phase 2 to what was built.

| Desktop route | What it does | Data source | Mobile tab | Scope |
|---|---|---|---|---|
| `/DailyUpdate` | Landing page: greeting, day state, stat tiles, Ava briefing | `getMyWeddingDetails`, `getMyRecords('Note'/'Schedule'/'Budget'/'Vendor')`, `getMyGuestsWithRsvp`, `dayState.js` | Home | v0 (hero, next up, RSVP and budget snapshots, quick actions) |
| `/event-details` | Partner names, date, venues, guest count | `getMyWeddingDetails` / `putMyWeddingDetails` | Account | row (desktop) |
| `/Schedule`, `/Calendar` | Wedding-day and planning schedule | `getMyRecords('Schedule')`, `base44.entities.Schedule` | Plan | v0 read-only list under Plan › Timeline |
| `/TodoList`, `/Checklist` | Tasks (Note entity, `view_type: 'todo'`) and the auto checklist | `getMyRecords('Note')`, `base44.entities.Note.create/update/delete` | Plan | v0 (checklist segment: list, complete, add) |
| `/Guests` | Guest list, filters, add / edit / import, send invites | `getMyGuestsWithRsvp`, `guestWrites.js`, `weddingEvents.js` | Guests | v0 (list, filters, search, detail, add / edit sheet) |
| `/SendInvites`, `/Invitations` | Email sends and invitation design | `SendInvitesModal`, builder | Guests | later (desktop) |
| `/Polls` | Polls and games | `getMyRecords('Poll')` | Plan | later |
| `/Messages` | Guest replies and WhatsApp | `getMyRecords('Message')` | Guests | later |
| `/Seating` | Table canvas | `getMyRecords('Table')`, `seatingChart.js` | Plan | row (desktop, per its own notice) |
| `/wedding-party` | Wedding party members | `getMyWeddingDetails` | Plan | later |
| `/Moodboard`, `/Styling`, `/Beauty`, `/FoodBeverage`, `/Music`, `/Photography`, `/VowsSpeeches`, `/wedding-favours` | Style and experience planning pages | mixed | Plan | later |
| `/Vendors` | Vendor list and status | `getMyRecords('Vendor')` | Plan | v0 read-only list under Plan › Vendors |
| `/VendorMarketplace` | Google Places vendor search | `/api/places-search` | Plan | later |
| `/ceremony-details`, `/transport`, `/accommodation`, `/emergency-contact` | On-the-day details | `getMyWeddingDetails` | Plan | later |
| `/Budget` | Plan, expenses, forecasting | `getMyRecords('Budget')`, `base44.entities.Budget`, `WeddingDetails.budget` via `/api/my-wedding-details` | Plan | v0 (totals, categories, category detail, add expense sheet) |
| `/Registry` | Registry platforms, products, cash funds | `getMyWeddingDetails` | Site | row (desktop) |
| `/studio` | Studio hub | `getMyWeddingDetails` | Site | v0 (site status card) |
| `/studio/website`, `/website-editor` | Full website builder | builder state | Site | row (desktop) |
| `/studio/universe` | Universe picker | `universeCatalog.js` | Site | row (desktop) |
| `/studio/ava` | Ava studio | | Site | row (desktop) |
| `/GuestSuiteSchedule`, `/QandA`, `/GuestSuiteRegistry`, `/GuestSuiteAccommodation`, `/GuestSuiteTransport`, `/GuestSuiteExperience`, `/GuestSuitePolicies`, `/GuestSuitePolls` | Guest suite content editors | `getMyWeddingDetails` sub-fields | Site | row (links to desktop pages) |
| `/honeymoon`, `/Considerations` | Extras | `getMyWeddingDetails`, static | Plan | later |
| `/account` | Profile, plan, billing portal, notifications | `useAuth().user`, `base44.auth.updateMe`, `/api/create-portal-session` | Account | v0 (rows; purchases hidden natively) |
| `/help` | Help center | static | Account | row (link) |
| `/Contact` | Contact form | `/api/contact` | Account | row (link) |

### Route prefix check

`/m` collides with nothing. Existing routes starting with `m` are `/mocks/universe/{a,b,c}` (a different first segment). Guest sites are `/w/:slug`, RSVP is `/rsvp/:token`, games `/games/:token/:id`. `isPublicPath()` in `App.jsx` does not match `/m`, so `/m/*` falls through to the authenticated `Routes`, which is where it is registered. `/m/preview/*` is registered next to `/login` (outside the guard), and only when `import.meta.env.DEV`.

## How to run

**Preview (no sign-in, fixture data, dev only)**

```
npm run dev
open http://localhost:5173/m/preview
```

Tabs: `/m/preview`, `/m/preview/guests`, `/m/preview/plan`, `/m/preview/site`,
`/m/preview/account`. Deep screens: `/m/preview/guests/g3`,
`/m/preview/plan/budget/catering`. Query flags: `?state=loading`, `?state=empty`,
`?state=error` on any screen; `?add=1` opens the add sheet on Guests and Plan;
`?segment=budget|timeline|vendors` on Plan; `?native=1` on Account shows the
no-purchases variant. Everything is local state; nothing is written.

`npm run mobile:screenshots` (with the dev server up; set `BASE` if it is not on
5173) recaptures `mobile-screenshots/` and fails if any screen is wider than the
viewport, has a tap target under 44px, or an input under 16px.

**The real thing on the web**

Sign in, then open `/m`. Loads the couple's own data through the same helpers
the desktop uses. Nothing links to `/m` from the dashboard yet.

**iOS simulator**

```
npm run mobile:build        # vite build, then npx cap sync
npm run mobile:ios          # opens ios/App in Xcode; pick a simulator and run
```

Needs Xcode (the full app, not the command line tools). Capacitor 8 uses Swift
Package Manager, so CocoaPods is not required.

**Android emulator**

```
npm run mobile:build
npm run mobile:android      # opens android/ in Android Studio; run on an emulator
```

Needs Android Studio with an SDK and a JDK 17+.

## What was built

| Area | Built | Notes |
|---|---|---|
| Shell | `MobileShell`, `TabBar` (five tabs, 2px primary indicator above the icon, light haptic on change), `Screen` + `ScreenHeader` (32px title, compact 17px bar fades in past 48px scroll), Ava button, Ava sheet, own `Toaster` | `src/mobile/shell/` |
| Primitives | `Block`, `Row`, `PillButton`, `FilterPills`, `PeekCarousel` (with dots), `ProgressBar`, `EmptyState`, `ErrorState`, `Skeleton` / `SkeletonRows`, `BottomSheet` (square, 220ms transform + opacity, Escape and scrim close), `SearchScreen`, `TextField` / `TextAreaField` / `SelectField` / `Checkbox`, `StatusPill` | `src/mobile/ui/` |
| Tokens | CSS custom properties on `.oi-mobile-root` only; 16px inputs; `env(safe-area-inset-*)` on the compact bar, the tab bar, the Ava button, the sheets and the toaster; `prefers-reduced-motion` collapses every transition | `src/mobile/styles/mobile.css` |
| Home | "Hi {first name}", hero (universe still or the couple's cover photo, names, date, days to go, one contextual pill), Next up peek carousel with tap-to-complete, Replies snapshot with progress bar and one sentence, Budget snapshot, four quick-action tiles | `screens/home/` |
| Guests | Filter pills (all, attending, awaiting, declined, not yet invited, plus tag groupings), rows with initials tile and status pill, full-screen search, guest detail (email and phone rows open the dialer / mail), add and edit bottom sheet with plain-language validation, remove | `screens/guests/` |
| Plan | Segments: checklist (grouped overdue / next 30 days / later / done, tap to complete with haptic, add sheet), budget (spent, remaining, paid, category rows, category detail with its expenses, add and edit expense sheet), timeline (read-only, grouped by day), vendors (read-only, status pills), a Seating hand-off row | `screens/plan/` |
| Site | Universe, live / draft, address, preview image, View site (system browser natively) and Share link (native share sheet, Web Share, or clipboard), rows into the eight guest-suite editors, a "best on desktop" block for the builder and Ava studio | `screens/site/` |
| Account | Profile block, rows (account details, wedding details, collaborators via the existing `CollaborateModal`, plan, notifications, help center, contact support, log out). Plan row and trial note; every upgrade / checkout / portal call to action is hidden when `isNative()` | `screens/account/` |
| Ava | The existing `AvaChatPod`, rendered unchanged inside a full-height sheet; its 380x520 inline size and 13px composer are overridden by scoped CSS. Conversation state lives in `MobileApp` so it survives closing the sheet. Any action card that navigates closes the sheet | `MobileApp.jsx`, `mobile.css` |
| Data | `useLoad` (loading / data / error / reload), readers over `getMyWeddingDetails`, `getMyGuestsWithRsvp`, `getMyRecords`; writers over `guestWrites.js`, `base44.entities.Note`, `base44.entities.Budget`, with the same field shapes the desktop pages write | `src/mobile/data/` |
| Native | `native.ts`: `isNative`, status bar, keyboard resize, splash hide, haptics, share, external browser, preferences, Android back button, and the `/api/` origin rewrite (see blockers) | `src/mobile/native.ts` |
| Capacitor | `capacitor.config.ts` (`au.com.openinvite.app`, `Openinvite`, `webDir: dist`), `ios/` and `android/` projects, eight plugins synced, npm scripts | root |
| Preview | `/m/preview/*`, `src/mobile/fixtures/`, twenty screenshots in `mobile-screenshots/`, `scripts/mobile-preview-screenshots.mjs` | |

Verified: `npm run build` exits 0; `npm run lint` exits 0; `scripts/test-route-collisions.mjs` passes; the real `/m` tree renders all five tabs through the repo's seeded render harness at 390x844 and its writes hit `POST /api/my-guests`, `POST .../entities/Note`, `PUT .../entities/Note/:id` and `POST .../entities/Budget`, the same calls the desktop makes.

## Stubs, skips and blockers

Stated plainly, in order of weight.

1. **Natively, no data loads until the API allows the shell's origin.** Every data call in the codebase is same-origin (`fetch('/api/...')`, the SDK's `serverUrl: ''`). `native.ts` rewrites those to `https://openinvite.com.au` inside the shell, but `api/_lib/security.js` only reflects `Access-Control-Allow-Origin` for the production hostnames, so the browser blocks the response. Adding `capacitor://localhost` (iOS) and `https://localhost` / `http://localhost` (Android) to `ALLOWED_ORIGINS` is a one-line change to an existing file, and out of bounds for this branch. The SDK's own calls (`/api/apps/*`, including sign-in) are rewritten too and ride Vercel's proxy to `base44.app`; whether that proxied response carries CORS headers for the shell's origin is untested from here. Until both are settled the native app renders its error states. On the web, `/m` is fully live.
2. **Native projects were added and synced, not built.** This machine has the Xcode command line tools only (`xcodebuild` reports "requires Xcode"), no CocoaPods (not needed with Capacitor 8), no Android Studio and no JDK ("Unable to locate a Java Runtime"). `npx cap add ios`, `npx cap add android` and `npx cap sync` all succeeded. Install Xcode from the App Store and Android Studio (with a JDK 17) to open and run them. No icons or splash images beyond Capacitor's defaults.
3. **Google and Apple sign-in do not work in the shell.** See the auth section below. Email and password does (once item 1 is done).
4. **Pull to refresh: skipped.** The data layer is plain fetch-and-set; there is no query cache to invalidate. Each container exposes `reload`, so wiring a pull gesture later is small.
5. **Guest form: no per-event RSVP grid, no table assignment.** Both go through their own write paths on desktop (`event_responses` per event, `assignGuestToTableByName`) and stay there. New guests get the default main-event invitations exactly as `Guests.jsx` gives them.
6. **Budget total is read, not set.** The plan total lives in the AES-encrypted `WeddingDetails.budget` and is saved through `/api/my-wedding-details` from the desktop planner; the mobile Budget shows it and falls back to the sum of budgeted amounts when there is none.
7. **Timeline and vendors are read-only** on the phone, with a hand-off to the desktop page.
8. **Remove guest uses `window.confirm`**, as `Guests.jsx` does. A sheet-based confirm is a later polish.
9. **Preview boot calls.** The preview code makes no network calls, but the app shell around it still does at boot: `CurrencyProvider` calls `base44.auth.me()` and the SDK sends an analytics batch. Both are existing behavior of every page and out of scope to change.
10. **Logout inside the shell** clears the session and reloads `/login` (existing `AuthContext.logout`); after signing back in, the redirect chain lands on `/DailyUpdate`, which `App.jsx` sends to `/m` when native. On the web, signing in from `/login` without `?next=` lands on the desktop as before.
11. **Lint coverage.** `eslint.config.js` does not list `src/mobile/**`, so those files get only the base config (no React or hooks rules). `npm run lint` passes; adding the directory to the config is an existing-file edit.

## Needs a decision

- **CORS for the shell's origin** (`api/_lib/security.js` `ALLOWED_ORIGINS`): add `capacitor://localhost`, `https://localhost` and `http://localhost`. Without it the native app cannot load anything. Blocker 1 above.
- **Purchases in the app.** Every upgrade / checkout / billing-portal call to action is hidden when `isNative()`. Stripe Checkout inside an App Store binary is a review risk (guideline 3.1.1) and the current `window.location.href` to `checkout.stripe.com` would strand the couple on the live website anyway. Options: sell only on the web and say so in the app (what v0 does), StoreKit / Play Billing, or Stripe in the system browser with a deep-link return. The trial banner, `ChoosePlan`, `Pricing` and `Account` are desktop pages and untouched.
- **Should mobile web visitors be sent to `/m`?** Nothing redirects today. The dashboard's own phone treatment is what `MOBILE_AUDIT.md` describes. If yes, the place is `Layout.jsx` or `App.jsx` behind a `(max-width: 1023px)` + `pointer: coarse` check, with a way back to the desktop view.
- **Two edits to `App.jsx` beyond registering routes**, both small and both in the router file: the native start-path redirect (`/` and `/DailyUpdate` to `/m` when `isNative()`) and the static import of `native.ts` that makes the API rewrite install before `AuthProvider`. Written up here because the brief allows router edits "to register `/m/*` routes" and these are adjacent to that.
- **`eslint.config.js`**: add `src/mobile/**/*.{js,jsx,ts}` to the linted set so the React and hooks rules apply.
- **`DashboardPageHeader`**: CLAUDE.md requires it on every dashboard page. The mobile screens are not `Layout` pages and use `ScreenHeader` instead; this is the mobile exception the brief anticipates and should be written into `DESIGN_SPEC.md` if the shell ships.
- **Ava's action cards navigate to desktop routes** (`/Guests`, `/Budget`) because `AvaChatPod` calls `navigate()` with those paths. In the shell that opens the desktop dashboard inside the webview. Either the pod learns a base path (an edit to `AvaChatPod.jsx`), or the shell intercepts those navigations.

## Auth: what works in the shell and what needs deep links

The backend is **Base44, not Supabase**. There are no magic links; the flows are:

| Flow | Mechanism | In the shell |
|---|---|---|
| Email + password | `base44.auth.loginViaEmailPassword`, an XHR; token stored in `localStorage` | Works, once CORS (blocker 1) is in place. The token persists across launches because the webview origin is stable. |
| Google, Apple | `base44.auth.loginWithProvider(provider, fromUrl)`: full-page redirect to `https://base44.app/api/apps/auth[/apple]/login?app_id=...&from_url=<origin>/choose-plan?next=...`; Base44 returns to `from_url` with `?access_token=` appended, which `src/lib/app-params.js` stores | Does not work: `from_url` would be `capacitor://localhost/...`, which Base44 will not accept, and Google refuses sign-in inside an embedded webview. |
| Password reset | Email link to `https://openinvite.com.au/reset-password?token=...` | Opens Safari / Chrome, not the app. |
| Collaborator invite | Email link to `https://openinvite.com.au/collaborate/accept/:token` | Same. |

**What to configure (roadmap item 1):**

1. Universal links (iOS) and App Links (Android) for `https://openinvite.com.au`, which needs `/.well-known/apple-app-site-association` and `/.well-known/assetlinks.json` served from the site (`vercel.json` already exempts `/.well-known/` from the SPA rewrite). Paths to claim: `/choose-plan`, `/reset-password`, `/collaborate/accept/*`, and `/m` itself.
2. A custom scheme as a fallback: `au.com.openinvite.app://auth`.
3. In the shell, open the provider login with `@capacitor/browser` and pass `from_url=https://openinvite.com.au/choose-plan?next=%2Fm`; handle `App.addListener('appUrlOpen')`, read `access_token` (and `is_new_user`) off the URL, call `base44.setToken(token)`, then navigate to `/m`.
4. On the Base44 side, the app's allowed `from_url` origins already include `https://openinvite.com.au`; if a custom scheme is used as the return, it has to be added there too.

The exact redirect URLs that will need registering are therefore
`https://openinvite.com.au/choose-plan`, `https://openinvite.com.au/reset-password`,
`https://openinvite.com.au/collaborate/accept/*`, and optionally
`au.com.openinvite.app://auth`.

## Roadmap, in order

1. Deep links for auth (above), plus CORS for the shell origin, which gates everything.
2. Push notifications (`@capacitor/push-notifications`; APNs and FCM; a device-token field would need a schema decision).
3. Face ID / biometric unlock in front of the stored session.
4. Camera upload for the moodboard and cover photo (`@capacitor/camera` plus the existing Cloudinary upload path).
5. App Store and Play Store assets: icons, splash, screenshots, privacy labels; a `mobile:assets` step with `@capacitor/assets`.
6. TestFlight build and an internal Play track.

After those: pull to refresh, a sheet-based confirm, per-event RSVP editing on the guest sheet, and sending the mobile web dashboard to `/m` if that decision goes that way.
