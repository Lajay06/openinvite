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

---

## 2026-09-02 — the send reported an error and succeeded (FILED, HIGH, NOT INVESTIGATED)

Sending an invitation from the bali fixture surfaced an error to the user. **The
send went through.**

**RANKED ABOVE THE OTHER SEND-SURFACE DEFECTS, AND THE REASON IS THE USER'S
CORRECT RESPONSE.** A false failure is worse than a failure, because the right
thing to do after a failure is to try again — and on this action, trying again
means guests receiving a second invitation to a wedding. The failure mode is not
"a confusing message", it is "the product instructs the couple to do the one
thing that damages them".

**UNVERIFIED AND FIRST TO ESTABLISH WHEN THIS IS PICKED UP: does a retry
actually duplicate, or does it dedupe?** `send-invites.js` does per-guest token
work and ownership filtering; whether a second call re-sends to guests who
already received one has NOT been checked. **If it dedupes, the severity drops
sharply** and this becomes a message bug rather than a data-damage risk. Do not
assume the bad case; do not assume the good one either.

**Two candidate shapes, so whoever picks this up knows what to look for:**

  1. **An error surfaced from a non-fatal step after the send committed.** The
     handler does several things after dispatch — token persistence, guest-count
     logging, ownership bookkeeping. A throw in any of those, after Resend has
     already accepted the batch, produces exactly this: mail delivered, error
     displayed.
  2. **A success response the client failed to parse.** The modal awaits the
     fetch and branches on the body; a shape mismatch, a non-JSON body, or a
     status the client does not treat as success would show an error against a
     200.

These have different fixes and different blast radii. The first means the API is
lying about its own outcome; the second means only this caller is confused.

## 2026-09-02 — invitation email: the cover-photo control, and the greyed-out banner

Merged into one entry rather than filed separately, because they are the same
surface and may be the same cause.

**The owner's request, the positive half of an existing ruling.** He previously
ruled that the email hero cannot be a video, on bandwidth grounds. He now asks
for the positive half: **an explicit option for the couple to choose a cover
photo for the email, with NO VIDEO OPTION OFFERED AT ALL.** Not "video blocked
with an error" — **a control that never offers the thing it will then refuse.**

**Open question to decide before it is built:** does the email cover default to
the website hero when that hero is an image, and what happens when the hero is a
video? That second case is the one that produces a couple with no cover and no
obvious reason why, and it is a branch worth deciding rather than discovering.

**And observed on the live send: the photo banner option is greyed out.** No
stated reason. **A DISABLED CONTROL THAT DOES NOT SAY WHY IS INDISTINGUISHABLE
FROM A BROKEN ONE** — the couple cannot tell whether it is unavailable to them,
unavailable yet, or defective. If it turns out to be gated on something the
couple has not done (no cover photo uploaded, no venue photo), **the fix is
telling them, not enabling it.**

Not investigated. `getBannerImageUrl` and `getDefaultBannerChoice` in the send
modal are where to start.

---

## 2026-09-02 — #642 VERIFIED AT LEVEL 3 AND CLOSED

Real send from the bali fixture, read in a real inbox:

    from-name   Chris & Sia
    subject     You're invited to Chris & Sia's wedding
    headline    Chris & Sia

**ALL THREE SURFACES THAT CARRIED THE EMPTY STRING NOW CARRY THE NAMES.** Every
invitation this product had ever sent went out as "Openinvite", subject
"You're invited: a wedding", headline "The Wedding" — because
`SendInvitesModal` read `wedding.coupleName` and the schema field is
`coupleNames`. Three sequential `|| ''` and seven well-written template floors
turned a typo into silence at every layer.

**This is the first email verification this project has completed at the only
level that counts.** Levels 1 and 2 — the code reads right, the value shipped —
were both true of the broken version too, because the broken version shipped a
correctly-resolved empty string.

**THE SHIP-BUT-CANNOT-WATCH GAP IS NOW SHUT ON BOTH HALVES.** The universe half
closed the same afternoon: computed texture opacity 0.015 on
`/w/chris-and-sia/our-story`, resolved through the `var()` fallback after #641
deleted the config value. The email half closes here. Both were verified by the
fixture the owner published, which is the entire argument for having built it.

---

## 2026-09-04 — A1: the guest-page shell enumeration (REPORT ONLY)

**One page of thirteen is outside the universe shell, and it is Music.**

`WEDDING_PAGES` declares twelve slugs: home, our-story, celebration, rsvp,
registry, music, styling, polls, faq, stay, transport, experience.
`PAGE_COMPONENTS` in the shell maps thirteen — those twelve plus `good-to-know`.

**Every page the shell renders receives the same five props and sits inside the
same wrappers:**

    weddingDetails, theme, typography, universeConfig, recognisedToken

rendered as `<PageComponent …/>` inside `<motion.div>` inside `<AnimatePresence>`,
inside `.wb-guest-root`. So all of them get the page transition, and the single
`inset: 0` texture overlay spans all of them because it is a sibling on the root
with no fixed height.

**Music does not, and the mechanism is route ordering.** In `App.jsx`:

    <Route path="/w/:weddingSlug/music" element={<GuestMusic />} />     <- line 206
    <Route path="/w/:weddingSlug/:page" element={<MultiPageWeddingWebsite />} />

The specific route is declared first and wins. **So `WeddingMusicPage` — which
IS in `PAGE_COMPONENTS` — is unreachable in production.** `GuestMusic.jsx`
already says so in a comment: "the rebuild stored playlistUrl and rendered it
only on WeddingMusicPage, which this route shadows — so the saved link was
invisible to every guest".

**AND THE COUPLE PREVIEWS THE PAGE GUESTS NEVER SEE.**
`src/components/website-builder/RealWebsitePreview.jsx:45` maps
`'music': WeddingMusicPage`. The builder preview renders the in-shell version;
the live site serves the out-of-shell one. **The preview is not a preview of the
published page for this one route.**

**History.** `GuestMusic.jsx` first appears in the range around #597; it was
never inside the shell — there is no commit moving it out. It is not a
regression, it is a page that was built separately and never integrated.

**What being outside costs, feature by feature** (`grep` counts on the file):

    wb-guest-root      present (1)   <- it sets the class itself
    TextureOverlay     0             <- NO texture
    AnimatePresence    0             <- NO page transition
    WeddingWebsiteNav  0             <- NO shell nav
    EntranceMoment     0             <- NO entrance
    SectionReveal      0             <- NO scroll reveal

