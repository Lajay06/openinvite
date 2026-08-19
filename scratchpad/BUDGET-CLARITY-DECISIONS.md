# Budget clarity — decision points for ruling

Report only. No code until rulings. 2026-08-19.
Companion to `BUDGET-CLARITY-SPEC.md`, which holds the diagnosis; this holds
the choices.

---

## The finding that reframes everything

The two "budgets" do not merely disagree in principle. Measured on the live
fixture:

| Number | Value | Source |
|---|---|---|
| `plan.total` | **$154,000** | Store A (encrypted) |
| `sum(plan.categories)` — shown as "Allocated" | **$126,500** | Store A, 8 keys |
| "Remaining" under the plan input | **$27,500** | derived |
| `sum(ledger.budgeted_amount)` — the stat "Total budget" | **$154,000** | Store B, 13 rows |
| money in ledger categories the plan has no field for | **$27,500** | Store B |

**The plan's $27,500 "Remaining" is exactly the money sitting in the five
categories the plan cannot represent** — beauty, decorations, miscellaneous,
rings, stationery. The couple has allocated every dollar. The page tells them
they have $27,500 spare *because the plan has nowhere to put it.*

So decision 2 (category mismatch) **causes** decision 3 (phantom "remaining").
They are one bug wearing two labels, and ruling on 2 largely settles 3.

---

## 1. The two-stores problem

**Evidence.** Store A: `WeddingDetails.budget`, AES-256-GCM ciphertext of
`{total, categories}`, written only through `api/my-wedding-details`
(`field: 'budget'`, gated by `WRITABLE_FIELDS`). Store B: the `Budget` entity,
13 owner-scoped rows written directly from the browser. The stat strip reads
**only B**. The plan input reads and writes **only A**. Nothing reconciles them;
that they both read $154,000 today is coincidence.

**Options.**

- **(a) One store with two views.** Delete Store A; derive the plan from Store B
  rows (a row per category with `budgeted_amount` and no `actual_amount` is a
  plan line). One truth, no sync.
  *Existing data:* the 8 plan categories must be migrated into Budget rows, or
  they vanish. Rows already exist for all 13 categories, so this is a merge, not
  a create — and merging risks double-counting if a plan category and a ledger
  row both exist. **They do today.**
- **(b) Two stores, explicit sync.** Keep both; the plan writes A, and saving
  the plan reconciles B (or vice versa). Preserves the encrypted-at-rest
  property for planning figures.
  *Existing data:* untouched. The sync must decide a winner on conflict, which
  is a rule someone has to author.
- **(c) Two stores, no sync, but named honestly.** Keep both, never reconcile,
  and make the page state plainly that "plan" and "committed" are different
  numbers — showing both, always, with a divergence line.
  *Existing data:* untouched. Zero migration risk.

**Recommendation: (c) now, (a) later if ever.** (c) is the only option that is
purely presentational, needs no migration, and cannot lose a number. (a) is the
right end state architecturally but it is a data merge on money, which is the
worst category of migration to do speculatively. (b) buys the complexity of two
stores plus the complexity of a sync rule and the failure modes of both.

## 2. The category mismatch — 8 plan vs 13 ledger

**Evidence.** `BUDGET_CATEGORIES` (plan) has 8; `CATEGORIES` (ledger filter) has
13. The five plan-less ones hold **$27,500 of real allocations today**, all
invisible to the planning half.

**Options.**

- **(a) Plan adopts the ledger's 13.** The plan grows five fields. Every dollar
  becomes representable and the phantom "remaining" disappears on its own.
- **(b) Unify to one list** used by both, whatever its length. Same as (a) in
  practice, since the ledger's list is the superset.
- **(c) Map between them** — plan keeps 8, ledger's extra five roll into a
  displayed "outside your plan" grouping.

**Recommendation: (a).** It is the smallest change that makes the numbers stop
lying, and the superset already exists — nothing new is invented. (c) is the
cheap version and I'd take it only if (a) is blocked, because it institutionalises
the gap rather than closing it.

**Schema impact: none in Base44's sense** — see decision 5.

## 3. "Remaining" meaning two things 40px apart

**Evidence.** Under the plan input: *"Allocated: $126,500 · Remaining: $27,500"*
= budget not yet **assigned to a category**. In the stat strip: *"Remaining
$48,550"* = budget not yet **spent**. Same word, ~40px apart, neither qualified.

**Options.** Which meaning keeps the bare word:
- **(a) Spending keeps "Remaining"** (the stat strip); the plan's becomes
  **"Unallocated"**.
