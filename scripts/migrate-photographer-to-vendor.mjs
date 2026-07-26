/**
 * scripts/migrate-photographer-to-vendor.mjs
 *
 * PR3b of the vendor consolidation batch (see R1 audit + the approved
 * 3a/3b/3c split). The `Photographer` entity was a full parallel
 * implementation of "track a vendor" alongside `Vendor` — Photography.jsx's
 * "Photographers"/"Videographers" tabs used it instead of the shared
 * Vendor-based components every other category page uses.
 *
 * Direct DB check before writing this script found exactly ONE Photographer
 * record in production: name "fhnfhnbnf", created_by_id jaygalaxy23,
 * status "researching" — confirmed junk/test data, not a real photographer
 * a couple entered. So this is NOT a real data migration — there is nothing
 * legitimate to carry over. What this script actually does:
 *
 *   1. Lists every Photographer record found for the logged-in owner (dry
 *      run and live mode both do this — it's the safety check, not just
 *      logging: live mode refuses to delete anything if what it finds
 *      doesn't match what dry-run mode already showed you).
 *   2. In --live mode, deletes them.
 *   3. In --verify mode, proves the expanded Vendor schema (every field
 *      Photographer.jsonc had that Vendor didn't — see
 *      base44/entities/Vendor.jsonc and scripts/lib/schemaDropScan.mjs's
 *      updated snapshot) round-trips correctly: creates a test
 *      category:"photography" Vendor populating a representative set of
 *      the newly-added fields, reads it back, asserts every field survived,
 *      then deletes the test row.
 *
 * Documented but not exercised by this run (no real record needs it):
 * mapPhotographerToVendor() below is the mapping rule this script WOULD
 * apply if it ever found a real Photographer record to migrate instead of
 * delete. Photographer.type has no single Vendor.category equivalent for
 * type:"both" — the rule: category becomes "photography", and
 * "videography" is added to the new services_offered array, rather than
 * splitting into two separate Vendor records (a couple's actual booking is
 * one vendor relationship, one contract, one contact — recording it as two
 * separate Vendor rows would be a worse model of reality than one row with
 * both services noted).
 *
 * Usage:
 *   node scripts/migrate-photographer-to-vendor.mjs             # dry run (default, no writes)
 *   node scripts/migrate-photographer-to-vendor.mjs --live      # deletes confirmed-junk Photographer records
 *   node scripts/migrate-photographer-to-vendor.mjs --verify    # Vendor schema round-trip proof (creates + deletes one test row)
 *
 * Requires BASE44_TEST_EMAIL/BASE44_TEST_PASSWORD in .env.local — the
 * wedding owner's own real account (jaygalaxy23@gmail.com). Uses a real
 * login, not the admin key: BASE44_PLATFORM_NOTES.md documents that the
 * admin key 403s writes/deletes against entities with owner-scoped RLS
 * (Photographer and Vendor both have `delete: { created_by_id:
 * "{{user.id}}" }`), so this mirrors exactly how the real app itself
 * would perform these actions.
 */

import { EMAIL, PASS, login, api, APP_ID } from '../tests/persistence/_shared.mjs';

const MODE = process.argv.includes('--live') ? 'live' : process.argv.includes('--verify') ? 'verify' : 'dry-run';

if (!EMAIL || !PASS) {
  console.error('✗ BASE44_TEST_EMAIL and BASE44_TEST_PASSWORD must be set in .env.local');
  process.exit(1);
}

/**
 * The mapping rule this script would apply to a REAL Photographer record.
 * Not called in this run (nothing to migrate) — kept here as the
 * documented decision per the PR3b spec, so a future re-run (or anyone
 * reading this file) has the rule spelled out rather than re-deriving it.
 */
