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
| `GuestContactSubmission` (whole entity) | collect link deletion | **1** (`status=approved`) | Left in place. The single row is a SPENT RECEIPT — approval already merged its details onto the guest via the review endpoint — so no data line is needed. `scripts/reset-test-account.mjs` still special-cases this entity; harmless, and it should not be edited until the schema pass decides the entity's fate. |
| `WeddingDetails.assetContent` | asset feature deletion | not counted | **RETAINED in StudioWebsite's WRITABLE_FIELDS on purpose** — nothing writes it now, but dropping it from the payload would strand whatever a couple has stored the next time anything else saves. |
| `WeddingDetails.activeTypography` | left-panel readout removal | n/a | Already documented as "permanently dead code" in curatedFonts.js before this wave — `resolveTypography` gives the universe unconditional priority. `universeStyling.js:66` still reads it as an unreachable fallback; left alone. |

## Standing cautions found while surveying

- **`Guest.mailing_address` carries an explicit do-not-undeclare warning:**
  *"Do not remove this declaration until the separate post-D cleanup —
  undeclaring drops stored data (gotcha #5)."* Whatever happens to the collect
  feature, this field is not a candidate for removal.

## Stale references awaiting a legitimate carrier

- **`api/_lib/planGift.js:7`** names `api/collect-guest-contact.js`, deleted in
  Wave 2. The file is under the payments freeze. **The override was not spent on
  a comment** — see STANDING-RULES.md, "The value of an override is its rarity".
  This rides along with the next genuine payments change.
