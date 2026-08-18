# Phase 0 — `meal_choice` enum widening

Prepared 2026-08-18 against main `bf4768f`. **Report only. No code, no schema.**

---

## 1. The blocker, stated exactly

Custom menus are **already built** and already half-working:

- `WeddingDetails.mealOptions` exists — couple-defined `{id, label}` pairs,
  Ultra-only, "Menu Phase 1", edited on Food & beverage.
- `RSVPPage.jsx:462` already prefers `wedding.mealOptions` over the defaults.
- `mealOptionLabel(id, mealOptions)` resolves any id, falling back to the six
  defaults and then to the raw stored value, so a renamed or deleted option
  never renders blank.

What blocks it is one line of schema. `Guest.meal_choice` and
`Guest.plus_one_meal_choice` are declared as an **enum of exactly six ids**:

```
beef · chicken · fish · vegetarian · vegan · kids_meal
```

A couple-defined option's id is `` `${Date.now()}-${random}` ``
(`FoodBeverage.jsx:33`) and is **not** in that enum, so it cannot be stored in
those two columns. `GuestForm.jsx:135` already documents this and defers it:
*"widening that enum is a schema change and belongs with the schema owner
before any couple defines a custom menu."*

This report is that referral.

---

## 2. The inconsistency that already exists

Three columns store the same kind of value under three different contracts:

| field | type today | accepts a custom id? |
|---|---|---|
| `Guest.meal_choice` | **enum of 6** | **no** |
| `Guest.plus_one_meal_choice` | **enum of 6** | **no** |
| `Guest.event_responses[].meal_choice` | free `string` | yes |
| `RsvpResponse.meal_choice` | free `string` | yes |

So the **per-event and RSVP paths already work with custom menus**; only the
two flat columns do not. A guest answering through the RSVP form writes to
`RsvpResponse` / `event_responses` and would be fine. A couple editing that
same guest in `GuestForm` writes the flat column and would be rejected.

That asymmetry is the actual defect. Widening the enum is one way to resolve
it; §4 argues for a different one.

---

## 3. Consumers — the full inventory

**89 references across 23 files.** They divide cleanly.

### Writers (4 sites, 2 real)

| site | writes | via |
|---|---|---|
| `GuestForm.jsx:206` | `meal_choice` | couple editing a guest |
| `GuestForm.jsx:360` | `plus_one_meal_choice` | same |
| `api/rsvp-submit.js:85,160` | per-event `meal_choice` | guest RSVP → `RsvpResponse` (free string, unaffected) |

Only **GuestForm** writes the enum columns. Everything else writes the free-
string paths.

### Readers — and the good news

**No consumer is keyed to the six literals.** Every read goes through
`mealOptionLabel()` or `effectiveMealChoice()`:

- `GuestList.jsx:586,1060` · `Guests.jsx:515,520` (CSV export) ·
  `avaContext.js:88` · `PlaceCardsPreview` · `seatingChart` · `attendees.js`
- `RSVPPage.jsx:462` builds its radio list from `mealOptions || DEFAULT_MEAL_OPTIONS`

`weddingEvents.js` is the single source of the six, and it is a **fallback
list, not a validator** — `mealOptionLabel` returns the raw value for anything
unrecognised. So the UI is already custom-menu-ready; nothing switches on
`=== 'beef'`.

### Precedence (`effectiveMealChoice`, `weddingEvents.js:192`)

reception event → any answered event → **flat column as last-resort fallback**.

The flat column is already the *least* authoritative source. That matters for
§4.

---

## 4. What widening means for existing rows — and the shape I propose

### Live data today

| | |
|---|---|
| `WeddingDetails` rows | 21 |
| **with a non-empty `mealOptions`** | **0** |
| `Guest` rows with `meal_choice` set | 119 |
| distinct values stored | exactly the six defaults, nowhere else |
| `event_responses` meal values | the same six |
| `RsvpResponse` rows / distinct meals | 1000 / the same six |

**No custom menu exists anywhere yet, and no stored value is outside the six.**
So any of the three shapes below is a no-op for existing data — nothing to
migrate, nothing to backfill. This is the cheapest possible moment, exactly as
`GuestForm`'s comment anticipated.

### The three shapes

**(a) Widened enum.** Add the couple's option ids to the enum.
*Not viable.* Custom ids are generated at runtime per wedding; an enum is a
fixed list in one shared schema. There is no set of literals to widen it to.
Ruled out on mechanics, not preference.

