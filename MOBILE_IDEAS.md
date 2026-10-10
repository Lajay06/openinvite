# Openinvite mobile: what to add next

Research (goal 7, item 6, 2026-09-22); goal 8 built three of these, marked **Built** or **Blocked** below; goal 9 added idea 15. Everything else is unbuilt. Each idea says what it is, who does it, why a couple would care, the effort, whether it needs the paid Apple Developer Program or a backend change, and a recommendation. The top ten are ranked at the end.

What the app already does is the baseline: instant launch, the daily update card, the full planner at parity with the desktop (guests, budget, schedule, vendors, registry, messages, polls, seating view, the guest suite tools), global search, Face ID lock, a derived notification center with an in-app banner, the native share sheet, camera and library into the moodboard, and a local test notification. Real push needs the backend in `PUSH_BACKEND_PROPOSAL.md` and the paid program; several ideas below sit behind it.

Owner decisions that bound this list (from `MOBILE_PARITY.md`): no QR codes, no direct email to guests from the app (guests are reached only through Send invites), the design canvases stay on desktop, and hotel room blocks were deliberately not pursued. Ideas that would reopen any of these are flagged, not recommended.

## What the field does

**Zola.** Countdown and checklist widgets, a guest list with RSVP tracking and text-message reminders, a registry that guests use from the same app, a wedding-day "your day" view, and a heavy push program (task nudges, RSVP arrivals, registry purchases). Zola's Home Screen widgets (countdown, next task) are the most copied feature in the category.

**The Knot.** Checklist, budget, guest list, a vendor marketplace with in-app messaging to vendors, a countdown widget, and a "wedding website" share flow. Its checklist notifications are frequent and the guest list syncs with the contacts app (import guests from Contacts).

**WithJoy.** Best-in-class guest site and RSVP, a "Joy app" for guests as well as couples, a photo-sharing feed on the day, offline-friendly guest-facing pages, and a clear "share your site" flow through the system share sheet.

**Bridebook (UK).** Checklist and budget with strong defaults, a venue and vendor directory with saved shortlists, and a "Bridebook Business" side for vendors. Its home is a daily-style feed of what to do next.

**Minted.** Design-first: invitation and website design on the phone with the same templates as the desktop, address collection from guests, and an envelope-addressing flow. Its mobile strength is the moodboard and design preview, not planning.

**Hitched (UK, part of The Knot).** Checklist, budget, guest list, vendor search and reviews, a countdown; notifications for tasks due.

**Easy Wedding (AU).** Vendor directory first, with a planner attached: checklist, budget, guest list, and enquiries to vendors from the app.

**The three consumer references.** Qantas: a Lock Screen Live Activity for the flight, boarding passes in Wallet, a calm home with one thing that matters next, Siri and widgets for "next flight". Nespresso: one-tap reorder, a photographic home, Apple Pay, and a widget for capsule stock. Airbnb: a Live Activity for check-in day, a share extension for saving listings from Safari, Wallet-style trip cards, calendar export, and a home that becomes the trip when the trip is near. All three make the phone useful on the day itself, not only before it.

## Ideas

### 1. Home Screen and Lock Screen widgets (countdown, RSVPs, next task)

