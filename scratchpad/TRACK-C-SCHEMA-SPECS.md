# Track C — schema specifications for the advisor to apply

Prepared 2026-08-18 against main `5cd88d3`. **Specs only. No code.**
Live schema read via the Base44 workspace MCP, not from the mirror — see §5.

---

## 0. One recommendation that differs from the brief, up front

You asked for specs for `encrypted_guest_pii` **and the boolean discriminator**,
as two fields. **I recommend one field, with the discriminator derived:**

> A row is migrated **iff `encrypted_guest_pii != null`.**

A separate boolean would be a **second source of truth for the same fact**, and
the two can disagree. That is not a theoretical worry here — B2 established
that several paths write `Guest`, and every one of them would have to remember
to set both. The two drift states are both silent:

| drift | consequence |
|---|---|
| blob set, flag `false` | reads take the plaintext path; the couple sees stale data with no error |
| flag `true`, blob `null` | reads attempt to decrypt `null`; either a crash or an empty guest |

This is the #461 lesson pointed the other way. There the fix was to **add**
`locked`, because `passwordProtected` was being asked to answer two different
questions. Here there is exactly one question — "is this row migrated?" — and
`blob != null` answers it by construction, with no possibility of drift.

Nothing needs a queryable flag either: the migration fetches all rows in a
single large-limit call (gotcha #19) and filters in memory, exactly as the
Track E token migration did over 202 rows.

**If you want the explicit flag anyway**, §3 specifies it, and it must come
with a CI guard asserting the two never disagree — an invariant that can drift
and is not tested is just a slower version of the bug.

Everything below assumes the derived discriminator unless you say otherwise.

---

## 1. `encrypted_guest_pii` — the field to declare

- **Field name:** `encrypted_guest_pii`
- **Type:** `["string", "null"]` — same union shape as `rsvp_link_id_enc`
- **Nullable:** yes. `null` means *not migrated*; that is the discriminator.
- **Required:** no. Absent on existing rows until first write (gotcha #5).
- **Who may set it:** `api/my-guests.js` only. It is in `DERIVED_FIELDS`, so
  the trusted write path refuses a caller-supplied value, and in
  `PROTECTED_FIELDS`, so the collaborator passthrough refuses it too. Both
  shipped in B/B2.

### Description contract (verbatim, for the declaration)

> AES-256-GCM ciphertext of this guest's ten PII fields as one JSON object,
> base64(iv + authTag + ciphertext). Key derived from BASE44_ADMIN_KEY via
> SHA-256, same construction as api/_lib/questionnaireCrypto.js — deliberately
> the admin key and NOT a dedicated secret, because unlike RSVP tokens this
> data is never externally distributed, so a key rotation is a re-runnable
> re-encrypt migration rather than an unrecoverable break (advisor decision,
> 2026-08-18). Contains exactly, in this order: name, email, phone,
> mailing_address, dietary_restrictions, special_requests, notes,
> plus_one_name, plus_one_email, plus_one_dietary_restrictions — the canonical
> list is api/_lib/guestProtectedFields.js PII_FIELDS. NULL IS THE
> DISCRIMINATOR: a row with null here is unmigrated and its plaintext columns
> are authoritative; a row with a value here is migrated and this blob is
> authoritative. Written only by api/my-guests.js; refused from callers via
> DERIVED_FIELDS and PROTECTED_FIELDS. ROTATION: leaking BASE44_ADMIN_KEY
> requires re-encrypting this blob along with every other admin-key-derived
> ciphertext — see BASE44_PLATFORM_NOTES.md.

---

## 2. The ten fields, canonical list and ordering

Exactly as shipped in `api/_lib/guestProtectedFields.js` `PII_FIELDS`, so the
spec and the code cannot disagree:

| # | field | populated today |
|---|---|---|
| 1 | `name` | 206 |
| 2 | `email` | 201 |
| 3 | `phone` | 201 |
| 4 | `mailing_address` | 0 |
| 5 | `dietary_restrictions` | 23 |
| 6 | `special_requests` | 0 |
| 7 | `notes` | 0 |
| 8 | `plus_one_name` | 40 |
| 9 | `plus_one_email` | 31 |
| 10 | `plus_one_dietary_restrictions` | 5 |

**On ordering:** it does not affect security — AES-GCM uses a random IV, so two
encryptions of the same object differ regardless. It is fixed for a duller
reason: a stable key order makes the decrypted object diffable in logs and
tests, and makes "did every field survive the round trip" a list comparison
rather than a set comparison. A field absent from a row is stored as `null`
inside the blob rather than omitted, so the round-trip check can assert all ten
keys are present.

**Not included, and why:** `rsvp_note` and `song_request` are 0-populated,
superseded by the AES-encrypted `RsvpResponse` overlay, and slated for the
dead-field cleanup. Encrypting fields nothing writes and nothing reads would
add a decrypt hop for no gain.

---

## 3. The explicit boolean — only if you overrule §0

- **Field name:** `guest_pii_encrypted`
- **Type:** `boolean`
- **Default:** `false`
- **Nullability:** not null; default `false` on every row
- **Who may set it:** `api/my-guests.js` only, and only in the same write that
  sets `encrypted_guest_pii`. It joins `DERIVED_FIELDS` and `PROTECTED_FIELDS`.

### Description contract

> True asserts that encrypted_guest_pii holds this row's ten PII fields and
> that the legacy plaintext columns are no longer authoritative. Set only by
> api/my-guests.js, only in the same write that sets encrypted_guest_pii, and
> refused from callers. REDUNDANT BY DESIGN with (encrypted_guest_pii != null);
> the two must never disagree, and tests/persistence asserts they cannot.

**The mandatory companion if this field exists:** a CI assertion that no code
path sets one without the other, plus a migration-time check that the two agree
on every row before nulling anything. Without those, this field is a slower
version of the bug it is meant to make explicit.

---

## 4. Lifecycle note for the ten legacy plaintext columns

To be **appended** to each of the ten existing descriptions, following the E2
wording pattern already applied to `rsvp_link_id`:

> LEGACY PLAINTEXT (Guest PII family): dual-written alongside
> encrypted_guest_pii through Track C and the migration; values are nulled at
> Track D, after which the blob is authoritative. Do not remove this
> declaration until the separate post-D cleanup — undeclaring drops stored
> data (gotcha #5).

`name` needs one extra clause, because it is the only one of the ten that is
`required` on the entity:

> `name` remains required and non-null at the schema level; at Track D its
> value becomes a placeholder rather than the guest's real name, which lives in
> the blob. Any surface reading `name` directly rather than through
> api/my-guests.js will show that placeholder — the Track A chokepoint exists
> so there are none.

**This is the one I most want your eye on.** `name` being `required: true`
means Track D cannot simply null it the way the other nine are nulled. Options,
for your call at D rather than now: store a stable placeholder (`"—"`), or drop
`required` from `name` at D. I lean to the placeholder, because dropping
`required` weakens a constraint permanently to solve a transitional problem.

---

## 5. Schema-mirror drift — needs fixing alongside this

`base44/entities/Guest.jsonc` is **stale**. It carries
`"rsvp_link_id_hash": null` and `"rsvp_link_id_enc": null` as placeholders, and
`rsvp_link_id`'s description lacks the Track E lifecycle clause. The live
schema has all three, correctly.

This matters more than tidiness: `tests/persistence/rls-comment-claims.mjs`
(shipped in Track A) reads that mirror as its source of truth for RLS. A mirror
that drifts turns a working guard into a guard checking the wrong thing.

I will sync the mirror from the live schema in the Track C code PR, and I'd
suggest the mirror is refreshed whenever you apply a declaration, so the two
never diverge again.

---

## 6. What I do once you apply the declarations

1. **Probe gotcha #5** as with E2: confirm the fields read back absent on
   existing rows, write one, confirm it materialises and its siblings appear as
   `null`, revert the probe.
2. Build C: dual-write in `api/my-guests.js`; blob-preferred reads at the Track
   A chokepoint with plaintext fallback for unmigrated rows; dietary edits
   rewriting the blob per the B obligation.
3. Report with evidence, then request the line.
