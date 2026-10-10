# Goal 2: Openinvite mobile app, design uplift + full feature coverage + notifications

Continue on the existing branch `mobile/app-shell`. Everything built in `MOBILE_APP_GOAL.md` stays. This run takes it from a plain skeleton to something that feels like a modern consumer app, covers every couple feature, and adds notifications.

## Outcome

1. A new mobile design language (rounded, image-led, tactile) applied to every screen through shared tokens and components.
2. Every couple-facing dashboard feature is reachable in the app. Nothing is missing from Plan.
3. A notifications bell at the top right, a notification centre, notification settings, an in-app banner, and a dev preview showing what Openinvite push notifications look like on a phone lock screen.
4. Updated fixtures, updated screenshots, updated `MOBILE_APP.md`, plus a new `src/mobile/DESIGN_MOBILE.md`.
5. `npm run build` passes. No existing desktop or guest-facing page changed.

## Hard rules (unchanged from goal 1, restated)

- Read `CLAUDE.md`, `DESIGN_SPEC.md`, `MOBILE_APP_GOAL.md` and `MOBILE_APP.md` first.
- Stay on `mobile/app-shell`. Never commit to `main`, never merge, never open a PR. Push the branch only.
- Additive only. Do not modify existing pages, layouts, components, global CSS or guest-facing pages. Allowed edits outside `src/mobile/`: router registration for `/m/*` routes and `package.json`. Anything else goes in `MOBILE_APP.md` under "Needs a decision".
- No database, schema, RLS, entity or env changes. No new tables. No new API keys. No `npm audit fix`. No upgrades to existing dependencies. No new UI or animation libraries: if an animation library is already a dependency of the repo, use it, otherwise use CSS.
- Reuse the existing data client, hooks and mutations exactly as the desktop pages do.
- Keep the presentational component plus container split so every screen works in `/m/preview`.
- Commit per phase, `npm run build` before each commit. Blockers get documented and stubbed, they do not stop the run.

## Phase 1: Mobile design language

Write `src/mobile/DESIGN_MOBILE.md` first, then implement it in the tokens and shared components so the change flows to every screen.

Put this at the top of `DESIGN_MOBILE.md`, word for word:

"Mobile exception. The Openinvite desktop product is sharp: no border-radius on cards, no shadows. The mobile app in `src/mobile/` is deliberately different. Phones, iOS sheets, widgets and notifications are all rounded, and square blocks fight the hardware. Inside `.oi-mobile-root` only, cards and images are rounded and floating elements have one soft elevation. Do not apply these rules outside `src/mobile/`, and do not 'fix' rounded corners inside it."

Reference points for the feel: Nespresso, Airbnb, Qantas and other major airline apps, Apple's own apps. What they share: big imagery, generous rounded cards, one confident title per screen, circular icon buttons top right, colour panels for emphasis, peeking carousels, very little text per card, smooth small motion, and a tab bar that feels like part of the phone.

Tokens (all scoped under `.oi-mobile-root`):
- Radius: cards 20px, images and tiles 16px, inputs 14px, bottom sheets 28px on the top corners, pills and buttons 999px, icon buttons fully circular.
- Shadows: none on cards. Cards separate from the page by colour and spacing. One elevation token, `0 8px 24px rgba(0,0,0,0.08)`, used only for floating things: tab bar, Ava button, in-app notification banner, bottom sheets.
- Colour: page #F5F5F4, card #FFFFFF, text #1A1A1A and #444444, primary #E03553 flat. Add emphasis panels: ink #1A1A1A, wine #3B1820, blush #FBE9EC, sand #EFE9E1. If the couple's universe exposes palette values, prefer those for panels and fall back to these.
- No gradients, with one exception: a bottom-up dark scrim over photos so white text stays readable.
- Type: Plus Jakarta Sans only, headings 600. Greeting and screen titles 34/40. Hero numbers (days to go, totals) 56/56 with tabular figures. Section titles 22/28. Body 16/24. Meta 14/20. Let size contrast do the work, not weight.
- Spacing on the 8px grid, side gutter 16px, 24px between sections, 12px between cards in a row.
- Still locked: sentence case everywhere including badges and tabs, Lucide icons only, no emojis, ✦ for Ava only, text never lighter than #444444 on light surfaces, no hype language, no exclamation marks, no em dashes.

