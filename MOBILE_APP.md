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

## Goal 2: design uplift, full coverage, notifications

Built on the same branch after v0. The mobile design language is in
`src/mobile/DESIGN_MOBILE.md`; this section records what changed, where every
feature lives now, the images in use, and how notifications work.

### Coverage: every desktop couple feature has a mobile home

Depth: **full** = list, detail, add, edit and delete through the existing
mutations; **light** = read everything, edit the simple fields; **view** = read
here, edit on desktop, with a note. No row is "not in app". `/m/plan` is the hub
and mirrors the desktop sidebar's groups and names exactly.

| Sidebar group | Desktop route | Mobile location | Depth | How |
|---|---|---|---|---|
| Planning | `/DailyUpdate` Daily update | `/m` (Home) | full | hero carousel, stats, next up, keep planning, from Ava, latest |
| Planning | `/event-details` Event details | `/m/plan/event-details` | full | form over WeddingDetails, auto-saves |
| Planning | `/Schedule` Schedule | `/m/plan/schedule` | full | list, detail, add, edit, delete over Schedule |
| Planning | `/TodoList` To do | `/m/plan/checklist` | full | grouped list, tap to complete, add sheet, over Note |
| Guests | `/Guests` Guest list | `/m/guests` | full | replies card, filters, search, detail, add and edit sheet, remove |
| Guests | `/Polls` Polls & games | `/m/plan/polls` | full | polls with live counts, create, end; on WeddingDetails.polls as Polls.jsx keeps them |
| Guests | `/Messages` Messages | `/m/plan/messages` | full | conversation list, thread, composer pinned above the keyboard, reply through /api/send-guest-reply, read state on GuestMessage |
| Guests | `/Seating` Seating | `/m/plan/seating` | view | tables and who sits where as lists; move a guest through a sheet over assignGuestToTableByName / unassignGuestFromTables; layout stays on desktop |
| Guests | `/wedding-party` Wedding party | `/m/plan/wedding-party` | full | roles as sections, add, edit, remove; WeddingDetails.weddingParty |
| Guests | `/SendInvites` Send invites | `/m/plan/send-invites` | view | hand-off screen with a note |
| Guests | `/Invitations` Invitations | `/m/plan/invitations` | view | hand-off screen with a note |
| Style & experience | `/Moodboard` Moodboard | `/m/plan/moodboard` | full | photo grid, add, edit, delete over MoodboardItem |
| Style & experience | `/Styling` Styling | `/m/plan/styling` | light | form over WeddingDetails.flowers and .decorations |
| Style & experience | `/Beauty` Beauty | `/m/plan/beauty` | light | form over WeddingDetails.beauty |
| Style & experience | `/FoodBeverage` Food & beverage | `/m/plan/food` | light | form over WeddingDetails.foodBeverage |
| Style & experience | `/Music` Music | `/m/plan/music` | full | playlist over Music (add, edit, delete); guest requests approved or declined through /api/song-request-review; the Spotify playlist link |
| Style & experience | `/Photography` Photography | `/m/plan/photography` | light | form over WeddingDetails.photography |
| Style & experience | `/VowsSpeeches` Vows & speeches | `/m/plan/vows` | full | list, add, edit, delete over VowSpeech |
| Style & experience | `/wedding-favours` Guest gifts | `/m/plan/favours` | light | form over WeddingDetails.weddingFavours |
| Vendors | `/Vendors` My vendors | `/m/plan/vendors` | full | filters, list, add, edit, delete over Vendor |
| Vendors | `/VendorMarketplace` Marketplace | `/m/plan/marketplace` | light | category and location search through /api/places-search; add to my vendors through saveVendorFromPlaces |
| On the day | `/ceremony-details` Ceremony details | `/m/plan/ceremony` | full | form; celebrant and license through the encrypted PUT, the rest plaintext, as CeremonyDetails.jsx splits them |
| On the day | `/transport` Transport | `/m/plan/transport` | light | form plus a shuttles list; WeddingDetails.transport |
| On the day | `/accommodation` Accommodation | `/m/plan/accommodation` | light | form plus a places list; WeddingDetails.accommodation |
| On the day | `/emergency-contact` Emergency contact | `/m/plan/emergency` | full | form through the encrypted PUT; WeddingDetails.emergencyContacts |
| Finances | `/Budget` Budget | `/m/plan/budget` | full | spent, paid, still to pay, next payment due, categories, category detail, add and edit expense with a payment date, over Budget |
| Finances | `/Registry` Registry | `/m/plan/registry` | full | four lists (registry links, products, cash funds, received gifts) over RegistryItem, RegistryProduct, CustomGift, ReceivedGift |
| Guest suite | `/studio` Design studio | `/m/site` | view | site preview, live status, view and share; the builder and Ava studio hand off to desktop |
| Guest suite | `/GuestSuiteSchedule` Schedule | `/m/plan/suite-schedule` | view | the same Schedule records as guests see them; edit link into the schedule |
| Guest suite | `/QandA` Q&A | `/m/plan/qna` | full | questions and answers, add, edit, remove; WeddingDetails.qna |
| Guest suite | `/GuestSuiteRegistry` Registry | `/m/plan/registry` | full | the same registry screen |
| Guest suite | `/GuestSuiteAccommodation` Accommodation | `/m/plan/suite-accommodation` | light | places list, add by hand, edit, remove; WeddingDetails.guestSuiteAccommodation.places; nearby search stays on desktop |
| Guest suite | `/GuestSuiteTransport` Transport | `/m/plan/suite-transport` | light | as above over guestSuiteTransport.places |
| Guest suite | `/GuestSuiteExperience` Experience guide | `/m/plan/experience` | light | the couple's picks; WeddingDetails.experienceGuide.couplePicks |
| Guest suite | `/GuestSuitePolicies` Good to know | `/m/plan/good-to-know` | full | a switch and a note per policy; WeddingDetails.weddingPolicies |
| Guest suite | `/GuestSuitePolls` Guest polls | `/m/plan/polls` | full | the same polls screen |
| Extras | `/honeymoon` Honeymoon | `/m/plan/honeymoon` | light | form over WeddingDetails.honeymoonDetails |
| Extras | `/Considerations` Considerations | `/m/plan/considerations` | view | hand-off screen with a note (its content is computed inside the desktop page and not exported) |
| Account | `/account` | `/m/account` | full | profile card, rows; purchases hidden natively |
| Account | `/help`, `/Contact` | rows on `/m/account` | view | hand off to desktop |

