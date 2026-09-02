# Decision log

Closed decisions with their reasoning, so a restart doesn't re-litigate them.

---

## 2026-08-26 — the studio was rewriting live wedding addresses on a 2-second timer

**Severity: this was in production.** Not a tidy-up.

`StudioWebsite` autosaves every 2 seconds. `slug` was in its `WRITABLE_FIELDS`
payload — reached through `...Object.keys(DEFAULT)`, not the literal array — so
**the wedding's public address was persisted keystroke by keystroke while the
couple typed it.**

A couple renaming `jay-and-ella` to `jay-and-ella-2027` did not write one new
address. They wrote `jay-and-ella-`, `jay-and-ella-2`, `jay-and-ella-20`,
`jay-and-ella-202`, and then the one they meant — each one live, each one for
about two seconds.

**If invitations were already out, every intermediate string was a broken link
in somebody's inbox.** That is the exact safety property established earlier the
same day — *a slug may be reassigned only before it has ever been shared* — and
the studio violated it continuously, silently, on every edit.

**THE RULE UNDERNEATH: AN ADDRESS IS CLAIMED, NOT STORED.** Anything a couple
can hold only one of, that strangers depend on, cannot ride a general-purpose
save. Content can autosave. A claim cannot: every keystroke would fire a claim
attempt, and the couple would race themselves through half-typed names.

Ask of any future field: **is this content, or is it a claim?**

**Fixed** by removing `slug` from that payload — the precedent for which was
already in the file, ten lines above, where `websitePassword` is excluded for
the same reason. See also: *when you need to exempt something, look for what is
already exempted and why.*

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

---

## Phase 0 — the schema scanner was auditing itself into silence (#483, 2026-08-18)

`scripts/lib/schemaDropScan.mjs` classified every write against a 319-line
embedded `SCHEMAS` literal last refreshed 2026-07. It had drifted in both
directions at once, which is what made it dangerous rather than merely stale:

- **Omission** — every field added since 2026-07 was absent, so a new drop was
  undetectable by construction.
- **Assertion** — it listed `Note.status` and `Note.view_type` as registered,
  with a comment calling it a *"real drop, not a snapshot omission."* They were
  never declared in Base44. Writing that down permanently silenced the scanner
  for the exact bug it existed to catch.

The scanner now derives `SCHEMAS` from `base44/entities/*.jsonc` — the mirror
RULE 12 already keeps synced from live — so it can no longer disagree with
production without RULE 12 failing first. `User` short-circuits as schemaless.

**DROPPED 4 → 0.** The old 4 were all `User` false positives, so the previous
scan reported four non-bugs while staying silent on two real ones. The mirror
was resynced to 98 properties (`assetContent`, `favourItems`, `foodBeverage`,
`honeymoonDetails`, `weddingFavours`, `weddingParty` were declared live but
never mirrored).

### Gotcha #20 — enums are NOT enforced on write

`status: 'not_a_column'` stores with HTTP 200. An enum declaration documents
intent; it does not constrain writes. This came out of the refuse half of a
probe that could have been skipped as a formality once the admit half passed.

### Two failures of mine worth keeping

**I proposed an enum without reading the constant eleven lines above the write
site.** I derived `todo/in_progress/done` from `handleMove(task, newStatus)`'s
signature and assumed snake_case. The actual values are
`KANBAN_COLS = ['Ideas', 'In progress', 'Done']`, and `view_type` is not a view
mode at all — it is a partition tag, always the literal `'todo'`, which
`loadTasks` filters on. The first schema application had to be superseded. I
had attached a widen-first warning to the enum and still got the values wrong:
flagging uncertainty is not a substitute for reading the source.

**Probe damage, repaired: 1 row.** `"Plan honeymoon itinerary"` had its
`status` and `view_type` nulled by my own probe. I captured `orig` while the
fields were undeclared and therefore unreadable, got `{null, null}`, and wrote
that back after declaration made the write land. Restored by sensible
inference — `view_type: "todo"` (certain, 15/15 siblings), `status: "Ideas"`
(inferred from its seed-batch neighbours). **Not a recovered original.** The
rule this yields: *never capture a restore baseline through a read path that
cannot see the field you are about to write.*

### The bug's real shape

Undeclared fields were dropped on write **and withheld on read**. The withheld
half is what emptied the todo list — `loadTasks` filters on `view_type`, so a
field the API would not return meant zero tasks rendered. Verified on
production post-merge: the list renders 16/16, a card moved between kanban
columns survives a full reload, and an independent DB re-read matched the UI
exactly. First time that feature has worked since the drift.


## 2026-08-19 — a third direction of the same failure: trusting a probe over the call graph

I reported `setupJourney`'s budget `isComplete` as a HARD BLOCKER that could
never complete, put it in a mockup, and La read it. It was false.

`AvaStudio.jsx:43` passes the record from `getMyWeddingDetails()` — the
server-DECRYPTING endpoint — so `isComplete` receives `budget` as
`{total: 154000}` and the step completes correctly. I had evaluated the
function against a record **I** fetched directly from Base44, where `budget` is
ciphertext. I checked the function, and I checked the data, and I never checked
the wiring between them.

**This is the same class as the two before it, from a new angle:**