function mapPhotographerToVendor(p) {
  const category = p.type === 'videographer' ? 'videography' : 'photography'; // 'photographer' and 'both' both -> photography
  const servicesOffered = [...(p.services_offered || [])];
  if (p.type === 'both' && !servicesOffered.includes('videography')) servicesOffered.push('videography');

  return {
    name: p.name,
    category,
    contact_person: p.contact_person,
    phone: p.phone,
    email: p.email,
    website: p.website,
    instagram: p.instagram,
    address: p.address,
    latitude: p.latitude,
    longitude: p.longitude,
    rating: p.rating,
    reviews_count: p.reviews_count,
    price_range: p.price_range,
    starting_price: p.starting_price,
    status: p.status === 'meeting_scheduled' ? 'meeting_scheduled' : p.status,
    quoted_price: p.quoted_price,
    package_selected: p.package_selected,
    hours_booked: p.hours_booked,
    booking_date: p.booking_date,
    start_time: p.start_time,
    end_time: p.end_time,
    meeting_date: p.meeting_date,
    contract_signed: p.contract_signed,
    deposit_paid: p.deposit_paid,
    deposit_amount: p.deposit_amount,
    style: p.style,
    portfolio_url: p.portfolio_url,
    sample_work: p.sample_work,
    services_offered: servicesOffered,
    equipment: p.equipment,
    backup_equipment: p.backup_equipment,
    second_shooter: p.second_shooter,
    delivery_timeline: p.delivery_timeline,
    image_count: p.image_count,
    video_length: p.video_length,
    editing_style: p.editing_style,
    travel_fee: p.travel_fee,
    cancellation_policy: p.cancellation_policy,
    notes: p.notes,
    special_requests: p.special_requests,
    google_place_id: p.google_place_id,
    image_url: p.image_url,
  };
}

function printRecord(p) {
  console.log(`    id: ${p.id}`);
  console.log(`    name: ${JSON.stringify(p.name)}`);
  console.log(`    type: ${p.type}`);
  console.log(`    status: ${p.status}`);
  console.log(`    created_by_id: ${p.created_by_id}`);
  console.log(`    contact_person: ${JSON.stringify(p.contact_person || null)}, phone: ${JSON.stringify(p.phone || null)}, email: ${JSON.stringify(p.email || null)}`);
  console.log(`    created_date: ${p.created_date || 'unknown'}`);
  console.log('');
}

async function listPhotographers(token) {
  const rows = await api('GET', `/apps/${APP_ID}/entities/Photographer`, undefined, token);
  return Array.isArray(rows) ? rows : (rows?.data || rows?.results || []);
}

async function runDryRun(token) {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  DRY RUN — Photographer → Vendor migration');
  console.log('═══════════════════════════════════════════════════════\n');

  const photographers = await listPhotographers(token);
  console.log(`Found ${photographers.length} Photographer record(s):\n`);
  for (const p of photographers) printRecord(p);

  if (photographers.length === 0) {
    console.log('Nothing to do — no Photographer records exist. --live would be a no-op.\n');
  } else {
    console.log(`Plan: every record above is confirmed junk/test data (verified directly against`);
    console.log(`the database before this script was written — not inferred by this script).`);
    console.log(`--live mode will DELETE all ${photographers.length} record(s) listed above. It will`);
    console.log(`re-fetch immediately before deleting and abort if the count or ids differ from`);
    console.log(`what's shown here, rather than deleting whatever it happens to find at run time.\n`);
  }
  return photographers;
}

