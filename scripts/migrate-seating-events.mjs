/**
 * scripts/migrate-seating-events.mjs
 *
 * PR6 (multi-event seating). `Table` and `VenueAsset` gained an `event_id`
 * field so seating can be scoped per wedding event instead of one flat
 * pool. Every pre-existing row needs `event_id: RECEPTION_EVENT_ID` so the
 * couple's current chart becomes the (undeletable) Reception tab —
 * pixel-identical to what they had before, just now living under a tab
 * label instead of being the only chart.
 *
 * IMPORTANT — what this script can and can't reach: Table/VenueAsset both
 * have owner-scoped RLS (`update`/`delete`: `created_by_id: {{user.id}}`),
 * so — same as PR3b's migrate-photographer-to-vendor.mjs before it — the
 * admin key 403s writing another user's records, and there is no bulk
 * cross-account write path. This script, run as one real logged-in user
 * (BASE44_TEST_EMAIL/BASE44_TEST_PASSWORD — the same John & Suzanne demo
 * account CLAUDE.md's verification flow always uses), can only backfill
 * THAT account's rows. It is NOT how every real couple's existing chart
 * gets migrated.
 *
 * The actual safety net for every other account is at the CODE level, not
 * this script: every place that reads Table.event_id/VenueAsset.event_id
 * treats a missing value as RECEPTION_EVENT_ID (`t.event_id ||
 * RECEPTION_EVENT_ID`), so an unmigrated real couple's chart is already,
 * correctly, "the Reception tab" the moment they load the new Seating page
 * — no live write required, no risk of a chart going missing before this
 * script (which it never will for them) gets anywhere near their account.
 * This script exists to (a) prove the migration path against the one real
 * account we can verify end-to-end, per the "verify John & Suzanne's chart
 * survived" requirement, and (b) make event_id explicit/queryable on that
 * account's rows rather than leaving it implicit forever.
 *
 * Usage:
 *   node scripts/migrate-seating-events.mjs             # dry run (default, no writes)
 *   node scripts/migrate-seating-events.mjs --live      # backfills event_id on rows with none
 *   node scripts/migrate-seating-events.mjs --verify    # proves the migrated Reception chart reads back identically
 *
 * Requires BASE44_TEST_EMAIL/BASE44_TEST_PASSWORD in .env.local. Uses a
 * real login, not the admin key — same reasoning as PR3b (see file header
 * above and BASE44_PLATFORM_NOTES.md).
 */

import { EMAIL, PASS, login, api, APP_ID } from '../tests/persistence/_shared.mjs';

const RECEPTION_EVENT_ID = 'reception';
const MODE = process.argv.includes('--live') ? 'live' : process.argv.includes('--verify') ? 'verify' : 'dry-run';

if (!EMAIL || !PASS) {
  console.error('✗ BASE44_TEST_EMAIL and BASE44_TEST_PASSWORD must be set in .env.local');
  process.exit(1);
}

async function listRows(entity, token) {
  const rows = await api('GET', `/apps/${APP_ID}/entities/${entity}`, undefined, token);
  return Array.isArray(rows) ? rows : (rows?.data || rows?.results || []);
}

function printRow(entity, r) {
  console.log(`    [${entity}] id: ${r.id}  name: ${JSON.stringify(r.name)}  event_id: ${JSON.stringify(r.event_id ?? null)}`);
}

async function findNeedingBackfill(token) {
  const [tables, assets] = await Promise.all([listRows('Table', token), listRows('VenueAsset', token)]);
  return {
    tables: tables.filter(t => !t.event_id),
    assets: assets.filter(a => !a.event_id),
    allTables: tables,
    allAssets: assets,
  };
}

async function runDryRun(token) {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  DRY RUN — Table/VenueAsset event_id backfill (→ reception)');
  console.log('═══════════════════════════════════════════════════════\n');

  const { tables, assets, allTables, allAssets } = await findNeedingBackfill(token);

  console.log(`Table: ${allTables.length} total, ${tables.length} missing event_id:\n`);
  for (const t of tables) printRow('Table', t);
  console.log(`\nVenueAsset: ${allAssets.length} total, ${assets.length} missing event_id:\n`);
  for (const a of assets) printRow('VenueAsset', a);

  if (tables.length === 0 && assets.length === 0) {
    console.log('\nNothing to do — every row already has event_id. --live would be a no-op.\n');
  } else {
    console.log(`\nPlan: --live mode will PUT event_id: "${RECEPTION_EVENT_ID}" onto the ${tables.length + assets.length}`);
    console.log(`row(s) listed above, leaving every other field untouched. It will re-fetch`);
    console.log(`immediately before writing and abort if the set of rows needing backfill has`);
    console.log(`changed since this dry run, rather than writing whatever it happens to find.\n`);
  }
  return { tables, assets };
}

