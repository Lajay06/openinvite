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
| On the day | `/ceremony-details` Ceremony details | `/m/plan/ceremony` | full | form; celebrant and licence through the encrypted PUT, the rest plaintext, as CeremonyDetails.jsx splits them |
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

Order of preference on every slot: the couple's own imagery (`coverPhoto`, then photo blocks in `homeContent.blocks`, then `ourStoryContent.photos`), then the sample content of their universe (`getSampleWedding(id)`), then a colour panel. `SmartImage` never renders a broken or empty box. Stills only: nothing animates an image whose public id starts with `DTS_`; the scroll parallax on a static hero is the only motion.

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

The feed is capped to the last thirty days and sixty items. Types the couple has switched off in settings are filtered out of the feed, so the bell, the centre and the banner agree. A real notifications table later replaces `load()` in the hook and nothing else.

**Surfaces.** The bell (top right on every tab root, unread dot), the centre at `/m/notifications` (Today / This week / Earlier, mark all as read, empty state), settings at `/m/notifications/settings` (a toggle per group and quiet hours), the in-app banner (drops from the top when a new unread item arrives while the app is open and the centre is not on screen; four seconds; swipe to dismiss; tap to open), and Home's "Latest" rows.

**Copy.** `src/mobile/notifications/copy.ts` is the catalogue: one template per type, titles under 40 characters, bodies under 90, clipped at word boundaries. The push preview and the in-app centre use the same function.

**Settings are local.** The toggles and quiet hours are saved on the device and shape what the app shows. They are not connected to push, because there is no push yet. The settings screen says so.

**Push preview.** `/m/preview/push` (dev only) is a design artefact: an iOS lock screen with the couple's photo as wallpaper, six Openinvite notifications from the real catalogue, one expanded with Open / Later, one grouped stack that expands on tap, and a button to the in-app banner state (`/m/preview?banner=1`). It sends nothing.

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
5173) recaptures the fifty screens in `mobile-screenshots/` and fails if any
screen is wider than the viewport, has a tap target under 44px, an input under
16px, or a box-shadow other than the elevation token.

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