| # | What I trusted | Instead of |
|---|---|---|
| 1 | code reading correct | the system running (#486's green structural pins over a dead feature) |
| 2 | a green suite | the total and exit code (four swallowed test modules) |
| 3 | my own probe's data shape | the call graph that supplies the real one |

Each time the artefact I consulted was true in isolation and wrong about the
system. **The fix is the same in all three: follow the actual path end to end
before reporting a defect.** For a function, that means finding its callers and
reading what they pass — not constructing an input that seems right.

The cost here was not a broken build. It was a false claim in a stakeholder's
hands, which is more expensive to withdraw than to have never made.

## 2026-08-19 — changing two variables at once hid the second one

PR #493 fixed the YouTube playlist embed by changing the URL form
(`/embed/videoseries` -> `listType=playlist`) AND the host (`www.youtube.com` ->
`youtube-nocookie.com`) in the same edit. I verified the form change in a unit
test and rendered a hand-swapped URL during diagnosis — but never rendered the
URL the code would actually build.

Both changes were individually reasonable. Together they did not work:
**youtube-nocookie.com does not serve playlist embeds at all.** Same page, same
playlist id, same form, only the host differing — nocookie blank,
www.youtube.com renders.

Two rules this yields:
- When a fix changes more than one variable, the render must be of the BUILT
  output, not of the thing you swapped by hand while diagnosing. A hand-swap
  proves the diagnosis; only the built artefact proves the fix.
- A privacy-preferred domain is not automatically substitutable. nocookie works
  for single videos (`heroVideo.js`) and not for playlists; the two cannot be
  unified without re-rendering a real playlist.


## 2026-08-19 — music rebuild CLOSED, 4 of 4 legs green

| Leg | Result |
|---|---|
| 1. Couple pastes a playlist link; guests see it embedded | ✅ YouTube link renders on `/w/john-suzanne/music` in production |
| 2. Guest free-text request with real Turnstile; couple reviews it | ✅ submitted, stored (`ownerUserId` stamped, `spotifyTrackId` empty), couple saw it Pending and could act |
| 3. Share link resolves to the real page | ✅ `/w/<slug>/music` + QR (was `/playlist/contribute`, a route that never existed) |
| 4. Fixture restored | ✅ playlist cleared, settings preserved, pending queue back to 0 |

**Six defects, and every one was found by running the thing, not by CI:**

1. `/Music` crashed on load — unguarded `songRequests.filter` (#490)
2. Approve/Decline sent action strings the endpoint rejected (#491)
3. The playlist was invisible to guests — the guest-safe allowlist filtered
   `playlists` out server-side, one layer below the missing markup (#492)
4. The YouTube embed used `/embed/videoseries`, retired and silently blank (#493)
5. `youtube-nocookie.com` does not serve playlist embeds at all (#494)
6. The share link pointed at a route absent from `App.jsx` (#492)

Build, lint and 860+ assertions were green through all six. **None of them
render a component or load a URL.** The rebuild's real verification was four
legs on production and it caught what the suite structurally cannot.

Two of the six were introduced by the fix for the one before it, both because
I changed more than one thing between renders. The rule that came out of it:
render the BUILT output, not the artefact you swapped by hand while diagnosing.

**Privacy decision recorded (advisor):** `www.youtube.com` embed accepted —
refusing YouTube while embedding Spotify's player would be inconsistent
protection, and the couple chose the platform. Backlog: a click-to-load facade
for ALL third-party embeds (YouTube, Spotify, Apple) — thumbnail until tapped,
matching the tap-to-play ethos, privacy and performance together. Phase 2
polish. The advisor holds the legal-draft action to confirm the
embedded-content clause covers couple-chosen third-party players.


## 2026-08-19 — ORIENTATION LAYER FAMILY CLOSED: Next up is live, variant A

Per the dashboard council verdict of 2026-08-13 (orientation not motivation;
gamification killed; inside the daily update; setupJourney-driven; progressive
disclosure; confetti stays) and La's owner verdict of 2026-08-18 (variant A,
the lead block).

**Live on production**, commit `08af956`, bundle `index-3RcC1AiK` ->
`index-1oBpcWBm`. Rendered for the real fixture: *Next up · Build your website ·
Step 1 of 7 · 135 days to go*, between the headline and the editorial grid,
with the rest of the list one click behind a summary.

### What the layer refuses to do, which is the part that matters

- **No data means no block.** `journey` is null whenever the wedding record
  failed to load, and the component renders nothing without one. Completeness
  derives entirely from that record; without it every step reads incomplete and
  the couple would be nagged about work they have already done. That is #486's
  empty-account lie wearing a new costume, and it is the reason the honest-states
  work had to land first.
- **A plan-locked step is never proposed.** Orientation must not become upsell
  pressure. A free-plan couple is pointed at work they can action; gated steps
  stay listed, marked once, never louder than open rows.
- **`allDone` and `nothingProposable` are distinct.** A free-plan couple who has
  finished everything actionable is not "done". Conflating them would produce
  either a lie or a paywall where a closing line belongs.

### Ordering

`publish` requires `website`. `rsvp` requires nothing — RSVP tokens resolve at
`/rsvp/<token>` independent of any published site, so a couple can run the whole
flow on emailed links. That reasoning lives in the step definition, not just
here, so nobody "fixes" it into a dependency the product does not have.

### The correction this family carried

I reported the budget `isComplete` as a HARD BLOCKER and put it in a mockup La
read. It was false: `AvaStudio` passes the server-decrypted record, so the step
completes correctly. I had evaluated the function against a record I fetched
raw myself and never checked the wiring between them. The mockup panel was
regenerated with a dated correction rather than quietly edited, and the real
obligation — Next up must read through `getMyWeddingDetails()` — is now a CI
pin whose companion assertion feeds `isComplete` actual ciphertext, so the
reason for the pin is demonstrated rather than described.

### Verification

17 behavioural pins. All five states rendered before merge was requested, via a
local harness that was removed in the same pass. Deployed behaviour re-rendered
on production afterwards and matches.


## 2026-08-19 — correction: the CI runner was never degraded

I filed a ticket asserting "CI runner degradation" from three cancelled runs I
never opened. It was wrong.

**Every cancellation was `concurrency: cancel-in-progress: true` firing on a ref
I had just pushed to again.** The two main-branch cases each ended within ~20
seconds of my own following docs commit starting its run (`f5d3d72` /
`1ec55f9`, `ea22f30` / `5acbc0c`). The PR case was my own force-push; the fourth
was my own re-run. Four cancellations, four me-shaped causes, zero
infrastructure faults.

The evidence that disproved it was **inside the table I put in the ticket**:
durations of 68s, 206s, 521s and 1218s. An 18x spread cannot come from a fixed
cause. I quoted the numbers and did not read them.

**Environmental note, worth keeping for the next "slow CI" reading:** the
~20-25 minute runs were GitHub runner QUEUE time, not slow work. Step timings on
the slowest run total ~145 seconds; normal runs execute in ~100s with 3-25s of
queue. `timeout-minutes: 20` measures execution, not queue, so it was never
approached. Slow wall-clock on this repo's CI means "waiting for a runner"
until proven otherwise — check step timings before filing anything.

`scratchpad/CI-RUNNER-TICKET-INVESTIGATION.md` supersedes the degradation
report. The fix shipped in #500: main is exempt from cancellation, and a
`workflow_run` watchdog announces any non-success conclusion on main, because
the real gap was never that main could go unverified — it was that nothing said
so.

**The pattern, now four for four this session:** I had the artefact, drew the
conclusion from its surface, and did not follow it to the mechanism. Code
reading correct over the system running; a green suite over its exit code; a
probe's data shape over the call graph; and now a run's status over its
duration. Each artefact was true in isolation and wrong about the system.

---

## Trial enforcement before hosted functions is deliberately PARTIAL (2026-08-24)

Not a gap we discovered late — a boundary we chose, with the reason recorded.

**Layer 1, real enforcement (TT-2).** `api/my-guests`, `api/my-wedding-details`
and `api/my-guest-links` reject mutating methods from expired trials with
`403 TRIAL_EXPIRED`. Expiry is computed server-side from the fetched User
record via the same pure module the browser uses, never trusted from the
request. Verified live: an expired account's PUT is refused, a paid account's
passes the guard.

**Layer 2, a UX boundary (TT-3).** The ~174 direct `base44.entities.*` writes
go straight from the browser to Base44 and never touch our endpoints, so no
server check can see them. They are gated at the SDK chokepoint instead: one
guard where the client is constructed. It runs in the browser, so **a
determined person with the console can step around it.**

**Layer 3, later.** Full enforcement arrives with the hosted-functions rebuild,
which moves those writes behind endpoints. The SDK guard is the seam that work
will harden.

**The accepted exposure:** at beta scale, someone bypassing the UX layer can
edit their own wedding after their trial ends. They cannot reach anyone else's
data — that is ownership-scoped and unaffected. Documented, not discovered.

**Reads are never gated, at any layer.** Every export is a pure read, and
"viewing and exporting stays free, forever" (#507) depends on that. Proven from
an expired account: all five exports download at both widths.

---

## Post-launch undeclare batch: `rsvp_link_id`, `plus_one_rsvp_link_id`

Following the Spotify-teardown pattern (#451/#452: writers removed, tokens
purged, field undeclared), these two Guest columns are queued for undeclaring
**after launch** — schema changes come through the advisor and this is not the
moment.

The three stages, in order, and why the order is not negotiable:

1. **Writer stopped** — `tokenPatch()` no longer emits plaintext (this PR). Until
   this is merged, any purge races a writer that recreates what it deletes.
2. **Data purged** — re-run `scripts/null-rsvp-plaintext.mjs`, the tool built for
   exactly this, dry-run first. Its own header notes it destroys the only
   plaintext copy of bearer capabilities and cannot be undone. Own quoted line,
   per-row verify-before-destroy.
3. **Column undeclared** — only once nothing writes it and nothing holds a value.

Why the columns cannot simply be dropped now: `api/my-guest-links.js` keeps
`decryptToken(enc) || guest.rsvp_link_id` as a legacy recovery path. It is inert
for every row E3 nulled and for every row minted since the writer stopped, but
undeclaring the field while that expression exists turns a harmless `undefined`
into a schema mismatch. Remove the reader, then the column.

Two client fallbacks name the same column — `SendInvitesModal.jsx` (`l.token ||
g.rsvp_link_id`) and `EmailTemplates.jsx` (`guests.find(g => g.rsvp_link_id)`).
Both are correct as written and become permanently inert once the data is
purged; `EmailTemplates` in particular depends on the column being empty so a
sample email takes the placeholder branch and never carries a live capability.
That invariant was FALSE between #538 and this PR.

---

## PR 3 (RSVP form embed) — the sequencing constraint

**The `/rsvp/:token` redirect may only be enabled once the embedded form in the
site is functional.** Build the form first, the redirect last. If PR 3 is split
for size, the redirect goes in the LATER half, never the earlier.

Why, measured rather than assumed: `/rsvp/:token` renders `RSVPPage.jsx`, which
has 18 RSVP-action references — a working form. `/w/:slug/rsvp` renders
`WeddingRSVPPage.jsx`, which has 0 — an email box. Redirecting before the embed
takes every guest holding a link already in the wild *away* from a form that
records a reply and *into* one that cannot, hitting exactly the people most
likely to be mid-RSVP.

**PR 3 owns PR 2's verification as well.** Recognition is inert until something
generates a `?rsvp=` link, so there is one end-to-end proof, not two:

  emailed link → redirect → token consumed and stripped → guest recognised →
  their own form rendered → reply recorded → "not you?" clears it →
  return visit still recognised

In production, at both widths. Owner accept on visuals, and both copy variants
in the render: the trimmed warmth-only invitation line above a recognised
guest's form, and the full intro as the unrecognised fallback state.

### Gotcha #21 — two different objects are both called "copy"

`universeConfig.copy` holds the UNIVERSE'S DEFAULTS — the 19 voiced strings in
`src/lib/websiteThemes.js` (`rsvpIntro`, `rsvpSent`, `rsvpWelcome`, kickers).
`weddingDetails.rsvpContent` holds the COUPLE'S OVERRIDES — what one couple
typed in the builder, and empty for almost everyone.

Read the wrong one and nothing errors. The `||` fallback catches it, so the
hardcoded English default renders under all 19 voices and the page looks fine.

Live example: PR #542's recognised-state line read `weddingDetails.rsvpContent`,
so every universe rendered the same shared sentence while 19 per-universe lines
sat unused two files away. **The build passed, and 21 probes passed** — the
string was present, the component rendered, nothing was undefined. It was found
by a human reading the copy in a render and asking why london sounded like
brooklyn.

Same family as `UNIVERSE_CATALOG` vs `WEBSITE_THEMES`: two plausible sources for
the same-sounding thing, where picking the wrong one degrades silently instead
of failing.

**Rule of thumb: defaults come from the universe, overrides from the wedding.**
If a string should differ per universe, it is `universeConfig.copy`. If a string
should differ per couple, it is the wedding record. A probe cannot tell these
apart — only reading the rendered words can.

---

## Ticket: WEBKIT-PASS — pre-beta, findings only

**Why.** `GamesManager`'s copy-links was broken in Safari and nobody reported
it. It shares a file-neighbourhood and an idiom with the Guests control the
owner *did* report, and the only reason one surfaced and the other did not is
that nobody happened to click it. That means the product has effectively been
verified in **one engine**.

The market is couples and their guests on iPhones and Macs. Safari is not a
minority case here; it is probably the majority — and the guest side, where the
RSVP lives, skews further that way than the dashboard does.

**Scope** — a WebKit run across the interactive surfaces that matter, reporting
every difference from Chromium as a finding:

- guest list actions (select, copy links, set events, bulk edits, export)
- invite sending
- the RSVP flow end to end, including the recognised-guest path
- publish and the share controls
- exports (CSV, ZIP — download behaviour differs by engine)
- the studio's copy and share controls

**Known engine-specific classes to look for**, beyond whatever turns up:

- clipboard writes behind an `await` (the class just fixed — pinned by
  `tests/persistence/clipboard-actions.mjs`, but new sites can still be written)
- programmatic downloads and `<a download>`
- date parsing and `Intl` formatting differences
- `100vh` and viewport units with the Safari toolbar
- backdrop-filter, sticky positioning, scroll behaviour

**Findings only. Fixes ticket separately.** Slot after the current defect wave,
before beta.

Playwright ships webkit, and `scripts/lib/renderHarness.mjs` already drives it —
`copylinks-webkit.mjs` is the worked example of running both engines and
reporting the difference.

---

## 2026-08-31 — eleven of twenty textures may render nothing (PARKED, UNVERIFIED)

Measuring the perceptual step of every universe's texture against the two
grounds its overlay actually meets, in dL* (CIELAB):

- the **twelve noise universes** (grain, paper, plaster) sit at 0.39-0.90 on
  light and 0.51-1.27 on dark
- only **brooklyn** (grain 0.035) clears ~1.0 anywhere, and only on dark

The conventional just-noticeable difference for a luminance step is around
1.0 dL*. So on that threshold **eleven of twenty universes carry a texture that
is below it on both grounds** -- a render layer, a paint cost and a config
dimension that may produce nothing a guest can see.

**FILED AS UNMEASURED, NOT AS SAFE.** (Amended 2026-08-31: the first draft
parked these as "probably imperceptible, therefore minor". That is the wrong
reason and it inverts the risk.)

dL* measures how much darker a STROKE PIXEL is than the ground beside it. It
has no term for coverage or spatial frequency, and it was never calibrated
against the noise family at all -- the whole texture enquiry was conducted on
the two GRID families. So its verdict of "below threshold on both grounds" for
these twelve carries the identical blind spot that reclassifies the linen
question, and it carries it on a family the instrument has even less claim to.

Which kills the tempting argument outright: **"we can sweep these for
consistency because nobody could see the difference" IS A PREDICTION MADE BY
THE INSTRUMENT THAT HAS ALREADY BEEN CAUGHT MISSING A TERM.** It is exactly the
reasoning this week taught us not to trust, applied to the family where it is
least tested.

A patch JND also does not transfer cleanly to a fine repeating pattern:
structure aids detection, and a regular weave can be visible at a step where a
flat patch difference is not. Noise is unstructured, which cuts the other way,
and neither direction has been measured.

**brooklyn is the one to look at first** -- grain at 0.035 against the 0.025
default, 1.4x, and the only noise texture above threshold anywhere (dark,
1.27). If any of the twelve wants its own decision, it is that one.

This is a **universe-programme finding, not a texture bug**. Texture is one of
the thirteen dimensions a universe is made of; if it does nothing for most of
the set, that is a fact about the dimension.

**Brooklyn is the counterexample to keep.** It is perceptible on dark and not on
light -- the exact inverse of the eight grids. So any rule of the form "texture
lives on the light ground" is already contradicted by a shipped universe. The
cause is compositing, see the next entry.

## 2026-08-31 — the texture registry ordered the families by the wrong variable (PARKED)

`src/lib/textures.js` calibrates its default opacities by REGULARITY: "regular
geometric patterns (linen, canvas) read more perceptually salient than random
noise at equal opacity, so they're calibrated lower". That is true, and it is
not the dominant variable.

The dominant variable is the **compositing model**:

- a **grid** paints a black stroke at alpha `o`, so the step is `bg * o` --
  ONE-SIDED DARKENING THAT SCALES WITH THE GROUND'S LUMINANCE. Loud on a light
  ground, nearly absent on a dark one.
- **noise** varies around a fixed midpoint, so the step is roughly `sigma * o`
  and BARELY MOVES WITH THE GROUND at all.

Measured: grids swing **2.8-6.7x** between their dark and light grounds; noise
moves **0.7-1.1x**, and slightly the other way. Regularity cannot explain a 6x
swing; only the compositing model can.

**WHEN THESE DEFAULTS CHANGE, THE HEADER COMMENT MUST SAY THE ORDERING IS BY
COMPOSITING MODEL FIRST AND REGULARITY SECOND** -- otherwise the next person
recalibrates on regularity again and gets the same one-ground answer we did.

Parked alongside: **the texture is a body-page signature, not a universe one.**
Home is 100% dark ground, so on the page every guest sees FIRST the weave
contributes nothing, in all eight grid universes. It appears only on the four
inner pages, which are about half light. That is not a design; it is one alpha
meeting two grounds. A design question for the owner, not a defect to fix
quietly.

---

## 2026-09-01 — twenty universes have zero verifiable production surfaces (MISSING INSTRUMENT)

The guest-website texture overlay mounts only on `/w/:slug`. There is no
published wedding on any universe we are permitted to read, so **a
guest-facing universe change cannot be verified in production at all.** What
can be read from a deployed bundle is the VALUE — `defaultOpacity: .012`,
`texture:{type:"canvas"}` — and that proves the value shipped. **IT DOES NOT
PROVE A PAGE RENDERS IT.**

The gap is widest exactly where it matters most. #641 deleted eight config
values so the level resolves through `var(--texture-opacity, default)`, and the
failure mode of getting that wrong is a full-strength weave on every guest page.
The bundle read cannot see it: the config is *supposed* to be absent. Only a
computed style on a live guest page can distinguish "inherits correctly" from
"resolved to the initial value of 1".

**THIS APPLIES RETROSPECTIVELY AND THE EARLIER REPORTS OVERCLAIMED.** #637 and
#639 were both reported as "verified live", and both were bundle reads —
transition tokens and magnitude literals found in the shipped chunk. That is a
weaker claim than either report made. The values were literals rather than
fallback resolutions, so the exposure was smaller, but the class of evidence
was the same and it was not labelled as such.

**Once the owner's two fixture sites exist — bali (canvas) and paris (linen) —
the computed reading on a live guest page becomes the definition of done for
guest-facing universe work**, replacing the bundle read. Do NOT create them:
that is a production write and it is not ours to make.

Until then, guest-facing universe changes are verified by rendering the real
component locally and reading the computed value, and the report must say that
is what happened rather than calling it live verification.

---

## 2026-09-01 — two verification fixtures, and what they are not

To verify guest-facing universe work in production at all (see the missing-
instrument entry above), two ordinary weddings are being published:

| slug | universe | texture | dark ground | light ground |
|---|---|---|---|---|
| `openinvite-fixture-bali` | bali | canvas | `#2E4A2A` | `#F2E9D3` |
| `openinvite-fixture-paris` | paris | linen | `#1A1A2E` | `#FAF7F2` |

Two accounts, because there is no wedding switcher: `resolveMyWedding` returns
the MOST RECENTLY CREATED non-test record, so a second wedding on one account
makes the first unreachable, and `/api/my-wedding-details` already logs
"owns more than one real record" as an anomaly.

**THESE ARE ORDINARY REAL RECORDS AND THAT IS PERMANENT DATA CONTAMINATION.**
They cannot carry `is_test` — that flag would 404 the guest page and hide them
from the studio, which is the whole point of them. So they are indistinguishable
from customer weddings in the data.

**ANY COUNT OF REAL WEDDINGS MUST EXCLUDE THESE TWO SLUGS.** Revenue, adoption,
"how many couples", anything. The exclusion is by slug because there is nothing
else to exclude them by.

**The option being declined, deliberately:** a distinct fixture flag — served
like a real record but excluded from business counts. That is a schema change,
so it is the owner's to authorize, and it is not worth it for two rows today.
**BUILD IT THE MOMENT A WEDDING COUNT BECOMES LOAD-BEARING**, because at that
point this entry is the only thing standing between the fixtures and a wrong
number, and an entry is not a control.

**The trial consequence is narrower than it looks.** Design Studio is
Ultra-gated (`canAccessUltra`: plan === 'ultra' || trialActive), so both
accounts need Ultra or an active trial to pick a universe. When a trial lapses
the studio locks BUT THE SITE STAYS PUBLISHED — `websiteEnabled` is untouched
by the gate — so verification keeps working indefinitely. The only thing lost is
re-pointing a fixture at a different universe, and if we ever want that, it is a
new fixture rather than a re-pointed one.

**AND SAY WHAT THEY CANNOT VERIFY.** Two universes of twenty, one canvas and one
linen. They cover the texture register on the two grid families. They do NOT
cover the twelve noise universes, the page transitions, the entrances, or
anything about the other eighteen worlds. **A FIXTURE THAT COVERS THE CASE THAT
BROKE IS NOT A FIXTURE THAT COVERS THE CLASS** — a green check on bali is a
statement about bali.

Practical note: the texture appears only on the INNER pages. Home is 100% dark
ground where the weave contributes nothing, so verification must read an inner
page such as `/w/<slug>/our-story`, which needs enough content to render.

---

## 2026-09-01 — the universe-persistence audit: what the scoped read found (OPEN)

**The symptom:** the owner selected a universe in onboarding and reports his
dashboard showing kyoto.

**Code ruled out three of the four candidates.** All four writers
(`OnboardingStepUniverse`, `buildWeddingDetailsPayload`, `persistDraftStep`,
`UniverseStudio.handleSwitchUniverse`) write the same field, `activeUniverse`,
which is a real schema field (`entityFields.generated.js:1329`) and therefore
not silently dropped. `StudioWebsite`'s 2-second autosave cannot clobber it —
`activeUniverse` is not in its `DEFAULT`, and `WRITABLE_FIELDS` derives from
`Object.keys(DEFAULT)`. The studio persists only on an explicit switch with a
confirming toast, never on opening a tile. And **kyoto exists nowhere as a
default or fallback** — the studio's own display falls back to `'london'`, and
the catalog order is london, tulum, kyoto, so no `[0]` default reaches it.

**Telemetry, asked for the first time.** `/api/my-wedding-details` has logged
"owns more than one real record" server-side since the "Alex & Sam" incident.
**It has not fired.** Zero warning-level logs across every path in a 12-hour
window, against a control showing logs flowing normally and 32 calls to that
exact endpoint in 6 hours. Bounded honestly: that is a 12-hour window on
retention-limited logs, so it means "not firing now", not "never fired".

**The scoped read, one account only.** One row exists for the owner's account:

    activeUniverse: "brooklyn"   coupleNames: ""   slug: "tulumtest"
    created 2026-07-06           is_test: false    onboardingDraft: absent

Nothing outside that account was returned, fetched or counted.

**IT DOES NOT REPRODUCE THE SYMPTOM.** That row says brooklyn, not kyoto, and
predates this week by two months. So the account showing kyoto is a DIFFERENT
account — presumably one of the new fixture accounts — and it has not been read.
**The audit is not finished; it is waiting on which account to look at.**

**But that row is evidence for the mechanism anyway, and it is the important
part.** `coupleNames` is EMPTY on a non-draft record. That is the exact shape
`UniverseStudio.handleSwitchUniverse` produces when `recordId` is falsy:

    const created = await WeddingDetails.create({ activeUniverse: universeId });

A row containing a universe and nothing else. **THE BARE-CREATE PATH HAS RUN IN
PRODUCTION.** Here it was harmless because it was the only row. It would not be
harmless on an account that already had a real wedding: `resolveMyWedding`
returns the MOST RECENTLY CREATED non-test row, so a bare row created later wins,
and **the couple's entire wedding becomes unreachable through the UI.**

**THE COSMETIC SYMPTOM AND THE CATASTROPHIC ONE ARE THE SAME BUG SEEN FROM TWO
DISTANCES.** "My universe didn't stick" and "my wedding disappeared when I
opened the studio" are the same line of code at different starting states. The
telemetry exists because this shape has occurred before, which is why asking it
was the cheap move and why it should have been asked on day one.

**Not fixed.** The fix is a guard on the create branch — a universe switch
should never mint a wedding — but the mechanism behind the kyoto sighting is
still unidentified, and fixing the bare-create would not explain kyoto.

## 2026-09-01 — OnboardingStepUniverse: Select is a no-op on an already-selected tile

`OnboardingStepUniverse.jsx:149`

    onClick={(e) => { e.stopPropagation(); if (!isSelected) onSelectTile(); }}

Pressing Select on the tile that is already selected does nothing at all. The
outcome is harmless — the tile is already chosen — but **A CONTROL THAT
SILENTLY DOES NOTHING IN A STATE THE USER CAN REACH IS A DEFECT EVEN WHEN THE
OUTCOME IS HARMLESS**, because what the user learns is that the button is
unreliable, not that it was unnecessary. Filed during the universe-persistence
audit, not folded into it.

---

## 2026-09-01 — a class of change we can ship and cannot watch work (MISSING INSTRUMENT)

Two instances in one day, and they are one gap rather than two incidents.

**Instance 1 — guest-facing universe surfaces (#641).** The texture overlay
mounts only on `/w/:slug`, and no published wedding exists that we may read. A
deployed-bundle read proved `defaultOpacity: .012` shipped; it could not prove a
page renders it. Worse for that PR specifically, the fix DELETED config values
so the level resolves through a fallback — meaning the bundle read cannot even
distinguish correct inheritance from a fallback resolving to `opacity: 1`.

**Instance 2 — the invitation email (#642).** The couple's name now resolves
through `coupleDisplayName()`. A deployed-bundle read proves the corrected call
site shipped. **IT CANNOT PROVE AN EMAIL ARRIVES RIGHT.** The from-name, the
subject, the headline and a `[Couple names]` tag in a couple's own custom body
are all things that exist only in a delivered message.

**THE COMMON SHAPE: THE ARTIFACT THE CHANGE IS ABOUT IS PRODUCED OUTSIDE ANY
SURFACE WE CAN OBSERVE** — a guest site nobody has published, an email nobody
has sent. Every other change this week could be verified by reading the
deployed bundle for a literal, because the literal WAS the artifact. Here it is
only an input to one.

**Report these in three levels rather than as "done":**

  1. **Proven now** — the code does what the diff says; a local render shows
     the output of the shipped template. My machine.
  2. **Provable after merge** — a deployed-bundle read confirms the call site
     or value shipped. Proves the change is live. Proves nothing about output.
  3. **Only real verification** — the artifact itself. A live guest page for
     the universe half; an actual send, read in a real inbox, for the email
     half.

**The fixture accounts close the universe half.** Once `openinvite-fixture-bali`
and `openinvite-fixture-paris` exist, level 3 becomes available there and
becomes the definition of done.

**NOTHING CLOSES THE EMAIL HALF.** There is no fixture inbox, and the owner is
currently the only person who can perform a level-3 check on a send. Until
that changes, email fixes ship at level 2 and the honest status is "shipped,
unverified" — which is a different sentence from "done".

---

## 2026-09-01 — the universe-persistence defect did not happen as described (RESOLVED, in part)

The report was: a universe selected during onboarding "does nothing", and the
Design Studio shows kyoto. It was treated as launch-blocking for several rounds,
because a bali fixture that is secretly kyoto makes every verification built on
it worthless.

**The data falsifies the persistence claim outright.** Scoped read of the two
fixture accounts, created minutes apart this morning:

    la.jay06+bali@gmail.com    activeUniverse "bali"    "Chris & Sia"    1 row
    la.jay06+paris@gmail.com   activeUniverse "paris"   "Theo & Larissa" 1 row

**ONBOARDING WROTE THE CORRECT VALUE ON BOTH ACCOUNTS.** One row each, so no
record multiplicity. Couple names present, so the save ran in full. There is no
persistence defect. **A DEFECT WE TREATED AS LAUNCH-BLOCKING FOR SEVERAL ROUNDS
DID NOT HAPPEN AS DESCRIBED** — recorded in those words rather than quietly
reclassified as something smaller.

**The mechanism half is unresolved and is NOT covered by the confirmed half.**
The prediction was "records hold bali and paris, kyoto is a display fallback".
The first clause is confirmed; **the second is not** — every universe read
reachable from `/studio` resolves correctly and every fallback is `london`:

  - `/studio` is `StudioHub`, NOT `UniverseStudio` (`/studio/universe`). The
    first trace looked at the wrong component, which is why "kyoto is not
    reachable" was ruled correctly about the wrong code.
  - `StudioHub` reads `getUniverse(wedding?.activeUniverse || 'london')`.
  - that `getUniverse` is `universeCatalog`'s, a different module from the one
    checked earlier: `UNIVERSE_CATALOG.find(u => u.id === id) || null`. No
    default entry, no index fallback.
  - all 20 `imageUrl`s are distinct and correctly named, and bali, paris,
    kyoto and london all return 200 image/jpeg in production.
  - `UltraGate` contains no universe reference.

**A PREDICTION THAT IS HALF RIGHT IS NOT A PREDICTION THAT WAS RIGHT.** The
halves are scored separately so the reasoning stays worth reusing.

Three candidates remain, undecided: a stale view observed before the selection
landed or against a cached bundle; a card element read as kyoto (it is
image-led, and the badge shows "Ultra" rather than a universe name on a Pro
plan); or something outside `src/` and `api/` still unfound.

**The fixtures stand.** Both records hold the right universe, which was the only
thing actually blocking them.

---

## 2026-09-02 — the first level-3 verification this project has produced

`https://www.openinvite.com.au/w/chris-and-sia/our-story`, a real published
guest site on the bali fixture account:

    overlay found:    true
    texture opacity:  0.015        <- computed, on the live page
    background-size:  16px 16px    <- the canvas tile
    root background:  rgb(46, 74, 42)

**WHAT THIS PROVES THAT A BUNDLE READ CANNOT.** #641 DELETED the per-universe
opacity so the level resolves through `var(--texture-opacity, 0.015)`. A bundle
read can only confirm the config value is absent and the registry default is
present — which is also exactly what a broken fallback looks like. **AN INVALID
CUSTOM PROPERTY MAKES THE DECLARATION INVALID AT COMPUTED-VALUE TIME AND
`opacity` FALLS TO ITS INITIAL VALUE OF 1** — a full-strength weave on every
guest page, from a diff that reads as removing redundant numbers. Only a
computed style on a live page separates those two worlds. It reads 0.015.

**And the two-ground finding now rests on a real published site.** The single
`inset: 0` overlay spans, on this page:

    #2E4A2A  53.3%   (dark)      vs the local harness's 52.7%
    #F2E9D3  46.7%   (light)     vs the local harness's 47.3%

Same hex values as the deployed config, same split within a percentage point.
The entire dL* calibration rested on "one overlay meets two grounds" and on
those two colors. Both are now measured on production rather than assumed.

bali's applied transition, from the deployed chunk:
`pageTransition:{type:"lift",direction:"down",duration:.32}` — the #637/#639
value — with `texture:{type:"canvas"}` carrying no opacity, inheriting as
designed.

## 2026-09-02 — the Design panel audit: six of eight controls are honored

**THE HEADLINE IS THAT THE PANEL IS MOSTLY SOUND.** Two controls were found
defective in the two that were first examined, which looked like an alarming
sample. The full audit corrects that.

`WBRightPanel.jsx`, every field it writes:

| control -> field | read on the guest render? | verdict |
|---|---|---|
| coverPhoto | EntranceMoment, WeddingHomePage | honored |
| heroVideoUrl | EntranceMoment, WeddingHomePage | honored |
| fontOverride | universeStyling.resolveTypography | honored, couple wins |
| guestExperienceSettings | MultiPageWeddingWebsite (music) | honored |
| weddingDate | four guest files | honored |
| websiteEnabled | server gate in api/wedding-by-slug | honored |
| **pageTransition** | written, then shadowed | **dead** |
| **scrollAnimation** | read, but only `!== 'none'` | **two of three options identical** |

**fontOverride IS THE HOUSE RULE AND pageTransition IS ON THE WRONG SIDE OF IT.**
Identical shape — a per-wedding value against a universe default — resolved in
opposite directions:

    resolveTypography:  override?.headingFontId || defaults?.headingFontId   <- couple first
    guest call site:    universeConfig?.pageTransition ?? weddingDetails...  <- universe first

The same two operands in the opposite order, and one of them is an accident.
Letting a couple override typography is a LARGER break to a universe's coherence
than letting them override a transition, and the product already decided that
one in the couple's favor.

**Two failure modes, two fixes.** `pageTransition` is a switch wired to nothing
that looks like it works — it writes a real schema field, the pill persists
across reloads, and nothing is ever read. `scrollAnimation` is wired correctly
but `'subtle'` and `'dramatic'` produce identical output; websiteThemes.js:406
describes dramatic as "Slower reveal, slight blur clear", a promise the
implementation never kept. One is wiring; the other is missing behavior.

**And the option list is a third, separate fix.** TRANSITION_OPTIONS offers
Fade / Slide / Reveal / Dissolve against the six shipped types (push, lift,
iris, unfold, dissolve, fade). `slide` never existed as a type. `reveal` was
deleted in #637 for rendering byte-identically to fade. **A CONTROL WHOSE
OPTIONS DO NOT NAME THE THINGS THE RENDERER CAN DO IS BROKEN EVEN WHEN IT IS
WIRED CORRECTLY** — fixing the wiring without the list would ship a working
control offering two impossible choices.

## 2026-09-02 — reversing the pageTransition precedence would flatten 18 of 20 live sites

The obvious fix is to swap the operands so the couple's choice wins, matching
fontOverride. **COUNTED FIRST, AND THE COUNT INVERTS IT.**

Read-only aggregate over WeddingDetails, that field only:

    non-test records          20
    with a universe set       20
    non-null pageTransition   20   <- every single one
    values                    fade 16, dissolve 2, slide 1, reveal 1
    non-null scrollAnimation  20   ->  subtle 18, dramatic 2

**16 of 20 hold `'fade'`, which is verbatim StudioWebsite's own `DEFAULT`, and
18 of 20 hold `'subtle'`, likewise.** These are not choices. They are the
default object seeded into a record by a 2-second autosave.

So reversing precedence today would apply, to every live site: 16 x fade, plus
`slide` and `reveal` which are not cases in `getTransitionVariants` and fall to
its `default:` branch — which is fade. **EIGHTEEN OF TWENTY LIVE SITES WOULD
RENDER A PLAIN FADE**, and the per-universe transition work of #637 and #639
would be invisible on 90% of production. A one-line change; a catastrophic
behavior change.

**A STORED VALUE IS NOT EVIDENCE THE COUPLE WANTED IT.** The control offers four
options and NO WAY TO SAY "leave it alone" — a couple opening that panel had to
pick one of four or accept whatever was already selected. There has never been a
neutral option, so a stored value is evidence only that one was never offered.

**The shape that follows, not yet authorized:** add an explicit "Match my
universe" and make it the default; treat every existing stored value as
unintentional; honor a choice only when it was made after the neutral option
existed — which requires distinguishing new writes from old ones, and that is
the migration question rather than a config change.

## 2026-09-02 — two corrections to the fixture entry

**The slug is `chris-and-sia`**, auto-derived from the couple names — NOT
`openinvite-fixture-bali`, which I proposed and which was never used. The
earlier entry is wrong. Paris is not published yet.

**AND THAT SLUG IS NOT STABLE.** The panel states the address follows name
changes until the first invitation is sent. **A VERIFICATION FIXTURE WHOSE
ADDRESS CAN MOVE IS ONE THAT WILL SILENTLY STOP BEING FOUND** — a later check
would 404 and read as "the fixture is gone" rather than "the fixture was
renamed". Record the slug AND the freezing mechanism together, always.

Sending one invitation from that fixture does two things at once: it locks the
slug, and it is the level-3 verification #642 has been waiting for — from-name,
subject, headline and the `[Couple names]` tag in a real inbox, against a record
whose coupleNames is known to be "Chris & Sia".

## 2026-09-02 — a candidate explanation for the kyoto report, not a conclusion

The owner reported changing something in the studio and nothing happening. The
data falsified that for the universe field specifically — both fixture records
hold the correct universe, and `/studio` now reads "Universe: Bali".

But the panel audit has since confirmed that **a control on that exact panel
does genuinely nothing while appearing to work.** He named the universe, so this
is not a claim about what he saw. **A REAL COMPLAINT CAN BE MISLOCATED WITHOUT
BEING WRONG**, and "the studio Design panel does not do what it says" is now a
confirmed fact rather than a hypothesis. Noted as a candidate.
