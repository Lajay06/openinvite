# Base44 Persistence Audit

> Read-only. No code changes. All file:line references are current.
> Feeds: SMART_RSVP_MODEL.md (D1) — Smart RSVP build, stable event IDs, `event_responses` registration.
> Background: Base44 silently drops writes to unregistered fields including nested sub-fields inside arrays.
> The prior dress-code and event-time bugs were both this failure mode on embedded objects.

---

## Classification key

- **REGISTERED** — confirmed in Base44 schema (tested by `scripts/test-persistence.mjs` or confirmed by live schema audit `scripts/audit-schema.mjs`)
- **REGISTERED-UNTESTED** — field appears registered (used stably in production) but has no round-trip test; risk is lower but not zero
- **UNREGISTERED** — confirmed absent from schema; silent-drop on every write. **Fix required.**
- **UNCLEAR** — written in code, registration cannot be confirmed without running `audit-schema.mjs`; treat as potential silent-drop until verified
- **NOT-YET-REGISTERED** — field planned in SMART_RSVP_MODEL.md, does not exist yet; must be registered before any code writes it

---

## Entity: `Note`

**Confirmed UNREGISTERED — live bugs.**

| Field | Written at | Read at | Status | Severity |
|-------|-----------|---------|--------|----------|
| `status` | `TodoList.jsx:50` (list view add), `TodoList.jsx:78` (kanban add), `TodoList.jsx:88` (kanban move) | `TodoList.jsx` — used to group cards into kanban columns | **UNREGISTERED** | **CRITICAL — user-facing data loss** |
| `view_type` | `TodoList.jsx:50`, `TodoList.jsx:79` | `TodoList.jsx` — used to filter todos from notes | **UNREGISTERED** | **CRITICAL — user-facing data loss** |

`Note.status` drives which kanban column a card appears in. Values written: `'Ideas'`, `'In progress'`, `'Done'`. Without it, every card drops to the default and the kanban board state never persists. `view_type: 'todo'` distinguishes todo-list items from plain notes; without it, the filter breaks.

**Note schema currently registered (confirmed):** `title`, `description`, `category`, `priority`, `completed`, `due_date`, `reminder_date`, `is_suggested`, `wedding_timeline`.

**Fix:** Register `status` (string, values: Ideas/In progress/Done) and `view_type` (string, values: todo/note) on the `Note` entity in Base44. Add round-trip assertions to `test-persistence.mjs`.

---

## Entity: `WeddingDetails`

### Group A — Confirmed REGISTERED with round-trip test cover

All tested in `scripts/test-persistence.mjs`. Failure here would be caught immediately.

**`mainCeremony` object** (`test-persistence.mjs:119–131`, `EventDetails.jsx:632–644`)

| Sub-field | Tested | Write site |
|-----------|--------|-----------|
| `venueName` | ✓ | `EventDetails.jsx:633` |
| `address` | ✓ | `EventDetails.jsx:634` |
| `placeId` | ✓ | `EventDetails.jsx:636` |
| `mapsUrl` | ✓ | `EventDetails.jsx:635` |
| `photoUrl` | ✓ | `EventDetails.jsx:637` |
| `startTime` | ✓ | `EventDetails.jsx:638` |
| `endTime` | ✓ | `EventDetails.jsx:639` |
| `dressCode` | ✓ | `EventDetails.jsx:640` |
| `parkingInfo` | ✓ | `EventDetails.jsx:641` |
| `accessibilityNotes` | ✓ | `EventDetails.jsx:642` |
| `notes` | ✓ | `EventDetails.jsx:643` |

**`reception` object** — same 11 sub-fields, tested at `test-persistence.mjs:132–144`.

**`preWeddingEvents[]` sub-fields** (`test-persistence.mjs:146–170`, `EventDetails.jsx:646–654`)

