/**
 * The schedule leaves as one workbook, and it carries what the page shows.
 *
 * ── THE RULING ─────────────────────────────────────────────────────────────
 *
 * Round two, item 9: "Replace the export with one button producing one .xlsx
 * with two sheets: 'All events' — every scheduled item including pre-wedding
 * tasks like 'book the celebrant', chronological — and 'Run sheet'. List,
 * calendar and run sheet remain as views; only the export changes."
 *
 * ── THE DEFECT THE OLD EXPORT HAD, WHICH IS THE REASON FOR THE FIRST SHEET ──
 *
 * The CSV mapped `scheduleItems` — the Schedule entity's own rows, and nothing
 * else. The List on that page shows more: to-dos with a date, vendor meetings
 * and contract dates, the RSVP and music deadlines, the ceremony and the
 * reception. So a couple who exported their schedule got a file with
 * "book the celebrant" missing, and every other row they could see on the
 * page, and nothing told them.
 *
 * The first sheet is built from the SAME rows the List renders. That is the
 * property this guard is mostly about.
 *
 * ── NO NEW DEPENDENCY, AND THAT IS CHECKED ─────────────────────────────────
 *
 * `xlsx` (SheetJS, Apache-2.0) was already a dependency and already used for
 * READING an uploaded guest list. Writing is the same package, imported
 * dynamically so it stays out of the bundle for couples who never export.
 *
 * ── WHY THE SORT COLUMN EXISTS ─────────────────────────────────────────────
 *
 * Every row carries both the printed day and the stored YYYY-MM-DD. A
 * spreadsheet's own sort on "Sat, Jul 3, 2027" is a lexical coin toss — the
 * exact defect scheduleOrder.js exists to end, and one the file would
 * reintroduce the moment someone clicked a column header.
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pass, fail } from './_shared.mjs';
// DYNAMIC, INSIDE A try. A static import of a module that does not exist is a
// resolution error, which aborts the run before one check prints — a red CI
// naming nothing. Imported below instead, so "the builder exists" fails as its
// own check and the run reports what it found.

const __dir = dirname(fileURLToPath(import.meta.url));
const root = (p) => resolve(__dir, '../../', p);
const read = (p) => { try { return readFileSync(root(p), 'utf8'); } catch { return ''; } };
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const HUB = strip(read('src/pages/ScheduleHub.jsx'));
const LIB = strip(read('src/lib/scheduleWorkbook.js'));
const PKG = JSON.parse(read('package.json') || '{}');

/** The List's rows, as buildScheduleEvents emits them: schedule AND everything else. */
const EVENTS = [
  { title: 'Reception', date: '2027-07-03', time: '17:00', when: 'wedding-day', location: 'The Terrace', type: 'schedule' },
  { title: 'Book the celebrant', date: '2027-01-09', time: '', when: 'todo', source: 'To do', readOnly: true, notes: 'ring first' },
  { title: 'Ceremony', date: '2027-07-03', time: '9:00', when: 'wedding-day', type: 'schedule' },
  { title: 'Florist — contract signed', date: '2027-02-14', time: '', when: 'vendor', source: 'Vendors', readOnly: true },
  { title: 'A moment with no day', date: '', time: '', when: 'planning', type: 'schedule' },
];

const ITEMS = [
  { id: 1, category: 'reception', event_name: 'First dance', event_date: '2027-07-03', start_time: '20:00' },
  { id: 2, category: 'reception', event_name: 'Speeches', event_date: '2027-07-03', start_time: '19:00', responsible_person: 'Best man' },
  { id: 3, category: 'ceremony', event_name: 'Guests seated', event_date: '2027-07-03', start_time: '9:00' },
];

