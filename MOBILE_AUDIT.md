# Mobile audit: the couple dashboard inside a Capacitor shell at 390px

Read-only audit, 2026-09-20. No code was changed.

## How this was measured

Every couple-reachable dashboard route was rendered at 390x844 (iPhone 14/15 CSS
pixels) in headless Chromium through the repo's own stubbed render harness
(`scripts/lib/renderHarness.mjs`, seeded data, no credentials, no network). On
each route the probe measured document overflow, elements crushed below their
own content width, every visible interactive element's hit box, every text
input's computed font size, tables and their scroll containers, fixed-position
chrome, and multi-column grids still active at 390. It then pressed the first
"Add / New / Create / Share / Import" button it could find and measured any
dialog that opened. Screenshots of the worst routes confirmed what the numbers
said. Static review covered the shell, the auth flow, downloads, `window.open`,
Stripe and safe-area handling.

The probe script and raw JSON live in the session scratchpad and are not part of
the repo; the method is reproducible with the existing
`scripts/test-dashboard-no-overflow.mjs` as a starting point.

## Platform facts

| Question | Answer |
|---|---|
| Router | `react-router-dom` v6 `BrowserRouter` (`src/App.jsx:8`). History routing; Capacitor's `capacitor://localhost` origin serves `index.html` for any path, so this works unchanged, but every hard `window.location.href = '/login'` reload (AuthContext, sidebar, Login, Register) is a full webview reload rather than a route change. |
| Auth backend | **Base44, not Supabase.** `@base44/sdk` `createClient` in `src/api/base44Client.js`. The bearer token lives in `localStorage.base44_access_token`; `src/lib/app-params.js` reads it from `?access_token=` on the URL after a provider round trip and strips it. |
| Email + password | `base44.auth.loginViaEmailPassword` (`src/pages/Login.jsx:52`), an XHR. Works inside a webview as-is. |
| OAuth (Google, Apple) | `base44.auth.loginWithProvider(provider, '/choose-plan?next=...')` does a **full-page redirect** to `https://base44.app/api/apps/auth[/apple]/login?app_id=...&from_url=<window.location.origin>/choose-plan...`. Base44 redirects back to `from_url` with `?access_token=` appended. In a Capacitor shell `window.location.origin` is `capacitor://localhost` (iOS) or `http://localhost` (Android): Base44 will not accept that as a `from_url`, and Google blocks sign-in inside embedded webviews anyway. Needs the system browser (`@capacitor/browser` or `ASWebAuthenticationSession`) plus a deep link back into the app carrying the token, then `base44.setToken()`. |
| Password reset | Email link lands on `https://openinvite.com.au/reset-password?token=` (`src/pages/ResetPassword.jsx:92`). Needs a universal link / app link so the email opens the app, otherwise it opens Safari and the app never sees the new session. |
| Same-origin API | 76 calls in 49 files use relative `fetch('/api/...')`, and the Base44 client uses `serverUrl: ''` in production so `/api/apps/*` rides the Vercel rewrite (`vercel.json`). Inside Capacitor there is no Vercel in front of the page: every one of those calls resolves against `capacitor://localhost` and fails. The shell needs an absolute API base (`https://openinvite.com.au`) for both the fetch calls and `serverUrl`, and the Vercel functions need CORS for the app origin. This is the single largest platform blocker. |
| Service worker | None. No `vite-plugin-pwa`, no `workbox`, no `navigator.serviceWorker` anywhere in `src/`. |
| Manifest | `public/manifest.json` exists (standalone display, SVG-only icon, `theme_color #0A0A0A`) and is linked from `index.html`. `apple-mobile-web-app-capable=yes` is set. Not relevant to the Capacitor shell but present. |
| Viewport meta | `width=device-width, initial-scale=1.0` (`index.html:5`). **No `viewport-fit=cover`.** |
| Safe areas | **Zero uses** of `env(safe-area-inset-*)` in `src/` or `index.html`. |
| Existing mobile handling | One breakpoint (Tailwind `lg`, 1024px). Below it, `Layout.jsx` swaps the 48px black desktop bar and 200px sidebar for a 64px white top bar with a hamburger (`Layout.jsx:674`) that opens a left `Sheet` drawer (`w-72`, `Layout.jsx:710`) holding `MobileSidebarContent`. There is no bottom tab bar. Page content is one tree at every width (`.page-content`, `index.css:949`). |
| Existing guards | `test:dashboard-no-overflow` (16 routes at 390, two named exceptions), `test:ava-safe-area` (nothing interactive under the Ava button), `test:studio-rotate-notice`. There is no tap-target, input-size or safe-area guard. |