| Sub-field | Tested |
|-----------|--------|
| `id` | ✓ |
| `name` | ✓ |
| `type` | ✓ |
| `date` | ✓ |
| `startTime` | ✓ |
| `endTime` | ✓ |
| `venueName` | ✓ |
| `venueAddress` | ✓ |
| `venueMapsUrl` | ✓ |
| `venuePhotoUrl` | ✓ (null) |
| `venuePlaceId` | ✓ |
| `dressCode` | ✓ |
| `parkingInfo` | ✓ |
| `accessibilityNotes` | ✓ |
| `details` | ✓ |
| `venue` (legacy alias) | ✓ |
| `address` (legacy alias) | ✓ |
| `time` (legacy alias) | ✓ |
| `notes` (legacy alias) | ✓ |
| `isCustomType` | ✓ |

**`postWeddingEvents[]`** — same sub-field set as `preWeddingEvents`, written at `EventDetails.jsx:648`. NOT explicitly tested in `test-persistence.mjs` (only `pre` tested), but schema is shared — **REGISTERED-UNTESTED**.

**Guest Suite fields** (all tested in `test-persistence.mjs:171–339`):

| Field path | Status |
|-----------|--------|
| `guestSuiteAccommodation.places[].{id,name,address,rating,note}` | REGISTERED |
| `guestSuiteTransport.places[].{id,name,type,address,note}` | REGISTERED |
| `guestSuiteTransport.notes[].{id,title,text}` | REGISTERED |
| `weddingPolicies.photography.{unplugged,message,display}` | REGISTERED |
| `weddingPolicies.socialMedia.{noCeremony,message,display}` | REGISTERED |
| `weddingPolicies.children.{option,message,display}` | REGISTERED |
| `emergencyContacts.primary.{name,phone,role}` | REGISTERED |
| `emergencyContacts.backup.{name,phone,role}` | REGISTERED |
| `emergencyContacts.otherNotes` | REGISTERED |
| `dayVendorContacts[].{name,phone,role}` | REGISTERED |
| `experienceGuide.{published,destination,editorialIntro,vibes}` | REGISTERED |
| `experienceGuide.couplePicks[].{place_id,name,category,note}` | REGISTERED |
| `experienceGuide.categories.mustEat.{enabled,places[]}` | REGISTERED |
| `experienceGuide.itinerary.{days,schedule[].{day,blocks.{morning,afternoon,evening}}}` | REGISTERED |
| `theme.{aesthetic,faith,faithSecondary,culture,cultureOther,atmosphere,season,setting}` | REGISTERED |
| `polls[].{id,title,emoji,category,isActive,options[].{id,label,votes}}` | REGISTERED |
| `foodAndBeverage.*` (full object) | REGISTERED |
| `photography.*` (full object) | REGISTERED |
| `attire.{notes,outfits[],tailor,fittings[],accessories[]}` | REGISTERED |
| `flowers.*` | REGISTERED |
| `decorations.*` | REGISTERED |
| `beauty.*` | REGISTERED |
| `entertainmentDetails.*` | REGISTERED |

**Unregistered sub-fields in otherwise-registered arrays:**

`guestSuiteAccommodation.places[]` — test only covers `{id,name,address,rating,note}`. The write in `GuestSuiteAccommodation.jsx:412` also includes `price_level`, `photo_url`, `maps_url`, `website_url`, `badge`, `place_id` (snake_case). These are written but **only `note`, `id`, `name`, `address`, `rating` are in the test**. Whether `price_level`, `photo_url`, `maps_url`, `website_url`, `badge`, `place_id` are registered is **UNCLEAR**. If unregistered they silent-drop on every accommodation save — user sees venues without photos/links.

---

### Group B — Written by StudioWebsite, registration UNCLEAR

These fields are in the `DEFAULT` object at `StudioWebsite.jsx:179–207` and are written on every autosave via `detailsRef.current`. They are NOT tested in `test-persistence.mjs`.