Not a feature, so not a row: the guestbook. `GuestbookEntry` exists as an entity but the guestbook page was retired from the guest site (`WeddingWebsiteNav.jsx` filters the slug out). The notification feed still reads any entries that exist; nothing new can be written.

### The design, in one paragraph

Cards 20px, images 16px, inputs 14px, sheets 28px on top, pills and buttons 999px, icon buttons circular. No shadow on cards; one elevation (`0 8px 24px rgba(0,0,0,0.08)`) on the floating tab bar, the Ava button, the in-app banner and bottom sheets. Page #F5F5F4, card #FFFFFF, text #1A1A1A and #444444, primary #E03553 flat, emphasis panels ink / wine / blush / sand. Titles 34/40, hero numbers 56/56 tabular, sections 22/28, body 16/24, meta 14/20, all weight 600 at most. Press scales to 0.98 in 120ms, screens stagger in 40ms per block, hero numbers count up once, progress bars animate, the hero photo parallaxes up to 12px, carousels snap, haptics on tab change, task completion and pull to refresh. `prefers-reduced-motion` keeps only fades. The full statement is `src/mobile/DESIGN_MOBILE.md`.

### Image inventory

Order of preference on every slot: the couple's own imagery (`coverPhoto`, then photo blocks in `homeContent.blocks`, then `ourStoryContent.photos`), then the sample content of their universe (`getSampleWedding(id)`), then a color panel. `SmartImage` never renders a broken or empty box. Stills only: nothing animates an image whose public id starts with `DTS_`; the scroll parallax on a static hero is the only motion.

Cloudinary delivery: `f_auto,q_auto,c_fill,g_auto,w_<slot x dpr>,h_<slot x dpr>` for 2x and 3x, from `src/mobile/lib/images.js`.

Public ids used by the app itself (all already served on the marketing site or the universes page; none invented), keyed by the feel the slot wants:

| Key | Public id | Used where |
|---|---|---|
| couple | `DTS_Like_a_Movie_Foster___Asher_Photos_ID1042_qaddk3` | Event details tile, Photography tile, fixture Our Story |
| guests | `DTS_Slices_of_Summer_Mark_La_Montagne_Photos_ID2661_vb5omq` | Guest list tile, fixture cover photo |
| dinner | `v1779185603/DTS_Fine_Dining_Patrick_Chin_Photos_ID955_uoaegj` | Food & beverage tile |
| dance | `DTS_NU_NUPTIALS_Shauna_Summers_Photos_ID10310_o5dcie` | Marketplace tile, fixture Our Story |
| flowers | `DTS_Natural_Beauty_Rob_Christain_Crosby_Photos_ID2680_fnyjzd` | Styling tile, fixture moodboard |
| travel | `v1779185631/DTS_Early_Honey_Moon_Tino_Renato_Photos_ID3576_v8vxs0` | Honeymoon tile |
| ceremony | `DTS_Tradition_Chris_Abatzis_Photos_ID9150_yiunlp` | Ceremony tile, fixture Our Story |
| party | `DTS_BANDITS_PALI_MENDEZ_Photos_ID14229_mhwb5h` | Wedding party tile |
| table | `DTS_Grand_Design_Daniel_Far%C3%B2_Photos_ID4152_auimyj` | Seating tile, fixture moodboard |
| style | `DTS_DECADENT_Debora_Spanhol_Photos_ID12475_viqbsz` | Moodboard tile, fixture moodboard |
| beauty | `DTS_MOTHERLY_Shauna_Summers_Photos_ID10728_vz25fa` | Beauty tile |
| music | `DTS_PLAYER_TWO_JELLY_LUISE_Photos_ID13458_a53qq3` | Music tile |
| stay | `DTS_Please_Do_Not_Disturb_Fanette_Guilloud_Photos_ID8854_xted4d` | Accommodation tile |
| gifts | `DTS_SUITE_TALK_PALI_MENDEZ_Photos_ID14166_tqzysj` | Guest gifts tile, Registry tile |

Every id above was checked to resolve at `f_auto,q_auto,c_fill,g_auto,w_100,h_100` on 2026-09-21. Per-universe sample photos come through `src/lib/sampleContent/*` unchanged. The push preview's wallpaper and the Account profile photo are the couple's first image. `/favicon.svg` is the app icon on the lock screen mock.

### Notifications

**Architecture.** One hook, `src/mobile/notifications/useNotifications.js`, with the interface the screens see: `items, unread, loading, error, reload, markAllRead, markRead, settings, setSettings, latestUnseen, bannerShown`. It merges two sources:

1. The `Notification` entity that already exists and that three endpoints write (`rsvp_received` from `api/rsvp-submit.js`, `collaborator_joined` from `api/collaborator-accept.js`, `questionnaire_answered` from `api/questionnaire-answer-submit.js`). Its own `read` flag is the read state for those rows, updated through `Notification.update`, as `src/lib/useNotifications.js` does for the desktop bell.
2. A feed derived client-side in `feed.js` from data the app already loads: replies from the guest list (`rsvp_date`), guest messages, song requests still pending, poll votes grouped per poll per day, received gifts, tasks due within three days or overdue within thirty, unpaid budget items with a payment date within a week, and one briefing line a day. Read state for these is a last-seen timestamp plus dismissed ids, stored with Capacitor Preferences natively and localStorage on the web (`store.js`).

The feed is capped to the last thirty days and sixty items. Types the couple has switched off in settings are filtered out of the feed, so the bell, the center and the banner agree. A real notifications table later replaces `load()` in the hook and nothing else.