## The one root cause behind most of the red

`src/index.css:119` sets `min-width: 0` on every element inside `.page-content`
so the page never scrolls sideways. It works: only Seating (103px, known) and
Photography (8px, known) overflow. But it means any flex or grid child that was
never given a mobile treatment now **shrinks below its content instead of
wrapping or scrolling**, so the failure moved from "page scrolls sideways" to
"labels overlap and controls collapse". The overflow guard is green and the
pages are still broken. Every instance below marked *crushed* is this.

Three shapes recur:

1. **Hand-rolled tab strips**: `display: flex` rows of buttons with `marginRight: 32` and no `overflow-x`, `flex-shrink: 0` or `white-space: nowrap`. The shared `TabsList` (`src/components/ui/tabs.jsx`) already has the fix (`max-w-full overflow-x-auto`, `whitespace-nowrap`), but 22 pages roll their own (`Transport`, `Photography`, `FoodBeverage`, `Music`, `Beauty`, `Honeymoon`, `WeddingFavours`, `EntertainmentDetails`, `Considerations`, `GuestExperience`, `Polls`, `GuestSuitePolicies`, `Seating`, `ScheduleHub`, `TasksHub`, `EventDetails`, `CeremonyDetails`, `Accommodation`, `EmergencyContact`, `WeddingParty`, `Account`, `StudioGuestSuite`). At 390 "Overview" runs into "Parking", "Photographers" over "Videographers", and tab hit boxes shrink to 13 to 25px wide.
2. **Fixed column counts**: `gridTemplateColumns: 'repeat(4, 1fr)'` (Budget categories, `src/pages/Budget.jsx:199`) renders 41px cells with 25px-wide inputs. Stat strips built as `flex: 1` cells without `flex-wrap` (Beauty) collapse labels to 33px.
3. **A fixed-width pane beside a flexible one**: the Send invites live preview is `width: 400, flexShrink: 0` (`src/components/guests/SendInvitesModal.jsx:618`) so the form column beside it gets roughly 60px and wraps one word per line.

## Cross-cutting findings (apply to every route)

