# Budget page — clarity spec

Report only, per lane rules. No code. 2026-08-19.

---

## A correction first: the discrepancy I flagged is not real

I reported the Budget stat strip reading **$12,686** while the plan input read
**$154,000**, and the advisor recorded it as a correctness item. **It was not a
discrepancy.** Measured against live data, both stores agree:

| Source | Value |
|---|---|
| `sum(Budget.budgeted_amount)` over 13 line items — the stat strip | **$154,000** |
| `WeddingDetails.budget.total` — the plan input | **$154,000** |

`$12,686` was `CountUp` **mid-animation**. The counter runs 0 → target over
1200ms, and my screenshot landed partway.

**This is the third time an animated number has produced a false reading in my
reports** — Schedule showed "1 event" (real: 20), Music showed "Song requests 0"
(real: 3), Budget showed $12,686 (real: $154,000). The pattern is worth its own
note: **a screenshot of this dashboard is not evidence of a number.** Any numeric
claim has to come from the data layer or from a render taken after the animation
settles. I have been treating screenshots as authoritative for values they are
structurally unable to establish.

There is a real UX consequence, which belongs in this spec rather than being
dismissed: for 1.2 seconds after every load, every headline figure on this page
is **wrong and confidently rendered**. A couple glancing at their budget during
that window reads a number that was never true.

---

## What "clarity" means here

The page is not unclear because it is ugly. It is unclear because **two
different things are both called "budget"**, and the page never says which is
which.

### 1. Two stores, two meanings, one word

| | The plan | The ledger |
|---|---|---|
| Stored in | `WeddingDetails.budget` (AES ciphertext) | `Budget` entity, 13 rows |
| Written by | the "Total wedding budget" input + 8 category fields | Add expense / expense rows |
| Means | what we intend to spend | what we have actually committed |
| Surfaced as | "Total wedding budget ($)" and "Allocated / Remaining" | the "Total budget" stat card |

They currently agree at $154,000, which is **coincidence, not invariant** —
nothing reconciles them. A couple who edits the plan input without touching line
items makes the stat strip disagree with the field directly above it, and the
page will present both without comment.

### 2. "Remaining" means two different things on one screen

- Under the plan input: *"Allocated: $126,500 · Remaining: $27,500"* — budget
  **not yet assigned to a category**.
- In the stat strip: *"Remaining $48,550"* — budget **not yet spent**.

Same word, two definitions, ~40px apart. Neither is labelled.

### 3. The category lists do not match

`BUDGET_CATEGORIES` (the plan) has **8**: venue, catering, photography, flowers,
music, attire, transport, honeymoon.
`CATEGORIES` (the ledger filter) has **13**: those plus decorations, rings,
stationery, beauty, miscellaneous.

So five categories can hold real expenses that the plan has no field for. Money
spent on rings is invisible to the planning half of the page.

### 4. "Budget used 68%" is a ratio of the ledger against itself

`percentageUsed = totalSpent / totalBudgeted`, both from the Budget entity. It
never consults the couple's stated plan. A couple who has entered a $154,000
plan and logged $500 of expenses sees "100% used" if those are their only two
line items.

---

## Proposed design

**Principle: name the two things, and never let one silently stand in for the
other.**

1. **Rename at the surface.** "Your plan" for the intended budget; "Your
   spending" for the ledger. The words "Total budget" disappear, because it is
   the ambiguous term.
2. **One reconciliation line, always visible:** plan $154,000 · committed
   $154,000 · spent $105,450. Three numbers, three labels, one row. When plan
   and committed diverge, that is the page saying so rather than the couple
   discovering it.
3. **Disambiguate "remaining"** — "unallocated" for the plan half, "unspent" for
   the ledger half.
4. **Reconcile the category lists**, or state the gap. Either the plan grows to
   13 fields, or the ledger shows an "outside your plan" grouping for the five
   that have no plan field. The second is less work and more honest.
5. **"Budget used" becomes explicit about its denominator** — "68% of committed"
   or "68% of plan", whichever is chosen, but stated.
6. **Settle the numbers before showing them.** Either skip the count-up on this
   page, or render the final value immediately and animate only on change. A
   figure that is wrong for 1.2s is worse here than anywhere else in the app,
   because this is the page people screenshot for their own records.

---

## Verification plan

**Data-layer, not screenshots** — given the animation finding, every numeric
assertion is read from the API or the DOM after settle, never from an image.

1. Plan and ledger agreeing: the reconciliation line shows three equal-ish
   numbers, no warning.
2. Plan and ledger **disagreeing** (edit the plan input only): the line shows the
   divergence and the page does not present either as "the" budget.
3. An expense in a plan-less category (rings): appears in the ledger and in the
   "outside your plan" grouping, not silently dropped.
4. "Unallocated" and "unspent" are never both called "remaining" in the same
   viewport.
5. Count-up: after load, the DOM value equals the API value within one frame of
   settle; no intermediate value is ever the only thing rendered for >100ms.
6. Rendered at 1440 and 390, both states.

## Out of scope for this spec

Budget is not on the pack's excluded list, but `WeddingDetails.budget` is an
**encrypted field written through `api/my-wedding-details`** — so any change to
how the plan is stored or written touches `api/`, which is out of scope for the
autonomous pack. This spec covers presentation and labelling only; the
reconciliation line reads both stores and writes neither.
