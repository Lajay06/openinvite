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
**Mobile.** Hero carousel (days to go, replies, from Ava, share the site), stat pair, Next up (payments due and open tasks, tap to complete), keep planning, from Ava, latest three notifications, pull to refresh. Ava opens the same pod in a sheet.
**Gaps.** None on content. Owner fix 1: the Next up cards are unequal heights.
**Status.** Parity on content. Owner fix 1 planned for phase 2 (fixed-height cards, two-line titles, one-line meta).

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

### Invitations (`/Invitations`) → `/m/plan/invitations`

**Desktop.** `InvitationBuilder` (create) and `InvitationStudio` (design canvas over the `Invitation` record).
**Mobile.** A hand-off screen with a note.
**Gaps.** The design canvas is a builder; it stays on desktop, as the brief allows for canvas tools. The list and form actions here are the builder's own fields, which are its canvas.
**Status.** Desktop-only by design (canvas). The hand-off names the invitation that exists and when it was last saved, and points to Send invites here.

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
**Status.** Done (phase 1): Requests with the five filters and counts, Approve, Add to playlist and Decline through `/api/song-request-review` (the same three actions the endpoint accepts); Playlist with the editable link saved as `music.playlists[0].playlistUrl`, the source label from `parsePlaylistLink`, Open on Spotify / Apple Music / YouTube, and the Music entity tracks (add, edit, delete) kept as the phone's own editor; Settings (`guestRequestsEnabled`, `requestsRequireApproval`, `limitOnePerGuest`, `requestMessage` with the desktop default); Share (the site's music page, a QR drawn locally, copy, the share sheet); Notes (`music.notes`, auto-saved); Vendor (into My vendors filtered to music).

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

### Transport (`/transport`) → `/m/plan/transport`

