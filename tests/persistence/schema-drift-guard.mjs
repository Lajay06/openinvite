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
 *
 * PR6 completeness pass (2026-07): audited every entity the app actually
 * writes to (`base44.entities.*`, both the inline and the destructured
 * `const X = base44.entities.X` forms) against this list and against
 * schemaDropScan.mjs's own scan coverage. Found and fixed two real gaps
 * beyond the Table/VenueAsset this PR needed anyway:
 *   - Notification was already in this list but missing from
 *     schemaDropScan.mjs's fixed-name regex, so it was NEVER actually
 *     scanned — a dead guard entry that would have passed regardless of
 *     what Notification wrote. Added to the regex; now real.
 *   - Hotel wrote via the same destructured bare-call form and had no
 *     schema entry or regex coverage at all — invisible even to
 *     `npm run audit:schema`, not just this guard. Added both.
 *   - Questionnaire was already scanned (inline call-site form) but had no
 *     schema entry, so its fields showed as "unknown" instead of a real
 *     pass/fail. Added a schema entry; added here too.
 * Re-ran `npm run audit:schema` after each addition — no new drops
 * surfaced for any of them (only the pre-existing, unrelated
 * User.notification_prefs finding, out of scope for this pass).
 *
 * Left out deliberately: RsvpResponse, PollVote, PollComment are written
 * only from api/*.js (server-side, admin-key) — this scanner only walks
 * src/, so they're a structural blind spot, not a one-line fix. Flagging
 * for a future pass rather than silently expanding scope here.
 */

import { runSchemaDropScan } from '../../scripts/lib/schemaDropScan.mjs';
import { pass, fail } from './_shared.mjs';

const GUARDED_ENTITIES = ['WeddingDetails', 'Guest', 'Note', 'Music', 'Notification', 'Vendor', 'Table', 'VenueAsset', 'Hotel', 'Questionnaire'];

export async function runSchemaDriftGuard() {
  const results = [];

  console.log('\n  Schema-drift guard — every guarded-entity field the code writes to is registered in the live schema mirror:\n');

  const { droppedDeduped } = runSchemaDropScan();
  const guardedDrops = droppedDeduped.filter(d => GUARDED_ENTITIES.includes(d.entity));

  if (guardedDrops.length === 0) {
    results.push(pass(
      `No dropped fields found for any guarded entity (static scan vs. base44/entities/*.jsonc)`,
      '0 dropped'
    ));
  } else {
    for (const d of guardedDrops) {
      results.push(fail(
        `${d.entity}.${d.field} is written by the app but not declared in the live schema mirror`,
        'declared in the entity schema (add the field in Base44, then sync base44/entities/*.jsonc)',
        `dropped — sites: ${d.allSites}`
      ));
    }
  }

  return results;
}