What: a small and a medium Home Screen widget (days to go with the couple's photo; RSVPs in with a progress bar; the next task), and a Lock Screen widget (days to go, inline). Tapping one opens the matching screen.
Who: Zola, The Knot, Hitched (countdown); Airbnb and Qantas (trip and flight widgets).
Why: the countdown is the number a couple looks at most, and a widget makes the app present without opening it. The RSVP widget turns a check into a glance during the reply weeks.
Effort: medium. A WidgetKit extension in Swift under `ios/`, reading a small JSON the app writes to a shared App Group (days, counts, next task, one photo). Capacitor has no widget bridge, so the write is a small native plugin or a file the web layer asks a plugin to save.
Needs: an App Group capability. Works in development with a free account; distribution needs the paid program (as does the app itself). No backend change: the app writes the snapshot when it has data.
Recommendation: build first. It is the most visible native feature for the least risk.

### 2. A wedding-day Live Activity

What: on the day (and the rehearsal), a Live Activity on the Lock Screen and in the Dynamic Island: the next moment on the run sheet ("Ceremony, 3:00, Garden lawn"), then the next, from the schedule the couple already keeps.
Who: Qantas (flight progress), Airbnb (check-in day), Uber. No wedding app does this well; Zola shows a static "your day" view.
Why: the couple's phone is the one thing everyone asks; a glanceable run sheet answers "what's next" without unlocking. It is the feature that makes the app feel like Qantas on the day.
Effort: medium to large. ActivityKit in a widget extension, started from the app on the morning of the day and updated locally from the schedule (no push needed for the couple's own phone; push-updated activities need the paid program and a server).
Needs: the paid program for distribution; no backend change for the local version.
Recommendation: build second, after widgets share the extension. Start it locally; add push updates when real push lands.

### 3. Siri shortcuts and App Intents

What: "How many days until our wedding", "Who hasn't replied", "Add a task", "Open our guest suite" as App Intents, so Siri and the Shortcuts app can run them, and they appear in Spotlight.
Who: Qantas and Airbnb expose trip intents; no wedding app of note does.
Why: cheap delight, and Spotlight actions make the app reachable from the Home Screen search the phone already has. Modest daily use.
Effort: small to medium. App Intents in Swift with the same shared JSON snapshot widgets read; the write intents open the app with a deep link (`openinvite://m/plan/checklist?add=1`), which the shell already routes.
Needs: nothing beyond the app itself.
Recommendation: yes, after widgets, sharing their data.

### 4. A share extension (save a vendor or inspiration from Safari or Instagram)

What: Openinvite in the system share sheet. Sharing a web page or an image from Safari, Instagram or Photos saves it as a moodboard pin (image) or a vendor note or marketplace shortlist entry (link), with a small sheet to choose where.
Who: Airbnb (save a listing), Pinterest, Notes. Minted and WithJoy accept images into the moodboard from the share sheet.
Why: inspiration arrives on the phone, mostly in Instagram and Safari; today it has to be saved to Photos and re-uploaded. This closes the loop the moodboard was built for.
Effort: medium. A Share Extension target in Swift that writes the item to an App Group inbox; the app drains the inbox on next open through the existing moodboard and vendor writes (Base44, owner-scoped). Instagram shares a link and sometimes an image; the extension handles both.
Needs: an App Group; no backend change (the app itself does the write with the couple's token on next open). Uploads use the existing upload hook.
Recommendation: yes, third. It is the feature most likely to be used weekly during planning.

### 5. Calendar sync

**Blocked (goal 8, 2026-09-22).** The desktop's feed, `/api/schedule.ics`, answers 404 on production, so the subscribe button stays hidden until the feed answers with a calendar (the check is in `api.calendarFeed()`; the webcal and Google hand-offs are written and switch on by themselves). What did ship: Add to calendar on every event's sheet, the single-event `.ics` through the share sheet. Record in `MOBILE_APP.md`.

What: subscribe the couple's calendar to the schedule (the `.ics` feed already exists on the desktop) from the app in one tap, and add single events to the phone's calendar. Optionally, the wedding date itself as an all-day event with the countdown in its notes.
Who: Airbnb (add to calendar), Qantas (flights to calendar), The Knot (events to calendar).
Why: the schedule lives where the couple looks at time; the rehearsal dinner, the final fitting and the vendor calls stop being surprises.
Effort: small. The feed URL is already produced for the desktop; the app opens it with `webcal://` so iOS subscribes. Single events use the `.ics` export the schedule screen already builds and the share sheet.
Needs: nothing.
Recommendation: yes, and soon: it is a small change with clear value.

### 6. Contacts import for guests

**Built (goal 8, 2026-09-22).** `@capacitor-community/contacts`; From contacts on Guests, duplicates marked, the existing create mutation, Invite now into Send invites; fixtures in a demo.

What: pick people from the phone's Contacts to add as guests (name, email, phone, address), with a multi-select and duplicate detection against the guest list.
Who: The Knot, Zola, WithJoy, Hitched.
Why: entering a hundred guests by hand on a phone is the reason couples do it on a laptop. Contacts import is the one thing that makes the phone the better place for the guest list.
Effort: small to medium. `@capacitor-community/contacts` or a small native plugin (the goal 7 rule of one new dependency would need relaxing, or a hand-written plugin under `ios/`). The write goes through `createGuest` as today. A privacy string in `Info.plist`.
Needs: the Contacts permission; no backend change.
Recommendation: yes. Pair it with the existing Send invites flow so an imported guest can be invited straight away.

### 7. Photo capture straight into the moodboard

What: already in: the moodboard's add sheet offers the camera and the library through `pickPhoto()` (goal 3). What is missing is a one-tap camera from the Plan hub tile and from the share extension, and capturing a vendor's business card or a fabric swatch into a vendor note.
Who: Minted, Pinterest.
Why: incremental. The moodboard is photographic already.
Effort: small.
Needs: nothing.
Recommendation: fold into idea 4 rather than build alone.

### 8. Offline mode for the wedding day

**Built (goal 8, 2026-09-22).** The run sheet, seating, vendor contacts and emergency contacts keep the last data loaded on the device (`offlineCache.js`), open read only with no signal under the offline banner with a last-updated line, and refresh the cache every time they load online. Writes on those screens are guarded offline with a plain explanation.

What: the run sheet, seating, vendor contacts and emergency contacts cached on the phone so they open with no signal (a marquee, a vineyard, a basement bar). Read-only when offline, with the offline banner the shell already has.
Who: WithJoy (guest pages), Airbnb (trip details offline), airline apps (boarding passes).
Why: the day is the one time the app must not fail, and venues are the places with the worst signal.
Effort: medium. A small cache of the last loaded planner data in Preferences or a file, read when the network is down (`useLoad` already fails soft); the web layer needs an explicit "show the last known" path per screen. Writes queue for later or are disabled offline.
Needs: nothing.
Recommendation: yes, before the first real wedding day on the app. Scope it to the four screens named above.

### 9. Real push notifications

What: replies, messages, song requests, gifts, payments due and the morning briefing as push, with the settings the app already has.
Who: everyone in the category.
Why: the notification center is derived today and only updates when the app opens; push is what makes a reply feel like a reply.
Effort: large, mostly backend: `PUSH_BACKEND_PROPOSAL.md` (a device token entity, a fan-out function, APNs and FCM keys). The app side is `@capacitor/push-notifications` and a token write, and the local-notification wrappers in `native.ts` are the shape it will use.
Needs: the paid Apple Developer Program (APNs), an FCM project, and the backend change. Schema change: needs an owner decision.
Recommendation: yes, and it unblocks Live Activity updates and the RSVP widget's freshness. It is the largest item and the one that needs the owner's sign-off first.

### 10. Apple Wallet pass for the guest suite (and for guests)

What: a Wallet pass with the couple's names, the date, the venue and the guest suite link, and, for guests, a pass with their table and the run sheet, delivered from Send invites.
Who: airline apps (boarding passes), Airbnb (check-in), some ticketing.
Why: a nice touch for the couple; for guests it is the day's details in the one place they will not lose. It also gives guests something without a QR code on the invitation.
Effort: medium. Passes are signed server-side with a Pass Type ID certificate; a small API endpoint builds the `.pkpass`.
Needs: the paid program (Pass Type ID) and a new endpoint. Flag: guest passes reach guests by a link in Send invites, which respects the owner's rule; a pass with a scannable barcode would reintroduce QR codes by the back door and should not be added.
Recommendation: later, couple's pass first, guest passes only if the owner wants them.

### 11. Guest-facing app or App Clip

What: an App Clip (or a guest mode in the app) that opens from the guest suite link: RSVP, the run sheet, directions, the registry, photo sharing on the day.
Who: WithJoy (the Joy guest app), Zola.
Why: guests are the larger audience, and the day-of features (photos, directions, what's next) suit a phone.
Effort: large. A second product surface; the guest suite already does most of this on the web, which is why WithJoy's guest app is mostly a wrapper.
Needs: the paid program; App Clip size limits; no backend change for read-only.
Recommendation: not yet. The mobile guest suite is the web, and it works.

### 12. Vendor messaging in the app

What: enquire with and message marketplace vendors from the app, with the thread in Messages.
Who: The Knot, Easy Wedding, Bridebook.
Why: it is the marketplace's conversion step.
Effort: large (a new messaging channel and a vendor-side inbox); backend change.
Recommendation: not now. The marketplace is view-only on the phone and that matches the product's current stage.

### 13. Room blocks and accommodation booking

What: reserve hotel room blocks for guests from the app.
Who: Zola, The Knot (with partners).
Flag: the owner deliberately did not pursue room blocks. Listed for completeness, not recommended.

### 14. Apple Pay for the plan upgrade

What: buy or upgrade the plan inside the app.
Flag: every checkout call to action is hidden natively by decision (App Store rules on digital purchases; see `MOBILE_APP.md`, needs a decision). Not recommended until the owner settles in-app purchase.

### 15. Collaborator sessions in the app

**Added 2026-09-22 (goal 9), by owner decision to defer.** Found while comparing how the desktop and the app each pick the current wedding: for an owner they are identical (both resolve through `/api/my-wedding-details`, newest non-test record wins, and there is no "selected wedding" concept anywhere). The one divergence is a collaborator.

What: let someone the couple has invited — a parent, a maid of honour, a planner — sign in to the app and see the couple's wedding with their granted permissions, as they can on the desktop today.
Who: The Knot and Zola both let a partner and a planner into the same wedding; it is table stakes once two people plan together, and the couple's own partner is the commonest case.
Why: the desktop already has the whole feature (`CollaborateModal`, `CollaboratorGrant`, per-page view and edit permissions) and the invite email already goes out. A collaborator who opens that invite on their phone today lands on the desktop dashboard in a browser, which is exactly the experience the app exists to replace.
How the desktop does it: a session is identified by a `?collabOwner=<ownerUserId>` query param, read once in `src/lib/collaboratorContext.jsx` and resolved by `GET /api/collaborator-context`; every read then goes to an owner-scoped endpoint (`api/collaborator-data.js`, `collaborator-guests.js`, `collaborator-budget.js`) instead of the caller's own, because the caller owns nothing. `Layout.jsx` hides the pages the grant does not cover and shows the "Collaborating on X's wedding" banner; the real enforcement is server-side in `api/_lib/collaboratorAuth.js`.
Effort: medium. `/m` has no entry point for the param at all, so: carry `collabOwner` through the deep-link handler and the login redirect, hold it in the mobile shell the way `collaboratorContext` holds it, re-route every read in `createRealApi` to the collaborator endpoints when it is set, gate the Plan hub tiles and the tab bar on the permission map (`COLLABORATOR_PAGE_MAP` already names every page), show the banner, and make every write refuse where the grant says view-only. The api seam is the reason this is medium and not large: there is one file to re-point, not forty screens.
Needs: no backend change — every endpoint exists. It does need the CORS change (`CORS_PROPOSAL.md`), like everything else the shell reads, and the collaborator invite email would want a link the app can catch.
Flag: `MOBILE_PARITY.md` states at the top that collaborator read-only "is not a mobile concern (the app signs in as the couple)", and phase 4 lists it as a decision rather than a gap. Building this reverses that, on purpose; both places should be updated in the same change.
Recommendation: after the native extension work (1 to 3) and after CORS lands. It is the largest single audience the app does not serve, but it serves nobody at all until the shell can read the API.

## The top ten, ranked

| Rank | Idea | Effort | Paid program | Backend change | Why here |
|---|---|---|---|---|---|
| 1 | Home Screen and Lock Screen widgets | medium | for distribution only | no | most visible, lowest risk, shares its data with 2 and 3 |
| 2 | Wedding-day Live Activity | medium to large | for distribution | no (local); yes for push updates | the day-of feature that matches the references |
| 3 | Share extension into the moodboard and vendors | medium | no | no | weekly use during planning |
| 4 | Calendar sync | small | no | no | blocked in goal 8: the feed answers 404; per-event add shipped |
| 5 | Contacts import for guests | small to medium | no | no | built in goal 8 |
| 6 | Offline mode for the day | medium | no | no | built in goal 8 |
| 7 | Siri shortcuts and App Intents | small to medium | no | no | cheap, rides on 1 |
| 8 | Real push | large | yes | yes | unblocks freshness everywhere; needs an owner decision first |
| 9 | Wallet pass for the couple | medium | yes | yes (a signing endpoint) | a nice touch; guest passes only without a barcode |
| 10 | Photo capture shortcuts | small | no | no | fold into 3 |

Not recommended, by owner decision or stage: room blocks (13), in-app purchase (14), a guest app (11), vendor messaging (12).

Deferred rather than refused: collaborator sessions (15). It is not in the top ten because it is gated on the CORS change and on the native extension work being done first, not because it is worth less than what is — once the shell can read the API it is the strongest candidate for the goal after.

## What to do first

Widgets, the Live Activity and Siri share one Swift extension target and one shared snapshot, so they are one piece of native work in three steps. Calendar sync and Contacts import are small and independent and can go in the next goal alongside. Real push is the decision to ask for now, because everything on the day gets better once it exists.
