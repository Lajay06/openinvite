# Scanner UNCERTAIN triage

`npm run audit:schema` reports **46 unique field paths** it cannot resolve
statically (95 raw write sites). This triages every one with evidence.

Report only — nothing here is fixed. Produced 2026-08-18, against `main` at
`098bf30`.

**Why these are UNCERTAIN and not DROPPED:** the scanner resolves field names by
reading object literals at the call site. When the call passes a *variable*
(`Entity.create(data)`) or a *spread* (`{...form}`), the names are not visible in
the AST, so it declines to guess rather than reporting a false drop. That
restraint is correct — but it means this bucket is exactly where a silent-drop
bug hides, which is how `Note.status` survived for months.

---

# 🔴 LIVE SILENT-DROP BUG — Ava's action prompt teaches undeclared field names

**`src/components/layout/AvaModal.jsx:13-24` (`ACTION_INSTRUCTIONS`)**

Ava is an LLM. It emits `ACTION:{...}` blocks that `confirmAction()` passes
**straight into `create`/`update`** with no field validation:

```js
create_budget_item: () => base44.entities.Budget.create(action.data),
create_schedule:    () => base44.entities.Schedule.create(action.data),
```

The prompt teaches field names by example. **Two of the six action types use
names that do not exist in the schema.**

### `create_schedule` — every taught field is discarded

Prompt example: `{"title":"Wedding ceremony","time":"15:00"}`

| Taught | Declared on `Schedule`? |
|---|---|
| `title` | ❌ no such field — the real one is `event_name` |
| `time` | ❌ no such field — the real one is `start_time` |

`Schedule` declares `event_name`, `event_date`, `start_time`, `end_time`,
`location`, `description`, `responsible_person`, `category`, `notes`. **Neither
taught name exists.** A schedule item created through Ava persists with nothing
but defaults, and all three required fields (`event_name`, `event_date`,
`start_time`) are absent.

### `create_budget_item` — the amount is discarded

Prompt example: `{"category":"Catering","total_amount":8000}`

| Taught | Declared on `Budget`? |
|---|---|
| `total_amount` | ❌ no such field — the real one is `budgeted_amount` |
| `category` | ✅ but `"Catering"` ≠ enum value `catering` |
| `item_name` | not taught, and it is **required** |

The money is the field that gets dropped.

### Why the user never finds out

`confirmAction` marks the action `done` and fires `toast.success(...)` on any
non-throwing response. Base44 returns `200` for a write of undeclared fields, so
**Ava reports success while the data is discarded.** This is the same shape as
the `Note.status` defect: a `200`, a happy UI, and nothing stored.

### Evidence

Static: field names compared against the live schema (`docs/backend-schema.md`).

Live, read-only: across 13 `Budget` rows and 20 `Schedule` rows, **no row carries
`total_amount`, `title`, or `time`.** Consistent with the names never persisting.
This is corroboration, not proof of the write path — proving it end-to-end needs
a create, which the work pack's no-data-operations rule excludes. The static case
is airtight on its own: the fields are not in the schema.

### Not fixed, and a decision is needed

The mechanical fix is to correct the prompt examples. But the deeper issue is
that **`action.data` is unvalidated LLM output written directly to the database**,
so the next prompt edit or model change can reintroduce this silently. The
durable fix is an allowlist between `parseActions()` and `confirmAction()`,
rejecting unknown field names per entity. That's a design decision, so it is
flagged rather than taken.

### Also worth a decision

`update_guest`/`update_vendor` pass `action.data.id` as the record id **and**
leave `id` inside the patch body. Harmless today (Base44 ignores it), but it is
the same "write whatever we happen to be holding" habit as below.

---

# 🟡 Class-level note — full-record echo writes

Several update paths spread an entire previously-read record back into `update()`:

| Site | Pattern |
|---|---|
| `InvitationStudio.jsx:57` | `{ ...currentInvitation, design }` |
| `ScheduleForm.jsx:21` | `useState(item \|\| {...})` → whole `item` resubmitted on edit |
| `VowsSpeeches.jsx:49` | `VowSpeech.update(data.id, data)` where `data` includes `id` |

These write back server-managed fields (`id`, `created_date`, `created_by_id`)
that are not writable schema fields. **Not currently a bug** — Base44 discards
them. It matters because it means these paths write field names nobody chose,
so a future derived/overlay field attached at read time would be written back
and silently dropped. `Guest.plus_one_rsvp_status` is exactly such an overlay,
which is why the Guest write path routes through a chokepoint instead.

Recommend, not urgent: have edit forms submit an explicit field set.

---

# ✅ Verified false positives

Traced to the actual object; every key is declared. Grouped by why the scanner
could not see them.

## Explicit single-field writes the scanner read as a variable (17 paths)

The `WeddingDetails` autosave pages all build a **named, scoped** object and pass
it to a shared `persist()`. The scanner sees `persist(full)` and stops.