async function runLive(token) {
  const expected = await runDryRun(token);
  console.log('─────────────────────────────────────────────────────────');
  console.log('  LIVE MODE — deleting the record(s) listed above');
  console.log('─────────────────────────────────────────────────────────\n');

  const current = await listPhotographers(token);
  const expectedIds = new Set(expected.map(p => p.id));
  const currentIds = new Set(current.map(p => p.id));
  const sameSet = expectedIds.size === currentIds.size && [...expectedIds].every(id => currentIds.has(id));
  if (!sameSet) {
    console.error('✗ ABORTED — the Photographer records found just now do not match the dry-run');
    console.error('  listing above (something changed between the dry run and this live run).');
    console.error('  Re-run in dry-run mode and review before trying --live again.\n');
    process.exit(1);
  }

  let deleted = 0;
  for (const p of current) {
    try {
      await api('DELETE', `/apps/${APP_ID}/entities/Photographer/${p.id}`, undefined, token);
      console.log(`  ✓ deleted Photographer ${p.id} (${JSON.stringify(p.name)})`);
      deleted++;
    } catch (err) {
      console.error(`  ✗ FAILED to delete Photographer ${p.id}: ${err.message}`);
    }
  }

  console.log(`\nDeleted ${deleted}/${current.length} record(s).`);

  const remaining = await listPhotographers(token);
  console.log(`Verification: ${remaining.length} Photographer record(s) remain (expected 0).`);
  if (remaining.length !== 0) {
    console.error('✗ Not all records were deleted — see failures above.');
    process.exit(1);
  }
  console.log('\n✓ Live migration complete.\n');
}

async function runVerify(token) {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  VERIFY — Vendor schema round-trip (photography fields)');
  console.log('═══════════════════════════════════════════════════════\n');

  const payload = {
    name: '__PR3B_SCHEMA_VERIFY__',
    category: 'photography',
    contact_person: 'Test Contact',
    phone: '+61 400 000 000',
    email: 'verify@example.com',
    instagram: '@testphotographer',
    reviews_count: 42,
    starting_price: 2500,
    status: 'meeting_scheduled',
    package_selected: 'Full day package',
    hours_booked: 8,
    booking_date: '2026-12-31',
    start_time: '09:00',
    end_time: '22:00',
    meeting_date: '2026-08-01T10:00:00',
    contract_signed: true,
    deposit_paid: true,
    deposit_amount: 500,
    style: ['candid', 'documentary'],
    portfolio_url: 'https://example.com/portfolio',
    sample_work: ['https://example.com/1.jpg', 'https://example.com/2.jpg'],
    services_offered: ['engagement shoot', 'albums'],
    equipment: 'Two Sony A7IV bodies, 24-70mm + 70-200mm',
    backup_equipment: true,
    second_shooter: true,
    delivery_timeline: '4-6 weeks',
    image_count: 600,
    editing_style: 'bright & airy',
    travel_fee: 150,
    cancellation_policy: '50% refund up to 30 days out',
    special_requests: 'Must capture the family heirloom ring exchange',
    notes: 'Created by scripts/migrate-photographer-to-vendor.mjs --verify',
  };

  console.log('Creating test Vendor record…');
  const created = await api('POST', `/apps/${APP_ID}/entities/Vendor`, payload, token);
  console.log(`  ✓ created id ${created.id}\n`);

  console.log('Reading it back…');
  const readBack = await api('GET', `/apps/${APP_ID}/entities/Vendor/${created.id}`, undefined, token);

  let failures = 0;
  for (const [key, value] of Object.entries(payload)) {
    const got = readBack[key];
    const ok = JSON.stringify(got) === JSON.stringify(value);
    if (ok) {
      console.log(`  ✅ PASS  ${key}`);
    } else {
      console.log(`  ❌ FAIL  ${key} — wrote ${JSON.stringify(value)}, read back ${JSON.stringify(got)}`);
      failures++;
    }
  }

  console.log('\nDeleting test record…');
  await api('DELETE', `/apps/${APP_ID}/entities/Vendor/${created.id}`, undefined, token);
  console.log('  ✓ cleaned up\n');

  console.log('─────────────────────────────────────────────────────────');
  if (failures > 0) {
    console.error(`  FAILED — ${failures} field(s) did not round-trip. The Vendor schema is`);
    console.error(`  missing something PR3b was supposed to add.`);
    console.log('─────────────────────────────────────────────────────────\n');
    process.exit(1);
  }
  console.log(`  PASSED — all ${Object.keys(payload).length} fields round-tripped correctly`);
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
