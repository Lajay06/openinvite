/**
 * scripts/lib/fixtures/richWedding.mjs
 *
 * A WEDDING SIX WEEKS OUT, FOR RECORDINGS.
 *
 * The studio tour was filmed against the harness SEED: four guests, two
 * tables, three tasks. Every chapter read as an empty studio. This is the
 * other fixture, selected as `rich` (see FIXTURES in ../renderHarness.mjs),
 * and it exists only for footage. The default SEED is untouched, so no render
 * guard moves because this file exists.
 *
 * SEEDED, NOT RANDOM. Every choice below comes from one mulberry32 stream with
 * a fixed seed, so two builds at the same clock are deep-equal and a
 * re-recording shows the same people at the same tables. Dates are offsets
 * from `now`, like the harness's own, so the wedding is always six weeks away
 * when the camera rolls.
 *
 * NOBODY REAL. Names are drawn from first-name and surname pools and combined
 * by the stream, so no row is a person. Emails are @example.com. Phone numbers
 * come from the ACMA range reserved for fiction (0491 570 xxx and its
 * neighbors). Venues and streets are invented. Nothing here came from a live
 * account.
 *
 * HOUSEHOLDS FOLLOW LANE A'S CONVENTION WITHOUT IMPORTING IT. A household is a
 * set of rows sharing household_id; a guest who is their own invitation has no
 * household_id at all (src/lib/household.js on #900 normalizes absent, empty
 * and whitespace to "none"). This file sets the fields on rows and imports
 * nothing from src/lib, so it works whether or not #900 has merged.
 *
 * EVERY FIELD IS A REAL ONE. The harness runs assertSeedMatchesSchemas over
 * whichever fixture it is given, so a field the entity does not declare throws
 * before a frame is recorded.
 *
 * EVENTS. The product has exactly two main event slots (ceremony and
 * reception, isMain in src/lib/weddingEvents.js), so the weekend's five events
 * are those two plus three custom ones: welcome drinks and a rehearsal dinner
 * before, a recovery brunch after.
 */

const DAY = 86400000;
const WEDDING_IN_DAYS = 42;
const OWNER = 'fixture@example.com';

// ── the stream ────────────────────────────────────────────────────────────
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── pools ─────────────────────────────────────────────────────────────────
const FIRST = [
  'Olivia', 'Liam', 'Amelia', 'Noah', 'Charlotte', 'Oliver', 'Isla', 'Jack', 'Mia', 'William',
  'Ava', 'Henry', 'Grace', 'Leo', 'Chloe', 'Thomas', 'Zoe', 'Lucas', 'Harper', 'Hugo',
  'Sienna', 'Archie', 'Ruby', 'Oscar', 'Matilda', 'Ethan', 'Ivy', 'Max', 'Layla', 'Felix',
  'Ananya', 'Arjun', 'Mei', 'Wei', 'Yuki', 'Kenji', 'Sofia', 'Mateo', 'Nadia', 'Omar',
  'Amira', 'Tariq', 'Leilani', 'Tane', 'Priyanka', 'Rohan', 'Hana', 'Min-jun', 'Lucia', 'Marco',
  'Elena', 'Nikos', 'Daria', 'Pavel', 'Aisha', 'Kofi', 'Freya', 'Callum', 'Esther', 'Joel',
  'Bianca', 'Dominic', 'Tessa', 'Rafael', 'Imogen', 'Samuel', 'Phoebe', 'Patrick', 'Ingrid', 'Declan',
];
const LAST = [
  'Nguyen', 'Smith', 'Papadopoulos', 'Chen', 'Kelly', 'Rossi', 'Patel', 'Walsh', 'Kim', 'Hughes',
  'Haddad', 'Fraser', 'Tanaka', 'Moreau', 'Okafor', 'Lindqvist', 'Costa', 'Murphy', 'Singh', 'Doyle',
  'Ferreira', 'Bauer', 'Romano', 'Ahmed', 'Sullivan', 'Novak', 'Lam', 'Gallagher', 'Mendes', 'Harlow',
  'Kowalski', 'Ibrahim', 'Barrett', 'Vasquez', 'Tran', 'Whitfield', 'Ortega', 'Byrne', 'Hassan', 'Ellery',
  'Petrov', 'Ashworth', 'Delaney', 'Marchetti', 'Okoye', 'Sato', 'Quinlan', 'Varga', 'Pham', 'Lennox',
];
const CHILD_FIRST = ['Elsie', 'Arlo', 'Poppy', 'Teddy', 'Maeve', 'Remy', 'Nina', 'Otis', 'Aria', 'Jude', 'Lola', 'Kai', 'Rosie', 'Ari', 'Ada', 'Milo'];
const DIETARY = [
  'Vegetarian', 'Gluten free', 'Coeliac, please no cross-contact', 'Nut allergy (anaphylactic)',
  'Dairy free', 'No pork', 'Pescatarian', 'Shellfish allergy', 'Halal', 'Low FODMAP',
];
// ACMA's fictional-use mobile numbers, so no row can ring a real phone.
const FICTION_MOBILES = [
  '491570006', '491570156', '491570157', '491570158', '491570159', '491570110', '491570313',
  '491570737', '491571266', '491571491', '491571804', '491572549', '491572665', '491572983',
  '491573770', '491573087', '491574118', '491574632', '491575254', '491575789',
];
const STOCK = (id, w = 800) => `https://res.cloudinary.com/dsr84xknv/image/upload/f_auto,q_auto,w_${w}/${id}`;

