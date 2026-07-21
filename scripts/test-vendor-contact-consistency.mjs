/**
 * scripts/test-vendor-contact-consistency.mjs
 *
 * Structural guard for the vendor-contact pattern (dashboard round 6, item
 * 5) — this is the FIFTH time a "make every vendor form consistent" request
 * landed, because each previous pass aligned the drifted local copies
 * instead of deleting them, so they drifted again. This time the fix is
 * structural: src/components/vendors/VendorContactSection.jsx is the ONE
 * component every vendor/contact section renders, and
 * src/components/vendors/VendorFormModal.jsx is the ONE place the raw
 * VendorForm is ever mounted. Two checks, both static source scans (same
 * approach as scripts/test-route-collisions.mjs):
 *
 *   1. Every page known to store vendor/contact info imports
 *      VendorContactSection. Catches a page's vendor block getting
 *      hand-rolled back in.
 *   2. VendorForm.jsx is imported ONLY by VendorFormModal.jsx. Catches
 *      *any* new hand-rolled "add vendor" modal anywhere, not just a
 *      regression in the pages listed above — the exact failure mode that
 *      let this drift happen four times before.
 *
 * Usage: node scripts/test-vendor-contact-consistency.mjs
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dir, '..');

let failures = 0;
function fail(msg) { console.error(`  ✗ ${msg}`); failures++; }
function pass(msg) { console.log(`  ✓ ${msg}`); }

console.log('\n═══════════════════════════════════════════════════════');
console.log('  Vendor-contact consistency guard');
console.log('═══════════════════════════════════════════════════════\n');

// ── Check 1: every known vendor-contact page renders the shared section ───
console.log('Pages that must render VendorContactSection:');
const PAGES_REQUIRING_VENDOR_CONTACT_SECTION = [
  'src/pages/Styling.jsx',        // Florist + Decorator
  'src/pages/Beauty.jsx',         // Hair artist + Makeup artist
  'src/pages/FoodBeverage.jsx',   // Catering
  // Photography.jsx and Music.jsx are deliberately NOT in this list.
  // Photography.jsx's photographer/videographer picker runs on a separate
  // Photographer entity (via PhotographerForm.jsx/PhotographerList.jsx),
  // not Vendor — a real data-model difference, not the drift this guard
  // targets. Music.jsx's "Vendor" tab is a filtered-roster view (same
  // mechanic as Beauty's "Beauty team" tab), not a single-vendor-for-this-
  // section picker — there's no natural VendorContactSection slot on
  // either page, only a VendorFormModal for their own roster's add/edit.
];
for (const relPath of PAGES_REQUIRING_VENDOR_CONTACT_SECTION) {
  const abs = resolve(repoRoot, relPath);
  let src;
  try {
    src = readFileSync(abs, 'utf8');
  } catch {
    fail(`${relPath} — file not found (has it been renamed or deleted?)`);
    continue;
  }
  if (/from\s+['"][^'"]*vendors\/VendorContactSection['"]/.test(src)) {
    pass(`${relPath} imports VendorContactSection`);
  } else {
    fail(`${relPath} does NOT import VendorContactSection — is it hand-rolling its own vendor form again?`);
  }
}

// ── Check 2: VendorForm is mounted in exactly one place ────────────────────
console.log('\nVendorForm.jsx import sites:');
// Matches both "vendors/VendorForm" (imported from elsewhere in the app)
// and the bare "./VendorForm" (VendorFormModal.jsx's own same-directory
// import) — anchored on the filename itself, since the path prefix varies
// by the importer's own location.
let grepOut = '';
try {
  grepOut = execSync(
    `grep -rlE "/VendorForm['\\"]" src --include=*.jsx --include=*.js`,
    { cwd: repoRoot, encoding: 'utf8' }
  );
} catch (e) {
  // grep exits 1 when it finds nothing — that's a real failure state here,
  // not an error, since VendorFormModal.jsx itself must always match.
  grepOut = e.stdout || '';
}
const importers = grepOut.split('\n').map(l => l.trim()).filter(Boolean)
  .filter(f => f !== 'src/components/vendors/VendorForm.jsx') // the file itself, not an importer of itself
  .sort();
const ALLOWED_IMPORTERS = new Set(['src/components/vendors/VendorFormModal.jsx']);
const unexpected = importers.filter(f => !ALLOWED_IMPORTERS.has(f));
const missing = [...ALLOWED_IMPORTERS].filter(f => !importers.includes(f));

if (missing.length > 0) {
  for (const f of missing) fail(`${f} was expected to import VendorForm but doesn't — has the shared modal been restructured?`);
} else {
  pass('src/components/vendors/VendorFormModal.jsx imports VendorForm (as expected)');
}
if (unexpected.length > 0) {
  for (const f of unexpected) fail(`${f} imports VendorForm directly — every add/edit-vendor UI must go through VendorFormModal.jsx instead of mounting VendorForm itself.`);
} else {
  pass('No other file imports VendorForm directly');
}

console.log('\n───────────────────────────────────────────────────────');
if (failures > 0) {
  console.error(`  FAILED — ${failures} issue(s) found`);
  console.log('───────────────────────────────────────────────────────\n');
  process.exit(1);
} else {
  console.log('  PASSED — vendor-contact pattern stayed consolidated');
  console.log('───────────────────────────────────────────────────────\n');
}
