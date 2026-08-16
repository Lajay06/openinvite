# Decision log

Closed decisions with their reasoning, so a restart doesn't re-litigate them.

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
