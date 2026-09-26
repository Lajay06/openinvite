/**
 * A couple who has seen the guidance never sees it again.
 *
 * ── THE GUARANTEE ─────────────────────────────────────────────────────────
 *
 * Goal 2026-09-25, item 2: "Flip the default on. Persist tourSeenAt as an ISO
 * timestamp the first time the tour completes or is skipped; append a page key
 * to dismissed when a 'What's here' panel is dismissed; never write either
 * field on a wedding that has not loaded. A couple who has already seen it
 * must never see it again after a reload — guard that."
 *
 * ── WHAT IS ACTUALLY AT RISK ───────────────────────────────────────────────
 *
 * Not the writing — the DECIDING. "Has this couple seen it" is read on every
 * dashboard load from a field that arrives in four shapes: absent (a record
 * written before the field existed), null, half-written (dismissed but no
 * tourSeenAt), and complete. Get any of those wrong and the tour returns to a
 * couple who dismissed it, which is the single failure this field was added to
 * prevent.
 *
 * So the decisions live in src/lib/guidanceState.js as pure functions over a
 * plain object, and this guard drives them through every shape. The round trip
 * is guarded separately and live — see guidance-persistence.mjs, which needs a
 * real record and runs from scripts/test-persistence.mjs, never in CI.
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pass, fail } from './_shared.mjs';
// DYNAMIC, INSIDE A try. A static import of a module that does not exist yet
// is a resolution error, which aborts the run before one check prints — a red
// CI naming nothing. Imported below instead, so every part of the guarantee
// that is unmet fails by name.

const __dir = dirname(fileURLToPath(import.meta.url));
const root = (p) => resolve(__dir, '../../', p);
const read = (p) => { try { return readFileSync(root(p), 'utf8'); } catch { return ''; } };
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const HOOK = strip(read('src/hooks/useGuidanceState.js'));
const TOUR_MOUNT = strip(read('src/components/guidance/FirstRunTour.jsx'));
const CONTROL = strip(read('src/components/guidance/WhatsHereControl.jsx'));
const LAYOUT = read('src/Layout.jsx');
const SEEN = '2026-09-26T10:00:00.000Z';

export async function runGuidanceRemembered() {
  const results = [];
  const check = (n, ok, d) => results.push(ok ? pass(n, d) : fail(n, 'see name', d));
  console.log('\n  Guidance — seen once, and it stays seen:\n');

  let L = {};
  try { L = await import('../../src/lib/guidanceState.js'); } catch { /* reported below */ }
  const { readGuidanceState, hasSeenTour, isDismissed, tourSeen, panelDismissed, EMPTY_GUIDANCE_STATE } = L;
  check('the decisions live in a module a test can read',
    typeof readGuidanceState === 'function', 'src/lib/guidanceState.js');
  if (typeof readGuidanceState !== 'function') {
    // The wiring is still readable without the module, and naming every unmet
    // part says far more than one failure and a stop.
    check('the tour is actually mounted', /<FirstRunTour/.test(LAYOUT), 'Layout.jsx');
    check('the flag is an off switch, not an on switch',
      /!== 'off'/.test(strip(read('src/lib/guidanceFlag.js'))), "anything but 'off' is on");
    check('a dismissed page hides its control',
      /isDismissed\(state, pathname\)/.test(CONTROL), 'no snooze button');
    return results;
  }

  // ── the four shapes a live record actually arrives in ─────────────────────
  const shapes = [
    ['absent', {}],
    ['null', { guidanceState: null }],
    ['empty object', { guidanceState: {} }],
    ['half-written (dismissed, no tourSeenAt)', { guidanceState: { dismissed: ['/Guests'] } }],
  ];
  for (const [label, record] of shapes) {
    const s = readGuidanceState(record);
    check(`a record with ${label} reads as "not yet", without throwing`,
      s.tourSeenAt === null && Array.isArray(s.dismissed), JSON.stringify(s));
  }
  check('a complete record reads back exactly',
    JSON.stringify(readGuidanceState({ guidanceState: { tourSeenAt: SEEN, dismissed: ['/Guests'] } }))
      === JSON.stringify({ tourSeenAt: SEEN, dismissed: ['/Guests'] }), 'round-trips');
  check('junk in dismissed is dropped, not trusted',
    JSON.stringify(readGuidanceState({ guidanceState: { dismissed: ['/Guests', 7, '', null] } }).dismissed)
      === JSON.stringify(['/Guests']), 'strings only');
  check('an empty-string timestamp is not a timestamp',
    readGuidanceState({ guidanceState: { tourSeenAt: '' } }).tourSeenAt === null, 'null');

  // ── THE GUARANTEE ─────────────────────────────────────────────────────────
  check('a couple who has seen the tour reads as seen', hasSeenTour({ tourSeenAt: SEEN }), 'true');
  check('  and one who has not, does not',
    !hasSeenTour({}) && !hasSeenTour(null) && !hasSeenTour({ tourSeenAt: null }), 'false for all three');
  check('  a second completion does NOT move the timestamp',
    tourSeen({ tourSeenAt: SEEN }) === null, 'no write, so the first time stands');
  check('  the first completion writes an ISO timestamp',
    /^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/.test(tourSeen({}, new Date(SEEN)).tourSeenAt), tourSeen({}, new Date(SEEN)).tourSeenAt);
  check('  and completing it does not disturb what was dismissed',
    JSON.stringify(tourSeen({ dismissed: ['/Guests'] }, new Date(SEEN)).dismissed) === JSON.stringify(['/Guests']),
    'dismissed preserved');

  // ── dismissal is a set in a field with no set type ────────────────────────
  check('dismissing a page appends it',
    JSON.stringify(panelDismissed({ dismissed: ['/Guests'] }, '/Schedule').dismissed)
      === JSON.stringify(['/Guests', '/Schedule']), 'appended');
  check('  dismissing it twice writes nothing',
    panelDismissed({ dismissed: ['/Guests'] }, '/Guests') === null, 'no duplicate');
  check('  and does not disturb the tour timestamp',
    panelDismissed({ tourSeenAt: SEEN }, '/Guests').tourSeenAt === SEEN, 'preserved');
  check('a dismissed page reads as dismissed', isDismissed({ dismissed: ['/Guests'] }, '/Guests'), 'true');
  check('  an undismissed one does not', !isDismissed({ dismissed: ['/Guests'] }, '/Schedule'), 'false');
  check('  and no path is not a dismissal', !isDismissed({ dismissed: ['/Guests'] }, ''), 'false');
  check('the empty state is the documented shape',
    JSON.stringify(EMPTY_GUIDANCE_STATE) === JSON.stringify({ tourSeenAt: null, dismissed: [] }),
    JSON.stringify(EMPTY_GUIDANCE_STATE));

  // ── never write on a wedding that has not loaded ──────────────────────────
  check('the hook refuses to write until the record has loaded',
    /if \(!next \|\| !ready \|\| !recordId\.current\) return;/.test(HOOK), 'three conditions');
  check('  it writes with the couple’s own client, not an endpoint or the admin key',
    /base44\.entities\.WeddingDetails\.update\(recordId\.current, \{ guidanceState: next \}\)/.test(HOOK)
      && !/ADMIN_KEY/.test(HOOK), 'owner-scoped RLS');
  check('  and a null transition is not a write',
    /if \(!next/.test(HOOK), 'tourSeen/panelDismissed return null when nothing changed');

  // ── the tour is mounted, and only under all four conditions ───────────────
  check('the tour is actually mounted now', /<FirstRunTour/.test(LAYOUT), 'Layout.jsx');
  check('  behind the flag', /if \(!isGuidanceEnabled\(\)\) return null;/.test(TOUR_MOUNT), 'flag');
  check('  and only once the record has loaded',
    /if \(!ready \|\| !onboardingComplete\) return null;/.test(TOUR_MOUNT), 'ready + onboarding');
  check('  and never to a couple who has seen it',
    /if \(hasSeenTour\(state\)/.test(TOUR_MOUNT), 'hasSeenTour');
  check('  Done and Skip both count as seen',
    /onFinish=\{markTourSeen\}/.test(TOUR_MOUNT) && /onClose=\{\(\) => \{ markTourSeen\(\)/.test(TOUR_MOUNT),
    'both exits write');
  check('  a collaborator is never shown it',
    /!isCollaborating && isOnboardingComplete\(user\)/.test(LAYOUT), 'owner sessions only');

  // ── a dismissed panel takes its control with it ───────────────────────────
  check('a dismissed page hides the control, not just the panel',
    /if \(isDismissed\(state, pathname\)\) return null;/.test(CONTROL), 'no snooze button');
  check('  and dismissal is offered only once the record has loaded',
    /const onDismiss = ready \?/.test(CONTROL), 'no promise the product cannot keep');

  return results;
}
