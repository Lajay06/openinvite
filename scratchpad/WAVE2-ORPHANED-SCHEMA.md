# WAVE 2 — ORPHANED SCHEMA LEDGER

**Nothing here is deleted.** Code deletions strand entities and fields; schema is
the advisor's boundary and the least reversible thing this project does. This
list is collected across the whole wave and decided in ONE deliberate pass at
the end.

**Rule: never prune schema during a code deletion.** An orphaned entity with no
rows costs nothing to keep and something to remove.

| entity / field | orphaned by | production rows | notes |
|---|---|---|---|
| `LiveStream` (whole entity) | #601, live stream deletion | **0** | `base44/entities/LiveStream.jsonc` and its `entityFields.generated.js` entry left in place. The generated file should be regenerated, never hand-edited. |
| `Photo` (whole entity) | Photos deletion | **0** | `base44/entities/Photo.jsonc` left in place. Note `enabledPages` on 4 WeddingDetails records still lists `'photos'`; those entries are inert, not errors — `pageLinks` filters on a resolvable label. |

## Standing cautions found while surveying

- **`Guest.mailing_address` carries an explicit do-not-undeclare warning:**
  *"Do not remove this declaration until the separate post-D cleanup —
  undeclaring drops stored data (gotcha #5)."* Whatever happens to the collect
  feature, this field is not a candidate for removal.
