/**
 * scripts/test-persistence.mjs
 *
 * Automated round-trip persistence test for Base44 / WeddingDetails.
 * Catches the "Base44 silently drops unregistered schema fields" bug class.
 *
 * Usage:  npm run test:persistence
 *
 * Requires .env.local (gitignored):
 *   BASE44_TEST_EMAIL=...
 *   BASE44_TEST_PASSWORD=...
 *
 * What it does:
 *   1. Authenticates as the dedicated test account
 *   2. Creates a sentinel WeddingDetails record (couple1Name = SENTINEL)
 *   3. Writes dummy values to every Guest Suite field
 *   4. Re-reads the record fresh from Base44 (no cache)
 *   5. Asserts each field round-tripped correctly
 *   6. Deletes the sentinel record
 *   7. Exits 0 if all pass, 1 if any fail
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// ── Load .env.local ───────────────────────────────────────────────────────────

const __dir = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dir, '..', '.env.local');

try {
  const raw = readFileSync(envPath, 'utf8');
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = val;
  }
} catch {
  // .env.local missing — rely on shell env vars
}

const APP_ID = process.env.VITE_BASE44_APP_ID || '68731d183f075e406eda2236';
const EMAIL  = process.env.BASE44_TEST_EMAIL;
const PASS   = process.env.BASE44_TEST_PASSWORD;
const BASE   = 'https://base44.app/api';

// ── Safety sentinel ───────────────────────────────────────────────────────────

const SENTINEL = '__PERSISTENCE_TEST__';

if (!EMAIL || !PASS) {
  console.error('✗ BASE44_TEST_EMAIL and BASE44_TEST_PASSWORD must be set in .env.local');
  process.exit(1);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function api(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${method} ${path} → HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

function pass(field, note = '') {
  console.log(`  ✅ PASS  ${field}${note ? '  (' + note + ')' : ''}`);
  return true;
}

function fail(field, written, readBack) {
  console.log(`  ❌ FAIL  ${field}`);
  console.log(`           wrote:    ${JSON.stringify(written)}`);
  console.log(`           read back: ${JSON.stringify(readBack)}`);
  return false;
}

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Checks that every key in `written` exists in `readBack` with an equal value.
 * Extra keys in `readBack` (Base44 backfills schema-defined sub-fields with null)
 * are ignored — they aren't schema-drop failures.
 */
function writtenSubsetMatches(written, readBack) {
  if (written === null || written === undefined) return readBack === written;
  if (typeof written !== 'object' || Array.isArray(written)) return deepEqual(written, readBack);
  if (typeof readBack !== 'object' || readBack === null) return false;
  for (const [k, v] of Object.entries(written)) {
    if (!(k in readBack)) return false;
    if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
      if (!writtenSubsetMatches(v, readBack[k])) return false;
    } else if (!deepEqual(v, readBack[k])) {
      return false;
    }
  }
  return true;
}

// ── Test data ─────────────────────────────────────────────────────────────────

