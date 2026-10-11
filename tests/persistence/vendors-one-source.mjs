/**
 * tests/persistence/vendors-one-source.mjs
 *
 * ONE VENDOR LIST, AND ONE WAY TO ADD TO IT.
 *
 * Item 1 of goals/2026-10-11-dashboard-fixes-batch-1.md.
 *
 * WHAT IS DRIVEN. src/components/vendors/vendorPicks.js is imported and run:
 * the category match, which decides whether a vendor added on one page appears
 * on another, and the On the day copy, which decides what travels when a
 * contact is picked. Both were inline before this item, the category match in
 * two separate copies.
 *
 * WHAT IS READ. The surfaces are .jsx and cannot be imported, so each one is
 * read as source and asserted to pass the right category into the shared
 * component and to lead with the shared label. The label is asserted from the
 * CONSTANT, not from a string typed twice here: a guard that hardcodes the
 * copy it is checking will go green against a component that hardcodes it
 * differently.
 *
 * THE FIVE SURFACES ARE NAMED, not counted from a glob, because the owner's
 * ruling names five and a sixth appearing silently is a thing to notice.
 */

import { pass, fail, stripComments } from './_shared.mjs';
import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  vendorsInCategory,
  contactFromVendor,
  blankContact,
  ADD_VENDOR_LABEL,
  ADD_CONTACT_LABEL,
} from '../../src/components/vendors/vendorPicks.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const code = (p) => readFileSync(join(ROOT, p), 'utf8');

/** The categories the dashboard actually offers a slot for. */
const CATEGORIES = [
  'flowers', 'decorations', 'attire', 'beauty', 'catering',
  'music', 'photography', 'videography', 'transportation',
];

/** Every surface that shows or adds a vendor, with the component it uses. */
const SURFACES = [
  ['src/pages/Styling.jsx', 'VendorContactSection', ['flowers', 'decorations']],
  ['src/components/styling/AttirePanel.jsx', 'VendorContactSection', ['attire']],
  ['src/pages/Beauty.jsx', 'VendorContactSection', ['beauty']],
  ['src/pages/Beauty.jsx', 'VendorRosterSection', ['beauty']],
  ['src/pages/FoodBeverage.jsx', 'VendorContactSection', ['catering']],
  ['src/pages/Music.jsx', 'VendorRosterSection', ['music']],
  ['src/pages/Photography.jsx', 'VendorRosterSection', ['photography', 'videography']],
  ['src/pages/Transport.jsx', 'VendorRosterSection', ['transportation']],
];