| Field | Written at | Read at | Status | Severity if dropped |
|-------|-----------|---------|--------|---------------------|
| `coupleNames` | `StudioWebsite.jsx:180` | `MultiPageWeddingWebsite.jsx:186` nav, preview | **UNCLEAR** | High — published site nav shows wrong name |
| `websiteEnabled` | `StudioWebsite.jsx:183` | `PublishModal` / share logic | **UNCLEAR** | Medium — publish state lost |
| `websitePassword` | `StudioWebsite.jsx:184` | `MultiPageWeddingWebsite.jsx:125` | **UNCLEAR** | High — password gate bypass |
| `activeTheme` | `StudioWebsite.jsx:185`, `WBRightPanel.jsx:162` | `MultiPageWeddingWebsite.jsx:132` | **UNCLEAR** | High — published site loses theme |
| `activeTypography` | `StudioWebsite.jsx:186`, `WBRightPanel.jsx:192` | `MultiPageWeddingWebsite.jsx:133` | **UNCLEAR** | High — published site loses typography |
| `pageTransition` | `StudioWebsite.jsx:187`, `WBRightPanel.jsx:217` | `MultiPageWeddingWebsite.jsx:229` | **UNCLEAR** | Low — cosmetic fallback |
| `scrollAnimation` | `StudioWebsite.jsx:188`, `WBRightPanel.jsx:221` | nowhere (dead field) | **UNCLEAR** | None (dead) |
| `heroEffect` | `StudioWebsite.jsx:189`, `WBRightPanel.jsx:225` | nowhere (dead field) | **UNCLEAR** | None (dead) |
| `heroVideoUrl` | `StudioWebsite.jsx:190` | builder preview | **UNCLEAR** | Low |
| `coverPhoto` | `StudioWebsite.jsx:191` | builder preview | **UNCLEAR** | Low |
| `welcomeMessage` | `StudioWebsite.jsx:192` | builder preview sections | **UNCLEAR** | Low |
| `coupleStory` | `StudioWebsite.jsx:193` | builder preview sections | **UNCLEAR** | Low |
| `enabledPages` | `StudioWebsite.jsx:194`, `WBLeftPanel.jsx:96` | `MultiPageWeddingWebsite.jsx:134` nav | **UNCLEAR** | High — all non-home pages disappear from published nav |
| `homeContent.{tagline,partnerOneName,partnerTwoName}` | `StudioWebsite.jsx:195` | home section renders | **UNCLEAR** | Medium |
| `ourStoryContent.{storyText,milestones[],photos[]}` | `StudioWebsite.jsx:196` | our-story page | **UNCLEAR** | Medium |
| `celebrationContent.{daySchedule[]}` | `StudioWebsite.jsx:197` | celebration page | **UNCLEAR** | Medium |
| `rsvpContent.{rsvpDeadline,mealOptions[],enablePlusOnes,enableDietaryField,enableSongRequest,enableMessage,closingMessage}` | `StudioWebsite.jsx:200` | RSVP page | **UNCLEAR** | High — RSVP form config lost |
| `travelContent.{gettingThereNotes,parkingInfo,transportInfo,rideshareNotes,accommodations[],transportOptions[]}` | `StudioWebsite.jsx:201` | travel page | **UNCLEAR** | Medium |
| `accommodationContent.{hotelNotes,airbnbNotes,alternativeNotes,showAlternative,roomBlocks[],customOptions[]}` | `StudioWebsite.jsx:202` | accommodation page | **UNCLEAR** | Medium |
| `registryContent.{registryLinks[],registryMessage,noGiftsPlease}` | `StudioWebsite.jsx:203` | registry page | **UNCLEAR** | Medium |
| `musicContent.{spotifyPlaylistUrl,enableGuestRequests,customMessage}` | `StudioWebsite.jsx:204` | music page | **UNCLEAR** | Medium |
| `qna` | `StudioWebsite.jsx:205` | FAQ page | **UNCLEAR** | High — all FAQs disappear |
| `pageSections` | `StudioWebsite.jsx:206` | `MultiPageWeddingWebsite.jsx:244` | **UNCLEAR** | **CRITICAL — entire builder output lost** |
| `customPages` | `WBLeftPanel.jsx:101` | left panel nav, published nav | **UNCLEAR** | High — custom pages disappear |
| `activeUniverse` | `AmanUniverseView.jsx:178`, `UniverseViewBase.jsx:147` | `MultiPageWeddingWebsite.jsx:138` | **UNCLEAR** | High — universe/grain/motion never activates |
| `displayFont` | `StudioWebsite.jsx:454` (read), written via `updateField` | builder preview | **UNCLEAR** | Low |
| `bodyFont` | referenced similarly | builder preview | **UNCLEAR** | Low |

