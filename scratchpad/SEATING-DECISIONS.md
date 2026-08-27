# SEATING — THE NUMBERED DECISIONS

**Rescued from code comments before the code that documents them is deleted.**

`Seating.jsx` carries a numbered decision series that exists **nowhere else**.
Wave 2 deletes the Copy layout feature, which is the only record of decision #3.
Deleting the implementation would delete the reasoning.

> A decision recorded only in the code that implements it dies with that code.
> — STANDING-RULES.md

Two are found in the file. **#2 is absent** — either it was never written down,
or it lived in code already deleted. That gap is itself worth recording: a
numbered series with a hole in it is evidence that this has happened before.

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

## Decision #2 — NOT FOUND

No comment in `Seating.jsx` carries it. Recorded as missing rather than assumed
never to have existed.

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
