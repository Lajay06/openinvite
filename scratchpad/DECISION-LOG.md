# Decision log

Closed decisions with their reasoning, so a restart doesn't re-litigate them.

---

## PlanGift RLS — delete closed, update deliberately left open, 2026-08-17

`delete` flipped to `{created_by_id: "{{user.id}}"}`; `create`, `read` and
**`update` stay `null`**.

### Why delete could close at zero cost

Nothing in the repo deletes `PlanGift` — the full writer audit found three
write paths, all `api/webhooks/stripe.js` via `api/_lib/planGift.js`, all
create/update. Rows are created with the admin key, so `created_by_id` is
`"anonymous"` and no real user can satisfy the rule. Deletion is now
impossible for everyone, which is the correct state for a payment record, and
no code path is affected.

### Why update CANNOT close

Both update paths use the admin key, and per gotcha #1 the admin key cannot
satisfy ANY owner-scoped rule. The `data.<field>` pattern that rescued
`SongRequest` does not apply here either:

- `buyer_user_id_hash` is an **HMAC**, so `{{user.id}}` can never equal it —
  and it is a hash precisely because `read: null` makes the table listable.
- The buyer may not be logged in at all (that field is null in those cases),
  so for some rows there is no user to scope to under any scheme.

Scoping update would therefore mean storing a raw buyer id, undoing a
deliberate privacy decision, or moving to a hosted function.

### Residual risk, accepted knowingly

With update open, anyone holding any API token can still flip `status` between
`purchased` and `redeemed`, or overwrite `promotion_code_display`. Encryption
does not help — those fields are plaintext because they are not secrets. This
is an **integrity** exposure, not a confidentiality one.

Currently 0 real rows (1 row, `is_test`). Accepted as a known risk rather than
left looking accidental.

### Third instance of one cause

This joins the hosted-functions rebuild list as the **third** case of the
identical root cause — an entity whose rows are written by the admin key on
behalf of an unauthenticated actor, where no owner-scoped rule can ever be
satisfied:

1. `SongRequest` — anonymous rows nobody can delete (right-to-erasure gap)
2. `Guest.update` — collaborator "edit" permission with no working write path
3. `PlanGift.update` — this one

A hosted function with `asServiceRole` fixes all three at once. That is now the
main argument for prioritising the rebuild.

### Correction on record

My Step 3 report escalated this as *"an oversight rather than a decision"*.
It was a decision, documented in `api/_lib/giftAuth.js:4-12` — a file I had
not read before escalating. The exposure was real; my account of its origin
was wrong.

**Lesson: read the auth lib before escalating its entity.** An entity with
conspicuously open RLS and carefully encrypted fields is far more likely to be
a documented trade-off than an accident, and the reasoning usually lives in the
`_lib` helper that owns its crypto — not in the schema descriptions.

---

## Right-to-erasure gap — now a concrete instance, 2026-08-17

