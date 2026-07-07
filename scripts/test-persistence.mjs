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
import { buildWeddingDetailsPayload, verifyOnboardingSave } from '../src/lib/onboardingSave.js';

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
      event_id:         'test-pre-event-id-1',
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
  postWeddingEvents: [
    {
      id:       'test-post-1',
      event_id: 'test-post-event-id-1',
      name:     'Farewell Brunch',
      type:     'Brunch',
      date:     '2025-11-15',
      startTime: '10:00',
      endTime:   '12:00',
      venueName: 'Test Cafe',
      details:   'Relaxed send-off',
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
    stylingQuestionnaire: { enabled: true },
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
  // ── Consolidated theme fields ─────────────────────────────────────────────
  theme: {
    aesthetic:      ['Classic', 'Romantic'],
    faith:          'Interfaith',
    faithSecondary: 'Catholic and Hindu',
    culture:        ['Indian', 'Italian'],
    cultureOther:   'Filipino-Australian',
    atmosphere:     ['Intimate & relaxed', 'Formal & elegant'],
    season:         'Autumn',
    setting:        'Mix of both',
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
  // ── 7 planning pages — previously silently dropped, now registered ───────────
  foodAndBeverage: {
    caterer: 'Test Catering Co',
    cateringContact: 'Jane Smith',
    cateringPhone: '+61 400 000 010',
    cateringEmail: 'catering@test.com',
    serviceStyle: 'Seated',
    guestCount: '120',
    menuItems: [{ name: 'Entree', description: 'Bruschetta' }],
    dietaryOptions: ['Vegan', 'Gluten-free'],
    barType: 'Open bar',
    barNotes: 'House wine and beer included',
    cake: 'Three-tier vanilla sponge',
    desserts: 'Dessert bar',
    coffee: 'Espresso station',
    lateNightSnacks: 'Mini burgers',
  },
  photography: {
    photographer: 'Test Photography Studio',
    photographerContact: 'Alex Jones',
    photographerPhone: '+61 400 000 011',
    photographerEmail: 'photo@test.com',
    photographyPackage: 'Full day',
    photographyHours: '10',
    photographyStyle: 'Documentary candid',
    videographer: 'Test Video Co',
    videographerPhone: '+61 400 000 012',
    videoLength: '5 minute highlight reel',
    mustHaveShots: 'First look, ring exchange, first dance',
    photoDeliveryTimeline: '6 weeks',
    editedPhotosCount: '600',
    editingStyle: 'Natural',
  },
  attire: {
    notes: 'Bride: ivory silk gown. Groom: navy suit. Bridesmaids: dusty rose.',
    outfits: [
      { id: 'outfit-test-1', role: 'Bride', roleCustom: '', name: 'Test Bride', description: 'Ivory silk gown', source: 'Jenny Yoo', status: 'Ordered', measurements: 'Size 8', cost: '$2,800', photoUrl: '' },
      { id: 'outfit-test-2', role: 'Groom', roleCustom: '', name: 'Test Groom', description: 'Navy three-piece suit', source: 'Trenery', status: 'Ready', measurements: 'Chest 42', cost: '$950', photoUrl: '' },
    ],
    tailor: { name: 'Test Tailor Studio', contact: 'Mary Needles', phone: '+61 400 000 099', email: 'tailor@test.com', notes: 'First fitting six weeks before' },
    fittings: [
      { id: 'fitting-test-1', date: '2025-10-15', who: 'Bride', notes: 'First dress fitting' },
      { id: 'fitting-test-2', date: '2025-11-01', who: 'Groom', notes: 'Suit alterations check' },
    ],
    accessories: [
      { id: 'acc-test-1', item: 'Veil', forWhom: 'Bride', done: false },
      { id: 'acc-test-2', item: 'Cufflinks', forWhom: 'Groom', done: true },
    ],
  },
  flowers: {
    florist: 'Test Florist Studio',
    vendorId: 'vendor-test-florist-1',
    bouquet: 'White peonies and garden roses',
    boutonnieres: 'Single white rose',
    ceremonyArrangements: 'Arch florals with greenery',
    receptionCentrepieces: 'Low arrangements, white and blush',
    flowerBudget: '4000',
    colorPalette: 'White, blush, sage',
    floralNotes: 'No lilies — allergy',
  },
  decorations: {
    decorator: 'Test Decorations Co',
    theme: 'Garden romantic',
    colorScheme: 'White, blush, gold',
    lightingStyle: 'String lights and candles',
    tableLinen: 'White linen with gold chargers',
    signage: 'Acrylic welcome sign',
    photoBooth: false,
    decorationNotes: 'Sustainable florals preferred',
  },
  beauty: {
    hairStylist: 'Test Hair Studio',
    makeupArtist: 'Test Makeup Co',
    trialDate: '2025-10-15',
    gettingReadyPeople: [
      { name: 'Bride', services: ['hair', 'makeup'] },
      { name: 'Maid of honour', services: ['hair'] },
    ],
    skincareTimeline: [
      { date: '2025-10-01', task: 'Facial' },
      { date: '2025-11-01', task: 'Final facial' },
    ],
    trials: [
      { date: '2025-10-15', type: 'Hair and makeup trial', notes: 'Updo with loose curls' },
    ],
    beautyNotes: 'Airbrush foundation preferred',
  },
  entertainmentDetails: {
    bandOrDj: 'DJ',
    entertainerName: 'Test DJ Services',
    entertainerPhone: '+61 400 000 013',
    firstDanceSong: 'Perfect - Ed Sheeran',
    fatherDaughterSong: 'My Girl - The Temptations',
    doNotPlayList: ['Cotton Eye Joe'],
    mc: 'Best man',
    mcName: 'Test Best Man',
    photoBooth: true,
    photoBoothProvider: 'Test Photo Booth Co',
    entertainmentNotes: 'DJ to play until midnight',
  },
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
      { couple1Name: SENTINEL, couple2Name: 'DO_NOT_USE', slug: `__test__${Date.now()}`, is_test: true },
      token,
    );
    recordId = created.id;
    if (!recordId) throw new Error('No id returned from create');
    console.log(`✓ id=${recordId}\n`);
  } catch (err) {
    console.error(`\n✗ Create failed: ${err.message}`);
    process.exit(1);
  }

  // ── 3-5. Safety guard, write, fresh read ─────────────────────────────────────
  // Wrapped in one try/finally so ANY failure in this phase (known or not)
  // still deletes the sentinel record before exiting. This replaced scattered
  // manual cleanup()-then-exit calls, one of which had a real gap: the
  // safety-guard abort used to exit WITHOUT ever deleting the record it had
  // just created, leaking a sentinel into product data on every such failure.
  let record;
  try {
    const check = await api('GET', `/apps/${APP_ID}/entities/WeddingDetails/${recordId}`, undefined, token);
    if (check.couple1Name !== SENTINEL) {
      throw new Error(`SAFETY ABORT — record ${recordId} is not the sentinel. Refusing to write.`);
    }

    // ── 4. Write all test fields in one PUT ───────────────────────────────────
    process.stdout.write('  Writing test values to all Guest Suite fields… ');
    await api(
      'PUT',
      `/apps/${APP_ID}/entities/WeddingDetails/${recordId}`,
      { couple1Name: SENTINEL, couple2Name: 'DO_NOT_USE', ...TEST_FIELDS },
      token,
    );
    console.log('✓ written\n');

    // ── 5. Fresh read ──────────────────────────────────────────────────────────
    process.stdout.write('  Reading record back fresh from Base44… ');
    record = await api('GET', `/apps/${APP_ID}/entities/WeddingDetails/${recordId}`, undefined, token);
    console.log('✓\n');
  } catch (err) {
    console.error(`\n✗ ${err.message}`);
    await cleanup(token, recordId);
    process.exit(1);
  }

  // ── 6. Assert each field ─────────────────────────────────────────────────────
  console.log('  Field assertions:\n');

  // is_test — harness-hygiene tag; must persist so product queries can
  // defensively exclude test records even if cleanup below fails.
  {
    results.push(record.is_test === true
      ? pass('is_test', 'true')
      : fail('is_test', true, record.is_test));
  }

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

  // weddingPolicies.stylingQuestionnaire.enabled — the couple-side toggle for
  // the guest styling questionnaire (roadmap D2)
  {
    const written = TEST_FIELDS.weddingPolicies.stylingQuestionnaire.enabled;
    const got     = record.weddingPolicies?.stylingQuestionnaire?.enabled;
    results.push(got === written
      ? pass('weddingPolicies.stylingQuestionnaire.enabled', String(got))
      : fail('weddingPolicies.stylingQuestionnaire.enabled', written, got));
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
    // Stable event_id — prerequisite for Smart RSVP per-event responses
    results.push(got?.event_id === written.event_id
      ? pass('preWeddingEvents[0].event_id', written.event_id)
      : fail('preWeddingEvents[0].event_id — SCHEMA REGISTRATION REQUIRED', written.event_id, got?.event_id));
  }

  // postWeddingEvents round-trip — incl. event_id
  {
    const written  = TEST_FIELDS.postWeddingEvents[0];
    const gotArray = record.postWeddingEvents || [];
    const got      = gotArray.find(e => e.id === written.id);
    results.push(got?.name === written.name
      ? pass('postWeddingEvents[0] persists', written.name)
      : fail('postWeddingEvents[0] persists', written, got));
    results.push(got?.event_id === written.event_id
      ? pass('postWeddingEvents[0].event_id', written.event_id)
      : fail('postWeddingEvents[0].event_id — SCHEMA REGISTRATION REQUIRED', written.event_id, got?.event_id));
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

  // ── 7b. Consolidated theme.* round-trip ──────────────────────────────────────
  console.log('\n  Consolidated theme.* persistence tests:\n');
  {
    const written = TEST_FIELDS.theme;
    const got     = record.theme;

    const aestheticOk  = deepEqual(written.aesthetic, got?.aesthetic);
    const faithOk      = got?.faith === written.faith;
    const faithSecOk   = got?.faithSecondary === written.faithSecondary;
    const cultureOk    = deepEqual(written.culture, got?.culture);
    const cultureOtherOk = got?.cultureOther === written.cultureOther;
    const atmosphereOk = deepEqual(written.atmosphere, got?.atmosphere);
    const seasonOk     = got?.season === written.season;
    const settingOk    = got?.setting === written.setting;

    results.push(aestheticOk
      ? pass('theme.aesthetic', JSON.stringify(got?.aesthetic))
      : fail('theme.aesthetic', written.aesthetic, got?.aesthetic));
    results.push(faithOk
      ? pass('theme.faith', got?.faith)
      : fail('theme.faith', written.faith, got?.faith));
    results.push(faithSecOk
      ? pass('theme.faithSecondary (Interfaith)', got?.faithSecondary)
      : fail('theme.faithSecondary', written.faithSecondary, got?.faithSecondary));
    results.push(cultureOk
      ? pass('theme.culture', JSON.stringify(got?.culture))
      : fail('theme.culture', written.culture, got?.culture));
    results.push(cultureOtherOk
      ? pass('theme.cultureOther', got?.cultureOther)
      : fail('theme.cultureOther', written.cultureOther, got?.cultureOther));
    results.push(atmosphereOk
      ? pass('theme.atmosphere', JSON.stringify(got?.atmosphere))
      : fail('theme.atmosphere', written.atmosphere, got?.atmosphere));
    results.push(seasonOk
      ? pass('theme.season', got?.season)
      : fail('theme.season', written.season, got?.season));
    results.push(settingOk
      ? pass('theme.setting', got?.setting)
      : fail('theme.setting', written.setting, got?.setting));
  }

  // ── 7c. Planning page fields — previously silently dropped, now registered ────
  console.log('\n  Planning page field persistence tests (foodAndBeverage, photography, attire, flowers, decorations, beauty, entertainmentDetails):\n');

  for (const field of ['foodAndBeverage', 'photography', 'attire', 'flowers', 'decorations', 'beauty', 'entertainmentDetails']) {
    const written = TEST_FIELDS[field];
    const got     = record[field];
    results.push(writtenSubsetMatches(written, got)
      ? pass(field, `all sub-fields persisted`)
      : fail(field, written, got));
  }

  // ── 7d. Attire nested arrays — new sub-fields (outfits, tailor, fittings, accessories) ──
  console.log('\n  Attire nested arrays persistence tests (outfits, tailor, fittings, accessories, notes):\n');

  // attire.notes — must be preserved (existing field, must not be dropped by the new structure)
  {
    const written = TEST_FIELDS.attire.notes;
    const got     = record.attire?.notes;
    results.push(written === got
      ? pass('attire.notes', `"${got}"`)
      : fail('attire.notes', written, got));
  }

  // attire.outfits[] — array of objects with nested fields
  {
    const written = TEST_FIELDS.attire.outfits;
    const got     = record.attire?.outfits;
    results.push(deepEqual(written, got)
      ? pass('attire.outfits', `${got?.length} outfit(s) round-tripped`)
      : fail('attire.outfits', written, got));
  }

  // attire.tailor — nested vendor object
  {
    const written = TEST_FIELDS.attire.tailor;
    const got     = record.attire?.tailor;
    results.push(deepEqual(written, got)
      ? pass('attire.tailor', 'tailor object round-tripped')
      : fail('attire.tailor', written, got));
  }

  // attire.fittings[] — array of fitting objects
  {
    const written = TEST_FIELDS.attire.fittings;
    const got     = record.attire?.fittings;
    results.push(deepEqual(written, got)
      ? pass('attire.fittings', `${got?.length} fitting(s) round-tripped`)
      : fail('attire.fittings', written, got));
  }

  // attire.accessories[] — array of accessory checklist items
  {
    const written = TEST_FIELDS.attire.accessories;
    const got     = record.attire?.accessories;
    results.push(deepEqual(written, got)
      ? pass('attire.accessories', `${got?.length} accessory(ies) round-tripped`)
      : fail('attire.accessories', written, got));
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

  // ── 8b. Guest RSVP fields — previously silently dropped, now registered ─────────
  console.log('\n  Guest RSVP field persistence tests (song_request, rsvp_note, poll_votes):\n');
  let guestSentinelId = null;
  try {
    const gCreated = await api('POST', `/apps/${APP_ID}/entities/Guest`,
      { name: '__PERSISTENCE_TEST_GUEST__', rsvp_link_id: 'test-sentinel-rsvp', is_test: true }, token);
    guestSentinelId = gCreated.id;
    if (!guestSentinelId) throw new Error('No id on created Guest');

    const guestPayload = {
      name: '__PERSISTENCE_TEST_GUEST__',
      song_request: 'September - Earth Wind & Fire',
      rsvp_note:    'So excited to celebrate with you both!',
      poll_votes:   { 'poll-test-1': 'opt-b', 'poll-test-2': 'opt-a' },
    };
    await api('PUT', `/apps/${APP_ID}/entities/Guest/${guestSentinelId}`, guestPayload, token);
    const gBack = await api('GET', `/apps/${APP_ID}/entities/Guest/${guestSentinelId}`, undefined, token);

    results.push(gBack.song_request === guestPayload.song_request
      ? pass('Guest.song_request', `"${gBack.song_request}"`)
      : fail('Guest.song_request', guestPayload.song_request, gBack.song_request));

    results.push(gBack.rsvp_note === guestPayload.rsvp_note
      ? pass('Guest.rsvp_note', `"${gBack.rsvp_note}"`)
      : fail('Guest.rsvp_note', guestPayload.rsvp_note, gBack.rsvp_note));

    const pvOk = gBack.poll_votes?.['poll-test-1'] === 'opt-b'
              && gBack.poll_votes?.['poll-test-2'] === 'opt-a';
    results.push(pvOk
      ? pass('Guest.poll_votes', JSON.stringify(gBack.poll_votes))
      : fail('Guest.poll_votes', guestPayload.poll_votes, gBack.poll_votes));
  } catch (err) {
    console.log(`  ❌ FAIL  Guest RSVP fields — error: ${err.message}`);
    results.push(false); results.push(false); results.push(false);
  } finally {
    if (guestSentinelId) {
      try { await api('DELETE', `/apps/${APP_ID}/entities/Guest/${guestSentinelId}`, undefined, token); }
      catch { /* non-fatal */ }
    }
  }

  // ── 8c. Guest invite-tracking fields — previously silently dropped, now registered ──
  console.log('\n  Guest invite-tracking field persistence tests (invite_sent_at, invite_channel, reminder_sent_at):\n');
  let guestInviteId = null;
  try {
    const gi = await api('POST', `/apps/${APP_ID}/entities/Guest`,
      { name: '__PERSISTENCE_TEST_INVITE__', is_test: true }, token);
    guestInviteId = gi.id;
    if (!guestInviteId) throw new Error('No id on created Guest');

    const sentAt = new Date().toISOString();

    // Write invite fields exactly as SendInvitesModal does
    await api('PUT', `/apps/${APP_ID}/entities/Guest/${guestInviteId}`,
      { name: '__PERSISTENCE_TEST_INVITE__', invite_sent_at: sentAt, invite_channel: 'email' }, token);
    // Reminder written in a separate PUT (mirrors the real reminder code path)
    await api('PUT', `/apps/${APP_ID}/entities/Guest/${guestInviteId}`,
      { name: '__PERSISTENCE_TEST_INVITE__', reminder_sent_at: sentAt }, token);

    const giBack = await api('GET', `/apps/${APP_ID}/entities/Guest/${guestInviteId}`, undefined, token);

    results.push(giBack.invite_sent_at === sentAt
      ? pass('Guest.invite_sent_at', `"${giBack.invite_sent_at}"`)
      : fail('Guest.invite_sent_at', sentAt, giBack.invite_sent_at));

    results.push(giBack.invite_channel === 'email'
      ? pass('Guest.invite_channel', `"${giBack.invite_channel}"`)
      : fail('Guest.invite_channel', 'email', giBack.invite_channel));

    results.push(giBack.reminder_sent_at === sentAt
      ? pass('Guest.reminder_sent_at', `"${giBack.reminder_sent_at}"`)
      : fail('Guest.reminder_sent_at', sentAt, giBack.reminder_sent_at));
  } catch (err) {
    console.log(`  ❌ FAIL  Guest invite-tracking fields — error: ${err.message}`);
    results.push(false); results.push(false); results.push(false);
  } finally {
    if (guestInviteId) {
      try { await api('DELETE', `/apps/${APP_ID}/entities/Guest/${guestInviteId}`, undefined, token); }
      catch { /* non-fatal */ }
    }
  }

  // ── 8d. Guest.event_responses — Smart RSVP per-event matrix (PR 2) ─────────────
  console.log('\n  Guest.event_responses field persistence tests (per-event RSVP matrix):\n');
  let guestEventRespId = null;
  try {
    const eventResponsesPayload = [
      {
        event_id:        'reorder-test-event-A',
        invited:         true,
        status:          'yes',
        meal_choice:     'chicken',
        plus_ones:       1,
        plus_one_names:  ['Jane Doe'],
        responded_at:    new Date().toISOString(),
      },
      {
        event_id:        'reorder-test-event-B',
        invited:         true,
        status:          'pending',
        meal_choice:     null,
        plus_ones:       0,
        plus_one_names:  [],
        responded_at:    null,
      },
    ];

    const geCreated = await api('POST', `/apps/${APP_ID}/entities/Guest`,
      { name: '__PERSISTENCE_TEST_EVENT_RESPONSES__' }, token);
    guestEventRespId = geCreated.id;
    if (!guestEventRespId) throw new Error('No id on created Guest');

    await api('PUT', `/apps/${APP_ID}/entities/Guest/${guestEventRespId}`,
      { name: '__PERSISTENCE_TEST_EVENT_RESPONSES__', event_responses: eventResponsesPayload }, token);

    const geBack = await api('GET', `/apps/${APP_ID}/entities/Guest/${guestEventRespId}`, undefined, token);
    const gotResponses = geBack.event_responses || [];

    // Round-trip every nested field individually (write → fresh read → assert not undefined)
    for (const written of eventResponsesPayload) {
      const got = gotResponses.find(r => r.event_id === written.event_id);
      const label = `event_responses[event_id=${written.event_id}]`;

      results.push(got !== undefined
        ? pass(`${label} entry exists`, `found`)
        : fail(`${label} entry exists`, written, got));

      results.push(got?.invited !== undefined && got.invited === written.invited
        ? pass(`${label}.invited`, String(got?.invited))
        : fail(`${label}.invited`, written.invited, got?.invited));

      results.push(got?.status !== undefined && got.status === written.status
        ? pass(`${label}.status`, got?.status)
        : fail(`${label}.status`, written.status, got?.status));

      results.push('meal_choice' in (got || {}) && got.meal_choice === written.meal_choice
        ? pass(`${label}.meal_choice`, JSON.stringify(got?.meal_choice))
        : fail(`${label}.meal_choice`, written.meal_choice, got?.meal_choice));

      results.push(got?.plus_ones !== undefined && got.plus_ones === written.plus_ones
        ? pass(`${label}.plus_ones`, String(got?.plus_ones))
        : fail(`${label}.plus_ones`, written.plus_ones, got?.plus_ones));

      results.push('plus_one_names' in (got || {}) && deepEqual(got.plus_one_names, written.plus_one_names)
        ? pass(`${label}.plus_one_names`, JSON.stringify(got?.plus_one_names))
        : fail(`${label}.plus_one_names`, written.plus_one_names, got?.plus_one_names));

      results.push('responded_at' in (got || {}) && got.responded_at === written.responded_at
        ? pass(`${label}.responded_at`, JSON.stringify(got?.responded_at))
        : fail(`${label}.responded_at`, written.responded_at, got?.responded_at));
    }
  } catch (err) {
    console.log(`  ❌ FAIL  Guest.event_responses — error: ${err.message}`);
    for (let i = 0; i < 14; i++) results.push(false);
  }

  // ── 8e. event_responses survives a WeddingDetails events-array reorder ─────────
  // event_responses references events by stable event_id, never array index — a
  // couple reordering the events list must not corrupt which guest response maps
  // to which event. See SMART_RSVP_MODEL.md "Base44 gotchas".
  console.log('\n  event_responses survives events-array reorder:\n');
  try {
    const eventA = { id: 'reorder-test-event-A', event_id: 'reorder-test-event-A', name: 'Welcome Drinks', type: 'Welcome Party', date: '2025-11-13' };
    const eventB = { id: 'reorder-test-event-B', event_id: 'reorder-test-event-B', name: 'Send-off Brunch', type: 'Brunch', date: '2025-11-15' };

    // Write events in order [A, B]
    await api('PUT', `/apps/${APP_ID}/entities/WeddingDetails/${recordId}`,
      { couple1Name: SENTINEL, couple2Name: 'DO_NOT_USE', preWeddingEvents: [eventA], postWeddingEvents: [eventB] }, token);

    // Reorder: swap so B comes before A in a unified read (simulate the chronological sort)
    await api('PUT', `/apps/${APP_ID}/entities/WeddingDetails/${recordId}`,
      { couple1Name: SENTINEL, couple2Name: 'DO_NOT_USE', preWeddingEvents: [eventB], postWeddingEvents: [eventA] }, token);

    const wdBack = await api('GET', `/apps/${APP_ID}/entities/WeddingDetails/${recordId}`, undefined, token);
    const allEventsAfterReorder = [...(wdBack.preWeddingEvents || []), ...(wdBack.postWeddingEvents || [])];
    const foundA = allEventsAfterReorder.find(e => e.event_id === 'reorder-test-event-A');
    const foundB = allEventsAfterReorder.find(e => e.event_id === 'reorder-test-event-B');

    const eventsSurvivedReorder = foundA?.name === eventA.name && foundB?.name === eventB.name;
    results.push(eventsSurvivedReorder
      ? pass('WeddingDetails events survive reorder', 'event_id still resolves to correct event after position swap')
      : fail('WeddingDetails events survive reorder', { eventA, eventB }, { foundA, foundB }));

    // The Guest's event_responses (written before the reorder) must still resolve
    // to the correct events purely by event_id, regardless of the position swap.
    const geAfterReorder = await api('GET', `/apps/${APP_ID}/entities/Guest/${guestEventRespId}`, undefined, token);
    const respA = (geAfterReorder.event_responses || []).find(r => r.event_id === 'reorder-test-event-A');
    const respB = (geAfterReorder.event_responses || []).find(r => r.event_id === 'reorder-test-event-B');
    const responsesStillMapCorrectly =
      respA?.event_id === foundA?.event_id && respA?.status === 'yes' &&
      respB?.event_id === foundB?.event_id && respB?.status === 'pending';
    results.push(responsesStillMapCorrectly
      ? pass('Guest.event_responses survives reorder', 'event_id references unaffected by WeddingDetails array reorder')
      : fail('Guest.event_responses survives reorder', { respA, respB }, { foundA, foundB }));
  } catch (err) {
    console.log(`  ❌ FAIL  events-array reorder — error: ${err.message}`);
    results.push(false); results.push(false);
  } finally {
    if (guestEventRespId) {
      try { await api('DELETE', `/apps/${APP_ID}/entities/Guest/${guestEventRespId}`, undefined, token); }
      catch { /* non-fatal */ }
    }
  }

  // ── 8f. Ownership isolation — a second user cannot resolve this wedding ──────
  // Exercises the exact filter mechanism src/lib/resolveMyWedding.js relies on:
  // WeddingDetails.filter({ created_by_id: <user> }) must scope strictly to
  // that owner. This app currently has no second real account to log in as
  // (confirmed via a live query — only one WeddingDetails owner exists), so
  // this proves isolation at the mechanism level instead: filtering by the
  // REAL test account's own id must find the sentinel; filtering by a
  // fabricated, definitely-non-existent user id must NOT find it. That is the
  // exact positive/negative behaviour every ownership-scoped page now depends
  // on — if Base44 ever started ignoring the created_by_id filter and just
  // returning everything (the original bug, one level up the stack), this
  // would catch it.
  console.log('\n  Ownership isolation tests (second user cannot resolve this wedding):\n');
  try {
    const me = await api('GET', `/apps/${APP_ID}/entities/User/me`, undefined, token);
    const realUserId = me.id;
    if (!realUserId) throw new Error('Could not resolve the test account\'s own user id');

    const ownQuery = encodeURIComponent(JSON.stringify({ created_by_id: realUserId }));
    const ownResults = await api('GET', `/apps/${APP_ID}/entities/WeddingDetails?q=${ownQuery}`, undefined, token);
    const ownList = Array.isArray(ownResults) ? ownResults : (ownResults?.data || ownResults?.results || []);
    const foundBySelf = ownList.some(w => w.id === recordId);
    results.push(foundBySelf
      ? pass('WeddingDetails.filter({created_by_id: <real owner>})', 'sentinel found, as expected')
      : fail('WeddingDetails.filter({created_by_id: <real owner>})', recordId, ownList.map(w => w.id)));

    const fakeUserId = `test-second-user-${Date.now()}-does-not-exist`;
    const fakeQuery = encodeURIComponent(JSON.stringify({ created_by_id: fakeUserId }));
    const fakeResults = await api('GET', `/apps/${APP_ID}/entities/WeddingDetails?q=${fakeQuery}`, undefined, token);
    const fakeList = Array.isArray(fakeResults) ? fakeResults : (fakeResults?.data || fakeResults?.results || []);
    const leakedToOther = fakeList.some(w => w.id === recordId);
    results.push(!leakedToOther
      ? pass('WeddingDetails.filter({created_by_id: <other user>})', 'sentinel correctly absent')
      : fail('WeddingDetails.filter({created_by_id: <other user>}) — ISOLATION BREACH', 'sentinel absent', 'sentinel present'));
  } catch (err) {
    console.log(`  ❌ FAIL  ownership isolation — error: ${err.message}`);
    results.push(false); results.push(false);
  }

  // ── 8g. Per-event RSVP — guest-side write path (SMART_RSVP_MODEL.md PR 3+4) ──
  // Mirrors RSVPPage.jsx's handleSubmit exactly: seed a guest with pending
  // event_responses for two invited events (one plus-one eligible), then
  // build the same Map-keyed-by-event_id merge the form submits, write it,
  // and assert every nested field round-trips on a fresh read.
  console.log('\n  Per-event RSVP guest-side write path (RSVPPage.jsx handleSubmit):\n');
  let guestEventRsvpId = null;
  try {
    const seededResponses = [
      { event_id: 'test-event-ceremony', invited: true, status: 'pending', meal_choice: null, plus_ones: 0, plus_one_names: [], responded_at: null },
      { event_id: 'test-event-reception', invited: true, status: 'pending', meal_choice: null, plus_ones: 0, plus_one_names: [], responded_at: null },
    ];

    const created = await api('POST', `/apps/${APP_ID}/entities/Guest`, {
      name: '__PERSISTENCE_TEST_EVENT_RSVP__',
      rsvp_link_id: 'test-per-event-rsvp-token',
      plus_one: true,
      event_responses: seededResponses,
    }, token);
    guestEventRsvpId = created.id;
    if (!guestEventRsvpId) throw new Error('No id on created Guest');

    // ── Simulate the guest's form submission exactly as handleSubmit does ──
    const now = new Date().toISOString();
    const eventForm = {
      'test-event-ceremony': { status: 'yes', meal_choice: 'chicken', plus_one_attending: false, plus_one_name: '' },
      'test-event-reception': { status: 'yes', meal_choice: 'vegetarian', plus_one_attending: true, plus_one_name: 'Jamie Guest' },
    };
    const invitedEvents = [{ event_id: 'test-event-ceremony' }, { event_id: 'test-event-reception' }];

    const existingResponses = seededResponses; // guest.event_responses at load time
    const updatedByEventId = new Map(existingResponses.map(r => [r.event_id, r]));
    for (const ev of invitedEvents) {
      const form = eventForm[ev.event_id];
      updatedByEventId.set(ev.event_id, {
        event_id: ev.event_id,
        invited: true,
        status: form.status,
        meal_choice: form.status === 'yes' ? (form.meal_choice || null) : null,
        plus_ones: (form.status === 'yes' && form.plus_one_attending) ? 1 : 0,
        plus_one_names: (form.status === 'yes' && form.plus_one_attending && form.plus_one_name) ? [form.plus_one_name] : [],
        responded_at: now,
      });
    }
    const nextEventResponses = Array.from(updatedByEventId.values());

    // Mirror RSVPPage.jsx's derived rsvp_status logic exactly.
    const invitedResponses = nextEventResponses.filter(r => r.invited);
    const anyYes = invitedResponses.some(r => r.status === 'yes');
    const allNo = invitedResponses.length > 0 && invitedResponses.every(r => r.status === 'no');
    const derivedRsvpStatus = anyYes ? 'attending' : allNo ? 'declined' : 'pending';

    await api('PUT', `/apps/${APP_ID}/entities/Guest/${guestEventRsvpId}`, {
      event_responses: nextEventResponses,
      rsvp_status: derivedRsvpStatus,
      song_request: 'Uptown Funk',
      rsvp_note: 'Cannot wait!',
      dietary_restrictions: 'Gluten free',
      rsvp_date: now.split('T')[0],
    }, token);

    const back = await api('GET', `/apps/${APP_ID}/entities/Guest/${guestEventRsvpId}`, undefined, token);
    const backResponses = back.event_responses || [];
    const ceremony = backResponses.find(r => r.event_id === 'test-event-ceremony');
    const reception = backResponses.find(r => r.event_id === 'test-event-reception');

    results.push(ceremony?.status === 'yes'
      ? pass('event_responses[ceremony].status', ceremony?.status)
      : fail('event_responses[ceremony].status', 'yes', ceremony?.status));
    results.push(ceremony?.meal_choice === 'chicken'
      ? pass('event_responses[ceremony].meal_choice', ceremony?.meal_choice)
      : fail('event_responses[ceremony].meal_choice', 'chicken', ceremony?.meal_choice));
    results.push(ceremony?.plus_ones === 0
      ? pass('event_responses[ceremony].plus_ones', String(ceremony?.plus_ones))
      : fail('event_responses[ceremony].plus_ones', 0, ceremony?.plus_ones));
    results.push(Array.isArray(ceremony?.plus_one_names) && ceremony.plus_one_names.length === 0
      ? pass('event_responses[ceremony].plus_one_names', JSON.stringify(ceremony?.plus_one_names))
      : fail('event_responses[ceremony].plus_one_names', [], ceremony?.plus_one_names));
    results.push(!!ceremony?.responded_at
      ? pass('event_responses[ceremony].responded_at', ceremony?.responded_at)
      : fail('event_responses[ceremony].responded_at', now, ceremony?.responded_at));

    results.push(reception?.status === 'yes'
      ? pass('event_responses[reception].status', reception?.status)
      : fail('event_responses[reception].status', 'yes', reception?.status));
    results.push(reception?.meal_choice === 'vegetarian'
      ? pass('event_responses[reception].meal_choice', reception?.meal_choice)
      : fail('event_responses[reception].meal_choice', 'vegetarian', reception?.meal_choice));
    results.push(reception?.plus_ones === 1
      ? pass('event_responses[reception].plus_ones', String(reception?.plus_ones))
      : fail('event_responses[reception].plus_ones', 1, reception?.plus_ones));
    results.push(JSON.stringify(reception?.plus_one_names) === JSON.stringify(['Jamie Guest'])
      ? pass('event_responses[reception].plus_one_names', JSON.stringify(reception?.plus_one_names))
      : fail('event_responses[reception].plus_one_names', ['Jamie Guest'], reception?.plus_one_names));
    results.push(!!reception?.responded_at
      ? pass('event_responses[reception].responded_at', reception?.responded_at)
      : fail('event_responses[reception].responded_at', now, reception?.responded_at));

    // Wedding-level fields written alongside — render once, not per event
    results.push(back.song_request === 'Uptown Funk'
      ? pass('Guest.song_request (per-event submit)', back.song_request)
      : fail('Guest.song_request (per-event submit)', 'Uptown Funk', back.song_request));
    results.push(back.rsvp_note === 'Cannot wait!'
      ? pass('Guest.rsvp_note (per-event submit)', back.rsvp_note)
      : fail('Guest.rsvp_note (per-event submit)', 'Cannot wait!', back.rsvp_note));
    results.push(back.dietary_restrictions === 'Gluten free'
      ? pass('Guest.dietary_restrictions (per-event submit)', back.dietary_restrictions)
      : fail('Guest.dietary_restrictions (per-event submit)', 'Gluten free', back.dietary_restrictions));

    // Both invited events answered "yes" → derived rsvp_status must be "attending",
    // so Dashboard's RSVPChart / InvitationsTab badges / GuestList badge all reflect
    // this guest correctly instead of showing them stuck on "pending".
    results.push(back.rsvp_status === 'attending'
      ? pass('Guest.rsvp_status derived from event_responses (any yes → attending)', back.rsvp_status)
      : fail('Guest.rsvp_status derived from event_responses (any yes → attending)', 'attending', back.rsvp_status));
  } catch (err) {
    console.log(`  ❌ FAIL  Per-event RSVP write path — error: ${err.message}`);
    for (let i = 0; i < 14; i++) results.push(false);
  } finally {
    if (guestEventRsvpId) {
      try { await api('DELETE', `/apps/${APP_ID}/entities/Guest/${guestEventRsvpId}`, undefined, token); }
      catch { /* non-fatal */ }
    }
  }

  // ── 8g2. Per-event RSVP — derived rsvp_status covers the "declined" branch ──
  // The block above only exercises "any yes → attending". This proves the other
  // branch: every invited event answered "no" → rsvp_status must be "declined",
  // not left on the default "pending".
  console.log('\n  Per-event RSVP derived rsvp_status — all-declined case:\n');
  let guestAllDeclinedId = null;
  try {
    const declinedResponses = [
      { event_id: 'test-event-ceremony', invited: true, status: 'no', meal_choice: null, plus_ones: 0, plus_one_names: [], responded_at: new Date().toISOString() },
      { event_id: 'test-event-reception', invited: true, status: 'no', meal_choice: null, plus_ones: 0, plus_one_names: [], responded_at: new Date().toISOString() },
    ];
    const invitedOnly = declinedResponses.filter(r => r.invited);
    const anyYes2 = invitedOnly.some(r => r.status === 'yes');
    const allNo2 = invitedOnly.length > 0 && invitedOnly.every(r => r.status === 'no');
    const derived2 = anyYes2 ? 'attending' : allNo2 ? 'declined' : 'pending';

    const created2 = await api('POST', `/apps/${APP_ID}/entities/Guest`, {
      name: '__PERSISTENCE_TEST_EVENT_RSVP_DECLINED__',
      event_responses: declinedResponses,
      rsvp_status: derived2,
    }, token);
    guestAllDeclinedId = created2.id;
    if (!guestAllDeclinedId) throw new Error('No id on created Guest');

    const back2 = await api('GET', `/apps/${APP_ID}/entities/Guest/${guestAllDeclinedId}`, undefined, token);
    results.push(back2.rsvp_status === 'declined'
      ? pass('Guest.rsvp_status derived from event_responses (all no → declined)', back2.rsvp_status)
      : fail('Guest.rsvp_status derived from event_responses (all no → declined)', 'declined', back2.rsvp_status));
  } catch (err) {
    console.log(`  ❌ FAIL  Per-event RSVP declined-derivation — error: ${err.message}`);
    results.push(false);
  } finally {
    if (guestAllDeclinedId) {
      try { await api('DELETE', `/apps/${APP_ID}/entities/Guest/${guestAllDeclinedId}`, undefined, token); }
      catch { /* non-fatal */ }
    }
  }

  // ── 8h. GuestbookEntry — round-trip + is_test display-exclusion (roadmap D4) ──
  console.log('\n  GuestbookEntry persistence tests (round-trip + is_test exclusion):\n');
  let realEntryId = null;
  let testEntryId = null;
  const GUESTBOOK_TEST_WEDDING_ID = 'test-guestbook-wedding-id';
  try {
    const payload = {
      wedding_id: GUESTBOOK_TEST_WEDDING_ID,
      guest_name: '__PERSISTENCE_TEST_GUESTBOOK_GUEST__',
      message: 'Congratulations to you both — wishing you a lifetime of happiness!',
    };
    const created = await api('POST', `/apps/${APP_ID}/entities/GuestbookEntry`, payload, token);
    realEntryId = created.id;
    if (!realEntryId) throw new Error('No id on created GuestbookEntry');

    const back = await api('GET', `/apps/${APP_ID}/entities/GuestbookEntry/${realEntryId}`, undefined, token);

    results.push(back.wedding_id === payload.wedding_id
      ? pass('GuestbookEntry.wedding_id', back.wedding_id)
      : fail('GuestbookEntry.wedding_id', payload.wedding_id, back.wedding_id));
    results.push(back.guest_name === payload.guest_name
      ? pass('GuestbookEntry.guest_name', back.guest_name)
      : fail('GuestbookEntry.guest_name', payload.guest_name, back.guest_name));
    results.push(back.message === payload.message
      ? pass('GuestbookEntry.message', back.message)
      : fail('GuestbookEntry.message', payload.message, back.message));
    results.push(!!back.created_date
      ? pass('GuestbookEntry.created_date (Base44 system field)', back.created_date)
      : fail('GuestbookEntry.created_date (Base44 system field)', '<any timestamp>', back.created_date));

    // Second entry, explicitly tagged is_test:true — same wedding_id as the
    // "real" entry above, so the exclusion filter is actually exercised
    // against a mixed result set, not just an empty one.
    const testPayload = {
      wedding_id: GUESTBOOK_TEST_WEDDING_ID,
      guest_name: '__PERSISTENCE_TEST_GUESTBOOK_TESTFLAG__',
      message: 'This entry must never be visible in a real guestbook.',
      is_test: true,
    };
    const createdTest = await api('POST', `/apps/${APP_ID}/entities/GuestbookEntry`, testPayload, token);
    testEntryId = createdTest.id;
    if (!testEntryId) throw new Error('No id on created is_test GuestbookEntry');

    const testBack = await api('GET', `/apps/${APP_ID}/entities/GuestbookEntry/${testEntryId}`, undefined, token);
    results.push(testBack.is_test === true
      ? pass('GuestbookEntry.is_test', String(testBack.is_test))
      : fail('GuestbookEntry.is_test', true, testBack.is_test));

    // Display-exclusion check: fetch all entries for this wedding_id and apply
    // the EXACT filter predicate WeddingGuestbookPage.jsx and Guestbook.jsx use
    // (`.filter(e => !e.is_test)`) — assert the is_test entry never survives it.
    const allForWedding = await api(
      'GET',
      `/apps/${APP_ID}/entities/GuestbookEntry?q=${encodeURIComponent(JSON.stringify({ wedding_id: GUESTBOOK_TEST_WEDDING_ID }))}`,
      undefined, token,
    );
    const allList = Array.isArray(allForWedding) ? allForWedding : (allForWedding?.data || allForWedding?.results || []);
    const displayed = allList.filter(e => !e.is_test);
    const realEntryShown = displayed.some(e => e.id === realEntryId);
    const testEntryHidden = !displayed.some(e => e.id === testEntryId);

    results.push(realEntryShown
      ? pass('Guestbook display filter — real entry visible', 'shown')
      : fail('Guestbook display filter — real entry visible', 'shown', 'hidden'));
    results.push(testEntryHidden
      ? pass('Guestbook display filter — is_test entry excluded', 'hidden')
      : fail('Guestbook display filter — is_test entry excluded', 'hidden', 'shown'));
  } catch (err) {
    console.log(`  ❌ FAIL  GuestbookEntry — error: ${err.message}`);
    for (let i = 0; i < 6; i++) results.push(false);
  } finally {
    for (const id of [realEntryId, testEntryId]) {
      if (!id) continue;
      try { await api('DELETE', `/apps/${APP_ID}/entities/GuestbookEntry/${id}`, undefined, token); }
      catch { /* non-fatal */ }
    }
  }

  // ── 8k. LiveStream ownership isolation (fix/livestream-scoping) ───────────────
  // GuestSuiteLiveStream.jsx and LiveStreaming.jsx both used to call
  // LiveStream.list('-created_date') with no created_by_id filter — the exact
  // "most-recent-record-across-the-whole-app" bug resolveMyWedding.js's own
  // doc comment describes, just never migrated to that fix for this entity.
  // Both now go through the new getMyLiveStream() helper. This proves the
  // underlying filter mechanism it depends on actually isolates by owner:
  // a sentinel LiveStream must be found when filtering by its real owner,
  // and must NOT be found when filtering by a different (fabricated) user id.
  console.log('\n  LiveStream ownership isolation tests (one wedding\'s stream is not resolvable from another\'s context):\n');
  let liveStreamId = null;
  try {
    const created = await api('POST', `/apps/${APP_ID}/entities/LiveStream`, {
      title: '__PERSISTENCE_TEST_LIVESTREAM__',
      stream_url: 'https://www.youtube.com/watch?v=test-sentinel',
      is_test: true,
    }, token);
    liveStreamId = created.id;
    if (!liveStreamId) throw new Error('No id on created LiveStream');

    const me = await api('GET', `/apps/${APP_ID}/entities/User/me`, undefined, token);
    const realUserId = me.id;
    if (!realUserId) throw new Error('Could not resolve the test account\'s own user id');

    const ownQuery = encodeURIComponent(JSON.stringify({ created_by_id: realUserId }));
    const ownResults = await api('GET', `/apps/${APP_ID}/entities/LiveStream?q=${ownQuery}`, undefined, token);
    const ownList = Array.isArray(ownResults) ? ownResults : (ownResults?.data || ownResults?.results || []);
    const foundBySelf = ownList.some(s => s.id === liveStreamId);
    results.push(foundBySelf
      ? pass('LiveStream.filter({created_by_id: <real owner>})', 'sentinel found, as expected')
      : fail('LiveStream.filter({created_by_id: <real owner>})', liveStreamId, ownList.map(s => s.id)));

    const fakeUserId = `test-second-user-${Date.now()}-does-not-exist`;
    const fakeQuery = encodeURIComponent(JSON.stringify({ created_by_id: fakeUserId }));
    const fakeResults = await api('GET', `/apps/${APP_ID}/entities/LiveStream?q=${fakeQuery}`, undefined, token);
    const fakeList = Array.isArray(fakeResults) ? fakeResults : (fakeResults?.data || fakeResults?.results || []);
    const leakedToOther = fakeList.some(s => s.id === liveStreamId);
    results.push(!leakedToOther
      ? pass('LiveStream.filter({created_by_id: <other user>})', 'sentinel correctly absent')
      : fail('LiveStream.filter({created_by_id: <other user>}) — ISOLATION BREACH', 'sentinel absent', 'sentinel present'));

    // The old bug specifically: an UNFILTERED list() call would return this
    // sentinel as [0] (most recent) regardless of who's asking. Confirm the
    // fixed helper's actual query shape excludes it for a different owner —
    // i.e. simulate "another wedding's context" the same way
    // getMyLiveStream() does, scoped by created_by_id, and confirm it comes
    // back null rather than resolving this wedding's sentinel stream.
    const otherContextResults = await api('GET', `/apps/${APP_ID}/entities/LiveStream?q=${fakeQuery}`, undefined, token);
    const otherContextList = Array.isArray(otherContextResults) ? otherContextResults : (otherContextResults?.data || otherContextResults?.results || []);
    const resolvedForOtherContext = otherContextList.filter(s => !s.is_test).length > 0
      ? otherContextList.filter(s => !s.is_test).sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0]
      : null;
    results.push(resolvedForOtherContext === null
      ? pass('getMyLiveStream() mechanism — another wedding\'s context resolves no stream', 'null, as expected')
      : fail('getMyLiveStream() mechanism — another wedding\'s context resolves no stream', null, resolvedForOtherContext?.id));
  } catch (err) {
    console.log(`  ❌ FAIL  LiveStream ownership isolation — error: ${err.message}`);
    results.push(false, false, false);
  } finally {
    if (liveStreamId) {
      try { await api('DELETE', `/apps/${APP_ID}/entities/LiveStream/${liveStreamId}`, undefined, token); }
      catch { /* non-fatal */ }
    }
  }

  // ── 8l. Onboarding — failed save is reported as failure, not success ─────────
  // (fix/onboarding-save #1) verifyOnboardingSave is the exact predicate
  // saveOnboarding uses after re-fetching the record fresh. Proves it
  // correctly distinguishes a real match from every way a save can silently
  // go wrong — wrong id, wrong names, or no record at all — rather than
  // treating any of those as success (the original bug: the save's own
  // internal try/catch swallowed errors and the caller advanced to the
  // completion screen regardless).
  console.log('\n  Onboarding save verification (mismatches are reported as failure, not success):\n');
  try {
    const weddingId = 'test-wedding-id-123';
    const expectedNames = 'Alex Test & Sam Test';

    const matchResult = verifyOnboardingSave({
      weddingId, expectedNames,
      verified: { id: weddingId, coupleNames: expectedNames },
    });
    results.push(matchResult === true
      ? pass('verifyOnboardingSave — matching id + names → success', 'true')
      : fail('verifyOnboardingSave — matching id + names → success', true, matchResult));

    const wrongIdResult = verifyOnboardingSave({
      weddingId, expectedNames,
      verified: { id: 'a-different-id', coupleNames: expectedNames },
    });
    results.push(wrongIdResult === false
      ? pass('verifyOnboardingSave — id mismatch → failure, not success', 'false')
      : fail('verifyOnboardingSave — id mismatch → failure, not success', false, wrongIdResult));

    const wrongNamesResult = verifyOnboardingSave({
      weddingId, expectedNames,
      verified: { id: weddingId, coupleNames: 'Someone Else & Their Partner' },
    });
    results.push(wrongNamesResult === false
      ? pass('verifyOnboardingSave — names mismatch → failure, not success', 'false')
      : fail('verifyOnboardingSave — names mismatch → failure, not success', false, wrongNamesResult));

    const noRecordResult = verifyOnboardingSave({ weddingId, expectedNames, verified: null });
    results.push(noRecordResult === false
      ? pass('verifyOnboardingSave — no record found → failure, not success', 'false')
      : fail('verifyOnboardingSave — no record found → failure, not success', false, noRecordResult));
  } catch (err) {
    console.log(`  ❌ FAIL  Onboarding save verification — error: ${err.message}`);
    results.push(false, false, false, false);
  }

  // ── 8m. Onboarding — progress survives a simulated reload ────────────────────
  // (fix/onboarding-save #2) Mirrors exactly what Onboarding.jsx's goNext /
  // persistDraftStep writes on every step advance, and what its mount effect
  // reads on a fresh load (getMyWeddingDetails, i.e. filter by
  // created_by_id + most-recent + exclude is_test). A "simulated reload" is
  // this exact same read happening again, independently, against the
  // record the "previous page load" wrote — proving a real refresh would
  // rehydrate onboardingData and resume at the right step rather than
  // restarting from welcome.
  console.log('\n  Onboarding progress survives a simulated reload:\n');
  let onboardingDraftId = null;
  try {
    const partialOnboardingData = {
      couple1Name: 'Alex', couple2Name: 'Sam',
      weddingDate: '2027-03-14', venue: 'Test Garden Venue', location: 'Test City',
      guestCount: 120, guestType: 'celebration',
      activeUniverse: 'tulum', websiteMode: 'light',
    };
    const stepIndexAtRefresh = 5; // 'weddingType' step, per Onboarding.jsx's STEPS array

    const payload = {
      ...buildWeddingDetailsPayload(partialOnboardingData),
      onboardingDraft: true,
      onboardingStepIndex: stepIndexAtRefresh,
    };
    const created = await api('POST', `/apps/${APP_ID}/entities/WeddingDetails`, payload, token);
    onboardingDraftId = created.id;
    if (!onboardingDraftId) throw new Error('No id on created draft WeddingDetails');

    // Simulated reload: an independent fresh read, exactly as
    // getMyWeddingDetails() performs it (filter by owner, most recent,
    // real records only).
    const me = await api('GET', `/apps/${APP_ID}/entities/User/me`, undefined, token);
    const ownQuery = encodeURIComponent(JSON.stringify({ created_by_id: me.id }));
    const ownResults = await api('GET', `/apps/${APP_ID}/entities/WeddingDetails?q=${ownQuery}`, undefined, token);
    const ownList = Array.isArray(ownResults) ? ownResults : (ownResults?.data || ownResults?.results || []);
    const real = ownList.filter(w => !w.is_test);
    const resumed = real.length > 0
      ? real.slice().sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0]
      : null;

    results.push(resumed?.id === onboardingDraftId
      ? pass('Simulated reload — draft resolves as the most recent record', 'found')
      : fail('Simulated reload — draft resolves as the most recent record', onboardingDraftId, resumed?.id));
    results.push(resumed?.onboardingDraft === true
      ? pass('Simulated reload — onboardingDraft flag survives', 'true')
      : fail('Simulated reload — onboardingDraft flag survives', true, resumed?.onboardingDraft));
    results.push(resumed?.onboardingStepIndex === stepIndexAtRefresh
      ? pass('Simulated reload — onboardingStepIndex survives (resume point)', String(resumed?.onboardingStepIndex))
      : fail('Simulated reload — onboardingStepIndex survives (resume point)', stepIndexAtRefresh, resumed?.onboardingStepIndex));
    results.push(resumed?.couple1Name === 'Alex' && resumed?.couple2Name === 'Sam'
      ? pass('Simulated reload — couple names survive for rehydration', `${resumed?.couple1Name} & ${resumed?.couple2Name}`)
      : fail('Simulated reload — couple names survive for rehydration', 'Alex / Sam', `${resumed?.couple1Name} / ${resumed?.couple2Name}`));
    results.push(resumed?.mainCeremony?.venueName === 'Test Garden Venue'
      ? pass('Simulated reload — venue survives for rehydration', resumed?.mainCeremony?.venueName)
      : fail('Simulated reload — venue survives for rehydration', 'Test Garden Venue', resumed?.mainCeremony?.venueName));
    results.push(resumed?.activeUniverse === 'tulum'
      ? pass('Simulated reload — activeUniverse survives for rehydration', resumed?.activeUniverse)
      : fail('Simulated reload — activeUniverse survives for rehydration', 'tulum', resumed?.activeUniverse));
  } catch (err) {
    console.log(`  ❌ FAIL  Onboarding progress reload — error: ${err.message}`);
    results.push(false, false, false, false, false, false);
  } finally {
    if (onboardingDraftId) {
      try { await api('DELETE', `/apps/${APP_ID}/entities/WeddingDetails/${onboardingDraftId}`, undefined, token); }
      catch { /* non-fatal */ }
    }
  }

  // ── 9. Summary ───────────────────────────────────────────────────────────────
  const passed = results.filter(Boolean).length;
  const total  = results.length;
  const allOk  = passed === total;

  console.log(`\n${'─'.repeat(55)}`);
  console.log(`  Result: ${passed}/${total} fields persisted correctly`);
  if (!allOk) {
    console.log('  ⚠️  Some fields failed — check that they are registered in');
    console.log('  the WeddingDetails / Guest entity schemas on Base44.');
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
