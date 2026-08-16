# Decision log

Closed decisions with their reasoning, so a restart doesn't re-litigate them.

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