**Highest priority UNCLEAR fields:** `pageSections` (entire builder output), `enabledPages` (all non-home pages), `rsvpContent` (RSVP form config), `activeTheme`, `activeTypography`, `websitePassword`, `coupleNames`.

**Important field conflict — `coupleNames` vs `couple1Name`/`couple2Name`:**
- `StudioWebsite` writes `coupleNames` (single combined string): `StudioWebsite.jsx:180`
- `EventDetails` writes `couple1Name` and `couple2Name` (separate): `EventDetails.jsx:569`
- `GuestSuite.jsx:72–74` reads `couple1Name` / `couple2Name`
- `MultiPageWeddingWebsite.jsx:186` reads `coupleNames` (combined)
These are **different fields on the same entity**, not aliases. A couple who enters their names in EventDetails will see them on GuestSuite but NOT on the published website, and vice versa. Not a silent-drop but a data-read mismatch that appears as silent drop.

---

### Group C — Fields in `guestSuiteAccommodation.places[]` not tested

Written at `GuestSuiteAccommodation.jsx:412`, not in `test-persistence.mjs`:

| Sub-field | Status |
|-----------|--------|
| `price_level` | **UNCLEAR** |
| `photo_url` | **UNCLEAR** — venue photos would silently disappear |
| `maps_url` | **UNCLEAR** |
| `website_url` | **UNCLEAR** |
| `badge` | **UNCLEAR** |
| `place_id` | **UNCLEAR** (note: `id` IS tested, `place_id` is a separate Google Places identifier) |

---

## Entity: `Guest`

### Confirmed REGISTERED with test cover

Tested in `test-persistence.mjs:754–833`:

| Field | Tested | Write site |
|-------|--------|-----------|
| `song_request` | ✓ | `RSVPPage.jsx:102` (form state), spread at `:160` |
| `rsvp_note` | ✓ | `RSVPPage.jsx:102` (form state), spread at `:160` |
| `poll_votes` | ✓ | `RSVPPage.jsx:203`, `RSVPPage.jsx:178` |
| `invite_sent_at` | ✓ | `SendInvitesModal.jsx:208` |
| `invite_channel` | ✓ | `SendInvitesModal.jsx:208` |
| `reminder_sent_at` | ✓ | `SendInvitesModal.jsx:259` |

### UNCLEAR — written but not tested