Components to rebuild or add:
- `TabBar`: floating pill, inset 12px from the sides and above the bottom safe area, white with backdrop blur and the elevation token. Active tab: icon and label in #E03553, with a small spring when selected.
- `ScreenHeader`: large title on the left, up to two circular 44px white icon buttons on the right. On tab roots the rightmost is always the notifications bell with an unread dot in #E03553. Collapses to a compact blurred bar on scroll.
- `HeroCard`: full-width, 4:5, photo with scrim, small label, big title or number, one pill button. Works inside a carousel with dot pagination.
- `ImageCard`: photo on top (16px radius), title, one line of text, optional sentence-case badge. For peek carousels and two-column grids.
- `FeatureTile`: for the Plan hub. Photo or colour panel with a Lucide icon, feature name, and one live stat underneath.
- `StatCard`: half-width card with a circular icon, label and a big number (like a member card and credit pair).
- `PanelCard`: colour panel card for emphasis, such as the Ava briefing or a due payment.
- `Row` lists now sit inside rounded cards with hairline dividers, circular icon tiles on the left, chevrons on the right.
- `BottomSheet` with a grab handle and spring open and close.
- `SmartImage`: see Phase 2.

Motion:
- Press state on every tappable card and button: scale to 0.98 and back, 120ms.
- Screen entry: content fades up 8px, staggered 40ms per block, 240ms each.
- Hero numbers count up once on first view. Progress bars animate to their value.
- Subtle parallax on the hero photo while scrolling, maximum 12px.
- Carousels snap. Light haptic on tab change, task completion, toggles and pull to refresh when native.
- Transform and opacity only. Honour `prefers-reduced-motion` by removing movement and keeping fades.

## Phase 2: Imagery

The app should feel photographic, not like a settings screen.

- Real data: use the couple's own imagery first (universe hero, site photos, their uploads). Fall back to the sample content for their chosen universe. Fall back last to a colour panel. Never show a broken or empty image box.
- Find imagery already in use: search the repo for Cloudinary URLs and public IDs (cloud name `dsr84xknv`), the per-universe sample folders, and the marketing site photography. Reuse those. Do not invent public IDs. List every image used and where in `MOBILE_APP.md`.
- `SmartImage` builds Cloudinary delivery URLs with `f_auto,q_auto,c_fill,g_auto` and a width suited to the slot at 2x and 3x density, reserves space with a fixed aspect ratio, shows a flat tinted placeholder while loading, lazy loads below the fold, and always takes alt text.
- Stills only. Do not animate, crossfade-zoom or otherwise derive motion from any image whose ID starts with `DTS_`. The scroll parallax offset on a static hero is fine.
- Match the brand look: film grain, candid, people enjoying themselves, contemporary clothes. Skip any image that looks glossy, staged or obviously AI.
- Where images belong: Home hero carousel, Home "keep planning" carousel, Plan hub tiles, Site tab preview, vendor and registry cards where the data has photos, empty states where a photo helps, Account profile card. Where they do not belong: forms, dense lists, budget tables.

## Phase 3: Home, rebuilt

- Header: "Hi {first name}", then search and the notifications bell as circular buttons.
- Hero carousel (3 to 5 cards, dots underneath): days to go with names and date over their photo, RSVP progress, Ava's briefing for today, share your site. Each has one pill action.
- Stat pair: RSVPs and budget remaining as two `StatCard`s side by side.
- "Next up": peek carousel of upcoming tasks and due payments as panel cards with due dates.
- "Keep planning": peek carousel of `ImageCard`s into the features the couple has touched least.
- "From Ava": one ink `PanelCard` with the ✦ mark and a single useful sentence, opening the Ava sheet.
- "Latest": the three most recent activity items (RSVPs, messages, song requests, gifts), linking to the notification centre.
- Only show a section if a real feature backs it. No filler content.

## Phase 4: Full feature coverage

The first run left features out of Plan. That is the main functional gap. Fix it completely.

1. Re-inventory every couple-facing route and sidebar item in the desktop dashboard. Include, where they exist: checklist, budget, finances and payments, timeline or run sheet, vendors, seating, ceremony details, reception details, wedding party, messages and guest communications, invitations and RSVPs, registry and gifts, guestbook, song requests and music, polls, transport, accommodation, experience guide, photos and media, website and universe, Ava's Studio, help centre, settings. This list is a prompt for your search, not the source of truth. The desktop sidebar is the source of truth. Do not invent features that do not exist.
2. Rebuild the coverage table in `MOBILE_APP.md`: desktop route, mobile location, depth (full, light, or view only), status. No row may be left as "not in app".
3. Plan tab becomes a hub: title, search, an overall progress card, then sections that mirror the desktop sidebar groups and their names exactly, each a two-column grid of `FeatureTile`s with a live stat ("18 awaiting", "$12,400 left", "3 unread").
4. Depth rules:
   - Full (list, detail, add, edit, delete using existing mutations) for anything list and form based: checklist, budget, finances and payments, vendors, registry, messages, ceremony and reception details, wedding party, timeline, song requests, guestbook, polls.
   - Light (read everything, edit simple fields) for transport, accommodation, experience guide, photos.
   - View only with a clear "best edited on desktop" note for canvas-style tools: the seating chart layout (still show tables and who sits where as lists, and allow moving a guest between tables through a sheet if the existing mutation makes that simple), the site builder and Ava's Studio.