- **(b) Planning keeps it**; the stat becomes "Unspent".

**Recommendation: (a).** "Remaining" in everyday budget language means money
left to spend, and the stat strip is the glanceable surface. "Unallocated" is
also the more accurate word for what the plan number actually is.

**Note:** if decision 2 goes to (a), the plan's unallocated figure becomes $0 on
this fixture and the number largely stops appearing — which is the correct
outcome, not a reason to skip renaming it.

## 4. "Budget used" — the self-referential ratio

**Evidence.** `percentageUsed = totalSpent / totalBudgeted`, **both from Store
B**. It never consults the couple's stated plan. A couple with a $154,000 plan
and two logged expenses sees a percentage of those two expenses.

**Options for the denominator.**
- **(a) The plan total** ($154,000) — "68% of your plan".
- **(b) Committed** (sum of ledger `budgeted_amount`) — today's behaviour, but
  labelled.
- **(c) Show both**, e.g. "spent $105,450 of $154,000 planned".

**Recommendation: (c), falling back to (a).** The honest denominator is the one
the couple set, and stating both numbers removes the need to explain the ratio
at all. Whichever is chosen, **the label must name the denominator** — an
unqualified percentage is the actual defect here, not the arithmetic.

## 5. Does any of this touch the encrypted field's shape?

**This is the one that needs an explicit ruling.**

**Evidence.** `budget` is in `ENCRYPTED_FIELDS` in `api/my-wedding-details.js`.
Base44 stores it as `type: "string"` — **the `{total, categories}` shape lives
entirely inside the ciphertext and is opaque to Base44.**

Consequences:
- **No Base44 schema change is required** to add categories. The declared type
  stays `string`. This is *not* a declare-first schema item in the usual sense.
- **But it is a payload-contract change**, and two things must be coordinated:
  1. `api/my-wedding-details.js` re-encrypts whatever object it is given, so it
     needs no change — worth confirming rather than assuming.
  2. **Existing ciphertext holds the 8-key shape.** New code reading an old row
     gets `undefined` for the five new keys. Tolerable if the reader defaults
     them to null; a silent zero if it does not.
- The **mixed-row reader** matters too: legacy *plaintext* rows (object-shaped)
  still pass through, so any shape assumption must hold for both plaintext and
  decrypted values.

**Recommendation:** proceed on the basis that this is a **payload change, not a
schema change** — but the advisor should rule explicitly, because it touches
`api/` territory and my reading of "no Base44 change needed" is exactly the kind
of inference that has been wrong before in this project. **Do not let me act on
it unconfirmed.**

If the ruling is "presentation only" (decision 1c + decision 2c), **nothing
touches the encrypted field at all** and this question disappears.

## 6. UI proposal, and what survives

**One paragraph.** The page keeps its four tabs and its stat strip, but the strip
stops using the ambiguous word: it becomes **planned · committed · spent ·
unspent**, four numbers that cannot be confused with one another, with "budget
used" restated as *"spent $105,450 of $154,000 planned"* rather than a bare
percentage. Directly beneath the plan input, the "Allocated / Remaining" line
becomes a **reconciliation line** that shows planned against committed and says
so when they diverge, replacing a number that currently reads as slack with one
that reads as a comparison. Everything else — the expense list, the chart, the
forecasting tab, the add-expense flow — is untouched.

**Components that survive unchanged:** `BudgetList`, `BudgetChart`,
`BudgetForecasting`, `BudgetForm`. **Changed:** the stat-card array and the
plan-input footer in `Budget.jsx`, both presentational.

---

## What is La's taste, not correctness

These wait for him; they should not be ruled on this report:

- **The four stat labels themselves** — "planned / committed / spent / unspent"
  is my wording, not a derived truth. The requirement is only that no two cards
  can be read as the same quantity.
- **Whether the reconciliation line is always visible or only on divergence.**
  Always-visible is more honest; only-on-divergence is calmer. Both are
  defensible and it is a feel decision.
- **Whether "budget used" survives as a percentage at all.** Replacing it with a
  sentence is my preference; a couple may well want the single glanceable number.

## What is correctness, and can be ruled now

- Two numbers 40px apart must not both be called "remaining" (decision 3).
- A percentage must name its denominator (decision 4).
- $27,500 of real allocations must not be invisible to the planning view
  (decision 2).
- Whether the encrypted payload's shape may change (decision 5) — and my
  reading of it must be confirmed, not trusted.
