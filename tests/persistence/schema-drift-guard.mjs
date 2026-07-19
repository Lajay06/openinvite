/**
 * tests/persistence/schema-drift-guard.mjs
 *
 * Standing guard against the recurring schema-drift incident documented in
 * BASE44_PLATFORM_NOTES.md's "Schema drift" section: a field can be pushed
 * to the live schema, confirmed, and later silently revert with no error at
 * the time it happens — the only way it's ever been caught is a persistence
 * test failing. This module makes that failure automatic instead of relying
 * on someone noticing.
 *
 * LIMITATION (read before trusting this blindly): Base44's schema metadata
 * is NOT reachable from a plain script authenticated with a bearer token or
 * the admin key — confirmed 2026-07 by testing
 * `/apps/:id/entities/:entity/schema`, `/apps/:id/schema`, and
 * `/apps/:id/entities/:entity/meta` (all 404 against the live REST API),
 * plus inspecting @base44/sdk's types (no runtime schema-fetch method, only
 * build-time CLI codegen). So this is NOT a live fetch — it's a static scan
 * of every WeddingDetails/Guest field the code writes to
 * (scripts/lib/schemaDropScan.mjs), cross-checked against an EMBEDDED
 * schema snapshot that must be refreshed via
 * `mcp__claude_ai_Base44__list_entity_schemas` (or `npm run audit:schema`'s
 * own instructions) every time a real schema change is made. If that
 * snapshot goes stale, this guard degrades back to exactly the blind spot
 * it exists to catch — it is a mitigation, not a guarantee.
 *
 * Scoped to the entities this incident class has actually hit:
 * WeddingDetails (assetContent/onboardingDraft/onboardingStepIndex),
 * Guest (plus_one_rsvp_link_id previously), Note (status/view_type — a
 * real drop, not a snapshot omission, caught in the same 2026-07 triage
 * that also found Music.source was a false positive in this snapshot, not
 * real drift — added to the snapshot instead of the guard's fail-on list).
 * Music is included here too since it's now a live-verified baseline, in
 * case it ever regresses for real. `npm run audit:schema` covers every
 * other entity and should be run periodically by hand — deliberately not
 * wired into this pass/fail gate, since its other findings (as of 2026-07:
 * User.tempUnit, User.deletionRequestedAt) are still under investigation —
 * see BASE44_PLATFORM_NOTES.md for why the built-in User entity needs a
 * different approach before anything is registered for it.
 */

import { runSchemaDropScan } from '../../scripts/lib/schemaDropScan.mjs';
import { pass, fail } from './_shared.mjs';

const GUARDED_ENTITIES = ['WeddingDetails', 'Guest', 'Note', 'Music'];

export async function runSchemaDriftGuard() {
  const results = [];

  console.log('\n  Schema-drift guard — every guarded-entity field the code writes to is registered in the embedded schema snapshot:\n');

  const { droppedDeduped } = runSchemaDropScan();
  const guardedDrops = droppedDeduped.filter(d => GUARDED_ENTITIES.includes(d.entity));

  if (guardedDrops.length === 0) {
    results.push(pass(
      `No dropped fields found for any guarded entity (static scan vs. embedded schema snapshot)`,
      '0 dropped'
    ));
  } else {
    for (const d of guardedDrops) {
      results.push(fail(
        `${d.entity}.${d.field} is written by the app but not in the embedded schema snapshot`,
        'registered in schema (or the snapshot needs refreshing via list_entity_schemas)',
        `dropped — sites: ${d.allSites}`
      ));
    }
  }

  return results;
}