**Surfaces.** The bell (top right on every tab root, unread dot), the center at `/m/notifications` (Today / This week / Earlier, mark all as read, empty state), settings at `/m/notifications/settings` (a toggle per group and quiet hours), the in-app banner (drops from the top when a new unread item arrives while the app is open and the center is not on screen; four seconds; swipe to dismiss; tap to open), and Home's "Latest" rows.

**Copy.** `src/mobile/notifications/copy.ts` is the catalog: one template per type, titles under 40 characters, bodies under 90, clipped at word boundaries. The push preview and the in-app center use the same function.

**Settings are local.** The toggles and quiet hours are saved on the device and shape what the app shows. They are not connected to push, because there is no push yet. The settings screen says so.

**Push preview.** `/m/preview/push` (dev only) is a design artifact: an iOS lock screen with the couple's photo as wallpaper, six Openinvite notifications from the real catalog, one expanded with Open / Later, one grouped stack that expands on tap, and a button to the in-app banner state (`/m/preview?banner=1`). It sends nothing.

**What real push needs** (not done in this run, by design):

1. A notifications table with a device-scoped read state, replacing the derived feed: `type, title, body, link, recipient_user_id, read, created_date` is already the shape of the `Notification` entity, so extending its writers is the smaller step.
2. A server-side trigger or function to fan out: every place that today writes a `Notification` row, plus the events the feed derives now (new guest message, song request, poll vote, gift, task due, payment due, the morning briefing), calling APNs and FCM.
3. Device token storage: a field or small entity keyed by user and platform, written by the app after registration. This is a schema change and needs a decision.
4. An APNs key (.p8) and an FCM project, with the iOS entitlement and the Android google-services file in the native projects.
5. `@capacitor/push-notifications` registration in `native.ts`, behind `isNative()`.
6. Permission prompt timing: ask after the first RSVP arrives, not on first launch.

### Global search

`/m/search` (the magnifier on Home and Plan) searches guests by name and email, tasks by title, vendors by name and category, and features by name, over the same loaded data as the hub.

### Stubs, skips and blockers added in goal 2

1. **Considerations** is a hand-off only. Its content is a list computed inside `src/pages/Considerations.jsx` from the couple's profile and is not exported, so the app cannot render it without editing that page.
2. **Seating** adds and moves guests between existing tables; creating a table, changing capacity and the canvas stay on desktop. `assignGuestToTableByName` creates a table when the name is new, so a typed name would work, but the sheet offers existing tables only, on purpose.
3. **Marketplace** results carry name, rating, address and website; Google photos and the vendor profile modal stay on desktop. Saving uses `saveVendorFromPlaces(vendor, null)`, which files the vendor under the searched category.
4. **Photos and media**: there is no photos page in the desktop sidebar, so there is no mobile screen. The `Photo` entity is read by Moodboard on desktop only.
5. **Pull to refresh** is on Home and Guests. The other lists expose `reload` and could take it in one line each.
6. **Guest suite places** are edited by hand (name, address, note, website). The desktop pages also search Google Places and attach a photo reference; the mobile screen keeps whatever the desktop attached and links to it for search.
7. **The Ava pod** still navigates to desktop routes from its action cards (see the v0 decision).
8. **`window.confirm`** is still used for destructive confirms in the generic list screen, as on desktop.
9. **Polls** show vote counts from `PollVote` rows plus any counts stored on the poll option; comments and Ava insights stay on desktop.
10. **The notification feed's reply detection** relies on `Guest.rsvp_date`, which the RSVP endpoint sets; guests whose reply predates that field show under "Earlier" or not at all.

### Needs a decision (goal 2 additions)

- **Device tokens for push** need somewhere to live (a field on `User`, or a `DeviceToken` entity). Schema change; not made here.
- **Fan-out for the derived notification types.** The desktop only writes `Notification` rows for RSVPs, collaborators and questionnaires. Messages, song requests, poll votes, gifts and due dates would need server-side writers before push can carry them.
- **`eslint.config.js`** still does not include `src/mobile/**`; the `.ts` files (`native.ts`, `copy.ts`) are outside the current parser config too.

## Goal 3: list patterns, the native app layer, first run

### Lists: the rule and where each pattern is used

Two patterns, never mixed within one list; the rule is in `src/mobile/DESIGN_MOBILE.md`, "Lists". More than about 25 items, or no image and no inline action, means grouped rows; otherwise item cards.

| Item cards (`ItemCard`) | Grouped rows (`GroupedList` of `Row`) |
|---|---|
| vendors (grid toggle), registry links, products and cash funds (grid toggle), received gifts, moodboard pins (grid toggle), schedule moments, vows and speeches, payments due, tasks and payments in Home's "Next up", seating tables, guest-suite places (accommodation, transport, experience picks), the wedding party, marketplace results, polls | guests (swipe to remove), the checklist (swipe to complete or remove), messages (swipe to mark read), budget line items inside a category, the playlist, song requests, the notification center, notification settings, account |

Every list has skeleton, empty and error states and pull to refresh. Song requests keep their inline Add / Decline because those go through `/api/song-request-review`, not a row mutation.

### The image manifest