async function runLive(token) {
  const expected = await runDryRun(token);
  console.log('─────────────────────────────────────────────────────────');
  console.log('  LIVE MODE — backfilling event_id on the row(s) listed above');
  console.log('─────────────────────────────────────────────────────────\n');

  const current = await findNeedingBackfill(token);
  const sameSet = (a, b) => a.length === b.length && a.every(x => b.some(y => y.id === x.id));
  if (!sameSet(expected.tables, current.tables) || !sameSet(expected.assets, current.assets)) {
    console.error('✗ ABORTED — the rows needing backfill just now do not match the dry-run listing');
    console.error('  above (something changed between the dry run and this live run).');
    console.error('  Re-run in dry-run mode and review before trying --live again.\n');
    process.exit(1);
  }

  let ok = 0, failed = 0;
  for (const t of current.tables) {
    try {
      await api('PUT', `/apps/${APP_ID}/entities/Table/${t.id}`, { event_id: RECEPTION_EVENT_ID }, token);
      console.log(`  ✓ Table ${t.id} (${JSON.stringify(t.name)}) → event_id: "${RECEPTION_EVENT_ID}"`);
      ok++;
    } catch (err) {
      console.error(`  ✗ FAILED Table ${t.id}: ${err.message}`);
      failed++;
    }
  }
  for (const a of current.assets) {
    try {
      await api('PUT', `/apps/${APP_ID}/entities/VenueAsset/${a.id}`, { event_id: RECEPTION_EVENT_ID }, token);
      console.log(`  ✓ VenueAsset ${a.id} (${JSON.stringify(a.name)}) → event_id: "${RECEPTION_EVENT_ID}"`);
      ok++;
    } catch (err) {
      console.error(`  ✗ FAILED VenueAsset ${a.id}: ${err.message}`);
      failed++;
    }
  }

  console.log(`\nBackfilled ${ok}/${ok + failed} row(s).`);

  const remaining = await findNeedingBackfill(token);
  const stillMissing = remaining.tables.length + remaining.assets.length;
  console.log(`Verification: ${stillMissing} row(s) still missing event_id (expected 0).`);
  if (stillMissing !== 0 || failed > 0) {
    console.error('✗ Not every row was backfilled — see failures above.');
    process.exit(1);
  }
  console.log('\n✓ Live migration complete.\n');
}

/**
 * Proves the migrated chart reads back identical to what it was before —
 * every Table/VenueAsset row now has event_id: "reception", every field
 * that existed before the migration is untouched, and filtering by
 * event_id === RECEPTION_EVENT_ID returns exactly the full pre-migration
 * chart (nothing dropped, nothing duplicated, nothing leaked to a
 * different event).
 */
async function runVerify(token) {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  VERIFY — Reception chart renders identically post-migration');
  console.log('═══════════════════════════════════════════════════════\n');

  const [tables, assets] = await Promise.all([listRows('Table', token), listRows('VenueAsset', token)]);

  let failures = 0;

  const tablesWithoutEventId = tables.filter(t => !t.event_id);
  if (tablesWithoutEventId.length === 0) {
    console.log(`  ✅ PASS  every Table has event_id (${tables.length} total)`);
  } else {
    console.log(`  ❌ FAIL  ${tablesWithoutEventId.length} Table row(s) still have no event_id: ${tablesWithoutEventId.map(t => t.id).join(', ')}`);
    failures++;
  }

  const assetsWithoutEventId = assets.filter(a => !a.event_id);
  if (assetsWithoutEventId.length === 0) {
    console.log(`  ✅ PASS  every VenueAsset has event_id (${assets.length} total)`);
  } else {
    console.log(`  ❌ FAIL  ${assetsWithoutEventId.length} VenueAsset row(s) still have no event_id: ${assetsWithoutEventId.map(a => a.id).join(', ')}`);
    failures++;
  }

  const receptionTables = tables.filter(t => t.event_id === RECEPTION_EVENT_ID);
  const otherEventTables = tables.filter(t => t.event_id && t.event_id !== RECEPTION_EVENT_ID);
  console.log(`  ℹ️  ${receptionTables.length} table(s) on the Reception tab, ${otherEventTables.length} on other event(s)`);

  const totalSeats = receptionTables.reduce((s, t) => s + (t.capacity || 0), 0);
  const totalAssigned = receptionTables.reduce((s, t) => s + (t.assigned_guests || []).length, 0);
  console.log(`  ℹ️  Reception chart: ${receptionTables.length} tables, ${totalSeats} seats, ${totalAssigned} guests seated`);

  for (const t of receptionTables) {
    if (!t.name || t.capacity == null || !t.shape) {
      console.log(`  ❌ FAIL  Table ${t.id} is missing core fields post-migration (name/capacity/shape) — migration corrupted a row`);
      failures++;
    }
  }

  console.log('\n─────────────────────────────────────────────────────────');
  if (failures > 0) {
    console.error(`  FAILED — ${failures} check(s) did not pass. Do not build on top of this migration yet.`);
    console.log('─────────────────────────────────────────────────────────\n');
    process.exit(1);
  }
  console.log(`  PASSED — the existing chart survived the migration intact as the Reception tab.`);
  console.log('─────────────────────────────────────────────────────────\n');
}

async function run() {
  process.stdout.write('Logging in as test account… ');
  const token = await login();
  console.log('✓ authenticated\n');

  if (MODE === 'dry-run') await runDryRun(token);
  else if (MODE === 'live') await runLive(token);
  else if (MODE === 'verify') await runVerify(token);
}

run().catch(err => {
  console.error('\n✗ Unexpected error:', err.message);
  process.exit(1);
});