**Desktop.** Tabs Overview, Shuttles, Parking, Public transport, Rideshare, Notes. `transport`: `recommendedMode` (rideshare, drive, public, shuttle, walk, hire), `coupleNote`; `shuttles[]` (`name`, `type` coach / shuttle / minibus / transfer / limo, `pickupLocation`, `pickupTime`, `returnTime`, `dropoffLocation`, `capacity`, `contact`, `notes`); `parking` (`venueParking`, `venueParkingNotes`, `nearbyCarParks[]` with `name`, `address`, `distance`, `cost`, `streetParking`, `accessibilityNotes`); `publicTransport` (`generalNotes`, `routes[]` with `type` train / bus / tram / metro / ferry, `notes`, `totalTime`); `rideshare` (`pickupLocation`, `dropoffLocation`, `lateNightNote`); `freeTextNotes`. Ava.
**Mobile (found).** Recommended mode as free text; parking with `nearbyCarParks` as a textarea (wrong shape); shuttles list with type as text.
**Gaps.** Mode select; shuttle type select; car parks as a list; public transport routes; rideshare.
**Status.** Done (phase 1): Overview (recommended mode with the desktop's six values, note for the wedding party), Shuttles (name, type with the five values, pickups, drop-offs, times, seats, contact, notes), Parking (venue parking switch and notes, street parking, accessibility parking, nearby car parks as a list with name, address, distance, cost), Public transport (general notes, routes with the five types, summary and travel time), Rideshare (pickup, drop-off, late-night note), Notes.

### Accommodation (`/accommodation`) → `/m/plan/accommodation`

**Desktop.** Tabs Overview, Properties, Notes. `accommodation`: `checkInDate`, `checkOutDate`, `coupleNote`, `additionalNotes`; `manualProperties[]` (**Add property** modal: `photoUrl`, `name` with a Google search link, `address`, `website`, `phone`, `bookingCode`, `coupleNote`, `tags[]` from ten options, flags `isMainGuestHotel`, `isClosestToVenue`, `isBestValue`, `isPinned`), edit, delete. Ava.
**Mobile (found).** Dates and notes; places with name, address, url (wrong key), phone, priceRange (not a desktop field), notes.
**Gaps.** The property sheet's real fields: photo, website key, booking code, note to guests, tags, flags; pinned first.
**Status.** Done (phase 1): Overview (check in, check out, note to guests), Properties (the desktop's property sheet: photo, name with the search link, address, website, phone, booking code, note to guests, the ten tags, the four flags), Notes.

### Emergency contact (`/emergency-contact`) → `/m/plan/emergency`

**Desktop.** Tabs Contacts, Vendors, Notes. `emergencyContacts` (encrypted): `primary`, `backup` (`name`, `role`, `phone`), `venue` (`name`, `phone`), `otherNotes`; `dayVendorContacts[]` (encrypted, `name`, `role`, `phone`). Ava.
**Mobile (found).** Primary, backup, venue, notes.
**Gaps.** Key vendors on the day.
**Status.** Done (phase 1): Contacts, Vendors (`dayVendorContacts`, encrypted, name, role, phone), Notes.

## Finances

### Budget (`/Budget`) → `/m/plan/budget`

**Desktop.** Stats (committed, spent, remaining, budget used). Tabs Overview, Forecasting, Expenses, Considerations. *Overview*: **Budget planner** (`total`, one amount per category; `PUT /api/my-wedding-details { field: 'budget' }`; export the plan as CSV), `BudgetChart`. *Forecasting*: chart against the recommended split, flags, Ava insights (`InvokeLLM`). *Expenses*: search, list (paid or unpaid pill, edit, delete), **Add expense / Edit expense** modal (`category`, `item_name`, `budgeted_amount`, `actual_amount`, `vendor`, `paid`, `payment_date`, `notes`), export CSV. Ava.
**Mobile (found).** Totals, categories, category detail with expenses, add and edit expense with every field, mark paid.
**Gaps.** Planner (total and per-category); delete an expense; search; forecasting insights; the two exports.
**Status.** Done (phase 1): Overview (spent, the committed total, paid, still to pay, next payment, categories, payments due, the Budget plan sheet with the total and one amount per category saved through `PUT /api/my-wedding-details { field: 'budget' }` as the planner does, and the plan's CSV export), Forecasting (the desktop's benchmark flags and saving tips, budget used, each category against the usual split, and Ava's insights through the same prompt and JSON schema; the chart itself is the list), Expenses (search, every expense with the paid pill, edit and delete from the sheet, the expenses CSV export). The category screen adds delete too.

### Registry (`/Registry`, `/GuestSuiteRegistry`) → `/m/plan/registry`

**Desktop.** Stats. Share (`ShareRegistryModal`: copy link, email, SMS, Facebook, WhatsApp). Tabs Overview (`ConsolidatedRegistryView`), Platforms (`RegistryItem`: `store_name`, `url`, `image_url` logo, `description`), Products (`RegistryProduct`: `name`, `price`, `category` kitchen / home_decor / bedding / bathroom / outdoor / electronics / other, `registry_platform` Zola / MyRegistry / The Knot / Amazon / Target / Williams Sonoma / Crate & Barrel / Other, `quantity_requested`, `priority`, `product_url`, `image_url`, `description`, `notes`; mark purchased with `guest_name`, `quantity`, `message` appended to `purchased_by[]` and `quantity_purchased`), Cash funds (`CustomGift`: `title`, `category` honeymoon / home_fund / charity / experience / custom, `requested_amount`, `image_url`, `payment_link_url`, `description`), Received gifts (`ReceivedGift`: `item_name`, giver from the guest list `giver_guest_id` / `giver_name` / `giver_email`, `delivery_status` expected / received / not_received, `received_date`, `thank_you_sent` (+ `thank_you_date`), `thank_you_note` with Ava generate, `estimated_value`, `category` physical / cash / experience / digital / other, `notes`; search; toggle thanked). `GuestSuiteRegistry` is a read-only mirror with a link here. Ava.
**Mobile (found).** Four lists with add, edit, delete; value drift on fund category, delivery status, and missing product category and platform; no purchases, no guest link, no note generation, no share.
**Gaps.** As listed.
**Status.** Done (phase 1): Overview (platforms, products, the bought-so-far completion, the consolidated view, received summary, Share by copy, the share sheet, email, SMS and WhatsApp with the desktop's message), Platforms with `RegistryForm`'s fields, Products with `RegistryProductForm`'s fields (the seven categories, the eight platforms, quantity, priority, links, photo, description, private notes) and the mark-purchased sheet (bought by, how many, message appended to `purchased_by[]`, `quantity_purchased`), Cash funds with `CustomGiftForm`'s fields and the desktop's five categories, Received gifts with search, the giver from the guest list (`giver_guest_id`, `giver_name`, `giver_email`), the three delivery statuses, received date, the five categories, value, thank you sent with its date, the thank-you note with Ava writing it through the same prompt, notes. The drift in fund categories and delivery statuses is corrected.

## Guest suite

### Design studio (`/studio`) → `/m/site`

**Desktop.** The studio hub, website builder, universe picker, Ava studio. Publish state, share.
**Mobile.** Site preview, live status, view, share, rows into the guest suite editors. Builder and Ava studio hand off.
**Gaps.** The builder is a canvas; the universe picker is a list (parity for that list is a builder action inside the studio and stays with it).
**Status.** Desktop-only by design (canvas). Publish toggle, view and share are on the Site tab.

### Schedule (`/GuestSuiteSchedule`) → `/m/plan/suite-schedule`

**Desktop.** A read-only timeline of the Schedule records as guests see them, with links to edit in Schedule.
**Mobile.** The same.
**Status.** Parity.

### Q&A (`/QandA`) → `/m/plan/qna`

**Desktop.** Add a question and answer; each row removable. Ava suggests questions.
**Mobile.** Add, edit, remove.
**Status.** Parity (mobile edits in place, a superset).

### Registry (`/GuestSuiteRegistry`)

Mirror of Registry. **Status.** Parity through the registry screen.

### Accommodation (`/GuestSuiteAccommodation`) → `/m/plan/suite-accommodation`

**Desktop.** Google Places search (with Use my location), select a result, `note`, `badge` (Closest to venue, Best value, Where most guests are staying, Luxury pick, Budget friendly), Add (fetches `website` from place details; stores `place_id, name, address, rating, price_level, photo_url, maps_url, website_url, note, badge`); Add manually (`name`, `address`, `url`, `badge`, `note`); cards with photo, badge, remove. Ava recommends four places (`InvokeLLM`, each resolved through Places search, add one by one). Saved on `guestSuiteAccommodation.places`.
**Mobile (found).** Places by hand (name, address, note, website); no search, no photo, no badge.
**Gaps.** Places search with photo, badge, Ava recommendations.
**Status.** Built in phase 1 with `PlaceField` and the badge; Ava recommendations.

### Transport (`/GuestSuiteTransport`) → `/m/plan/suite-transport`

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
**Status.** Planned (phase 1): rebuilt on the desktop shape.

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
**Status.** Built in phase 1 as an Account details sheet (name, currency, temperature unit) and an email preferences sheet. Password change and account deletion stay on the desktop page (auth surface, locked by CLAUDE.md).

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
