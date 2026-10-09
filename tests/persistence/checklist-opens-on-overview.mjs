/**
 * Checklist opens on Planning overview, and My checklist is gone.
 *
 * ── THE RULING ─────────────────────────────────────────────────────────────
 *
 * Round two, item 6: "Checklist: delete the 'My checklist' sub-tab entirely.
 * Keep Planning overview. Remove the sub-tab bar and its heading so the
 * Checklist tab opens straight into Planning overview."
 *
 * The page sat inside TWO tab bars. The outer one is the To do hub's
 * (To do | Checklist) and is untouched. The inner one was this page's own
 * (My checklist | Planning overview), and it is the one that goes.
 *
 * ── WHY NOTHING IS MIGRATED ────────────────────────────────────────────────
 *
 * My checklist read and wrote `localStorage['oi_checklist']` and nothing else.
 * It never reached Base44, so it lived in one browser on one device: ticks
 * made on a laptop were absent on a phone, a collaborator saw none of it, and
 * clearing site data erased it silently. There is no server-side row to move
 * and a backfill would have nothing to read from.
 *
 * The stat strip went with it. Overall progress / Essentials done /
 * Nice-to-haves done counted that list and only that list, so keeping the
 * strip would have left three zeros over a list that no longer exists.
 *
 * ── WHAT MUST NOT HAVE GONE WITH IT ────────────────────────────────────────
 *
 * Planning overview reads the couple's REAL records — guests, budgets,
 * vendors, schedules, notes — through getMyRecords. That is the half of this
 * page with data behind it, and the half a removal could most easily damage,
 * so it is checked here as carefully as the removal is.
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pass, fail, stripComments } from './_shared.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = (p) => resolve(__dir, '../../', p);
const read = (p) => readFileSync(root(p), 'utf8');
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const PAGE = read('src/pages/Checklist.jsx');
const CODE = strip(PAGE);
const HUB = strip(read('src/pages/TasksHub.jsx'));

export async function runChecklistOpensOnOverview() {
  const results = [];
  const check = (n, ok, d) => results.push(ok ? pass(n, d) : fail(n, 'see name', d));
  console.log('\n  Checklist — straight into Planning overview:\n');

  // ── The sub-tab bar and everything that drove it ──────────────────────────
  check('the "My checklist" sub-tab is gone', !/My checklist/.test(CODE), 'no label');
  check('  and the sub-tab bar with it', !/const TABS = \[/.test(CODE), 'no TABS');
  check('  and the state that switched between them', !/activeTab/.test(CODE), 'no activeTab');
  check('  so Planning overview renders unconditionally',
    /<PlanningOverview \/>/.test(CODE) && !/activeTab === 'overview'/.test(CODE), 'no gate');

  // ── The local-only list and its summary ───────────────────────────────────
  check('nothing reads or writes the browser-only checklist any more',
    !/oi_checklist/.test(CODE), 'no localStorage key');
  check('  and its lists, toggles and rows are deleted, not left unreferenced',
    !/ESSENTIALS_DEFAULT/.test(CODE) && !/NICE_TO_HAVE_DEFAULT/.test(CODE)
      && !/loadChecklist/.test(CODE) && !/ChecklistSection/.test(CODE)
      && !/toggleEssential/.test(CODE) && !/toggleNice/.test(CODE),
    'all six gone');
  check('  the stat strip that counted only that list is gone too',
    !/Essentials done/.test(CODE) && !/Nice-to-haves done/.test(CODE)
      && !/Overall progress/.test(CODE),
    'no strip');

  // ── What had to survive ───────────────────────────────────────────────────
  check('Planning overview is still here and still reads the real records',
    /function PlanningOverview\(\)/.test(CODE) && /getMyRecords/.test(CODE)
      && /getMyGuestsWithRsvp/.test(CODE),
    'live data, not localStorage');
  check('  and still evaluates every overview group',
    /OVERVIEW_GROUPS/.test(CODE) && /evaluateStatus/.test(CODE), 'groups intact');
  check('the page header is still suppressed when embedded in the To do hub',
    /\{!embedded && <DashboardPageHeader/.test(CODE), 'embedded prop honoured');
  check('  and the hub still renders it embedded, with its own outer tabs',
    /<ChecklistPage embedded \/>/.test(HUB) && /label: "Checklist"/.test(HUB), 'outer bar untouched');
  check('Ava is still reachable from the page',
    /<AvaButton label="Ask Ava to review your checklist"/.test(CODE) && /<AvaModal/.test(CODE), 'button and modal');
  check('  and her prompt is US English',
    /prioritize/.test(CODE) && !/prioritise/.test(CODE), 'prioritize');

  // ── "WEDDING DATE SET" READS THE RECORD, NOT THE BROWSER ────────────────
  //
  // Lane B's fixture audit, 2026-10-09. The item was
  // !!localStorage.getItem('oi_wedding_date'), so a couple whose date is
  // saved saw it as not done on any browser that had not cached the key: a
  // new device, a private window, cleared site data, or a session that never
  // passed through the screen which writes it.
  //
  // THIS RUNS UNDER NODE, WHERE THERE IS NO localStorage AT ALL, which is the
  // fresh-browser-profile case exactly. The old implementation would not have
  // returned false here, it would have THROWN on an undefined global, so this
  // is also why evaluateStatus had to be exported to be testable.
  const { evaluateStatus } = await import('../../src/lib/checklistStatus.js');
  {
    const empty = { guests: [], budgets: [], vendors: [], schedules: [], notes: [] };
    const withDate = evaluateStatus({ wedding: { weddingDate: '2027-05-01' }, ...empty });
    results.push(withDate.wedding_date === true
      ? pass('a fixture wedding with a date shows "Wedding date set" as done', 'done')
      : fail('a fixture wedding with a date shows "Wedding date set" as done', true, withDate.wedding_date));
    const noDate = evaluateStatus({ wedding: { weddingDate: null }, ...empty });
    results.push(noDate.wedding_date === false
      ? pass('  and a wedding with no date still shows it as not done', 'not done')
      : fail('  and a wedding with no date still shows it as not done', false, noDate.wedding_date));
    const noWedding = evaluateStatus({ wedding: null, ...empty });
    results.push(noWedding.wedding_date === false
      ? pass('  and no wedding record at all does not throw', 'not done')
      : fail('  and no wedding record at all does not throw', false, noWedding.wedding_date));

    // ── "WEDDING LOCATION SET" READS THE RECORD TOO ───────────────────────
    //
    // Same bug, same fix, ruled 2026-10-09: the ceremony's venue, or the
    // reception's when the ceremony has none. Written as a table because the
    // fallback has an order and the order is the part worth pinning.
    const LOCATION = [
      [{ mainCeremony: { venueName: 'St Mary' } }, true, 'a ceremony venue name'],
      [{ mainCeremony: { address: '12 Flinders Lane' } }, true, 'a ceremony address alone'],
      [{ mainCeremony: {}, reception: { venueName: 'The Grounds' } }, true, 'the reception when the ceremony is empty'],
      [{ reception: { address: '5 Smith St' } }, true, 'a reception address alone'],
      [{ mainCeremony: {}, reception: {} }, false, 'both present but empty'],
      [{}, false, 'no events at all'],
      [{ mainCeremony: { venueName: '' } }, false, 'an empty string is not a place'],
    ];
    for (const [wedding, want, why] of LOCATION) {
      const got = evaluateStatus({ wedding, ...empty }).wedding_city;
      results.push(got === want
        ? pass(`location: ${why} reads ${want ? 'done' : 'not done'}`, String(got))
        : fail(`location: ${why} reads ${want ? 'done' : 'not done'}`, want, got));
    }
  }
  check('the item no longer reads oi_wedding_date anywhere',
    !/oi_wedding_date/.test(stripComments(CODE))
      && !/oi_wedding_date/.test(stripComments(readFileSync(root('src/lib/checklistStatus.js'), 'utf8')))
      && !/oi_wedding_city/.test(stripComments(readFileSync(root('src/lib/checklistStatus.js'), 'utf8')))
      && !/localStorage/.test(stripComments(readFileSync(root('src/lib/checklistStatus.js'), 'utf8'))),
    'reads the record');

  return results;
}
