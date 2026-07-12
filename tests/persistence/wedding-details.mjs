/**
 * tests/persistence/wedding-details.mjs
 *
 * Core WeddingDetails round-trip domain: creates the one sentinel
 * WeddingDetails record every other module in this run shares, writes every
 * Guest Suite / Event Details / theme / planning-page field to it, and
 * asserts each round-trips on a fresh read. Also owns the sole-writer
 * isolation check and the sequential-append regression test, since both
 * depend on the same continuously-written sentinel record.
 *
 * Exports the created recordId so rsvp.mjs (events-array reorder) and
 * ownership.mjs (WeddingDetails ownership isolation) can exercise it too,
 * before the runner deletes it at the very end of the whole suite.
 */

import { APP_ID, SENTINEL, api, pass, fail, deepEqual, writtenSubsetMatches, cleanupWeddingDetails } from './_shared.mjs';

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
  // fix/universe-picker-integrity: was undeclared on the schema entirely
  // until this fix — every asset customisation a couple made was silently
  // dropped on save.
  assetContent: {
    saveTheDate: { headerText: 'Test header', subtitle: 'Test subtitle', layout: 'centered' },
    seatingChart: { title: 'Test seating chart', bgMode: 'light' },
  },
};

export async function runWeddingDetails(token) {
  const results = [];
  let recordId = null;

  // ── Create sentinel record ────────────────────────────────────────────────
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

  // ── Safety guard, write, fresh read ───────────────────────────────────────
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

    // ── Write all test fields in one PUT ───────────────────────────────────
    process.stdout.write('  Writing test values to all Guest Suite fields… ');
    await api(
      'PUT',
      `/apps/${APP_ID}/entities/WeddingDetails/${recordId}`,
      { couple1Name: SENTINEL, couple2Name: 'DO_NOT_USE', ...TEST_FIELDS },
      token,
    );
    console.log('✓ written\n');

    // ── Fresh read ──────────────────────────────────────────────────────────
    process.stdout.write('  Reading record back fresh from Base44… ');
    record = await api('GET', `/apps/${APP_ID}/entities/WeddingDetails/${recordId}`, undefined, token);
    console.log('✓\n');
  } catch (err) {
    console.error(`\n✗ ${err.message}`);
    await cleanupWeddingDetails(token, recordId);
    process.exit(1);
  }

  // ── Assert each field ─────────────────────────────────────────────────────
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

  // ── Event Details canonical field tests (data-model refactor + redesign) ─────
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

  // ── Consolidated theme.* round-trip ──────────────────────────────────────────
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

  // ── Planning page fields — previously silently dropped, now registered ────────
  console.log('\n  Planning page field persistence tests (foodAndBeverage, photography, attire, flowers, decorations, beauty, entertainmentDetails):\n');

  for (const field of ['foodAndBeverage', 'photography', 'attire', 'flowers', 'decorations', 'beauty', 'entertainmentDetails', 'assetContent']) {
    const written = TEST_FIELDS[field];
    const got     = record[field];
    results.push(writtenSubsetMatches(written, got)
      ? pass(field, `all sub-fields persisted`)
      : fail(field, written, got));
  }

  // ── Attire nested arrays — new sub-fields (outfits, tailor, fittings, accessories) ──
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

  // ── Sequential append test (catches the "second add overwrites first" bug) ──
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

  return { results, recordId };
}