| Field | Written at | Read at | Status | Severity |
|-------|-----------|---------|--------|----------|
| `rsvp_date` | `RSVPPage.jsx:162` (`new Date().toISOString().split('T')[0]`), `GuestRSVP.jsx:115` | displayed in RSVP dashboard | **UNCLEAR** | High — RSVP timestamp lost |
| `meal_choice` | `RSVPPage.jsx:99,129` (form state), spread at `:160` | seating / catering views | **UNCLEAR** | **CRITICAL** — guest meal choice lost on every RSVP submission |
| `dietary_restrictions` | `RSVPPage.jsx:100,130` (form state), spread at `:160`; `GuestForm.jsx:56` | guest dashboard | **UNCLEAR** | High — dietary info lost |
| `plus_one_meal_choice` | `RSVPPage.jsx:103,133` (form state), spread at `:160`; `GuestRSVP.jsx` `rsvpData` spread | catering | **UNCLEAR** | High — plus-one meal choice lost |
| `plus_one_rsvp` | `GuestRSVP.jsx:106,113` `rsvpData` spread | guest dashboard | **UNCLEAR** | High — plus-one attendance status lost |
| `interests` | `WeddingWebsite.jsx:522` — `{ interests: preferences }` | `WeddingWebsite.jsx` | **UNCLEAR** | Medium |
| `plus_one_dietary` | `GuestForm.jsx:57,116` | guest dashboard | **UNCLEAR** | Medium — plus-one dietary info lost |
| `rsvp_link_id` | `SendInvitesModal.jsx:212`, `InvitationsTab.jsx:195` | `RSVPPage.jsx:116` — filter guests by this token | **UNCLEAR** | **CRITICAL** — RSVP link token lost, guests cannot RSVP |
| `table_assignment` | `GuestForm.jsx:56`, `Seating.jsx:248,260,309` | seating plan | **UNCLEAR** | High — seating assignments lost |
| `plus_one` (boolean) | `GuestForm.jsx:57,305` | RSVP page conditional | **UNCLEAR** | High — plus-one eligibility lost |
| `plus_one_name` | `GuestForm.jsx:57,315` | guest list | **UNCLEAR** | Medium |
| `category` | `GuestForm.jsx:55` | guest list grouping | **UNCLEAR** | Medium |
| `tags` | `GuestForm.jsx:55` | guest filtering | **UNCLEAR** | Medium |
| `notes` | `GuestForm.jsx:57` | guest list | **UNCLEAR** | Low |

**`rsvp_link_id` is the highest-severity UNCLEAR Guest field.** Every token-based RSVP link depends on this field being stored. If unregistered, all sent invites produce broken links and guests cannot RSVP. The test-persistence.mjs creates Guest records using `rsvp_link_id` as the sentinel value (`test-persistence.mjs:759`), which suggests it IS registered — but there is no explicit round-trip assertion for it.

**`meal_choice` is the second-highest severity.** It is spread into the Guest.update call in `RSVPPage.jsx:160` via `{...form, rsvp_date: ...}`. The form object includes `meal_choice` at line 99. If unregistered, every RSVP submission silently discards the meal choice — invisible to the guest, invisible to the couple, disaster at catering.

---

## Entity: `Schedule`

Written via `Schedule.create(itemData)` / `Schedule.update(id, itemData)` in `Schedule.jsx:97,100` and `ScheduleForm.jsx`.

| Field | Status |
|-------|--------|
| `event_name`, `event_date`, `start_time`, `end_time`, `location`, `category`, `responsible_person`, `description`, `notes` | **REGISTERED-UNTESTED** (used stably, part of export CSV at `Schedule.jsx:161`) |

No unregistered fields found. Schedule entity appears clean.

---

## Entity: `StoryMilestone`

Written in `OurStory.jsx:49,52,165`. Fields: `order`, plus whatever `formData` contains.

**UNCLEAR** — `formData` is from a form; field names not verified against schema. The `order` field (line 165) is a simple integer and likely registered.

---

## Entity: `Photo`

Written in `PhotoGallery.jsx:104,107,149`. Fields include `is_featured` (boolean).

`is_featured` — **UNCLEAR** whether registered. If not, the featured photo flag silently drops.

---

## `test-persistence.mjs` — coverage gaps

What the test covers:
- WeddingDetails: Guest Suite fields, Event Details canonical fields, theme fields, planning page fields (foodAndBeverage, photography, attire, flowers, decorations, beauty, entertainmentDetails), sequential append, sole-writer isolation
- Guest: `song_request`, `rsvp_note`, `poll_votes`, `invite_sent_at`, `invite_channel`, `reminder_sent_at`