**(b) Free string** — match `event_responses[].meal_choice` and
`RsvpResponse.meal_choice`. **Recommended.**

- Makes all four columns one contract instead of three.
- Zero migration: every stored value is already a plain string that happens to
  be one of six.
- The validator that matters already exists and is *not* the schema —
  `GuestForm` renders a `<Select>` whose options come from
  `mealOptions || DEFAULT_MEAL_OPTIONS`, so a couple can only pick a real
  option. The enum is enforcing a constraint the UI enforces better, because
  the UI knows about that wedding's menu and the schema cannot.
- **What is genuinely lost:** the schema stops rejecting a garbage value
  written by something other than the form. Today that protection is real but
  narrow — `GuestForm` is the only writer, and it cannot produce a bad value.

**(c) Enum plus custom values** — a union of the six plus a free string.
Base44 supports union types (`["string","null"]` is used across Guest). But a
union of *enum-or-any-string* is just "any string" with extra words: it accepts
everything (b) accepts and documents less clearly. It would only be worth it if
the six needed to remain machine-distinguishable from custom ids, and nothing
in the codebase makes that distinction — `mealOptionLabel` treats them
identically.

### Recommendation

**(b), for both `Guest.meal_choice` and `Guest.plus_one_meal_choice`**, with
descriptions that carry the contract the enum used to imply:

> Menu option id — an id from this wedding's `WeddingDetails.mealOptions`, or
> one of the six `DEFAULT_MEAL_OPTIONS` ids when the couple has not defined a
> menu. Stored as an id, never a label, so renaming a menu option never
> orphans a stored answer; resolve for display with
> `mealOptionLabel()` (`src/lib/weddingEvents.js`), which falls back to the
> defaults and then to the raw value. Free string rather than an enum because
> couple-defined ids are generated per wedding at runtime and cannot be
> enumerated in a shared schema — matching `RsvpResponse.meal_choice` and
> `event_responses[].meal_choice`, which have always been free strings. The
> real validation is the `<Select>` in `GuestForm`, which offers only this
> wedding's own options.

---

## 5. Does the RSVP flow stay consistent?

Yes, and it becomes *more* consistent than it is now.

- The RSVP form already writes free strings, already reads `mealOptions`.
  Nothing changes for it.
- `effectiveMealChoice` already prefers the per-event value over the flat
  column, so a guest's own answer already wins over the couple's stored one.
  Widening the flat column does not alter that precedence.
- After the change, a couple assigning a custom menu option in `GuestForm` and
  a guest choosing one in the RSVP form write **the same id into columns with
  the same contract**. Today the first is impossible.

**One thing this does NOT fix, and should be named:** `Guest.meal_choice` and
`event_responses[].meal_choice` can still disagree, because they are different
facts (a couple's pre-fill versus the guest's own answer). `effectiveMealChoice`
resolves that by precedence, and this change does not touch it. If we ever want
them reconciled rather than layered, that is a separate decision.

---

## 6. Verification plan

Modest, because the change is one declaration and there are no rows to migrate.

1. **Declare-first**, then a gotcha #5 probe: confirm the fields still read
   back, write one of the six, write a `${Date.now()}-…`-shaped id, confirm
   **both** persist, revert. That second write is the whole point — it is
   rejected today.
2. **CI**: a test asserting no source file switches on a meal literal, so the
   "nothing is keyed to the six" property stays true as custom menus land.
3. **Round trip on the fixture**: define a custom menu option on
   `WeddingDetails.mealOptions`, assign it to a guest through `GuestForm`,
   confirm it stores and that `GuestList`, the CSV export and Ava's context all
   render its **label** rather than the raw id. Then remove the option and
   confirm the stored id degrades to itself rather than to blank.
4. **Mirror synced in the same PR** (RULE 12).
5. Build · CI · marketing-routes.

---

## 7. Summary

| | |
|---|---|
| blocker | `Guest.meal_choice` / `plus_one_meal_choice` are a fixed enum of six; custom option ids are runtime-generated and cannot be enumerated |
| already built | `mealOptions`, `mealOptionLabel`, RSVP form support, id-not-label storage |
| consumers keyed to the six literals | **none** — every read goes through `mealOptionLabel` |
| writers of the enum columns | **one** (`GuestForm`), and it cannot produce an invalid value |
| rows needing migration | **0** — no custom menu exists, every stored value is one of the six |
| proposed shape | **free string**, matching the two columns that already are |
| needs from you | the two declarations, declare-first |
