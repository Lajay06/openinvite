/**
 * NO NATIVE BROWSER DIALOG IN THE PRODUCT — A RATCHET, NOT A BAN.
 *
 * Owner ruling, Run 4 S3: "No prompt(), alert() or confirm() anywhere in the
 * product." The ruling is right and the product is 28 sites away from it, so
 * this is the instrument that makes the distance one-way.
 *
 * ── WHY THEY HAVE TO GO ────────────────────────────────────────────────────
 *
 * A native dialog is the one piece of interface we do not design: system type,
 * system buttons, the browser's own wording around ours, and on a phone it
 * arrives as a sheet with the site's hostname above it. `window.confirm` also
 * BLOCKS THE PAGE — every timer, every animation, every pending render stops
 * until it is answered — which is why the Chrome automation this programme
 * runs on refuses to proceed past one at all.
 *
 * The worst of them is `prompt()`: WhatsAppConnect.jsx:17 asks for the couple's
 * phone number through it, so the one field in the product that most needs a
 * country-code picker is a box the browser drew.
 *
 * ── WHY A RATCHET ──────────────────────────────────────────────────────────
 *
 * Twenty files, twenty-eight sites, and twenty of them are `confirm` on a
 * delete. Replacing those is a package of its own — every one needs a real
 * dialog with real copy — and a guard that fails until that package lands is
 * a guard someone deletes. So the known sites are frozen by name below and a
 * NEW one fails, exactly like the no-use-before-define ratchet:
 *
 *   removing a site  — free, and the count below must come down with it
 *   adding a site    — fails, until someone deliberately edits BASELINE
 *
 * The count is asserted as well as the list: a file that loses one dialog and
 * gains another would otherwise pass unchanged.
 */
import { pass, fail } from './_shared.mjs';
import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { trackedUnder } from './_trackedFiles.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

/**
 * The sites that existed when the ruling was made, 2026-09-15. THIS LIST MAY
 * ONLY SHRINK. A path whose count reaches zero comes out entirely.
 */
const BASELINE = {
  'src/components/games/GamesManager.jsx': 1,
  'src/components/guest-experience/HotelRecommendations.jsx': 1,
  'src/components/guests/SetEventsModal.jsx': 1,
  'src/components/invitations/InvitationBuilder.jsx': 2,
  'src/components/layout/CollaborateModal.jsx': 2,
  'src/components/messages/WhatsAppConnect.jsx': 1,
  'src/components/registry/ReceivedGifts.jsx': 1,
  'src/components/registry/RegistryProductList.jsx': 1,
  'src/components/rsvp/RSVPPage.jsx': 1,
  'src/components/vendors/VendorRosterSection.jsx': 1,
  'src/components/vendors/VendorSearch.jsx': 2,
  'src/pages/Budget.jsx': 1,
  'src/pages/EventDetails.jsx': 1,
  'src/pages/Guests.jsx': 2,
  'src/pages/Music.jsx': 1,
  'src/pages/OurStory.jsx': 1,
  'src/pages/Registry.jsx': 3,
  'src/pages/Seating.jsx': 3,
  'src/pages/Vendors.jsx': 1,
  'src/pages/VowsSpeeches.jsx': 1,
};

// `window.` qualified or bare, and never a method on something else:
// `toast.confirm(` and `this.alert(` are not what this is about.
const DIALOG = /(?:\bwindow\s*\.\s*(?:confirm|alert|prompt)\s*\(|(?<![.\w$])(?:confirm|alert|prompt)\s*\()/g;

const sitesIn = (src) => {
  // Comments describe these calls in several files, including this rule's own
  // notes; a mention is not a call.
  const code = src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
  return (code.match(DIALOG) || []).length;
};

export async function runNoNativeDialog() {
  const results = [];
  const check = (name, cond, detail) => results.push(cond ? pass(name, detail) : fail(name, 'see name', detail));

  console.log('\n  No native browser dialog — a ratchet on 28 known sites:\n');

  const files = [...trackedUnder('src', /\.(jsx?|mjs)$/), ...trackedUnder('api', /\.(jsx?|mjs)$/)];
  const found = {};
  for (const rel of files) {
    const n = sitesIn(readFileSync(join(ROOT, rel), 'utf8'));
    if (n > 0) found[rel] = n;
  }

  // PRESENCE BEFORE PROPERTIES: if the scan finds nothing at all it is broken,
  // not victorious — the baseline says there are 28.
  const total = Object.values(found).reduce((a, b) => a + b, 0);
  check('the scan reads the product source at all', files.length > 100 && total > 0,
    `${files.length} tracked file(s), ${total} dialog site(s)`);

  const added = Object.entries(found).filter(([f, n]) => n > (BASELINE[f] || 0));
  check('no file has gained a native dialog',
    added.length === 0,
    added.length ? added.map(([f, n]) => `${f}: ${BASELINE[f] || 0} -> ${n}`).join(', ') : 'none added');

  const newFiles = Object.keys(found).filter((f) => !(f in BASELINE));
  check('  and no new file has one',
    newFiles.length === 0, newFiles.join(', ') || 'no new file');

  // THE COUNT, NOT ONLY THE LIST. A file that loses one dialog and gains
  // another keeps its number and would pass the two checks above unchanged.
  // FEWER IS GOOD NEWS AND STILL FAILS, deliberately. A dialog removed without
  // the baseline coming down leaves slack the next one slips into for free, so
  // the ratchet only counts as tightened once it is written down. The first
  // version of this line read `stale.length === 0 || stale.every(...)`, which
  // is true whenever stale is non-empty — an assertion that could not fail.
  const stale = Object.entries(BASELINE).filter(([f, n]) => (found[f] || 0) < n);
  check('  and the baseline still matches what is there',
    stale.length === 0,
    stale.length ? `${stale.length} path(s) now have FEWER — bring the baseline down: ${stale.map(([f, n]) => `${f} ${n} -> ${found[f] || 0}`).join(', ')}` : 'exact');

  check(`the distance to the ruling is ${total}, and may only fall`,
    total <= 28, `${total} site(s) across ${Object.keys(found).length} file(s)`);

  return results;
}
