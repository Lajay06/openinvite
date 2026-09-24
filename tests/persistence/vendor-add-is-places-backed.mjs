/**
 * Every add-vendor path is Places-backed, and there is only one of them.
 *
 * ── THE RULING ─────────────────────────────────────────────────────────────
 *
 * Round two, item 8: "Marketplace search is Places-backed and works. 'Add
 * vendor' in Styling, Florist, Food and beverage, Photography, and any other
 * page opens a modal with free-text. Sweep every add-vendor entry point and
 * back each with the same Places search Marketplace uses. One component,
 * reused."
 *
 * ── WHAT THE SWEEP FOUND ───────────────────────────────────────────────────
 *
 * The entry points were ALREADY one component. Vendors, Styling, Beauty, Food
 * & beverage, Photography, Music, Transport and the attire panel all open
 * VendorFormModal, which renders VendorForm. There was never a second modal to
 * unify. What every one of them lacked was the SEARCH: every field was typed,
 * so a florist's phone number and website were whatever the couple copied by
 * hand.
 *
 * ── THE COST THAT WAS NOT OBVIOUS ──────────────────────────────────────────
 *
 * A hand-typed vendor carried no google_place_id. Marketplace's duplicate
 * check is findMyVendorByPlaceId (src/lib/vendorPlaces.js), which filters on
 * exactly that field — so a vendor the couple had already added by hand was
 * invisible to it, and adding the same business from Marketplace created a
 * second record for it. Backing the form with the same search closes that as
 * well as filling the fields.
 *
 * ── WHAT A PICK MAY AND MAY NOT TOUCH ──────────────────────────────────────
 *
 * It fills what Google knows: name, address, phone, website, rating, review
 * count, place id. It never fills what is the COUPLE'S — status, quoted price,
 * contract date, payment schedule, notes — because those describe their
 * arrangement, not the business. And typing by hand still works: a vendor is
 * not always on Google, and a form that insisted otherwise would be worse than
 * the one that asked for everything.
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pass, fail } from './_shared.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = (p) => resolve(__dir, '../../', p);
// A MISSING FILE IS A FAILED CHECK, NOT A CRASHED RUN. Reading a component
// that does not exist yet throws at module load, which aborts the whole guard
// before one line prints — a red CI naming nothing. Empty string instead, and
// every check that depended on the file fails by name.
const read = (p) => { try { return readFileSync(root(p), 'utf8'); } catch { return ''; } };
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const FORM = strip(read('src/components/vendors/VendorForm.jsx'));
const PANEL = strip(read('src/components/vendors/VendorPlacesSearch.jsx'));
const MODAL = strip(read('src/components/vendors/VendorFormModal.jsx'));
const PLACES_LIB = strip(read('src/lib/vendorPlaces.js'));

/** Every file that opens an add-vendor form. */
const ENTRY_POINTS = [
  'src/pages/Vendors.jsx',
  'src/pages/Styling.jsx',
  'src/pages/Beauty.jsx',
  'src/pages/FoodBeverage.jsx',
  'src/pages/Photography.jsx',
  'src/pages/Music.jsx',
  'src/pages/Transport.jsx',
  'src/components/styling/AttirePanel.jsx',
  'src/components/vendors/VendorContactSection.jsx',
  'src/components/vendors/VendorRosterSection.jsx',
];

/** Fields that are the couple's own and must never be filled from a search. */
const THEIRS = ['status', 'quoted_price', 'contract_date', 'payment_schedule', 'notes'];

export async function runVendorAddIsPlacesBacked() {
  const results = [];
  const check = (n, ok, d) => results.push(ok ? pass(n, d) : fail(n, 'see name', d));
  console.log('\n  Add vendor — one form, and it is Places-backed:\n');

  // ── One form, reached from everywhere ─────────────────────────────────────
  for (const f of ENTRY_POINTS) {
    const src = strip(read(f));
    const name = f.replace(/^src\/(pages|components)\//, '');
    check(`${name} reaches the shared form`,
      /VendorFormModal|VendorContactSection|VendorRosterSection/.test(src), 'no form of its own');
    check(`  ${name} has no add-vendor form of its own`,
      !/<VendorForm\b/.test(src) || f.endsWith('VendorFormModal.jsx'), 'not a second form');
  }
  check('the modal renders the one form', /<VendorForm/.test(MODAL), 'VendorFormModal');

  // ── The search is on it ───────────────────────────────────────────────────
  check('the shared form opens with a Places search',
    /<VendorPlacesSearch onPick=\{applyPlace\}/.test(FORM), 'VendorPlacesSearch');
  check('  which calls the same server-side proxy Marketplace calls',
    /fetch\('\/api\/places-search'/.test(PANEL), '/api/places-search');
  check('  and asks place-details for the phone and website the search does not carry',
    /\/api\/place-details\?place_id=/.test(PANEL), '/api/place-details');
  check('  with no client-side Google key anywhere near it',
    !/VITE_GOOGLE/.test(PANEL) && !/maps\.googleapis\.com/.test(PANEL), 'server proxy only');

  // ── A pick fills the Google fields, under the names the lib already uses ──
  for (const f of ['google_place_id', 'google_rating', 'google_reviews_count']) {
    check(`a pick fills ${f}, the field Marketplace writes`,
      new RegExp(`${f}:`).test(PANEL) && new RegExp(`${f}`).test(PLACES_LIB), 'same name');
  }
  check('  so Marketplace’s duplicate check can see a vendor added here',
    /findMyVendorByPlaceId/.test(PLACES_LIB) && /google_place_id/.test(FORM), 'dedupe reaches both');
  check('  and an empty place id is written as null, not as ""',
    /google_place_id: formData\.google_place_id \|\| null/.test(FORM), 'no false identity');

  // ── A pick fills, it does not replace ─────────────────────────────────────
  check('a pick merges over the form rather than resetting it',
    /const applyPlace = \(fields\) => setFormData\(prev => \(\{ \.\.\.prev, \.\.\.fields \}\)\);/.test(FORM),
    'spread, not replace');
  for (const f of THEIRS) {
    check(`  it never touches ${f} — that is the couple’s answer, not Google’s`,
      !new RegExp(`${f}:`).test(PANEL), 'untouched');
  }

  // ── Typing by hand still works ────────────────────────────────────────────
  check('the typed fields are still there and still editable',
    /id="name"/.test(FORM) && /id="phone"/.test(FORM) && /id="website"/.test(FORM) && /id="address"/.test(FORM),
    'nothing removed');
  check('  and a failed search says so without blocking the form',
    /you can still type the details in/.test(PANEL) && /Type the details in below instead/.test(PANEL),
    'two honest messages');

  return results;
}