const TEST_FIELDS = {
  // ── Event Details canonical fields (new refactor) ─────────────────────────
  mainCeremony: {
    venueName:          'Test Ceremony Venue',
    address:            '1 Ceremony Lane, Sydney NSW 2000',
    placeId:            'test-place-id-ceremony',
    mapsUrl:            'https://maps.google.com/?q=test-ceremony',
    photoUrl:           '/api/places-photo?ref=test-ceremony-ref&maxwidth=600',
    startTime:          '14:00',
    endTime:            '15:00',
    dressCode:          'Black tie',
    parkingInfo:        'Street parking on Church St',
    accessibilityNotes: 'Wheelchair access via north gate',
    notes:              'Ceremony runs approximately 40 minutes',
  },
  reception: {
    venueName:          'Test Reception Hall',
    address:            '2 Reception Rd, Sydney NSW 2000',
    placeId:            'test-place-id-reception',
    mapsUrl:            'https://maps.google.com/?q=test-reception',
    photoUrl:           '/api/places-photo?ref=test-reception-ref&maxwidth=600',
    startTime:          '17:30',
    endTime:            '23:00',
    dressCode:          'Cocktail',
    parkingInfo:        'On-site parking available',
    accessibilityNotes: 'Step-free access throughout',
    notes:              'Cocktail hour from 5:30, dinner at 7:00',
  },
  // Custom event in preWeddingEvents — full new field set
  preWeddingEvents: [
    {
      id:               'test-pre-1',
      name:             'Welcome Dinner',
      type:             'Rehearsal Dinner',
      date:             '2025-11-13',
      startTime:        '18:30',
      endTime:          '21:30',
      venueName:        'Test Restaurant',
      venueAddress:     '10 Harbour St, Sydney NSW 2000',
      venueMapsUrl:     'https://maps.google.com/?q=test-restaurant',
      venuePhotoUrl:    null,
      venuePlaceId:     'test-restaurant-place-id',
      dressCode:        'Smart casual',
      parkingInfo:      'Street parking available',
      accessibilityNotes: 'Ground floor, fully accessible',
      details:          'Family and close friends only',
      // legacy compat
      venue:   'Test Restaurant',
      address: '10 Harbour St, Sydney NSW 2000',
      time:    '18:30',
      notes:   'Family and close friends only',
      isCustomType: false,
    },
  ],
  guestSuiteAccommodation: {
    places: [{ id: 'test-hotel-1', name: 'Test Hotel Sydney', address: '1 Test St', rating: 4.5, note: 'persistence check' }],
  },
  guestSuiteTransport: {
    places: [{ id: 'test-airport-1', name: 'Test Airport', type: 'airport', address: '2 Airport Rd', note: 'closest airport' }],
    notes:  [{ id: 'test-note-1', title: 'Rideshare', text: 'Uber available from airport' }],
  },
  weddingPolicies: {
    photography: { unplugged: true,  message: 'Persistence test photography policy', display: true },
    socialMedia:  { noCeremony: false, message: 'Persistence test social media policy', display: false },
    children:     { option: 'all', message: 'All welcome', display: true },
  },
  emergencyContacts: {
    primary:    { name: 'Test Primary', phone: '+61 400 000 001', role: 'Maid of honour' },
    backup:     { name: 'Test Backup',  phone: '+61 400 000 002', role: 'Best man' },
    otherNotes: 'Nearest hospital: Test Hospital, 5 min drive',
  },
  dayVendorContacts: [
    { name: 'Test Photographer', phone: '+61 400 000 003', role: 'Photography' },
    { name: 'Test Caterer',      phone: '+61 400 000 004', role: 'Catering' },
  ],
  experienceGuide: {
    published:     false,
    destination:   'Test City, Australia',
    editorialIntro:'A persistence test guide to Test City.',
    vibes:         ['coastal luxury', 'hidden local gems'],
    couplePicks:   [{ place_id: 'test-pick-1', name: 'Test Cafe', category: 'Coffee & Bakeries', note: 'Best flat whites' }],
    categories: {
      mustEat: {
        enabled: true,
        places: [{ place_id: 'test-place-1', name: 'Test Restaurant', rating: 4.8, note: 'Must try' }],
      },
    },
    itinerary: {
      days: 1,
      schedule: [{
        day: 1,
        blocks: {
          morning:   [{ type: 'place', name: 'Test Cafe', duration: 60 }],
          afternoon: [{ type: 'activity', name: 'Beach walk', duration: 90 }],
          evening:   [{ type: 'place', name: 'Test Restaurant', duration: 120 }],
        },
      }],
    },
  },
  polls: [
    {
      id: 'test-poll-1',
      title: 'Persistence test poll',
      emoji: '🧪',
      category: 'Custom',
      isActive: true,
      options: [
        { id: 'a', label: 'Option A', votes: 0 },
        { id: 'b', label: 'Option B', votes: 0 },
      ],
    },
  ],
};