export async function runVendorsOneSource() {
  const results = [];
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));

  const roster = code('src/components/vendors/VendorRosterSection.jsx');
  const contact = code('src/components/vendors/VendorContactSection.jsx');
  const onTheDay = code('src/pages/EmergencyContact.jsx');
  const music = code('src/pages/Music.jsx');
  const picks = code('src/components/vendors/vendorPicks.js');

  // ── 1. A vendor in a category is found by every surface ───────────────
  //
  // One function now answers this, so "appears on every page that shows that
  // category" is a property of one call rather than of five call sites.
  const rows = CATEGORIES.map((c, i) => ({ id: `v${i}`, name: `Vendor ${i}`, category: c, phone: `04000000${i}` }));
  for (const c of CATEGORIES) {
    const found = vendorsInCategory(rows, c);
    ok(`a vendor created in ${c} is found by that category`,
       found.length === 1 && found[0].category === c, `${found.length} match(es)`);
  }
  ok('and by no other category',
     CATEGORIES.every((c) => vendorsInCategory(rows, c).every((v) => v.category === c)), 'no bleed');

  // THE THREE WRITERS DO NOT AGREE ON CASE. A row reaches Vendor from the
  // Vendors form, the marketplace and Ava; a surface that hid "Beauty" would
  // be the exact failure this item closes.
  ok('a category stored with different case still matches',
     vendorsInCategory([{ id: 'x', category: 'Beauty' }], 'beauty').length === 1, 'case folded');
  ok('  and one stored with stray spaces',
     vendorsInCategory([{ id: 'x', category: ' beauty ' }], 'beauty').length === 1, 'trimmed');
  ok('an empty category matches nothing rather than everything',
     vendorsInCategory(rows, '').length === 0 && vendorsInCategory(rows, null).length === 0, 'empty');
  ok('a row with no category is not swept in',
     vendorsInCategory([{ id: 'x' }], 'beauty').length === 0, 'skipped');
  // A THROW IS A RED. The point of the check is that the function survives a
  // list that has not loaded, so a version that throws must fail the
  // assertion rather than crash this file. Found by the plant that removed
  // the `|| []`.
  const safeMatch = (() => {
    try { return { ok: vendorsInCategory(undefined, 'beauty').length === 0, note: 'safe' }; }
    catch (err) { return { ok: false, note: `THREW: ${err.message}` }; }
  })();
  ok('and it does not throw on a missing list', safeMatch.ok, safeMatch.note);

  // ── 2. Every add control leads with the same label ────────────────────
  ok('the shared label is the owner’s, verbatim', ADD_VENDOR_LABEL === 'Add vendor', ADD_VENDOR_LABEL);
  ok('  and the second On the day action is too', ADD_CONTACT_LABEL === 'Add contact', ADD_CONTACT_LABEL);

  ok('the roster’s button is the shared label, not a per-category one',
     roster.includes('{ADD_VENDOR_LABEL}') && !/Add \{label\} vendor/.test(roster),
     'Add vendor');
  ok('  and its empty state says the same words',
     roster.includes('Click "${ADD_VENDOR_LABEL}"') && !/Add \$\{label\} vendor/.test(roster),
     'one label');
  ok('the single-vendor picker still leads with Add vendor',
     /<Plus size=\{12\} \/>Add vendor/.test(contact), 'unchanged');
  ok('  and offers edit and change only once a vendor is set',
     (() => {
       const live = stripComments(contact, { trailing: true });
       const edit = live.indexOf('Edit vendor');
       const add = live.indexOf('>Add vendor');
       return edit > -1 && add > -1 && /selectedVendor \?/.test(live);
     })(), 'gated on selectedVendor');

  ok('On the day leads with Add vendor and offers Add contact beside it',
     /data-add-vendor[\s\S]{0,400}\{ADD_VENDOR_LABEL\}/.test(onTheDay)
       && /data-add-contact[\s\S]{0,400}\{ADD_CONTACT_LABEL\}/.test(onTheDay),
     'both actions');
  ok('  with Add vendor first, which is the one-for-one promise',
     onTheDay.indexOf('data-add-vendor') < onTheDay.indexOf('data-add-contact'), 'order');
  ok('  and the old per-page wording is gone',
     !/Add vendor contact</.test(onTheDay), 'replaced');

  // ── 3. The On the day pick copies name and phone ──────────────────────
  const picked = contactFromVendor({ id: 'v1', name: 'Petal & Stem', phone: '0400 000 111', category: 'flowers' });
  ok('the pick copies the name', picked.name === 'Petal & Stem', picked.name);
  ok('  and the phone', picked.phone === '0400 000 111', picked.phone);
  ok('  and prefills the role from the category', picked.role === 'flowers', picked.role);
  ok('  carrying nothing else, because the row holds three fields',
     Object.keys(picked).sort().join(',') === 'name,phone,role', Object.keys(picked).join(','));
  ok('a vendor with no phone copies an empty string, not undefined',
     contactFromVendor({ name: 'A' }).phone === '', JSON.stringify(contactFromVendor({ name: 'A' })));
  ok('and the free-text action starts blank in the same shape',
     Object.keys(blankContact()).sort().join(',') === 'name,phone,role'
       && Object.values(blankContact()).every((v) => v === ''),
     JSON.stringify(blankContact()));
  ok('On the day builds its picked row through that one function',
     /contactFromVendor\(vendor\)/.test(onTheDay) && /blankContact\(\)/.test(onTheDay),
     'shared');
  ok('  and still stores to dayVendorContacts, not to Vendor',
     /dayVendorContacts/.test(onTheDay) && !/entities\.Vendor/.test(onTheDay), 'no data move');
  ok('  reading the vendor list only to offer the choice',
     /getMyRecords\('Vendor'\)/.test(onTheDay), 'read only');

  // ── 4. The surfaces, named ────────────────────────────────────────────
  for (const [file, component, cats] of SURFACES) {
    const src = code(file);
    ok(`${file.replace('src/', '')} uses ${component}`,
       src.includes(`<${component}`), 'present');
    for (const c of cats) {
      ok(`  for ${c}`, new RegExp(`category="${c}"`).test(src), `category="${c}"`);
    }
  }
  ok('no surface hand-rolls its own vendor add control',
     SURFACES.every(([file]) => {
       const live = stripComments(code(file), { trailing: true });
       return !/VendorFormModal/.test(live);
     }), 'none opens the form itself');

  ok('the category match is written once, not per component',
     /vendorsInCategory\(all, category\)/.test(roster)
       && /vendorsInCategory\(vendors, category\)/.test(contact)
       && !/v\.category === category/.test(stripComments(roster, { trailing: true }))
       && !/v\.category === category/.test(stripComments(contact, { trailing: true })),
     'one rule');

  // ── 5. Music's tab ────────────────────────────────────────────────────
  ok('Music’s tab reads Musicians',
     /\{ key: 'vendor',\s+label: 'Musicians' \}/.test(music), 'renamed');
  ok('  its key is unchanged, so the collaborator gate still holds',
     /tab\.key !== 'vendor'/.test(music), "key 'vendor'");
  ok('  and the default tab is untouched',
     !/label: 'Vendor' \}/.test(music) && /useState\('/.test(music), 'default unchanged');

  // ── 6. Copy rules ─────────────────────────────────────────────────────
  const copy = [ADD_VENDOR_LABEL, ADD_CONTACT_LABEL, 'Musicians'];
  ok('no em or en dash in the labels', copy.every((t) => !/[—–]/.test(t)), copy.join(' / '));
  ok('  nothing shouting', copy.every((t) => t !== t.toUpperCase()), copy.join(' / '));
  ok('  and the shared module adds no dependency',
     !/^import /m.test(picks), 'standalone');

  return results;
}
