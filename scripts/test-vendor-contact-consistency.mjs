/**
 * scripts/test-vendor-contact-consistency.mjs
 *
 * Structural guard for the vendor pattern (dashboard round: vendor
 * consolidation, PR3a) — this is the SIXTH time a "make every vendor UI
 * consistent" request landed. The five before it each aligned the drifted
 * local copies instead of deleting them, so they drifted again; the sixth
 * time (this one) the drift wasn't even a hand-rolled form — Beauty.jsx and
 * Music.jsx each independently re-wired the SAME shared primitives
 * (VendorFormModal + VendorList) with their own local add/edit/delete
 * glue code, which the previous version of this guard had no way to catch
 * (it only checked for hand-rolled forms bypassing the shared components
 * entirely, not two pages composing the same shared components two
 * different ways).
 *
 * The structural fix this time: there are now exactly TWO composed
 * building blocks, never assembled by a page itself —
 *   - src/components/vendors/VendorContactSection.jsx — a single
 *     vendor-for-this-section picker (Styling's Florist, Beauty's Hair
 *     artist, FoodBeverage's Catering, etc.)
 *   - src/components/vendors/VendorRosterSection.jsx — a multi-vendor
 *     roster for one category (Beauty's "Beauty team" tab, Music's
 *     "Vendor" tab)
 * Both are built from the same two primitives, VendorFormModal.jsx (the
 * add/edit modal) and VendorList.jsx (the table) — but a page never
 * mounts those primitives itself; it only ever imports one of the two
 * composed sections above. src/pages/Vendors.jsx (the standalone "My
 * vendors" admin page, covering every category at once) is the one
 * documented exception — see ALLOWED_PRIMITIVE_IMPORTERS below.
 *
 * Four static-source-scan checks (same approach as
 * scripts/test-route-collisions.mjs):
 *
 *   1. Every page known to store a single vendor/contact-for-this-section
 *      imports VendorContactSection.
 *   2. Every page known to track a multi-vendor roster for one category
 *      imports VendorRosterSection.
 *   3. VendorForm.jsx (the raw field-level form) is imported ONLY by
 *      VendorFormModal.jsx.
 *   4. VendorFormModal.jsx and VendorList.jsx are imported ONLY by the two
 *      composed sections above, plus the documented Vendors.jsx exception
 *      — catches a page re-wiring the primitives itself, not just a page
 *      hand-rolling its own form from scratch (the exact class of drift
 *      that got past the previous version of this guard).
 *
 * Plus one entity-schema check:
 *
 *   5. No second "vendor-like" entity exists alongside base44/entities/
 *      Vendor.jsonc — structurally fingerprinted (contact_person + status
 *      + quoted_price, the three fields unique to a vendor-tracking
 *      entity in this schema set), not by name, so a rename can't dodge
 *      it. Photographer.jsonc was exactly this — a full parallel
 *      implementation, retired in PR3b (migrated into Vendor). If
 *      ALLOWED_VENDOR_LIKE_ENTITIES ever needs a second name added,
 *      that's a real regression, not upkeep.
 *
 * Usage: node scripts/test-vendor-contact-consistency.mjs
 */

import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dir, '..');

let failures = 0;
function fail(msg) { console.error(`  ✗ ${msg}`); failures++; }
function pass(msg) { console.log(`  ✓ ${msg}`); }

console.log('\n═══════════════════════════════════════════════════════');
console.log('  Vendor pattern consistency guard');
console.log('═══════════════════════════════════════════════════════\n');

function importsFrom(src, componentPath) {
  const re = new RegExp(`from\\s+['"][^'"]*${componentPath}['"]`);
  return re.test(src);
}

function readSrc(relPath) {
  try {
    return readFileSync(resolve(repoRoot, relPath), 'utf8');
  } catch {
    return null;
  }
}

// ── Check 1: single-vendor-slot pages render VendorContactSection ─────────
console.log('Pages that must render VendorContactSection (single vendor-for-this-section slot):');
const PAGES_REQUIRING_VENDOR_CONTACT_SECTION = [
  'src/pages/Styling.jsx',        // Florist + Decorator
  'src/pages/Beauty.jsx',         // Hair artist + Makeup artist
  'src/pages/FoodBeverage.jsx',   // Catering
];
for (const relPath of PAGES_REQUIRING_VENDOR_CONTACT_SECTION) {
  const src = readSrc(relPath);
  if (src === null) { fail(`${relPath} — file not found (has it been renamed or deleted?)`); continue; }
  if (importsFrom(src, 'vendors/VendorContactSection')) pass(`${relPath} imports VendorContactSection`);
  else fail(`${relPath} does NOT import VendorContactSection — is it hand-rolling its own vendor picker again?`);
}

// ── Check 2: multi-vendor-roster pages render VendorRosterSection ─────────
console.log('\nPages that must render VendorRosterSection (multi-vendor roster for one category):');
const PAGES_REQUIRING_VENDOR_ROSTER_SECTION = [
  'src/pages/Beauty.jsx',   // "Beauty team" tab
  'src/pages/Music.jsx',    // "Vendor" tab
];
for (const relPath of PAGES_REQUIRING_VENDOR_ROSTER_SECTION) {
  const src = readSrc(relPath);
  if (src === null) { fail(`${relPath} — file not found (has it been renamed or deleted?)`); continue; }
  if (importsFrom(src, 'vendors/VendorRosterSection')) pass(`${relPath} imports VendorRosterSection`);
  else fail(`${relPath} does NOT import VendorRosterSection — is it re-wiring VendorFormModal/VendorList itself again?`);
}