| Path | Writes | Verified |
|---|---|---|
| #18 `WeddingDetails :: var full` (16 sites, 8 pages) | `{accommodation}`, `{beauty}`, `{entertainmentDetails}`, `{foodBeverage}`/`{menuItems}`/`{mealOptions}`, `{honeymoonDetails}`, `{transport}`, `{weddingFavours}`/`{favourItems}`, `{weddingParty}` | all declared |
| #16 `WeddingDetails :: var next` | `{websiteEnabled}` / `{slug}` | declared |

Five of those top-level names — `foodBeverage`, `honeymoonDetails`,
`weddingFavours`, `favourItems`, `weddingParty` — were **missing from the
mirror** until this session's sync, and would have shown as DROPPED had anyone
looked before #483. They are declared live and always were.

**Nested sub-keys spot-checked** on `transport`, the deepest: every sub-key the
UI writes (`parking`, `publicTransport`, `rideshare`, `shuttles`, `coupleNote`,
`recommendedMode`, `freeTextNotes`) is declared, and several are open objects
(`{"type":"object"}` with no `properties`), so their own sub-keys persist freely.

## Form-state objects whose keys match the schema exactly (4 paths)

| Path | Form shape | Verdict |
|---|---|---|
| #10 `ReceivedGift :: var data` | `EMPTY_FORM` — 12 keys | exactly the 12 declared fields |
| #33 `Task :: var taskFormData` | 6 keys | all declared |
| #42 `Schedule :: var itemData` | `ScheduleForm` — 9 keys | exactly the 9 declared fields |
| #4 `Invitation :: var newInvitationData` | `couple_names`, `wedding_date`, `design` | all declared |

## Scanner parse limitations (2 paths)

| Path | Why | Verdict |
|---|---|---|
| #3 `Guest :: var isReminder ? …` | Ternary argument — the scanner truncated mid-expression | Both branches write declared fields: `reminder_sent_at`, or `invite_sent_at` + `invite_channel` |
| #9 `MoodboardItem :: var ` (empty name) | Scanner extracted an empty identifier | Writes filename-derived `title`, `board_name`, `tags`, `category` — all declared |

**One cosmetic note on #9:** it writes `board_name: 'Main board'` while the
schema default is `'Main Board'`. Not a drop — both persist — but two spellings
of the same board will not group together. Worth a look during the feel pass.

---

# ⚠️ Partially traced — top level verified, form shape not followed to its source

Honest coverage statement. For these the write is a variable or spread that I
traced to the immediate call site and confirmed the entity and surrounding
logic, but did **not** follow into the form component to enumerate every key.
None showed a signal of trouble; none is cleared with the confidence of the
groups above.

`#1 Questionnaire(GamesManager)`, `#2 Hotel`, `#5 Invitation(Studio)`,
`#7/#10-15 Vendor` (4 paths incl. spreads), `#13 VendorLog`, `#14 VendorTask`,
`#17 Table` (2 sites), `#19 WeddingDetails.avaStudioMilestones`,
`#20 WeddingDetails :: var payload` (10 sites across 5 studio/onboarding pages),
`#21 Budget :: var itemData`, `#22 WeddingDetails :: var plaintext`,
`#23/#24 WeddingDetails EventDetails`, `#25 LiveStream`, `#26 GuestMessage`,
`#27/#28 MoodboardItem`, `#29-32 Music/WeddingDetails`, `#34 Task spread`,
`#35/#36 StoryMilestone`, `#37 Photo`, `#38 WeddingDetails :: var details`,
`#39-41 RegistryItem/CustomGift/RegistryProduct`, `#43 Note :: var updates`,
`#44 VowSpeech`, `#46 WeddingDetails :: __spread_details__`.

The highest-value follow-up in this group is **#20 `var payload`** — ten sites
across `AvaStudioAssets`, `AvaStudioWebsite`, `Onboarding`, and `StudioWebsite`,
all writing `WeddingDetails`. `AvaStudioAssets` writes `assetContent`, which is
declared **three levels deep** (`assetContent.menuCard.{starterItem, mainItem,
dessertItem, drinkItem, footerNote}`), and a leaf key outside that set is
dropped silently. The scanner cannot see three levels down through a variable.
That is the most likely place for the next `Note.status`.

---

# Summary

| Verdict | Paths |
|---|---|
| 🔴 Live silent-drop bug | **2** (`create_schedule`, `create_budget_item`) + 1 dynamic-entity warning |
| 🟡 Class-level note, not a bug today | 3 sites (full-record echo) |
| ✅ Verified false positive | 23 paths |
| ⚠️ Partially traced, no trouble signal | 20 paths |

**The scanner's structural blind spot**, worth recording: it cannot see through a
variable, a spread, or past the first level of a nested object. Every finding in
this file that mattered came from reading the code, not from the tool. The tool's
value is that it produced a bounded list of 46 places worth reading — and one of
them was real.