export async function runScheduleWorkbook() {
  const results = [];
  const check = (n, ok, d) => results.push(ok ? pass(n, d) : fail(n, 'see name', d));
  console.log('\n  Schedule export — one workbook, two sheets, everything the page shows:\n');

  let workbook = {};
  try { workbook = await import('../../src/lib/scheduleWorkbook.js'); } catch { /* reported below */ }
  const build = workbook.buildScheduleWorkbook;
  check('the workbook builder exists', typeof build === 'function', 'buildScheduleWorkbook');
  if (typeof build !== 'function') {
    check('the page has one export button, and it is not a CSV any more',
      !/Export CSV/.test(HUB) && />\s*Export\s*</.test(HUB), 'Export');
    check('  nothing on the page builds a CSV any more',
      !/text\/csv/.test(HUB) && !/wedding-schedule\.csv/.test(HUB), 'no csv');
    return results;
  }

  const sheets = build({ events: EVENTS, scheduleItems: ITEMS });
  check('two sheets, in order', sheets.length === 2 && sheets[0].name === 'All events' && sheets[1].name === 'Run sheet',
    sheets.map((s) => s.name).join(' | '));

  // ── Sheet one carries the whole List, not just the Schedule entity ────────
  const all = sheets[0].rows;
  check('every row the List shows is in the workbook', all.length === EVENTS.length, `${all.length} of ${EVENTS.length}`);
  check('  including the to-do the old CSV dropped',
    all.some((r) => r.Event === 'Book the celebrant'), '"book the celebrant"');
  check('  and the vendor date', all.some((r) => r.Event === 'Florist — contract signed'), 'vendor row');

  // ── Chronological, with untimed last ──────────────────────────────────────
  check('chronological by day, then by time as MINUTES not text',
    all.map((r) => r.Event).slice(0, 4).join(' → ')
      === 'Book the celebrant → Florist — contract signed → Ceremony → Reception',
    all.map((r) => r.Event).join(' → '));
  check('  9:00 sorts before 17:00, which text comparison gets wrong',
    all.findIndex((r) => r.Event === 'Ceremony') < all.findIndex((r) => r.Event === 'Reception'), 'parsed, not compared');
  check('  and an undated row is last, per the ruling',
    all[all.length - 1].Event === 'A moment with no day', all[all.length - 1].Event);

  // ── The sort column ───────────────────────────────────────────────────────
  check('every row carries the stored date as well as the printed one',
    all.every((r) => 'Sort date' in r && 'Date' in r), 'both columns');
  check('  the stored one is the ISO day, so a re-sort in Excel is still chronological',
    all.find((r) => r.Event === 'Ceremony')['Sort date'] === '2027-07-03', 'YYYY-MM-DD');
  check('  and the printed one is readable',
    /Jul/.test(all.find((r) => r.Event === 'Ceremony').Date), all.find((r) => r.Event === 'Ceremony').Date);

  // ── Where a row is edited ─────────────────────────────────────────────────
  check('a row says where it is edited, so a reader knows where to change it',
    all.find((r) => r.Event === 'Book the celebrant')['Edited in'] === 'To do'
      && all.find((r) => r.Event === 'Ceremony')['Edited in'] === 'Schedule',
    'To do / Schedule');
  check('  and a to-do’s empty venue shows its home rather than a blank',
    all.find((r) => r.Event === 'Book the celebrant').Location === 'To do', 'Location falls back to source');

  // ── Sheet two ─────────────────────────────────────────────────────────────
  const run = sheets[1].rows;
  check('the run sheet carries every event, not just the one on screen',
    new Set(run.map((r) => r.Event)).size === 2, [...new Set(run.map((r) => r.Event))].join(', '));
  check('  each row names its event so the sheet can be split or filtered',
    run.every((r) => !!r.Event), 'every row tagged');
  check('  in time order within the event',
    run.filter((r) => r.Event === 'Reception').map((r) => r.Moment).join(' → ') === 'Speeches → First dance',
    'Speeches before First dance');
  check('  and it carries who owns a moment',
    run.find((r) => r.Moment === 'Speeches')['Who owns it'] === 'Best man', 'responsible_person');

  // ── An empty wedding still gets a shaped file ─────────────────────────────
  const empty = build({ events: [], scheduleItems: [] });
  check('a wedding with nothing in it still gets both sheets',
    empty.length === 2 && empty.every((s) => s.rows.length === 0), 'two empty sheets, not one');
  check('  and the writer still gives them their headers',
    /emptyRowFor\(sheet\.name\)/.test(LIB), 'header from the empty shape');

  // ── One button, and the .ics is not it ────────────────────────────────────
  check('the page has one export button, and it is not a CSV any more',
    !/Export CSV/.test(HUB) && />\s*Export\s*</.test(HUB), 'Export');
  check('  nothing on the page builds a CSV any more',
    !/text\/csv/.test(HUB) && !/wedding-schedule\.csv/.test(HUB), 'no csv');
  check('  the .ics button stays — it answers a different question',
    /Download a snapshot \(\.ics\)/.test(HUB), 'add to calendar, not export');
  check('the button builds the workbook from the List’s own rows',
    /downloadScheduleWorkbook\(buildScheduleWorkbook\(\{ events, scheduleItems \}\)\)/.test(HUB), 'same rows');

  // ── The dependency ────────────────────────────────────────────────────────
  check('xlsx was already a dependency — nothing new was added',
    !!(PKG.dependencies || {}).xlsx, (PKG.dependencies || {}).xlsx || 'MISSING');
  check('  and it is imported on demand, not into the bundle',
    /await import\('xlsx'\)/.test(LIB), 'dynamic import');

  return results;
}
