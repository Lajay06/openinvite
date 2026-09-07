/**
 * tests/persistence/run-sheet.mjs
 *
 * A RUN SHEET IS SAVED OR THE COUPLE IS TOLD IT WAS NOT.
 *
 * Owner: "run sheet is literally order of events for the specific event."
 * Nested on the Schedule row as `run_sheet`, items shaped
 * { id, time, item, who, notes, order }.
 *
 * ── THERE WAS NOTHING TO RECOVER ───────────────────────────────────────────
 *
 * The brief expected the pre-#693 storage shape to be reused so existing
 * couples' moments were not lost. There were none: the deleted
 * WeddingDayTimelineBuilder moved SCHEDULE ROWS around an hour grid and its
 * only write was Schedule.update(id, { start_time, end_time }). Searched for
 * run_sheet, moments, proceedings and timeline_items across src/ and base44/ —
 * the only hit was `special_moments`, a Music category enum.
 *
 * ── THE FIELD IS NOT ON THE LIVE ENTITY YET ────────────────────────────────
 *
 * Base44 accepts a write of an undeclared field with 200 and DISCARDS it. A
 * couple would type out their whole ceremony, get a success toast, and find it
 * gone. So the save writes, reads back and compares, and the failure is named
 * rather than shrugged at. The plant below is exactly that: a write to a
 * record whose field does not exist, asserted to be REPORTED.
 */
