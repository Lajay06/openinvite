# Guest encryption family — closing report

Closed 2026-08-18 against production `503e46e`. All three views run against the
same deployed build, after the Track D completion fix.

---

## What the family set out to fix

`Guest.read` RLS is `null`, and cannot be scoped: six server readers use the
admin key, and the anonymous ones — a guest clicking an invitation link, a cron
— have no caller session to switch to, so an owner-scoped rule would answer
them 200-with-empty-array and break silently (gotcha #1). Any authenticated
account could therefore list **206 Guest rows carrying name, email and phone**.

Encryption at rest was the only lever available, and it needed every read and
every write to move server-side first.

---

## The closing probe — 19 legs, one build

### 1. Attacker view — an unrelated authenticated account

| assertion | result |
|---|---|
| rows listable by a non-owner | 206 |
| rows leaking any of the nine | **0** |
| every `name` is the placeholder `—` | **0 not placeheld** |
| rows carrying undecryptable ciphertext | 205/205 |
| exception set is **exactly** the pinned id | `["6a584d473aa3ab1ec180fcdc"]` |

The exception assertion is enumerated, not "zero" and not "some": if a second
unwritable row ever appears, it fails.

### 2. Couple view — production dashboard

202 guests returned, **202/202 with real decrypted names**, 201 emails. An edit
lands and reloads, the dietary edit **rewrites the blob**, other fields survive
the rebuild, and — the leg that matters most — an **independent re-read**
confirms the nine are still null and `name` is still the placeholder after the
write. The revert does not resurrect either.

### 3. Guest view — unauthenticated paths

RSVP link recovery and RSVP resolution both work. Song-request and
email-me-my-link both reach Turnstile (HTTP 400), which is the correct
observable for a scripted request and proves their guest lookups did not crash.

**The attendee list needed a second pass.** It returned zero, which I flagged
rather than accepted. The cause was configuration — `showAttending` is `false`
on the fixture, so the endpoint returns early before touching guest data. With
the setting briefly enabled: **121 attendees, all real decrypted names**
(`"Hyunwoo R."`, `"Maeve C."`, `"Sora K."`), zero placeholders. Setting restored
to the exact original.

---

## What went wrong, and what caught it

**Track D shipped incomplete.** The readers were converted and the columns
nulled, but `buildGuestWriteFields` still carried Track C's dual-write, so every
edit through the endpoint silently re-populated the plaintext columns Track D
had just cleared. My own Track C commit message had asserted "Track D stops
writing the plaintext half". It did not.

**The closing probe found it, via its own damage.** Two probe edits resurrected
one guest's name, email and phone. That row was remediated through the guarded
script.

Three further defects surfaced while fixing it:

1. **The nulling script was not re-run-safe.** Its predicates assumed the
   pre-null state: `name` is `—` after a successful pass, which is non-empty,
   so a second run saw all 205 rows as unprocessed and then aborted at 1/205
   comparing the blob's real name against the placeholder.
2. **A test passed for the wrong reason.** The dual-write assertion checked
   `patched[f] !== undefined`, and `null` satisfies that, so it kept passing
   after the behaviour it named was deleted — reading as validation of the new
   contract while asserting the old one.
3. **The pins covered readers, not writers.** #476's guards could not have seen
   this bug; it lived entirely in the write path.

The lesson is narrower than "test more". A probe that only asks *did the
attacker lose access* would have passed at every point, including while the
writer was actively re-leaking. **It was the admit path — the couple's own edit,
followed by an independent re-read — that exposed it.**

---

## Standing state

| | |
|---|---|
| Guest rows app-wide | 206 |
| carrying `encrypted_guest_pii` | 205 |
| exposing any plaintext PII | **1** — the pinned unwritable row |
| that row's `name` | `__PERSISTENCE_TEST_ADMINKEY_CREATED_BY_CHECK__` — a harness sentinel, not a person |
| that row's nine columns | 0 populated |

**The honest claim is not "no plaintext PII remains."** It is: no plaintext PII
remains on any row the product can write, and exactly one unwritable
harness-created row retains a sentinel string in `name`. That row is erasure
ledger instance 5 and joins the hosted-functions rebuild list — `asServiceRole`
is the only thing that will ever make it writable.

---

## CI pins left behind

| pin | catches |
|---|---|
| `guest-plaintext-readers.mjs` | a reader taking PII off a raw Guest row |
| `guest-pii-blob.mjs` — writer pin | an edit resurrecting plaintext; the endpoint bypassing the write path |
| `guest-protected-fields.mjs` | a passthrough writing a protected field, and over-stripping lawful ones |
| `rls-comment-claims.mjs` | a comment asserting an RLS property the schema contradicts |

Every one was mutation-tested. Two had to be rewritten because the first
version passed against the bug it existed to catch.

---

## Not done, deliberately

- `ReceivedGift.giver_email` and `GuestMessage.guest_email` — deferred with
  recorded triggers: revisit if either read rule is loosened, or before either
  table takes its first real row. Both are currently empty and owner-scoped.
- `rsvp_note` / `song_request` on Guest — dead fields, superseded by the
  RsvpResponse overlay. Cleanup, not encryption.
- The ten legacy columns remain **declared**. Undeclaring is a separate
  post-family cleanup; undeclaring alone does not erase stored data (gotcha #5),
  which is why Track D nulled explicitly.
- Whether `name` should stop being `required` — deferred to that same cleanup.
