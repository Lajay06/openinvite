# Mobile parity audit

Goal 5, phase 0. The desktop dashboard is the source of truth; every
couple-facing planning feature is listed in the desktop sidebar's order
(`src/components/layout/AnimatedSidebar.jsx`). For each: what the desktop
page shows and does, every modal with its fields, the integrations it uses,
its states, then the mobile screen as found at the start of goal 5 and the
gap list. The "Status" line at the end of each feature is updated as phase 1
closes the gaps.

Notation. **Field** `name` (type, validation). **Actions** are the verbs the
page offers. **Integrations**: Google Places search (`POST /api/places-search`),
place details (`GET /api/place-details`), place photos (`/api/places-photo`),
Ava (`base44.integrations.Core.InvokeLLM` / `AvaModal`), file upload
(`UploadFile` from `@/integrations/Core`), email (`/api/send-invites`,
`/api/send-guest-reply`), Google Calendar (`/api/schedule-feed-url`), Spotify
(a pasted playlist link parsed by `parsePlaylistLink`), WhatsApp (`wa.me`
links). **States**: every desktop page has loading (a spinner), an empty
state per list, a toast on error; collaborator read-only comes from
`useCollaboratorContext` and is not a mobile concern (the app signs in as
the couple). Plan gating is named where it exists.

Canvas-style tools (the seating canvas, the website builder, the invitation
builder) reach parity for every list and form action; the drag surface
itself stays on desktop and is noted.

---

## Planning

### Daily update (`/DailyUpdate`) → `/m` Home

**Desktop.** Greeting, day state, stat tiles (replies, budget, tasks, vendors), Ava briefing, latest activity. No forms. Ava: `AvaChatPod`.
**Mobile.** The daily update card on every open (goal 7: the desktop's own greeting and day-state sentence, a bundled photo, Let's go, Not again today, swipe to close), then Home: hero carousel (days to go first, two rotating cards from RSVPs, from Ava, budget, next payment, next task, song requests or guestbook, the guest suite share card last, every card labelled), stat pair, Next up (payments due and open tasks, tap to complete), keep planning, from Ava, latest three notifications, pull to refresh. Ava opens the same pod in a sheet. Global search (goal 7) covers the desktop top bar's pages, guests, vendors and to-dos plus events, budget, registry and messages, each result opening its own screen or sheet.
**Gaps.** None on content. Owner fix 1: the Next up cards are unequal heights.
**Status.** Done. Owner fix 1: every Next up card is 156px, titles clamp to two lines, meta and body to one, content aligned to the top with the action at the foot.
**Goal 9 (error copy, 2026-09-23).** A failed load said "Check your connection and try again" on a phone with four bars. The connection is now named only when the device is genuinely offline (`useOnline()`, which already drives the offline banner); online, the screen says what failed and names it — Home and the Plan hub say "your wedding", the guest list says "your guest list" — and the retry stays in every state. No desktop counterpart: the dashboard shows a toast per failed store, and the phone's full-screen error state is its own surface.

**Goal 9.** The greeting is the couple's own name, resolved exactly as the desktop resolves it (`coupleDisplayName` / `coupleNameParts` in `api/_lib/coupleNames.js`, legacy `coupleNames` fallback included). It used to fall back to `user.full_name`, which Base44 fills with the email's local part when an account is created without a name, so a real couple was greeted "Hi jaygalaxy23"; the account's name is now used only when it is not the email in disguise (`src/mobile/lib/greeting.js`), and otherwise the screen says plain "Hi". The Guest suite and Account cards take the same helper. The desktop's masthead has always used `coupleDisplayName`, so this is the mobile screen catching up, not a new rule.

### Event details (`/event-details`) → `/m/plan/event-details`

**Desktop.** Three tabs.
- *Details*: `couple1Name` (text), `couple2Name` (text); the wedding address `openinvite.com.au/w/{slug}` with **Change address** (modal: `newSlug` and a confirm field, letters/numbers/hyphens, must match, must differ; `POST /api/change-address` then `WeddingDetails.update({ slug, previousSlugs })`); `weddingDate` (date); guest type pills `guestType` (intimate / celebration / grand, single select, tap again clears); `guestCount` (number). Auto-saves 2.5s after the last change through `WeddingDetails.update` (creates the record via `createMyWeddingDetails` when there is none) and calls `syncWeddingAddress` after a name change.
- *Events*: the ceremony and reception cards, then pre and post wedding events sorted by date and time. **Edit ceremony / Edit reception** modal: Venue (Google Places search panel: `VenueSearchPanel`, with Use my location, results with photo, Add manually with name and address; stores `venueName, address, placeId, mapsUrl, photoUrl`), `startTime` and `endTime` (15 minute pickers, stored HH:MM), `dressCode`, `parkingInfo`, `accessibilityNotes`, `notes`. **Add event / Edit event** modal: timing pill `kind` pre / post (new only), `name`, `type` (select: pre = Engagement Party, Bridal Shower, Bachelor Party, Bachelorette Party, Rehearsal Dinner, Welcome Cocktails, Other; post = After Party, Next-Day Brunch, Farewell Brunch, Thank You Reception, Other), `date`, the same venue panel (stored as `venueName, venueAddress, venueMapsUrl, venuePhotoUrl, venuePlaceId` plus `venue, address`), `startTime`, `endTime`, `dressCode`, `parkingInfo`, `accessibilityNotes`, `notes` (also `details`). Saved into `preWeddingEvents[]` / `postWeddingEvents[]` with `id` and `event_id`. Delete with confirm. After adding a custom event, a prompt "Who is invited to X?" with Everyone on the guest list (goes to Guests `?inviteAll=`), Choose guests (`?setEvents=`), Decide later.
- *Theme*: `ThemeSection`, pills over `theme`: `aesthetic[]` (Beach, Boho, Classic, Garden, Glamorous, Luxury, Minimalist, Modern, Romantic, Rustic, Vintage), `faith` (single: Buddhist, Catholic, Christian, Hindu, Interfaith, Jewish, Muslim, Non-religious, Sikh; Interfaith asks for exactly two of `FAITH_FOR_INTERFAITH` into `faithSecondary` "A and B"), `culture[]` (`CULTURE_REGIONS` groups plus `CULTURE_CROSS_CUTTING`, searchable) and `cultureOther` (free text), `atmosphere[]` (Big party, Destination, Formal & elegant, Intimate & relaxed, Multi-day, Outdoor & nature), `season` (Autumn, Spring, Summer, Winter), `setting` (Indoor, Mix of both, Outdoor). Save button writes `theme`.
- Ava: event details prompt.
**Integrations.** Google Places search, place photo, maps link. Change address endpoint.
**States.** Loading spinner; "Your address appears here once you have added both names"; empty events list.
**Mobile (found).** One form: names, date, guest count, ceremony venue name/address/time/dress code, reception the same. No address, no guest type, no venue search, no photo, no map link, no start and end times, no parking or accessibility, no custom events, no theme.
**Gaps.** Wedding address and change address; guest type; venue search with the same stored shape and photo; end time; parking, accessibility, notes on the two main events; pre and post events with the full modal; invite prompt; theme tab.
**Status.** Done (phase 1): three segments (Details, Events, Theme); the address with a change sheet over `/api/change-address` and the same refusals; guest type pills; the ceremony, reception and custom event sheets with `PlaceField` (Places search, Use my location, add by hand, photo, Open in Maps through the system); pre and post events with the desktop's type lists and stored keys; the invite prompt after a new event (goes to Guests with `?inviteAll=` or `?setEvents=`); the theme pills with the interfaith two-pick rule, the culture search and the free-text culture.

### Schedule (`/Schedule`, `/Calendar`) → `/m/plan/schedule`

**Desktop.** `ScheduleHub`: stat tiles; **Add event / Edit event** modal (`ScheduleForm`: `event_name` required, `category` select grouped as planning item (pre_wedding, rehearsal, preparation, transportation, photography) or part of an event (ceremony, reception, other), `event_date` required, `start_time` required, `end_time`, `location`, `responsible_person`, `description`, `notes`) over `Schedule.create/update/delete`. Tabs: *List* (`ScheduleTable`: the merged timeline from `buildScheduleEvents`: schedule rows, vendor dates, to-dos, deadlines, the wedding day; filter pills by type, a location filter, sortable columns, Edit and Delete on schedule rows, "Open" on rows that belong elsewhere), *Calendar* (`Calendar.jsx` month grid, and `SubscribeCalendar`: Subscribe in Google Calendar and Copy subscribe link from `GET /api/schedule-feed-url`, or "not switched on"), *Run sheet* (`RunSheet`: per-event rows of the schedule items placed in that event), *Considerations*. Export CSV, Download .ics (`buildIcsCalendar` / `downloadIcs`). Ava.
**Integrations.** Google Calendar subscribe feed; .ics download.
**States.** Loading; empty list; "Calendar subscribing is not switched on for this wedding yet."
**Mobile (found).** Generic entity list over Schedule with add, edit, delete; fields event_name, date, start, end, location, category (four values, drift), responsible_person, description, notes; grouped by date.
**Gaps.** Category list drift (mobile had ceremony/reception/planning/after); the merged timeline (vendor dates, to-dos, deadlines) and its type filter; run sheet; calendar subscribe; .ics and CSV export.
**Status.** Done (phase 1): Timeline (the merged `buildScheduleEvents` list with the type filter and counts, grouped by day under sticky headers; schedule rows open the edit sheet, other rows open their home screen), My events (add, edit, delete with `ScheduleForm`'s fields and the grouped category select, the same required fields), Run sheet (`eventsInSchedule` and `runSheetFor`, one event or all), Calendar (Subscribe in Google Calendar and Add to the phone's calendar from `/api/schedule-feed-url`, copy the link, the .ics snapshot and the CSV export through `exportText`). The month grid view stays on desktop; the timeline's day grouping is the phone's calendar.
**Goal 8.** The subscribe panel and its two rows show only once the feed itself answers with a calendar (`api.calendarFeed()` fetches the URL and checks for `text/calendar`): on 2026-09-22 `/api/schedule.ics` answered 404 to every request on production, so the couple would have tapped through to an error page; the record and the `curl` are in `MOBILE_APP.md`. Every event's sheet has **Add to calendar** (the single-event `.ics` through the share sheet, no feed needed). The run sheet is one of the four offline-day screens: the last Schedule rows and timeline sources stay on the device and open read only with no signal, with the last-updated line.

