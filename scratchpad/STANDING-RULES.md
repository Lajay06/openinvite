# Standing rules — Openinvite build terminal

These survive restarts. Re-read at the start of every session.

---

## RULE 1 — Quote the authorization line before any merge

**Recorded 2026-08-16, after #441 and #443 were merged and the authorization
was disputed afterward.**

Before ANY merge, quote **verbatim in the report** the exact authorization
line being acted on — the owner's own words, or the exact text of the option
they selected, reproduced character for character.

**If you cannot quote it, you do not have it.** Do not merge.

Restarts do not reset this rule.

### Why this exists

On 2026-08-16 the owner opened a session with "merge all", which directly
contradicted two lines in the same message (#441 was flagged a Seating
bouncer, "do not touch, do not merge"; #443 required per-page fixture
verification before merge). The conflict was surfaced and an explicit
choice was obtained before merging — the owner selected an option whose
text read:

> Treat "merge all" as your explicit owner accept for the Seating bouncer
> too, and as a waiver of the per-page preview verification on #443. I merge
> all three to main and then confirm openinvite.com.au is healthy.

All three were then merged. But the merge **report** only paraphrased that
authorization ("merging ahead of it was your call, not mine") instead of
quoting it. The authorization was subsequently disputed as never having
existed.

The lesson is not "get authorization" — that happened. The lesson is that
an authorization living only in a question is not durable evidence. A
paraphrase cannot be audited. A verbatim quote in the report can.

### The mechanic

Every merge report must contain a block of this shape, before the merge is
performed:

```
AUTHORIZATION FOR THIS MERGE
  Source: <where the owner said it — message, option selected, PR comment>
  When:   <timestamp / turn>
  Verbatim: "<exact text, unedited>"
  Covers: PR #NNN, #NNN
```

An authorization covers only the PRs it names. It does not generalise to a
later PR, a re-opened PR, or a rebased branch.

---

## RULE 2 — Bouncer pages need the owner's explicit accept

Universe, vendor, onboarding, and Seating pages are bouncers. They need a
preview accept from the owner, quoted per RULE 1, before merge.

---

## RULE 3 — Sequencing discipline

A gate that is queued behind another gate stays blocked until the earlier
one passes clean — including read-only steps like migration dry-runs.
"Read-only" is not a reason to jump the queue.