// ── Main ──────────────────────────────────────────────────────────────────────

async function run() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  Base44 persistence test — Openinvite');
  console.log('  Guest Suite + Event Details canonical fields');
  console.log('═══════════════════════════════════════════════════════\n');

  let token = null;
  let recordId = null;
  const results = [];

  // ── 1. Login ────────────────────────────────────────────────────────────────
  process.stdout.write('  Logging in as test account… ');
  try {
    const auth = await api('POST', `/apps/${APP_ID}/auth/login`, { email: EMAIL, password: PASS });
    token = auth.access_token;
    if (!token) throw new Error('No access_token in response');
    console.log('✓ authenticated\n');
  } catch (err) {
    console.error(`\n✗ Login failed: ${err.message}`);
    process.exit(1);
  }

  // ── 2. Create sentinel record ────────────────────────────────────────────────
  process.stdout.write('  Creating sentinel WeddingDetails record… ');
  try {
    const created = await api(
      'POST',
      `/apps/${APP_ID}/entities/WeddingDetails`,
      { couple1Name: SENTINEL, couple2Name: 'DO_NOT_USE', slug: `__test__${Date.now()}` },
      token,
    );
    recordId = created.id;
    if (!recordId) throw new Error('No id returned from create');
    console.log(`✓ id=${recordId}\n`);
  } catch (err) {
    console.error(`\n✗ Create failed: ${err.message}`);
    process.exit(1);
  }

  // ── 3. Safety guard ─────────────────────────────────────────────────────────
  const check = await api('GET', `/apps/${APP_ID}/entities/WeddingDetails/${recordId}`, undefined, token);
  if (check.couple1Name !== SENTINEL) {
    console.error(`\n✗ SAFETY ABORT — record ${recordId} is not the sentinel. Refusing to write. Delete it manually.`);
    process.exit(1);
  }

  // ── 4. Write all test fields in one PUT ─────────────────────────────────────
  process.stdout.write('  Writing test values to all Guest Suite fields… ');
  try {
    await api(
      'PUT',
      `/apps/${APP_ID}/entities/WeddingDetails/${recordId}`,
      { couple1Name: SENTINEL, couple2Name: 'DO_NOT_USE', ...TEST_FIELDS },
      token,
    );
    console.log('✓ written\n');
  } catch (err) {
    console.error(`\n✗ Write failed: ${err.message}`);
    await cleanup(token, recordId);
    process.exit(1);
  }

  // ── 5. Fresh read ────────────────────────────────────────────────────────────
  process.stdout.write('  Reading record back fresh from Base44… ');
  let record;
  try {
    record = await api('GET', `/apps/${APP_ID}/entities/WeddingDetails/${recordId}`, undefined, token);
    console.log('✓\n');
  } catch (err) {
    console.error(`\n✗ Read failed: ${err.message}`);
    await cleanup(token, recordId);
    process.exit(1);
  }

  // ── 6. Assert each field ─────────────────────────────────────────────────────
  console.log('  Field assertions:\n');

  // guestSuiteAccommodation.places
  {
    const written = TEST_FIELDS.guestSuiteAccommodation.places;
    const got     = record.guestSuiteAccommodation?.places;
    results.push(deepEqual(written, got)
      ? pass('guestSuiteAccommodation.places', `${got.length} place(s)`)
      : fail('guestSuiteAccommodation.places', written, got));
  }

  // guestSuiteTransport.places
  {
    const written = TEST_FIELDS.guestSuiteTransport.places;
    const got     = record.guestSuiteTransport?.places;
    results.push(deepEqual(written, got)
      ? pass('guestSuiteTransport.places', `${got?.length} location(s)`)
      : fail('guestSuiteTransport.places', written, got));
  }

  // guestSuiteTransport.notes
  {
    const written = TEST_FIELDS.guestSuiteTransport.notes;
    const got     = record.guestSuiteTransport?.notes;
    results.push(deepEqual(written, got)
      ? pass('guestSuiteTransport.notes', `${got?.length} note(s)`)
      : fail('guestSuiteTransport.notes', written, got));
  }

  // weddingPolicies — Base44 backfills unset sub-fields with null; use subset check
  {
    const written = TEST_FIELDS.weddingPolicies;
    const got     = record.weddingPolicies;
    results.push(writtenSubsetMatches(written, got)
      ? pass('weddingPolicies', 'photography + socialMedia + children (extra null sub-fields from schema OK)')
      : fail('weddingPolicies', written, got));
  }

  // emergencyContacts — same: venue sub-field backfilled as null
  {
    const written = TEST_FIELDS.emergencyContacts;
    const got     = record.emergencyContacts;
    results.push(writtenSubsetMatches(written, got)
      ? pass('emergencyContacts', 'primary + backup + otherNotes (venue: null from schema OK)')
      : fail('emergencyContacts', written, got));
  }

  // dayVendorContacts
  {
    const written = TEST_FIELDS.dayVendorContacts;
    const got     = record.dayVendorContacts;
    results.push(deepEqual(written, got)
      ? pass('dayVendorContacts', `${got?.length} vendor(s)`)
      : fail('dayVendorContacts', written, got));
  }

  // experienceGuide (couplePicks + categories + itinerary)
  {
    const written = TEST_FIELDS.experienceGuide;
    const got     = record.experienceGuide;
    const picksOk  = deepEqual(written.couplePicks,  got?.couplePicks);
    const catsOk   = deepEqual(written.categories,   got?.categories);
    const itiOk    = deepEqual(written.itinerary,    got?.itinerary);
    const vibsOk   = deepEqual(written.vibes,        got?.vibes);
    if (picksOk && catsOk && itiOk && vibsOk) {
      results.push(pass('experienceGuide', 'couplePicks + categories + itinerary + vibes'));
    } else {
      if (!picksOk)  results.push(fail('experienceGuide.couplePicks',  written.couplePicks,  got?.couplePicks));
      if (!catsOk)   results.push(fail('experienceGuide.categories',   written.categories,   got?.categories));
      if (!itiOk)    results.push(fail('experienceGuide.itinerary',    written.itinerary,    got?.itinerary));
      if (!vibsOk)   results.push(fail('experienceGuide.vibes',        written.vibes,        got?.vibes));
    }
  }

  // polls
  {
    const written = TEST_FIELDS.polls;
    const got     = record.polls;
    results.push(deepEqual(written, got)
      ? pass('polls', `${got?.length} poll(s)`)
      : fail('polls', written, got));
  }

  // ── 7. Event Details canonical field tests (data-model refactor + redesign) ─────
  console.log('\n  Event Details canonical field tests:\n');

  // mainCeremony.dressCode — written via EventDetails path, must round-trip
  {
    const written = TEST_FIELDS.mainCeremony.dressCode;
    const got     = record.mainCeremony?.dressCode;
    results.push(written === got
      ? pass('mainCeremony.dressCode', `"${got}" — canonical ceremony dress code`)
      : fail('mainCeremony.dressCode', written, got));
  }

  // reception.dressCode — new per-event field, must round-trip
  {
    const written = TEST_FIELDS.reception.dressCode;
    const got     = record.reception?.dressCode;
    results.push(written === got
      ? pass('reception.dressCode', `"${got}" — canonical reception dress code`)
      : fail('reception.dressCode', written, got));
  }

  // mainCeremony.endTime — now written by EventDetails (not WSContentTab), must round-trip
  {
    const written = TEST_FIELDS.mainCeremony.endTime;
    const got     = record.mainCeremony?.endTime;
    results.push(written === got
      ? pass('mainCeremony.endTime', `"${got}"`)
      : fail('mainCeremony.endTime', written, got));
  }

  // reception.endTime — now written by EventDetails, must round-trip
  {
    const written = TEST_FIELDS.reception.endTime;
    const got     = record.reception?.endTime;
    results.push(written === got
      ? pass('reception.endTime', `"${got}"`)
      : fail('reception.endTime', written, got));
  }

  // mainCeremony.photoUrl — new schema field for venue photo
  {
    const written = TEST_FIELDS.mainCeremony.photoUrl;
    const got     = record.mainCeremony?.photoUrl;
    results.push(written === got
      ? pass('mainCeremony.photoUrl', `"${got}"`)
      : fail('mainCeremony.photoUrl', written, got));
  }

  // mainCeremony.mapsUrl — new schema field
  {
    const written = TEST_FIELDS.mainCeremony.mapsUrl;
    const got     = record.mainCeremony?.mapsUrl;
    results.push(written === got
      ? pass('mainCeremony.mapsUrl', `"${got}"`)
      : fail('mainCeremony.mapsUrl', written, got));
  }

  // mainCeremony.placeId — new schema field
  {
    const written = TEST_FIELDS.mainCeremony.placeId;
    const got     = record.mainCeremony?.placeId;
    results.push(written === got
      ? pass('mainCeremony.placeId', `"${got}"`)
      : fail('mainCeremony.placeId', written, got));
  }

  // reception.photoUrl + mapsUrl + placeId
  {
    const pOk = record.reception?.photoUrl === TEST_FIELDS.reception.photoUrl;
    const mOk = record.reception?.mapsUrl  === TEST_FIELDS.reception.mapsUrl;
    const iOk = record.reception?.placeId  === TEST_FIELDS.reception.placeId;
    if (pOk && mOk && iOk) {
      results.push(pass('reception.photoUrl/mapsUrl/placeId', 'all three new fields'));
    } else {
      if (!pOk) results.push(fail('reception.photoUrl',  TEST_FIELDS.reception.photoUrl,  record.reception?.photoUrl));
      if (!mOk) results.push(fail('reception.mapsUrl',   TEST_FIELDS.reception.mapsUrl,   record.reception?.mapsUrl));
      if (!iOk) results.push(fail('reception.placeId',   TEST_FIELDS.reception.placeId,   record.reception?.placeId));
    }
  }

  // Custom event in preWeddingEvents — full new field set
  {
    const written  = TEST_FIELDS.preWeddingEvents[0];
    const gotArray = record.preWeddingEvents || [];
    const got      = gotArray.find(e => e.id === written.id);
    const fieldsOk = got &&
      got.startTime         === written.startTime &&
      got.endTime           === written.endTime &&
      got.venueName         === written.venueName &&
      got.venueAddress      === written.venueAddress &&
      got.venueMapsUrl      === written.venueMapsUrl &&
      got.venuePlaceId      === written.venuePlaceId &&
      got.dressCode         === written.dressCode &&
      got.parkingInfo       === written.parkingInfo &&
      got.accessibilityNotes=== written.accessibilityNotes &&
      got.details           === written.details;
    results.push(fieldsOk
      ? pass('preWeddingEvents[0] full field set', 'startTime/endTime/venue/dressCode/parkingInfo/accessibility/details all persist')
      : fail('preWeddingEvents[0] full field set', written, got));
  }

  // Sole-writer verification: write mainCeremony.dressCode via canonical path,
  // then write attire.dressCode separately — canonical must NOT be overwritten.
  {
    const canonicalDressCode = 'White tie';
    const oldAttireValue     = 'Smart casual';

    // Step 1: write canonical path
    await api('PUT', `/apps/${APP_ID}/entities/WeddingDetails/${recordId}`,
      { couple1Name: SENTINEL, couple2Name: 'DO_NOT_USE',
        mainCeremony: { dressCode: canonicalDressCode } }, token);

    // Step 2: write attire.dressCode (old Styling-page path) — must NOT touch mainCeremony.dressCode
    await api('PUT', `/apps/${APP_ID}/entities/WeddingDetails/${recordId}`,
      { couple1Name: SENTINEL, couple2Name: 'DO_NOT_USE',
        attire: { dressCode: oldAttireValue } }, token);

    // Step 3: verify canonical is still intact
    const after = await api('GET', `/apps/${APP_ID}/entities/WeddingDetails/${recordId}`, undefined, token);
    const canonical = after.mainCeremony?.dressCode;
    const isolated  = canonical === canonicalDressCode;
    results.push(isolated
      ? pass('sole-writer isolation', `mainCeremony.dressCode="${canonical}" unchanged after separate attire write`)
      : fail('sole-writer isolation', canonicalDressCode, canonical));
  }

  // ── 8. Sequential append test (catches the "second add overwrites first" bug) ──
  console.log('\n  Sequential append test (write place A, then append place B):\n');
  try {
    const placeA = { id: 'seq-test-A', name: 'Sequential Hotel A', address: '10 First St' };
    const placeB = { id: 'seq-test-B', name: 'Sequential Hotel B', address: '20 Second St' };

    // Write [A]
    await api('PUT', `/apps/${APP_ID}/entities/WeddingDetails/${recordId}`,
      { couple1Name: SENTINEL, couple2Name: 'DO_NOT_USE', guestSuiteAccommodation: { places: [placeA] } }, token);
    // Append [A, B] — mimics handleAdd calling save([...existingPlaces, newPlace])
    await api('PUT', `/apps/${APP_ID}/entities/WeddingDetails/${recordId}`,
      { couple1Name: SENTINEL, couple2Name: 'DO_NOT_USE', guestSuiteAccommodation: { places: [placeA, placeB] } }, token);

    const after = await api('GET', `/apps/${APP_ID}/entities/WeddingDetails/${recordId}`, undefined, token);
    const gotPlaces = after.guestSuiteAccommodation?.places || [];
    const bothPresent = gotPlaces.length === 2 &&
      gotPlaces.some(p => p.id === 'seq-test-A') &&
      gotPlaces.some(p => p.id === 'seq-test-B');
    results.push(bothPresent
      ? pass('guestSuiteAccommodation sequential append', 'both places survive two separate writes')
      : fail('guestSuiteAccommodation sequential append', [placeA, placeB], gotPlaces));
  } catch (err) {
    console.log(`  ❌ FAIL  sequential append — error: ${err.message}`);
    results.push(false);
  }

  // ── 9. Summary ───────────────────────────────────────────────────────────────
  const passed = results.filter(Boolean).length;
  const total  = results.length;
  const allOk  = passed === total;

  console.log(`\n${'─'.repeat(55)}`);
  console.log(`  Result: ${passed}/${total} fields persisted correctly`);
  if (!allOk) {
    console.log('  ⚠️  Some fields failed — check that they are registered in');
    console.log('  the WeddingDetails entity schema on Base44.');
  }
  console.log(`${'─'.repeat(55)}\n`);

  // ── 10. Cleanup ──────────────────────────────────────────────────────────────
  await cleanup(token, recordId);

  process.exit(allOk ? 0 : 1);
}

async function cleanup(token, id) {
  if (!id) return;
  process.stdout.write('  Deleting sentinel record… ');
  try {
    await api('DELETE', `/apps/${APP_ID}/entities/WeddingDetails/${id}`, undefined, token);
    console.log('✓ cleaned up\n');
  } catch (err) {
    console.error(`\n  ⚠️  CLEANUP FAILED — sentinel record ${id} may still exist.`);
    console.error(`  Delete it manually in the Base44 dashboard.`);
    console.error(`  Error: ${err.message}\n`);
  }
}

run().catch(err => {
  console.error('\n✗ Unexpected error:', err.message);
  process.exit(1);
});
