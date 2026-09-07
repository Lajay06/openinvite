/**
 * tests/persistence/schedule-run-sheet.mjs
 *
 * THE RUN SHEET IS A VIEW OF THE LIST, NOT A SECOND STORE.
 *
 * Owner: "create a list of events and then in the create event pop up give it
 * a tag area where it is either planning or event. Then you put it all in the
 * list and if it is an event it is on the run sheet… it should just have a
 * filter for the event."
 *
 * So a Schedule row is either part of an EVENT or a PLANNING item, and the run
 * sheet is that filter over rows that already exist. This replaces the nested
 * `run_sheet` array, its library and its guard — a second store for the same
 * facts, which would have needed a Base44 field the owner no longer has to
 * add.
 *
 * `category` carries it, unchanged: a nine-value enum already on the entity,
 * already on the form, already what the stat tiles count. Base44 does not
 * enforce enums (gotcha #20), so free text would have stored — but inventing
 * free text where a declared field exists is how two spellings of "Reception"
 * become two events.
 */
import { pass, fail } from './_shared.mjs';
import {
  isEventRow, eventsInSchedule, runSheetFor, PLANNING_CATEGORIES, CATEGORY_LABEL,
  isPlaceableRow, unplaceableCount,
} from '../../src/lib/scheduleEvents.js';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const code = (p) => readFileSync(join(ROOT, p), 'utf8')
  .replace(/^[^\n]*?\/\/.*$/gm, (line) => line.slice(0, line.indexOf('//')))
  .replace(/\/\*[\s\S]*?\*\//g, '');

const DAY = '2027-07-03';
const ROWS = [
  { id: 'a', event_name: 'Processional', category: 'ceremony',     event_date: DAY, start_time: '15:00' },
  { id: 'b', event_name: 'Vows',         category: 'ceremony',     event_date: DAY, start_time: '15:10' },
  { id: 'c', event_name: 'Speeches',     category: 'reception',    event_date: DAY, start_time: '19:00' },
  { id: 'd', event_name: 'First dance',  category: 'reception',    event_date: DAY, start_time: '20:00' },
  { id: 'e', event_name: 'Cake',         category: 'reception',    event_date: DAY, start_time: '21:00' },
  { id: 'f', event_name: 'Recovery brunch', category: 'post_wedding', event_date: '2027-07-04', start_time: '10:00' },
  { id: 'g', event_name: 'Dress fitting',   category: 'preparation',  event_date: '2027-03-02', start_time: '11:00' },
  { id: 'h', event_name: 'Rehearsal',       category: 'rehearsal',    event_date: '2027-07-02', start_time: '17:00' },
];

export async function runScheduleRunSheet() {
  const results = [];
  const check = (name, cond, detail) => results.push(cond ? pass(name, detail) : fail(name, 'see name', detail));

  console.log('\n  The run sheet is a filter over the list:\n');

  // ── THE PLANT THE OWNER NAMED ───────────────────────────────────────────
  {
    const reception = runSheetFor(ROWS, 'reception');
    check('PLANT: the reception run sheet is exactly the reception rows',
      reception.map((r) => r.id).join() === 'c,d,e', reception.map((r) => r.event_name).join(' · '));
    check('PLANT: a ceremony row does not leak into it',
      !reception.some((r) => r.category === 'ceremony'), 'one event, its own rows');
    check('PLANT: a planning item never appears in any run sheet',
      eventsInSchedule(ROWS).every((e) => !runSheetFor(ROWS, e.key).some((r) => PLANNING_CATEGORIES.has(r.category))),
      'a dress fitting is preparation, not a moment in the day');
    check('  and it is not offered as an event either',
      !eventsInSchedule(ROWS).some((e) => PLANNING_CATEGORIES.has(e.key)),
      eventsInSchedule(ROWS).map((e) => e.label).join(' · '));
    check('  rows come out in time order',
      reception.map((r) => r.start_time).join() === '19:00,20:00,21:00', 'a run sheet is a clock');
    // The plant that caught the first version of runSheetFor: it sorted
    // start_time with localeCompare, so an unpadded "9:00" came out AFTER
    // "17:00" and the morning ran last. sortScheduleItems is the one
    // comparator that knows a time is not a word.
    const unpadded = runSheetFor([
      { id: 'p', event_name: 'Late',  category: 'reception', event_date: DAY, start_time: '17:00' },
      { id: 'q', event_name: 'Early', category: 'reception', event_date: DAY, start_time: '9:00' },
    ], 'reception');
    check('PLANT: an unpadded "9:00" still runs before "17:00"',
      unpadded.map((r) => r.event_name).join(' then ') === 'Early then Late',
      unpadded.map((r) => r.start_time).join(' → '));
    check('  and the planning/event split is one predicate, used everywhere',
      isEventRow(ROWS[2]) === true && isEventRow(ROWS[6]) === false,
      'the dialog groups by it, the run sheet filters by it, the event list is built from it');
  }

  // ── THE EVENTS ARE THE ONES THAT EXIST ──────────────────────────────────
  {
    const events = eventsInSchedule(ROWS);
    check('PLANT: the events are read off the couple\'s own rows',
      events.map((e) => e.label).join(' · ') === 'Reception · Ceremony · Post-wedding',
      'never a fixed list');
    check('  most rows first, so the default is the fullest event',
      events[0].key === 'reception' && events[0].count === 3, `${events[0].label} (${events[0].count})`);
    check('  each carries its own day, taken from its earliest row',
      events.find((e) => e.key === 'post_wedding').date === '2027-07-04',
      'so "Add a moment" can pre-date the row it creates');
    check('  a wedding with one event still resolves one',
      eventsInSchedule([ROWS[0]]).length === 1, 'no question asked when there is no choice');
    check('  and a wedding with no event rows resolves none',
      eventsInSchedule([ROWS[6]]).length === 0, 'the tab says so rather than showing an empty table');
  }

  // ── THE SHAPES A LIVE RECORD ACTUALLY HAS, AND THE ONES IT COULD ────────
  //
  // R33. The owner's Run sheet tab went to the error boundary on his own data
  // while this guard was green, so the fixture now carries the shapes that
  // record actually has — read from it, read-only — plus every shape the enum
  // does not stop Base44 storing (gotcha #20).
  //
  // What the live john-suzanne record has, in 21 rows: responsible_person,
  // description, end_time and location NULL on every row (not absent — null),
  // notes null on 15, two rows both named "First dance" under different tags,
  // three days, and an `is_sample` field the repo's mirror does not declare.
  // Every category was a valid enum string and every time was zero-padded, so
  // NONE of the malformed shapes below caused the crash — the crash was
  // DataTable dereferencing a selection model the run sheet does not pass,
  // and it needed only rows. These are here because the next record might.
  {
    const day = '2027-07-03';
    const ev = (over) => ({ id: 'x', event_name: 'Thing', category: 'reception', event_date: day, start_time: '10:00', ...over });

    check('PLANT: a null category is unplaceable, not a crash',
      isPlaceableRow(ev({ category: null })) === false && isEventRow(ev({ category: null })) === false,
      'and it is counted, not dropped in silence');
    check('PLANT: an absent category too',
      isPlaceableRow({ id: 'y', event_name: 'No tag' }) === false, 'the field can simply not be there');
    check('PLANT: a NUMBER category is unplaceable',
      isPlaceableRow(ev({ category: 5 })) === false,
      'CATEGORY_LABEL misses it, the label falls back to the raw value, and .toLowerCase() throws on a number');
    check('PLANT: an OBJECT category is unplaceable',
      isPlaceableRow(ev({ category: { value: 'reception' } })) === false, 'Base44 does not enforce the enum');
    check('PLANT: a blank-string category is unplaceable',
      isPlaceableRow(ev({ category: '   ' })) === false, 'whitespace is not a tag');
    check('  and every one of them is COUNTED for the note',
      unplaceableCount([ev({ category: null }), ev({ category: 5 }), ev({ category: '  ' }), ev({})]) === 3,
      '"3 items couldn\u2019t be placed" — the run sheet says so on the page');
    check('PLANT: an unrecognised STRING category is still an event, named after itself',
      isPlaceableRow(ev({ category: 'Recovery brunch' })) === true
        && eventsInSchedule([ev({ category: 'Recovery brunch' })])[0].label === 'Recovery brunch',
      'data the couple typed is worth showing; data we cannot read is worth admitting to');
    check('  and its label is a STRING whatever the key was',
      eventsInSchedule([ev({ category: 'Recovery brunch' })]).every((e) => typeof e.label === 'string'),
      'the empty state lowercases it');

    check('PLANT: rows with no event_date still place and sort last',
      runSheetFor([ev({ id: 'a', event_date: null, start_time: '08:00' }), ev({ id: 'b', start_time: '23:00' })], 'reception')
        .map((r) => r.id).join() === 'b,a',
      'an undated item is not day zero');
    check('PLANT: a missing start_time sorts last within its day, not first',
      runSheetFor([ev({ id: 'a', start_time: null }), ev({ id: 'b', start_time: '09:00' })], 'reception')
        .map((r) => r.id).join() === 'b,a', 'absent is not midnight');
    check('PLANT: two rows with the SAME NAME stay two rows',
      runSheetFor([ev({ id: 'a', event_name: 'First dance', start_time: '20:05' }),
        ev({ id: 'b', event_name: 'First dance', start_time: '20:30' })], 'reception').length === 2,
      'the live record has exactly this pair — anything keyed on the name collapses them');
    check('PLANT: responsible_person and notes are NULL on every live row',
      runSheetFor([ev({ responsible_person: null, notes: null, description: null })], 'reception').length === 1,
      'null, not absent — the shape the record actually has');
  }

  // ── THE SHELL DOES NOT REQUIRE A SELECTION MODEL ────────────────────────
  //
  // THE CRASH ITSELF. `selectable` is computed from whether the caller passed
  // `selectedIds`; the very next line then called `selectedIds.has(...)`
  // unconditionally. The run sheet passes no selection model, so the tab threw
  // as soon as it had one row — and only then, which is why every empty-state
  // check passed. The render guard (scripts/test-schedule-tabs-render.mjs)
  // is what actually catches this class; this pins the line so a refactor
  // cannot quietly reintroduce it.
  {
    const dt = code('src/components/shared/DataTable.jsx');
    check('PLANT: allSelected is guarded by `selectable`',
      /const allSelected = selectable\s*&&/.test(dt),
      'no selection model, no dereference');
    check('  and the run sheet still passes none',
      !/selectedIds/.test(code('src/components/schedule/RunSheet.jsx')),
      'a run sheet has no bulk actions — the shell must cope');
    check('  the tab renders an unplaceable-row note rather than swallowing them',
      /unplaceableCount/.test(code('src/components/schedule/RunSheet.jsx'))
        && /couldn\u2019t be placed/.test(code('src/components/schedule/RunSheet.jsx')),
      'skipped and counted, never a try/catch');
  }

  // ── THE TAG IS THE ONE FIELD, NOT A NEW ONE ─────────────────────────────
  {
    const schema = readFileSync(join(ROOT, 'base44/entities/Schedule.jsonc'), 'utf8');
    check('PLANT: run_sheet is gone from the entity mirror',
      !/run_sheet/.test(schema), 'the owner does not need to add the field after all');
    check('  and from the generated field map',
      !/run_sheet/.test(readFileSync(join(ROOT, 'src/lib/entityFields.generated.js'), 'utf8')), 'regenerated');
    check('  the library and its guard are deleted',
      !existsSync(join(ROOT, 'src/lib/runSheet.js'))
        && !existsSync(join(ROOT, 'tests/persistence/run-sheet.mjs')),
      'owner-named deletion');
    check('  nothing still reaches for them',
      !/runSheet'/.test(code('src/pages/ScheduleHub.jsx'))
        && !/from '@\/lib\/runSheet'/.test(code('src/components/schedule/RunSheet.jsx')),
      'no orphaned import');
    check('category is still the nine-value enum it was',
      /"enum": \[/.test(schema) && Object.keys(CATEGORY_LABEL).length === 9,
      Object.values(CATEGORY_LABEL).join(', '));
  }

  // ── THE DIALOG ──────────────────────────────────────────────────────────
  {
    const form = code('src/components/schedule/ScheduleForm.jsx');
    check('PLANT: the dialog asks "This is", grouped Planning item / Part of an event',
      /<Label>This is<\/Label>/.test(form)
        && /<SelectLabel>Planning item<\/SelectLabel>/.test(form)
        && /<SelectLabel>Part of an event<\/SelectLabel>/.test(form),
      'the owner\'s tag area');
    check('  the grouping is read from PLANNING_CATEGORIES, not written twice',
      /PLANNING_CATEGORIES\.has\(c\.value\)/.test(form) && /!PLANNING_CATEGORIES\.has\(c\.value\)/.test(form),
      'one list, filtered both ways');
    check('  and it says what the tag does',
      /appears on that event's run sheet/.test(form), 'so the choice is not a guess');
  }

  // ── WHAT THE TAB DOES WITH IT ───────────────────────────────────────────
  {
    const hub = code('src/pages/ScheduleHub.jsx');
    const rs = code('src/components/schedule/RunSheet.jsx');
    check('PLANT: "Add a moment" creates a row pre-tagged and pre-dated',
      /setEditingItem\(\{ category: ev\.key, event_date: ev\.date \}\)/.test(hub),
      'the page already knows the answers it would have asked for');
    check('PLANT: reordering swaps start_time, not a separate order column',
      /Schedule\.update\(a\.id, \{ start_time: b\.start_time \}\)/.test(hub)
        && /Schedule\.update\(b\.id, \{ start_time: a\.start_time \}\)/.test(hub),
      'the clock and the order can never disagree');
    check('  the run sheet renders through the shared shell',
      /from '@\/components\/shared\/DataTable'/.test(rs) && /<DataTable/.test(rs), 'R37');
    // The COLUMNS, not every label in the file — the "···" actions carry
    // labels too, and matching all of them made this read Edit and Delete as
    // columns.
    const cols = [...(/const COLUMNS = \[([\s\S]*?)\n  \];/.exec(rs)?.[1] || '').matchAll(/label: '([^']+)'/g)].map((m) => m[1]);
    check('  four columns: Time, Item, Who, Notes',
      cols.join(' · ') === 'Time · Item · Who · Notes', cols.join(' · '));
    check('  and the "···" carries Edit, Move up, Move down, Delete',
      ['Edit', 'Move up', 'Move down', 'Delete'].every((l) => new RegExp(`label: '${l}'`).test(rs)),
      'in the actions column the shell already has');
    check('  and the select names each event with its count',
      /label: `\$\{e\.label\} \(\$\{e\.count\}\)`/.test(rs), 'Reception (3)');
  }

  return results;
}
