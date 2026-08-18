# Guest encryption family — scoping REFRESH after Track E

Prepared 2026-08-18 against main `27eae00`. **Report only. No code, no rows.**
Supersedes the deltas in `GUEST-FAMILY-SCOPING-REPORT.md`; that document
remains the base and is still accurate where not contradicted here.

Every claim below was **re-verified live**, not carried forward.

---

## 0. What Track E changed, and what it did not

Track E removed one bearer capability from `Guest`. It did **not** touch the
PII, and the core exposure is unchanged:

> An unrelated authenticated account still lists **206 `Guest` rows**, and
> **206 of them carry name/email/phone**. Verified today, post-#468.

So the premise of the whole family holds. What Track E gives us is
infrastructure and evidence: a proven server-side crypto module, a proven
migration pattern (`retryPolicy.mjs`, gotcha #19 counting, `--expect-rows`,
verify-before-destroy), and a proven five-leg probe shape.

---

## 1. Track A — read indirection. Reader inventory re-verified

### The chokepoint is still exactly one

`src/lib/resolveMyWedding.js:147`

```js
const rows = await base44.entities[entityName].filter({ created_by_id: me.id }, sort);
```

Still dynamic-by-entity-name, still the single client read of `Guest`, still
wrapped by `getMyGuestsWithRsvp`. **Unchanged by #463 and #468** — neither PR
touched the read path.

### The lying header is still there, and is now doubly wrong

`api/my-guests-rsvp.js` claims at **two** places (`:29`, `:68`) that
`Guest.read` is owner-scoped. It is `null`. Track E added a second instance of
the same false claim in `collaborator-guests.js`, which #465 corrected in
place. **Track A kills both of my-guests-rsvp's**, as agreed.

Worth stating plainly: two files independently asserted a security property
that has never been true, and one of them is the endpoint whose entire purpose
is to be the safe read path. That is not a comment-hygiene problem; a reader
deciding whether Guest is safe to read directly would be actively misled.

### Server readers — unchanged, and the constraint is unchanged

Six read `Guest` with the **admin key** (`rsvpAuth`, `auth.js`,
`wedding-attendees`, `rsvp-link-request`, `song-request-submit`,
`send-weekly-digest`); one uses the caller's token (`my-guests-rsvp`).
Scoping `Guest.read` would 200-empty the six, and the anonymous ones have no
caller token to switch to. **Encryption at rest remains the only lever.**

---

## 2. Writer audit, both directions (gotcha #17)

### Direction A — client field-scoped writers

| file | writes | touches a PII field? |
|---|---|---|
| `pages/Guests.jsx` | 7 | **yes** — create ×2, and updates carrying `restGuestData` / arbitrary `updates` |
| `components/guests/ImportGuestModal.jsx` | 1 | **yes** — CSV import |
| `components/layout/AvaModal.jsx` | 2 | **yes** — forwards unbounded `action.data` |
| `lib/tableAssignment.js` | 6 | no — `table_assignment` only |
| `components/guests/SendInvitesModal.jsx` | 1 | no — invite bookkeeping |

**3 files, 10 writes** touch the blob's fields. Unchanged from the base report
(which counted 5 PII-touching writes across the same 3 files; the higher number
here is the same sites counted per-call rather than per-handler).

### Direction B — forwarding endpoints, the `collaborator-guests` class

This is the direction the base report under-weighted, and #465 proved why.

| endpoint | writes `Guest`? | credential | field-scoped? |
|---|---|---|---|
| `api/my-guest-links.js` | yes (`PUT`) | caller | **yes** — only the six token fields, built by `tokenPatch` |
| `api/guest-contact-review.js` | yes (`POST` + `PUT`) | caller | **yes** — allowlist: name/email/phone/mailing_address |
| `api/collaborator-guests.js` | yes (`PUT`) | admin | **forwards a caller field bag** — guarded by `stripTokenFields`, unreachable behind its 503 |
| `api/collect-guest-contact.js` | **no** — writes `GuestContactSubmission` only | — | n/a |
| `api/song-request-submit.js` | **no** — reads `Guest` only | — | n/a |

**One forwarding endpoint exists, and it is already the known one.** But its
guard is `stripTokenFields` — **token fields only**. Under the blob plan the
ten PII fields become equally protected values: a forwarded
`{name: "..."}` would write plaintext beside a stale ciphertext, and the
discriminator would say "migrated" while the row's real name sat in the clear.

**Track B must therefore widen that guard from token fields to
`PROTECTED_FIELDS` = token fields + the ten PII fields + `encrypted_guest_pii`
itself.** Same denylist reasoning, same admit-path test shape (lawful fields
survive), one broader list.

---

## 3. Blob design assumptions — re-checked

### Discriminator: still sound, and now precedented

`encrypted_guest_pii != null` remains a **boolean** discriminator, not a type
sniff. Track E validated the shape twice over: the `_hash`/`_enc` pair used
exactly this pattern across a 202-row migration, including a non-uuid legacy
value that any shape-based check would have stranded.

