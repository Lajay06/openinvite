/**
 * scripts/seed-demo-data.mjs
 *
 * Populates every currently-empty planner area on the real (NOT is_test)
 * John & Suzanne wedding (WeddingDetails id 6a1f90fa5b4e0702b5a051aa, owner
 * jaygalaxy23) with a believable, internally-consistent, mid-planning
 * snapshot: RSVP statuses, meal choices, dietary restrictions, invitation
 * flags, plus-one details, table assignments, a to-do list, moodboard
 * entries, a budget, and a day-of schedule. This is deliberate PRODUCTION
 * data (not is_test) — La wants the dashboard to look lived-in for demos
 * and future marketing captures.
 *
 * Design choices worth knowing before rerunning or adjusting this:
 *
 * - Guest.rsvp_status/rsvp_date/meal_choice/dietary_restrictions/plus_one_*
 *   are written DIRECTLY on the Guest record, not via RsvpResponse rows.
 *   This is intentional, not a shortcut: RsvpResponse.created_date is
 *   server-stamped and can't be backdated, but the brief asks for
 *   "rsvp_date spread over recent weeks" — only possible via Guest's own
 *   ordinary rsvp_date field. src/lib/resolveMyWedding.js's
 *   getMyGuestsWithRsvp() only overlays RsvpResponse data for a guest when
 *   RsvpResponse rows actually exist for them; absent that, it passes the
 *   Guest record's own fields through unchanged — exactly this script's
 *   path, and the same "pre-migration" fallback the app already supports.
 *
 * - One guest (id 6a1fbb3b9f52ddeeeb86ffb8) already has 2 real (non-test)
 *   pending RsvpResponse rows from earlier manual testing this session.
 *   Since RsvpResponse rows take precedence over Guest.rsvp_status when
 *   present, this script deliberately leaves that guest's status alone
 *   (stays pending) rather than writing a conflicting value nothing would
 *   ever display.
 *
 * - All 201 guests currently share category:'family' (synthetic seed data
 *   from an earlier onboarding demo) — there's no real category signal to
 *   weight plus-one assignment by, so plus-ones are assigned by flat random
 *   sample instead.
 *
 * - Idempotency: this script checks for existing Table/Note/Budget/
 *   Schedule/MoodboardItem/Vendor/VendorBooking records for this owner
 *   before writing, and aborts with a clear message if any already exist
 *   — rerunning after a first successful run will not silently duplicate
 *   data. Guest-field writes (RSVP/meal/etc) are plain overwrites and are
 *   safe to rerun any time (each run recomputes fresh random values).
 *
 * Usage: node scripts/seed-demo-data.mjs
 * Requires BASE44_TEST_EMAIL/BASE44_TEST_PASSWORD in .env.local (this is
 * the wedding owner's own real account — jaygalaxy23@gmail.com, confirmed
 * by id match against WeddingDetails.created_by_id).
 *
 * Uses a REAL logged-in session for this user, not the admin key.
 * BASE44_PLATFORM_NOTES.md documents why: the admin key is evaluated
 * against each entity's own RLS like any other caller and has no session
 * identity matching any real user's {{user.id}} — Guest/Table/Note/Budget/
 * Schedule/MoodboardItem/Vendor/VendorBooking all have owner-scoped update
 * RLS, so an admin-key PUT against an existing record 403s outright
 * (confirmed directly: the first version of this script tried exactly
 * that and got "Permission denied for update operation on Guest entity").
 * Logging in as the actual owner sidesteps this entirely and matches
 * exactly how the real app itself writes this data client-side.
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tallyGuestRsvp } from '../src/lib/guestRsvpTally.js';

const __dir = dirname(fileURLToPath(import.meta.url));
try {
  const raw = readFileSync(resolve(__dir, '..', '.env.local'), 'utf8');
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
  // rely on shell env vars
}

const BASE44_API = 'https://base44.app/api';
const APP_ID = process.env.VITE_BASE44_APP_ID || '68731d183f075e406eda2236';
const EMAIL = process.env.BASE44_TEST_EMAIL;
const PASSWORD = process.env.BASE44_TEST_PASSWORD;
if (!EMAIL || !PASSWORD) {
  console.error('✗ BASE44_TEST_EMAIL and BASE44_TEST_PASSWORD must be set in .env.local');
  process.exit(1);
}
let TOKEN = null;

const WEDDING_ID = '6a1f90fa5b4e0702b5a051aa';
const OWNER_ID = '6a1c32fa7d681c950e26d2cd';
// This guest already has real (non-test) pending RsvpResponse rows from
// earlier manual testing — RsvpResponse takes precedence over Guest.rsvp_status
// when present, so writing a different status here would just be ignored
// everywhere it's actually displayed. Left untouched, stays pending.
const SKIP_STATUS_GUEST_ID = '6a1fbb3b9f52ddeeeb86ffb8';

// ── Seeded PRNG (mulberry32) — reproducible, no external dependency ────────
function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20261231);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const chance = (p) => rand() < p;
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function daysAgo(n) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}
function daysFromNow(n) {
  return new Date(Date.now() + n * 24 * 60 * 60 * 1000);
}
function randomBetween(daysAgoMax, daysAgoMin) {
  // both args are "days ago" — daysAgoMax is further back (bigger number)
  const span = daysAgoMax - daysAgoMin;
  return daysAgo(daysAgoMin + rand() * span);
}

// ── Admin REST helpers ──────────────────────────────────────────────────────
function unwrapList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}
async function login() {
  const res = await fetch(`${BASE44_API}/apps/${APP_ID}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(`Login failed: ${JSON.stringify(data)}`);
  return data.access_token;
}
async function adminFetch(path) {
  const res = await fetch(`${BASE44_API}${path}`, { headers: { Authorization: `Bearer ${TOKEN}` } });
  if (!res.ok) throw new Error(`GET ${path} failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
  return unwrapList(await res.json());
}
async function adminCreate(entity, body) {
  const res = await fetch(`${BASE44_API}/apps/${APP_ID}/entities/${entity}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${entity} failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
  return res.json();
}
async function adminUpdate(entity, id, body) {
  const res = await fetch(`${BASE44_API}/apps/${APP_ID}/entities/${entity}/${id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PUT ${entity}/${id} failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
  return res.json();
}
const ownerQuery = () => encodeURIComponent(JSON.stringify({ created_by_id: OWNER_ID }));

async function main() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  Demo data seed — John & Suzanne wedding (production data)');
  console.log('═══════════════════════════════════════════════════════\n');

  TOKEN = await login();
  console.log('✓ Logged in as the wedding owner (jaygalaxy23@gmail.com)\n');

  // ── Safety check: abort if any target entity already has data for this
  // owner, so rerunning after a successful run never silently duplicates. ──
  const guardEntities = ['Table', 'Note', 'Budget', 'Schedule', 'MoodboardItem', 'Vendor', 'VendorBooking'];
  for (const entity of guardEntities) {
    const existing = await adminFetch(`/apps/${APP_ID}/entities/${entity}?q=${ownerQuery()}&limit=1`);
    if (existing.length > 0) {
      console.error(`✗ ${entity} already has records for this owner — aborting to avoid duplicating data.`);
      console.error(`  If you intend to reseed, delete the existing ${entity} records first.`);
      process.exit(1);
    }
  }

  const guests = (await adminFetch(`/apps/${APP_ID}/entities/Guest?q=${ownerQuery()}&limit=500`)).filter(g => !g.is_test);
  console.log(`Loaded ${guests.length} real guests.\n`);
  if (guests.length === 0) {
    console.error('✗ No real guests found — nothing to seed against.');
    process.exit(1);
  }

  const report = {};

  // ═══ 1. RSVP status ═══════════════════════════════════════════════════
  const eligible = guests.filter(g => g.id !== SKIP_STATUS_GUEST_ID);
  const shuffled = shuffle(eligible);
  const attendingCount = Math.round(guests.length * 0.60);
  const declinedCount = Math.round(guests.length * 0.10);
  const attendingIds = new Set(shuffled.slice(0, attendingCount).map(g => g.id));
  const declinedIds = new Set(shuffled.slice(attendingCount, attendingCount + declinedCount).map(g => g.id));
  // Everyone else (including the skip-guest) is pending.

  const MEAL_CHOICES = ['beef', 'chicken', 'fish', 'vegetarian', 'vegan', 'kids_meal'];
  const MEAL_WEIGHTS = [0.30, 0.28, 0.16, 0.16, 0.06, 0.04]; // rough realistic skew
  function weightedMeal() {
    const r = rand();
    let acc = 0;
    for (let i = 0; i < MEAL_CHOICES.length; i++) {
      acc += MEAL_WEIGHTS[i];
      if (r <= acc) return MEAL_CHOICES[i];
    }
    return MEAL_CHOICES[0];
  }
  const DIETARY_OPTIONS = ['Vegetarian', 'Vegan', 'Gluten-free', 'Nut allergy', 'Shellfish allergy', 'Dairy-free', 'Halal', 'Kosher', 'Lactose intolerant', 'Coeliac'];
  const PLUS_ONE_FIRST = ['Alex', 'Jordan', 'Sam', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Jamie', 'Drew', 'Avery', 'Reese', 'Quinn', 'Harper', 'Rowan', 'Skyler'];
  const PLUS_ONE_LAST = ['Bennett', 'Carter', 'Foster', 'Gray', 'Hayes', 'Reid', 'Sloane', 'Wells', 'Ashford', 'Blake', 'Ellison', 'Marsh', 'Pierce', 'Whitfield'];

  const plusOneEligible = new Set(shuffle(guests).slice(0, Math.round(guests.length * 0.20)).map(g => g.id));

  let counts = { attending: 0, declined: 0, pending: 0, mealSet: 0, mealMissing: 0, dietarySet: 0, plusOne: 0, plusOneWithEmail: 0 };
  // Guests.jsx's tallyGuestRsvp({ includePlusOnes: true }) — the one call
  // site the app actually uses for plus-one counts — only counts a
  // plus-one when plus_one_email is set, and reads its status from
  // getMyGuestsWithRsvp's DERIVED plus_one_rsvp_status (via real
  // is_plus_one:true RsvpResponse rows + the primary's own event_responses),
  // never from the raw Guest.plus_one_rsvp field directly. Writing only
  // plus_one_rsvp would look right in a raw record dump but show as
  // perpetually "pending" on the actual dashboard — tracked here so a
  // second pass below can create the real rows that make it genuinely
  // consistent, not just cosmetically consistent.
  const plusOneRsvpRowsNeeded = [];

  for (const g of guests) {
    const isAttending = attendingIds.has(g.id);
    const isDeclined = declinedIds.has(g.id);
    const status = g.id === SKIP_STATUS_GUEST_ID ? 'pending' : (isAttending ? 'attending' : isDeclined ? 'declined' : 'pending');
    counts[status]++;

    const update = {};

    // Invitations: everyone was invited (that's why pending guests are
    // "awaiting response", not "not yet invited") — sent 8-10 weeks ago.
    update.invitation_sent = true;
    const inviteSentAt = randomBetween(70, 56);
    update.invite_sent_at = inviteSentAt.toISOString();
    update.invite_channel = pick(['email', 'email', 'email', 'whatsapp', 'email+whatsapp']);

    if (status !== 'pending') {
      update.rsvp_status = status;
      // Always after invite_sent_at (invite window ends 56 days ago, RSVP
      // window starts 45 days ago — no overlap risk).
      update.rsvp_date = randomBetween(45, 2).toISOString();
    }

    if (status === 'attending') {
      if (chance(0.90)) {
        update.meal_choice = weightedMeal();
        counts.mealSet++;
      } else {
        counts.mealMissing++;
      }
      if (chance(0.15)) {
        update.dietary_restrictions = pick(DIETARY_OPTIONS);
        counts.dietarySet++;
      }
    }

    if (plusOneEligible.has(g.id)) {
      update.plus_one = true;
      const poName = `${pick(PLUS_ONE_FIRST)} ${pick(PLUS_ONE_LAST)}`;
      update.plus_one_name = poName;
      counts.plusOne++;
      const hasEmail = chance(0.60);
      if (hasEmail) {
        update.plus_one_email = `${poName.toLowerCase().replace(/\s+/g, '.')}@example.com`;
        counts.plusOneWithEmail++;
      }
      // Correlate plus-one RSVP with the primary's own status.
      let poStatus = 'pending';
      if (status === 'attending') poStatus = chance(0.85) ? 'attending' : 'pending';
      else if (status === 'declined') poStatus = 'declined';
      update.plus_one_rsvp = poStatus;
      let poMeal = null;
      if (poStatus === 'attending' && chance(0.85)) {
        poMeal = weightedMeal();
        update.plus_one_meal_choice = poMeal;
      }
      if (poStatus === 'attending' && chance(0.08)) {
        update.plus_one_dietary_restrictions = pick(DIETARY_OPTIONS);
      }

      if (hasEmail) {
        // main-ceremony/reception are the two fixed built-in event ids
        // every guest is invited to (confirmed against real RsvpResponse
        // rows already in this wedding's data) — the two smaller optional
        // pre/post events aren't part of this consistency pass.
        update.event_responses = [
          { event_id: 'main-ceremony', invited: true, status: status === 'attending' ? 'yes' : status === 'declined' ? 'no' : 'pending', meal_choice: update.meal_choice || null, plus_ones: poStatus !== 'declined' ? 1 : 0, plus_one_names: poStatus !== 'declined' ? [poName] : [], responded_at: update.rsvp_date || null },
          { event_id: 'reception', invited: true, status: status === 'attending' ? 'yes' : status === 'declined' ? 'no' : 'pending', meal_choice: update.meal_choice || null, plus_ones: poStatus !== 'declined' ? 1 : 0, plus_one_names: poStatus !== 'declined' ? [poName] : [], responded_at: update.rsvp_date || null },
        ];
        plusOneRsvpRowsNeeded.push({ guestId: g.id, status: poStatus === 'attending' ? 'yes' : poStatus === 'declined' ? 'no' : 'pending', mealChoice: poMeal });
      }
    }

    await adminUpdate('Guest', g.id, update);
  }

  // Real is_plus_one:true RsvpResponse rows — the only thing
  // getMyGuestsWithRsvp's plus_one_rsvp_status derivation actually reads,
  // so this is what makes Guests.jsx's includePlusOnes tally genuinely
  // correct rather than just correct in a raw record dump.
  for (const row of plusOneRsvpRowsNeeded) {
    for (const eventId of ['main-ceremony', 'reception']) {
      await adminCreate('RsvpResponse', {
        wedding_id: WEDDING_ID,
        guest_id: row.guestId,
        event_id: eventId,
        status: row.status,
        meal_choice: row.mealChoice || null,
        is_plus_one: true,
      });
    }
  }
  console.log(`✓ Plus-one RSVP consistency: ${plusOneRsvpRowsNeeded.length} plus-ones with real is_plus_one RsvpResponse rows (so Guests.jsx's includePlusOnes tally matches, not just the raw record)`);

  console.log(`✓ RSVP statuses: ${counts.attending} attending, ${counts.declined} declined, ${counts.pending} pending`);
  console.log(`✓ Meal choices set: ${counts.mealSet} (${counts.mealMissing} attending guests deliberately left without one)`);
  console.log(`✓ Dietary restrictions set: ${counts.dietarySet}`);
  console.log(`✓ Invitations sent: ${guests.length} (all guests)`);
  console.log(`✓ Plus-ones: ${counts.plusOne} (${counts.plusOneWithEmail} with an email on file)\n`);
  report.rsvp = counts;

  // Re-fetch fresh guest state for table assignment + verification below.
  const freshGuests = (await adminFetch(`/apps/${APP_ID}/entities/Guest?q=${ownerQuery()}&limit=500`)).filter(g => !g.is_test);

  // ═══ 2. Table assignments (tables of 10) ═════════════════════════════
  const attendingGuests = freshGuests.filter(g => g.rsvp_status === 'attending');
  const toSeat = shuffle(attendingGuests).slice(0, Math.round(attendingGuests.length * 0.85));
  const TABLE_CAPACITY = 10;
  const tableCount = Math.ceil(toSeat.length / TABLE_CAPACITY) + 1; // one spare table
  const tables = [];
  const cols = 4;
  for (let i = 0; i < tableCount; i++) {
    const table = await adminCreate('Table', {
      created_by_id: OWNER_ID,
      name: `Table ${i + 1}`,
      capacity: TABLE_CAPACITY,
      shape: 'round',
      x: 150 + (i % cols) * 220,
      y: 150 + Math.floor(i / cols) * 220,
      rotation: 0,
      assigned_guests: [],
    });
    tables.push(table);
  }
  let seatedCount = 0;
  for (let i = 0; i < toSeat.length; i++) {
    const table = tables[Math.floor(i / TABLE_CAPACITY)];
    const seatIndex = i % TABLE_CAPACITY;
    table.assigned_guests.push({ seat_index: seatIndex, guest_id: toSeat[i].id });
    await adminUpdate('Guest', toSeat[i].id, { table_assignment: table.name });
    seatedCount++;
  }
  for (const table of tables) {
    if (table.assigned_guests.length > 0) {
      await adminUpdate('Table', table.id, { assigned_guests: table.assigned_guests });
    }
  }
  console.log(`✓ Seating: ${tables.length} tables created, ${seatedCount}/${attendingGuests.length} attending guests seated (${attendingGuests.length - seatedCount} left for the couple to finish)\n`);
  report.seating = { tables: tables.length, seated: seatedCount, attending: attendingGuests.length };

  // ═══ 3. To-do list (Note, view_type: 'todo') ═════════════════════════
  const TODO_ITEMS = [
    { title: 'Book ceremony venue', category: 'venue', priority: 'high', status: 'Done', daysAgo: 140 },
    { title: 'Book reception venue', category: 'venue', priority: 'high', status: 'Done', daysAgo: 138 },
    { title: 'Hire photographer', category: 'photography', priority: 'high', status: 'Done', daysAgo: 110 },
    { title: 'Send save-the-dates', category: 'general', priority: 'medium', status: 'Done', daysAgo: 95 },
    { title: 'Choose wedding party', category: 'general', priority: 'medium', status: 'Done', daysAgo: 80 },
    { title: 'Book celebrant', category: 'legal', priority: 'high', status: 'Done', daysAgo: 70 },
    { title: 'Finalize catering menu', category: 'catering', priority: 'high', status: 'In progress', daysOut: 21 },
    { title: 'Order wedding invitations', category: 'general', priority: 'urgent', status: 'In progress', daysOut: 14 },
    { title: 'Book florist', category: 'flowers', priority: 'medium', status: 'In progress', daysOut: 28 },
    { title: 'Apply for marriage license', category: 'legal', priority: 'high', status: 'Ideas', daysOut: 56 },
    { title: 'Book hair and makeup trial', category: 'attire', priority: 'medium', status: 'Ideas', daysOut: 42 },
    { title: 'Arrange wedding day transportation', category: 'transportation', priority: 'low', status: 'Ideas', daysOut: 70 },
    { title: 'Finalize seating chart', category: 'guests', priority: 'medium', status: 'Ideas', daysOut: 84 },
    { title: 'Confirm final guest count with caterer', category: 'guests', priority: 'high', status: 'Ideas', daysOut: 35 },
    { title: 'Order wedding bands', category: 'general', priority: 'medium', status: 'Ideas', daysOut: 49 },
    { title: 'Plan honeymoon itinerary', category: 'general', priority: 'low', status: 'Ideas', daysOut: 98 },
  ];
  for (const item of TODO_ITEMS) {
    await adminCreate('Note', {
      created_by_id: OWNER_ID,
      view_type: 'todo',
      title: item.title,
      category: item.category,
      priority: item.priority,
      status: item.status,
      completed: item.status === 'Done',
      due_date: item.status === 'Done'
        ? daysAgo(item.daysAgo).toISOString().slice(0, 10)
        : daysFromNow(item.daysOut).toISOString().slice(0, 10),
    });
  }
  const doneCount = TODO_ITEMS.filter(i => i.status === 'Done').length;
  console.log(`✓ To-do list: ${TODO_ITEMS.length} tasks (${doneCount} done, ${TODO_ITEMS.filter(i => i.status === 'In progress').length} in progress, ${TODO_ITEMS.filter(i => i.status === 'Ideas').length} upcoming)\n`);
  report.todo = TODO_ITEMS.length;

  // ═══ 4. Moodboard ═════════════════════════════════════════════════════
  // Real, already-hosted Cloudinary photos (cloud dsr84xknv) reused from the
  // app's existing marketing pool — a private moodboard reusing photography
  // already live elsewhere isn't a marketing no-repeat violation (that rule
  // is specifically about not repeating a photo across public marketing
  // pages; this is app-internal inspiration-board content).
  const MOODBOARD_ITEMS = [
    { title: 'Grand ballroom styling', category: 'venue', img: 'DTS_Grand_Design_Daniel_Farò_Photos_ID4152_auimyj' },
    { title: 'Tablescape inspiration', category: 'decor', img: 'DTS_Ceramic_Daniel_Farò_Photos_ID3766_gipmok' },
    { title: 'Reception menu styling', category: 'photography', img: 'DTS_Fine_Dining_Patrick_Chin_Photos_ID955_uoaegj' },
    { title: 'First look moment', category: 'photography', img: 'DTS_Tradition_Chris_Abatzis_Photos_ID9180_eg2nbh' },
    { title: 'Late-night dance floor energy', category: 'other', img: 'DTS_LEAP_Shauna_Summers_Photos_ID7601_k27hx3' },
    { title: 'Quiet morning-of moment', category: 'other', img: 'DTS_la_calma_Parole_Dure_Photos_ID5853_haflhv' },
    { title: 'Golden hour portraits', category: 'photography', img: 'DTS_SILVER_HOUR_Franco_Dupuy_Photos_ID14690_mjiupn' },
    { title: 'Planning mood board notes', category: 'other', img: 'DTS_Weekend_Brainstorm_Kristine_Isabedra_Photos_ID2889_etg9ko' },
  ];
  for (const item of MOODBOARD_ITEMS) {
    await adminCreate('MoodboardItem', {
      created_by_id: OWNER_ID,
      title: item.title,
      category: item.category,
      board_name: 'Main Board',
      image_url: `https://res.cloudinary.com/dsr84xknv/image/upload/f_auto,q_auto/${item.img}.jpg`,
    });
  }
  console.log(`✓ Moodboard: ${MOODBOARD_ITEMS.length} inspiration items\n`);
  report.moodboard = MOODBOARD_ITEMS.length;

  // ═══ 5. Budget (realistic AUD, grand Sydney wedding — Crown Sydney /
  // Capella Sydney venues) ═══════════════════════════════════════════════
  const BUDGET_ITEMS = [
    { category: 'venue', item_name: 'Ceremony + reception venue hire', budgeted_amount: 45000, actual_amount: 45000, vendor: 'Crown Sydney', paid: true, daysAgo: 130 },
    { category: 'catering', item_name: 'Reception catering (201 guests)', budgeted_amount: 38000, actual_amount: 39200, vendor: 'Capella Sydney Catering', paid: false },
    { category: 'photography', item_name: 'Full-day photography package', budgeted_amount: 8500, actual_amount: 8500, vendor: 'Chris Abatzis Studio', paid: true, daysAgo: 100 },
    { category: 'flowers', item_name: 'Ceremony + reception florals', budgeted_amount: 6000, actual_amount: null, vendor: null, paid: false },
    { category: 'music', item_name: 'Live band + NYE countdown DJ set', budgeted_amount: 4500, actual_amount: 4500, vendor: null, paid: false },
    { category: 'attire', item_name: 'Wedding attire (both partners)', budgeted_amount: 7000, actual_amount: 6400, vendor: null, paid: true, daysAgo: 40 },
    { category: 'transportation', item_name: 'Wedding day transport', budgeted_amount: 2500, actual_amount: null, vendor: null, paid: false },
    { category: 'decorations', item_name: 'Reception styling + decor hire', budgeted_amount: 9000, actual_amount: null, vendor: null, paid: false },
    { category: 'rings', item_name: 'Wedding bands', budgeted_amount: 12000, actual_amount: null, vendor: null, paid: false },
    { category: 'stationery', item_name: 'Invitations + on-the-day stationery', budgeted_amount: 2000, actual_amount: 1850, vendor: null, paid: true, daysAgo: 60 },
    { category: 'beauty', item_name: 'Hair and makeup, bridal party', budgeted_amount: 1500, actual_amount: null, vendor: null, paid: false },
    { category: 'honeymoon', item_name: 'Honeymoon travel and accommodation', budgeted_amount: 15000, actual_amount: null, vendor: null, paid: false },
    { category: 'miscellaneous', item_name: 'Contingency and incidentals', budgeted_amount: 3000, actual_amount: null, vendor: null, paid: false },
  ];
  let totalBudgeted = 0, totalPaid = 0;
  for (const item of BUDGET_ITEMS) {
    const body = {
      created_by_id: OWNER_ID,
      category: item.category,
      item_name: item.item_name,
      budgeted_amount: item.budgeted_amount,
      paid: item.paid,
    };
    if (item.actual_amount != null) body.actual_amount = item.actual_amount;
    if (item.vendor) body.vendor = item.vendor;
    if (item.paid && item.daysAgo != null) body.payment_date = daysAgo(item.daysAgo).toISOString().slice(0, 10);
    await adminCreate('Budget', body);
    totalBudgeted += item.budgeted_amount;
    if (item.paid) totalPaid += item.actual_amount ?? item.budgeted_amount;
  }
  console.log(`✓ Budget: ${BUDGET_ITEMS.length} categories, AUD $${totalBudgeted.toLocaleString()} budgeted, ${BUDGET_ITEMS.filter(i => i.paid).length} paid (AUD $${totalPaid.toLocaleString()})\n`);
  report.budget = { categories: BUDGET_ITEMS.length, totalBudgeted, totalPaid };

  // ═══ 6. Schedule — around the New Year's Eve wedding ═════════════════
  const SCHEDULE_ITEMS = [
    { event_name: 'Rehearsal', event_date: '2026-12-30', start_time: '17:00', end_time: '18:00', location: 'Crown Sydney', category: 'rehearsal' },
    { event_name: 'Welcome drinks', event_date: '2026-12-30', start_time: '18:30', end_time: '21:00', location: 'Crown Sydney — Sky Lounge', category: 'pre_wedding' },
    { event_name: 'Hair and makeup begins', event_date: '2026-12-31', start_time: '09:00', end_time: '12:30', location: 'Crown Sydney — Bridal Suite', category: 'preparation' },
    { event_name: 'Photography — getting ready', event_date: '2026-12-31', start_time: '11:00', end_time: '13:00', location: 'Crown Sydney', category: 'photography' },
    { event_name: 'Ceremony', event_date: '2026-12-31', start_time: '15:00', end_time: '15:45', location: 'Crown Sydney', category: 'ceremony' },
    { event_name: 'Cocktail hour', event_date: '2026-12-31', start_time: '16:00', end_time: '17:00', location: 'Capella Sydney — Garden Terrace', category: 'reception' },
    { event_name: 'Reception', event_date: '2026-12-31', start_time: '18:00', end_time: '23:30', location: 'Capella Sydney', category: 'reception' },
    { event_name: 'New Year\'s Eve countdown', event_date: '2026-12-31', start_time: '23:45', end_time: '00:15', location: 'Capella Sydney', category: 'reception', notes: 'Champagne toast at midnight, harbour fireworks visible from the terrace.' },
    { event_name: 'After-party', event_date: '2027-01-01', start_time: '00:30', end_time: '02:00', location: 'Capella Sydney — Rooftop Bar', category: 'post_wedding' },
    { event_name: 'Recovery brunch', event_date: '2027-01-01', start_time: '11:00', end_time: '13:00', location: 'Capella Sydney', category: 'post_wedding' },
  ];
  for (const item of SCHEDULE_ITEMS) {
    await adminCreate('Schedule', { created_by_id: OWNER_ID, ...item });
  }
  console.log(`✓ Schedule: ${SCHEDULE_ITEMS.length} events around the New Year's Eve wedding\n`);
  report.schedule = SCHEDULE_ITEMS.length;

  // ═══ 7. Vendors + bookings (pairs with the Budget categories above) ══
  const VENDORS = [
    { name: 'Crown Sydney', category: 'venue', status: 'booked', quoted_price: 45000, contact_person: 'Events team', price_range: '$$$$' },
    { name: 'Capella Sydney Catering', category: 'catering', status: 'booked', quoted_price: 38000, contact_person: 'Catering manager', price_range: '$$$$' },
    { name: 'Chris Abatzis Studio', category: 'photography', status: 'booked', quoted_price: 8500, contact_person: 'Chris Abatzis', price_range: '$$$' },
    { name: 'Sydney Bloom Florals', category: 'flowers', status: 'quoted', quoted_price: 6000, contact_person: 'Studio manager', price_range: '$$$' },
    { name: 'Harbour City Sound', category: 'music', status: 'contacted', quoted_price: 4500, contact_person: 'Booking coordinator', price_range: '$$' },
  ];
  for (const v of VENDORS) {
    const vendor = await adminCreate('Vendor', { created_by_id: OWNER_ID, ...v });
    if (v.status === 'booked') {
      await adminCreate('VendorBooking', {
        created_by_id: OWNER_ID,
        vendor_id: vendor.id,
        vendor_name: v.name,
        service_type: v.category,
        event_date: '2026-12-31',
        total_amount: v.quoted_price,
        deposit_amount: Math.round(v.quoted_price * 0.25),
        deposit_paid: true,
        balance_paid: false,
        status: 'confirmed',
      });
    }
  }
  console.log(`✓ Vendors: ${VENDORS.length} added (${VENDORS.filter(v => v.status === 'booked').length} booked with a deposit-paid booking record)\n`);
  report.vendors = VENDORS.length;

  // ═══ Verification — same shared tally utility the dashboard itself uses ═
  console.log('───────────────────────────────────────────────────────');
  console.log('  Verification (via src/lib/guestRsvpTally.js — same utility the real dashboard reads)');
  console.log('───────────────────────────────────────────────────────');
  const finalGuests = (await adminFetch(`/apps/${APP_ID}/entities/Guest?q=${ownerQuery()}&limit=500`)).filter(g => !g.is_test);
  const tally = tallyGuestRsvp(finalGuests);
  console.log(JSON.stringify(tally, null, 2));
  console.log(`\nTotal guests: ${finalGuests.length} (matches source: ${finalGuests.length === guests.length})`);

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  Done — summary');
  console.log('═══════════════════════════════════════════════════════');
  console.log(JSON.stringify(report, null, 2));
}

main().catch(err => {
  console.error('\n✗ FAILED:', err.message);
  process.exit(1);
});
