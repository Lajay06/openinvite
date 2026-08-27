# TICKET — find every decision recorded only in a code comment

**Report-first. Later, not now.**

## Why this exists

Deleting the Copy layout feature would have deleted **decision #3** — "tables
only, never guest assignments" — because a code comment was its only record
anywhere in the repo. It was rescued into `SEATING-DECISIONS.md` as its own
commit, before the code moved.

That prompted a second question: **is `Seating.jsx` the only file doing this?**
A numbered decision series living exclusively in one file's comments is unlikely
to be unique, and every entry in it is one deletion away from vanishing.

## What the decision-#2 search established

`Seating.jsx` carries #1 and #3 and **not** #2. The initial inference was that
#2 had already been lost before anyone was watching.

**That inference was wrong, and the correction is the useful part.** One
`git log -S` against the origin commit recovered it: `Guest.table_assignment`
stays scoped to Reception only. The constraint **still holds** — it moved into
`src/lib/tableAssignment.js`'s file header, a strictly better home, and lost its
number on the way.

So the failure mode this sweep should look for is **not** mainly "reasoning
deleted". It is:

1. **Relocation without the label** — the reasoning survives somewhere better,
   but the number no longer resolves and nothing cross-references it. (Confirmed:
   decision #2.)
2. **Reasoning that exists in exactly one comment, in code that could be
   deleted.** (Confirmed: decision #3, rescued just in time.)

Both are real. Only the second loses information, and only the first is common.

## Scope when it runs

- Numbered decision markers: `decision #N`, `decision N`, `DECISION:`
- Unnumbered but load-bearing: "deliberately", "on purpose", "do not remove",
  "we chose", "ruled", "NOT a bug"
- For each: does the reasoning exist anywhere outside the code that implements
  it? If not, it is one deletion from gone.
- Prefer `git log -S` before concluding anything is lost. **It cost one command
  and converted a worrying inference into a mild one.**

## The rule this serves

> A decision recorded only in the code that implements it dies with that code.
> — STANDING-RULES.md
