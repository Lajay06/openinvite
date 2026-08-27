# SEATING — THE NUMBERED DECISIONS

**Rescued from code comments before the code that documents them is deleted.**

`Seating.jsx` carries a numbered decision series that exists **nowhere else**.
Wave 2 deletes the Copy layout feature, which is the only record of decision #3.
Deleting the implementation would delete the reasoning.

> A decision recorded only in the code that implements it dies with that code.
> — STANDING-RULES.md

Two are found in the file; **#2 was recovered from git history** and turns out
to be alive and well in another module. See below — the gap was a relocation,
not a loss.

---

## Decision #1 — the guest pool for an event

**Still implemented.** `Seating.jsx:305`.

> Invited AND (yes OR pending). Declined and not-invited are excluded
> **outright, not just filtered**. "Attending only" narrows to yes, for
> late-stage cleanup.

The distinction that matters: *excluded outright* rather than *filtered* means
a declined guest cannot reappear by changing a view toggle. The toggle narrows
an already-safe pool; it does not widen it.

---

## Decision #2 — Guest.table_assignment stays scoped to Reception only

**FOUND. It was not lost — it was relocated.**

`git log -S` on the origin commit `ea594ec` ("Add multi-event seating: event
tabs, per-event guest pools, copy layout") recovered it:

```js
// Guest.table_assignment stays scoped to Reception only (decision #2)
// — other events' seating is visible inside this page's own tabs.
if (resolveEventId(table) === RECEPTION_EVENT_ID) {
  await Guest.update(guestId, { table_assignment: table.name });
}
```

**The constraint still holds today**, and it now lives somewhere better: the
file header of `src/lib/tableAssignment.js`, which is the single write path for
"which table is this guest at", enforced through `propagateTableRename`.
`Guest.table_assignment` is a denormalized display cache; scoping it to
Reception is what stops one event's seating overwriting another's in the guest
list's Table column.

**What actually happened:** a refactor moved the reasoning into a shared
module's header — a strictly better home than an inline comment — and dropped
the number on the way. The reasoning survived; only the label vanished.

### Why this changes how worried to be

The hole in the numbering was read as evidence that a decision had already been
lost before anyone was watching. **It was not.** It is evidence of something
milder and more common: reasoning migrating to a better location while its
identifier is discarded.

That is still worth a sweep — a decision whose number no longer exists cannot be
cross-referenced, and nobody can tell from `Seating.jsx` that #2 has a home —
but it is a naming problem, not a loss. **The search cost one command and
converted a worrying inference into a mild one.**

---

## Decision #3 — Copy layout copies tables, never guest assignments

**Implementation deleted in Wave 2.** Was `Seating.jsx:401`.

The rule, in full, as the code expressed it:

1. **Tables only, never guest assignments.** The copy explicitly wrote
   `assigned_guests: []` on every created table — seating one event's guests
   into another event's tables would be a silent, wrong assumption about who is
   coming to what.
2. **Only offered into an empty tab.** `canCopyLayout` required
   `eventTables.length === 0` — the control did not appear if the target event
   already had tables.
3. **Never overwrites.** Following from (2): there was no merge, no replace, and
   no confirmation dialog to get wrong, because the only reachable case was an
   empty target.

**Why it is worth keeping after the feature is gone:** if table-copying is ever
rebuilt, these three constraints are the ones that made it safe. The dangerous
version of this feature — copy tables *with* their guests, into a tab that
already has some — is the obvious version, and (1) and (2) are what somebody
previously decided against.