/** The pinned shape. tests guard these numbers, so change them together. */
export const RICH_COUNTS = Object.freeze({
  guests: 212,
  invitations: 140,
  solo: 92,
  couples: 36,
  families: 12,
  children: 24,
  events: 5,
  mainEvents: 2,
  customEvents: 3,
  tables: 18,
  budgetLines: 25,
  runSheet: 14,
  tasks: 30,
  guestNotes: 3,
  songRequests: 2,
});

/**
 * Build the rich fixture.
 * @param {{ now?: number }} [opts]
 * @returns {{ seed: object, published: object, slug: string }}
 */
export function buildRichWedding({ now = Date.now() } = {}) {
  const rnd = mulberry32(20261007);
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const chance = (p) => rnd() < p;
  // Midday-anchored so a date-only slice never lands on the neighboring day.
  const today = Math.floor(now / DAY) * DAY + DAY / 2;
  const iso = (offsetDays) => new Date(today + offsetDays * DAY).toISOString();
  const day = (offsetDays) => iso(offsetDays).slice(0, 10);
  const W = WEDDING_IN_DAYS;

  const couple1Name = 'Isla';
  const couple2Name = 'Kai';
  const coupleNames = 'Isla & Kai';
  const slug = 'isla-and-kai';

  // ── events ──────────────────────────────────────────────────────────────
  const EVENTS = ['main-ceremony', 'reception', 'welcome-drinks', 'rehearsal-dinner', 'recovery-brunch'];
  const mainCeremony = {
    venueName: 'Linden Hall Gardens', address: '14 Hollis Lane, Kew VIC',
    startTime: '15:30', endTime: '16:15',
    dressCode: 'Garden formal', dressCodePills: ['Garden formal', 'Flat shoes for the lawn'],
    dressCodeNotes: 'The ceremony is on the lawn, so block heels or flats will save you.',
    parkingInfo: 'Free parking behind the hall. It fills by 3pm.',
  };
  const reception = {
    venueName: 'The Wattle Room', address: '14 Hollis Lane, Kew VIC',
    startTime: '17:30', endTime: '23:30', dressCode: 'Garden formal',
  };
  const preWeddingEvents = [
    { id: 'welcome-drinks', event_id: 'welcome-drinks', name: 'Welcome drinks',
      date: day(W - 1), startTime: '18:00', venueName: 'The Corner Larder', address: '3 Pell Street, Richmond VIC',
      dressCode: 'Come as you are' },
    { id: 'rehearsal-dinner', event_id: 'rehearsal-dinner', name: 'Rehearsal dinner',
      date: day(W - 2), startTime: '19:00', venueName: 'Osteria Fennel', address: '88 Marlow Road, Fitzroy VIC',
      dressCode: 'Smart casual' },
  ];
  const postWeddingEvents = [
    { id: 'recovery-brunch', event_id: 'recovery-brunch', name: 'Recovery brunch',
      date: day(W + 1), startTime: '10:30', venueName: 'Saltbush Cafe', address: '21 Garnet Street, Kew VIC',
      dressCode: 'Sunday best, or close to it' },
  ];

  // ── households ──────────────────────────────────────────────────────────
  // 92 solo + 36 couples + 12 families of four = 212 people on 140 invitations.
  const shapes = [
    ...Array(RICH_COUNTS.solo).fill('solo'),
    ...Array(RICH_COUNTS.couples).fill('couple'),
    ...Array(RICH_COUNTS.families).fill('family'),
  ];
  // Fisher-Yates through the stream, so the guest list is not sorted by shape.
  for (let i = shapes.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rnd() * (i + 1));
    [shapes[i], shapes[j]] = [shapes[j], shapes[i]];
  }

  const usedNames = new Set([`${couple1Name} Moreno`, `${couple2Name} Brennan`]);
  const fullName = (first, last) => {
    let name = `${first} ${last}`;
    let n = 0;
    while (usedNames.has(name) && n < 20) { name = `${pick(FIRST)} ${last}`; n += 1; }
    usedNames.add(name);
    return name;
  };
  const emailFor = (name) => `${name.toLowerCase().replace(/[^a-z]+/g, '.').replace(/^\.|\.$/g, '')}@example.com`;
  const categories = ['family', 'friends', 'colleagues', 'partners_family', 'partners_friends'];
  const catWeights = [0.22, 0.32, 0.1, 0.2, 0.16];
  const pickCategory = () => {
    let r = rnd();
    for (let i = 0; i < categories.length; i += 1) { r -= catWeights[i]; if (r <= 0) return categories[i]; }
    return 'friends';
  };
  const ADULT_MEALS = ['beef', 'chicken', 'fish', 'vegetarian', 'vegan'];
  const MEAL_WEIGHTS = [0.3, 0.27, 0.23, 0.14, 0.06];
  const pickMeal = () => {
    let r = rnd();
    for (let i = 0; i < ADULT_MEALS.length; i += 1) { r -= MEAL_WEIGHTS[i]; if (r <= 0) return ADULT_MEALS[i]; }
    return 'chicken';
  };

  const guests = [];
  const households = []; // [{ id|null, members: [guest], reply }]
  let gi = 0, hi = 0, phoneI = 0, childNameI = 0;
  const nextGuestId = () => `rg${String(++gi).padStart(3, '0')}`;

  for (const shape of shapes) {
    const last = pick(LAST);
    const category = pickCategory();
    const householdId = shape === 'solo' ? null : `rh${String(++hi).padStart(3, '0')}`;
    const members = [];
    const adults = shape === 'solo' ? 1 : 2;
    for (let a = 0; a < adults; a += 1) {
      // Some couples keep different surnames.
      const surname = a === 1 && chance(0.35) ? pick(LAST) : last;
      const name = fullName(pick(FIRST), surname);
      const lead = a === 0;
      const g = {
        id: nextGuestId(), name, category, created_by: OWNER,
        created_date: iso(-120 + Math.floor(rnd() * 60)),
      };
      if (lead || chance(0.4)) g.email = emailFor(name);
      if (lead && chance(0.35) && phoneI < FICTION_MOBILES.length) g.phone = `+61${FICTION_MOBILES[phoneI++]}`;
      if (householdId) g.household_id = householdId;
      members.push(g);
    }
    if (shape === 'family') {
      for (let c = 0; c < 2; c += 1) {
        const name = fullName(CHILD_FIRST[childNameI++ % CHILD_FIRST.length], last);
        members.push({
          id: nextGuestId(), name, category, created_by: OWNER,
          created_date: members[0].created_date,
          household_id: householdId, is_child: true, child_age: 2 + Math.floor(rnd() * 12),
        });
      }
    }
    households.push({ id: householdId, members, category });
    guests.push(...members);
  }

  // ── replies, by household ───────────────────────────────────────────────
  // A household answers together, so the mix reads like a real list: about
  // 65% of people replied, most of them yes.
  const party = new Set();
  for (const h of households) {
    const r = rnd();
    h.reply = r < 0.6 ? 'yes' : r < 0.7 ? 'no' : 'pending';
    // One partner of a couple occasionally sends their regrets alone.
    h.splitDecline = h.reply === 'yes' && h.members.length === 2 && chance(0.06);
    h.welcome = h.category !== 'colleagues' && chance(0.55);
    h.brunch = chance(0.45);
    if (h.category === 'family' || h.category === 'partners_family') {
      if (chance(0.3)) h.rehearsal = true;
    }
    if (h.members.length === 1 && h.category === 'friends' && chance(0.18)) { h.rehearsal = true; party.add(h); }
  }

  // Invitations went out ten weeks ago, over a few evenings, and the people
  // still to reply had a reminder last week. Derived from position, not the
  // stream, so adding these fields moved no one's reply.
  households.forEach((h, hIdx) => {
    const sentDay = -70 - (hIdx % 5);
    const lead = h.members[0];
    const channel = lead.email && lead.phone ? 'email+whatsapp' : lead.phone ? 'whatsapp' : 'email';
    for (const g of h.members) {
      g.invitation_sent = true;
      g.invite_sent_at = iso(sentDay);
      g.invite_channel = channel;
      if (h.reply === 'pending') g.reminder_sent_at = iso(-7);
    }
  });

  for (const h of households) {
    const replyDay = -Math.floor(2 + rnd() * 40);
    h.members.forEach((g, idx) => {
      const declinedAlone = h.splitDecline && idx === 1;
      const main = h.reply === 'pending' ? 'pending' : (h.reply === 'no' || declinedAlone ? 'no' : 'yes');
      const custom = (invited) => {
        if (!invited) return 'pending';
        if (main === 'pending') return 'pending';
        if (main === 'no') return 'no';
        return chance(0.85) ? 'yes' : 'no';
      };
      const responded = main !== 'pending';
      const meal = main === 'yes' ? (g.is_child ? 'kids_meal' : pickMeal()) : undefined;
      const rows = [
        { event_id: 'main-ceremony', invited: true, status: main },
        { event_id: 'reception', invited: true, status: main, ...(meal ? { meal_choice: meal } : {}) },
        { event_id: 'welcome-drinks', invited: !!h.welcome, status: custom(!!h.welcome) },
        { event_id: 'rehearsal-dinner', invited: !!h.rehearsal, status: custom(!!h.rehearsal) },
        { event_id: 'recovery-brunch', invited: !!h.brunch, status: custom(!!h.brunch) },
      ];
      if (responded) for (const row of rows) if (row.invited) row.responded_at = iso(replyDay);
      g.event_responses = rows;
      g.rsvp_status = main === 'yes' ? 'attending' : main === 'no' ? 'declined' : 'pending';
      if (responded) g.rsvp_date = iso(replyDay);
      if (meal) g.meal_choice = meal;
      if (main === 'yes' && !g.is_child && chance(0.14)) g.dietary_restrictions = pick(DIETARY);
      if (main === 'yes' && g.is_child && chance(0.15)) g.dietary_restrictions = 'No nuts, please';
    });
  }

  // ── tables ──────────────────────────────────────────────────────────────
  // Eighteen rounds of ten for 180 seats. Households sit together, the people
  // still to reply are seated provisionally the way couples actually do it,
  // and whoever does not fit waits in the unseated pool.
  const tables = [];
  const NAMES = ['Bridal', 'Wattle', 'Banksia', 'Waratah', 'Grevillea', 'Boronia', 'Kangaroo Paw', 'Lilly Pilly',
    'Saltbush', 'Paperbark', 'Bottlebrush', 'Correa', 'Flannel Flower', 'Myrtle', 'Ironbark', 'Blue Gum', 'Tea Tree', 'Riverbank'];
  for (let t = 0; t < RICH_COUNTS.tables; t += 1) {
    const col = t % 6, row = Math.floor(t / 6);
    tables.push({
      id: `rt${String(t + 1).padStart(2, '0')}`,
      name: t === 0 ? 'Bridal table' : `${NAMES[t]}`,
      capacity: t === 0 ? 12 : 10,
      shape: t === 0 ? 'rectangle' : 'round',
      x: 140 + col * 190, y: 180 + row * 210,
      assigned_guests: [],
      event_id: 'reception',
      created_by: OWNER,
    });
  }
  // Seat attending households first, then pending ones, filling table by table.
  const seatable = [
    ...households.filter((h) => h.reply === 'yes'),
    ...households.filter((h) => h.reply === 'pending'),
  ];
  let tIdx = 1; // the bridal table holds the wedding party, seeded below
  const seatHousehold = (h, table) => {
    for (const g of h.members) {
      if (g.rsvp_status === 'declined') continue;
      table.assigned_guests.push({ seat_index: table.assigned_guests.length, guest_id: g.id });
      // THE NAME, NOT THE ID. Guest.table_assignment is what the Guests page
      // shows in its Table column and what assignGuestToTableByName resolves.
      g.table_assignment = table.name;
    }
  };
  const bridal = tables[0];
  // The wedding party first, then the close family who are at the rehearsal.
  const headTable = [...party, ...households.filter((x) => x.rehearsal && !party.has(x))];
  for (const h of headTable.filter((x) => x.reply === 'yes')) {
    if (bridal.assigned_guests.length + h.members.length <= bridal.capacity) seatHousehold(h, bridal);
  }
  for (const h of seatable) {
    if (h.members.some((g) => g.table_assignment)) continue;
    const need = h.members.filter((g) => g.rsvp_status !== 'declined').length;
    if (!need) continue;
    // Look ahead three tables for room, so a family of four is not split.
    let placed = false;
    for (let k = 0; k < 3 && tIdx + k < tables.length; k += 1) {
      const table = tables[tIdx + k];
      if (table.assigned_guests.length + need <= table.capacity) { seatHousehold(h, table); placed = true; break; }
    }
    if (!placed) continue;
    while (tIdx < tables.length && tables[tIdx].assigned_guests.length >= tables[tIdx].capacity - 1) tIdx += 1;
    if (tIdx >= tables.length) break;
  }

  const venueAssets = [
    { id: 'rva1', name: 'Dance floor', type: 'dance-floor', x: 620, y: 560, created_by: OWNER },
    { id: 'rva2', name: 'Bar', type: 'bar', x: 1180, y: 120, created_by: OWNER },
    { id: 'rva3', name: 'Band', type: 'stage', x: 620, y: 80, created_by: OWNER },
  ];

  // ── vendors and budget ─────────────────────────────────────────────────
  const vendors = [
    { id: 'rv01', name: 'Linden Hall Gardens', category: 'venue', status: 'booked', quoted_price: 18500, deposit_paid: true, deposit_amount: 5000, contract_signed: true },
    { id: 'rv02', name: 'Fennel and Thyme Catering', category: 'catering', status: 'booked', quoted_price: 21200, deposit_paid: true, deposit_amount: 6000, contract_signed: true },
    { id: 'rv03', name: 'Halcyon Light Studio', category: 'photography', status: 'booked', quoted_price: 5200, deposit_paid: true, deposit_amount: 1500, contract_signed: true },
    { id: 'rv04', name: 'Driftwood Motion', category: 'videography', status: 'booked', quoted_price: 3900, deposit_paid: true, deposit_amount: 1000 },
    { id: 'rv05', name: 'Wild Stem Florals', category: 'flowers', status: 'booked', quoted_price: 4600, deposit_paid: true, deposit_amount: 1200 },
    { id: 'rv06', name: 'The Low Tide Band', category: 'music', status: 'booked', quoted_price: 4200, deposit_paid: true, deposit_amount: 1000 },
    { id: 'rv07', name: 'Sugar Gum Cakes', category: 'bakery', status: 'booked', quoted_price: 1150 },
    { id: 'rv08', name: 'Ember Hair and Makeup', category: 'beauty', status: 'booked', quoted_price: 1450 },
    { id: 'rv09', name: 'Northside Coaches', category: 'transportation', status: 'quoted', quoted_price: 1800 },
    { id: 'rv10', name: 'Inkwell Paper Co', category: 'decorations', status: 'booked', quoted_price: 1300 },
    { id: 'rv11', name: 'Celebrant Ruth Alder', category: 'planning', status: 'booked', quoted_price: 900 },
    { id: 'rv12', name: 'Lantern Hire Melbourne', category: 'decorations', status: 'contacted' },
  ].map((v) => ({ ...v, created_by: OWNER }));

  // An actual amount only once money has moved. Six weeks out most of the big
  // lines are deposited or quoted, not settled, and a ledger that reads 98%
  // spent would not look like this couple's.
  const B = (category, item_name, budgeted_amount, actual_amount, vendor, paid, paidDaysAgo, notes) => ({
    category, item_name, budgeted_amount,
    ...(paid && actual_amount != null ? { actual_amount } : {}),
    ...(vendor ? { vendor } : {}),
    paid: !!paid,
    ...(paid && paidDaysAgo != null ? { payment_date: day(-paidDaysAgo) } : {}),
    ...(notes ? { notes } : {}),
  });
  const budget = [
    B('venue', 'Venue hire, ceremony and reception', 18000, 18500, 'Linden Hall Gardens', true, 140, 'Balance due two weeks before.'),
    B('venue', 'Wet weather marquee', 1500, 1350, 'Linden Hall Gardens', false),
    B('catering', 'Dinner, 180 guests', 19500, 20400, 'Fennel and Thyme Catering', false, null, 'Deposit paid. Final numbers due in three weeks.'),
    B('catering', 'Drinks package', 6500, 6200, 'Fennel and Thyme Catering', false),
    B('catering', 'Wedding cake', 1200, 1150, 'Sugar Gum Cakes', true, 30),
    B('catering', 'Welcome drinks tab', 1800, null, 'The Corner Larder', false),
    B('photography', 'Photographer, full day', 5000, 5200, 'Halcyon Light Studio', true, 160),
    B('photography', 'Videographer', 3500, 3900, 'Driftwood Motion', false),
    B('flowers', 'Ceremony arbor and aisle', 2200, 2400, 'Wild Stem Florals', false),
    B('flowers', 'Bouquets and buttonholes', 1400, 1350, 'Wild Stem Florals', false),
    B('flowers', 'Table centerpieces', 1600, 850, 'Wild Stem Florals', true, 60, 'Deposit only so far.'),
    B('music', 'Band, reception', 4000, 4200, 'The Low Tide Band', true, 90),
    B('music', 'String duo, ceremony', 900, 900, null, true, 45),
    B('attire', "Isla's dress", 3200, 3450, null, true, 120),
    B('attire', "Kai's suit", 1400, 1290, null, true, 75),
    B('attire', 'Alterations', 400, null, null, false),
    B('rings', 'Wedding bands', 3000, 2780, null, true, 100),
    B('stationery', 'Invitations and printing', 900, 860, 'Inkwell Paper Co', true, 110),
    B('stationery', 'Signage and menus', 450, 440, 'Inkwell Paper Co', false),
    B('beauty', 'Hair and makeup, five people', 1300, 1450, 'Ember Hair and Makeup', false),
    B('transportation', 'Guest coach, city to venue', 1800, 1800, 'Northside Coaches', false),
    B('decorations', 'Festoon lighting', 700, null, 'Lantern Hire Melbourne', false),
    B('decorations', 'Candles and table linen', 600, 540, null, true, 20),
    B('honeymoon', 'Flights to Tasmania', 1800, 1640, null, true, 50),
    B('miscellaneous', 'Celebrant', 900, 900, 'Celebrant Ruth Alder', true, 130),
  ].map((b, i) => ({ id: `rb${String(i + 1).padStart(2, '0')}`, ...b, created_by: OWNER }));

  // ── run sheet ───────────────────────────────────────────────────────────
  const S = (start_time, end_time, event_name, category, location, responsible_person, description) => ({
    event_name, category, start_time, end_time, event_date: day(W), location,
    ...(responsible_person ? { responsible_person } : {}),
    ...(description ? { description } : {}),
  });
  const runSheet = [
    S('08:30', '11:00', 'Hair and makeup', 'preparation', 'Kew apartment', 'Ember Hair and Makeup'),
    S('10:00', '11:30', 'Florist setup', 'preparation', 'Linden Hall Gardens', 'Wild Stem Florals'),
    S('11:30', '12:30', 'Getting ready photos', 'photography', 'Kew apartment', 'Halcyon Light Studio'),
    S('13:00', '14:00', 'Lunch for the wedding party', 'preparation', 'Kew apartment'),
    S('14:15', '14:45', 'Coach leaves the city', 'transportation', 'Flinders Lane pickup', 'Northside Coaches', 'Guests on the coach list only.'),
    S('15:00', '15:30', 'Guests arrive, string duo plays', 'ceremony', 'Linden Hall Gardens'),
    S('15:30', '16:15', 'Ceremony', 'ceremony', 'Linden Hall Gardens', 'Celebrant Ruth Alder'),
    S('16:15', '17:30', 'Canapes on the lawn', 'reception', 'Linden Hall Gardens'),
    S('16:30', '17:15', 'Family and couple portraits', 'photography', 'The orchard', 'Halcyon Light Studio'),
    S('17:30', '18:00', 'Guests seated, entrance', 'reception', 'The Wattle Room'),
    S('18:00', '19:30', 'Dinner and speeches', 'reception', 'The Wattle Room', 'MC: Oscar'),
    S('19:45', '20:00', 'Cake cutting', 'reception', 'The Wattle Room'),
    S('20:00', '20:10', 'First dance', 'reception', 'The Wattle Room', 'The Low Tide Band'),
    S('23:15', '23:30', 'Sparkler exit, coach back to the city', 'transportation', 'Front drive', 'Northside Coaches'),
  ].map((s, i) => ({ id: `rs${String(i + 1).padStart(2, '0')}`, ...s, created_by: OWNER }));

  // ── tasks ───────────────────────────────────────────────────────────────
  const T = (title, category, priority, completed, dueOffset, wedding_timeline) => ({
    title, category, priority, completed, due_date: day(dueOffset), wedding_timeline,
  });
  const tasks = [
    T('Book the venue', 'venue', 'high', true, -300, '12_months'),
    T('Set the budget', 'general', 'high', true, -310, '12_months'),
    T('Book the photographer', 'photography', 'high', true, -280, '12_months'),
    T('Book the caterer', 'catering', 'high', true, -260, '9_months'),
    T('Choose a celebrant', 'legal', 'medium', true, -250, '9_months'),
    T('Send save the dates', 'guests', 'medium', true, -230, '9_months'),
    T('Book the band', 'music', 'medium', true, -200, '9_months'),
    T('Order the dress', 'attire', 'high', true, -180, '6_months'),
    T('Book hair and makeup', 'attire', 'medium', true, -150, '6_months'),
    T('Book the florist', 'flowers', 'medium', true, -150, '6_months'),
    T('Publish the wedding website', 'guests', 'medium', true, -120, '6_months'),
    T('Send invitations', 'guests', 'high', true, -100, '3_months'),
    T('Lodge the notice of intended marriage', 'legal', 'urgent', true, -90, '3_months'),
    T('Order the cake', 'catering', 'low', true, -60, '3_months'),
    T('Buy wedding bands', 'attire', 'medium', true, -55, '3_months'),
    T('Book the guest coach', 'transportation', 'medium', true, -40, '3_months'),
    T('Menu tasting', 'catering', 'medium', true, -21, '1_month'),
    T('Chase RSVPs', 'guests', 'high', false, 4, '1_month'),
    T('Final dress fitting', 'attire', 'high', false, 14, '1_month'),
    T('Finalize the seating plan', 'guests', 'high', false, 21, '1_month'),
    T('Confirm final numbers with the caterer', 'catering', 'urgent', false, 21, '1_month'),
    T('Write vows', 'general', 'high', false, 28, '2_weeks'),
    T('Send the run sheet to vendors', 'general', 'medium', false, 30, '2_weeks'),
    T('Print signage and menus', 'decorations', 'low', false, 32, '2_weeks'),
    T('Pay the venue balance', 'venue', 'high', false, 28, '2_weeks'),
    T('Pick up the suit', 'attire', 'medium', false, 35, '1_week'),
    T('Pack for Tasmania', 'general', 'low', false, 39, '1_week'),
    T('Break in the shoes', 'attire', 'low', false, 37, '1_week'),
    T('Hand the rings to the best man', 'general', 'medium', false, W, 'day_of'),
    T('Thank you cards', 'guests', 'low', false, W + 30, 'day_of'),
  ].map((t, i) => ({ id: `rk${String(i + 1).padStart(2, '0')}`, ...t, created_by: OWNER }));

  const notes = [
    { title: 'Ask the band about a ceilidh set', status: 'Ideas', priority: 'low' },
    { title: 'Candles on every second table', status: 'Ideas', priority: 'low' },
    { title: 'Coach pickup list', status: 'In progress', priority: 'high' },
    { title: 'Speech order: Oscar, then both dads', status: 'In progress', priority: 'medium' },
    { title: 'Wet weather plan agreed with the venue', status: 'Done', priority: 'medium' },
    { title: 'Kids table activity packs', status: 'Done', priority: 'low' },
  ].map((n, i) => ({
    id: `rn${i + 1}`, ...n, completed: n.status === 'Done', view_type: 'todo', category: 'general', created_by: OWNER,
  }));

  // ── moodboard, from stock already in the Cloudinary account ─────────────
  const moodboard = [
    ['Golden hour on the lawn', 'DTS_NU_NUPTIALS_Shauna_Summers_Photos_ID10310_o5dcie.jpg', 'photography', 'Light'],
    ['Loose and laughing', 'DTS_LEAP_Shauna_Summers_Photos_ID7601_k27hx3.jpg', 'photography', 'Light'],
    ['The dance floor at midnight', 'DTS_Pride_Agust%C3%ADn_Far%C3%ADas_Photos_ID5510_dn4jws.jpg', 'lighting', 'Party'],
    ['Soft and natural', 'DTS_Natural_Beauty_Rob_Christain_Crosby_Photos_ID2680_fnyjzd.jpg', 'makeup', 'Getting ready'],
    ['Film look', 'DTS_Like_a_Movie_Foster___Asher_Photos_ID1041_mudxwa.jpg', 'photography', 'Light'],
    ['After the ceremony', 'DTS_Early_Honey_Moon_Tino_Renato_Photos_ID3576_v8vxs0.jpg', 'other', 'Moments'],
    ['Quiet portraits', 'DTS_MOTHERLY_Shauna_Summers_Photos_ID10728_vz25fa.jpg', 'photography', 'Moments'],
    ['Playful', 'DTS_PLAYER_TWO_JELLY_LUISE_Photos_ID13458_a53qq3.jpg', 'other', 'Party'],
    ['The walk out', 'DTS_Weirdly_Ever_After_Agust%C3%ADn_Far%C3%ADas_Photos_ID8960_nspx4l.jpg', 'venue', 'Moments'],
    ['Studio light', 'DTS_Remote_Studio_Tino_Renato_Photos_ID3722_copy_qbcgts.jpg', 'lighting', 'Light'],
  ].map(([title, id, category, board_name], i) => ({
    id: `rm${String(i + 1).padStart(2, '0')}`, title, image_url: STOCK(id), category, board_name,
    position_x: (i % 4) * 260, position_y: Math.floor(i / 4) * 300, created_by: OWNER,
  }));

  // ── guest notes and song requests ──────────────────────────────────────
  const attending = guests.filter((g) => g.rsvp_status === 'attending' && g.email && !g.is_child);
  const [n1, n2, n3, s1, s2] = [attending[3], attending[17], attending[40], attending[8], attending[29]];
  const guestNotes = [
    { id: 'rgm1', guest_id: n1.id, guest_name: n1.name, guest_email: n1.email,
      message: 'So happy for you both. Is there anywhere to leave a pram during the ceremony?',
      read: false, replied: false, created_date: iso(-1), created_by: OWNER },
    { id: 'rgm2', guest_id: n2.id, guest_name: n2.name, guest_email: n2.email,
      message: 'We land the morning of the welcome drinks, so we might be a little late. Save us a spot.',
      read: true, replied: true, reply: 'Of course. See you there.', reply_sent_at: iso(-3), created_date: iso(-4), created_by: OWNER },
    { id: 'rgm3', guest_id: n3.id, guest_name: n3.name, guest_email: n3.email,
      message: 'Counting down. Thank you for thinking of the gluten free option.',
      read: true, replied: false, created_date: iso(-6), created_by: OWNER },
  ];
  const songRequests = [
    { id: 'rsr1', title: 'September', artist: 'Earth, Wind & Fire', status: 'pending', submittedBy: s1.name, guestNote: 'For the dads.' },
    { id: 'rsr2', title: 'Dreams', artist: 'Fleetwood Mac', status: 'approved', submittedBy: s2.name },
  ];

  // ── the wedding record ──────────────────────────────────────────────────
  const enabledPages = ['home', 'our-story', 'celebration', 'rsvp', 'registry', 'music', 'photos', 'faq', 'stay', 'transport'];
  const qna = [
    { question: 'Is there parking?', answer: 'Yes, behind the hall. It fills by 3pm, so the coach is the easy option.' },
    { question: 'Are children welcome?', answer: 'Yes. There is a kids table with dinner and activity packs.' },
    { question: 'What if it rains?', answer: 'The ceremony moves into the marquee next to the Wattle Room.' },
    { question: 'Is there a coach?', answer: 'One leaves Flinders Lane at 2:15pm and returns at 11:30pm.' },
  ];
  const homeContent = {
    blocks: [
      { id: 'rb1', type: 'heading', order: 0, content: { text: 'A long weekend in Kew' } },
      { id: 'rb2', type: 'paragraph', order: 1, content: { text: 'Drinks on Friday, the wedding on Saturday, brunch on Sunday. Everything you need is on these pages.' } },
    ],
  };
  const weddingDetails = {
    id: 'w-rich', couple1Name, couple2Name, coupleNames,
    weddingDate: iso(W), slug, guestCount: String(guests.length), created_by: OWNER,
    guidanceState: { tourSeenAt: iso(-90), dismissed: [] },
    mainCeremony, reception, preWeddingEvents, postWeddingEvents,
    activeUniverse: 'florence', websiteEnabled: true, enabledPages,
    qna, homeContent, rsvpContent: { rsvpDeadline: iso(W - 21) },
    budget: {
      total: 85000,
      categories: {
        venue: 20000, catering: 29500, photography: 8500, flowers: 5200, music: 4900, attire: 5000,
        transportation: 1800, decorations: 1300, rings: 3000, stationery: 1400, beauty: 1300, honeymoon: 2000, miscellaneous: 1100,
      },
    },
  };

  const seed = {
    WeddingDetails: [weddingDetails],
    Guest: guests,
    Table: tables,
    VenueAsset: venueAssets,
    Note: notes,
    Task: tasks,
    Schedule: runSheet,
    Vendor: vendors,
    Budget: budget,
    MoodboardItem: moodboard,
    VowSpeech: [],
    Music: [],
    RegistryItem: [],
    RegistryProduct: [],
    CustomGift: [{ id: 'rcg1', title: 'Tasmania honeymoon fund', requested_amount: 3000, description: 'A week on the east coast.', created_by: OWNER }],
    GuestMessage: guestNotes,
    SongRequest: songRequests,
    Invitation: [{ id: 'rinv1', couple_names: coupleNames, wedding_date: iso(W), rsvp_deadline: iso(W - 21), created_by: OWNER, created_by_id: 'u1' }],
    Notification: [],
  };

  // What /api/wedding-by-slug serves for this couple. The harness passes it
  // through pickGuestSafeFields, exactly as it does PUBLISHED_WEDDING.
  const published = {
    ...weddingDetails,
    passwordProtected: false, locked: false,
    publicEventIds: ['main-ceremony', 'reception'],
    customGifts: [{ id: 'rpg1', title: 'Tasmania honeymoon fund', description: 'A week on the east coast.', image_url: '', url: 'https://example.com' }],
    registryProducts: [],
    created_by_id: 'u1',
  };
  delete published.budget;
  delete published.guidanceState;

  return { seed, published, slug, events: EVENTS };
}

export const RICH = buildRichWedding();
export const RICH_SEED = RICH.seed;
export const RICH_PUBLISHED = RICH.published;