import { pass, fail } from './_shared.mjs';
import {
  RUN_SHEET_FIELDS, newRunSheetItem, normalizeRunSheet, moveRunSheetItem, runSheetRoundTripped,
} from '../../src/lib/runSheet.js';
import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const code = (p) => readFileSync(join(ROOT, p), 'utf8')
  .replace(/^[^\n]*?\/\/.*$/gm, (line) => line.slice(0, line.indexOf('//')))
  .replace(/\/\*[\s\S]*?\*\//g, '');

const SHEET = [
  { id: 'r1', time: '15:00', item: 'Processional', who: 'Everyone', notes: 'Music cued', order: 0 },
  { id: 'r2', time: '15:10', item: 'Vows',         who: 'Celebrant', notes: '',          order: 1 },
  { id: 'r3', time: '15:20', item: 'Rings',        who: 'Best man',  notes: 'Pocket',    order: 2 },
];

/**
 * The save path, with a Base44 that behaves the way the platform actually
 * does: `hasField` false means the write is accepted and thrown away.
 */
async function save(items, { hasField }) {
  const record = { id: 's1' };
  // Schedule.update
  if (hasField) record.run_sheet = normalizeRunSheet(items);
  // Schedule.get — what comes back is what was stored, not what was sent.
  return runSheetRoundTripped(items, record.run_sheet);
}

export async function runRunSheet() {
  const results = [];
  const check = (name, cond, detail) => results.push(cond ? pass(name, detail) : fail(name, 'see name', detail));

  console.log('\n  A run sheet is saved, or the couple is told it was not:\n');

  // ── THE PLANT THE OWNER NAMED ───────────────────────────────────────────
  {
    const missing = await save(SHEET, { hasField: false });
    check('PLANT: a write to a record without the field is REPORTED, not swallowed',
      missing.ok === false && missing.reason === 'the field is not on the record',
      missing.reason);
    const present = await save(SHEET, { hasField: true });
    check('  and a write that survives is reported as saved',
      present.ok === true, 'round-tripped');
    const partial = runSheetRoundTripped(SHEET, [SHEET[0]]);
    check('  a write that comes back CHANGED is refused too',
      partial.ok === false && /came back different/.test(partial.reason),
      'silently dropping two of three rows is the same failure, quieter');

    const ui = code('src/components/schedule/RunSheet.jsx');
    check('PLANT: the UI says it is not switched on rather than "something went wrong"',
      /Run sheet isn't switched on yet/.test(ui) && /Nothing was saved\./.test(ui),
      'a couple can act on the first and not the second');
    check('  and it keeps what they typed on screen',
      !/setRows\(\[\]\)/.test(ui), 'a refusal that also clears the form is worse than the bug');
    check('  the save reads back rather than trusting the 200',
      /Schedule\.get\(chosen\.id\)/.test(code('src/pages/ScheduleHub.jsx'))
        && /runSheetRoundTripped/.test(ui),
      'the platform answers 200 either way');
  }

  // ── THE SHAPE THE OWNER RULED ───────────────────────────────────────────
  {
    check('the item shape is id, time, item, who, notes, order',
      JSON.stringify(RUN_SHEET_FIELDS) === JSON.stringify(['id', 'time', 'item', 'who', 'notes', 'order']),
      RUN_SHEET_FIELDS.join(', '));
    const fresh = newRunSheetItem(SHEET);
    check('  a new moment carries every one of them',
      RUN_SHEET_FIELDS.every((f) => f in fresh) && fresh.order === 3, 'ordered onto the end');
    const junk = normalizeRunSheet([{ item: 'Only an item' }, { id: 'x', item: 'Second', order: 99 }]);
    check('  normalizing drops nothing and invents nothing',
      junk.every((r) => RUN_SHEET_FIELDS.every((f) => f in r)) && junk.length === 2,
      'every field present, none added');
    check('  and renumbers order to 0..n-1',
      junk.map((r) => r.order).join() === '0,1', junk.map((r) => r.order).join());

    // The mirror carries it, so the seed guard and the schema-drift scan both
    // know the field is expected.
    const schema = readFileSync(join(ROOT, 'base44/entities/Schedule.jsonc'), 'utf8');
    check('the entity mirror declares run_sheet as an array of those six',
      /"run_sheet"/.test(schema) && /"type": "array"/.test(schema)
        && RUN_SHEET_FIELDS.every((f) => new RegExp(`"${f}"`).test(schema)),
      'built against the mirror, as ruled');
  }

  // ── REORDERING ──────────────────────────────────────────────────────────
  {
    check('PLANT: moving an item up swaps it with the one above',
      moveRunSheetItem(SHEET, 'r3', 'up').map((r) => r.item).join() === 'Processional,Rings,Vows',
      moveRunSheetItem(SHEET, 'r3', 'up').map((r) => r.item).join());
    check('  and down with the one below',
      moveRunSheetItem(SHEET, 'r1', 'down').map((r) => r.item).join() === 'Vows,Processional,Rings',
      moveRunSheetItem(SHEET, 'r1', 'down').map((r) => r.item).join());
    check('  the ends do not wrap around',
      moveRunSheetItem(SHEET, 'r1', 'up').map((r) => r.id).join() === 'r1,r2,r3'
        && moveRunSheetItem(SHEET, 'r3', 'down').map((r) => r.id).join() === 'r1,r2,r3',
      'the first item does not become the last');
    check('  and order stays 0..n-1 after every move',
      moveRunSheetItem(SHEET, 'r3', 'up').map((r) => r.order).join() === '0,1,2', 'renumbered');
  }

  // ── IT BELONGS TO ONE EVENT ─────────────────────────────────────────────
  {
    const hub = code('src/pages/ScheduleHub.jsx');
    check('PLANT: the run sheet is per event, chosen from the wedding-day rows',
      /runSheetEventId/.test(hub) && /event_date \|\| ''\)\.slice\(0, 10\) === String\(weddingDate\)/.test(hub),
      'a vendor contract date has no order of proceedings');
    check('  and it is its own tab, beside List and Calendar',
      /\{ key: "runsheet",\s*label: "Run sheet" \}/.test(hub), 'three views');
    check('  the deleted timeline is not back',
      !/WeddingDayTimelineBuilder/.test(hub), 'a list, not overlapping blocks');
  }

  return results;
}