### To do (`/TodoList`) → `/m/plan/checklist`

**Desktop.** List and Kanban views. Quick add row: `title`, priority pills (high / medium / low, lowercase in storage), `due_date`. Filter All / Active / Completed. Sort by due date, title, priority (remembered). Row: toggle `completed`, inline edit (`title`, `description`, `priority`, `due_date`), delete. Kanban: columns Ideas / In progress / Done (`status`), add a card with title, description, due date; move between columns (`status` plus `completed` when Done). Export notes CSV. Records are `Note` with `view_type: 'todo'`.
**Mobile (found).** Grouped list (overdue, next 30 days, later, done), tap to complete, swipe to complete or remove, add sheet (title, priority stored capitalised, due date). No detail sheet, no edit, no description, no status, no filter, no sort, no export.
**Gaps.** Edit sheet with every field; description; status (kanban column) as a select; filter; sort; export; priority casing; owner fix 4 (animated completion, Completed section, undo toast).
**Status.** Done (phases 1 and 2): tapping a row opens the task sheet with title, notes (`description`), priority (lowercase, `normalizePriority`), due date, the kanban column (`status`, with `completed` following Done), Mark as done and Remove; filter All / Active / Completed; sort by due date, title or priority with the direction flip and the same `oi_todo_sort` preference; the CSV export with the desktop's columns. Owner fix 4: the tick fills with a spring, the title strikes through, a light haptic, the task holds its place for a second then moves into its group's collapsible Completed section; an Undo toast for four seconds; untick from Completed.

## Guests

### Guest list (`/Guests`) → `/m/guests`