`src/mobile/images.ts` is the one place a decorative Cloudinary id is named: 35 slots with alt text, where each is drawn, the pixel size to supply and a focal point where the crop matters. Eight slots are `todo` and render a color panel: the Plan tiles for Schedule, Budget, My vendors and Transport, the empty states for Guests and Registry, and the app-lock background (which uses the couple's own photo first). `/m/preview/images` renders the file as a gallery with a "Needs photo" marker on each. Fixture data that stands in for the couple's own uploads (cover photo, Our Story, moodboard pins) also reads from the manifest so nothing else names an id.

### Native layer

| Piece | Built | Notes |
|---|---|---|
| Icon and splash | `assets/logo.svg`, `assets/icon-only.svg`, `assets/splash.svg`, `assets/splash-dark.svg`, generated into both projects with `npx capacitor-assets generate` | The brand mark from `public/favicon.svg` at icon scale (the red ring on ink); the splash is the mark centered on the flat page background, dark variant on ink, no gradient. The splash fades out over 250ms once the shell has painted (`hideSplash()` 350ms after mount). The wordmark PNG in the repo is 1434 by 331 and unsuitable for a square icon, so the mark was drawn from the favicon rather than rasterized from it. |
| Deep links | `openinvite://` in `Info.plist` (`CFBundleURLTypes`) and `AndroidManifest.xml` (a `VIEW` intent filter); `registerDeepLinks()` in `native.ts` listens for `appUrlOpen` and the launch URL and routes through `routeForDeepLink()` | `openinvite://m/plan/budget`, `openinvite://plan/budget` and `https://openinvite.com.au/m/...` all become `/m/...`. |
| Auth callback | `routeForDeepLink()` stores `access_token` from the URL as `base44_access_token`, exactly as `src/lib/app-params.js` does for the web callback, then the shell reloads at `/m` so `AuthContext` sees the session | The provider buttons on `/m/login` call `base44.auth.loginWithProvider(provider, 'openinvite://auth?next=/m')` when native. **The backend is Base44, not Supabase**: the redirect allow-list lives in the Base44 app's auth settings, not a Supabase dashboard. See "Manual steps". |
| External links | `openExternal()` opens `@capacitor/browser` natively (the in-app browser), a new tab on the web; the app's own webview is never navigated away | Used for the site, vendor websites, tel: and mailto:, the reset flow and sign-up. |
| Face ID lock | `@aparajita/capacitor-biometric-auth`; `AppLock` in `src/mobile/shell/`; "Require Face ID to open" row under Account, native only | Branded lock screen (the couple's photo, the mark, one Unlock button) on cold start and after five minutes in the background; biometrics with the device passcode as fallback. Stores only the on/off choice in Preferences. No password or token is stored anywhere new. |
| Camera and library | `@capacitor/camera`; `PhotoPicker` sheet; an `image` field type in the form schemas | Moodboard pins and the three registry lists offer Take photo and Choose from library (or a file input on the web), then upload through `src/hooks/useFileUpload.js` and the same Base44 `UploadFile` endpoint the desktop uses (GPS stripped, validated), with progress and a retry. iOS usage strings are in `Info.plist`; Android has `CAMERA`. |
| Keyboard, safe areas, gestures | keyboard resize is native (`capacitor.config.ts`); composer bars use `Screen`'s pinned footer; tapping outside an input blurs it; `useEdgeSwipeBack` on iOS; the Android back handler closes a sheet, then goes back, then confirms before leaving from a root | Every screen and sheet pads with `env(safe-area-inset-*)`; the compact bar, tab bar, Ava button, banner and offline pill all respect the notch and the home indicator. |
| Webview tells | `user-select: none` and `-webkit-touch-callout: none` on chrome (text stays selectable in inputs and message bubbles), `touch-action: pan-x pan-y` on the root (no pinch zoom), no tap highlight, `allowsLinkPreview: false`, `scrollEnabled: false` on iOS so the shell does not rubber-band | |
| Offline | `@capacitor/network` (the browser's online events on the web); `NetworkProvider` and the slim `OfflineBanner` pill under the header; forms disable Save with a plain line while offline | Last loaded data stays on screen. |
| Timeouts | `useLoad` races every load against 15 seconds and resolves to an error the screens render with a retry button; data already shown stays | No infinite spinners. |
| Optimistic updates | `useLoad().optimistic(patch, commit, onFail)`: completing a task (Home and checklist), marking a message read, marking a payment paid, notification settings | Rolls back with "Could not save that. Put back the way it was." |

### First run

- **Welcome**: `/m/welcome`, three swipeable slides from the manifest, dots, Get started and I already have an account. Shown once natively (`welcome_seen` in Preferences); the web goes to the existing login.
- **Login**: `/m/login`, email and password through `base44.auth.loginViaEmailPassword` as `Login.jsx` does, show and hide password, plain errors, Forgot your password opens the existing reset flow in the in-app browser. Google and Apple appear because the web app has them and go through the scheme. The web login page is untouched.
- **New accounts**: sign-up involves plan selection on the web, so the app does not rebuild it. Get started and Create an account open a sheet that explains the account is created on the website and opens `/register` in the in-app browser. Recorded under "Needs a decision" with the purchases question.
- **Notification priming**: `/m/priming`, shown the first time a reply is in the feed and never seen before. Turn on records `notif_priming = on` locally and says notifications are coming soon; Not now records `later`. The system prompt is not called.

All four are in `/m/preview` (`/welcome`, `/login`, `/login?state=error`, `/priming`, `/priming?state=recorded`), plus `?lock=1` and `?offline=1` on Home.

### Accessibility

Every icon-only button carries an `aria-label` (header actions, the bell, item-card actions, swipe actions, the password toggle, Close on sheets). Tabs are `role=tab` with `aria-selected`; switches are `role=switch`; carousels are `role=region` with slides as groups; sheets are `role=dialog` `aria-modal`, trap Tab inside and restore focus to the opener on close. Layouts were probed at 130 percent text (the probe is in the session notes, the two clipping cases it found are fixed: long tile names wrap with hyphens, long money figures step down to 40px). Text on photos always sits on the scrim; the input placeholder is #444444; nothing on a light surface is lighter than that. Reduced motion keeps only fades: the stagger, parallax, count-ups and springs are all switched off by `prefers-reduced-motion`.

### Verify

- `npm run build`: passes. `npm run lint`: passes. `scripts/test-route-collisions.mjs`: passes.
- `npx cap sync`: passes, eleven plugins on each platform.
- **Built and run on the iOS simulator, 2026-09-21** (Xcode 27.0, iOS 27.0 runtime, iPhone 17). `npm run mobile:build` passes; `xcodebuild` on `ios/App/App.xcodeproj` passes (Swift packages resolve, no CocoaPods); the app installs and launches. Captures are in `mobile-screenshots/simulator/` at half the iPhone 17's 1206 by 2622: `00-before-fix-launch-black` (the first launch, before the fixes), `01-welcome`, `02-provider-handoff-safari` (Continue with Google, in Safari), `03-preview-home` (from the throwaway dev bundle). The login screen itself was not captured; it needs a tap the headless run could not give. What the run found and what was fixed is under "First simulator run" below. Android Studio and a JDK are still not installed.
- 62 screenshots at 390 by 844 in `mobile-screenshots/`, all passing the width, 44px, 16px and shadow probe, including the new list patterns, the image gallery, welcome, login, the lock screen, the offline state and priming.

### How to run on the simulator and on a real iPhone

1. Install Xcode from the App Store (the full app, not the command line tools), open it once to accept the license and install the iOS platform. Then `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer`.
2. `npm run mobile:build` (builds the web app and runs `cap sync`), then `npm run mobile:ios` to open `ios/App/App.xcodeproj` (there is no `.xcworkspace`; Capacitor 8 resolves its plugins as Swift packages inside the project). Pick a simulator and press Run.
3. Command line: `xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Debug -destination 'platform=iOS Simulator,name=iPhone 17' -derivedDataPath ios/DerivedData build`, then `xcrun simctl install booted <DerivedData>/Build/Products/Debug-iphonesimulator/App.app` and `xcrun simctl launch --console-pty booted au.com.openinvite.app` (the console shows the Capacitor bridge and `console.error` from the web app). Screenshots: `xcrun simctl io booted screenshot out.png`.
   - **Xcode 27**: `Simulator.app` was renamed `DeviceHub.app` and moved to `Xcode.app/Contents/Applications/`. `npx cap run ios` builds fine and then fails at "Deploying" with "Simulator.app does not exist"; that is a Capacitor CLI path bug, not a build failure. The simctl steps above do not need the window at all. To get the window: `open -a /Applications/Xcode.app/Contents/Applications/DeviceHub.app`.
   - `xcrun simctl openurl booted "openinvite://..."` puts up an "Open in Openinvite?" alert on iOS 27 that has to be tapped in the window.
   - Local builds have no `.env`, so `VITE_BASE44_APP_ID` is unset and the SDK warns at build time. Vercel supplies it in CI. For sign-in to work in a local simulator build, `vercel env pull` first.
4. A real iPhone: sign in with an Apple ID under Xcode > Settings > Accounts, set the team on the App target under Signing & Capabilities, plug the phone in, trust the computer, select it as the destination and Run. For a personal team the app expires after seven days; the Apple Developer Program lifts that and is needed for TestFlight and push. Face ID is not gated: `NSFaceIDUsageDescription` in `Info.plist` is all the biometric prompt needs, and a personal team signs it.
5. Deep links on the simulator: `xcrun simctl openurl booted "openinvite://m/plan/budget"`.

### Manual steps for the owner

- **Xcode** and, for Android, **Android Studio with a JDK 17**, as above.
- **Apple Developer Program**, for TestFlight, push and the release.
- **Redirect URLs for auth**: the backend is Base44. In the Base44 app's authentication settings, add `openinvite://auth` as an allowed `from_url` origin for the Google and Apple providers (the app passes `openinvite://auth?next=/m`), alongside the existing `https://openinvite.com.au`. If Base44 rejects a custom scheme, the fallback is `https://openinvite.com.au/m/auth-return`, which becomes a universal link once `apple-app-site-association` and `assetlinks.json` are served from the site (already exempt from the SPA rewrite in `vercel.json`). Universal links on `openinvite.com.au` are the later upgrade in either case.
- **CORS** for the shell's origin in `api/_lib/security.js` (from goal 1; still the gate for any data loading natively).
- **Icon source**: the generated icon is drawn from the favicon mark. If a designed 1024 by 1024 icon exists, drop it at `assets/icon-only.svg` (or `.png`) and a 2732 by 2732 splash at `assets/splash.svg` and re-run `npx capacitor-assets generate --ios --android`.

### Stubs and blockers added in goal 3

1. The iOS project is built and runs on the simulator (see "First simulator run"). Android is synced, not built (no Android Studio, no JDK).
2. `PushSubscription`, `DeviceToken`, `push_prefs`, the fan-out and the crons are a proposal only (`PUSH_BACKEND_PROPOSAL.md`). The priming screen records the choice locally.
3. Face ID, the camera and deep links are wired and untested on a device; each is a no-op on the web and in the preview, and each degrades to a plain message on failure.
4. Pinch zoom is held off with `touch-action: pan-x pan-y` on the root, not a viewport `maximum-scale`, because `index.html` is outside goal 3's allowed edits.
5. Long lists are neither virtualized nor paginated: the existing loaders return whole lists and there is no page cursor to reuse, and no virtualization library was added. Guests at a few hundred rows render fine in the probe.
6. Photo upload is offered where the desktop offers it and the feature exists in the app: moodboard pins and registry images. The cover photo and Our Story photos are set in the builder on desktop.
7. The welcome gate runs natively only; on the web, `/m` still redirects a signed-out visitor to the existing `/login?next=/m`.
8. **The launch screen renders black for two to four seconds** before the splash plugin's image appears. `splashboardd` logs `XBLaunchStoryboardErrorDomain code 6: Estimated size (29900800) is over limit (25000000)` and falls back to black. The number is the one capacitor-assets users report for its 2732 by 2732 output (ionic-team/capacitor-assets#640), but on iOS 27 it did not change after the imageset was downscaled to 2000 px or the storyboard's declared size was reduced, so the estimate is not driven by the image alone; both experiments were reverted. Proposed fix, not applied: rebuild `LaunchScreen.storyboard` as a plain view with a named background color (light `#F5F5F4`, dark `#0A0A0A`) and a small centered image view for the mark, instead of a full-screen image view. Needs a device run to confirm the same limit applies there.
9. A blank page-colored frame shows for about a second between the splash fading and the welcome photo arriving from Cloudinary, on both cold and warm starts. Cosmetic; holding the splash until the first image decodes is the fix if it matters.

### First simulator run (2026-09-21)

Production bundle, Debug build, iPhone 17 simulator on iOS 27.0. Cold start to the welcome screen is about seven seconds (four of them the black launch screen, item 8 above); a warm relaunch is about four. Two bugs surfaced on the first launch, both in code that could not run anywhere but a device, both fixed inside `src/mobile/`:

1. **The splash never hid on a fresh install.** With no session, `/m` bounces to `/m/welcome`, which renders `MobileFirstRun`; only `MobileShell` called `hideSplash()`, and `launchAutoHide` is off, so the native splash sat over welcome and login forever. `MobileFirstRun` now runs the same boot as the shell (status bar, keyboard, splash) and registers the deep-link listener, which it also needed: the provider sign-in returns to `openinvite://auth?access_token=` while that screen is up.
2. **Deep links replayed forever.** On iOS `App.getLaunchUrl()` returns the last URL the app was ever opened with, cold or warm, and never clears it (`ApplicationDelegateProxy.lastURL`). A link to a guarded route while signed out bounced to `/m/welcome`, which remounted, read the same URL back, bounced again, and WebKit threw its 100-`replaceState` SecurityError into the error boundary. The auth callback had the same shape across its reload. `registerDeepLinks` now records the URL it handled in `sessionStorage` (which survives the reload inside the webview) and skips the replay.

Also observed:

- Tapping Continue with Google on `/m/login` leaves the webview in place and opens Base44's provider page in Safari (Capacitor sends off-origin top-level navigations to the system browser), with the "Openinvite" back link in the status bar. That is the right shape for Google, which refuses embedded webviews. Whether Base44 then returns to `openinvite://auth` depends on the redirect URL being registered (manual steps).
- Safe areas: the status bar overlays the page (`overlaysWebView`), the welcome title sits clear of the notch, the tab bar clears the home indicator, the Ava button floats above it. Nothing differs from the 390 by 844 browser captures except the status bar itself and the 402 by 874 point canvas of the iPhone 17.
- Plus Jakarta Sans renders natively; no fallback font appears.
- The keyboard was not exercised: the login form needs a tap the headless run could not give (see the Xcode 27 notes above).
- `/m/preview` is not in the production bundle (`import.meta.env.DEV` gates the route), so the preview home capture came from a throwaway `NODE_ENV=development vite build --mode development`, which is not committed. Plain `vite build --mode development` is not enough; Vite keeps `DEV` false without `NODE_ENV`.
- Running `cap run` or `xcodebuild` leaves `ios/DerivedData/` behind (gitignored), and `npm run lint` then fails on Capacitor's bundled `native-bridge.js` inside it because `eslint.config.js` does not ignore `ios/**`. Existing-file edit, listed under "Needs a decision".

### Needs a decision (goal 3 additions)

- **Purchases and accounts in the app.** Sign-up and plan selection stay on the website and the app says so (a sheet on Get started). The App Store question from goal 1 still stands: in-app purchase, web-only with a plain note (what v0 does), or Stripe in the in-app browser with a deep-link return.
- **Redirect URL policy on Base44.** Whether the custom scheme is accepted as a `from_url`, or the universal-link route should be built first.
- **Push schema** (`PUSH_BACKEND_PROPOSAL.md`): the four open questions at its end, and approval of the three entity changes before anything is applied.
- **`index.html` viewport**: whether to add `maximum-scale=1` for the native build only (a build-time swap), which WKWebView honors and which removes the last pinch-zoom path.
- **`eslint.config.js`**: add `ios/**` and `android/**` to the global ignores so a simulator build does not make `npm run lint` fail on Capacitor's bundled JavaScript.
- **The launch screen** (item 8 above): rebuild the storyboard without a full-screen image view.

### Roadmap, re-ordered for what is left before TestFlight

1. Owner: Apple Developer Program, CORS for the shell origin, the Base44 redirect URL, `vercel env pull` for local builds. Xcode is installed.
2. Run on a device; check Face ID, the camera, deep links and the keyboard on real hardware. The simulator run is done; the launch screen finding (item 8) is the one thing to settle before TestFlight.
3. Approve and apply the push schema; ship the triggers; then registration, then the fan-out (order in the proposal).
4. TestFlight build with the current icon; a designed icon when one exists.
5. Universal links on `openinvite.com.au` for auth and shared links.
6. App Store assets: screenshots from `mobile-screenshots/` at the store sizes, privacy labels, the review notes on purchases.
7. Android: Android Studio, a JDK, the Firebase project, a Play internal track.

## Goal 4: the owner's phone-test fixes (2026-09-21)

Built against `MOBILE_APP_GOAL_4.md`. All six phases are done.

### Photos: one library, the `app/` folder

The owner authorized the Cloudinary connector, so the `app` folder (cloud `dsr84xknv`) was listed through the Admin API with no secret reaching the terminal: 73 photos, 49 from the DTS sets, 18 generated, 6 universe heroes. Every one was viewed as a thumbnail before assignment. `src/mobile/images.ts` now names 45 slots and 45 distinct photos; each photo is used once in the whole app, so nothing repeats on a screen, and `/m/preview/images` reads "45 slots, 45 photos, no repeats" and turns a card red if that ever changes (`repeatedSlots()`, keyed by the new `screen` field). No `todo` slot remains; the four Plan tiles, two empty states and the lock screen that were color panels have photos. Crops use Cloudinary's face-aware `g_auto` at the slot's ratio, so no face is cut; the one photo with closed eyes in its focal area (a couple in bed) was left out, as were the remaining 27.

| Slots | Photo (alt, then the public id stem) |
|---|---|
| Home hero fallbacks | heroDays: A couple in an arched doorway, forehead to forehead (hf 20260904 055316 4efc8628-77ed-4737-83bd-d0715cf99d43); heroReplies: A couple walking hand in hand at sunset (BANDITS PALI MENDEZ 14215); heroAva: A couple laughing at a bar table (hf 20260904 112950 ee43be91-2036-4b97-8ff9-f490913bfded); heroShare: Friends on a rooftop at dusk with a tray of drinks (pin marrakech); keepPlanningDefault: A couple under a yellow blanket with mugs (SNOWBOUND Daniel Farò 12430) |
| Plan hub tiles | tileEventDetails: Two hands and a pair of rings on a table (ISOLA Daniel Farò 13172); tileSchedule: Planning on a laptop, phone in hand (INFLUENCER Daniel Farò 8195); tileGuests: Friends leaping over a hay bale (Tradition Chris Abatzis 9181); tileSeating: A dinner table from above, plates and wine (Banquet Daniel Farò 5359); tileWeddingParty: Two friends laughing on a doorstep (VINYL TASTE Ivan Resnik 14915); tileMoodboard: A bouquet held against pink (Natural Beauty Rob Christain Crosby 2680); tileStyling: A satin suit and a smile (Please Do Not Disturb Fanette Guilloud 8869); tileBeauty: Getting ready at a bathroom mirror (Please Do Not Disturb Fanette Guilloud 8875); tileFood: A croquembouche and bowls of berries (LAST SUPPER PALI MENDEZ 13819); tileMusic: A party under falling tinsel (Pride Agustín Farías 5544); tilePhotography: Two friends in a portrait (Young Latin Martin Pisotti 6999); tileGuestGifts: A hand holding a bottle of champagne (Philia Daniel Farò 4659); tileVendors: Arranging flowers in a vase (MOTHERLY Shauna Summers 10728); tileMarketplace: A couple in a souk (marrakech-hero); tileCeremony: A couple on the steps in their wedding clothes (SUITE TALK PALI MENDEZ 14213); tileTransport: A couple in the back of a car at night (hf 20260904 063711 294c70f5-51b6-4194-bef1-72f6cf26aa3f); tileAccommodation: Two in bathrobes on a hotel bed (Please Do Not Disturb Fanette Guilloud 8854 - Print); tileBudget: Working on a laptop, racket by the wall (SOJOURN Franco Dupuy 10730); tileRegistry: Carrying an armful of wrapped parcels (THE INTERN Shauna Summers 11406); tileHoneymoon: A couple walking along a beach (tulum-hero) |
| Empty states | emptyVendors: Hands serving plates at a counter (Banquet Daniel Farò 5367); emptyGuests: Two friends laughing over a phone (BEHIND THE SCENES Shauna Summers 8234); emptyMoodboard: A dessert table of pink cakes (DECADENT Debora Spanhol 12475); emptyRegistry: A flower stall in full bloom (WANDER Jessica MADAVO 12138) |
| Launch and first run | splash: A couple walking through a bamboo grove (kyoto-hero); welcome1: A couple under a wide sky (BANDITS PALI MENDEZ 14280); welcome2: Carrying each other through the snow (Like a Movie Foster   Asher 1041); welcome3: Sharing cake at the party (NU NUPTIALS Shauna Summers 10310); login: A couple sitting on a wall under the sky (First Date Marlen Stahlhuth 4795); priming: A kiss on the cheek against orange (Weirdly Ever After Agustín Farías 8960); lock: A couple in a mountain meadow (Tradition Chris Abatzis 9150) |
| Preview artifacts | lockScreenWallpaper: Steps down to the sea between flowering walls (hf 20260905 005926 9ff8ad93-21a0-4c2f-8f41-94cd140aa0ee) |
| Fixture stand-ins for the couple's own uploads | fixtureCover: A couple running through snow between pines (aspen-hero); fixtureStory1: A couple wheeling a bicycle down a stone lane (florence-hero); fixtureStory2: A couple dressed up on a bridge at night (hf 20260917 170201 de2267ae-fe05-4cfc-8a7c-5733336600d0); fixtureStory3: A couple against a city skyline (hf 20260905 002721 b09968b5-48aa-43ca-ad4f-76ac3cee3ccf); fixturePin1: Lilies in red light (TERRA Chris Abatzis 13220); fixturePin2: Flowers carried down a street (Quiet Glamour DTS Studio 8376); fixturePin3: A cocktail in a coupe (FIRST ROUND JELLY LUISE 10636); fixturePin4: Two white shirts, arms linked (CURATIVE Chris Abatzis 7678) |
In real mode the couple's own photos still lead the Home hero and the Site preview; with none, Home now falls back to the manifest's hero slots rather than the universe's sample content (`HomeContainer`, `ownImages()`). The fixtures build their cover, Our Story and moodboard URLs from the manifest, so no Cloudinary id lives anywhere in `src/mobile/` but `images.ts`. Ids with accented letters are percent-encoded by `imageUrl()`.

### Launch sequence

Tap the icon, a branded native screen, the in-app splash, a greeting, then the dashboard. Verified on the simulator frame by frame; no black frame anywhere.

| Step | What | Where |
|---|---|---|
| Native launch screen | A flat ink view (DESIGN_SPEC.md's black) with the full logo centred at 160pt. Drawn from loose bundle PNGs (`ios/App/App/launch-logo{,@2x,@3x}.png`) because SplashBoard, the process that renders the launch image, could not load the same image from the asset catalog ("Could not load the LaunchLogo image referenced from a nib") while the app itself could. The old full-screen 2732 by 2732 Splash imageset is deleted: it tripped SplashBoard's 25 MB cap and showed black for two to four seconds. Android draws the same from a layer-list (`drawable/splash.xml`, `launch_logo` at five densities) and sets the Android 12 system splash background to ink. `capacitor.config.ts` and `assets/splash*.svg` are ink; the status bar starts with light content and the shell flips it once the dashboard settles. | `ios/`, `android/`, `capacitor.config.ts`, `assets/` |
| In-app splash | The same logo over a photo from the manifest (`splash` slot) with the scrim, held until the wedding details and the photo itself have arrived, at least 800ms and at most 2.5s. Still only. | `src/mobile/shell/LaunchSequence.jsx` |
| Greeting | "Good morning, {first name}" (afternoon, evening by the phone's clock) at 28/34 and one line from real data: days to go, then new RSVPs since yesterday (from the feed), else open tasks. Gone after 1.8s or on tap, sliding up and fading; a plain fade under reduced motion. | same |
| Once per app open | `MobileShell` keeps a module flag, so tab changes, locks and re-renders do not replay it. The demo build and the native preview run it; the web preview shows the two screens on their own at `/m/preview/splash` and `/m/preview/greeting`. | `MobileShell.jsx`, `MobilePreviewApp.jsx` |

Known gap: with the Face ID lock on, the greeting shows before the lock; it names the couple and a count. If that matters, gate the sequence on the lock being open.

### Home hero

`PeekCarousel` size `full`: one card fills the view, nothing peeks, `scroll-snap-stop: always` moves one card per swipe, dots track. Only the hero uses it.

### Type scale and space

Screen titles 28/34, section headings 17/22, tile and card titles 15/20, body 15/22, meta 13/18, hero numbers 44/48, inputs 16. Side gutter 20px, 40px between sections, 12px from a heading to its content, 12px between cards, 16px card padding. Tiles and image cards show their title only (`FeatureTile` and `ImageCard` ignore a stat or line if passed). The full table is in `src/mobile/DESIGN_MOBILE.md`. One consequence found by the probe: the mobile input rule had zero specificity (`:where` on both sides), so the preflight's `input { font-size: 100% }` won once the root dropped to 15px; it now carries the class and inputs stay 16px.

### Latest and notifications

One `ActivityRow` for both: a 36px tile in a soft tint of the type color, or the guest's initials when a person is behind the item, title 15/20, one line of detail 13/18, the time right aligned, a red dot for unread, 64px rows with the hairline inset past the tile, 13/18 group headings. Home shows the three newest in one card with "See all".

### Verify (goal 4)

- `npm run build` passes before each of the five commits. `npm run mobile:demo` rebuilds and syncs the demo bundle.
- 64 screens at 390 by 844 in `mobile-screenshots/` (two new: `launch-splash`, `launch-greeting`), all passing the width, 44px, 16px and shadow probe. The probe exempts the two launch screens from its "more than 100 characters" check, since they are meant to be sparse.
- Inside `src/mobile/`: no size above the scale except the lock-screen mock's clock, which imitates iOS; no tile subtitle; no `tabular-nums`; no color outside DESIGN_SPEC.md (plus the three status pairs); Cloudinary ids only in `images.ts`; no photo repeated on a screen (45 slots, 45 distinct photos).
- `git diff main --stat`: new files, plus the allowed edits (`src/App.jsx` route registration, `package.json`, `capacitor.config.ts`, `assets/`, `ios/`, `android/`) and the branch's own `scripts/mobile-preview-screenshots.mjs`.

### Still waiting on the owner (goal 4)

Nothing from goal 4. Still open from goals 1 to 3: CORS for the shell origin, the Base44 redirect URL, the push schema, the Apple Developer Program for TestFlight and push.

## How to run

**Preview (no sign-in, fixture data, dev only)**

```
npm run dev
open http://localhost:5173/m/preview
```

Tabs: `/m/preview`, `/m/preview/guests`, `/m/preview/plan`, `/m/preview/site`,
`/m/preview/account`. Every feature: `/m/preview/plan/<key>` for each key in
`src/mobile/features/registry.js` (for example `checklist`, `budget`,
`messages`, `seating`, `music?segment=requests`, `registry?segment=received`,
`ceremony`, `good-to-know`). Also `/m/preview/search`, `/m/preview/notifications`,
`/m/preview/notifications/settings`, and the lock screen at `/m/preview/push`.
Query flags: `?state=loading`, `?state=empty`, `?state=error` on any screen;
`?add=1` opens the add sheet; `?banner=1` on Home shows the in-app banner;
`?native=1` on Account shows the no-purchases variant. Everything is local
state; nothing is written.

`npm run mobile:screenshots` (with the dev server up; set `BASE` if it is not on
5173) recaptures the sixty-two screens in `mobile-screenshots/` and fails if any
screen is wider than the viewport, has a tap target under 44px, an input under
16px, or a box-shadow other than the elevation token.

**The real thing on the web**

Sign in, then open `/m`. Loads the couple's own data through the same helpers
the desktop uses. Nothing links to `/m` from the dashboard yet.

**iOS simulator**

```
npm run mobile:build        # vite build, then npx cap sync
npm run mobile:ios          # opens ios/App/App.xcodeproj in Xcode; pick a simulator and run
```

Needs Xcode (the full app, not the command line tools). Capacitor 8 uses Swift
Package Manager, so CocoaPods is not required. Verified on Xcode 27.0; the
command-line route and the Xcode 27 quirks are under "How to run on the
simulator and on a real iPhone" above.

**Demo build, for showing the app without an account**

```
npm run mobile:demo         # VITE_MOBILE_DEMO=1 vite build, then npx cap sync
```

Then build and run the iOS project as above. A demo build ships the
`/m/preview` routes (a normal production bundle leaves them out), starts the
native app at `/m/preview` on the fixtures, shows "Demo data" under the
Account title, and makes no network calls: `src/mobile/demo.ts` refuses every
fetch, XMLHttpRequest and sendBeacon that is not one of the app's own assets
or a Cloudinary image, so auth, currency, analytics and error reporting all
fail the way they do offline and nothing leaves the device. With the flag
unset the guard is tree-shaken out of the bundle and behavior is exactly as
before; `npm run build` on its own still keeps `/m/preview` out of
production. Verified 2026-09-21: the demo bundle served locally makes zero
`/api/` requests across Home, Account and Budget; the default bundle sends
`/m/preview` to `/login?next=/m` and its twelve boot calls as it always did.
Never point `mobile:demo` at a store submission; it is for demos and
screenshots.

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
