# Decision log

Closed decisions with their reasoning, so a restart doesn't re-litigate them.

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