**What is NOT covered — gaps by severity:**

| Gap | Severity | Impact |
|-----|----------|--------|
| `Guest.meal_choice` | CRITICAL | Silent-drop on every RSVP |
| `Guest.rsvp_link_id` | CRITICAL | Silent-drop breaks all RSVP links |
| `Guest.rsvp_date` | High | RSVP timestamp always missing |
| `Guest.dietary_restrictions` | High | Dietary info lost on every RSVP |
| `Guest.plus_one_meal_choice` | High | Plus-one meal choice lost |
| `Guest.plus_one` | High | Plus-one eligibility lost |
| `Guest.table_assignment` | High | Seating assignments lost |
| `Guest.plus_one_rsvp` | High | Plus-one attendance lost |
| `WeddingDetails.pageSections` | CRITICAL | Entire builder output could be lost |
| `WeddingDetails.enabledPages` | High | All non-home pages disappear |
| `WeddingDetails.activeTheme` | High | Published site loses theme |
| `WeddingDetails.activeTypography` | High | Published site loses typography |
| `WeddingDetails.websitePassword` | High | Password gate bypass |
| `WeddingDetails.rsvpContent.*` | High | RSVP form config lost |
| `WeddingDetails.qna` | High | All FAQs disappear |
| `WeddingDetails.activeUniverse` | High | Universe/grain/motion never activates |
| `WeddingDetails.customPages` | High | Custom pages disappear |
| `WeddingDetails.coupleNames` | Medium | Published nav shows wrong name |
| `WeddingDetails.guestSuiteAccommodation.places[].photo_url/maps_url/website_url/price_level/badge/place_id` | Medium | Venue photos and links silently drop |
| `WeddingDetails.postWeddingEvents[]` | Medium | Same shape as preWeddingEvents — tested indirectly, no explicit test |
| `Note.status` | CRITICAL | Kanban columns never persist |
| `Note.view_type` | CRITICAL | Todo filter broken |

---

## Smart RSVP build — pre-flight checks

Required reading: `SMART_RSVP_MODEL.md`. Fields the build will add or assume:

### `Guest` additions

| New field | Type | Register? | Conflict with existing? |
|-----------|------|-----------|------------------------|
| `household_id` | string \| null | Must register before writing | None |
| `dietary` | string \| null | Must register before writing | Different from existing `dietary_restrictions` — both will coexist. Verify `dietary_restrictions` is registered before assuming it persists. |
| `event_responses[]` | array of objects | **Must register the array AND all sub-fields explicitly** | None at top level |
| `event_responses[].event_id` | string | Must register at array-element level | None |
| `event_responses[].invited` | boolean | Must register at array-element level | None |
| `event_responses[].status` | string | Must register at array-element level | **Name collision risk:** `Note.status` is unregistered (above). No actual conflict (different entity) but confusion risk. |
| `event_responses[].meal_choice` | string | Must register at array-element level | Name collision with existing `Guest.meal_choice` (top-level, UNCLEAR if registered) — confirm both are independent. |
| `event_responses[].plus_ones` | number | Must register at array-element level | None |
| `event_responses[].plus_one_names` | string[] \| null | Must register at array-element level | None |
| `event_responses[].responded_at` | string \| null | Must register at array-element level | None |

### `WeddingDetails` additions

| New field | Type | Register? | Note |
|-----------|------|-----------|------|
| `events[].event_id` | string | Must register at array-element level — embedded objects have the same silent-drop risk as top-level fields | Backfill approach: lazy on load (assign once, idempotent). Confirm `preWeddingEvents` vs `postWeddingEvents` vs a unified `events` array — SMART_RSVP_MODEL.md uses a unified `events[]` but EventDetails uses `preWeddingEvents` / `postWeddingEvents` / `mainCeremony` / `reception`. **Reconcile before building.** |