The gap itself is documented in BASE44_PLATFORM_NOTES.md ("anonymous-guest
writes create rows nobody can ever delete through the product"). This records
that it has stopped being theoretical.

### The instance

Three `SongRequest` rows on the fixture wedding, created during the PR #453 /
#454 / #455 verification runs:

```
6a82c80c88c9d24a6834d6d6  "Idempotency Test Track"      added
6a82c59fbd8c7367e0bbe5c0  "Owner Stamp Check"           declined
6a82bbe7c35165a2cb55c46b  "Free Text Verification Song" declined
```

**Nobody can delete them.** Confirmed by attempt, not assumption:

- admin key -> `404` (delete RLS filters the row out, so it reports not-found)
- the wedding owner's own token -> `404`, same reason

`SongRequest.delete` is scoped `{created_by_id: "{{user.id}}"}` and every row
is `created_by: "anonymous"`, because guests submit unauthenticated. No user
can ever match. The workspace MCP can UPDATE these rows (`update_entities`)
but exposes no delete, so even the escape hatch only reaches half of it.

Alongside them sit **231 orphaned harness rows** from deleted weddings, same
condition. Best available cleanup is a terminal status, which leaves the
couple's queue empty but the rows resident forever.

### Why this matters beyond tidiness

The legal deletion/export path is a **[CONFIRM] item on the owner's legal
drafts**, and it cannot be written accurately as things stand. A privacy
policy or DPA that promises erasure on request would be describing something
the data model cannot perform for any guest-submitted row.

Affected entities are every `create: null` guest-write surface —
`SongRequest`, `RsvpResponse`, `PollVote`, `PollComment`,
`QuestionnaireResponse`, `GuestContactSubmission`, `CollaboratorGrant`.
Content in several of those is encrypted or hashed, which limits exposure but
does not constitute deletion.

### Designated fix

The **post-launch hosted-functions rebuild**. A Base44-hosted function with
`asServiceRole` is the only mechanism that can delete these rows, per the
platform notes' own entry on it. Until then:

- Do not draft an unqualified erasure promise. Either scope it to data the
  product can actually delete, or defer the clause.
- Any new guest-write entity inherits this. Weigh it at design time rather
  than discovering it at erasure time.
- Interim partial measures that exist today: encryption/hashing at rest, and
  terminal-status marking so rows leave active views.

Cross-reference: [[base44-platform-notes]] right-to-erasure gap, and the
hosted-functions entry.

---

## Step 2b — COMPLETE END TO END, 2026-08-17

All five stages shipped and verified on production. Nothing outstanding.

| stage | PR | what shipped | verified |
|---|---|---|---|
| (a) encrypt 4 fields | #446 | `emergencyContacts`, `dayVendorContacts`, `celebrant`, `license` -> AES-256-GCM via `api/my-wedding-details` | raw query shows ciphertext strings; UI type -> Saved -> reload -> painted on both writer pages |
| 0 (hotfix) | #447 | `?preview=true` ownership gate | production: anonymous and non-owner both GATED, owner FULL |
| (i) sentinel cleanup | #448 | `websitePasswordEnabled` as sole source of truth; sentinels removed | PublishModal toggle persists across reload for the first time since it shipped |
| (ii) transport | #449 | password moved to POST body; `Cache-Control: private, no-store` | query-string password now IGNORED on production |
| (iii) hash | #450 | scrypt with versioned prefix, per-value salt, `timingSafeEqual`, set-new/clear UX | raw query shows `scrypt$…`; credential never returned to any client |
| (c) Spotify teardown | #451, #452 | OAuth writers/readers removed; tokens purged; field undeclared | one row purged, verified by independent raw query; `music.spotifyConnection` gone from the live schema |

### What the encrypted set looks like now

Six fields are ciphertext at rest (`budget`, `contactPerson`,
`emergencyContacts`, `dayVendorContacts`, `celebrant`, `license`), one is a
one-way hash (`websitePassword`), and `WRITABLE_FIELDS` on
`api/my-wedding-details.js` equals the full set — no encrypted or hashed field
has a client-side writer any more.

### No migrations were run, deliberately

Every stage that could have had a backfill was closed the 2a way instead:
audits found zero plaintext to migrate in every case (`budget`/`contactPerson`
in 2a, the four 2b fields, and zero real `websitePassword` values). A no-op
migration would have logged "migrated 0 rows" and implied a plaintext history
that never existed. The audits are the record.

### Things this programme found that were not the task

- `?preview=true` was an unauthenticated bypass of the whole website password
  feature. Found while scoping stage (b); fixed first as a hotfix.
- `PublishModal`'s password toggle had never persisted, because it wrote an
  undeclared field that Base44 silently dropped (gotcha #5).
- `WeddingDetails` mirror drift: `budget`/`contactPerson` still declared
  `object` after #436 made them `string` live, and six fields missing from the
  mirror entirely.
- The privacy policy described a Spotify OAuth integration receiving profile
  data that the product no longer has.
- Guest song requests are 100% blocked while Spotify search is down, because
  submission requires a search result and there is no free-text path. Spotify
  search itself is dead for a billing reason (`403: Active premium
  subscription required for the owner of the app`), confirmed identical on
  pre-teardown production. Free-text entry is queued as a micro-PR ahead of
  Step 3 because it is guest-facing and currently broken.

### Rules this programme produced

[[standing-rules]] RULE 6 (guest-facing gate posture), RULE 7 (async guard
gate-collapse), RULE 8 (authorized scope as an enforced precondition).

---

## Website password gate — FAIL OPEN when enabled with no credential, 2026-08-17

**Ratified by the advisor 2026-08-17, binding condition attached.**

`websitePasswordEnabled` (declared 2026-08-17) is the single source of truth
for whether the public wedding site is gated. That creates a two-field
invariant with `websitePassword`, and one combination has to be defined:
**enabled = true, no credential stored.**

### The decision

The gate **fails OPEN** — the site serves publicly, and the server logs
loudly. It does not fail closed.

**Binding condition:** the same PR must make that state unreachable through
normal use. The UI refuses to save enabled-without-password. Fail-open is a
defensive line for a state the product cannot produce, never a routine path.

### Why open and not closed

Failing closed is the reflex answer and it is wrong here. A wedding site with
the gate on and no credential that can satisfy it locks out **every guest**,
with no self-service recovery — they cannot contact the couple through a site
they cannot load, and the couple only finds out when someone tells them. The
blast radius is the entire guest list, on a date that does not move.

Failing open exposes a site that was never actually protected: the couple
toggled a switch and never chose a password, so no credential was ever
communicated to anyone, so nothing that was meant to be private is being
revealed to someone who was meant to be excluded. It also matches the
behaviour that already shipped, where an empty `websitePassword` simply meant
"not protected".

The asymmetry is the whole argument: closed breaks a real wedding for real
guests; open leaves a door open that nobody had been told was locked.

### What makes this safe rather than lax

Three things together, and it is only defensible with all three:

1. **Unreachable by construction** — UI refuses to persist the state.
2. **Loud** — the server logs whenever it takes the fail-open branch, so the
   unreachable state existing at all is visible rather than silent. Same
   reasoning as [[standing-rules]] RULE 6c.
3. **Never inferred** — `websitePassword` must not be used to derive
   enabled/disabled. Deriving it is exactly what forced the `' '` and
   `'password'` sentinels this field replaces.

### Audit that informed it

21 rows at decision time (16 real, 5 `is_test`): zero sentinels, zero real
passwords, 16 null, 5 empty string, `websitePasswordEnabled` present on **0**
rows. Six real rows have published sites; none is password-protected. So the
decision was taken with no live password-protected wedding to endanger either
way — the right time to choose it.

---

## WeddingDetails.read RLS flip — REJECTED, 2026-08-17

**Do not build it, do not sequence it, do not re-propose it in this form.**

`WeddingDetails.read` **stays open (`null`)** until `api/wedding-by-slug.js`
moves to a Base44-hosted function (post-launch hosted-functions rebuild); at
that point the flip is re-proposed.

### Why the proposal was wrong

The Step 2b report (2026-08-17) proposed tightening `WeddingDetails.read` to
`created_by_id` as the first item of the Spotify teardown, on the reasoning
that the guest site and collaborator views read through admin-key endpoints
rather than directly, so "the expectation is no breakage."

That reasoning is inverted, and it collides head-on with the first entry in
BASE44_PLATFORM_NOTES.md ("The admin key is not a superuser bypass"). Reading
through an admin-key endpoint is not protection from an owner-scoped read —
it is precisely the thing an owner-scoped read breaks. Against an entity with
`read: {created_by_id: "{{user.id}}"}` the admin key gets:

> `read` | `200`, empty array — silently filtered, no error

No exception. No log line. Every published guest site would serve an empty
wedding, and nothing anywhere would report a failure. **This is the standing
reason `WeddingDetails` is a pattern-2 entity.**

### The blast radius is larger than the guest site

Verified 2026-08-17: **23** files under `api/` read `WeddingDetails` with
`BASE44_ADMIN_KEY`. That includes `api/my-wedding-details.js` itself — its
GET resolves the caller's own wedding via `adminFetch`, so an owner-scoped
read would 200-empty the **couple's own dashboard**, not just the public
site. The encryption endpoint the whole 2b programme depends on would be the
first casualty. Also affected: `rsvp-lookup`, `collaborator-*`,
`song-request-*`, `wedding-poll-*`, both crons, and `_lib/spotifyAuth.js`.

### What closes the exposure instead

Step 2b itself, not an RLS change:

- Spotify tokens **deleted** from `music.spotifyConnection` (2b stage c), and
  every writer that could repopulate them removed or disabled in the same
  pass.
- The remaining sensitive fields **encrypted at rest** — `emergencyContacts`,
  `dayVendorContacts`, `celebrant`, `license` (2b stage a), joining
  `budget`/`contactPerson` from #436.
- `websitePassword` **hashed** (2b stage b).

An open read on a row whose sensitive fields are all ciphertext or absent is
not the same exposure. That is the design, not a compromise around it — see
`api/_lib/guestSafeWedding.js` for the allowlist that guards the shape, and
[[base44-platform-notes]] gotcha #1 for why the RLS route is closed.

---

## Step 2a (budget/contactPerson encryption backfill) — CLOSED AS ALREADY-SATISFIED, 2026-08-16

**Do not run `scripts/migrate-weddingdetails-2a-encrypt.mjs` for real.**

### What the dry run found

```
Total rows: 21   (is_test: 5, real: 16)

budget          19  absent/null
                 2  ciphertext string   ← Alex & Sam (len 220), John & Suzanne (len 256)
contactPerson   21  absent/null         ← every row, test and real

Migration candidates (real rows only): budget 0, contactPerson 0
```

Verified twice: once via the migration script's own `--dry-run`, once via an
independent read-only row-by-row classification, because a zero result
contradicted the queued premise and one tool agreeing with itself is not
evidence.

### Why it is closed rather than run

There is no plaintext left to migrate, and `contactPerson` never had any.
The live schema's own field description states it: *"No known writer in the
app today (verified via repo-wide grep) — encrypted at rest defensively
regardless."* A field with no writer never got populated, so there was never
anything to convert.

The queue carried a premise of "14 of 16 rows still hold plaintext
contactPerson". That was the advisor's error, corrected on record 2026-08-16.

Running the migration anyway would iterate zero rows and write nothing —
harmless, but it would leave a "migrated 0 rows" line in the log that
implies a plaintext history which never existed. Future readers would draw
the wrong conclusion about what this data looked like. That is the whole
reason for closing it rather than executing a no-op.

The two `budget` rows holding real values are already ciphertext, at two
different lengths (220 and 256) consistent with two different payload sizes,
not two different formats.

### Mixed-row read path — verified correct, keep it

`api/my-wedding-details.js` handles both states and must continue to:

```js
function decryptField(value) {
  if (typeof value !== 'string') return value;   // legacy plaintext object passes through
  try { return decryptPayload(value); }
  catch (err) { /* logs, returns as-is — never 500s */ }
}
```

Confirmed on both branches: the fixture's ciphertext decrypts to 99999
through this path, and the 19 null rows pass through untouched. The
`typeof === 'string'` discriminator is unambiguous **only because** plaintext
`budget`/`contactPerson` were object-shaped. Any future field encrypted this
way whose plaintext form is itself a string cannot use this discriminator —
it needs a version prefix or a separate marker instead. See
[[base44-platform-notes]] and gotcha #17.

## 2026-08-18 — the website password feature worked end to end for the first time

**PR #461, verified on deployed production through the real UI.** Recorded as
a first, not as a fix, because that is what it is: from #299 until today,
enabling website password protection made a wedding site permanently
inaccessible to every guest, **including with the correct password**. The
feature had shipped, been iterated on four times (#447, #448, #450, #458,
#459), and had never once been passable.

The cause was one flag answering two questions — the server's
`passwordProtected` meant "this site has a password" (true even on a
successful unlock) while the client read it as "you are locked out". #461
split them: `locked` answers the second question and is the only flag a
client branches on.

### The circle, row by row, on www.openinvite.com.au

| # | leg | result |
|---|---|---|
| 1 | enable password on the fixture | gated response `{passwordProtected:true, locked:true}` |
| 2 | guest loads the site | unlock screen shows |
| 3 | wrong password | stays locked, "Incorrect password", nothing cached |
| 4 | **correct password** | **UNLOCKS — "John & Suzanne" renders, password cached (16 ch)** |
| 5 | `/music`, `/collect`, `/accommodation` while unlocked | all three render real content, none gated |
| 6 | poll read while unlocked | 200, `locked:false`, comments returned |
| 6 | poll write while unlocked | **200**, row landed |
| 7 | sessionStorage replay across navigation | survived all four full page navigations |
| 8 | gate off, cache cleared, brand-new guest | 44 keys, `locked:false`, site renders, no unlock screen |
| 9 | fixture restored | poll removed, `enabled=false credential=none` |

Leg 4 is the one that had never passed.

### What this says about the preceding work

#447/#458/#459 hardened a gate that could not be passed. That hardening was
still correct and still necessary, but it is worth recording honestly that
"protected sites now refuse anonymous writes" and "protected sites refuse
everyone, always" were **indistinguishable in every test run before today**,
because both produce a refusal. Only the unlock leg separates them, and
nothing had ever exercised it.

Lesson, standing: **a gate test that only ever asserts refusal cannot tell a
working gate from a broken one.** Always pin the admit path too.

### Residue

Three `PollComment` rows on the fixture, all `created_by_id: "anonymous"` and
therefore undeletable (erasure gap, instance four — see
BASE44_PLATFORM_NOTES.md): `"PR459 write-gate probe"`,
`"PR459 prod check gate-off"`, `"PR461 unlocked write"`. Each was necessary:
proving a write is admitted requires a write that actually lands. All three
carry a `poll_id` matching no surviving poll, so nothing renders them.

## 2026-08-18 — comments asserting security properties must be verified like code

**Defect class, recorded on advisor instruction during Guest family Track A.**

Three files independently asserted that `Guest.read` is owner-scoped:

- `api/my-guests-rsvp.js` (twice — header and inline)
- `api/collaborator-guests.js` (corrected in #465)
- `api/cron/send-weekly-digest.js`

It was never true. `Guest.read` is `null` in the live schema, verified by
listing 206 Guest rows from an unrelated authenticated account.

**Why this is worse than an ordinary stale comment.** One of those files is the
endpoint whose entire purpose is to be the safe read path for `Guest`, so a
developer deciding whether direct reads were acceptable would have been misled
by the most authoritative-looking source available. And in
`send-weekly-digest.js` the false premise had a **consequence**: the cron was
PARKED specifically to avoid a failure mode that the real RLS does not produce.
A feature was disabled on the strength of a sentence nobody checked.

**The rule:** a comment asserting a security property — an RLS rule, an auth
guarantee, what a credential can or cannot do — is a claim, not documentation.
It gets verified against the live system before it is trusted, and ideally
pinned by a test.

**Pinned:** `tests/persistence/rls-comment-claims.mjs` parses every
`"<Entity>.read is owner-scoped"` assertion in `api/` and `src/` and checks it
against `base44/entities/<Entity>.jsonc`. It found the third instance —
`send-weekly-digest.js` — which I had not spotted by reading. Deliberately
narrow: it matches the exact sentence shape that misled us rather than trying
to parse English, because a guard that over-reaches gets disabled the first
time it false-positives and then catches nothing.

**Left open for the advisor:** whether `send-weekly-digest` should be
un-parked. The stated reason for parking is void, but un-parking a cron that
emails real couples is a product decision, not a comment fix. The parking
stands until decided.

## 2026-08-18 — Guest PII migration: three decisions recorded

**1. The three `is_test` rows are migrated.** They are excluded from the read
endpoint but not from the table, so an attacker listing `Guest` sees them like
any other row. Leaving them unmigrated would make "migrated" mean two different
things depending on which query you asked, which is exactly the ambiguity the
derived discriminator was chosen to avoid. 205 owned rows migrated, not 202.

**2. The anonymous-created row is on the erasure ledger by id.**
`6a584d473aa3ab1ec180fcdc` — the first demonstrated `Guest` instance of the
erasure-gap class. Admin-key PUT returns 403, probed directly. It can never
receive a blob and its plaintext can never be nulled. Added to
BASE44_PLATFORM_NOTES.md's ledger as instance 5 and to the hosted-functions
rebuild list.

**3. Track D's exit gate asserts an ENUMERATED exception, not zero and not
"some".** The assertion is: zero plaintext PII on every row *except* the pinned
id(s). A gate that expected zero would fail forever on a row nothing can fix; a
gate that tolerated "some exceptions" would silently accept a second, third,
tenth unwritable row. Pinning by id means the exception list growing is itself
a failure.

The distinction matters more than it looks. "No plaintext PII remains" would
have been a false claim, and the honest version — "none except one unwritable
harness row" — is only defensible if the exception is enumerated and enforced
rather than described.

## 2026-08-18 — Guest encryption family CLOSED

Production `503e46e`. Full closing probe, three views, one build.

**Standing state:** 206 Guest rows, 205 carrying `encrypted_guest_pii`, and
**exactly one** row exposing any plaintext PII — `6a584d473aa3ab1ec180fcdc`,
the unwritable harness row, whose `name` is the sentinel
`__PERSISTENCE_TEST_ADMINKEY_CREATED_BY_CHECK__` and whose nine columns are
empty.

**The claim is deliberately not "no plaintext PII remains."** It is: none on any
row the product can write, plus one unwritable harness row holding a sentinel
string. The exception is pinned by id and asserted as exactly that — a gate
expecting zero would fail forever on a row nothing can fix, and one tolerating
"some exceptions" would silently accept a second.

### What this family got wrong, recorded because it generalises

Track D shipped incomplete: readers converted, columns nulled, but the
dual-write left in place, so every edit re-populated the columns just cleared.
My own Track C commit message had claimed Track D would stop it.

**A deny-only probe would have passed throughout.** The attacker view was clean
before and after the bug. What exposed it was the ADMIT path — the couple's own
edit, followed by an independent re-read of the raw row.

That is the same lesson as #461 (a gate that refuses everyone passes a
refusal-only probe) and the E3 admit-path leg, arriving a third time in a
different costume. **Every probe needs both halves, and the admit half needs an
independent re-read, not the endpoint's own response.**

Three smaller defects came out of the same fix, each worth its own note:

- The nulling script was not re-run-safe: its predicates assumed the pre-null
  state, so a second pass saw every row as unprocessed and then aborted
  comparing a real name against the placeholder it had itself written.
- A test passed for the wrong reason: `!== undefined` is satisfied by `null`,
  so the dual-write assertion survived the deletion of the dual-write, reading
  as validation of the new contract while asserting the old.
- The pins covered readers; the bug was in the writer. Coverage of one side of
  a data path says nothing about the other.