// ── Check 3: VendorForm is mounted in exactly one place ────────────────────
console.log('\nVendorForm.jsx import sites:');
function findImporters(filename) {
  // Import specifiers omit the extension ("./VendorFormModal", never
  // "./VendorFormModal.jsx") — match on the bare module name.
  const moduleName = filename.replace(/\.jsx?$/, '');
  const results = [];
  const walk = (dir) => {
    for (const entry of readdirSync(resolve(repoRoot, dir), { withFileTypes: true })) {
      const rel = join(dir, entry.name);
      if (entry.isDirectory()) { walk(rel); continue; }
      if (!/\.(jsx?|mjs)$/.test(entry.name)) continue;
      const src = readFileSync(resolve(repoRoot, rel), 'utf8');
      if (new RegExp(`/${moduleName}['"]`).test(src)) results.push(rel.replace(/\\/g, '/'));
    }
  };
  walk('src');
  return results.sort();
}

// `required` importers must ALL import the file; `alsoAllowed` MAY import
// it but their absence isn't a failure (e.g. Vendors.jsx composing
// VendorList.jsx is fine either way it's built). Anything outside
// required+alsoAllowed importing the file is always a failure.
function checkImporters(filename, { required = [], alsoAllowed = [], selfPath } = {}) {
  const importers = findImporters(filename).filter(f => f !== selfPath);
  const allowedSet = new Set([...required, ...alsoAllowed]);
  const missing = required.filter(f => !importers.includes(f));
  const unexpected = importers.filter(f => !allowedSet.has(f));
  for (const f of missing) fail(`${f} was expected to import ${filename} but doesn't — has the shared component been restructured?`);
  for (const f of unexpected) fail(`${f} imports ${filename} directly — every vendor UI must go through VendorContactSection or VendorRosterSection instead of mounting ${filename} itself.`);
  if (missing.length === 0 && unexpected.length === 0) pass(`${filename} is imported only by: ${importers.join(', ') || '(nobody)'}`);
}

checkImporters('VendorForm.jsx', {
  required: ['src/components/vendors/VendorFormModal.jsx'],
  selfPath: 'src/components/vendors/VendorForm.jsx',
});

// ── Check 4: VendorFormModal / VendorList are only ever composed by the
// two shared sections (or the documented Vendors.jsx admin-page exception),
// never re-wired by an individual category page ─────────────────────────
console.log('\nVendorFormModal.jsx / VendorList.jsx import sites (the primitives a page must never compose itself):');
// Documented exception: the standalone "My vendors" admin page spans every
// category at once, which neither composed section is shaped for (both
// are scoped to a single category) — the one place the primitives are
// legitimately mounted directly.
const VENDORS_ADMIN_PAGE = 'src/pages/Vendors.jsx';

checkImporters('VendorFormModal.jsx', {
  required: [
    'src/components/vendors/VendorContactSection.jsx',
    'src/components/vendors/VendorRosterSection.jsx',
  ],
  alsoAllowed: [VENDORS_ADMIN_PAGE],
  selfPath: 'src/components/vendors/VendorFormModal.jsx',
});
checkImporters('VendorList.jsx', {
  required: ['src/components/vendors/VendorRosterSection.jsx'],
  alsoAllowed: [VENDORS_ADMIN_PAGE],
  selfPath: 'src/components/vendors/VendorList.jsx',
});

// ── Check 5: no second vendor-like entity schema ───────────────────────────
console.log('\nEntity schema check — no second vendor-like entity:');
// Photographer.jsonc (the prior tracked exception, see file header) was
// retired in PR3b. Adding a name here would mean a NEW vendor-like entity
// regressed in, which this check exists to catch.
const ALLOWED_VENDOR_LIKE_ENTITIES = new Set(['Vendor']);
const VENDOR_FINGERPRINT_FIELDS = ['contact_person', 'status', 'quoted_price'];
const entitiesDir = resolve(repoRoot, 'base44/entities');
let vendorLikeFound = [];
for (const entry of readdirSync(entitiesDir, { withFileTypes: true })) {
  if (!entry.name.endsWith('.jsonc')) continue;
  const entityName = entry.name.replace(/\.jsonc$/, '');
  if (entityName === 'Vendor') continue;
  let json;
  try {
    // .jsonc files here have no comments in practice, but strip // lines defensively.
    const raw = readFileSync(resolve(entitiesDir, entry.name), 'utf8').replace(/^\s*\/\/.*$/gm, '');
    json = JSON.parse(raw);
  } catch {
    continue;
  }
  const props = Object.keys(json.properties || {});
  const isVendorLike = VENDOR_FINGERPRINT_FIELDS.every(f => props.includes(f));
  if (isVendorLike) vendorLikeFound.push(entityName);
}
const unexpectedVendorLike = vendorLikeFound.filter(name => !ALLOWED_VENDOR_LIKE_ENTITIES.has(name));
if (unexpectedVendorLike.length > 0) {
  for (const name of unexpectedVendorLike) {
    fail(`base44/entities/${name}.jsonc looks vendor-like (has contact_person + status + quoted_price) but isn't in ALLOWED_VENDOR_LIKE_ENTITIES — a second vendor-tracking entity has been introduced. Every vendor should live on the Vendor entity instead.`);
  }
} else {
  pass(`No unexpected vendor-like entity found (allowed: ${[...ALLOWED_VENDOR_LIKE_ENTITIES].join(', ')})`);
}

console.log('\n───────────────────────────────────────────────────────');
if (failures > 0) {
  console.error(`  FAILED — ${failures} issue(s) found`);
  console.log('───────────────────────────────────────────────────────\n');
  process.exit(1);
} else {
  console.log('  PASSED — vendor pattern stayed consolidated');
  console.log('───────────────────────────────────────────────────────\n');
}