**Desktop.** Stat tiles (total with plus-ones, attending, awaiting, declined). Tabs: Guests, Email templates, Considerations. Toolbar: Import (`ImportGuestModal`: CSV or XLSX, download template, `createGuest` per row), Export CSV, Add guest, Send invites (Ultra), search, status filter, event filter, tag filter. Table columns: guest, contact, category, tags, status (per event chips when filtered), last sent (`invite_sent_at`, `invite_channel`), table (inline editable through `assignGuestToTableByName`), +1. Row expand: per-event table (Event, Invited, Status, Meal, Plus-one, Responded) from `event_responses[]`, **Edit events** (`SetEventsModal`: a checkbox per wedding event, unticking asks to confirm; saves `event_responses` via `toggleEventInvite`), song request and RSVP note. Row actions: Edit, Delete. Selection and `BulkActionBar`: set category, set dietary, add tag, remove tag, delete; Set events for selection; Copy links (`fetchGuestLinks`, Ultra); Send invites to selected. Quick add row (name then Enter).
**Add new guest / Edit guest** modal (`GuestForm`, accordion sections): Basics `name` (required), `email`, `phone` (country picker, E.164 on blur, warning when unreadable), `category` (family, friends, colleagues, partners_family, partners_friends), `table_assignment`, `rsvp_status` (pending, attending, declined, maybe); Meal `meal_choice` (from `WeddingDetails.mealOptions`, else a note to set up meal options); Tags `tags[]` (type and Enter, `COMMON_TAGS` chips); Dietary `dietary_restrictions` (pills None, Vegetarian, Vegan, Gluten free, Dairy free, Halal, Kosher, Nut allergy, Shellfish allergy, Other + free text, joined with commas); Plus one `plus_one` (checkbox) then `plus_one_name`, `plus_one_email`, `plus_one_meal_choice`, `plus_one_dietary_restrictions` (same pills); Address & notes `mailing_address` (textarea), `notes`. Writes through `createGuest` / `updateGuest` (`/api/my-guests`); new guests get `defaultEventResponses`; table assignment goes through `assignGuestToTableByName`.
**Integrations.** Email (Send invites, Email templates gallery, `/api/send-invites`), guest links endpoint, XLSX import.
**States.** Loading; empty ("No guests yet"); collaborator read-only; Ultra gating on send and copy links.
**Mobile (found).** Filters, search, rows, detail (email, phone, group, plus one, dietary, table), add and edit sheet (name, email, phone, group, reply, plus one name, dietary as free text under the wrong key `dietary_requirements`), remove.
**Gaps.** Owner fix 2 (per-event RSVP on the profile, everything the record holds, all editable); meal choices; tags; dietary pills under `dietary_restrictions`; plus-one email, meal, dietary; mailing address; notes; table assignment through the shared write path; Edit events; last sent and channel; song request and RSVP note; import; export; bulk actions; copy links; send invites.
**Status.** Done (phases 1 and 2). Owner fix 2: the profile shows the reply per wedding event (ceremony, reception and every custom event) with meal, plus-one names, the plus-one's own meal and the responded date from `event_responses[]`; contact rows open mail, the dialer and WhatsApp; group, tags, table, meal, dietary, plus-one details and status, postal address, notes, special requests; invitation history (sent date, channel, reminder, replied), the RSVP note and song request; gifts from this guest. Edit opens the full sheet with every `GuestForm` field (phone in E.164 with the same warning, dietary pills joined into `dietary_restrictions`, meal selects from `mealOptions` with the desktop's note when there are none, tags with the common suggestions, plus-one email, meal and dietary, address, notes); table assignment goes through `assignGuestToTableByName` / `unassignGuestFromTables`. Edit events is `SetEventsModal` as a sheet. The list adds the event filter, select mode with the bulk sheet (set category, set dietary, add tag, remove tag, set events, copy links, send, remove), import from CSV or XLSX through `parseGuestFile` with the duplicate-email skip, the CSV export with the desktop's columns, per-guest and bulk RSVP links through the guest-links endpoint, and the `?inviteAll=` confirm with the count and `?setEvents=` picker from Event details. `window.confirm` is gone from this screen.
**Goal 8.** One label set for every event filter, all events included: Invited, Attending, Declined, Awaiting reply, in a 2 by 2 grid of tappable stats (tap filters the list and turns the stat primary, tap again clears); yes, no, pending and waiting are gone from the stat row, the filters, the edit form's status select and the profile. `guestCounts.js` replicates the desktop's two inline computations (`eventStats` rows per event, `stats` attendees for all events with the guests-and-plus-ones line) and is the shared-extraction candidate; the invariant invited = attending + declined + awaiting holds by construction and `npm run test:guest-counts` proves it on the fixtures for every event. Two deliberate differences from the desktop's all-events card, both for the invariant: Invited counts attendees (a plus-one is invited when their host was, an attendee who has answered counts as invited), and a maybe is awaiting a reply. **From contacts** (`@capacitor-community/contacts`): the phone's contacts as a searchable multi-select, duplicates by email, phone digits or name marked Already a guest, chosen contacts created through the existing mutation (name, email, E.164 phone, mailing address), then Invite now into Send invites.
**Goal 9.** A failed read is a visible failure. `getMyGuestsWithRsvp` fails soft to `[]` by default (the desktop's choice: a tab that says "no guests yet" beats one that throws), which on the phone read as a couple with no guests; the mobile seam now asks for `strict`, so the screen shows its error state with a retry instead of an empty list. A failed read of the wedding counts as the list's failure too, because the wedding carries the events every filter and every invite acts on.

### Polls & games (`/Polls`) → `/m/plan/polls`

**Desktop.** Two sections. *Polls*: tabs Active polls / Create poll. Poll card: category and emoji (desktop only; the app never renders an emoji), title, options with live counts from `PollVote` (`aggregateVotes`) plus the snapshot count, Ava insight (generated once a poll passes five votes through `InvokeLLM`, written back to `polls[].avaInsight`), comments from `PollComment` (show or hide), End poll, Delete, Share (copies the page URL). Create: template grid (`POLL_TEMPLATES`, ten with default options) or Custom, then the editor: `title`, `options[]` (add, remove, at least two), `allowComments` toggle. Polls live on `WeddingDetails.polls[]` (`{ id, title, category, emoji, options[{id,label,votes}], allowComments, comments, isActive, createdAt, avaInsight, expiresAt }`). No edit after creation on desktop. *Games* (`GamesManager`): list of `Questionnaire` records with Closed marker; **New game**: `title`, `intro`, `questions[]` (text, type short_text or multiple_choice with `options[]`), recipients `recipient_mode` all / tag (`recipient_tags[]` from the guest list's tags) / individual (`recipient_guest_ids[]`); `is_active`. Game detail: responses per question (`POST /api/questionnaire-responses-for-owner`), Copy game links (`fetchGuestLinks` then `/games/<token>/<id>`), Print, Close or Reopen game, Delete (with confirm).
**Integrations.** Ava insight, questionnaire responses endpoint, guest links.
**States.** Loading; empty polls ("no polls yet"); empty games; "No answers yet".
**Mobile (found).** Polls with counts, create (title and options only), end. No templates, no comments toggle, no delete, no share, no insight, no comments, no games at all.
**Gaps.** Templates; allowComments; delete; share; insight and comments display; an edit sheet (owner asked for edit); the whole games section.
**Status.** Done (phases 1 and 2). Polls: the ten templates or a custom poll, title, options (add, remove, at least two), the comments toggle, category kept; cards show live counts (`aggregateVotes` over `PollVote` plus the snapshot), the Ava insight where the desktop wrote one, comments from `PollComment` (show or hide), End, Reopen, Edit (title, options with ids kept so votes stay attached, comments), Delete with a confirm, Share (the site's polls page through the share sheet). Games: `Questionnaire` records, New game with title, intro, questions (short answer or multiple choice with options), recipients (everyone, by tag from the guest list's tags, chosen guests through the picker), results per question from `/api/questionnaire-responses-for-owner`, Copy game links (`fetchGuestLinks`, `/games/<token>/<id>`), Close or Reopen, share the answers as text (the desktop prints), Delete. Emoji are never rendered; the desktop's poll insight is generated only there (it needs the LLM on a threshold) and shown here.

### Messages (`/Messages`) → `/m/plan/messages`

**Desktop.** Stats (total, unread, replied, unreplied). WhatsApp banner (`WhatsAppConnect`: the couple's own number stored locally, E.164), search by guest name or message, filter pills all / unread / replied / unreplied. Message card: name, email, date, mark read or unread (`GuestMessage.update`), Open in WhatsApp (`WhatsAppCompose`: template select RSVP reminder / Save the date / Event details / Thank you / Custom with merge tags, phone with country, opens `wa.me/<number>?text=`), Reply (textarea, `POST /api/send-guest-reply`, then `GuestMessage.update({ reply, replied, reply_sent_at })`), the reply shown once sent. WhatsApp QR (`WhatsAppQRCode`) for the couple's number. Ava.
**Mobile (found).** Filters, rows with swipe to mark read, thread with reply through the same endpoint, read on open.
**Gaps.** Search; stats; WhatsApp compose with templates; the couple's WhatsApp number.
**Status.** Done (phase 1): search by guest or message, the four filters, the count line (total, unread, replied), swipe to mark read, mark read or unread from the thread, reply through `/api/send-guest-reply`, the WhatsApp compose sheet with the desktop's five templates and merge variables (the guest's RSVP link from the guest-links endpoint, the invitation's names and date, the venues), opening `wa.me` in WhatsApp; the couple's own WhatsApp number in a settings sheet, kept on the device as `WhatsAppConnect` keeps it in the browser. The QR code for the couple's number stays on desktop (a printable artifact).

### Seating (`/Seating`) → `/m/plan/seating`

**Desktop.** Per-event tabs (reception plus any event with a layout; Add event tab). Stats (tables, seats, guests, assigned). Canvas: drag tables and venue assets, zoom, seat click to assign or unassign, export the layout as a PDF (html2canvas), import a layout. **Add table** modal: `name`, `shape` (round, rectangle), `capacity` (number). Rename table (inline, `propagateTableRename`), delete table, add venue asset (library), delete asset. Guest panel: search, "Attending only" filter, tap a guest to seat them at the selected table or seat (`assignGuestToSeat`), tap a seated guest to unseat (`unassignSeat`). **Ava seating** (`AISeatingGenerator`: `InvokeLLM` with a JSON schema, then `applyEventSeatingPlan`). All rows tagged with `event_id`.
**States.** Loading; no tables yet; everyone seated; collaborator read-only.
**Mobile (found).** Tables as cards with who sits where; move a guest through a sheet over `assignGuestToTableByName`; no tables can be created.
**Gaps.** Per-event switch; add table (name, shape, capacity); rename; change capacity; delete; unseat; attending-only filter and search of the unseated; Ava seating plan. The canvas, venue assets, layout export and import stay on desktop (drag surface).
**Status.** Done (phase 1): the per-event switcher (the reception, every event with a layout, Add event for the rest), the two stat cards, tables as cards with a sheet for name, shape, capacity, the seat list (tap an empty seat to seat someone, tap a seated person to unseat) and Delete (unseats everyone first); the Still to seat list from the same attendee pool Seating.jsx uses (`getGuestEventResponse` invited and not declined, plus-ones only where the event granted one, `resolveAttendees` ids) with search and Attending only; seat at the first free seat of a chosen table; Ava's seating plan (the same prompt, schema and token mapping as `AISeatingGenerator`, through `InvokeLLM`) reviewed as a list before `applyEventSeatingPlan`. Desktop-only, by design: the drag canvas, venue assets, the PDF export of the drawn layout, layout import.
**Goal 8.** One of the four offline-day screens: tables, who sits where, the guests and the events stay on the device and open read only with no signal; seating and unseating are guarded offline with a plain explanation.

### Wedding party (`/wedding-party`) → `/m/plan/wedding-party`

**Desktop.** One tab. Key roles: `maidOfHonour` and `bestMan` (guest search, `@` opens the guest list, or a typed name; stored `{ name, guestId }`), `keyRoleNotes` (textarea). Roles (`bridesmaids, groomsmen, flowerGirls, ringBearers, readers, ushers, other`), each a list of `{ name, guestId, phone, notes }` with add and remove. Saved whole on `WeddingDetails.weddingParty`. Ava.
**Mobile (found).** Roles as sections, add, edit, remove with name, phone, notes.
**Gaps.** Key roles; guest linking (pick from the guest list); key role notes.
**Status.** Done (phase 1): Key roles (maid of honor or best person, best man or best person) through the guest picker or a typed name, stored `{ name, guestId }` as `WeddingParty.jsx` stores them; key role notes auto-saved; every member sheet picks a guest from the list or takes a typed name, with phone and notes; roles, add, edit, remove as before.

### Send invites (`/SendInvites`) → `/m/plan/send-invites`

**Desktop.** `SendInvitesModal` as a page. Type chips (save_the_date, invite, reminder, update, thank_you_attending, thank_you_declined) each with a default filter. Step 1 Select guests: filter tabs (not yet invited, awaiting reply, attending, declined, all), search, tick guests. Step 2 Compose: `subject`, `body` with merge tags ([Guest name], [Wedding date], [Couple names], [RSVP link]), banner choice (none, wedding photo, venue photo), live email preview (`renderInvitationEmail`), Send a test to me (`isTest`). Step 3 Channel: email, WhatsApp, both. Step 4 Review and send: `fetchGuestLinks` (plus-one tokens), `POST /api/send-invites`, WhatsApp opens `wa.me` per guest, then `Guest.update({ invite_sent_at, invite_channel })` for invites and `{ reminder_sent_at }` for reminders. Ultra only.
**Mobile (found).** A hand-off screen.
**Gaps.** The whole flow.
**Status.** Done (phase 1): `/m/plan/send-invites`, a four-step flow with the same six types and their default filters, the five filter tabs, search, select all shown, the compose defaults from `getTypeComposeDefaults`, the merge tags, the banner choice from the wedding or venue photo, the rendered preview (`renderInvitationEmail`, the same function the server uses) in a sheet, Send a test to me, the three channels, the review with the no-email and no-phone counts, then `fetchGuestLinks` (plus-one tokens included), `POST /api/send-invites`, WhatsApp through `wa.me` in the system browser, and the same `Guest.update` tracking writes. Ultra only, with the same gate as Guests.jsx. Reached from the guest list's actions, a guest's profile, the bulk sheet, and the set-events toast.
**Goal 8.** Audited again against `SendInvitesModal.jsx`: at parity on the steps, types, filters, compose, banner, preview, test send, channels, endpoint and tracking writes. Beyond the desktop: groups (a category or a tag chooses everyone in it), Preview the invitation beside Preview the email (the studio's renderer), a confirmation sheet before anything sends with the exact count, the channel and the first names ("Send to 42 guests"; nothing sends on a single tap), and a result screen with each recipient's status (sent, skipped with why, failed) and Send again for the failed. Not offered, on either side: scheduling a send, which needs a server job. RSVP and site links are built from the public origin, never the shell's. The demo's send pauses and answers the endpoint's shape without sending. The owner's safe test procedure is in `MOBILE_APP.md`.

### Invitations (`/Invitations`) → `/m/plan/invitations`

**Desktop.** `InvitationBuilder` (create) and `InvitationStudio` (design canvas over the `Invitation` record).
**Mobile.** A hand-off screen with a note.
**Gaps.** The design canvas is a builder; it stays on desktop, as the brief allows for canvas tools. The list and form actions here are the builder's own fields, which are its canvas.
**Status.** Desktop-only by design (canvas). The hand-off names the invitation that exists and when it was last saved, and points to Send invites here.
**Goal 8.** The preview is the studio's own `InvitationPreviewWithNav`, imported directly and drawn off the same Invitation record: a 4:5 tile laid out at 390px and scaled, and a full-height sheet. View only; no element selection.

## Style & experience

### Moodboard (`/Moodboard`) → `/m/plan/moodboard`

**Desktop.** Stats. Board selector (`board_name`, four defaults plus create). Search by title or tag. Category filter (all, venue, decor, flowers, dress, cake, colors, invitations, photography, hairstyle, makeup, centerpieces, lighting, other). Upload files (multiple, `UploadFile`, then `MoodboardItem.create` with the file name as title), drag and drop. **Add item** modal: `title` (required), `image_url` (required), `source_url`, `category`, `tags` (comma separated), `notes`. Grid item: view large (title, category, notes, tags, View source), **Edit** (`title`, `tags`, `notes`), Delete. Export the board as a zip. Inspiration search (`InspirationSearch`: canned Unsplash results, add to board). Ava.
**Mobile (found).** Entity list with title, photo (camera, library or link), `url` (wrong key), category (six values), notes. No tags, no board, no source url key, no search, no export.
**Gaps.** `source_url`; `tags`; `board_name` and the board switcher; the full category list; search; category filter; export.
**Status.** Done (phase 1): boards (the four defaults plus create, as `BoardSelector` keeps them; pins carry `board_name`), search every board by title or tag, the category filter over the desktop's fourteen categories, grid or list, add with the camera, the library or a link, edit with `title`, `image_url`, `source_url`, `category`, `tags`, `notes`, the large view with the source link, remove with a confirm, and the export (the desktop's zip with `photos.csv` on the web through the same `photoExport` helpers; natively the app has no file store to hand a zip to, so the list of every original link goes through the share sheet, which is the desktop's own fallback above the size limit). Inspiration search (canned Unsplash results) stays on desktop.

### Styling (`/Styling`) → `/m/plan/styling`

**Desktop.** Tabs Attire, Flowers, Decorations. *Attire* (`AttirePanel`, `WeddingDetails.attire`): outfits `outfits[]` (`role` select from 15 roles, `roleCustom` when Other, `name`, `description`, `source`, `status` select Not started / Researching / Ordered / In alterations / Ready / Collected, `measurements`, `cost`, `photoUrl` via upload), tailor (`tailorVendorId` through `VendorContactSection`, `tailor.notes`), `fittings[]` (`date`, `who`, `notes`), `accessories[]` (`item`, `for`, `notes`?), `notes`. *Flowers* (`flowers`): Florist `vendorId` (`VendorContactSection` category flowers), `bouquet`, `bridesmaidBouquets`, `boutonnieres`, `additional`, `ceremony`, `centerpieces`, `notes`. *Decorations* (`decorations`): Decorator `vendorId`, `theme`, `colorScheme`, `ceremonyDecorations`, `receptionDecorations`, `lighting`, `linens`, `specialElements`, `notes`. Each section saves its key whole. Ava.
**Mobile (found).** Flowers and decorations text fields only.
**Gaps.** The attire tab entirely; the florist and decorator vendor pickers.
**Status.** Done (phase 1): Attire, Flowers and Decorations segments. Attire: outfits (`AttirePanel`'s fifteen roles with the custom role, name, description, source, the six statuses, measurements, cost, a photo through the camera, library or a link), the tailor as a vendor picker, tailor notes, fittings, accessories, attire notes, all under `WeddingDetails.attire`. Flowers and Decorations carry the florist and decorator vendor pickers (`VendorContactSection`: choose one of the couple's vendors or add one through the same Vendor form) and every text field.

### Beauty (`/Beauty`) → `/m/plan/beauty`

**Desktop.** Tabs Hair & makeup, Getting ready, Skincare timeline, Beauty team, Trial planning, Considerations. `WeddingDetails.beauty`: `hairArtistVendorId`, `makeupArtistVendorId` (`VendorContactSection` beauty), `styleNotes`, `hairInspo`; `gettingReadyPeople[]` (`name`, `role`, `service` hair / makeup / both); `skincareTimeline[]` (`timeframe`, `treatment`, `notes`, `done`); `trials[]` (**Add trial** modal: `date`, `artist`, `lookDescription`, `notes`, `rating` 1 to 5); `VendorRosterSection` for beauty vendors. Stats. Ava.
**Mobile (found).** `styleNotes` and `hairInspo`.
**Gaps.** Vendor pickers; people in the chair; skincare timeline; trials; the roster.
**Status.** Done (phase 1): Hair & makeup (hair and makeup artists as vendor pickers, the look, the inspiration, the beauty team roster from My vendors), Getting ready (people in the chair with name, role, hair / makeup / both), Skincare (milestones with when, treatment, notes, done), Trials (date, artist, the look, notes, a 1 to 5 rating stored as a number).

### Food & beverage (`/FoodBeverage`) → `/m/plan/food`

**Desktop.** Tabs Catering, Menu, Bar & drinks, Notes, Considerations. `foodBeverage`: caterer `vendorId` (`VendorContactSection` catering), `serviceStyle` (plated, buffet, cocktail, stations, family_style), `dietaryRequirements`, `weddingCakeDetails`, `barType` (full_bar, beer_wine, dry, byo), `signatureCocktail`, `barNotes`, `additionalNotes`. Top-level `menuItems[]` (`name`, `description`) and **Guest meal options** `mealOptions[]` (`{ id, label }`, Ultra only; a gate card otherwise). Saves scoped keys. Ava.
**Mobile (found).** Service style (drifted values), dietary, cake, bar type (drifted values), signature drink, bar notes, notes.
**Gaps.** Value drift on two selects; caterer picker; menu items; meal options with the Ultra gate.
**Status.** Done (phase 1): Catering (caterer vendor picker, service style with the desktop's five values, dietary overview), Menu (menu items with name and description on the top-level `menuItems`, the cake, guest meal options on the top-level `mealOptions` behind the same `canAccessUltra` gate with the desktop's gate card), Bar & drinks (bar type with the desktop's four values, signature cocktail, bar notes), Notes.

### Music (`/Music`) → `/m/plan/music`

**Desktop.** Stats. Share playlist (`SharePlaylist`: the `/w/<slug>/music` link and a QR). Settings modal (`music.guestRequestsEnabled`, `music.requestsRequireApproval`, `music.limitOnePerGuest`, `music.requestMessage`). Tabs Playlist, Vendor, Notes, Considerations. *Playlist*: paste a playlist link (Spotify, Apple Music, YouTube; `parsePlaylistLink` labels the source; saved as `music.playlists[0].playlistUrl`), song requests with filter pills all / pending / approved / declined / on the playlist, Approve and Decline (`POST /api/song-request-review`, actions approve, add, decline), share section. *Vendor*: `VendorRosterSection` music. *Notes*: `music.notes`. Ava. The `Music` entity is counted, not edited, on desktop.
**Mobile (found).** Playlist over the Music entity (add, edit, delete), requests with Add and Decline, the playlist link shown.
**Gaps.** Request filter pills and the approve action; the playlist link editable; settings; share; notes; vendor roster.
**Status.** Done (phase 1): Requests with the five filters and counts, Approve, Add to playlist and Decline through `/api/song-request-review` (the same three actions the endpoint accepts); Playlist with the editable link saved as `music.playlists[0].playlistUrl`, the source label from `parsePlaylistLink`, Open on Spotify / Apple Music / YouTube, and the Music entity tracks (add, edit, delete) kept as the phone's own editor; Settings (`guestRequestsEnabled`, `requestsRequireApproval`, `limitOnePerGuest`, `requestMessage` with the desktop default); Share (the guest suite's music page: copy and the native share sheet; the QR was removed by owner decision, goal 6); Notes (`music.notes`, auto-saved); Vendor (into My vendors filtered to music).

### Photography (`/Photography`) → `/m/plan/photography`

**Desktop.** Tabs Photographers, Videographers, Shot list, Timeline, Considerations. `photography`: photographer `photographerVendorId` and videographer `videographerVendorId` (`VendorContactSection`), `photographyStyle`, `photographyPackage`, `photographyHours`, `editingStyle`, `editedPhotosCount`, `photoDeliveryTimeline`, `deliveryFormat`, shot list (`gettingReadyShots`, `ceremonyShots`, `familyPortraits`, `receptionShots`, `mustHaveShots`), `videographyPackage`, `videoStyle`, `videoLength`, `videoDeliveryTimeline`; `VendorRosterSection` for photography and videography. Ava.
**Mobile (found).** The text fields.
**Gaps.** Vendor pickers.
**Status.** Done (phase 1): Photographers (vendor picker, style, package, hours, the roster of photography vendors, delivery and editing), Videographers (vendor picker, package, style, length, delivery, the videography roster), Shot list (the five shot fields).

### Vows & speeches (`/VowsSpeeches`) → `/m/plan/vows`

**Desktop.** Stats. List by tab (vows, speeches). **Editor** (`VowSpeechEditor`: `title` required, `author` required, `type` vow / speech, `content`, `notes`). Reading pane: Lock (PIN 4 to 6 digits, `POST /api/vow-pin`, `pin_hash` on the record; locked items show a PIN pane; Remove lock), Print, Edit, Delete. **Ava assistant** (`AIVowsSpeechesAssistant`: generate from style, length, tone, humor, partner name, years, story, memory, hopes; refine shorter / longer / warmer; apply into the editor). `VowSpeech.create/update/delete`.
**Mobile (found).** Entity list with title, type, author, content, notes.
**Gaps.** Lock and unlock; print or share; the Ava writing assistant.
**Status.** Done (phase 1): Vows and Speeches segments; a reader with the words, private notes, Lock with a 4 to 6 digit PIN, Unlock and Remove the lock through the same `vowPinLock` helpers and `/api/vow-pin` (locked words hidden until unlocked, as on desktop), Share as text through the share sheet (the desktop prints), Edit and Delete; the editor with `VowSpeechEditor`'s fields (title and author required); Ava's assistant with the same generate inputs (partner, style, length, tone, humor, years, story, memory, hopes) and the same six improvements, applied into a new draft.

### Guest gifts (`/wedding-favours`) → `/m/plan/favours`

**Desktop.** Tabs Overview, Favour items, Packaging & display, Notes. `weddingFavours`: `concept`, `supplierName`, `totalBudget`, `orderedStatus` (not_started, researching, ordered, received, assembled), `favourItems[]` (`name`, `quantity`, `costPerUnit`, `notes`), `packagingType`, `packagingSupplier`, `personalised`, `personalisationDetails`, `tagsNotes`, `displayNotes`, `additionalNotes`. "Search on Google" links beside supplier fields. Ava.
**Mobile (found).** Fields except the items list; status values drifted (not_ordered).
**Gaps.** Favour items list; status values; Google search link.
**Status.** Done (phase 1): Overview (concept and supplier with the Google search link, budget, the five statuses), Items (`favourItems` with name, quantity, cost per unit, notes), Packaging (type, supplier with the search link, personalized and its details, tags, display notes), Notes.

## Vendors

### My vendors (`/Vendors`) → `/m/plan/vendors`

**Desktop.** Stats. Search, status filter, category filter, sortable list, favourite star (`is_favourite`). **Add vendor / Edit vendor** modal (`VendorForm`): `name` required, `category` (14), `status` (6), `contact_person`, `phone`, `email`, `website`, `address`, `price_range` ($ to $$$$), `rating`, `quoted_price`, `contract_date`, `payment_schedule`, `notes`, `contract_signed`, `deposit_paid`, `deposit_amount`; photography and videography add `instagram`, `reviews_count`, `starting_price`, `package_selected`, `hours_booked`, `booking_date`, `start_time`, `end_time`, `meeting_date`, `travel_fee`, `style[]` (8 pills), `portfolio_url`, `equipment`, `services_offered` (comma list), `sample_work` (one URL per line), `delivery_timeline`, `image_count`, `video_length`, `editing_style`, `cancellation_policy`, `special_requests`, `backup_equipment`, `second_shooter`. **Vendor detail** (`VendorDetailPanel`): Communications (`VendorLog` type email / call / meeting / note with `subject`, `body`), Documents (`VendorLog` type document: `document_type` contract / invoice / quote / receipt / other, label, file through `UploadFile`), Tasks (`VendorTask`: `title`, `due_date`, `priority`, toggle `completed`, delete). Delete vendor. Ava.
**Mobile (found).** Filters (4), list, add and edit with 13 fields, call action.
**Gaps.** Search; category filter; favourite; the missing base fields (address, price range, rating, contract date, payment schedule); the photo and video fields; communications, documents and tasks.
**Status.** Done (phase 1): the stat line, search, the desktop's status and category filters, cards or a grid, the favorite star, add and edit with every `VendorForm` field (the photo and video fields appear for those two categories, numbers and the two lists coerced as `handleSubmit` does), and a vendor screen at `/m/plan/vendors/:id` with About (every recorded field, call, email, website, Open in Maps, delete), Communications (`VendorLog` email / call / meeting / note, add and delete), Documents (`VendorLog` type document with the five document types and an upload through the same `UploadFile` endpoint, open, delete), Tasks (`VendorTask` with title, due date, priority, tick, delete).
**Goal 8.** One of the four offline-day screens: the vendor list and each vendor's contact stay on the device and open read only with no signal; edits, logs and favorites are guarded offline.

### Marketplace (`/VendorMarketplace`) → `/m/plan/marketplace`

**Desktop.** Search text, category chips (`CATEGORIES`), location text, Use my location (device coordinates), Use event location (the ceremony address), Online services (drops the location for remote-plausible categories), 4+ stars filter, sort (Relevance, Rating, Reviews). Auto search near the venue on load. Result card (`VendorCard`): photo (`/api/places-photo`), name, category from Google types, rating and review count, price band, address, View profile, Add to my vendors. **Profile** (`VendorProfileModal`: `GET /api/place-details`: large photo, rating, reviews, website, phone, maps; Add). Save through `saveVendorFromPlaces(vendor, details)`; already-saved ids from `getSavedPlaceIds`. Ava.
**Mobile (found).** Category and location search; results with name, rating, address; add.
**Gaps.** Free text; use my location; use event location; online services; rating filter; sort; photos; the profile sheet with reviews and contact; auto search near the venue.
**Status.** Done (phase 1): free text, the desktop's category chips and their query strings, location text, Use my location, Use event location (the ceremony address, searched on open as the desktop does), Online services for the four remote-plausible categories, the 4 stars and up filter, sort by relevance, rating or reviews, cards with Google's photo, category from its types, rating and review count, price band and address, a profile sheet from place details (photo, rating, reviews, website, phone, hours, Open in Maps) and Add to my vendors through `saveVendorFromPlaces` with the already-saved check.

## On the day

### Ceremony details (`/ceremony-details`) → `/m/plan/ceremony`

**Desktop.** Tabs Celebrant, Ceremony, Legal, Notes. `celebrant` (encrypted): `name`, `title`, `type`, `phone`, `email`, `notes`; top-level `ceremonyType`, `ceremonyMusic`, `ceremonyReadings`, `vowsNotes`, `orderOfServiceNotes`, `ringBearerDetails`, `flowerGirlDetails`, `additionalNotes`; `license` (encrypted): `issuingOffice`, `applicationDate`, `issueDate`, `expiryDate`, `licenseNumber`, `witnessesRequired`, `notes`. Search on Google beside the celebrant name. Ava.
**Mobile (found).** All fields, the encrypted split honoured.
**Gaps.** The Google search link.
**Status.** Done (phase 1): four segments as the desktop's tabs; the celebrant name carries the Google search link; the encrypted split (celebrant and license through the encrypted PUT) is unchanged.

### Getting here, formerly Transport (`/transport`) → `/m/plan/transport`

**Naming (PR #822, owner ruling 2026-09-21).** The desktop calls this section "Getting here" everywhere now, as the live guest suite does; the mobile tile, screen title and Site tab row say "Getting here" too. Keys, routes and the `transportation` category value are unchanged. *Completed 2026-09-23: the category LABEL was the part left behind. #822 settled it at "Transport" — the word `budgetCategories.js`, `Vendors.jsx` and `scheduleEvents.js` already used for the stored `transportation` key — and corrected the four web forms that had drifted to "Transportation". `vendorFields.js`, `ScheduleScreen.jsx` and `BudgetForecast.jsx` carried the same drift and now match.*

**Desktop.** Tabs Overview, Shuttles, Parking, Public transport, Rideshare, Notes. `transport`: `recommendedMode` (rideshare, drive, public, shuttle, walk, hire), `coupleNote`; `shuttles[]` (`name`, `type` coach / shuttle / minibus / transfer / limo, `pickupLocation`, `pickupTime`, `returnTime`, `dropoffLocation`, `capacity`, `contact`, `notes`); `parking` (`venueParking`, `venueParkingNotes`, `nearbyCarParks[]` with `name`, `address`, `distance`, `cost`, `streetParking`, `accessibilityNotes`); `publicTransport` (`generalNotes`, `routes[]` with `type` train / bus / tram / metro / ferry, `notes`, `totalTime`); `rideshare` (`pickupLocation`, `dropoffLocation`, `lateNightNote`); `freeTextNotes`. Ava.
**Mobile (found).** Recommended mode as free text; parking with `nearbyCarParks` as a textarea (wrong shape); shuttles list with type as text.
**Gaps.** Mode select; shuttle type select; car parks as a list; public transport routes; rideshare.
**Status.** Done (phase 1): Overview (recommended mode with the desktop's six values, note for the wedding party), Shuttles (name, type with the five values, pickups, drop-offs, times, seats, contact, notes), Parking (venue parking switch and notes, street parking, accessibility parking, nearby car parks as a list with name, address, distance, cost), Public transport (general notes, routes with the five types, summary and travel time), Rideshare (pickup, drop-off, late-night note), Notes.

### Stay, formerly Accommodation (`/accommodation`) → `/m/plan/accommodation`

**Naming (PR #822, owner ruling 2026-09-21).** The desktop calls this section "Stay" everywhere now, as the live guest suite does; the mobile tile, screen title and Site tab row say "Stay" too. Keys, routes and the `accommodation` category value are unchanged. *Completed 2026-09-23: the Notes field said "Additional accommodation notes"; `Accommodation.jsx` now words it "Additional notes on where to stay" and this screen matches, placeholder included. Ava's Stay page took that page's `AvaModal` system prompt and quick actions verbatim.*

**Desktop.** Tabs Overview, Properties, Notes. `accommodation`: `checkInDate`, `checkOutDate`, `coupleNote`, `additionalNotes`; `manualProperties[]` (**Add property** modal: `photoUrl`, `name` with a Google search link, `address`, `website`, `phone`, `bookingCode`, `coupleNote`, `tags[]` from ten options, flags `isMainGuestHotel`, `isClosestToVenue`, `isBestValue`, `isPinned`), edit, delete. Ava.
**Mobile (found).** Dates and notes; places with name, address, url (wrong key), phone, priceRange (not a desktop field), notes.
**Gaps.** The property sheet's real fields: photo, website key, booking code, note to guests, tags, flags; pinned first.
**Status.** Done (phase 1): Overview (check in, check out, note to guests), Properties (the desktop's property sheet: photo, name with the search link, address, website, phone, booking code, note to guests, the ten tags, the four flags), Notes.

### Emergency contact (`/emergency-contact`) → `/m/plan/emergency`

**Desktop.** Tabs Contacts, Vendors, Notes. `emergencyContacts` (encrypted): `primary`, `backup` (`name`, `role`, `phone`), `venue` (`name`, `phone`), `otherNotes`; `dayVendorContacts[]` (encrypted, `name`, `role`, `phone`). Ava.
**Mobile (found).** Primary, backup, venue, notes.
**Gaps.** Key vendors on the day.
**Status.** Done (phase 1): Contacts, Vendors (`dayVendorContacts`, encrypted, name, role, phone), Notes.
**Goal 8.** One of the four offline-day screens: the contacts stay on the device (the wedding details, cached for this page only) and open read only with no signal; saving is guarded offline.

## Finances

### Budget (`/Budget`) → `/m/plan/budget`

**Desktop.** Stats (committed, spent, remaining, budget used). Tabs Overview, Forecasting, Expenses, Considerations. *Overview*: **Budget planner** (`total`, one amount per category; `PUT /api/my-wedding-details { field: 'budget' }`; export the plan as CSV), `BudgetChart`. *Forecasting*: chart against the recommended split, flags, Ava insights (`InvokeLLM`). *Expenses*: search, list (paid or unpaid pill, edit, delete), **Add expense / Edit expense** modal (`category`, `item_name`, `budgeted_amount`, `actual_amount`, `vendor`, `paid`, `payment_date`, `notes`), export CSV. Ava.
**Mobile (found).** Totals, categories, category detail with expenses, add and edit expense with every field, mark paid.
**Gaps.** Planner (total and per-category); delete an expense; search; forecasting insights; the two exports.
**Status.** Done (phase 1): Overview (spent, the committed total, paid, still to pay, next payment, categories, payments due, the Budget plan sheet with the total and one amount per category saved through `PUT /api/my-wedding-details { field: 'budget' }` as the planner does, and the plan's CSV export), Forecasting (the desktop's benchmark flags and saving tips, budget used, each category against the usual split, and Ava's insights through the same prompt and JSON schema; the chart itself is the list), Expenses (search, every expense with the paid pill, edit and delete from the sheet, the expenses CSV export). The category screen adds delete too.
**Goal 8.** Forecasting is `BudgetForecasting.jsx` in full (`BudgetForecast.jsx`): the remaining-balance projection graph (the same points, SVG on the tokens), the health score with Update my health and a running bar over about thirty seconds, top risks and savings actions from the same prompt and schema, budget used, risk flags with budgeted, spent and benchmark figures, cost-saving opportunities with the saving, every category against the usual split. Ask again re-runs; a failure says so and offers it again. The demo's Ava answers the analysis with a realistic result after a realistic wait (it fell through to a stub before), and the itinerary planner likewise.

### Registry (`/Registry`, `/GuestSuiteRegistry`) → `/m/plan/registry`

**Desktop.** Stats. Share (`ShareRegistryModal`: copy link, email, SMS, Facebook, WhatsApp). Tabs Overview (`ConsolidatedRegistryView`), Platforms (`RegistryItem`: `store_name`, `url`, `image_url` logo, `description`), Products (`RegistryProduct`: `name`, `price`, `category` kitchen / home_decor / bedding / bathroom / outdoor / electronics / other, `registry_platform` Zola / MyRegistry / The Knot / Amazon / Target / Williams Sonoma / Crate & Barrel / Other, `quantity_requested`, `priority`, `product_url`, `image_url`, `description`, `notes`; mark purchased with `guest_name`, `quantity`, `message` appended to `purchased_by[]` and `quantity_purchased`), Cash funds (`CustomGift`: `title`, `category` honeymoon / home_fund / charity / experience / custom, `requested_amount`, `image_url`, `payment_link_url`, `description`), Received gifts (`ReceivedGift`: `item_name`, giver from the guest list `giver_guest_id` / `giver_name` / `giver_email`, `delivery_status` expected / received / not_received, `received_date`, `thank_you_sent` (+ `thank_you_date`), `thank_you_note` with Ava generate, `estimated_value`, `category` physical / cash / experience / digital / other, `notes`; search; toggle thanked). `GuestSuiteRegistry` is a read-only mirror with a link here. Ava.
**Mobile (found).** Four lists with add, edit, delete; value drift on fund category, delivery status, and missing product category and platform; no purchases, no guest link, no note generation, no share.
**Gaps.** As listed.
**Status.** Done (phase 1): Overview (platforms, products, the bought-so-far completion, the consolidated view, received summary, Share by copy and the native share sheet with the desktop's message (email, SMS, WhatsApp and Facebook rows removed by owner decision, goal 6; see Design studio)), Platforms with `RegistryForm`'s fields, Products with `RegistryProductForm`'s fields (the seven categories, the eight platforms, quantity, priority, links, photo, description, private notes) and the mark-purchased sheet (bought by, how many, message appended to `purchased_by[]`, `quantity_purchased`), Cash funds with `CustomGiftForm`'s fields and the desktop's five categories, Received gifts with search, the giver from the guest list (`giver_guest_id`, `giver_name`, `giver_email`), the three delivery statuses, received date, the five categories, value, thank you sent with its date, the thank-you note with Ava writing it through the same prompt, notes. The drift in fund categories and delivery statuses is corrected.

## Guest suite

### Design studio (`/studio`) → `/m/site`

**Desktop.** The studio hub, website builder, universe picker, Ava studio. Publish state, share.
**Mobile.** Site preview, live status, view, share, rows into the guest suite editors. Builder and Ava studio hand off.
**Gaps.** The builder is a canvas; the universe picker is a list (parity for that list is a builder action inside the studio and stays with it).
**Status.** Desktop-only by design (canvas). The Guest suite tab carries StudioShareTab's publish switch (`websiteEnabled`, gated on the slug), password protection, View guest suite and Share link (the native share sheet).
**Goal 8.** The tab's tile and its full preview sheet render `RealWebsitePreview`, the builder's own renderer, imported directly: same universe, fonts (the self-hosted loader), photos, sections, sample content and page picker (as pills). View only. A slim note under the title says editing and Ava's Studio happen on a laptop; closed once, it stays closed. The Edit on a laptop row remains at the bottom.

**Owner decisions (goal 6, 2026-09-22), not gaps.** StudioShareTab's **QR code** and **Email your guests** are deliberately absent from the app and must not come back in a parity sweep even while the desktop keeps them: guests are contacted only through Send invites, by email or WhatsApp, and the guest suite link travels by the native share sheet. The same ruling removed the QR from the Music share sheet and the email, text, WhatsApp and Facebook rows from the Registry share sheet (both keep Copy the link and Share link). Replies to a guest's own message in Messages stay: a reply in a conversation the guest opened is not outreach.

### Schedule (`/GuestSuiteSchedule`) → `/m/plan/suite-schedule`

**Desktop.** A read-only timeline of the Schedule records as guests see them, with links to edit in Schedule.
**Mobile.** The same.
**Status.** Parity.

### Q&A (`/QandA`) → `/m/plan/qna`

**Desktop.** Add a question and answer; each row removable. Ava suggests questions.
**Mobile.** Add, edit, remove.
**Status.** Done. Add, edit, remove, and Ava suggests four unanswered questions with answers (QandA.jsx's voice line through `InvokeLLM`), each added with one tap.

### Registry (`/GuestSuiteRegistry`)

Mirror of Registry. **Status.** Parity through the registry screen.

### Stay, formerly Accommodation (`/GuestSuiteAccommodation`) → `/m/plan/suite-accommodation`

**Naming (PR #822, owner ruling 2026-09-21).** The desktop calls this section "Stay" everywhere now, as the live guest suite does; the mobile tile, screen title and Site tab row say "Stay" too. Keys, routes and the `guestSuiteAccommodation` category value are unchanged. *Completed 2026-09-23: the first pass took the tiles, titles and rows and left the strings #822 changed elsewhere. Read off `origin/main` and matched exactly — the Stay page's notes field ("Additional notes on where to stay", with Accommodation.jsx's placeholder), Ava's Stay page (system prompt and two quick actions, verbatim from its `AvaModal`), and the guest-suite recommendation prompt ("Recommend 4 places to stay", as `GuestSuiteAccommodation.jsx` now asks; the preview fixture matches that prompt by phrase and follows it).*

**Desktop.** Google Places search (with Use my location), select a result, `note`, `badge` (Closest to venue, Best value, Where most guests are staying, Luxury pick, Budget friendly), Add (fetches `website` from place details; stores `place_id, name, address, rating, price_level, photo_url, maps_url, website_url, note, badge`); Add manually (`name`, `address`, `url`, `badge`, `note`); cards with photo, badge, remove. Ava recommends four places (`InvokeLLM`, each resolved through Places search, add one by one). Saved on `guestSuiteAccommodation.places`.
**Mobile (found).** Places by hand (name, address, note, website); no search, no photo, no badge.
**Gaps.** Places search with photo, badge, Ava recommendations.
**Status.** Built in phase 1 with `PlaceField` and the badge; Ava recommendations.

### Getting here, formerly Transport (`/GuestSuiteTransport`) → `/m/plan/suite-transport`

**Naming (PR #822, owner ruling 2026-09-21).** The desktop calls this section "Getting here" everywhere now, as the live guest suite does; the mobile tile, screen title and Site tab row say "Getting here" too. Keys, routes and the `guestSuiteTransport` category value are unchanged. *Completed 2026-09-23: #822 also settled the spend, vendor and schedule CATEGORY label at "Transport" — the stored key `transportation` stays, and a spend category is not a page a guest reads. `vendorFields.js`, `ScheduleScreen.jsx` and `BudgetForecast.jsx` carried the same "Transportation" drift the web corrected in VendorForm, ScheduleForm, VendorSearch and BudgetForecasting, and now match. The `bus_station` and `car_rental` type labels are place types, not the section, and are unchanged.*

**Desktop.** As accommodation, with `type` (airport, train_station, bus_station, car_rental, ferry, other) instead of a badge; plus `notes[]` (`title`, `text`) add, edit, remove; Ava recommends places and notes. Saved on `guestSuiteTransport.{places, notes}`.
**Mobile (found).** Places by hand; no notes.
**Gaps.** Search, type, notes, Ava.
**Status.** Done (phase 1): as accommodation, with the six place types instead of a badge, the Notes segment (add, edit, remove `{ title, text }`), and Ava's transport advice through the same prompt (places added through Places search, advice added as notes).

### Experience guide (`/GuestSuiteExperience`) → `/m/plan/experience`

**Desktop.** `ExperienceGuideTab`. Tabs Places (per category: Eat, Coffee, Hidden gems, Fine dining, Outdoors, Drink, Do, Wellness, Day trips, Shopping, The wedding weekend; Places search, `note`, Couple's pick switch, manual add; cards with photo, remove, toggle couple's pick; saved on `experienceGuide.categories[key].places[]` with `couplePicks[]` mirrored), Itinerary (`days` 1 / 3 / 5, day cards with morning, afternoon, evening; add an activity from a saved place or custom text with a note; remove; Ava generates the itinerary; Save), Publish (`heroPhotoUrl`, `editorialIntro` with Ava generate, `vibes[]` from 15, `published` switch).
**Mobile (found).** Couple's picks by hand only.
**Gaps.** Everything above.
**Status.** Done. Places, Itinerary and Publish segments with Ava itinerary and intro prompts; couple picks mirror to the site.

### Good to know (`/GuestSuitePolicies`) → `/m/plan/good-to-know`

**Desktop.** `weddingPolicies`: photography (`unplugged`, `message`, `display`), socialMedia (`noCeremony`, `tagUs`, `hashtag`, `message`, `display`), children (`option` all / wedding_party / adults_only, `message`, `display`), dietary (`description`, `contactName`, `contactEmail`, `display`), gifts (`option` welcome / no_gifts / charity / wishing_well, `registryUrl`, `message`, `display`), dressCode (`guidance`, `weatherNote`, `display`; the event dress codes shown from event details), lateArrival (`policy`, `display`), other (`text`, `display`), stylingQuestionnaire (`enabled`: Personal stylist or Quick guide). `guestExperience`: `backgroundMusic` (`enabled`, upload or curated track), `showAttending`, `showCircle`. Save button. Ava.
**Mobile (found).** A switch and a note per key under the wrong keys (`enabled`, `message` for every policy).
**Gaps.** The real shape and every field; styling quiz mode; guest experience.
**Status.** Done. Every policy on the desktop shape (own fields plus display), the styling quiz mode, background music by upload, show attending and the circle; weddingPolicies and guestExperienceSettings save together.
**Mirrored: PR #831 (2026-09-22), the unplugged rule.** The couple's photo note now REPLACES the platform's "We are having an unplugged ceremony…" sentence rather than stacking under it, so the guest site says the ask once. The mobile row used to report the toggle — "Unplugged ceremony" whenever it was on, whatever the note said, and never the couple's own words. It now reports the line itself, through the same `linesFor('photography', …)` the guest site and both web editors call; no copy of the rule lives in `src/mobile/`. The Photography sheet gained the same "On the site" block the dashboard's `GuestSuitePolicies.jsx` and the studio's `PoliciesTab.jsx` carry, in the same words, so a couple whose note is not about phones can see the unplugged sentence go. Display only; nothing is saved.

### Guest polls (`/GuestSuitePolls`)

Read-only mirror of polls with stats and a link to Polls. **Status.** Parity through the polls screen.

## Extras

### Honeymoon (`/honeymoon`) → `/m/plan/honeymoon`

**Desktop.** Tabs Planning, Travel, Accommodation, Notes. `honeymoonDetails`: `destination` (Google search link), `departureDate`, `returnDate`, `budget`, `departureAirport`, `flightReference`, `travelInsurance`, `travelInsuranceDetails`, `hotelName`, `checkInDate`, `checkOutDate`, `bookingReference`, `confirmationNumber`, `activitiesPlanned`, `packingNotes`, `notes`. Ava.
**Mobile (found).** All but `confirmationNumber`.
**Status.** Done (phase 1): every field including the confirmation number, the destination and hotel with the Google search link, in the desktop's four tabs.

### Considerations (`/Considerations`)

**Desktop.** A long read computed inside the page from the couple's profile; nothing exported.
**Mobile.** Hand-off. **Status.** Desktop-only; listed under "Needs a decision" in MOBILE_APP.md as a shared-extraction candidate.

## Account (`/account`) → `/m/account`

**Desktop.** Profile name (`base44.auth.updateMe`), currency (`CurrencyModal`), temperature unit, email notification preferences (`notification_prefs`), plan and billing, change password, delete account, collaborators.
**Mobile.** Rows; account details hand off to desktop; purchases hidden natively.
**Gaps.** Name, currency, temperature unit and the email preferences are editable on desktop and hand off here.
**Status.** Done. An Account details sheet (name through `updateMe`, currency through CurrencyContext, temperature unit) and an Email notifications sheet on `notification_prefs` with the desktop's four switches and in-app-only dimming. Password change and account deletion stay on the desktop page (auth surface, locked by CLAUDE.md). Plan and billing hand off outside the native shell only.

---

## Field-name drift found and corrected

| Where | Mobile had | Desktop writes |
|---|---|---|
| Guest dietary | `dietary_requirements` | `dietary_restrictions` |
| Task priority | `High` / `Medium` / `Low` | `high` / `medium` / `low` |
| Schedule category | ceremony, reception, planning, after | the nine `ScheduleForm` values |
| Food service style | `food_stations` | `stations` |
| Bar type | open, limited, cash, byo | full_bar, beer_wine, dry, byo |
| Guest gifts status | `not_ordered` | `not_started`, plus `assembled` |
| Transport car parks | one textarea | `nearbyCarParks[]` objects |
| Accommodation property | `url`, `priceRange` | `website`, `bookingCode`, `tags[]`, four flags, `photoUrl` |
| Moodboard source | `url` | `source_url`; `tags[]`, `board_name` |
| Cash fund category | home, other | home_fund, custom |
| Received gift status | received, shipping, pending | expected, received, not_received |
| Good to know | `enabled` + `message` per key | `display` plus each policy's own fields |
| Poll | no `allowComments`, `category`, `emoji` | the full shape |
| Guest gifts items | `weddingFavours.favourItems` | top-level `favourItems` |
| Guest gifts amounts | numbers | free text (`$3.50`) |
| Celebrant type | celebrant, religious, friend, registry | religious, civil, humanist, celebrant |
| Attire accessories | `item`, `for`, `notes` | `item`, `forWhom`, `done` |
| Shuttle times and capacity | HH:MM and a number | free text |
| Music track category | cocktail, first_dance, party, last_song | ceremony, cocktail_hour, dinner, dancing, special_moments, general |
| Music track source | manual | spotify (the create default; the enum is spotify, apple, youtube) |
| Vendor meeting date | date | datetime-local |
| To-do cleared notes or date | undefined (dropped) | null |
| Bulk dietary None | `''` | null |
| Poll emoji | `''` | the template's, rendered on the couple's site |
| Q&A item | no `id` | `id: Date.now()` |
| Music guest requests, undefined | on | off |

---

## Phase 4: the independent check (2026-09-22)

A fresh subagent that had not seen this session was given only this file, the desktop source and the mobile source, and asked to verify every claim feature by feature. It reported 107 gaps with line cites on both sides (14 spot-verified twice), ranging from data written under the wrong key to missing list actions. Every one is now closed except the three below, which are decisions rather than gaps. The confirmed-at-parity list from that check: Beauty, Food & beverage, Photography, Vows & speeches, Emergency contact, Honeymoon, guest suite Transport, Account.

**Closed in the three fix commits** (batch 1 to 3): the field drifts in the table above; polls counting live votes per poll and skipping test votes; game answers reading `answer_text || selected_option`, option removal and the who-has-answered tracker; the custom event sheet no longer resetting on the timing pill; the address error; Ava suggestions and ids on Q&A; background music hidden as on desktop; itinerary items carrying maps, website and photo; price level and the hotel prefix on place searches; guests: the Ultra gate on copy links through `copyFromPromise`, the not-invited filter, bulk dietary Other and null, a phone country with a non-blocking warning, plus-one details kept, imports without `event_responses` and with a country and per-row phone warnings, set events then send, the email templates gallery, sort, quick add, the wedding-party role on rows and the profile, the title-case suggestion with persisted dismissals, search over the active filter, the token backfill, stats with plus-ones and per event; send invites listing recipients, showing phone and badges, previewing the WhatsApp text and opening one chat at a time with per-guest tracking; messages resolving WhatsApp by `guest_id`, sending `Invitation.couple_names`, marking all read on load, counting unreplied, with country pickers; schedule search, location filter, sortable columns, stat tiles, run sheet edit, delete, move and add-a-moment, the unplaceable notice; the to-do board view; seating panel filters with dietary search, seated rows naming their table, the attendee whitelist, capacity guarded by taken seats, the six stats; wedding party notes and stats; the first-invitation form and copy link; moodboard multi-upload and the union export; vendor pickers editing in place and clearing with null; vendors favorites, sort, statuses including meeting scheduled, meeting date shown, websites as any string, counts not sums; marketplace category, venue-name fallback, Listed as; budget notes, category pills, Remaining as committed minus spent, the desktop's CSV columns and plan export; registry filters, one-tap thanked, total value, https-only payment links, required amounts, Facebook; the transport roster, search link and free-text fields; property description; suite schedule descriptions and categories; Site password protection, QR code and Email your guests; Home's model briefing, This week, the six numbers and the failure banner; the page-scoped Ava (each desktop page's voice line and quick actions ride into the shared pod, `src/mobile/features/avaPages.generated.js`); the Considerations tab as a sheet on the eight pages that have it.

**Decisions, not gaps:**
- **Collaborator mode on Home.** The app signs in as the couple; a collaborator session (`/api/collaborator-data`) is desktop-only, as this file already states at the top. Re-confirmed as out of scope by the owner on 2026-09-22 while comparing how each side picks the current wedding: the desktop enters a collaboration only through a `?collabOwner=<ownerUserId>` param (`src/lib/collaboratorContext.jsx`) and `/m` has no entry point for it, so the app is owner-only on purpose. It is now a future goal, idea 15 in `MOBILE_IDEAS.md`, with what it would take.
- **Category colors on the guest suite Schedule.** The desktop draws a color per category; the app's palette is brand-only (DESIGN_MOBILE.md), so the category is a neutral badge with the same label.
- **Drag-and-drop on the Moodboard** has no equivalent on a phone; the multi-file picker covers the same upload.

**Noted and kept:** date formatting stays `en-AU` in the mobile helpers (a product decision from goal 2: the audience reads "20 March 2027"); the US-English rule is about spelling and idiom. The desktop's `PageConsiderations` and Ava prompts are reused verbatim, including their punctuation.

## The Mobile impact line — how a desktop change reaches the phone

The rule, as the owner set it and as PRs #822 and #831 exercised it. It exists
because the two surfaces edit the same fields through the same helpers: a
change to what a couple writes on the desktop is a change to what they write
on the phone, and neither lane can see the other's screens while it works.

**Every PR that adds or changes a couple-facing planning feature carries a
"Mobile impact" line in its description.** One line, in the PR body, written
by the SHIPPING lane — the people who just made the change and know what it
touched. It names what the app must do about it, or says none.

**"Mobile impact: none" is a real answer and the commonest one.** Sample
content, guest-site copy, the marketing pages, the studio canvases, anything
behind a desktop-only surface: the app draws none of it, so there is nothing
to carry. Saying so is the point — an absent line reads as "not considered",
and the next lane cannot tell the two apart.

**This lane carries the item across**, in the same change or the next one on
`mobile/app-shell`, and records it in the matching entry above with the PR
number. A carried item names what the desktop changed, what the mobile screen
does now, and anything deliberately left — the way the two entries dated
2026-09-23 do.

**What the two exercises taught.**

*#831 wrote its own Mobile impact line and was right.* It named the file, the
symptom ("its section summary still reads 'Unplugged ceremony' whenever the
toggle is on") and the reason the rest would follow by itself (the shared
`goodToKnow.js`). The mobile work was an hour and needed no archaeology. That
is the line working.

*#822 owed its line retroactively, and the cost showed up twice.* The first
mobile pass (55e1d20f) went off the PR title and took the two section names —
the tiles, the titles, the Site tab rows. The PR body had also settled a
CATEGORY label and reworded a notes field, an Ava prompt and a recommendation
prompt, and none of that was carried until 2026-09-23. **A rename is never
just the names.** When a carried item is a rename, read the shipping PR's
diff, not its title, and diff the strings against `origin/main` rather than
the working tree — this branch runs behind main, so the tree is the wrong
reference and will quietly agree with the stale version.

**The instrument.** `tests/persistence/stay-getting-here.mjs` on main scans
every string literal and JSX text node in `src/`, which includes
`src/mobile/`. Running a shipping lane's own guard against this branch is the
cheapest way to find what a carried item missed, and it is how the #822
remainder was found. It belongs to the product lane; this lane borrows it.

## Goal 9: a failed read is never an empty state (2026-09-22)

A rule that cuts across every entry above, found the first time a real account
signed in on a phone.

The Notation at the top says every desktop page has "loading, an empty state
per list, a toast on error". On the phone there is a fourth state the desktop
mostly does not need, and it is the one that was missing: **the read failed**.
The three ownership-scoped helpers the whole app reads through —
`getMyWeddingDetails`, `getMyRecords`, `getMyGuestsWithRsvp` — fail SOFT by
design, answering `null` or `[]` when the request itself fails. That is right
on the desktop, where a tab rendering "no guests yet" beats one that throws
and the couple can see the rest of the page working. It is wrong in the app,
where those three reads are the ones that go through `/api/*` and are blocked
in the native shell: the whole screen became a plausible, empty, wrong
wedding, with no way to tell it from a couple who had entered nothing.

**The rule.** Every mobile read goes through the seam with `strict: true`
(`src/mobile/data/realApi.js`). `null` from `wedding.get()` still means "this
couple has no wedding record yet" — a real empty state, and the screens that
invite the couple to start are correct. A throw means "we could not find out",
and the screen shows its error state with a retry. A new screen inherits this
from `useLoad` and the api seam without doing anything; a new screen that
catches a read itself and substitutes a default is the thing to refuse in
review.

**Where a failure is the whole load's, not one card's.** The wedding record
carries the names, the date, the site and the events. A screen built on a
failed read of it does not show less, it states falsehoods — "Add your date in
Event details" to a couple who set one months ago. So `usePlanData`,
`useDailyUpdate` and `useBudget` no longer catch that read: Home and the Plan
hub show the error state, the daily takeover does not appear at all, and the
guest list counts it as its own failure. Every other store stays soft and
**named**, so the "some numbers are incomplete" panel can say which — the same
banner `DailyUpdate.jsx` shows on the desktop, and now with real names in it
(guests, to-dos, budget, schedule, vendors, messages, song requests).

**The notification feed is the same rule one level up.** Its ten sources each
fell back to an empty list silently, so a feed with one source answering and
nine failing looked like a quiet week. `useNotifications` now names every
failure and exposes `failed` and `complete`; the center shows its error state
rather than "Nothing yet" when it comes back blank on a failed load, and
anything deciding on the feed's behalf reads `complete` first. That is what
the priming screen got wrong: it told a couple "your first reply is in" off
server-written `Notification` rows the shell could reach, while the guest list
those replies are counted against had not loaded, so Replies read 0 on the
same screen.