It does resolve `typography`, `universeConfig` and `theme` itself (a prior fix,
GUEST-TYPOGRAPHY-PARITY, wired the fonts after it was found hard-coding
London's). So it is universe-*typed* but not universe-*moved* or
universe-*textured*.

**THE COST TO THE UNIVERSE PROGRAMME, STATED PLAINLY.** Every motion and texture
measurement this week was taken on pages inside the shell. The mechanism counts
(3 -> 12 distinct), the loudness readings, the 0.015 live verification — all of
it describes the twelve shell pages. **A guest who navigates to Music leaves the
universe: no transition on the way in, no weave on the ground, no entrance.** So
the distinctness we measured overstates the distinctness a guest experiences,
by exactly one page out of the set a couple can enable — and it is a page with
its own nav link, so it is not obscure.

**Consequence for A8, which is why A1 ran first:** any copy or layout work
targeting Music would be done against a page scheduled to move. A8's condition
holds — only shell pages get touched in this run.

**Per-page integration (grep counts, universeConfig / typography / GuestPageHeading):**

    Home 46/24/0    OurStory 65/67/0   RSVP 67/41/0    Celebration 26/12/0
    Registry 11/26/2  Polls 4/23/3     Stay 11/18/2    Transport 9/12/2
    Experience 8/11/0  FAQ 5/9/2       GoodToKnow 2/9/0  Style 0/5/0
    MusicPage 6/4/2 (unreachable)      GuestMusic 2/10/2 (outside)

`WeddingStylePage` reads `universeConfig` zero times — it takes `typography`
only. Not a defect on its face (it may not need the config), but it is the one
shell page with no universe-config dependency at all, and worth a look when
someone is next in it.

---

## 2026-09-04 — B0: Phase 0 dashboard inventory (REPORT ONLY, owner accepts before any Track B code)

**1. Sidebar: eight groups, 35 items, already grouped.**

    Planning            Daily update, Overall, Schedule, To do
    Guests              Guest list, Polls & games, Messages, Seating, Wedding party
    Style & experience  Moodboard, Styling, Beauty, Food & beverage, Music,
                        Photography, Vows & speeches, Guest gifts
    Vendors             My vendors, Marketplace
    On the day          Ceremony details, Transport, Accommodation, Emergency contact
    Finances            Budget, Registry
    Guest Suite         Schedule, Q&A, Registry, Accommodation, Transport,
                        Experience guide, Good to know, Guest polls
    Extras              Honeymoon, Considerations

**The sidebar is not ungrouped today — PR2 is a REGROUPING, not an introduction
of grouping.** That matters for how the owner reads the proposal: the question
is whether five stage-based groups beat eight feature-based ones, not whether
grouping helps.

**2. /Overall (`Dashboard.jsx`) top to bottom**, with what each panel reads:

    DashboardPageHeader   "Overall / Your wedding planning at a glance"
    StatCard row          guests, budget, schedule, vendors (counts)
    AvaButton             "Ask Ava to review your wedding plan"
    QuickLink row         static links
    RSVPChart             guests
    BudgetSummary         budget, stats
    UpcomingTasks         schedule
    RecentActivity        guests, budget, schedule, vendors, moodboardItems,
                          tasks, notes, questionnaireResponses

**RecentActivity reads eight collections.** It is the heaviest panel on the page
and the one least like a briefing — it reports what happened, where a briefing
reports what needs the couple.

**3. Empty states: present but uneven.** Coarse signal count per page
(`no … yet` / `nothing here` / `empty` / `get started` / `add your first`):

    Seating 8   Music 7   Guests 3   Budget 3   Vendors 2   Moodboard 2
    Polls 2   TodoList 1   Messages 1
    Schedule 0   Registry 0   Photography 0

**Three pages have no empty-state language at all** — Schedule, Registry and
Photography. Those are the clearest candidates for PR3, and Schedule is on the
spec's own priority list.

**4. Duplicate entry points — AND THE SPEC'S OWN EXAMPLE IS ALREADY FIXED.**
`VowsSpeeches.jsx:115` carries a comment: *"It used to open the generic AvaModal
chat while three other buttons opened the purpose-built AIVowsSpeechesAssistant
— four buttons, two destinations. This one now opens the assistant, and the
other three are gone."* **Vows now has exactly one Ava entry point.**

Across `src/pages/*.jsx` there are 68 `AvaButton` references, but that is ~one
usage plus one import per page — the pattern is one Ava entry per page, which is
the intended shape, not duplication. **B4's premise needs re-basing on the
current code before anything is proposed for removal.**

**5. `setupJourney.js`** re-exports `JOURNEY_STEPS` and `getJourneyProgress`
from `journeySteps.js`, and exports `getJourneyCounts()`. Consumers:
`components/dashboard/NextUp.jsx`, `pages/DailyUpdate.jsx`, `pages/AvaStudio.jsx`.
So it is live on three surfaces, not orphaned by the Ava Studio entry points
being hidden.

**6. A DAILY BRIEFING SURFACE ALREADY EXISTS, AND THIS RESHAPES PR1.**
`src/pages/DailyUpdate.jsx` — 719 lines, sidebar item "Daily update", its own
route, an LLM-generated briefing cached per user per day
(`oi_briefing_v2_<userId>_<date>`). It already consumes `setupJourney`.

So spec PR1 ("Overall becomes the briefing") is not building a briefing — it is
**deciding where the briefing lives**, and the honest options are: move
DailyUpdate's content onto Overall and retire the separate page, make Overall a
compact briefing that links to the full one, or leave both and accept two
surfaces answering the same question. **The spec does not appear to know
DailyUpdate exists.** That is a question for the owner, not a build decision.

Data available to feed a briefing, all already read on the dashboard: guests
(unreplied RSVPs), schedule and tasks (due this week), budget (variance),
vendors (deposits due).

**Proposed five groups against the real inventory** (Overall and To do
ungrouped above, per the spec):

    Foundations             Schedule, Ceremony details, Styling, Moodboard,
                            Considerations
    Guests                  Guest list, Seating, Messages, Wedding party,
                            Polls & games
    The day                 Food & beverage, Music, Photography, Beauty,
                            Vows & speeches, Transport, Accommodation,
                            Emergency contact, Guest gifts
    Money & vendors         Budget, Registry, My vendors, Marketplace, Honeymoon
    Website & invitations   the eight Guest Suite items

**Two things the owner should adjust rather than me.** "The day" carries nine
items and is the largest group in the proposal — it may want splitting. And
"Daily update" has no home in the five groups; if PR1 merges it into Overall it
disappears, and if it does not, it needs a group.

---

## 2026-09-04 — A4 share unfurl: REPORT ONLY, it left the MINOR CLASS

**The exact condition that pushed it out:** delivering per-wedding OG tags is
not a code change to a component. `vercel.json` rewrites `/w/(.*)` to a single
static `guest-shell.html`, and `functions: 0` — there is no server-rendered head
anywhere in the guest path. **Every guest site on the platform is served the
same bytes.** Making the card carry a couple's name, date and photo requires
introducing a server-rendered head for `/w/`, which is a change to the guest
delivery path itself — the shell the MINOR CLASS excludes — and it is
architecture, not copy.

**AND THE EXISTING BEHAVIOR IS A DECISION, NOT AN OVERSIGHT.**
`scripts/lib/guestShell.mjs` documents it: a per-wedding card is called
"Option B (a server-rendered head)", and it names the binding constraint —

> the decision keys on `websitePasswordEnabled` DIRECTLY, never on the gate's
> runtime result: `api/wedding-by-slug.js` documents a fail-open
> (websitePasswordEnabled true with no stored credential serves the site
> publicly), and a card keyed on gate state would leak through it.

**A PASSWORD-PROTECTED WEDDING MUST NOT UNFURL ITS COUPLE'S NAMES, DATE AND
PHOTO INTO A CHAT APP.** Any implementation has to read
`websitePasswordEnabled` as the gate and treat the fail-open as protected.
`og:image` is absent for a stated reason too: no neutral asset is honest for
every wedding, so `twitter:card` is `summary` rather than advertising a large
image that is not supplied.

**Today, verified live on the fixture** (`/w/chris-and-sia`):

    <title>Wedding invitation</title>
    og:title        You are invited
    og:description  Open your invitation to see the details and reply.
    og:type         website
    og:image        (absent)

**The fallback the run asked me to decide, decided:** when a couple has no
`coverPhoto`, the card should carry **no image at all** and stay
`twitter:card: summary`, exactly as today. Not a stock photo, not the universe's
`imageUrl`. A universe image is Openinvite's asset, not the couple's, and a
guest seeing a stranger's villa on their friend's invitation is worse than a
text card. **The image is the couple's or it is absent.**

**What a correct build looks like, sized:**

  1. A serverless function serving `/w/:slug` HTML: fetch the wedding by slug
     with the admin key, and IF `websitePasswordEnabled !== true`, inject
     `og:title` = couple display name, `og:description` = the date,
     `og:image` = `coverPhoto` when set. Otherwise emit today's generic meta
     unchanged.
  2. `vercel.json`: rewrite `/w/(.*)` to that function instead of the static file.
  3. The function must reuse `coupleDisplayName()` — the #642 lesson — and must
     not read the password gate's runtime result.

Roughly three files, but it puts a serverless hop in front of every guest page
load on the platform, with caching and cold-start consequences for the product's
most-visited surface. **That is an owner decision about the delivery path, not a
minor change.** Sized here; not built.

---

## 2026-09-04 — A5 accordion "No info": DIAGNOSED, REPORT ONLY, and it is two pages not one

**It is not a field-name mismatch.** I checked that first, as instructed. All
eight section keys in `goodToKnow.js` SECTIONS match the studio's `EMPTY`
defaults in `GuestSuitePolicies.jsx`, and every sub-field `linesFor()` reads
exists on the object the studio writes — `lateArrival.policy`, `other.text`,
`dressCode.guidance`, all of them. Nothing of the `coupleName` class here.

**IT IS A COMPONENT-CONTRACT MISMATCH, AND BOTH PAGES DOCUMENT WALKING INTO IT.**

`OptionAccordion` rule 4 renders "No info" whenever a collapsed section has an
empty `summary`:

    {!isOpen && summary.length === 0 && ( <p …>No info</p> )}

That is correct for a SELECTION accordion, where an empty summary means the
couple chose nothing. It is wrong for a CONTENT accordion, where there is
nothing to select and the content lives in `children`.

`WeddingGoodToKnowPage` passes `children` and no summary. So does
`WeddingFAQPage`. Both carry comments saying the chip does not apply to them:

  - FAQ: *"an FAQ has questions and answers and nothing to select, so pills, the
    summary chip and 'No info' have no referent here"*
  - Good to know: *"Nothing here is selectable, so pills and the summary chip do
    not apply"*

**Both authors understood the periphery did not apply and neither could switch
it off, because the component offers no way to.** Its own header states the rule
as absolute: *"Pass [] and it renders 'No info' (rule 4) — never nothing at
all."*

**So every collapsed FAQ question and every collapsed Good to know section
carries the words "No info" underneath it, on the guest site, while holding
content.** The owner reported it on Good to know; it is on both.

**WHY THIS IS REPORT ONLY.** The fix belongs in
`src/components/shared/OptionAccordion.jsx`, which is imported by five surfaces
— ThemeSection, QandA, WeddingParty, WeddingFAQPage, WeddingGoodToKnowPage. The
MINOR CLASS excludes a shared component imported by more than one page "unless
the package names that component", and A5 names the defect, not the component.
**The boundary is the boundary.**

**The fix, sized for a one-line authorization.** Add an explicit opt-out to
`OptionAccordion` — a prop such as `showEmptyState={false}` — defaulting to
today's behavior so the three selection surfaces are untouched, and set it on
the two content surfaces. Roughly 3 files, under 30 lines. **Explicit rather
than implicit**: suppressing the chip automatically when children exist would
change the selection accordions' behavior in a case nobody has thought about,
and the whole reason this bug exists is a rule that was absolute when it should
have been a parameter.

---

## 2026-09-04 — A7 menu order: REPORT ONLY, and the requested order contradicts a documented decision

**It is not per-universe.** `navLayout` appears nowhere in `src/` — it was
scoped as a universe dimension and never built. So the A7 condition "per-universe
or touches navLayout → REPORT ONLY" does not fire.

**But it is not one list either, which is the condition that does fire.**
`WeddingWebsiteNav` assembles the nav from TWO independent sources:

    pageLinks  <- the couple's stored `enabledPages`, in THEIR order,
                  labelled from WEDDING_PAGES
    subLinks   <- derived flags: hasTransport, hasAccommodation, hasMusic,
                  hasExperience, hasGoodToKnow

**The order is per-WEDDING data, not a constant.** A comment states the
intent explicitly: *"Pulled out of enabledPages order and appended rather than
reordered in the data, so a couple's own page order is untouched."* Imposing a
fixed order means either rewriting couples' stored `enabledPages`, which is a
data migration, or overriding their order at render, which reverses a decision
someone made deliberately.

**AND THE REQUESTED ORDER PUTS RSVP FOURTH, WHICH REVERSES A DOCUMENTED FIX.**
The owner's order is Home, Our Story, Celebration, **RSVP**, Stay, Getting here,
Experiences, Styling, Polls, Music, FAQ, Good to know. The code pins RSVP LAST,
and says why, twice:

  - *"D-3: RSVP goes LAST. It is the one thing a guest is asked to do, and it
    read as just another page sitting fourth in a list of eight."*
  - *"THE RSVP IS PINNED AND NEVER ENTERS THE OVERFLOW … on any site with more
    than five links the reply ended up behind 'More', two taps deep on a 390
    screen."*

**The requested position is the exact position that fix moved it away from —
fourth in the list.** And the overflow mechanism takes from the tail, so an
RSVP sitting fourth in a twelve-item nav on a phone is at risk of the same
two-taps-deep outcome the pinning exists to prevent, unless the pin is kept
independently of the order.

**This needs the owner, not a merge.** Three things for him to settle:
  1. Does RSVP move to fourth, accepting the reversal, or stay pinned last with
     the other eleven reordered around it?
  2. Does the fixed order replace each couple's stored `enabledPages` order
     (a migration) or override it at render (couples lose their own ordering)?
  3. The requested list interleaves pageLinks and subLinks — Stay, Getting here,
     Experiences, Music and Good to know are all derived sub-links today — so
     the two lists must be reconciled into one before any order can be applied.

Item 3 is the real work and it is structural. Nothing built.

---

## 2026-09-04 — A9 daily brief zero-state: REPORT ONLY, because the strings are not in the codebase

**Grepped for each string the owner reported:**

    "Happy"                      2 hits (unrelated)
    "tasks are complete"         0
    "logistics are finalized"    0
    "vendors are confirmed"      0
    "dollars spent"              0

**Four of the five do not exist in the repository.** `DailyUpdate.jsx` builds a
prompt and asks an LLM for the briefing as JSON — headline, greeting, countdown,
thisWeek, smartSuggestions, guestAlert, vendorNote, budgetNote, weatherNote,
emotionalNote, forgottenDetail. **The sentences the owner saw are model output,
not templates.** "All 0 tasks are complete" is the model dutifully describing a
wedding with no data, in the confident register the prompt asks for
("punchy newspaper headline… specific to their data").

**THIS IS WHY THE PACKAGE CANNOT BE AUTO.** A9's instruction is to enumerate
every templated string and ship zero and one variants for all of them together.
There are no templated strings to vary. The fix is prompt constraint or a
deterministic bypass, **and neither is verifiable at level 1** — I cannot prove
an LLM will not produce "Happy 0 day" by rendering it once. Shipping an
unverifiable change to what the owner calls the most emotionally loaded screen
in the product is worse than filing it precisely.

**Anyone hunting those strings would never find them.** That is the finding
worth having.

**What IS in the code, and what it does at zero** (the deterministic fallback
used when the model call fails, plus the stat row):

    line 340  `${days} days to go.`                    -> "0 days to go." on the day
    line 345  `${pendingGuests} guest…haven't replied` -> guarded `> 0`, correct
    line 347  `Budget is at ${budgetPercent}%`         -> guarded `> 80`, BUT A PERCENTAGE
    line 424  'Guests confirmed'  value 0              -> renders a bare 0
    line 426  'Budget used'       `${budgetPercent}%`  -> A PERCENTAGE
    line 427  'Vendors booked'    `0/0`                -> renders 0/0
    line 464  `${daysUntil} days to go` : "Today's the day"  -> correctly handled

**Two of those are also B5's target** — `budgetPercent` renders a percentage in
two places, and the calm-pass rules forbid percentages outright. They are picked
up there rather than here, so the two packages do not collide.

**The sized proposal, three parts:**

  1. **A deterministic bypass.** When a wedding has no guests, no tasks and no
     vendors, do not ask a model to characterize it. Render a fixed quiet state.
     This is the part that actually removes "All 0 tasks are complete", and it
     is verifiable because it is code.
  2. **Prompt constraints** for the partly-populated cases: never state a count
     of zero as an accomplishment, never congratulate on an empty set, prefer
     "nothing yet" to "all 0 are complete".
  3. **Zero and one variants** for the seven code-side lines above, which is the
     only part matching A9's original description.

Part 1 is the fix. Parts 2 and 3 are necessary and insufficient on their own.

---

## 2026-09-04 — A8 copy and layout batch: REPORT ONLY, two of four targets could not be located

**The condition that pushed it out:** A8 authorizes four deletions and requires
them as ONE PR. **I can locate two of the four with confidence and not the other
two.** Deleting on a guess is the one thing the run's no-deletion rule exists to
prevent — the risk is not deleting too much, it is deleting the wrong thing and
reporting it as the owner's item.

**Item 10 — the location photo in Celebration event blocks. LOCATED, bounded.**
`WeddingCelebrationPage.jsx`: `_photoUrl` resolved at lines 46, 56 and 67 from
`ceremony.photoUrl`, `reception.photoUrl` and `ev.venuePhotoUrl || ev.photoUrl`;
`hasPhoto` branches the card at line 304; `.cel-photo` CSS at 125-131 including
a responsive aspect-ratio change. **Removing it is a real layout change, not a
string change** — the card has a with-photo branch and a without-photo branch,
and the without branch becomes the only one.

**Item 6 — generated itinerary day headings. LOCATED, but larger than "copy".**
`WeddingCelebrationPage.jsx:229-250`. The day header is not generated text
being swapped for plain text; it is a block whose padding, border, alignment,
display mode and gap are all conditional on the universe:

    isEditorial, isMinimal, isKyoto, isBali, isParis, isCapri, isMykonos,
    isCapeTown, isBrooklyn

and Kyoto injects a `VerticalRule` into it. **"Plain day headers instead" means
collapsing nine universe branches**, which is universe-layout work, not a copy
batch, and it would flatten per-universe treatment that the universe programme
deliberately built.

**Item 8 — the subtext under the Good to know heading. NOT WHERE EXPECTED.**
The GUEST page `WeddingGoodToKnowPage` has no subtext: its `<h1>Good to know</h1>`
is followed directly by the accordion. The only matching subtext is on the
STUDIO page — `GuestSuitePolicies.jsx:231`,
`<DashboardPageHeader title="Good to know" subtitle="What your guests will want
to know" />`. **That is a dashboard page, not a guest page**, so A8's own
condition ("only touch a page A1 confirmed is inside the shell") does not
resolve it either way. The owner needs to say which surface he means.

**Item 12 — the post-RSVP confirmation. NOT FOUND.** No confirmation, thank-you
or success copy exists anywhere in `src/components/guest-website/`. Searched for
thank you, we have your, reply received, see you there, recorded, submitted,
hasReplied. `WeddingRSVPPage.jsx`'s only `onSuccess` handlers are Turnstile
token callbacks, not a post-submit state. **Either the confirmation lives
somewhere I have not found, or the flow does not render one and the owner is
describing something else.**

**What I would do with an answer:** items 10 and 6 are both `WeddingCelebrationPage`
and would be one PR of moderate size — but item 6 needs the owner to confirm he
wants the per-universe day-header treatment flattened, because that is what
"plain day headers" means in this code. Items 8 and 12 need him to name the
surface.

---

## 2026-09-04 — A10 story editor relocation: REPORT ONLY, the destination does not exist

**"Global content" is `ContentTab` inside
`src/components/website-builder/WBRightPanel.jsx`** — one tab holding content
for every page at once: couple names, wedding date, home tagline, the story text,
story photos, milestones and the gallery. That much matches the owner's
description exactly, including why it feels hard to find: the story editor is
several sections down a tab that is not named for it.

**THERE IS NO STORY TAB TO MOVE IT TO.** The builder's tabs are
`[{id:'design'},{id:'content'},{id:'settings'}]` — three, fixed, at line 973.
Nothing named Story exists in the Design Studio. So A10 is not a move; it is
"create a per-page editing surface and relocate a section into it", which is a
different and much larger piece of work.

**And two MINOR CLASS conditions fail:**

  1. `WBRightPanel.jsx` is **993 lines and imported by seven modules**
     (WBLeftPanel, BlockFields, MultiPageWeddingWebsite, UniverseBlocks,
     websitePasswordGate, universeStyling, StudioWebsite). It is a shared
     component imported by more than one page, and A10 does not name it.
  2. Creating a fourth tab and rehoming a section is not "at most 8 files and
     300 changed lines" work with any confidence, and it changes the
     information architecture of the builder — which is a Track B kind of
     decision being made inside a Track A package.

**The question for the owner is which shape he wants**, and they are genuinely
different products:

  - **A fourth tab, "Story"**, sitting beside Design / Content / Settings.
    Simplest, but it sets a precedent — every page will want one, and then the
    tab row is the page list.
  - **Per-page content editing**, where selecting Our Story in the left panel
    shows that page's fields. That is the architecture the comment at line 460
    describes as deliberately abandoned: the old per-section editor became
    unreachable and wrote to `pageSections`, a field the published pages no
    longer read. **Rebuilding per-page editing must not resurrect that write
    path** — the current editor writes straight to `ourStoryContent`, and that
    is the part worth keeping whatever the surface becomes.

Nothing built.

---

## 2026-09-04 — B4 one entry point per action: REPORT ONLY, and the list is empty

The spec's PR4 says report before removing anything. This is that report, and
its finding is that **there is nothing to remove.**

**Measured, not assumed.** Counting `<AvaButton` USAGES (not imports) across
every page in `src/pages`: **no page has more than one.** The 68 references
found earlier are one usage plus one import per page — the intended pattern.

**The spec's own example is already fixed.** `VowsSpeeches.jsx:115` carries the
history: *"It used to open the generic AvaModal chat while three other buttons
opened the purpose-built AIVowsSpeechesAssistant — four buttons, two
destinations. This one now opens the assistant, and the other three are gone."*
The label and the assistant type both derive from the active tab. **Vows has
exactly one Ava entry point and it is the leftmost one the spec asks to keep.**

Checked a second duplication shape — pages carrying more than one
add/new/create primary — across Guests, Vendors, Budget, Schedule, To do and
Moodboard: **at most one each.**

**So B4 removes nothing, and that is the correct outcome rather than a failure
to find work.** The spec was written against a state the codebase has since
moved past. **The entry that matters for the owner is that the premise is stale**
— if he still perceives duplication, it is somewhere these two shapes do not
cover, and naming the screen would find it in minutes.

---

## 2026-09-04 — A11: proposed and sized, none built

**Shell integration for Music** (from A1). `GuestMusic.jsx` is 372 lines and
already resolves typography, universeConfig and theme itself. Integration means
deleting the standalone route, letting `/w/:slug/music` fall through to the
shell, and moving its content into `WeddingMusicPage` — which already exists and
is already mapped, and which the builder preview already renders. **The
preview/live divergence disappears as a side effect.** Medium: one route
deletion, one component merge, and a careful check that the playlist embed and
request-close date survive the move. Blocked on the owner, because it deletes a
route.

**Item 5, Experiences sub-tabs** ("Our favorites" / "Day by day").
`WeddingExperiencePage` currently renders one list. Sub-tabs mean a tab control
inside a guest page, which no guest page has today — so it sets a pattern. Small
in code, a design decision in kind. Needs the owner to say whether guest pages
may carry tabs at all.

**Item 11, address as a Maps link.** Correct: a maps URL needs no API key and no
billing —
`https://www.google.com/maps/search/?api=1&query=<encoded address>` is a plain
link. Smallest item on the list, and it touches the venue address wherever it
renders on the guest site. **Worth doing on its own; it is close to free.**

**Item 13, add-to-calendar.** A feature, sized as one. ICS generation is a
string builder (no dependency), plus a Google Calendar template URL. Needs
decisions before code: one event or one per ceremony/reception, what a guest
with no confirmed times gets, and where the control sits. Two to three files
plus a lib helper.

**`pageTransitionOverride` schema proposal.** Recorded in full on 2026-09-02:
the control writes `weddingDetails.pageTransition`, the guest render reads
`universeConfig?.pageTransition ?? weddingDetails.pageTransition`, and since all
twenty universes declare one, the stored value is never reached. **Reversing the
precedence naively would flatten 18 of 20 live sites to a plain fade**, because
16 hold the seeded default `'fade'` and two more hold `slide`/`reveal`, which
are not cases in `getTransitionVariants` and fall to its fade default. The
shape that works adds an explicit "Match my universe" as the default and treats
every existing stored value as unintentional — a migration, not a config change.
**The scrollAnimation twin:** `isMotionEnabled` reads only
`scrollAnimation !== 'none'`, so `'subtle'` and `'dramatic'` are the same value;
either implement dramatic as `websiteThemes.js:406` describes it, or collapse
the control to two honest options.

**The quiescence re-cost, three corrections still owed.** Not done in this run —
it needs the serialization question answered (is `prerendered/*.html`
serialized HTML, in which case the cue's inline opacity is in it and the
infinite `scrollCueBar` keyframe never is, which removes the ceiling problem
entirely), the comparison row restated in one unit (both options cover exactly
one component; the condition merely runs on six routes), and
`HeroCollage`/`ScrollProgress` measured BEFORE the design rather than during,
because if they settle later than the cue a cue-targeted condition moves the
flip onto them instead of removing it. **Carried forward, still blocking any
quiescence line.**

**The false failure on send — READ ONLY, nothing sent.** The first thing to
establish is whether a retry duplicates or dedupes, and I did not send anything
to find out. From reading `send-invites.js`: it filters guests by ownership,
ensures tokens, and dispatches a batch to Resend. **I found no
already-invited check** — nothing compares against a previous send before
dispatching. That is consistent with a retry re-sending, but it is inference
from reading, not a verified behaviour, and the honest status is unverified.
The two candidate shapes for the false error itself are unchanged: an error
thrown by a non-fatal step after dispatch committed, or a success the client
failed to parse.

**The greyed-out photo banner.** `getBannerImageUrl` and `getDefaultBannerChoice`
resolve from `{ coverPhoto, venuePhotoUrl }`. The photo option is almost
certainly disabled because neither a cover photo nor a venue photo exists on the
wedding — **and the state does not say so**, which is the defect. The fix is
telling the couple which photo is missing and where to add it, not enabling a
control with nothing to show.

---

## 2026-09-04 — THE ACCOUNT: unattended run, Track A and Track B

**WHAT SHIPPED.** Four packages merged: the invitation email became a doorway
(#643), the Experiences heading lost its address (#644), an all-lowercase guest
name now gets a one-tap capitalisation suggestion (#645), and the dashboard says
what is left instead of what percent is done (#646).

**WHAT WAS FILED.** Nine packages report-only: A1, A4, A5, A7, A8, A9, A10, B0,
B4, plus A11's eight sized proposals. Two of them are defects worth acting on —
"No info" renders under content on both FAQ and Good to know, and Music is the
one guest page outside the universe shell.

**WHAT NEEDS THE OWNER.** #647 is open and held: it introduces a shared
`EmptyState` component, and the hold IS the flag the spec asks for. Beyond that:
A8 needs two targets named, A7 needs a decision that reverses a documented fix,
A10 needs a destination that does not exist, and B0's proposals need his
adjustment before any Track B code.

### Merged, with SHAs and file lists

    #643  1905fef  A2   api/send-invites.js 5+/1-
                        src/components/guests/SendInvitesModal.jsx 10+/2-
                        src/lib/emailTemplate.js 39+/6-
      Event blocks out of the invitation, one date line in, CTA "Open your
      invitation" to the site. Reminder and update keep their blocks.

    #644  b26aa71  A6   src/components/guest-website/pages/WeddingExperiencePage.jsx 5+/1-
      The heading is "Experiences", unconditionally.

    #645  604d1b9  A3   src/components/guests/GuestList.jsx 75+/0-
      A prompt, never a rule. Any capital anywhere means no suggestion at all.

    #646  b504eb0  B5   src/pages/Checklist.jsx 12+/8-
                        src/pages/TodoList.jsx 2+/1-
      Three progress bars removed, four completion counts became "what is left".

### Held

    #647  head 070e70d  B3  https://github.com/Lajay06/openinvite/pull/647
      src/components/shared/EmptyState.jsx 73+/0-  (NEW, SHARED)
      src/pages/Vendors.jsx 17+/12-

### Report-only, with the exact condition that pushed each out

  - **A4** — per-wedding unfurl needs a server-rendered head. `vercel.json`
    rewrites `/w/(.*)` to one static file and `functions: 0`. That is the guest
    delivery path, which the MINOR CLASS excludes. **And the generic card is a
    documented privacy decision**: a password-protected wedding must not unfurl
    its couple's names, and the gate fails open, so gate state is an unsafe key.
  - **A5** — the fix belongs in `OptionAccordion`, a shared component imported
    by five surfaces, and A5 names the defect rather than the component.
  - **A7** — the nav is two lists in per-wedding order, not one list. And the
    requested position for RSVP is the exact position a documented fix moved it
    away from.
  - **A8** — two of four targets could not be located; deleting on a guess is
    what the no-deletion rule exists to prevent.
  - **A9** — four of five reported strings are not in the repository. They are
    LLM output, and a prompt change is not verifiable at level 1.
  - **A10** — there is no Story tab to move the editor to, and `WBRightPanel` is
    a 993-line component with seven importers.
  - **B0, B4, A11, A1** — report-only by instruction.

### Time-boxes and stops

**No time-box expired with work stranded.** Every package reached a merge, a
hold, or a filed report. **A8 is the closest thing to a stop**: it was
investigated for its full box and stopped on evidence rather than on the clock —
items 8 and 12 could not be located, so it was filed rather than guessed at.

### Live readings on the bali fixture

    /w/chris-and-sia/our-story   texture opacity 0.015    canvas, correct
    /w/chris-and-sia/our-story   h1 "Our story", shell mounted
    /w/chris-and-sia/experience  "This invitation isn't available"
                                 -> A6 COULD NOT BE VERIFIED LIVE (no guide published)

One false alarm checked and dismissed: the story page reads "Experience the
essence of Japan" on a bali wedding. That string is in no universe config and no
source file. **It is content typed into the fixture, not leaked kyoto copy.**

### The global-order deviation, stated as required

The run reordered the calm pass's own PR1 -> PR5 sequence, and the reason holds:
**PR1 and PR2 need the owner's accept on a mock before any code**, so in an
unattended run they cannot proceed past the mock, and **PR5 was the only
calm-pass item mechanical enough to merge alone.** PR3 was built last and held
so it blocked nothing. **B0 was honoured as the spec requires** — no Track B
code preceded it, and PR1/PR2 remain mocks.

### Where this prompt met a standing rule

**One boundary judgment, recorded because it is a judgment.** The MINOR CLASS
excludes "the guest-site shell (MultiPageWeddingWebsite.jsx and what mounts
inside it)". Read literally that excludes every guest page component, which
would make A6 and A8 impossible — but A8 explicitly instructs touching pages
inside the shell. **I read the exclusion as protecting the shell MECHANISM** —
the wrappers, nav, texture overlay and transition machinery — not every page
component, and said so in #644's body. If that reading is wrong, #644 is the one
merge it affects and a revert is one PR.

**No standing rule was overridden.** Payments untouched, no production writes,
no schema changes, no Base44 writes, one open PR at a time, gate and merge
inseparable on every merge, secrets never printed.

### Two verification honesty notes

**Nothing in this run reached level 3 except the texture reading**, which was
already true before it. #643 is level 1 (rendered locally); the owner sends on
return. #644 is level 1 and could not be read live. #645 and #646 are level 1 —
both live behind an authenticated dashboard this run must not populate.

**The before-and-afters for the dashboard packages are specimens, not
screenshots**, built from the shipped values and styles, and the artifact says
so on the page. Rendering the real components needs a session with a couple's
data, which this run must not create.

---

## 2026-09-04 (Run 2) — R4 Music into the shell: PARITY FAILS, REPORT ONLY

**The condition R4 sets is the one that fails.** "WeddingMusicPage MUST OFFER
EVERY GUEST ACTION GuestMusic OFFERS — song requests writing to the same
endpoint above all." It does not, and it says so itself.

**Side-by-side enumeration of guest actions:**

    GuestMusic.jsx (372 lines)          WeddingMusicPage.jsx (96 lines)
    ------------------------------      ------------------------------
    search for a track                  --
    pick a result                       --
    enter a song manually               --
    attach a note                       --
    give an email                       --
    submit -> /api/song-request-submit  --
    Turnstile protection                --
    "request another" reset             --
    playlist embed                      playlist embed
    requests-closed date                --
    --                                  a LINK to /w/:slug/music

**`WeddingMusicPage` has no request form at all.** Its own header states the
arrangement deliberately: *"The request FORM still lives on the dedicated
/w/:slug/music route (GuestMusic — Turnstile-protected, feature-complete). This
page links to it rather than duplicating it; see the PR notes for why collapsing
the two into one component is deferred rather than done here."*

**AND REMOVING THE ROUTE WOULD CREATE A SELF-LINK.** Line 28:

    const requestHref = weddingDetails.slug ? `/w/${weddingDetails.slug}/music` : null;

If the override is removed so the catch-all serves `WeddingMusicPage` at
`/w/:slug/music`, then that page's "Request a song" link points at the page the
guest is already on. **The form does not move — it disappears**, and the only
affordance left is a link to itself. That is strictly worse than today's split.

**So the shell integration is a MERGE, not a route deletion**: the request form,
its Turnstile gate, the manual-entry path and the requests-closed date all have
to move into `WeddingMusicPage` first, and only then can the override go. That
is a real piece of work, not a one-line route change, and the 96-line component
is the smaller half of it.

**The finding R4 asks me to record, recorded:** `RealWebsitePreview.jsx:45` maps
`'music': WeddingMusicPage`, so **the couple's builder preview shows the
playlist-and-a-link page while guests get the full request form.** The preview
is not a preview of the published page for this one route. It is its own defect
and the merge above closes it — but only the merge does, not the route change
alone.

**Nothing built. GuestMusic untouched, as R4 requires either way.**

---

## 2026-09-04 (Run 2) — R5 share unfurl: BUILT, NOT MERGED, on branch feat/guest-unfurl @ a5733f6

**The condition that took it out of AUTO: it breaks an existing test.** The
MINOR CLASS requires "breaks no existing test", and
`tests/persistence/guest-shell.mjs` asserts
`/w/(.*)` rewrites to `/guest-shell.html` exactly. Serving that route through a
function necessarily changes the assertion.

**And the change it makes is bigger than its diff.** It puts a serverless hop
in front of 100% of guest traffic — the product's front door — where
`functions: 0` today. Run 1 called that an owner decision about the delivery
path; R5 authorized it, but the broken-test condition is the boundary and the
run says not to negotiate with it.

**So the work exists and is unmerged.** Branch `feat/guest-unfurl`, no PR
opened, because #647 is already open and the run holds one-PR-at-a-time.

**What it does, if the owner takes it:**

  - `api/guest-page.js` (new, 130 lines) serves `/w/*`.
  - **Privacy fails closed.** Names, date and image appear ONLY on positive
    confirmation that `websitePasswordEnabled !== true`. The flag set, the
    lookup failed, the field missing, the record absent, ambiguous slug,
    `is_test`, `websiteEnabled !== true` — every one of those serves the bare
    card. It deliberately does NOT consult `websiteGateIsOn`, because that
    reports the gate's runtime result and `api/wedding-by-slug.js` documents a
    FAIL-OPEN: `websitePasswordEnabled` true with no stored credential serves
    the site publicly. A card keyed on the effective gate would leak a
    protected couple's names into every chat app that touched the link.
  - **Delivery fails safe.** No admin key, Base44 slow (2.5s abort), non-200,
    malformed slug, anything thrown — it returns the ORIGINAL shell bytes
    unchanged. The worst outcome it can produce is today's behavior.
  - **The image is the couple's or absent.** No universe image, no stock photo:
    a universe image is Openinvite's asset, and a stranger's villa on a
    friend's invitation is worse than a text card. `twitter:card` only becomes
    `summary_large_image` when an image is actually supplied.
  - The test's assertion was rewritten to the invariant it was protecting —
    "a guest route is never served the marketing homepage" — with both
    acceptable destinations named, rather than one string. `/rsvp/` stays
    static; it has nothing to unfurl.

**What a protected wedding would show:** exactly today's card — title "Wedding
invitation", og:title "You are invited", the generic description, no image,
`twitter:card: summary`. Indistinguishable from an unprotected wedding whose
lookup failed, which is the point.

**Not verified live.** The unfurl fetch R5 asks for needs this deployed; it is
not. `test:ci` passes with the updated guard.

---

## 2026-09-04 (Run 2) — R2 menu order: REPORT ONLY, with the numbers

**R2's test, answered from the code.** `MAX_VISIBLE_LINKS = 5`. RSVP is pinned
and never enters the overflow, so:

    restSlots     = MAX_VISIBLE_LINKS - 1 = 4
    visibleLinks  = rest.slice(0, 4) + [RSVP]
    overflowLinks = rest.slice(4)

**Position four DOES sit inside the visible slice** — the slice is five. So the
literal test R2 sets is passed. **But applying the order does not put RSVP
fourth, and cannot, without weakening the pin R2 forbids weakening.**

Simulated against the owner's exact order:

    requested : Home, Our Story, Celebration, RSVP, Stay, Getting here,
                Experiences, Styling, Polls, Music, FAQ, Good to know
    VISIBLE   : Home, Our Story, Celebration, Stay, RSVP
    behind More: Getting here, Experiences, Styling, Polls, Music, FAQ,
                Good to know

**RSVP renders at visible position 5 of 5, not 4.** The pin appends it after
the slice by construction — `[...rest.slice(0, restSlots), rsvpLink]` — so its
index in the couple's list changes nothing about where a guest sees it. The
only way to render RSVP fourth is to stop pinning it, which is the overflow fix
R2 says not to weaken.

**And "Stay" is promoted into the visible row by the requested order**, taking
the fourth slot, while "Getting here" drops behind More. That is a real
consequence of the order the owner asked for and he should see it before it
ships.

**A second obstacle R2 does not address.** The nav is still two lists reconciled
at render: `pageLinks` from each couple's stored `enabledPages`, then `subLinks`
from derived flags, deduped on label, with a comment stating the intent —
*"pageLinks come first, so the couple's own page order wins the position."*
Imposing a fixed order overrides every couple's own ordering, which is a
decision about their data, not a layout change.

**So: the order is implementable, its effect is not what the ruling expects, and
one of its consequences is a page moving behind More.** Reporting rather than
merging, because R2's premise — that position four is reachable — is not true of
the rendered nav, and the difference is exactly the thing the pin was built to
protect.

**What the owner should decide:** whether he wants the other eleven reordered
with RSVP still pinned last (buildable now, small), or RSVP genuinely fourth
with the pin removed (reverses the documented fix), or the two lists reconciled
into one stored order first (a data change).

---

## 2026-09-04 (Run 2) — B0-ADJUST: every Ava action, and whether a function backs it

**The roadmap's instruction is "remove every 'I can do that for you' that is not
backed". Measured against the code, THERE IS NOTHING TO REMOVE.**

**`AvaModal` is the only Ava surface that offers to do anything.** Its
`ACTION_INSTRUCTIONS` tell the model exactly seven action types, and every one
maps to a real executor in `confirmAction`'s `entityMap`:

    offered in the prompt        executed by
    -------------------------    --------------------------------------------
    create_guest                 createGuest(cleaned)
    create_budget_item           base44.entities.Budget.create(cleaned)
    create_vendor                base44.entities.Vendor.create(cleaned)
    create_schedule              base44.entities.Schedule.create(cleaned)
    update_guest                 updateGuest(action.data.id, cleaned)
    update_vendor                base44.entities.Vendor.update(action.data.id, cleaned)
    navigate                     navigate(action.data.path)

**Seven offered, seven backed. No orphan.**

**And every write passes a validator first.** `validateAvaAction(entity, data,
{ isUpdate })` runs before `entityMap` is consulted; a rejection sets the card
to error and toasts the reason rather than writing. `ava-action-validation.mjs`
pins the literal payloads a previous broken prompt produced as regression
fixtures, so a future prompt edit that reintroduces them fails in CI.

**Nothing executes without a tap.** The prompt ends "Always describe what you
will do before the ACTION block. The user must confirm before anything
executes", and `ActionCard` renders pending state with confirm and cancel.

**The other Ava surfaces offer no actions at all:**

    AvaChatPod.jsx               0 ACTION instructions, 0 writes  — chat only
    AvaButton.jsx                0 / 0 — it is a button, it opens a surface
    AIVowsSpeechesAssistant.jsx  0 / 0 — generates text into a field the couple edits

**So the "unbacked offer" defect the roadmap describes does not exist in the
current code.** That is the deliverable: the list, and the finding that it is
clean.

**WHAT IS NOT COVERED, AND IT IS THE LIVE RISK.** The new standing constraint
says Ava may only say what she can READ, and any output built from a norm
rather than this wedding's data is a defect. **The action surface is bounded;
the PROSE surface is not.** `AvaChatPod`'s system prompt invites planning
advice, and `DailyUpdate`'s brief asks for a "forgottenDetail" — literally
"one thing couples often forget at this stage", which is a norm by
construction, not a fact about this wedding.

R7 closed the worst of that by not calling the model at all when there is
nothing to read. **`forgottenDetail` and the chat pod's advice remain
norm-derived by design and are the next thing to look at** under the new
constraint. Filed, not changed — narrowing what Ava may say in prose is a
product decision, not a terminal's.

---

## 2026-09-04 (Run 2) — C3: the email inventory (REPORT ONLY)

Every email the system can send, what backs it, and its one job.

| email | template | universe-styled | plain-text alt | its one job |
|---|---|---|---|---|
| **Invitation** | `src/lib/emailTemplate.js` type `invite` | **YES** | **YES** (`text`) | get the guest to open the site |
| RSVP reminder | same, `reminder` | YES | YES | chase a reply |
| Details update | same, `update` | YES | YES | say what changed |
| Thank you, attending | same, `thank_you_attending` | YES | YES | close the loop |
| Thank you, declined | same, `thank_you_declined` | YES | YES | close the loop kindly |
| **Welcome (day 0)** | `api/emails/onboarding-day1.js` | **no** | **no** | get the couple started |
| Onboarding day 3 | `api/emails/onboarding-day3.js` | no | no | nudge |
| Onboarding day 7 | `api/emails/onboarding-day7.js` | no | no | nudge |
| Purchase confirmation | `api/emails/purchase-confirmation.js` | partial | no | receipt |
| Gift receipt | `api/emails/gift-receipt.js` | no | no | receipt |
| Gift reveal | `api/emails/gift-reveal.js` | no | no | reveal a gift |
| Collaborator invite | `api/send-collaborator-invite.js` | no | no | bring a helper in |
| Guest reply relay | `api/send-guest-reply.js` | no | no | forward a guest's note |

**OTP / auth email: not in this repository.** Base44 owns the login flow, so
its OTP mail is not ours to inventory or style. Flagged because it is the FIRST
email a couple ever receives from the product and we neither control nor
measure it.

**THE PLAIN-TEXT GAP IS THE BIGGEST FINDING.** The five guest-facing
invitation-family emails build a real `text` alternative — `renderInvitationEmail`
returns `{ html, text }`. **Every other email is HTML only, and no sender passes
`text:` to Resend at all.** Grepped `api/send-*.js` and `api/on-signup.js`:
zero occurrences. So even the invitation's text alternative is BUILT AND NOT
SENT unless a caller passes it — worth confirming per-caller before assuming
guests get it.

An HTML-only email is a deliverability and accessibility liability: some clients
and most screen-reader workflows prefer `text/plain`, and its absence is a
recognised spam signal.

**Sending identity.** One domain, two shapes:

    FROM = 'Openinvite <hello@openinvite.com.au>'          most system mail
    FROM = `${fromName} <hello@openinvite.com.au>`         invitations, where
                                                           fromName is the couple

**SPF / DKIM / DMARC are not configured in this repository** and cannot be —
they are DNS records on `openinvite.com.au` plus Resend's domain verification.
**I cannot verify them from here and did not.** They must be checked in the
Resend dashboard and at the DNS provider. Given every invitation is sent
*as the couple* from our domain, DMARC alignment is the thing most likely to be
silently wrong.

**Anything still Base44-looking or generic, as C3 asks:**

  - **The welcome email is the worst of them.** Not universe-styled, no text
    alternative, and it is the one carrying the address-as-name defect: it
    renders `name.split(' ')[0]`, so a `full_name` holding an email address
    prints the address where a first name belongs. The owner's own account has
    a real `full_name` ("La Jay"), so the defect appears on accounts where
    Base44 seeds `full_name` from the address — new signups, which is exactly
    who receives this email. **Still unconfirmed on a real fixture account;
    reading a second account's `User` record was never authorized.**
  - The three gift/receipt emails share the shell but carry no universe styling,
    which is defensible: a receipt is from Openinvite, not from the couple.
  - The collaborator invite and the guest-reply relay are the plainest and the
    most obviously system-generated.

---

## 2026-09-04 (Run 2) — A-NEW3 personalised celebration: SIZED, NOT BUILT

**What "stable event IDs" requires today, which is the answer A-NEW3 asks for.**
`WeddingCelebrationPage` builds its event list with THREE different id schemes:

    ceremony    _id: 'ceremony'                  <- a literal
    reception   _id: 'reception'                 <- a literal
    other       _id: ev.id || `ev-${Math.random()}`   <- A RANDOM FALLBACK

**The third one is the blocker.** An event with no `id` gets a fresh random
identity on every render, so it cannot be matched against anything a guest
replied to. Filtering Celebration by `event_responses` requires that every event
has an id that is the same on the guest's device today as it was when they
replied — and one in three code paths cannot promise that.

`event_responses` is a real Guest column (`src/lib/attendees.js` documents it as
the per-event overlay, with `plus_one_event_responses` alongside), so the
response side is sound. **The event side is not.**

**Size: medium, and the first half is a data change.** Give every event a stable
id at creation, backfill the ones that have none, then filter. The filter itself
is small. The backfill is a migration, so it is the owner's.

**Risks, named:**
  - **A guest who is invited to nothing sees an empty page.** The filtered view
    needs a real empty state, not a blank list.
  - **Ceremony and reception use literal ids.** If any wedding stores a custom
    event whose id happens to be `'ceremony'`, the filter collides.
  - **Plus-ones reply through a different column.** A filter reading only
    `event_responses` would show the wrong set for a plus-one.
  - Getting it wrong means a guest is told they are not invited to something
    they are invited to, which is worse than showing everything.

---

## 2026-09-04 (Run 2) — B4 re-based: still nothing to remove

Re-checked on current code after Run 1's finding. **No page carries more than
one `<AvaButton` usage.** The Vows case the spec names was fixed before Run 1
and its history is in the code. Checked a second shape — pages with more than
one add/new/create primary — across Guests, Vendors, Budget, Schedule, To do and
Moodboard: at most one each.

**B4 removes nothing, for the second run in a row.** If the owner still
perceives duplication, it is in a shape neither check covers, and naming the
screen would settle it in minutes.

---

## 2026-09-04 (Run 2) — C6: guardrails, proposed and costed, none built

**Rate limiting and Turnstile on guest-writable endpoints — MEASURED, and the
picture is better than the ask assumes.** Every guest endpoint already carries
`checkRateLimit`. Turnstile is on five of them:

    turnstile + rate limit   rsvp-link-request, rsvp-poll-vote,
                             song-request-submit, wedding-poll-comment,
                             wedding-poll-vote
    rate limit only          contact, rsvp-lookup, rsvp-submit,
                             song-request-review, wedding-poll-results,
                             wedding-attendees, my-guests-rsvp

**`rsvp-lookup` is the one the roadmap singles out as a name-to-invite oracle,
and it has rate limiting but no Turnstile.** `rsvp-submit` likewise. Those two
are the gap. Cost: they already import the same helpers the five protected
endpoints use, so it is a small change per endpoint plus a client-side widget on
the RSVP lookup form — the friction question is the real cost, not the code.

**Nightly export of all entities to owned storage.** Proposal: a scheduled
Vercel cron hitting an admin-key endpoint that pages every entity and writes
NDJSON to owned object storage, one file per entity per day, with a manifest
recording row counts so a silent truncation is visible. Cost: one function, one
cron entry, one storage bucket, and a decision about where "owned" is. **The
row-count manifest is the part not to skip** — an export that silently exports
nothing looks exactly like an export.

**Feature flags — schema, therefore the owner's.** Proposal only: a single
`FeatureFlags` entity keyed by name with a boolean and an optional account
allowlist, read once at app start. Not built, not designed further, because
adding an entity is outside every grant in this run.

**Data deletion for couple and guest.** Size: large, and the hard part is not
the delete. A couple's deletion cascades to guests, RSVPs, budget, vendors,
schedule, polls, song requests and uploaded media; a guest's deletion must not
break the couple's counts. Needs a written policy before code — what is deleted,
what is anonymised, what is retained for the couple's own records, and how long
it takes.

**Deploy-freeze and schema-checkpoint rules — draft wording for CLAUDE.md:**

> **Deploy freeze.** No merge to main in the 48 hours before a wedding date held
> by any live account. The wedding-day surface is the one that cannot be rolled
> back in time.
>
> **Schema checkpoint.** No Base44 schema change ships without a recorded
> checkpoint: the entity, the field, its type, whether it is nullable, and the
> read path that would break if it were absent. Unknown fields are silently
> dropped by the platform, so a field that is added and not recorded is a field
> that will look like a persistence bug months later.

---

## 2026-09-04 (Run 2) — THE ACCOUNT

**WHAT SHIPPED.** Six merged this run: Ava stops speaking when there is nothing
to read (R7), "No info" no longer renders under content (R3), the two owner
deletions I could locate (R6), a countdown after replying (A-NEW1), a guest
read-boundary guard in CI (C1), and a dependency audit in CI (C2).

**WHAT WAS FILED.** Eleven report-only: R4, R5, R2, B0-ADJUST, C3, C4, A-NEW3,
B4, C6, plus A8's two unlocatable items and C5's blocking conflict.

**WHAT NEEDS THE OWNER.** #647 still held. Two built-and-unmerged branches:
`feat/guest-unfurl` and `feat/rsvp-calendar`. And four rulings whose premises
did not survive contact with the code.

**LOOK AT FIRST: THE B1 MOCK.** B0 found `DailyUpdate` already is a briefing, so
PR1 is not inventing one — it is deciding that Overall becomes the one place,
and what happens to the DailyUpdate route. My ruling as instructed: it stays and
redirects. That is the decision waiting.

### Merged, with SHAs and files

    #648  e2c087a  R7      src/pages/DailyUpdate.jsx 56+/3-
    #649  87e8463  R3      OptionAccordion.jsx 29+/5-, WeddingFAQPage 1+,
                           WeddingGoodToKnowPage 1+, QandA 2+/1-
    #650  a10e2e0  R6      WeddingCelebrationPage 12+/34-, RSVPPage 5+/13-
    #651  7fa154f  A-NEW1  src/components/rsvp/RSVPPage.jsx 33+/0-
    #652  536a6c0  C1      guest-read-boundary.mjs 97+, runner 6+, ci.yml 3+,
                           package.json 2+/1-
    #653  251f930  C2      ci.yml 10+, package.json 2+/1-, verify-all.mjs 1+

### Built, not merged — branches, no PR

    feat/guest-unfurl   a5733f6   R5, OG tags with fail-closed privacy
    feat/rsvp-calendar  76f66fc   A-NEW2, ICS plus Google Calendar

**Both are open-and-hold packages, and I did not open the PRs.** The standing
rule "never leave a PR open at the end of a session" wins over the run's
open-and-hold instruction, and #647 is already open from Run 1. Opening two more
would leave three. **The standing rule won and this is me saying so.**

### FOUR RULINGS WHOSE PREMISES DID NOT SURVIVE THE CODE

**R4 Music — parity fails.** `WeddingMusicPage` has NO request form. Its own
header says the form "still lives on the dedicated /w/:slug/music route"; it
renders a LINK to that route. Removing the override would point that link at
the page the guest is already on — **the form does not move, it disappears.**
Shell integration is a merge, not a route change.

**R5 unfurl — breaks an existing test.** `tests/persistence/guest-shell.mjs`
asserts the exact rewrite destination. Built and pushed instead.

**R2 menu order — position four is inside the visible slice, and RSVP still
renders fifth.** `MAX_VISIBLE_LINKS = 5`, `restSlots = 4`, and the pin appends
RSVP after the slice by construction. Simulated: visible becomes Home, Our Story,
Celebration, **Stay**, RSVP — and "Getting here" drops behind More. The only way
to render RSVP fourth is to stop pinning it, which R2 forbids.

**R7 "Happy 0 day" — also not a template string.** `Happy` appears twice in the
repo, both unrelated. All five reported sentences are LLM output. The grounding
fix is unaffected and shipped.

### Report-only, with exit conditions

  - **R4** — parity condition failed (named above).
  - **R5** — breaks an existing test.
  - **R2** — the order's rendered effect is not what the ruling expects.
  - **A8 items 6 and 8** — item 6 means collapsing nine per-universe branches,
    which is universe-layout work; item 8 exists only as a studio subtitle.
  - **C5** — **DIRECT CONFLICT.** It requires "a real-shaped record on a test
    account" because is_test records are invisible to the guest site. That is a
    production write, which this run forbids outright. **The standing rule wins;
    C5 was not built.** It needs either an owner-run seed or an exemption.
  - B0-ADJUST, C3, C4, A-NEW3, B4, C6 — report-only by instruction.

### Time-boxes

**None expired with work stranded.** Two process losses worth recording: a
`pr:merge` blocked ten minutes on CI that takes ~9.5, and I polled
`fix/accordion-no-info` when the branch was `feat/accordion-no-info` — my own
error, ~8 minutes.

### Live readings on the bali fixture

    /w/chris-and-sia/our-story   texture opacity 0.015   canvas, correct
    /w/chris-and-sia/our-story   shell mounted, transition present
    /w/chris-and-sia/experience  "This invitation isn't available"

### WHAT THE FIXTURE STILL LACKS FOR LIVE VERIFICATION

  1. an experience guide, published — blocks A6, two runs now
  2. Good to know sections with `display` toggled on — blocks R3
  3. FAQ entries — blocks R3
  4. a celebration event with a photo and one without — blocks R6 item 10
  5. a guest who has not yet replied — blocks A-NEW1 and A-NEW2
  6. the paris fixture published at all — linen 0.012 never read live

### Verification levels for every merge

    R7      level 1  branch and strings proven; no model called when empty
    R3      level 1  every consumer enumerated; level 3 needs fixture FAQ data
    R6      level 1  unconditional removals; level 3 needs fixture events
    A-NEW1  level 1  every branch enumerated; level 3 needs an unreplied guest
    C1      level 1+2 runs in verify and CI; failure path fired deliberately
    C2      level 1+2 threshold measured at exit 0

**Nothing this run reached level 3.** The fixture list above is why.

### Missing input

**`claude/ava-design-spec.md` does not exist.** `claude/` contains
`homepage-copy.md` and `rsvp-experience-ruling.md` only. The run required
reading it before anything. I used the voice rules stated inline in the prompt
instead — numbers not adjectives, no pleasantries, no exclamation marks, no
percentages, Ava never sells.

---

## 2026-09-05 (Run 3) — R11 Music: SIZED, NOT BUILT, and the reason is styling not logic

R11 grants the real fix: give `WeddingMusicPage` the song-request form, then
remove the route override. **The form's logic ports cleanly. Its appearance does
not, and that is the whole cost.**

**Measured:**

    GuestMusic.jsx          372 lines, ~17 pieces of form state
    hardcoded white-on-dark colour stops:  24 occurrences of rgba(255,255,255,…)
    its page surface:       background '#0A0A0A', minHeight 100svh
    WeddingMusicPage:       backgroundColor theme.lightBg, color theme.lightText

**GuestMusic is a standalone dark page. The shell page is light and
universe-typed.** So this is not an extraction — it is an extraction PLUS a
restyle of roughly 250 lines of form markup from hardcoded white-on-black to
`theme.lightText` / `theme.accent` / `typography`, on a Turnstile-protected
guest write path.

**And it is over the cap either way**, so R11's own condition sends it to
open-and-hold rather than AUTO.

**I chose not to attempt it in this run, and that is my judgment rather than a
blocker.** Restyling 250 lines of a working guest write path unattended, with no
way to see the result — the fixture has no music data, so even a live check
would render nothing — risks shipping a form that submits correctly and looks
broken. **A dark form dropped onto a light page is worse than the current
split**, because the current split at least looks deliberate.

**The shape when it is done:**

  1. Extract the form to `src/components/guest-website/SongRequestForm.jsx`,
     taking `{ weddingSlug, details, theme, typography, universeConfig }` and
     owning all 17 pieces of state, the Turnstile ref, the debounce and the
     `/api/song-request-submit` POST — same endpoint, same payload.
  2. Restyle every hardcoded colour to the universe's own, which is the real
     work and the part that needs eyes.
  3. `GuestMusic` renders it, so that route keeps working while it exists.
  4. `WeddingMusicPage` renders it beneath the playlist embed, replacing the
     "Request a song" link that would otherwise point at itself.
  5. Only then remove the `/w/:slug/music` override from `App.jsx`.
  6. Re-run the parity table; every guest action present on both.

**The finding R4 recorded still stands and this closes it when done:**
`RealWebsitePreview.jsx:45` maps `'music': WeddingMusicPage`, so the couple's
builder preview shows the playlist-and-a-link page while guests get the full
request form. **The preview is not a preview of the published page for this one
route.**

---

## 2026-09-05 (Run 3) — C3-ADD: SPF, DKIM and DMARC read from live DNS (REPORT ONLY)

Read directly from DNS, not from configuration:

    _dmarc.openinvite.com.au   TXT  "v=DMARC1; p=none;"
    openinvite.com.au          TXT  google-site-verification only — NO SPF
    send.openinvite.com.au     TXT  "v=spf1 include:amazonses.com ~all"
    send.openinvite.com.au     MX   feedback-smtp.ap-northeast-1.amazonses.com
    resend._domainkey…         TXT  a valid RSA public key — DKIM IS PUBLISHED
    openinvite.com.au          MX   SMTP.GOOGLE.COM

**DKIM is configured and DMARC exists. Two things are wrong.**

**1. DMARC IS `p=none`, WHICH ENFORCES NOTHING.** It is monitor-only: a receiver
that finds a failing message is told to take no action. **Anyone can send mail
as openinvite.com.au today and it will not be rejected on our policy.** For a
product whose central artifact is an email a stranger receives, and which sends
**as the couple** from our domain, that is the gap that matters. There is also
no `rua=` reporting address, so nobody is even collecting the failure data
`p=none` exists to gather.

**The path is the standard one and it is not a code change:** add `rua=`, watch
reports until legitimate senders are known to align, then move `p=none` →
`p=quarantine` → `p=reject`. **Moving straight to `p=reject` without the
reporting window risks silently dropping real invitations**, which is worse than
the current state.

**2. SPF IS ON `send.` AND NOT ON THE APEX, BUT MAIL IS SENT FROM THE APEX.**
Every `FROM` in the code is `hello@openinvite.com.au` — the apex — and the apex
TXT has no `v=spf1` record at all. The SPF that exists is on
`send.openinvite.com.au`, the Resend/SES subdomain.

**Whether that is a real failure depends on alignment mode**, which I cannot
settle from DNS alone: DKIM is what usually carries DMARC alignment for Resend,
and DKIM here is published and valid. So mail is probably passing on DKIM
alignment while SPF is neutral for the apex. **With `p=none` nothing is being
enforced either way, so no one would notice yet — and that is precisely what
makes it dangerous to move to `p=reject` before checking.**

**What the owner should verify in the Resend dashboard, which I cannot reach:**
whether the verified domain is the apex or `send.`, and which `FROM` Resend
considers aligned. If Resend expects `hello@send.openinvite.com.au` and the code
sends from the apex, tightening DMARC would break every email the product sends.

**Not changed. DNS is not in this repository and would be a production change.**

---

## 2026-09-05 (Run 3) — C9 monitoring (REPORT ONLY)

**What exists:** `src/lib/sentry.js` initialises Sentry when `VITE_SENTRY_DSN`
is set, with `tracesSampleRate: isGuestRoute() ? 0 : 0.2` — **guest routes are
deliberately not traced**, which is a sensible cost decision and also means the
guest site is the least observed surface in the product.

**What I cannot see from the repository:** alert RULES live in the Sentry
dashboard, not in code. **I cannot confirm a single alert exists, and I did not
assume one does.** The honest status is unknown, not absent.

**What must be true for "weddings happen Saturday 6pm", and the gap is the
routing not the tooling:**

  1. **An error-rate alert that reaches a phone.** Sentry can email, and email
     at 6pm on a Saturday is not a notification. It needs a channel that makes
     a phone ring.
  2. **An uptime check on a real guest URL**, not the marketing homepage. The
     two are different rewrites to different destinations, and after R5 lands
     they will be different runtimes. A check on `openinvite.com.au` proves
     nothing about `/w/<slug>`.
  3. **A check that asserts content, not status.** The guest shell returns 200
     while React fails to boot; the SPA fallback returns 200 with an HTML body
     for a missing asset. **A 200 is not a working invitation.** The check
     should assert a known string from a published fixture page.
  4. **Deploy-time verification.** Every merge to main should read one live
     fixture page and fail loudly if it does not render.

**Minimum viable, in order of value per hour: (2) and (3) together as one
synthetic check against `/w/chris-and-sia/our-story` asserting a known string,
routed to a phone. That single check would have caught every delivery-path
failure this project has had.**

---

## 2026-09-05 (Run 3) — S1 three-state guest site (SIZE ONLY)

**Size the preview toggle first, as instructed, because it is what makes the
rest testable.** Today the guest site has one state. Day-of and after-mode are
both time-derived, so without a toggle neither can be seen except by waiting.

**The toggle: small.** A query parameter honoured only for the owner —
`?preview=day-of` / `?preview=after` — read once in `MultiPageWeddingWebsite`
and passed down as the state. It must NOT be honoured for guests: the existing
`?preview=true` on `wedding-by-slug` was an unauthenticated flag that a bare
query string could set, and that was the shape of a real leak. **This one keys
on the owner's own session, not on the URL alone.** Roughly one file plus the
gate.

**Day-of Layer 1: medium.** Home becomes Now / Next from the schedule, polling
each minute. Needs: a stable per-event time source (the same missing piece
A-NEW3 found — `_id: ev.id || 'ev-' + Math.random()`), a defined "now" when
events lack times, and a venue plus rideshare link. The polling is trivial; the
event identity is not.

**After-mode: medium to large.** Home becomes photos, guestbook, playlist,
thank-you. Photos and guestbook are surfaces that do not exist yet, so this is
mostly new build rather than a state change.

**The honest sequence: toggle, then day-of, then after.** Building after-mode
first would mean building two new surfaces before anything can be seen.

---

## 2026-09-05 (Run 3) — S2 universe as a data object (SIZE ONLY)

**Measured distance from "a new universe is content, not code":**

    per-universe layout components   78 files in guest-website/layouts/
    isX branches in guest pages      192
    entrance configs                 5 of 20 (fifteen fall back)
    dispatch tables keyed on universe 8 files

**Every place a universe is still code:**

  1. **`src/components/guest-website/layouts/` — 78 components.** AmalfiWave,
     AspenPine, BaliFooter, KyotoMasthead, EnsoRing and so on. A new universe
     needs its own masthead, footer, section mark and signature ornament, and
     each is a React file.
  2. **192 `isKyoto` / `isBali` / `isEditorial` style branches** inside the
     guest page components, controlling padding, alignment, borders and whether
     an ornament is injected. `isMinimal` and `isEditorial` lead at 27 each.
  3. **Dispatch tables** in `UniverseBlocks.jsx`, `GuestPageHeading.jsx` and
     `UniverseWorldView.jsx` mapping a layout id to a component.
  4. **`entranceConfig.js`** — five bespoke, fifteen on the default.
  5. `websiteThemes.js` itself, which IS data and is the part already right.

**THE REAL COST OF SERIES 2 IS THE 78 COMPONENTS AND THE 192 BRANCHES, NOT THE
CONFIG.** Adding a twenty-first universe today means writing four or five new
React components and touching every guest page. The config object is the
smallest part of the work and the only part that looks like content.

**The direction, if the owner wants it:** the 192 branches are mostly
padding/alignment/border decisions that could become tokens on the universe
config, and the ornaments could become one component reading an SVG path from
config. Neither is small, and doing it badly would flatten exactly the
per-universe character the programme built. **This is the standing constraint's
own reasoning — no new universes until the existing twenty render consistently —
seen from the code side.**

---

## 2026-09-05 (Run 3) — S3 wallet pass phase A (SIZE ONLY)

**Every external prerequisite the owner must obtain, because none of it is
code:**

  1. **Apple Developer Program membership** — annual fee, and it is an
     organisation enrolment for a company-issued pass.
  2. **A Pass Type ID** registered in the developer account.
  3. **A Pass Type ID certificate** (.p12), which expires annually and must be
     rotated before it does or every pass stops issuing.
  4. **The Apple WWDR intermediate certificate.**
  5. **Google Wallet: a Google Cloud project, a service account, and Google
     Wallet API issuer access** — issuer approval is a separate application.

**The code half is comparatively small:** `passkit-generator` in a serverless
function for Apple, a signed JWT for Google. Both need the certificate material
as environment secrets.

**The blocking risk is certificate rotation.** A pass certificate that expires
silently means invitations stop issuing with no code change and no deploy — the
kind of failure nothing in CI can catch. **Whatever ships must include an expiry
check that alerts before the date.**

---

## 2026-09-05 (Run 3) — S4 deletion for couple and guest (SIZE ONLY)

**A wedding deletion must cascade through**, at minimum: WeddingDetails, Guest,
RsvpResponse, Budget, Vendor, Schedule, Task, Note, MoodboardItem, Poll,
PollVote, PollComment, SongRequest, questionnaire responses, and any uploaded
media (cover photo, venue photos, gallery, moodboard images) which live outside
the entity store.

**A guest removal must touch**: the Guest row, their RsvpResponse, their
`event_responses` overlay, their plus-one records, their PollVote and
PollComment rows, their SongRequest, their table assignment, and the couple's
counts — **which must not silently change meaning.** Removing an attending guest
after seating changes the seating chart.

**THE HARD PART IS NOT THE DELETE.** Two structural obstacles, both already
documented in the codebase:

  1. **Anonymous-created records cannot be deleted by anyone.**
     `anonymous-endpoints.mjs` records that PollVote, PollComment, RsvpResponse
     and SongRequest are written with `created_by_id: 'anonymous'`, and each
     entity's delete RLS is `{ created_by_id: '{{user.id}}' }` — **no logged-in
     user, and not even the admin key, can satisfy that.** So the guest-created
     records are exactly the ones a deletion request most needs to remove, and
     today they cannot be. **This is a schema/RLS change, therefore the owner's.**
  2. **A plus-one has no record of its own** — it exists inside a Guest's
     `event_responses`. Deleting "a person" is not always deleting a row.

**AND THERE IS NO SURFACE WHERE A GUEST CAN ASK.** Grepped the guest site and
RSVP flow for any delete/remove/opt-out affordance: **none exists.** A guest who
wants their data removed has no route but emailing the couple, who has no tool
to do it.

**Needs a written policy before any code:** what is deleted, what is anonymised,
what is retained for the couple's own records, and how long it takes.

---

## 2026-09-05 (Run 3) — THE ACCOUNT

**WHAT SHIPPED.** One merge: the nav order, with RSVP fourth and a guard that
fails by name if it ever leaves the visible slice (#657, `04ba815`).

**WHAT WAS FILED.** Ten report-only: R11, C3-ADD, C9, S1, S2, S3, S4, plus the
C8 voice file and the motion budget from Run 2's carry-over.

**WHAT NEEDS THE OWNER.** Five held PRs, all with previews: #654 the briefing on
Overall, #655 the unfurl function, #656 add-to-calendar, #658 the Ava eval set,
and #647 empty states from Run 1.

**LOOK AT #654 FIRST.** Overall is the one place, the briefing is the first
thing on it, and the DailyUpdate route redirects rather than being deleted.

### Merged

    #657  04ba815  R12  WeddingWebsiteNav.jsx 33+/14-,
                        nav-rsvp-visible.mjs 47+, runner 6+,
                        ci.yml 3+, package.json 1+
      NAV_ORDER is one fixed list; RSVP sits fourth and is guarded by a test
      rather than by a pin. "Getting here" moves behind More, by ruling.

### Held, with previews

    #654  B1-BUILD      github.com/Lajay06/openinvite/pull/654
    #655  R5 unfurl     github.com/Lajay06/openinvite/pull/655
    #656  A-NEW2 cal    github.com/Lajay06/openinvite/pull/656
    #658  C7 eval set   github.com/Lajay06/openinvite/pull/658
    #647  B3 empty      (Run 1)

### Report-only, with exit conditions

  - **R11 Music** — the form's LOGIC ports; its STYLING does not. GuestMusic is
    a standalone dark page with 24 hardcoded `rgba(255,255,255,…)` stops; the
    shell page is `theme.lightBg`. So it is an extraction plus a 250-line
    restyle of a Turnstile-protected write path, over the cap either way. **I
    chose not to attempt it unattended with no way to see the result** — a form
    that submits correctly and looks broken is worse than the current split.
  - **C3-ADD** — DNS is read-only to me and changing it is a production change.
  - **C9, S1, S2, S3, S4** — report/size only by instruction.

### THE THREE FINDINGS WORTH THE OWNER'S TIME

**1. DMARC is `p=none` with no `rua=`.** Nothing is enforced and nobody is
collecting the data that would let it be. SPF sits on `send.openinvite.com.au`
while every `FROM` in the code is the apex, `hello@openinvite.com.au`, which has
no SPF record at all. DKIM is published and valid, so mail is probably passing
on DKIM alignment — **which is exactly why moving to `p=reject` without a
reporting window could silently drop every invitation.**

**2. A universe is still mostly code.** 78 per-universe layout components, 192
`isKyoto`-style branches inside the guest pages, 8 dispatch tables, and 5 of 20
entrance configs. **The config object is the smallest part of a universe and the
only part that looks like content.** That is the standing constraint's own
reasoning seen from the code side.

**3. Guest-created records cannot be deleted by anyone.** PollVote, PollComment,
RsvpResponse and SongRequest are written with `created_by_id: 'anonymous'`, and
each entity's delete RLS is `{ created_by_id: '{{user.id}}' }` — no logged-in
user and not even the admin key can satisfy it. **The records a deletion request
most needs to remove are the ones that cannot be.** Schema and RLS, therefore
the owner's. And there is no surface anywhere for a guest to ask.

### Time-boxes

None expired with work stranded. R11 was investigated for its full box and
stopped on a judgment, recorded as mine.

### Live readings on the bali fixture

**None this run.** Nothing merged that the fixture can show: R12's nav order
needs a guest visiting a published site with more than five pages enabled, and
the fixture has fewer.

### WHAT THE FIXTURE STILL LACKS — three runs, still no level 3

  1. an experience guide, published — blocks A6 from Run 1
  2. Good to know sections with `display` toggled on — blocks R3
  3. FAQ entries — blocks R3
  4. a celebration event with a photo and one without — blocks R6 item 10
  5. **a guest who has not yet replied** — blocks A-NEW1 and A-NEW2
  6. **the paris fixture published at all** — linen 0.012 never read live
  7. **more than five enabled pages** — blocks R12's nav order
  8. **music data** — blocks any R11 verification

**Items 5, 6 and 7 unblock the most.** A published paris fixture with all pages
enabled and one unreplied guest would make five held or merged packages
verifiable at level 3 in a single sitting.

### The Ava spec

**`claude/ava-design-spec.md` was still not present** when this run started.
`claude/` holds `homepage-copy.md` and `rsvp-experience-ruling.md` only. I used
the rules stated inline in the prompt and wrote them into `PRODUCT_VOICE.md` so
they exist in the repository rather than only in a prompt.

### Death to Stock licence

**Not checked and not checkable from here.** Whatever stock imagery the
marketing pages carry, the licence terms are a contract the owner holds — I can
see file paths, not entitlements. **It is the owner's to confirm**, and it
should be confirmed before launch rather than after.

---

## 2026-09-05 (Run 4) — R16 Music into the shell: BUILT. Parity table re-run.

Run 3's R4 refused this correctly: removing the route alone would have turned
WeddingMusicPage's "Request a song" link into a link to itself, and the form
would have disappeared rather than moved. The merge is what makes the route
deletion safe, so the merge is what this did.

**PARITY TABLE, re-run against the built page.** Every row measured on a
running preview, not read off the source.

    guest action                       GuestMusic.jsx      WeddingMusicPage.jsx
                                       (before, routed)    (after, in the shell)
    --------------------------------   ----------------    --------------------
    enter a song by hand               yes                 yes
    attach a note                      yes                 yes
    give an email                      yes                 yes
    email REQUIRED when the couple
      requires it (onlyForConfirmed-
      Guests / limitOnePerGuest)       yes                 yes
    submit -> /api/song-request-submit yes                 yes
    Turnstile gate before submit       yes                 yes
    "request another" reset            yes                 yes
    playlist embed                     yes                 yes
    requests-close date shown          yes                 yes
    requests-closed state              yes                 yes
    search for a track                 DEAD                absent
    pick a search result               DEAD                absent
    a LINK to /w/:slug/music           --                  replaced by the form
    universe typography                yes (own loader)    yes (from the shell)
    universe palette                   NO — 66 stops       yes
    site nav and footer                NO — a Back link    yes

DEAD, not missing: search was removed in the 2026-08-18 rebuild. GuestMusic
still carries `searchQuery`/`searchResults`/`searching`/`searchError` state and
a `searchResults.map` block, but nothing ever assigns a result — `setSearchResults`
is called in exactly one place, the reset handler, with `[]`. The new page omits
the state rather than porting a path that cannot fire.

**THE PAYLOAD IS IDENTICAL, MEASURED NOT ASSERTED.** Both builds served, both
forms driven by real keystrokes, Cloudflare's script stubbed so the widget
issues a token, and the POST intercepted:

    before  {"weddingSlug":"ada-and-alan","spotifyTrackId":null,"title":"This Must Be the Place",
             "artist":"Talking Heads","album":"","albumArt":"","duration":0,"explicit":false,
             "spotifyUrl":"","submittedBy":"Ada","password":"","guestEmail":"",
             "guestNote":"For the first dance.","turnstileToken":"probe-turnstile-token"}
    after   (byte-identical)

**COLOR: 66 hard-coded stops across 20 distinct values, not 24.** Counted in
GuestMusic.jsx: 13x #FFFFFF, 7x #1DB954, 5x #0A0A0A, 3x #000000, 1x #EEEEEE,
25 rgba(255,255,255,x) across nine alphas, 4 rgba(29,185,84,x). None is a
universe's. All are gone; the page now derives from the palette through
src/lib/surfaceTint.js — the same helper the RSVP form uses, mixed rather than
alpha-blended so contrast stays measurable over a universe's texture.

**Rendered evidence.** Same route, same seed, same viewport, two universes:

  · before/bali and before/mykonos are the SAME BLACK PAGE. Only the section
    mark and the heading face differ; ground, text and action color are
    identical because they were hard-coded. That is the defect in one image.
  · after/bali is sand ground, terracotta action, jungle-green nav and footer.
  · after/mykonos is white ground, blue action, navy nav and footer.

**One behavior change beyond the port, deliberate.** The shell gated
`/w/:slug/music` on `music.guestRequestsEnabled` alone. That was harmless while
the standalone route shadowed it and nothing here was reachable; serving it for
real, it would hide a couple's playlist and their own written message behind a
switch that governs only the FORM. Availability is now requests OR a playlist OR
a custom message. Nobody sees a form when requests are off.

**GuestMusic.jsx stays in the tree, unrouted.** Deleting it in the same change
that unrouted it would remove the thing to compare against if the shell page
turns out to be wrong on production data.

**Known and NOT closed here:** the builder preview (RealWebsitePreview.jsx)
renders this page live, so a couple clicking Submit in their own preview would
file a real song request. That is not new and not this page's alone —
WeddingRSVPPage is mapped there the same way and posts to
/api/rsvp-link-request. It is one defect about the preview, and it wants one
fix at the preview, not a guard per page.

---

## 2026-09-05 (Run 4) — R17 Anonymous-record deletion. REPORT ONLY; schema is the owner's.

Source: `base44/entities/*.jsonc`, the RULE-12 schema mirror in this repo. **I
could not read the live app's RLS** — the Base44 MCP wants re-authorization, and
RLS is not exposed over the entities REST API. One place where the mirror and
the code disagree is flagged below; it needs a live check before anyone acts on
it.

### 1. Current delete RLS, per entity a guest creates

    entity                    delete RLS                        who can satisfy it
    ----------------------    ------------------------------    ------------------
    PollVote                  {created_by_id: "{{user.id}}"}    NOBODY
    PollComment               {created_by_id: "{{user.id}}"}    NOBODY
    RsvpResponse              {created_by_id: "{{user.id}}"}    NOBODY
    SongRequest               {created_by_id: "{{user.id}}"}    NOBODY
    QuestionnaireResponse     {created_by_id: "{{user.id}}"}    NOBODY
    GuestbookEntry            {created_by_id: "{{user.id}}"}    NOBODY (dead entity)
    GuestContactSubmission    null                              ANYONE with a token

**"NOBODY" is literal, not rhetorical.** Every one of these rows is written by
an `api/*.js` endpoint through the admin key on behalf of an anonymous guest,
and Base44 stamps `created_by_id: "anonymous"` itself. No real principal's
`{{user.id}}` is ever the string `"anonymous"` — not the wedding owner's
session, not the admin key. The rule cannot be satisfied by anyone, ever.
Confirmed empirically twice (BASE44_PLATFORM_NOTES.md): `DELETE` returns **404,
not 403**, and a follow-up `GET` returns the record unchanged. The denial is
disguised as "not found", which is why it went unnoticed for so long.

**GuestContactSubmission is the opposite failure and the one I would look at
first.** All four rules are `null`. `delete: null` on an entity whose `read` is
also `null` means any holder of any API token for this app can delete any
couple's contact submissions. It was set open deliberately — an owner-scoped
rule would have locked out the real owner too — but the reasoning stopped at
`update`; `delete` inherited the same `null` without the same argument. The
mediated endpoint (`api/guest-contact-review.js`) checks ownership for the
couple's path; nothing checks it for anyone else's.

**One contradiction I could not resolve.** The mirror says
`SongRequest.update` is `{created_by_id: "{{user.id}}"}`. Both
`api/song-request-submit.js:197` and the erasure ledger say the live rule is
`{"data.ownerUserId": "{{user.id}}"}` — and `api/song-request-review.js` works
in production using the couple's own caller token, which the mirror's rule
could not permit. **The live app is almost certainly right and the mirror is
stale.** Worth confirming, because it is also the proof for §2.

### 2. What Base44 RLS can express

**A rule CAN reference a data field of the row itself.** `{"data.<field>":
"{{user.id}}"}` is supported and already in production here — `Notification`
uses it on all three of read, update and delete:

    "delete": { "data.recipient_user_id": "{{user.id}}" }

This is the capability the whole answer turns on, and it is already proven in
this app rather than hoped for.

**A rule CANNOT reference the parent wedding's owner.** There is no join, no
subquery, no traversal from `PollVote.wedding_id` to
`WeddingDetails.created_by_id`. RLS compares fields of the row against
`{{user.id}}` and nothing else. So the owner's id has to be ON the row.

**A server function CANNOT bypass RLS — not from here.** `BASE44_ADMIN_KEY` is
a normal credential evaluated against the same rules; it is not a superuser.
Confirmed with Base44 support 2026-08-16: no RLS expression can match a
service principal.

**There IS a service-role path, and it is not reachable from this codebase.**
`base44.asServiceRole.entities.*` works only INSIDE Base44-hosted functions
(`base44/functions/<name>/entry.ts`, `createClientFromRequest(req)`). Every
`api/*.js` here is a Vercel function calling in over REST, which is explicitly
excluded. The plan supports hosted functions; the repo has zero infrastructure
for them.

**And the simplest fix is already disproven.** Supplying `created_by_id`
explicitly in an admin-key create is IGNORED — tested on two entities,
2026-08-03. Base44 always overwrites it with `"anonymous"`.

### 3. The smallest change that works

**Stamp the owner on the row; scope delete on the stamp.** Per entity:

    1. add   ownerUserId: { type: "string" }
    2. write ownerUserId: wedding.created_by_id   at the existing create call
    3. set   "delete": { "data.ownerUserId": "{{user.id}}" }

**Every write site already holds the value.** `wedding` is resolved before the
insert in all of them — `wedding-poll-vote.js:122`, `wedding-poll-comment.js:114`,
`rsvp-poll-vote.js:103`, `rsvp-submit.js:155/165`, `questionnaire-answer-submit.js`
— and two of them ALREADY read `wedding.created_by_id` to stamp a Notification's
`recipientUserId`. No new lookup, no new resolution, no new endpoint. One field
and one line of RLS each. `SongRequest` needs only step 3; it has carried
`ownerUserId` since 2026-08-17.

**What that buys.** The wedding owner's own session token can delete their own
guests' rows directly through `base44.entities.*` — no mediated endpoint, no
admin key. And a wedding deletion can cascade, because "every row belonging to
this wedding" becomes a query the owner is permitted to both read and delete.

**What it does NOT buy, stated plainly:**

- **Existing rows are not fixed by it.** ~2,240 historical rows carry no
  `ownerUserId` and cannot be given one — `update` is owner-scoped by the same
  broken rule, so they are unwritable as well as undeletable. They need a
  Base44 support purge (ticket text is already drafted in
  BASE44_PLATFORM_NOTES.md). A migration that back-stamps them is not possible.
- **`update: null` is the price of the transition.** A row must be writable to
  be stamped, so either the stamp happens at CREATE only (leaving every existing
  row behind, which is the recommendation) or `update` opens up first.
- **A guest still cannot erase their own record.** They have no account and no
  `{{user.id}}`. Guest-initiated erasure needs a mediated endpoint that verifies
  an RSVP token, and that is a separate piece of work.
- **GuestContactSubmission needs the same treatment for the opposite reason** —
  to CLOSE `delete`, not to open it.

**Ordering, if the owner declares it.** `SongRequest` first: it is one RLS line,
the field already exists and is already populated, and it makes the §1
contradiction visible either way. Everything else follows the same three steps.

**PROPOSED ONLY. Nothing in `base44/entities/` was touched.**

---

## 2026-09-05 (Run 4) — TRACK D. D0 report, and the specification I could not find.

**FIRST, AN HONEST GAP.** The instruction says "as already specified". I looked
for that specification and could not find it: not in `scratchpad/DECISION-LOG.md`,
not in any `*.md` in the repo, not in the git history of any branch (the only
"Track D" in this repo's history is the 2026-08 Guest-PII migration, a different
thing entirely), and not in memory. It was given in a session whose prompt was
never written down. **I did not invent a brief and then report against it as
though it were the owner's.** D0 below is a real report on the ground it would
sit on; the reading I built D1 to is stated in D1 and is mine, not the owner's.

### D0 — the ground sample content would land on

**A new couple's site is completely empty, and every page says so.** The
onboarding payload (`src/lib/onboardingSave.js`'s `buildWeddingDetailsPayload`)
writes names, date, venue, guest count, style, universe, and mode. It writes no
story, no schedule, no FAQ, no registry, no music, no policies, no photos. So
the first thing a couple sees after choosing a universe is thirteen guest pages
in their chosen palette with nothing on them — and the builder preview shows
them exactly that.

**This is the strongest argument FOR sample content and it is not a small one.**
A universe is sold on how it looks with content in it. An empty bali and an
empty mykonos differ by a ground color and a section mark. The product's whole
proposition is invisible at the exact moment a couple is deciding whether to
pay.

**AND THE PRODUCT HAS ALREADY BEEN BURNED BY THIS EXACT CLASS OF THING.**
`793148c` / #576, "stop publishing words the couple never wrote", found three
sites where our copy published as the couple's:

  · `WeddingHomePage`'s tagline published *"We are overjoyed to celebrate with
    you."* — our sentence, in the couple's first person, read by their guests as
    theirs. The builder showed the same sentence as a GREY PLACEHOLDER, which
    conventionally means "an example", while it published verbatim.
  · `StudioWebsite`'s draft default pre-filled `welcomeMessage` with the same
    sentence, so a couple's draft carried our words **persistably** — one save
    away from being genuinely theirs in the database.
  · Music's request message was published to guests while the editor's
    placeholder said something else entirely.

That is not a cautionary analogy. It is the same feature, shipped by accident,
and the failure mode was precisely "sample copy on a published site". Any
deliberate sample-content system has to be built as though that already
happened, because it did.

**One live instance remains, by explicit ruling.**
`DEFAULT_MUSIC_REQUEST_MESSAGE` (`src/lib/musicCopy.js`) still publishes to
guests when a couple has not set a request message. #576 left it deliberately —
"both rulings followed literally rather than either revised" — and its own
header documents why it is a PRE-FILLED EDITABLE VALUE rather than a
placeholder, and why it uses `??` so that a deliberately cleared message
publishes nothing while an unset one takes the default. **That distinction is
the single most important piece of prior art for Track D**: it is the existing
answer to "when may our words appear on a couple's site", and the answer is
"only when they are visible and editable in the couple's own editor, never as
grey placeholder text".

**What exists that is NOT sample content, so nobody mistakes it for a head
start:**

  · `src/lib/mockUniverseData.js` — palette/type/tagline metadata for the three
    `/mocks/universe/{a,b,c}` design mocks. No wedding content, and its own
    header says mock-only.
  · `scripts/lib/renderHarness.mjs`'s `PUBLISHED_WEDDING` — the test seed. It
    IS content-shaped and it is the closest thing that exists, but it is a test
    fixture: it declares its own blind spots ("almost no per-page content"), it
    lives in `scripts/`, and it stamps `is_test` on everything it writes.
    Reusing it as product sample content would tie a customer-visible surface
    to a file whose whole job is to change whenever a guard needs it to.
  · `EmptyState.jsx` (#647, still open) — the other answer to the same problem.
    Sample content and a good empty state are alternatives on the same page,
    not layers; whichever a couple meets first is the one that has to be right.

**The constraint that shapes everything.** Base44's entity store is one
database shared by previews and production
(BASE44_PLATFORM_NOTES.md — "every preview click-through writes real production
data"). So sample content must never be written to `WeddingDetails` to be
shown. If it is stored to be rendered, it is one publish away from being
served, and the couple has no way to tell our words from theirs. **Sample
content has to be data the product renders WITHOUT persisting, or it repeats
#576 with more surface area.**

### D1 — built and held (#661), against a brief that is mine

`feat/sample-content-bali`, own worktree, **two new paths and zero modified
files**: `src/lib/sampleContent/bali.js`, `src/lib/sampleContent/index.js`,
`tests/persistence/sample-content-never-published.mjs`.

The brief it is built to is stated at the top of the PR as MINE, not the
owner's, so it can be rejected cheaply. Three safety properties, all pinned:
never a record (no slug, `websiteEnabled: false`, nothing writes to Base44),
always marked (`__sample: true`), and no sample sentence is also a live default
anywhere in `src/` — which is #576's exact shape.

**Both structural checks were verified against planted failures.** Planting an
import into the guest tree failed check 3; planting a sample sentence into
`src/lib/musicCopy.js` failed check 4. **The first version of check 4 did not
catch its plant** — apostrophes in prose comments open a false string literal
and desynchronize the scan, so it was extracting 32 misaligned fragments and
reporting green. Comments are stripped now. Worth recording because it was
green and wrong before it was green and right.

**Not wired to anything, and not registered in the runner.** Both need edits to
existing files. Which surfaces a separate finding, below.

### D2 — what the rest costs

**1. A consumer, and it is one decision not one task.** The data renders
through `RealWebsitePreview` today with no change to that component — it takes
`details` and renders. What is missing is the surface that offers it: a control
in the Design Studio that says "show me this universe with content in it", and
a way back out. **The hard part is not the render, it is the exit.** A couple
who has looked at a full bali must never be one click from having it, and must
never wonder whether they now have it. That is the whole of #576 restated as an
interaction problem. Small in code, and the only part worth arguing about.

**2. Nineteen more universes: a copywriting job, roughly 2-3 hours each done
properly.** The shape is now fixed, so each is prose, not engineering. But
prose under two real constraints: no souvenir vocabulary (`CLAUDE.md`'s
reductio), and enough distinctness that kyoto's sample does not read as bali's
with the nouns swapped — which is the failure mode, and it is the same one the
universe taglines already drifted into.

**3. Imagery is the missing half and it is not free.** Every sample here is
text. A universe with sample copy and no cover photo still renders a grey hero,
which is most of what a couple is judging. Sample imagery means licensed stock
per universe (`IMAGE_MANIFEST.md` is the existing machinery) — twenty covers
minimum, and the licence question is the owner's, per the earlier note in this
log.

**4. If sample content is ever PERSISTED, it becomes a different project.**
Everything above holds because nothing is written. A "start from this sample"
feature that copies the content into the couple's own record is a legitimate
product, but it is a data-migration-shaped thing with an erasure problem
attached, and it should be sized separately rather than allowed to grow out of
this.

### A separate finding, surfaced by D1: `npm run test:persistence` is broken on main

`scripts/test-persistence.mjs` imports `../tests/persistence/spotify-oauth.mjs`.
**That file does not exist on any branch.** The suite dies with
`ERR_MODULE_NOT_FOUND` before running a single check, and has been. `ci.yml`
records the round-trip suite as a required LOCAL gate rather than a CI step,
which is exactly why nobody noticed: the one runner that would have failed is
the one CI never runs. Every domain file under `tests/persistence/` still
passes when imported directly — that is how R15's and D1's checks were run
here — so this is the runner, not the tests. Not fixed: the missing file was
deleted, and restoring it is a decision about what that Spotify test should
assert, not a mechanical repair.

---

## 2026-09-05 — THE ACCOUNT FOR RUN 4

**One merged and live. Two held with green CI and previews. Three reports.**

### Merged and verified on production

**R15 — the allSettled fix, #659.** `#654` had not merged, so the correctness
fix split out as instructed. `Promise.all` in the Overall loader rejected on the
FIRST store that failed and discarded the seven that had already succeeded: one
flaky request emptied the whole page, and every stat card read zero — which is a
CLAIM about a couple's wedding, not an absence of data.

It reuses `src/lib/dashboardSources.js` rather than hand-rolling `allSettled`.
That module already existed for DailyUpdate, is already behaviourally tested
with injected rejecting loaders, and already knows the trap: the soft default on
`resolveMyWedding`'s loaders converts a failure to `[]` one layer down, so
`{ strict: true }` is mandatory or the classification reports "ok" for an outage.

**A CI pin had to move, and moving it was the point of the pin.**
`tests/persistence/dashboard-sources.mjs` asserted that ONLY DailyUpdate opts
into strict loaders, with a comment saying a second page must be a deliberate
decision rather than a copy-paste. It now names both, with the reason: both
render COUNTS drawn from several stores, where a swallowed failure prints a zero
that reads as fact. Anywhere that renders a LIST, the soft default is still
right, and the pin still keeps that the default.

**Verified live, not assumed.** Production serves
`/assets/Dashboard-BeE99WTm.js`, which contains both the new banner copy and the
`dashboardSources` path. Merged AND confirmed on openinvite.com.au.

### Held, with previews, on the owner's instruction

Both are held because the instruction said hold. Recording that explicitly
because the standing rule is that no PR outlives its session.

**R16 — music into the shell, #660.**
`https://openinvite-git-feat-music-in-shell-lajay06-5660s-projects.vercel.app`
CI green. The form moved into `WeddingMusicPage`, the route override is gone,
and the payload is byte-identical — measured on two running builds with real
keystrokes and an intercepted POST, not asserted. Parity table above.

**Two corrections to the brief, both factual.** The count was **66 hard-coded
stops across 20 distinct values**, not 24. And **bali is itself a light-ground
universe** (`lightBg #F2E9D3`), so the second render is mykonos (`#FFFFFF`), the
clearest available contrast. Before, those two universes render the SAME BLACK
PAGE — only the section mark and heading face differ. That is the defect in one
image.

**D1 — sample content for bali, #661.**
`https://openinvite-git-feat-sample-content-bali-lajay06-5660s-projects.vercel.app`
CI green. Two new paths, zero modified files. **Its brief is mine, not the
owner's** — the "as already specified" specification does not exist anywhere I
can reach, and inventing one and then reporting against it as though it were
the owner's would have been the worse failure. Stated at the top of the PR so it
can be rejected cheaply.

### Reported, nothing built

**R17 — anonymous-record deletion.** The short version: for PollVote,
PollComment, RsvpResponse, SongRequest, QuestionnaireResponse and GuestbookEntry,
`delete` RLS is `{created_by_id: "{{user.id}}"}` and **nobody can satisfy it** —
not the owner's session, not the admin key — because Base44 stamps every
guest-written row `"anonymous"` itself. `GuestContactSubmission` is the opposite
failure: `delete: null`, so **anyone with any token can delete any couple's
contact submissions**. The fix exists and is already proven in this app:
`Notification` scopes on `{"data.recipient_user_id": "{{user.id}}"}`, so RLS CAN
read a field of the row. Stamp `ownerUserId` at create — every write site already
holds `wedding.created_by_id`, and two already use it — and scope delete on it.
**Proposed only. Nothing in `base44/entities/` touched.**

**D0 and D2.** Above.

### The finding nobody asked for

**`npm run test:persistence` has been dead on main.** It imports
`tests/persistence/spotify-oauth.mjs`, which exists on no branch. The suite
throws `ERR_MODULE_NOT_FOUND` before a single check runs. It is a required LOCAL
gate, never a CI step — which is exactly why it went unnoticed. Every domain
file still passes when imported directly; this is the runner, not the tests. Not
fixed, because restoring the missing file is a decision about what that test
should assert, not a repair.

### What I got wrong, in order

**A probe that lied about the product.** The first interaction probe reported
that every controlled input in the guest shell silently discarded what was
typed — on `WeddingMusicPage` AND on the untouched `WeddingRSVPPage`, which
would have been an enormous pre-existing defect. It was the harness: the
entrance overlay was intercepting, and `dismissEntrance` had not been called.
Checked before reporting it, rather than after.

**A guard that was green and wrong.** D1's most important check — no sample
sentence is also a live default — could not see a deliberately planted leak.
Apostrophes in prose comments open a false string literal and desynchronize the
scan. Found only because the plant was run; fixed rather than trusted.

---

## 2026-09-05 (Run 5) — TWO RULINGS, RECORDED

### R18 — a prompt that cites a prior prompt as delivered is making an unverifiable claim

"Track D, as already specified" referenced a specification the owner never
pasted. It was not in the log, the repo, any branch's history, or memory.
**Every prompt is self-contained from here.** An instruction cannot cite
context that only exists in a session nobody wrote down, because the recipient
has no way to tell "you forgot to include it" from "you included it and I lost
it" — and both readings lead somewhere worse than asking.

**The correct response, and the model for the next one:** build to a stated
brief, and say AT THE TOP that the specification did not exist and the brief is
mine. Not silence, not a refusal to act, and above all not reporting against an
invented spec as though it were the owner's.

**This run proved the rule twice more.** "All standing rules and the MINOR CLASS
carry over" — I do not have the MINOR CLASS text either, and acted on a
conservative reading of it (small, reversible, no new surface) while saying so.
And P1's rulings (a)-(e) were pasted in full, which is exactly why P1 could be
answered precisely and Track D could not.

### R19 — a guard that has never seen a failure has never been tested. Plant the failure.

D1's leak check was GREEN AND WRONG. It found nothing because it could not see
anything: apostrophes in prose comments opened false string literals and
desynchronized the scan. It was caught only by planting a leak and watching the
check stay green.

**Record it beside SKIPPED-IS-NOT-PASS. They are the same lesson from opposite
sides:** one is a gate that reports nothing because it did not run, the other a
gate that reports success because it could not look. Both present as green.
Neither is evidence.

**The rule: before believing a new check, make it fail on purpose.** Every check
added this run was planted against — six plants, six confirmed failures — and
that is the only reason two of them are trusted, because both were wrong first.

**Run 5 then produced a third instance inside its own P2 report.** Classifying
the local-only gates, I wrapped each in `timeout`, which does not exist on
macOS, and read exit 127 as "all five gates fail". A result that looks like a
verdict and is actually the runner never having run — the same defect the whole
P2 task exists to fix, committed while writing it up. Re-run without the
wrapper, all five pass.

---

## 2026-09-05 (Run 5) — P1: #661 against the actual Track D rulings

**The rulings were pasted in full this time, which is why this could be
answered precisely.** Where #661 matched, where it did not, and what was
amended on its own branch.

    ruling                                              verdict
    -------------------------------------------------   --------------------------
    (a) sample copy never on a published guest site      MATCHED
    (a) ...and the section is omitted                    ALREADY THE PRODUCT'S
                                                         BEHAVIOR, except /music
    (a) preview, studio and picker only                  NOT MATCHED — no consumer
    (a) polls named as sample copy                       WAS MISSING — now added
    (b) sample imagery behind a publish acknowledgement  NOT MATCHED — no imagery
    (c) no is_sample field stored on a wedding record    MATCHED, now structurally
    (d) new files only, no shared-component edits        MATCHED
    (e) chris-and-sia shows omission; studio shows
        samples                                          HALF REACHABLE — see below

### (a) — omission is already the product's behavior, and /music is the exception

Rendered the live fixture, `/w/chris-and-sia`, published on bali with four
enabled pages and almost no content:

    /home         renders. nav: Home, Our Story, Celebration, RSVP
    /our-story    renders the couple's own text
    /celebration  renders. ceremony only; no reception is set, and none is invented
    /rsvp         renders
    /faq          "This invitation isn't available"    OMITTED
    /registry     "This invitation isn't available"    OMITTED
    /stay         "This invitation isn't available"    OMITTED
    /music        "Music requests unavailable  <- Back"   NOT OMITTED

**Three of four omit correctly today. `/music` does not** — it serves the
standalone black GuestMusic page as a dead end instead of being absent, because
the route override is still on main. **#660 closes exactly this**: with the
override gone and availability broadened to requests OR a playlist OR a
message, chris-and-sia has none of the three and `/music` joins /faq,
/registry and /stay. That is a second, independent argument for #660 that came
out of testing something else.

**Also observed, not introduced by this work:** the fixture's stored
`welcomeMessage` is still the #576 sentence, *"We are overjoyed to celebrate
with you."* — persisted on a real record, exactly the residue #576 flagged and
did not clean. It does NOT publish (the render fallback was removed), but it is
still in the database.

**And two guest pages still carry OUR first-person copy**, which is #576's shape
unaddressed rather than residual:

    WeddingStayPage.jsx:59       "We've curated a few great places to stay..."
    WeddingTransportPage.jsx:67  "Here's everything you need to know to get to the venue."

Openinvite speaking as the couple, to their guests, on a published site. Not
touched this run — it is a copy ruling, not a bug fix.

### (c) — matched, and now structural rather than promised

`__sample` was a plain key on a record-shaped object: never stored, because
nothing writes, but one `JSON.stringify` from a request body. It is now
**non-enumerable**, so serialization, spread and `Object.keys` all drop it
while `isSample()` still reads it. Asserted by a check that was planted against.

**A finding that makes this ruling less hypothetical than it sounds:** the live
`GuestContactSubmission` row carries an **`is_sample: false`** field that
appears nowhere in `base44/entities/` and nowhere in `src/`. An `is_sample`
field already exists in this app's production schema, undeclared in the mirror.
Whatever put it there is not in this repository.

### (d) vs (e) — a contradiction I am not resolving silently

(d) says new files only. (e) requires the studio preview of chris-and-sia to
show bali's samples. **A consumer cannot exist without editing an existing
file** — a studio surface, or App.jsx for a route. Under (d), (e)'s second half
is unreachable. Its first half (published shows omission) is reachable and is
verified above.

So the studio half is NOT built and NOT faked. What I did instead, with a
throwaway probe that is not part of the PR: fed the sample to the SAME page
components the studio preview maps, by stubbing the slug endpoint. That shows
what the sample looks like. It does not show that a studio surface exists,
and it is labelled that way.

### What the amendment actually fixed — three sections rendered NOTHING

Checking against (a)'s enumeration ("names, story, events, polls,
Good-to-know") is what exposed these. All three were written from what the
field name suggested rather than from the page that reads it:

  · `celebrationContent.customMessage` — the page reads `daySchedule`/`blocks`
  · `weddingPolicies: { enabled, text }` — `goodToKnow.js` reads `{ display }`
    plus per-section fields (`guidance`, `option`, `unplugged`, `policy`), so
    **every Good-to-know entry was invisible**
  · `transport.notes` — the page renders `guestSuiteTransport.places/notes`;
    `transport.enabledModes` only decides whether the page EXISTS

**Then the fix for the first was also wrong.** `daySchedule` renders only inside
`!hasEvents && daySchedule.length > 0`, and the sample has a ceremony and a
reception, so it could never show. `celebrationContent` is gone; the sample's
events are `mainCeremony` and `reception`, which render.

**And polls were unreachable once added** — the polls page has no entry in
`subPageAvailability`, so `enabledPages` is the only route to it. Sample polls
existed for one commit on a page that returned "this invitation isn't
available".

**None of that was visible to a guard that checks strings**, which is R19 again:
four new checks now read the record the way the pages do — the reader for each
section, `enabledPages` reachability, the day-schedule exclusion, and the
marker's absence from serialized output. Every one was planted against.

The leak check was rewritten a second time: scraping quoted strings from source
let a match BEGIN on a closing quote and swallow a whole file as one "sentence".
It walks the data now, which needs no parser and cannot desynchronize.

**Amendment size:** three files, all mine, all on #661's own branch, no new
surface, no product code. I judged that inside a conservative reading of the
MINOR CLASS and did not hold. Guard 19/19; build and lint clean.

---

## 2026-09-05 (Run 5) — P3: GuestContactSubmission `delete: null`. REPORT ONLY.

**No RLS change made. Schema is frozen Friday to Sunday and today is Saturday.**

**The entity is ORPHANED, which changes the size of this.** Both its writer
(`api/collect-guest-contact.js`) and its reader/mutator
(`api/guest-contact-review.js`) were deleted in `b080a25` on 2026-08-27.
Nothing in the product reads or writes it. `scratchpad/WAVE2-ORPHANED-SCHEMA.md`
recorded it then as 1 production row, `status=approved`, a spent receipt.

### Who can present a token that reaches that delete?

**Read is worse than "any authenticated user" — it is nobody at all.** Probed
directly, unauthenticated, no `Authorization` header and no `api_key`:

    GET /api/apps/<app>/entities/GuestContactSubmission   ->  200, full row

`read: null` is genuinely public, confirming for this entity what the 2026-08-03
`RsvpResponse` probe found. **So an attacker needs no token and no id.**

**I did not probe DELETE, deliberately.** `delete: null` is the same convention
and there is every reason to expect it behaves the same way, but establishing
that means destroying the one production row, and P3 is report-only. **Stated as
unprobed rather than asserted from the pattern** — the platform notes already
record one case (`DELETE` masked as `404`) where a delete did NOT behave the way
its rule read.

### Is there a read rule that limits visibility, so ids must be guessed?

**No.** `read: null`. The row is returned by an unauthenticated bulk list, so
ids are enumerable, not guessable. There is no obscurity layer to lean on.

### Has any delete been recorded in the retention window?

**No audit log is reachable** — Base44 exposes none through the REST surface
this project uses, and the workspace MCP is unauthorized this session. So this
cannot be answered directly, and I will not pretend otherwise.

**The available proxy answers it anyway.** The ledger recorded exactly 1 row on
2026-08-27; there is exactly 1 row today, same id, `created_date` 2026-08-02,
`status=approved`. The only writer was deleted on 2026-08-27, so no row can have
been created since — meaning the count cannot have been restored after a
deletion. **Nothing has been deleted.** That is inference from a count, not a
log, and it is worth exactly what that is worth.

### What is actually exposed

**One row, and it is synthetic.** Name carrying a test marker, an
`@example.com` email, a 10-digit phone, a "1 Test St" address. Not a real
person's data. It also predates PR 1b's encryption: it carries **plaintext**
`name`/`email`/`phone`/`mailing_address`, not the `encrypted_contact_details`
+ `email_hash` the schema mirror describes. `created_by_id: "anonymous"`, so
R17's deletion gap applies to it too.

**Severity, stated plainly: low, and it is not zero.** One synthetic row,
world-readable and probably world-deletable, on an entity nothing uses. The
real finding is not this row — it is that **an orphaned entity kept "because an
orphaned entity with no rows costs nothing to keep" is not costless when its
rules are open and its rows are public.**

### The shape to declare Monday

Unchanged from R17, and it fits this entity too: carry the wedding owner's id
on the row at write time — every write site already holds
`wedding.created_by_id`, and two already use it for `Notification` — and scope
`delete` on `{"data.ownerUserId": "{{user.id}}"}`, the way `Notification.delete`
already scopes on `data.recipient_user_id`.

**For GuestContactSubmission specifically the change is different and simpler,
because the entity is dead:** there is no writer to carry a new field, so the
owner-scoped rule has nothing to match on. The honest options are to close
`delete` to nothing at all, or to retire the entity with its single spent row.
**Both are schema. Neither is mine to declare.**

---

## 2026-09-05 (Run 5) — P4: fixtures, and one reading that was possible

**The precondition failed: paris is not published, and bali has gained no
content since Run 3.** `theo-and-larissa` exists on paris with
`websiteEnabled: false`; `chris-and-sia` is still four enabled pages and no
content blocks. So the linen-0.012-on-paris reading remains blocked, as does
the post-RSVP countdown, which needs a guest who has replied and a token.

**But the third reading was waiting on a different condition — "a site with all
pages enabled" — and that condition IS met**, by fixtures that already existed
rather than by anything new. Taken:

### Reading — menu at 390px, `/w/john-suzanne`, kyoto, 12 pages enabled, published

    document.scrollWidth   390
    window.innerWidth      390
    horizontal overflow    NONE

    nav at 390px, in order:  Jay & Ella | Home | Our Story | Celebration |
                             RSVP | Stay | More | [Open menu]

**Five items inline, then "More", then a burger, with 12 pages enabled. No
sideways scroll.**

**Two things fell out of taking it.**

**1. Every nav item is a `<button>`, not a link.** The page's only `<a>` is
"Powered by Openinvite". A guest cannot middle-click, cmd-click or open any
nav item in a new tab, and assistive technology is told these are buttons
rather than navigation. Not investigated further; recorded as a reading, since
it is what the DOM says.

**2. The `john-suzanne` record renders "Jay & Ella".** Slug and couple names
disagree on the app's richest fixture. Fixture drift rather than a product bug,
but a verification fixture whose displayed identity does not match its address
is one that will mislead somebody eventually — the same class as the 2026-09-02
note about slugs that move.

**A false start worth recording**, because it is R19's shape again: the first
attempt used `tulum-test`, which has **two** WeddingDetails rows on the same
slug. The resolver refuses ambiguity by design and served "this invitation
isn't available". The refusal is correct and `test:slug-resolver` covers it;
I read it as a broken probe for a minute before reading it as the product
working.

---

## 2026-09-05 — THE ACCOUNT FOR RUN 5

**One merged and live. One amended and still held. Three reports. Two rulings
recorded.** Seven PRs remain the owner's; none was added to.

### Merged

**P2 — the persistence gate runs again (#662).** `npm run test:persistence`
imported a module deleted three weeks earlier in the Spotify teardown, so it
threw on line 32 and **not one of its 1,138 checks had run since**. Retired by
name with the reason, not restored — the endpoints it covered are gone.

The moment it could run it reported **1,093/1,138**, and two failures were its
own fixtures gone stale in the same 2026-08 wave: three fields encrypted at
rest that the tests still wrote as plaintext objects (a `422` that aborted a
whole module and every RSVP, poll and attendee check depending on it), and a
password fixture predating `websitePasswordEnabled` becoming the source of
truth. Both fixed, intent unchanged. **45 failures remain, revealed and not
caused** — including a `LiveStream` isolation breach — and want their own pass.

**The gates CI never exercises, listed:** ten. `test:persistence` was one; the
others are `marketing-images`, `payments-freeze`, `slug-claim`, `slug-resolver`,
`typography-pairings` (all pure — all five run and pass) and
`dashboard-no-overflow`, `guest-essentials-reachable`, `harness`,
`stat-surfaces` (browser plus a live server, which is what makes them the ones
most able to die unnoticed).

### Amended and held

**P1 — #661**, preview
`openinvite-git-feat-sample-content-bali-lajay06-5660s-projects.vercel.app`,
CI green on the amended head. Report above. The short version: ruling (c) is
now structural rather than promised, polls were missing, **three sections
rendered nothing at all**, the fix for one of them was also wrong, and polls
were unreachable after being added. Guard 19/19, six plants, six confirmed
failures.

**Held for the owner:** the (d)/(e) contradiction. A studio consumer cannot
exist under "new files only", so (e)'s second half is unreachable and is not
faked.

### Reported

**P3** — the entity is orphaned (writer and reader both deleted 2026-08-27) and
its one row is **readable with no token at all**, confirmed by direct
unauthenticated probe. DELETE deliberately unprobed: proving it means
destroying the row. No audit log exists; the count proxy says nothing has been
deleted. The row is synthetic and predates encryption. **No RLS change — schema
is frozen until Monday.**

**P4** — precondition failed; paris unpublished, bali unchanged. One reading
taken on a fixture that was already eligible: **no horizontal overflow at 390px
with 12 pages enabled**, five items inline then More then a burger. Two
findings fell out: every nav item is a `<button>`, not a link, and the
`john-suzanne` record renders "Jay & Ella".

**R18 and R19** recorded as canon.

### What I got wrong, in order

**Reported five passing gates as failing.** Wrapped each in `timeout`, which
does not exist on macOS, and read exit 127 as a verdict. **That is the exact
defect P2 exists to fix, committed while writing P2 up** — a result that looks
like a judgement and is actually the runner never having run.

**Shipped a scratch file to main.** `.shoot-fixture.mjs`, a throwaway probe,
rode in on `ship.sh`'s `git add -A`. Removed in a follow-up. The lesson is
about the working tree, not the script: a scratch file in the repo root ships
with whatever is committed next.

**Read the product working as a broken probe.** `tulum-test` served "this
invitation isn't available" and I took it for a failed reading before
recognizing the ambiguous-slug refusal — which is correct, deliberate, and
already covered by `test:slug-resolver`.
