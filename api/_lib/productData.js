/**
 * api/_lib/productData.js
 *
 * Excludes test-harness records from any product-facing (real dashboard,
 * real collaborator view) response. Every entity created by
 * tests/persistence/*.mjs is meant to carry is_test:true, and every
 * endpoint that lists records for display is meant to filter it out — but
 * relying on is_test alone isn't safe enough on its own: confirmed
 * empirically that a genuine test record (Guest "__PERSISTENCE_TEST_EVENT_RESPONSES__",
 * created via rsvp.mjs with is_test:true at create time) was found LIVE
 * with is_test:false, and leaked straight through api/collaborator-guests.js's
 * own `!g.is_test` filter into a collaborator's view. Root cause wasn't
 * pinned down (a later PUT to the same record that didn't repeat is_test
 * may be involved — same family of "a value doesn't stick the way you'd
 * expect" issue as the schema-drift incidents this session), but the
 * consequence is clear: is_test can't be trusted alone.
 *
 * So this checks BOTH is_test AND the naming convention every persistence
 * test file already uses without exception (`__PERSISTENCE_TEST` prefix on
 * the record's own name/title/item_name field) as a defense-in-depth
 * backstop — the same "belt and suspenders" reasoning already applied
 * elsewhere in this codebase (e.g. pollAuth.js hashing guest identifiers
 * even though the entity is also access-controlled).
 *
 * Call this at the query layer, once, rather than each new endpoint
 * re-writing its own `.filter(r => !r.is_test)` and being one field-rename
 * away from silently regressing this exact leak again.
 */

const TEST_NAME_PREFIX = '__PERSISTENCE_TEST';
const NAME_FIELDS = ['name', 'title', 'item_name'];

function looksLikeTestRecord(record) {
  if (record?.is_test) return true;
  return NAME_FIELDS.some(field => typeof record?.[field] === 'string' && record[field].startsWith(TEST_NAME_PREFIX));
}

/** @returns {Array} `rows` with every test-harness record removed. */
export function excludeTestRecords(rows) {
  return (rows || []).filter(r => !looksLikeTestRecord(r));
}