| Issue | File | Severity |
|---|---|---|
| Relative `/api/...` fetches and `serverUrl: ''` break under a non-web origin (see platform table). | `src/api/base44Client.js`, 49 files | red |
| OAuth and password-reset redirects need system browser + deep link (see platform table). | `src/pages/Login.jsx:65`, `Register.jsx`, `ResetPassword.jsx` | red |
| No `viewport-fit=cover`, no `env(safe-area-inset-*)` anywhere. Mobile top bar is `position: fixed; top: 0; height: 64` (`Layout.jsx:674`): under a notch the logo and hamburger sit beneath the status bar. Ava button is `bottom: 32; right: 32` (`Layout.jsx:725`): on a home-indicator device it sits in the gesture zone. Trial banner and `Toaster` (`inset: 16px`, z 9999) likewise. The nav `Sheet` is `inset-y-0 h-full` so its close button is under the status bar too. | `index.html:5`, `src/Layout.jsx`, `src/components/ui/sheet.jsx` | red |
| Every text input renders at 14px (the type scale's `input: 14` in `src/styles/typeScale.js`, `Input`/`Textarea`/`Select` primitives use `text-sm`, `.input-user` and `.input-editorial` are 14px, `.oi-modal-scale` forces 12px). iOS zooms the page on focus for anything under 16px. 55 of 55 visible inputs across the audited routes are under 16px. The type scale is guarded by `scripts/test-type-scale.mjs`, so raising inputs to 16px is a ruling, not a tweak; the alternative is `maximum-scale=1` in the viewport meta, which WKWebView honors (Safari ignores it) at an accessibility cost. | `src/styles/typeScale.js`, `src/components/ui/input.jsx`, `src/index.css:1143,1516` | red |
| Filter pills are 23px tall (`FilterPill`, 11px type, `padding 4px 12px`); primary buttons 30px; icon buttons 21 to 26px; sort carets, table checkboxes 14 to 16px; nav drawer section rows 15px; drawer close button 16x16. Of 843 interactive elements measured, 632 have a hit box under 44px and 400 are under 32px. Nothing in the dashboard meets the 44px guideline except the Ava button and the hamburger. | `src/components/shared/TableToolbar.jsx`, `src/index.css` (`.btn-primary`), `src/components/layout/AnimatedSidebar.jsx`, `src/components/ui/sheet.jsx` | red |
| Centered dialogs (`fixed left-50% top-50% translate(-50%,-50%)`, `w-full max-w-lg`, `rounded-2xl`) go edge to edge at 390 with 16px corners on both sides, and with the iOS keyboard up a centered fixed dialog is pushed under the keyboard because `position: fixed` does not track the visual viewport. No bottom-sheet variant exists for phones. Measured: Guests import 390x596, Photography add-vendor 390x717, Registry share 390x651; none overflowed the viewport when closed-keyboard. | `src/components/ui/dialog.jsx:44` | yellow |
| Ava chat pod is `width: 380; height: 520` anchored `right: 32`, so at 390 it renders at `left: -22px` (22px of the pod, including the avatar column, is off-screen). Its textarea is 13px. With the keyboard open the pod does not shrink; the composer is covered. | `src/components/layout/AvaChatPod.jsx:206`, `src/Layout.jsx:725` | red |
| The mobile top bar draws `/openinvite-logo.png` on white with no filter. The wordmark in that PNG is white, so every mobile page shows the pink mark and an invisible "Openinvite". Desktop applies `brightness(0) invert(1)` on black. | `src/Layout.jsx:687`, `public/openinvite-logo.png` | yellow |
| Hover-only controls: Moodboard edit/delete/view/like overlay (`opacity: hovered ? 1 : 0`), Guest suite accommodation / transport / experience place-card remove buttons (`{hovered && <button>}`), Seating table delete (250ms hover delay), `VisualTable` seat tooltip. On touch these need two taps or are unreachable. Pills scope `:hover` to `(hover: hover)` correctly (`index.css:1312`). | `src/components/moodboard/MoodboardGrid.jsx:150`, `src/pages/GuestSuiteAccommodation.jsx:47`, `src/pages/GuestSuiteTransport.jsx:57`, `src/components/studio/guest-suite/ExperienceGuideTab.jsx:681`, `src/pages/Seating.jsx:120` | yellow |
| `100vh` / `min-h-screen` in 141 places across dashboard pages. Inside Capacitor there is no browser toolbar so the classic bug is muted, but the keyboard still shrinks the visual viewport and fixed-height forms (Send invites step panes, Onboarding) do not adapt. 16 uses of `dvh` show the newer unit is already accepted in the codebase. | many, e.g. `src/pages/SendInvites.jsx`, `src/pages/Guests.jsx` | yellow |
| Data tables (`DataTable`, `.table-user`) are 560 to 807px wide inside `overflow-auto` wrappers. They scroll rather than overflow, which is correct, but a 5 to 7 column table is a poor phone surface and the sticky first column is absent. | `src/components/shared/DataTable.jsx`, Guests, Vendors, Photography, Schedule, TodoList | yellow |
| Native date/time inputs are used in 27 places (`<input type="date">`), which is the right call for a webview; only `InvitationBuilder` uses `react-day-picker`. Radix `Select`/`Popover` render in a portal with `position="popper"` and `max-h-96`, which stays inside the viewport. | `src/components/ui/select.jsx:51`, `src/components/ui/calendar.jsx` | green |
| Hard reloads via `window.location.href` on login redirect, sign out, logo tap and post-login (`AuthContext.jsx:46,69,73`, `AnimatedSidebar.jsx:578,622`, `Login.jsx:43,56`, `Register.jsx:71,86`). Each is a full webview reload with a white flash; not broken, just visible. | as listed | yellow |

## Things that behave differently in a webview

| What | Where | Behavior in Capacitor | Severity |
|---|---|---|---|
| Stripe Checkout redirect: `window.location.href = data.url` to `checkout.stripe.com`, `success_url` / `cancel_url` return to `https://openinvite.com.au/...`. | `src/lib/checkoutSession.js:66,156`, `api/create-checkout-session.js:63` (do-not-touch) | The webview navigates away from the bundled app to Stripe, then Stripe sends it to the live website, not back into the app. Also an App Store review risk (in-app purchase rules). Needs `@capacitor/browser` and a deep-link return, or hiding purchase CTAs natively. | red |
| Stripe billing portal: `window.location.href = data.url`, `return_url: 'https://openinvite.com.au/account'`. | `src/pages/Account.jsx:358`, `api/create-portal-session.js:44` | Same as above. | red |
| `window.open(url, '_blank')` for WhatsApp / SMS / mailto / Facebook share, external vendor site links, "preview site" from the studio. | `src/components/messages/WhatsAppCompose.jsx:125`, `src/components/registry/ShareRegistryModal.jsx:31-34`, `src/components/studio/guest-suite/StudioShareTab.jsx:203-205`, `src/components/guests/SendInvitesModal.jsx:541`, `src/components/guest-experience/InteractiveMap.jsx:181`, `src/components/invitations/InvitationPreviewWithNav.jsx:44`, `src/pages/StudioWebsite.jsx:782` | WKWebView returns `null` for `window.open` unless the shell handles `createWebViewWith`; Capacitor opens `_blank` in the system browser by default but `sms:` / `mailto:` / `whatsapp` schemes need `allowNavigation` or `@capacitor/browser` / `App.openUrl`. The Facebook share with `'width=600,height=400'` popup features is a no-op. | yellow |
| `window.open('', '', 'height=600,width=800')` to print a vow/speech. | `src/pages/VowsSpeeches.jsx:207` | Returns `null` in the webview; the code writes to `w.document` and throws. | red |
| Blob downloads: CSV export (Guests, Budget x2, Schedule, TodoList, Moodboard), ICS (Calendar, `lib/ics.js`), guest-list template (`XLSX.writeFile`), QR PNG (`StudioShareTab`, `WhatsAppQRCode`), seating chart PDF (`jspdf` + `html2canvas`). | `src/pages/Guests.jsx:608`, `src/pages/Budget.jsx:413,436`, `src/pages/ScheduleHub.jsx:242`, `src/pages/TodoList.jsx:263`, `src/pages/Moodboard.jsx:17`, `src/pages/Calendar.jsx:167`, `src/lib/ics.js:105`, `src/lib/guestImport.js:68`, `src/pages/Seating.jsx:617`, `src/components/studio/guest-suite/StudioShareTab.jsx:121`, `src/components/messages/WhatsAppQRCode.jsx:37` | An `<a download>` click on a `blob:` URL does nothing in WKWebView (no download manager) and is unreliable in Android WebView. Each needs `@capacitor/filesystem` + `@capacitor/share` (write the file, hand it to the share sheet). Eleven call sites, one helper would cover them. | yellow |
| `navigator.clipboard.writeText` (copy link buttons). | `src/pages/Invitations.jsx` (the probe saw a permission error), share modals | Works in Capacitor iOS/Android webviews. `@capacitor/clipboard` is the safer wrapper. | green |
| `posthog-js`, Sentry, Turnstile widget on Contact. | `src/lib/analytics.js`, `src/lib/sentry.js` | Work over HTTPS from a webview. Turnstile needs the app origin allow-listed. | green |

## Per-route findings

Columns: overflow is document `scrollWidth` minus 390; crushed is the number of
tab/chip buttons narrower than their own label; tap targets is hit boxes under
44px out of all visible interactive elements, with the count under 32px in
parentheses; inputs is visible text inputs under 16px out of all; tables is the
rendered table width inside its scroller.

| Route | Overflow px | Crushed tabs/chips | Tap targets under 44 | Inputs under 16px | Tables |
|---|---|---|---|---|---|
| /DailyUpdate | 0 | 0 | 3/4 (2 under 32) | 0/0 | none |
| /event-details | 0 | 0 | 8/15 (1 under 32) | 3/3 | none |
| /Schedule | 0 | 2 | 22/27 (18 under 32) | 1/1 | 713px |
| /TodoList | 0 | 1 | 26/28 (21 under 32) | 2/2 | 560px |
| /Guests | 0 | 0 | 54/63 (36 under 32) | 2/2 | 807px |
| /SendInvites | 0 | 1 | 25/26 (9 under 32) | 1/1 | none |
| /Invitations | 0 | 1 | 6/14 (0 under 32) | 0/0 | none |
| /Polls | 0 | 0 | 4/8 (1 under 32) | 0/0 | none |
| /Messages | 0 | 0 | 13/14 (9 under 32) | 1/1 | none |
| /Seating | 103 | 2 | 42/45 (29 under 32) | 1/1 | none |
| /wedding-party | 0 | 0 | 3/13 (0 under 32) | 0/0 | none |
| /Moodboard | 0 | 0 | 25/26 (20 under 32) | 1/1 | none |
| /Styling | 0 | 0 | 3/11 (0 under 32) | 0/0 | none |
| /Beauty | 0 | 1 | 9/14 (4 under 32) | 2/2 | none |
| /FoodBeverage | 0 | 4 | 6/9 (3 under 32) | 0/0 | none |
| /Music | 0 | 4 | 8/13 (0 under 32) | 1/1 | none |
| /Photography | 8 | 4 | 11/12 (8 under 32) | 0/0 | 584px |
| /VowsSpeeches | 0 | 0 | 7/9 (3 under 32) | 0/0 | none |
| /wedding-favours | 0 | 2 | 4/8 (1 under 32) | 0/0 | none |
| /Vendors | 0 | 0 | 33/38 (31 under 32) | 1/1 | 620px |
| /VendorMarketplace | 0 | 5 | 26/27 (20 under 32) | 3/3 | none |
| /ceremony-details | 0 | 0 | 4/8 (0 under 32) | 0/0 | none |
| /transport | 0 | 6 | 7/10 (5 under 32) | 0/0 | none |
| /accommodation | 0 | 0 | 2/7 (0 under 32) | 0/0 | none |
| /emergency-contact | 0 | 0 | 2/9 (0 under 32) | 0/0 | none |
| /Budget | 0 | 0 | 20/25 (13 under 32) | 14/14 | none |
| /Registry | 0 | 4 | 8/14 (3 under 32) | 0/0 | none |
| /studio | 0 | 0 | 1/4 (0 under 32) | 0/0 | none |
| /studio/website | 0 | 0 | 52/56 (48 under 32) | 0/0 | none |
| /studio/universe | 0 | 0 | 20/34 (18 under 32) | 0/0 | none |
| /studio/ava | 0 | 0 | 10/12 (7 under 32) | 0/0 | none |
| /GuestSuiteSchedule | 0 | 0 | 2/3 (1 under 32) | 0/0 | none |
| /QandA | 0 | 0 | 4/6 (0 under 32) | 2/2 | none |
| /GuestSuiteRegistry | 0 | 0 | 4/5 (1 under 32) | 0/0 | none |
| /GuestSuiteAccommodation | 0 | 0 | 3/6 (2 under 32) | 1/1 | none |
| /GuestSuiteTransport | 0 | 0 | 6/9 (2 under 32) | 3/3 | none |
| /GuestSuiteExperience | 0 | 0 | 4/9 (3 under 32) | 2/2 | none |
| /GuestSuitePolicies | 0 | 0 | 4/15 (2 under 32) | 0/0 | none |
| /GuestSuitePolls | 0 | 0 | 3/4 (1 under 32) | 0/0 | none |
| /honeymoon | 0 | 4 | 4/8 (2 under 32) | 0/0 | none |
| /Considerations | 0 | 6 | 2/11 (0 under 32) | 0/0 | none |
| /account | 0 | 0 | 6/13 (0 under 32) | 2/2 | none |
| /help | 0 | 0 | 14/30 (0 under 32) | 1/1 | none |
| /GuestExperience | 0 | 5 | 2/12 (0 under 32) | 0/0 | none |
| /Policies | 0 | 0 | 2/13 (1 under 32) | 1/1 | none |
| /OurStory | 0 | 0 | 3/8 (0 under 32) | 3/3 | none |
| /EntertainmentDetails | 0 | 1 | 5/8 (1 under 32) | 0/0 | none |

`/Onboarding` and `/choose-plan` redirected to `/DailyUpdate` under the seeded
(already-onboarded, paid) fixture and were not measured separately.

### Route notes and verdicts

Verdict is for "usable on a phone inside the shell today", after the
cross-cutting items above are fixed. Red means the route cannot be used for its
purpose at 390; yellow means usable with friction; green means fine.

| Route | Issue | File | Severity |
|---|---|---|---|
| /DailyUpdate | 42px greeting headline wraps to five lines; three-column briefing grid stacks at 900px (already handled). Two 20px-tall text links. | `src/pages/DailyUpdate.jsx`, `index.css:1341` | green |
| /event-details | Three-column guest-count tile grid at 100px per tile; 14px inputs. | `src/pages/EventDetails.jsx` | yellow |
| /Schedule | 713px table in a scroller; hand-rolled tab strip crushes "Calendar" / "Considerations"; six 23px filter pills; "List / Calendar" toggle is 20px wide. | `src/pages/ScheduleHub.jsx`, `src/components/shared/DataTable.jsx` | yellow |
| /TodoList | 560px table in a scroller; "Add a new task" input is 0px wide in the toolbar row (crushed); priority chips 27px tall; a 12px input. | `src/pages/TasksHub.jsx` | yellow |
| /Guests | Largest table (807px, 7 columns) scrolls inside the page; stat strip wraps 2x2 correctly; 5 filter pills + "All events" 25px tall; 14px row checkboxes; 13px inline add-guest input. Import dialog fits (390x596). | `src/pages/Guests.jsx`, `src/components/guests/GuestList.jsx` | yellow |
| /SendInvites | Live preview pane is `width: 400; flexShrink: 0`, leaving the form column about 60px wide: "Who are you sending to?" wraps one word per line and the email-type buttons are unreadable. Step "Next" sits under the Ava button (already guarded on desktop). | `src/components/guests/SendInvitesModal.jsx:618,721` | red |
| /Invitations | Renders the website builder in a `fixed` full-screen nav of its own; "Sections / Style / Settings" tabs at 87px each; copy-link throws on clipboard permission in headless. Best-on-desktop surface. | `src/pages/Invitations.jsx` | yellow |
| /Polls | "Polls / Games" tab strip crushes ("Polls" 30px wide). | `src/pages/Polls.jsx` | yellow |
| /Messages | Four 26px icon buttons per row (WhatsApp, reply, etc.); 23px filter pills. | `src/pages/Messages.jsx` | yellow |
| /Seating | 103px document overflow (known exception: 1400px canvas escapes a 0-width scroller); shows its own "best viewed on a larger screen" notice; zoom buttons 13px wide; delete-table on hover. Desktop surface. | `src/pages/Seating.jsx:120,550`, `scripts/test-dashboard-no-overflow.mjs` | red (by design, notice shown) |
| /wedding-party | Fine. Cards stack. | `src/pages/WeddingParty.jsx` | green |
| /Moodboard | Card actions (edit, delete, view, like) only appear on hover; 23px board and category pills. | `src/components/moodboard/MoodboardGrid.jsx:150` | yellow |
| /Styling | Fine. | `src/pages/Styling.jsx` | green |
| /Beauty | Stat strip cells collapse to 33px (labels "Artists booked", "Trials scheduled" clipped); vertical "Beauty team / Trial planning" tabs are 29px wide; two 14px textareas. | `src/pages/Beauty.jsx:154` | red |
| /FoodBeverage | Four tab labels crushed to 19 to 30px wide, overlapping. | `src/pages/FoodBeverage.jsx` | red |
| /Music | Tab strip crushes; 14px Spotify URL input. | `src/pages/Music.jsx` | yellow |
| /Photography | Six tab labels overlap ("Photographers" over "Videographers"); 8px overflow (known); 584px table scrolls; stat strip renders numbers with **no labels at any width** (the map at `Photography.jsx:113` never prints `stat.label`). Add-vendor dialog is 390x717 with 12px inputs. | `src/pages/Photography.jsx:113,135` | red |
| /VowsSpeeches | Print uses `window.open('')` which returns null in a webview; 21px edit/delete icons. | `src/pages/VowsSpeeches.jsx:207` | yellow |
| /wedding-favours | Tab strip crushes ("Notes" 24px). | `src/pages/WeddingFavours.jsx` | yellow |
| /Vendors | 620px table scrolls; seven 23px filter pills across two rows. | `src/pages/Vendors.jsx` | yellow |
| /VendorMarketplace | Category chips collapse to 28px each and overprint ("Photography" over "Videography" over "Catering") despite the row having `overflowX: auto` and `whiteSpace: nowrap`, because the global `min-width: 0` lets them shrink; keyword search input is 20px wide; 12px sort select. | `src/pages/VendorMarketplace.jsx:408,416`, `index.css:119` | red |
| /ceremony-details | Fine. | `src/pages/CeremonyDetails.jsx` | green |
| /transport | Six tab labels crushed to 14 to 37px; "Overview" overprints "Parking", "Rideshare" overprints "Shuttles". | `src/pages/Transport.jsx:181` | red |
| /accommodation | Fine. | `src/pages/Accommodation.jsx` | green |
| /emergency-contact | Fine. | `src/pages/EmergencyContact.jsx` | green |
| /Budget | Category inputs in a `repeat(4, 1fr)` grid render 25px wide; "Photography" and "Flowers" labels overprint; fourth column sits under the Ava button; 14 inputs at 14px. Otherwise the stat strip wraps 2x2 and tabs fit. | `src/pages/Budget.jsx:199` | red |
| /Registry | Five-tab strip scrolls (shared `TabsList`) but labels still shrink 7px each; two full-width "Visit registry" links at 30px tall. Share dialog fits (390x651, 13px input). | `src/pages/Registry.jsx` | yellow |
| /studio | Hub cards stack. Fine. | `src/pages/StudioHub.jsx` | green |
| /studio/website | Full-screen builder outside `Layout`; shows "Turn your phone sideways" notice; no canvas at 390; left/right panels 240/150px; "Change" button overprints the universe name; 48 of 56 controls under 32px. Desktop surface by the product's own admission. | `src/pages/StudioWebsite.jsx`, `index.css:1479` | red (by design, notice shown) |
| /studio/universe | Universe grid and filter chips render; chips 30px tall. | `src/pages/UniverseStudio.jsx` | yellow |
| /studio/ava | Step markers 24px; otherwise stacks. | `src/pages/AvaStudio.jsx` | yellow |
| /GuestSuiteSchedule | Read-only mirror with an 18px-tall "Edit in Schedule" link. | `src/pages/GuestSuiteSchedule.jsx` | green |
| /QandA | 14px input and textarea; otherwise fine. | `src/pages/GuestSuiteQandA.jsx` | green |
| /GuestSuiteRegistry | 18px-tall link. Fine. | `src/pages/GuestSuiteRegistry.jsx` | green |
| /GuestSuiteAccommodation | Remove-place button is hover-only; "Use my location" 17px tall; 14px search. | `src/pages/GuestSuiteAccommodation.jsx:31,47` | yellow |
| /GuestSuiteTransport | Same hover-only remove; a `160px / auto / auto` three-column note form at 390; three 14px inputs. | `src/pages/GuestSuiteTransport.jsx:57` | yellow |
| /GuestSuiteExperience | Same hover-only remove and couple-pick star (`opacity: hovered ? 1 : 0`); 12px category select. | `src/components/studio/guest-suite/ExperienceGuideTab.jsx:669,681` | yellow |
| /GuestSuitePolicies | "Gifts" tab 31px wide; save button 30px. | `src/pages/GuestSuitePolicies.jsx` | yellow |
| /GuestSuitePolls | Fine. | `src/pages/GuestSuitePolls.jsx` | green |
| /honeymoon | Tab strip crushes ("Travel" 31px). | `src/pages/Honeymoon.jsx` | yellow |
| /Considerations | Six category tabs crushed to 41 to 72px, "Cultural & religious" needs 131. | `src/pages/Considerations.jsx` | red |
| /account | Billing-portal redirect leaves the app (see webview table); 14px name/email inputs; otherwise stacks cleanly. | `src/pages/Account.jsx:358` | yellow |
| /help | 15px search input; article rows fine. | `src/pages/Help.jsx` | green |
| /GuestExperience | Five tabs crushed ("Transportation" needs 113px, gets 61). | `src/pages/GuestExperience.jsx` | red |
| /Policies | 877px policy tab row scrolls; 14px textarea. | `src/pages/Policies.jsx` | yellow |
| /OurStory | Three 14px inputs; otherwise fine. | `src/pages/OurStory.jsx` | green |
| /EntertainmentDetails | "Notes" tab 25px wide. | `src/pages/EntertainmentDetails.jsx` | yellow |

## The ten highest-impact fixes, ranked

1. **Absolute API origin for the shell.** Make `serverUrl` and every relative `fetch('/api/...')` resolve to `https://openinvite.com.au` when `Capacitor.isNativePlatform()`, and add CORS for `capacitor://localhost` / `http://localhost` on the Vercel functions. Without this nothing loads. (`src/api/base44Client.js`, 49 files; one `apiUrl()` helper covers them.)
2. **Auth redirects through the system browser with a deep link back.** Wrap `loginWithProvider` so native opens `@capacitor/browser` with a `from_url` on the app's universal-link domain, handle `appUrlOpen` to read `access_token` and call `base44.setToken()`. Register `openinvite.com.au/choose-plan` and `/reset-password` as universal links / Android app links. Email + password already works.
3. **Safe areas and `viewport-fit=cover`.** Add `viewport-fit=cover` to the meta; pad the mobile top bar, trial banner, nav `Sheet`, `Toaster` and the Ava button/pod with `env(safe-area-inset-top/bottom)`. Five files.
4. **Stop the hand-rolled tab strips from crushing.** Either migrate the 22 pages to the shared `TabsList`, or give each strip `overflow-x: auto; white-space: nowrap` and each button `flex-shrink: 0`. This alone turns Transport, FoodBeverage, Photography, Considerations, GuestExperience, Beauty, Music, Honeymoon, Polls, WeddingFavours and EntertainmentDetails from red/yellow to usable.
5. **Inputs at 16px on touch, or `maximum-scale=1` for the shell build.** Either extend the type scale ruling with a phone exception (`@media (pointer: coarse)` bumping inputs to 16px) or inject `maximum-scale=1` into the viewport meta only when native. The first is the right fix; the second is one line.
6. **Tap targets.** Raise `FilterPill`, `.btn-primary`/`.btn-editorial-secondary`, table checkboxes, icon buttons and the drawer's section rows to a 44px hit area (padding or `::before` inset expansion, without changing the visual size the type scale ruling protects). Nav drawer close button from 16px to 44px.
7. **Send invites, Budget categories, Beauty stats: three layout fixes.** Stack the live preview under the form below 768px (`SendInvitesModal.jsx:618`); `repeat(auto-fill, minmax(140px, 1fr))` for Budget categories (`Budget.jsx:199`); `flex-wrap` on the Beauty stat strip. While there, print `stat.label` in Photography's strip.
8. **Ava pod on a phone.** Below 640px make the pod `width: calc(100vw - 32px)`, anchor it to the bottom safe area, cap height to the visual viewport (`100dvh` minus chrome) so the composer stays above the keyboard, and lift the textarea to 16px.
9. **Downloads and `window.open` through Capacitor plugins.** One `saveOrShare(blob, filename)` helper using `@capacitor/filesystem` + `@capacitor/share` behind `isNative()`, swapped into the eleven blob-download sites; `Browser.open` / `App.openUrl` for the eight `window.open` sites; a `Share.share` path for WhatsApp/SMS; replace the VowsSpeeches print popup with a print stylesheet.
10. **Purchases and the billing portal in the shell.** Decide whether the native app sells at all. If it does, route Stripe through `@capacitor/browser` with a deep-link `success_url`; if not, hide every upgrade/checkout/portal CTA behind `isNative()` (ChoosePlan, Pricing, Account, the trial banner's "Upgrade" pill). Either way the current `window.location.href` to `checkout.stripe.com` strands the user on the live website.

Beyond these: replace hover-reveal controls with always-visible ones on touch (`@media (hover: none)`), add a bottom-sheet variant to `DialogContent` for phones, and treat Seating and the website builder as desktop surfaces with a clear hand-off rather than trying to fit them at 390.
