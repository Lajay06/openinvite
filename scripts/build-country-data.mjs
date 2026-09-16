/**
 * scripts/build-country-data.mjs — the country table and the flag sprite.
 *
 * Run: node scripts/build-country-data.mjs
 * Writes: src/lib/countryCodes.generated.js
 *         public/flags/flags.svg
 *
 * WHY GENERATED. The picker offered fourteen countries, hand-typed. A hand-
 * typed list of 245 is a list that is wrong somewhere and nobody can say where,
 * so the data comes from two libraries at BUILD time and neither ships to the
 * browser:
 *
 *   libphonenumber-js  1.11.12  (MIT)  dial codes, national (trunk) prefixes
 *   country-flag-icons  1.6.20  (MIT)  the 3x2 flag artwork
 *
 * Names come from Node's own ICU — `Intl.DisplayNames(['en'], {type:'region'})`
 * — so there is no third list to keep in step. They are the CLDR names, which
 * is why the table reads "Türkiye", "Côte d'Ivoire", "Hong Kong SAR China" and
 * "Myanmar (Burma)". Those are what a couple sees; what they TYPE is handled by
 * the alias table below, which lives here, in the generator's input, and never
 * as a hand edit in the generated file.
 *
 * ── THE TRUNK PREFIX, AND THE TRAP IN IT ───────────────────────────────────
 *
 * `nationalPrefix()` returns the STRING "0" for Australia and the NUMBER 0 for
 * Italy, San Marino, Vatican City and Mexico. The number is the metadata's way
 * of saying THERE IS NO PREFIX. Read as a truthy "0" it would strip the leading
 * zero from an Italian number — and Italians dial and write that zero; it is
 * part of the number. So the test is `typeof === 'string'`, never truthiness.
 *
 * ── THE FOURTEEN THAT WERE ALREADY THERE ───────────────────────────────────
 *
 * CURATED below is the table this replaces, verbatim. Those entries win over
 * anything generated, because toE164()'s behaviour on them is covered by the
 * owner's own cases in tests/persistence/whatsapp-e164.mjs and this package is
 * not the place to move any of it. Where the generated value differs it is
 * printed at build time and explained in the PR rather than silently taken.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { Metadata } from 'libphonenumber-js/core';

// `metadata.min.json` resolves to a .js wrapper under this package's exports
// map, so an import attribute of type json is refused; require() takes it.
const metadata = createRequire(import.meta.url)('libphonenumber-js/metadata.min.json');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FLAG_DIR = path.join(ROOT, 'node_modules/country-flag-icons/3x2');

// The fourteen entries of the table this replaces, exactly as they were.
const CURATED = {
  AU: '0', US: '', GB: '0', NZ: '0', CA: '', IE: '0', IN: '0',
  SG: '', ZA: '0', FR: '0', DE: '0', IT: '', ES: '', AE: '0',
};

// PINNED, in this order, then everything else alphabetically (owner's ruling).
const PINNED = ['AU', 'NZ', 'GB', 'US'];

// WHAT PEOPLE TYPE, not what CLDR prints. Nobody should have to produce "ü" or
// a SAR to find their own country. Matched as a prefix on a lowercased query,
// alongside the name, the ISO code and the dial code.
const ALIASES = {
  GB: ['uk', 'united kingdom', 'england', 'scotland', 'wales', 'northern ireland', 'britain', 'great britain'],
  US: ['usa', 'us', 'united states of america', 'america'],
  NL: ['holland', 'the netherlands'],
  TR: ['turkey'],
  CI: ['ivory coast'],
  MM: ['burma'],
  HK: ['hong kong'],
  MO: ['macau', 'macao'],
  KR: ['south korea'],
  KP: ['north korea'],
  AE: ['uae'],
  CZ: ['czech republic'],
  CD: ['drc', 'congo kinshasa'],
  CG: ['congo brazzaville'],
  VA: ['vatican'],
  SZ: ['swaziland'],
  CV: ['cape verde'],
  TL: ['east timor'],
  LA: ['laos'],
  SY: ['syria'],
  RU: ['russia'],
  BO: ['bolivia'],
  VE: ['venezuela'],
  IR: ['iran'],
  TZ: ['tanzania'],
  MD: ['moldova'],
  PS: ['palestine'],
  BN: ['brunei'],
  FM: ['micronesia'],
};

const meta = new Metadata(metadata);
const display = new Intl.DisplayNames(['en'], { type: 'region' });

const isoCodes = Object.keys(metadata.countries).filter((c) => /^[A-Z]{2}$/.test(c));
const rows = [];
const differences = [];
const missingFlags = [];

for (const iso of isoCodes) {
  meta.selectNumberingPlan(iso);
  const dial = meta.countryCallingCode();
  const np = meta.numberingPlan.nationalPrefix();
  // typeof, not truthiness — see the header.
  const generatedTrunk = typeof np === 'string' ? np : '';
  const trunk = iso in CURATED ? CURATED[iso] : generatedTrunk;
  if (iso in CURATED && CURATED[iso] !== generatedTrunk) {
    differences.push(`${iso}: kept ${JSON.stringify(CURATED[iso])}, metadata says ${JSON.stringify(generatedTrunk)}`);
  }
  const label = display.of(iso) || iso;
  if (!fs.existsSync(path.join(FLAG_DIR, `${iso}.svg`))) missingFlags.push(iso);
  rows.push({ iso, dial, trunk, label, aliases: ALIASES[iso] || [] });
}

// Pinned first, in the owner's order; the rest alphabetical by what is shown.
const pinned = PINNED.map((iso) => rows.find((r) => r.iso === iso)).filter(Boolean);
const rest = rows.filter((r) => !PINNED.includes(r.iso)).sort((a, b) => a.label.localeCompare(b.label, 'en'));
const ordered = [...pinned, ...rest];

const lit = (s) => JSON.stringify(s);
const out = `/**
 * GENERATED BY scripts/build-country-data.mjs — DO NOT EDIT.
 *
 * ${ordered.length} countries. Dial codes and trunk prefixes from
 * libphonenumber-js 1.11.12 (MIT); names from Intl.DisplayNames(['en']) — the
 * CLDR names, which is why this reads "Türkiye" and "Côte d'Ivoire". Flags are
 * public/flags/flags.svg, built from country-flag-icons 1.6.20 (MIT).
 *
 * \`trunk\` is the national prefix to strip when a number is typed in local
 * form, and it is EMPTY for countries whose metadata carries none — Italy, San
 * Marino, Vatican City and Mexico among them, where the leading zero is part of
 * the number rather than a prefix to remove.
 *
 * The first four are pinned (owner's ruling): Australia, New Zealand, United
 * Kingdom, United States. The rest are alphabetical by displayed name.
 *
 * \`aliases\` are what people TYPE — "uk", "usa", "holland", "turkey",
 * "ivory coast", "burma" — never what is displayed.
 */