### Blocking assumption in SMART_RSVP_MODEL.md

The spec states: *"events are an array embedded inside the WeddingDetails record."* The current codebase does NOT have a unified `events` array. It has:
- `mainCeremony` (object) — fixed ceremony
- `reception` (object) — fixed reception
- `preWeddingEvents[]` (array) — custom pre-events
- `postWeddingEvents[]` (array) — custom post-events

PR 1 (stable IDs) needs to either:
a) Add `event_id` to all four structures independently, or
b) Introduce a unified `events[]` array as a migration step first

Option (a) is lower risk for PR 1. The spec's `WeddingDetails.events[].event_id` notation should be interpreted as applying to all four existing event structures.

---

## Prioritised fix list

### P0 — Data loss happening right now (fix before any other work)

1. **Register `Note.status` and `Note.view_type`** on Base44 + add test assertions. Kanban board state and todo filtering are broken for every user.

2. **Verify and test `Guest.meal_choice`** — run `audit-schema.mjs`, confirm registered. If not, register and add test. Every guest RSVP discards the meal choice silently.

3. **Verify and test `Guest.rsvp_link_id`** — used as the sentinel in `test-persistence.mjs:759` but never explicitly asserted. Add explicit round-trip assertion. If unregistered, all invite links are broken.

### P1 — High severity, affects user-entered data

4. **Verify Guest fields:** `rsvp_date`, `dietary_restrictions`, `plus_one_meal_choice`, `plus_one`, `plus_one_rsvp`, `table_assignment`, `plus_one_dietary`. Run `audit-schema.mjs` for each. Register any that fail. Add test assertions for `meal_choice`, `rsvp_date`, `dietary_restrictions`, `plus_one_meal_choice`.

5. **Verify WeddingDetails builder fields:** `pageSections`, `enabledPages`, `activeTheme`, `activeTypography`, `websitePassword`, `rsvpContent.*`, `qna`, `activeUniverse`, `customPages`. These affect every live website. Run `audit-schema.mjs` and add round-trip tests for `pageSections` and `enabledPages` — the two with total-loss impact.

6. **Resolve `coupleNames` vs `couple1Name`/`couple2Name` split.** `StudioWebsite` writes `coupleNames` (combined); `EventDetails` writes separate fields; `GuestSuite` reads the separate fields; `MultiPageWeddingWebsite` reads the combined field. Pick one canonical form and converge all writes and reads. Both fields need to be registered.

### P2 — Medium severity, affects feature completeness

7. **Test `WeddingDetails.guestSuiteAccommodation.places[]` extended fields** — add `photo_url`, `maps_url`, `website_url`, `badge`, `price_level`, `place_id` to the test-persistence assertion. Without venue photos and links the accommodation guide is bare.

8. **Add explicit test for `WeddingDetails.postWeddingEvents[]`** — structurally identical to `preWeddingEvents` but never explicitly tested.

9. **Add tests for StudioWebsite content objects** — `homeContent`, `ourStoryContent`, `celebrationContent`, `rsvpContent`, `travelContent`, `accommodationContent`, `registryContent`, `musicContent`. These cover the bulk of the website builder's writable content.

### P3 — Smart RSVP pre-requisites (required before building D1)

10. **Register `Guest.event_responses[]` and all sub-fields** — nested array fields are the most common silent-drop failure mode. Register the array AND each named sub-field before writing a single line of RSVP code. Round-trip test every sub-field individually.

11. **Register `event_id` on embedded event objects** — must be at the nested-object level of all four event structures. Verify with a round-trip test (write `event_id: 'test-uuid'` to a `preWeddingEvents[]` item, read back, assert not undefined).

12. **Verify `Guest.dietary` (new field from spec) vs existing `dietary_restrictions`** — ensure both are registered, confirm they are stored independently, add test assertions for both.