### Which key — recommendation: **`BASE44_ADMIN_KEY`**, not a new one

This is a change of emphasis from the base report, and the reasoning is Track
E's own.

`RSVP_TOKEN_KEY` earned its own key for a specific reason: RSVP tokens are
**externally distributed**, so a rotation would break links sitting in other
people's inboxes with no repair path. **Guest PII is not distributed.** It is
read back only by the couple through our own endpoints, so a rotation is a
re-encrypt migration we can run at will — disruptive, never unrecoverable.

Adding a third key would mean a third secret to manage, a third
three-environment setup, and a third rotation runbook, to protect against a
failure mode that does not exist here. `questionnaireCrypto.js` already keys
`RsvpResponse`, `PlanGift` and `GuestContactSubmission` off the admin key; this
belongs with them.

**If you prefer a dedicated key anyway, it gets the full `RSVP_TOKEN_KEY`
treatment** — generated and piped, all three environments, rotation hazard
documented — and I would want that decided at Track C, not discovered at
migration time.

### Dead fields — `rsvp_note`, `song_request`: confirmed dead

Both **0 populated** across all 206 rows today, and both superseded by the
`RsvpResponse` overlay (already AES-encrypted). Recommendation stands:
**cleanup, not encryption.** Encrypting a field nothing writes and nothing
reads adds a decrypt hop for no gain.

### Field census, re-measured today (deduped single fetch)

| field | populated |
|---|---|
| `name` | 206 |
| `email` | 201 |
| `phone` | 201 |
| `plus_one_name` | 40 |
| `plus_one_email` | 31 |
| `dietary_restrictions` | 23 |
| `plus_one_dietary_restrictions` | 5 |
| `mailing_address`, `special_requests`, `notes` | 0 |
| `rsvp_note`, `song_request` | 0 — dead |

**Ten fields in the blob**, three of them currently empty — which is the cheap
moment to include them, before any real data lands.

---

## 4. Migration plan — Track E's tooling from the start

206 rows. Not retrofitted: the script is written against the proven pattern on
day one.

- **Counting**: one large-limit fetch, deduped by id, abort if the row count
  reaches the fetch limit (gotcha #19). The `--expect-rows` guard is computed
  the same way, because a guard is only as good as its number.
- **Writes**: `scripts/lib/retryPolicy.mjs` — 150ms pacing, bounded 429-only
  retry with backoff. Not optional: the 202-row token migration took two 429s
  without it, and the row count here is the same order.
- **Idempotence**: fingerprint already-migrated rows at scan time, assert
  byte-identical afterwards. Resumability is not enough.
- **Dry run default**, `--execute` requires `--expect-rows`, verification by
  independent re-read.
- **No shape assumptions** on any field value.

Unlike Track E, the migration and the nulling can be **one script** here: the
blob write and the plaintext null are the same logical operation on the same
row, and splitting them would leave a window where a row has both. The
verify-before-destroy precondition still applies per row — assert
`decryptPayload(blob)` round-trips every one of the ten fields **before**
nulling that row, and abort the whole run on a single failure.

---

## 5. Sequence — what each PR proves before the next starts

| PR | change | what it must prove before the next begins |
|---|---|---|
| **A** | `api/my-guests.js` read endpoint; `getMyRecords('Guest')` routed through it; both lying headers killed | every consuming page still renders its guest list; fixture guest count identical before/after. **No crypto** — a break here is unambiguously the indirection. |
| **B** | the 3 PII-touching client writers moved server-side; `PROTECTED_FIELDS` guard widened on `collaborator-guests` with an admit-path test | create/import/Ava-edit still work end to end; lawful fields survive the widened strip (15+ asserted individually, mutation-tested) |
| **C** | declare `encrypted_guest_pii` (**via advisor, declare-first**); dual-write; read prefers blob | a new guest round-trips: written encrypted, read back plaintext through the endpoint, ciphertext confirmed in the raw row |
| **migration** | 206 rows: write blob, verify round-trip, null plaintext | dry run reported verbatim; `--execute` on its own quoted line |
| **D** | remove the dual-write and the plaintext fallback | the three-way probe: attacker sees no PII, couple's dashboard renders every guest, and a guest-facing flow that reads PII (RSVP lookup) still works |

**B before C is the hard ordering** — the same rule Track E followed. Encrypt a
field while a browser still writes it and the browser writes plaintext over
ciphertext, silently.

**D's probe must include the admit path**, both halves: attacker sees nothing
*and* the couple sees everything. Track E's lesson, and #461's, is that a
system which refuses everyone passes a deny-only probe perfectly.

---

## 6. Open question for you, before any code

**The key.** My recommendation is `BASE44_ADMIN_KEY` (§3), against the base
report's implicit assumption of something new. Guest PII is not externally
distributed, so the failure mode that justified `RSVP_TOKEN_KEY` does not
apply, and a third secret is real ongoing cost. If you'd rather have key
separation on principle, it's a one-line change to the plan — but it needs
deciding now, at Track C's design, not at migration time.
