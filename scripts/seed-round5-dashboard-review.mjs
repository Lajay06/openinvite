/**
 * scripts/seed-round5-dashboard-review.mjs
 *
 * Additive top-up for the John & Suzanne wedding (WeddingDetails id
 * 6a1f90fa5b4e0702b5a051aa, owner jaygalaxy23), extending the original
 * scripts/seed-demo-data.mjs pass with the data this round's dashboard/
 * site review batch needed:
 *
 *   1. Guest.tags — all 201 real guests get 1-2 realistic tags (college
 *      friends, work colleagues, partner's side, family, etc). Plain
 *      overwrite, safe to rerun.
 *   2. Schedule — 11 new wedding-day detail events (transport pickups,
 *      entrances, speeches, first dance, cake cutting, band/DJ set times,
 *      bouquet toss), slotted into the existing NYE-wedding timeline
 *      between reception start and the after-party. Guarded by event_name
 *      so a rerun does not duplicate rows the original seed-demo-data.mjs
 *      guard mechanism doesn't cover (that guard only fires on a FIRST
 *      Schedule row for the owner, not on adding more later).
 *   3. WeddingDetails.attire/beauty/flowers/decorations — replaces the
 *      junk keyboard-mash placeholder values left over from manual testing
 *      (tailor.name:"dsfds", beauty.hairArtist:"dgdfg", etc — confirmed by
 *      reading the live record directly) with realistic content, and fills
 *      in the new Contact/Phone/Email fields added to Styling.jsx/
 *      Beauty.jsx/AttirePanel.jsx this round so those fields aren't empty
 *      in the demo either. Plain overwrite of these 4 sub-objects only —
 *      every other WeddingDetails field (website builder content, theme,
 *      venue details, etc) is left untouched.
 *   4. Vendor.email/website — the 5 vendors from the original seed had
 *      neither; added here so My vendors' new favicon-logo column and
 *      email/phone/website display have something to show.
 *
 * Uses a REAL logged-in session for the wedding owner, same as
 * seed-demo-data.mjs and for the same reason (owner-scoped update RLS on
 * Guest/Schedule/Vendor/WeddingDetails 403s the admin key on any PUT
 * against an existing record — see BASE44_PLATFORM_NOTES.md).
 *
 * Usage: node scripts/seed-round5-dashboard-review.mjs
 * Requires BASE44_TEST_EMAIL/BASE44_TEST_PASSWORD in .env.local.
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

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

function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20270101);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const chance = (p) => rand() < p;

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
async function apiFetch(path) {
  const res = await fetch(`${BASE44_API}${path}`, { headers: { Authorization: `Bearer ${TOKEN}` } });
  if (!res.ok) throw new Error(`GET ${path} failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
  return unwrapList(await res.json());
}
async function apiCreate(entity, body) {
  const res = await fetch(`${BASE44_API}/apps/${APP_ID}/entities/${entity}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${entity} failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
  return res.json();
}
async function apiUpdate(entity, id, body) {
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
  console.log('  Round-5 top-up — John & Suzanne wedding (production data)');
  console.log('═══════════════════════════════════════════════════════\n');

  TOKEN = await login();
  console.log('✓ Logged in as the wedding owner (jaygalaxy23@gmail.com)\n');

  // ═══ 1. Guest tags ════════════════════════════════════════════════════
  const TAG_POOL = ["College friends", "Work colleagues", "Partner's side", "Family", "Childhood friends", "University", "Neighbours", "Wedding party"];
  const guests = (await apiFetch(`/apps/${APP_ID}/entities/Guest?q=${ownerQuery()}&limit=500`)).filter(g => !g.is_test);
  let tagged = 0;
  for (const g of guests) {
    const tags = [pick(TAG_POOL)];
    if (chance(0.25)) {
      const second = pick(TAG_POOL);
      if (second !== tags[0]) tags.push(second);
    }
    await apiUpdate('Guest', g.id, { tags });
    tagged++;
  }
  console.log(`✓ Guest tags: ${tagged} guests tagged from ${TAG_POOL.length} realistic categories\n`);

  // ═══ 2. Schedule — wedding-day detail events ═════════════════════════
  const existingSchedule = await apiFetch(`/apps/${APP_ID}/entities/Schedule?q=${ownerQuery()}`);
  const existingNames = new Set(existingSchedule.map(s => s.event_name));
  const NEW_SCHEDULE_ITEMS = [
    { event_name: 'Guest transport pickup — CBD hotels', event_date: '2026-12-31', start_time: '13:30', end_time: '14:15', location: 'CBD hotel pickup points', category: 'transportation', notes: 'Coaches depart from the Marriott, ibis King Street Wharf and Vibe Hotel — 30 minutes before ceremony.' },
    { event_name: 'Grand entrance', event_date: '2026-12-31', start_time: '18:00', end_time: '18:10', location: 'Capella Sydney', category: 'reception' },
    { event_name: 'Welcome speeches', event_date: '2026-12-31', start_time: '18:30', end_time: '18:50', location: 'Capella Sydney', category: 'reception', notes: 'Parents of the couple, then MC introduces dinner service.' },
    { event_name: 'Best man & maid of honour speeches', event_date: '2026-12-31', start_time: '19:45', end_time: '20:05', location: 'Capella Sydney', category: 'reception' },
    { event_name: 'First dance', event_date: '2026-12-31', start_time: '20:05', end_time: '20:15', location: 'Capella Sydney', category: 'reception' },
    { event_name: 'Cake cutting', event_date: '2026-12-31', start_time: '20:15', end_time: '20:25', location: 'Capella Sydney', category: 'reception' },
    { event_name: 'Band set — Harbour City Sound', event_date: '2026-12-31', start_time: '20:30', end_time: '22:00', location: 'Capella Sydney — Dance floor', category: 'reception', notes: 'Live band set before the DJ takes over for the countdown.' },
    { event_name: 'Bouquet toss', event_date: '2026-12-31', start_time: '22:00', end_time: '22:10', location: 'Capella Sydney — Dance floor', category: 'reception' },
    { event_name: 'DJ set — countdown to midnight', event_date: '2026-12-31', start_time: '22:10', end_time: '23:45', location: 'Capella Sydney — Dance floor', category: 'reception', notes: 'DJ takes over from the band leading into the NYE countdown.' },
    { event_name: 'Return transport — CBD hotels', event_date: '2027-01-01', start_time: '02:00', end_time: '02:45', location: 'Capella Sydney — Rooftop Bar', category: 'transportation', notes: 'Coaches depart after the after-party for the same CBD hotel pickup points.' },
  ];
  let scheduleAdded = 0;
  for (const item of NEW_SCHEDULE_ITEMS) {
    if (existingNames.has(item.event_name)) continue;
    await apiCreate('Schedule', { created_by_id: OWNER_ID, ...item });
    scheduleAdded++;
  }
  console.log(`✓ Schedule: ${scheduleAdded} new wedding-day detail events added (${NEW_SCHEDULE_ITEMS.length - scheduleAdded} already present, skipped)\n`);

  // ═══ 3. WeddingDetails — replace junk placeholders with real content ═
  const STYLING_PATCH = {
    attire: {
      outfits: [
        { id: 'attr1', role: 'Bride', name: 'Suzanne', description: 'Ivory silk crepe gown, fitted bodice with a soft cathedral train', source: 'Bella Sposa Bridal Atelier', status: 'In alterations', measurements: '', cost: '$4,800', photoUrl: '' },
        { id: 'attr2', role: 'Groom', name: 'John', description: 'Charcoal three-piece suit, midnight blue lapel to match the NYE theme', source: 'Bella Sposa Bridal Atelier', status: 'Ordered', measurements: '', cost: '$1,600', photoUrl: '' },
      ],
      tailor: {
        name: 'Bella Sposa Bridal Atelier',
        contact: 'Isabella Conti',
        phone: '+61 2 9555 0142',
        email: 'fittings@bellasposa.com.au',
        notes: 'Final fitting booked three weeks before the wedding. Deposit paid, balance due on collection.',
      },
      fittings: [
        { id: 'fit1', date: '2026-11-15', who: 'Bride', notes: 'First fitting — check hem length and bust adjustment' },
        { id: 'fit2', date: '2026-12-10', who: 'Groom', notes: 'Final suit fitting, collect same day' },
      ],
      accessories: [
        { id: 'acc1', item: 'Veil', forWhom: 'Bride', done: true },
        { id: 'acc2', item: 'Cufflinks', forWhom: 'Groom', done: false },
        { id: 'acc3', item: 'Garter', forWhom: 'Bride', done: false },
      ],
      notes: 'Ceremony is outdoors on grass — heel-friendly footwear recommended for the bridal party.',
    },
    beauty: {
      skincareTimeline: [
        { id: 'sk1', timeframe: '3 months before', treatment: 'Facial consultation', notes: '', done: true },
        { id: 'sk2', timeframe: '1 month before', treatment: 'Final facial and hydration', notes: '', done: false },
      ],
      gettingReadyPeople: [
        { id: 1001, name: 'Suzanne', role: 'Bride', service: 'both' },
        { id: 1002, name: 'Maid of honour', role: 'Bridesmaid', service: 'both' },
        { id: 1003, name: 'Mother of the bride', role: 'Mother of the bride', service: 'hair' },
      ],
      trials: [
        { id: 2001, date: '2026-11-20', artist: 'Studio Lumière', lookDescription: 'Loose waves with a soft side-swept fringe', rating: 5, notes: 'Loved it — booked for the day' },
      ],
      hairArtist: 'Studio Lumière Hair',
      hairArtistContact: 'Priya Nair',
      hairArtistPhone: '+61 2 9555 0198',
      hairArtistEmail: 'bookings@studiolumiere.com.au',
      makeupArtist: 'Bare Beauty Makeup Co',
      makeupArtistContact: 'Chloe Nguyen',
      makeupArtistPhone: '+61 2 9555 0177',
      makeupArtistEmail: 'hello@barebeautyco.com.au',
      styleNotes: 'Soft glam look with a natural base — bridal party in a lighter version of the same palette.',
      hairInspo: 'Loose romantic waves with a low side bun.',
    },
    flowers: {
      florist: 'Sydney Bloom Florals',
      floristContact: 'Studio manager',
      floristPhone: '+61 2 9555 0163',
      floristEmail: 'hello@sydneybloomflorals.com.au',
      bouquet: 'White garden roses, ranunculus and eucalyptus, cascading style',
      bridesmaidBouquets: 'Smaller matching posies in the same palette',
      boutonnieres: 'Single white rose with a eucalyptus sprig for groomsmen',
      ceremony: 'Floral arch with white and blush blooms, aisle petals in matching tones',
      centerpieces: 'Low, lush arrangements in glass bowls — white and blush with trailing greenery',
      additional: 'Flower girl petals, welcome sign florals',
      notes: 'No lilies — one guest has a pollen allergy.',
    },
    decorations: {
      decorator: 'Sydney Bloom Florals',
      decoratorContact: 'Studio manager',
      decoratorPhone: '+61 2 9555 0163',
      decoratorEmail: 'hello@sydneybloomflorals.com.au',
      theme: 'Modern romance with a New Year\'s Eve sparkle',
      colorScheme: 'Ivory, blush and champagne gold',
      lighting: 'String lights across the terrace, candles on every table, uplighting on the dance floor for midnight',
      linens: 'Ivory linen tablecloths, blush napkins, gold flatware',
      ceremonyDecorations: 'Floral arch, ivory aisle runner, seat ribbons in blush',
      receptionDecorations: 'Long tables mixing florals and candles, a lounge area with velvet furniture',
      specialElements: 'NYE countdown balloon drop, photo booth with props',
      notes: 'Vendor bump-in from 10am on the wedding day — coordinate with the Capella Sydney events team.',
    },
  };
  await apiUpdate('WeddingDetails', WEDDING_ID, STYLING_PATCH);
  console.log('✓ WeddingDetails: attire/beauty/flowers/decorations junk placeholders replaced with realistic content\n');

  // ═══ 4. Vendor email/website ══════════════════════════════════════════
  const VENDOR_CONTACT_INFO = {
    'Crown Sydney': { email: 'events@crownsydney.com.au', website: 'https://www.crownsydney.com.au' },
    'Capella Sydney Catering': { email: 'catering@capellasydney.com', website: 'https://www.capellahotels.com/en/capella-sydney' },
    'Chris Abatzis Studio': { email: 'hello@chrisabatzis.com', website: 'https://www.chrisabatzis.com' },
    'Sydney Bloom Florals': { email: 'hello@sydneybloomflorals.com.au', website: 'https://www.sydneybloomflorals.com.au' },
    'Harbour City Sound': { email: 'bookings@harbourcitysound.com.au', website: 'https://www.harbourcitysound.com.au' },
  };
  const vendors = await apiFetch(`/apps/${APP_ID}/entities/Vendor?q=${ownerQuery()}`);
  let vendorsUpdated = 0;
  for (const v of vendors) {
    const info = VENDOR_CONTACT_INFO[v.name];
    if (!info) continue;
    await apiUpdate('Vendor', v.id, info);
    vendorsUpdated++;
  }
  console.log(`✓ Vendors: ${vendorsUpdated}/${vendors.length} given a real-looking email and website\n`);

  console.log('═══════════════════════════════════════════════════════');
  console.log('  Done');
  console.log('═══════════════════════════════════════════════════════');
}

main().catch(err => {
  console.error('\n✗ FAILED:', err.message);
  process.exit(1);
});