export const COUNTRIES = [
${ordered.map((r) => `  { iso: ${lit(r.iso)}, dial: ${lit(r.dial)}, trunk: ${lit(r.trunk)}, label: ${lit(r.label)}${r.aliases.length ? `, aliases: ${JSON.stringify(r.aliases)}` : ''} },`).join('\n')}
];

export const PINNED_ISO = ${JSON.stringify(PINNED)};
`;
fs.writeFileSync(path.join(ROOT, 'src/lib/countryCodes.generated.js'), out);

// ── The sprite: one file, one request, each symbol carrying its own viewBox ──
//
// 265 separate assets would be 265 files in every diff that touches a flag and
// 265 requests the first time a picker opens. One sprite is one of each. Each
// <symbol> keeps the source file's OWN viewBox, because these are not all the
// same aspect internally and a shared one would stretch a third of the world.
const symbols = [];
let files = 0, bytesIn = 0;
for (const r of ordered) {
  const file = path.join(FLAG_DIR, `${r.iso}.svg`);
  if (!fs.existsSync(file)) continue;
  const svg = fs.readFileSync(file, 'utf8');
  bytesIn += Buffer.byteLength(svg);
  files += 1;
  const viewBox = (svg.match(/viewBox="([^"]+)"/) || [, '0 0 640 480'])[1];
  const inner = svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').trim();
  symbols.push(`<symbol id="flag-${r.iso.toLowerCase()}" viewBox="${viewBox}">${inner}</symbol>`);
}
const sprite = `<svg xmlns="http://www.w3.org/2000/svg" style="display:none">\n<!-- Generated by scripts/build-country-data.mjs from country-flag-icons 1.6.20 (MIT). Do not edit. -->\n${symbols.join('\n')}\n</svg>\n`;
fs.mkdirSync(path.join(ROOT, 'public/flags'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'public/flags/flags.svg'), sprite);

console.log(`  countries written : ${ordered.length}`);
console.log(`  flags in sprite   : ${files}  (${bytesIn} bytes in, ${Buffer.byteLength(sprite)} bytes out)`);
console.log(`  no flag artwork   : ${missingFlags.length ? missingFlags.join(', ') : 'none'}`);
console.log(`  curated kept over metadata:\n    ${differences.join('\n    ') || 'none'}`);