5. Messages deserves care: conversation list, thread view, composer pinned above the keyboard, unread counts that feed the bell.
6. Guest-writable data keeps living where it already lives. Do not attach anything new to owner-scoped entities.
7. Extend the fixtures so every feature has realistic preview data, and add every new screen to `/m/preview`.
8. Global search from the header searches guests, tasks, vendors and features by name.

Also bring Guests, Site and Account up to the new design: Guests gets an RSVP summary card above the list and avatar initials in circles, Site gets a large preview of the guest site in a rounded frame with share and view actions, Account gets a profile card with the couple's photo and names at the top.

## Phase 5: Notifications

No schema changes, so v0 is built on data that already exists.

- Feed: if a notifications or activity entity already exists, use it. Otherwise derive the feed client-side from existing data: new and changed RSVPs, new guest messages, guestbook entries, song requests, poll votes, registry gifts, tasks due soon or overdue, payments due, and Ava's daily briefing. Build this as one `useNotifications` hook with a clean interface so a real backend table can replace it later without touching the screens.
- Read and unread state: store last-seen timestamps and dismissed IDs with Capacitor Preferences when native and localStorage on the web.
- Bell: top right on every tab root, unread dot, opens the notification centre.
- Notification centre: grouped "Today", "This week", "Earlier". Each item is a row with a circular icon tile coloured by type, a short title, one line of body, relative time and an unread marker. Tap goes to the relevant screen. "Mark all as read" in the header. Friendly empty state.
- In-app banner: when something new arrives while the app is open, a rounded banner drops from the top with the elevation token, stays four seconds, can be swiped away, and opens the item on tap.
- Notification settings under Account: a toggle per type plus a quiet hours row. Stored locally for now, and labelled honestly in `MOBILE_APP.md` as not yet connected to push.
- Write the notification copy catalogue in `src/mobile/notifications/copy.ts`: title and body templates for every type. Plain, warm, specific, under 40 characters for titles and 90 for bodies. Examples of the tone: "Sarah and Tom are coming" / "2 guests attending. 46 of 80 have replied." and "Florist deposit due Friday" / "$450 to Wildflower Studio."
- Push preview: add `/m/preview/push`, dev only. It renders a realistic iOS lock screen mock (time, date, wallpaper from the couple's hero photo, blurred notification cards) showing five or six Openinvite notifications using the real copy catalogue and the existing app icon or logo from the repo, including one expanded notification and one grouped stack. Add a second state showing the in-app banner over the Home screen. This is a design artefact so we can see and refine how notifications will look. It sends nothing.
- Do not set up APNs, FCM or `@capacitor/push-notifications` registration in this run. Document what real push will need: a notifications table, a server-side trigger or function to fan out, device token storage, APNs key and FCM project, and the permission prompt timing (ask after the first RSVP arrives, not on first launch).

## Phase 6: Verify and document

- Capture fresh 390 by 844 screenshots of every preview screen, including the notification centre, the in-app banner state and the push lock screen, into `mobile-screenshots/`. Replace the old ones.
- Update `MOBILE_APP.md`: coverage table, image inventory, notification architecture and what real push needs, anything stubbed, anything that needs a decision.
- Final checks:
  - `npm run build` passes.
  - `git diff main --stat` shows only new files plus the allowed edits.
  - Inside `src/mobile/`, search for and fix: `uppercase`, emoji characters, em dashes, exclamation marks in UI copy, gradients other than the photo scrim, `box-shadow` values other than the single elevation token, text colours lighter than #444444 on light surfaces, any font other than Plus Jakarta Sans.
  - Confirm no rounded or shadow styles leak outside `.oi-mobile-root`.
- Push `mobile/app-shell`. Do not open a PR.

## Definition of done

- Every screen uses the new rounded, image-led design through shared tokens and components, and `DESIGN_MOBILE.md` explains it.
- The coverage table has a mobile home for every desktop couple feature, and each one opens in `/m` and `/m/preview`.
- The bell, notification centre, settings, in-app banner and `/m/preview/push` lock screen all work.
- Screenshots are refreshed, `MOBILE_APP.md` is current, the build passes, and nothing outside the allowed files changed.
