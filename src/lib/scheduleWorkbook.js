/**
 * src/lib/scheduleWorkbook.js — the schedule leaves as one workbook.
 *
 * ── THE RULING ─────────────────────────────────────────────────────────────
 *
 * Round two, item 9: "Replace the export with one button producing one .xlsx
 * with two sheets: 'All events' — every scheduled item including pre-wedding
 * tasks like 'book the celebrant', chronological — and 'Run sheet'. List,
 * calendar and run sheet remain as views; only the export changes."
 *
 * ── WHAT THE CSV WAS MISSING, AND WHY THAT IS THE POINT ────────────────────
 *
 * The old export mapped `scheduleItems` — the Schedule entity's own rows, and
 * nothing else. The List on screen shows more than that: to-dos with a date,
 * vendor meetings and contract dates, the RSVP deadline, the music deadline,
 * the ceremony and reception themselves. So a couple who exported their
 * schedule got a file that was missing "book the celebrant" and every other
 * row they could see on the page, with nothing saying so.
 *
 * The workbook's first sheet is built from the SAME rows the List renders, so
 * the file and the page can no longer disagree.
 *
 * ── NO NEW DEPENDENCY ──────────────────────────────────────────────────────
 *
 * `xlsx` (SheetJS, Apache-2.0) is already a dependency and already used, for
 * READING an uploaded guest list in src/lib/guestImport.js. Writing is the
 * same package. It is imported dynamically, exactly as guestImport does, so it
 * stays out of the main bundle for the couples who never press the button.
 *
 * ── THIS FILE IS PURE; THE DOWNLOAD IS NOT ─────────────────────────────────
 *
 * buildScheduleWorkbook() takes rows and returns sheets. It touches no DOM, no
 * network and no entity, so the shape of the file is testable without a
 * browser — which is the half that has been wrong before.
 */
import { compareDayThenTime } from './scheduleOrder.js';
import { WHEN_LABEL, CATEGORY_LABEL, eventsInSchedule, runSheetFor } from './scheduleEvents.js';

/** "Sat 3 Jul 2027" from a stored YYYY-MM-DD, read as a LOCAL day. */
function dateLabel(key) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(key || ''));
  if (!m) return '';
  const [, y, mo, d] = m;
  return new Date(Number(y), Number(mo) - 1, Number(d))
    .toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

/** "3:00 PM" from "15:00". Empty rather than an em dash — a spreadsheet cell. */
function timeLabel(t) {
  if (!t) return '';
  const [h, m] = String(t).split(':').map(Number);
  if (Number.isNaN(h)) return String(t);
  return `${h % 12 || 12}:${String(m || 0).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

/**
 * BOTH FORMS OF THE DAY, IN EVERY ROW.
 *
 * "Date" is the printed label a person reads. "Sort date" is the stored
 * YYYY-MM-DD, because a spreadsheet's own sort on "Sat 3 Jul 2027" is a
 * lexical coin toss — the exact defect scheduleOrder.js exists to end, and one
 * the file would otherwise reintroduce the moment someone clicked a column
 * header. The rows arrive already in order; the column is there so they can be
 * put back into it.
 */
const DAY_COLUMNS = (row) => ({
  Date: dateLabel(row.date),
  'Sort date': row.date || '',
  Time: timeLabel(row.time),
});

/**
 * Sheet one — every item the List shows, chronological.
 *
 * @param {Array} events  buildScheduleEvents() output — the List's own rows
 */
export function allEventsSheet(events = []) {
  // THE ONE COMPARATOR, on the List's own field names. Day first, then time
  // as minutes — never localeCompare on "9:00", which sorts after "17:00" —
  // and an undated or untimed row last, which is the owner's ruling.
  //
  // compareDayThenTime rather than a named row-sorter because that wrapper
  // arrives with the chronological-order PR and is not on main yet; the
  // comparator underneath is the same one, so the two cannot disagree. Worth
  // collapsing to the wrapper once that PR lands.
  const ordered = [...events].sort((a, b) => compareDayThenTime(a.date, a.time, b.date, b.time));
  return ordered.map((e) => ({
    ...DAY_COLUMNS(e),
    Event: e.title || '',
    Type: WHEN_LABEL[e.when] || '',
    // A to-do has no venue; what it has is a home, and naming it is more use
    // than a blank cell. Same rule the List's Location column follows.
    Location: e.location || (e.readOnly ? e.source || '' : ''),
    Notes: e.notes || e.description || '',
    // WHERE THE ROW IS EDITED. A caterer handed this file and asked to change
    // something needs to know the couple edits "book the celebrant" on To do,
    // not on Schedule.
    'Edited in': e.type === 'schedule' ? 'Schedule' : (e.source || ''),
  }));
}

/**
 * Sheet two — every event's order of proceedings, one after another.
 *
 * The run sheet on screen shows ONE event at a time, because that is what a
 * person holding it on the day needs. A workbook is not a view: it is the
 * thing you print and hand over, so it carries all of them, each row naming
 * its event so the sheet can be filtered or split by whoever receives it.
 *
 * @param {Array} scheduleItems  Schedule entity rows
 */
export function runSheetSheet(scheduleItems = []) {
  const rows = [];
  for (const ev of eventsInSchedule(scheduleItems)) {
    for (const r of runSheetFor(scheduleItems, ev.key)) {
      rows.push({
        Event: ev.label || CATEGORY_LABEL[ev.key] || String(ev.key),
        Date: dateLabel(r.event_date),
        'Sort date': r.event_date || '',
        Time: timeLabel(r.start_time),
        Ends: timeLabel(r.end_time),
        Moment: r.event_name || '',
        Location: r.location || '',
        'Who owns it': r.responsible_person || '',
        Notes: r.notes || r.description || '',
      });
    }
  }
  return rows;
}

/**
 * The whole workbook, as plain data.
 *
 * @returns {{name: string, rows: Array}[]} one entry per sheet, in order
 */
export function buildScheduleWorkbook({ events = [], scheduleItems = [] } = {}) {
  return [
    { name: 'All events', rows: allEventsSheet(events) },
    { name: 'Run sheet', rows: runSheetSheet(scheduleItems) },
  ];
}

/**
 * Write the workbook and hand it to the browser.
 *
 * AN EMPTY SHEET IS STILL A SHEET. A wedding with no run-sheet moments gets a
 * "Run sheet" tab with its headers and no rows, rather than a workbook whose
 * tabs change depending on how far along the couple is — a file whose shape
 * varies is a file nobody can build on.
 */
export async function downloadScheduleWorkbook(sheets, filename = 'wedding-schedule.xlsx') {
  const XLSX = await import('xlsx');
  const book = XLSX.utils.book_new();
  for (const sheet of sheets) {
    // The header comes from a real row when there is one, and from the empty
    // shape when there is not — so an empty sheet still arrives with its
    // columns rather than as a blank tab.
    const header = Object.keys(sheet.rows[0] || emptyRowFor(sheet.name));
    const ws = XLSX.utils.json_to_sheet(sheet.rows, { header });
    XLSX.utils.book_append_sheet(book, ws, sheet.name);
  }
  XLSX.writeFile(book, filename);
}

/** The header row a sheet still needs when the couple has nothing in it yet. */
function emptyRowFor(name) {
  return name === 'Run sheet'
    ? { Event: '', Date: '', 'Sort date': '', Time: '', Ends: '', Moment: '', Location: '', 'Who owns it': '', Notes: '' }
    : { Date: '', 'Sort date': '', Time: '', Event: '', Type: '', Location: '', Notes: '', 'Edited in': '' };
}
