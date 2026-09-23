/**
 * Everything that lists a schedule lists it in order: day, then time.
 *
 * REPORTED MORE THAN ONCE. The Schedule page showed Friday 1 January above
 * the Thursday 31 December before it, and the list export put the
 * after-party before the wedding.
 *
 * WHY, in two parts, both of them a string comparison standing in for a
 * chronological one:
 *
 *   - ScheduleTable sorted with `naturalCompare(a.date, b.date) ||
 *     naturalCompare(a.time, b.time)`. Read as text, the date is only in
 *     order while every value is the same ISO shape, and the time is only in
 *     order while every value is zero-padded — "9:00" sorts after "17:00".
 *   - scheduleEvents.js grouped days and then sorted within each one with
 *     `String(a.time).localeCompare(String(b.time))`, which has the same
 *     padding fault.
 *
 * The run sheet and the guest site's celebration page were already using the
 * shared comparator in src/lib/scheduleOrder.js, so three surfaces disagreed
 * about what "first" meant. They all use it now: compareScheduleItems for the
 * entity's own fields, compareScheduleRows for the flat {date, time} rows the
 * page, list, calendar and exports are built from. One rule, two field names.
 *
 * THE FIXTURE IS DELIBERATELY SHUFFLED, and carries each fault on purpose: a
 * January date after a December one, an unpadded morning time against a
 * padded afternoon one, and items with no time at all.
 */
import { pass, fail } from './_shared.mjs';
import { compareScheduleRows, sortScheduleRows, compareDayThenTime } from '../../src/lib/scheduleOrder.js';

/** Shuffled on purpose. `want` is the order these must come back in. */
const SHUFFLED = [
  { id: 'after-party', title: 'After-party',      date: '2027-01-01', time: '23:00', want: 6 },
  { id: 'ceremony',    title: 'Ceremony',         date: '2026-12-31', time: '15:00', want: 2 },
  { id: 'undated',     title: 'Book the celebrant', date: '',        time: '',      want: 7 },
  { id: 'breakfast',   title: 'Breakfast',        date: '2027-01-01', time: '9:00',  want: 5 },
  { id: 'rehearsal',   title: 'Rehearsal',        date: '2026-12-30', time: '17:00', want: 0 },
  { id: 'reception',   title: 'Reception',        date: '2026-12-31', time: '18:30', want: 3 },
  { id: 'no-time',     title: 'Dress fitting',    date: '2026-12-31', time: '',      want: 4 },
  { id: 'welcome',     title: 'Welcome drinks',   date: '2026-12-30', time: '19:00', want: 1 },
];

export async function runScheduleChronological() {
  const results = [];
  const check = (n, ok, d) => results.push(ok ? pass(n, d) : fail(n, 'see name', d));
  console.log('\n  Schedule lists run day, then time, everywhere:\n');

  const sorted = sortScheduleRows(SHUFFLED);
  const order = sorted.map((r) => r.id);
  const expected = [...SHUFFLED].sort((a, b) => a.want - b.want).map((r) => r.id);
  check('a deliberately shuffled schedule comes back chronological',
    JSON.stringify(order) === JSON.stringify(expected),
    order.join(' → '));

  // The two faults, named.
  const dec31 = SHUFFLED.find((r) => r.id === 'ceremony');
  const jan1 = SHUFFLED.find((r) => r.id === 'after-party');
  check('  31 December sorts before 1 January', compareScheduleRows(dec31, jan1) < 0, 'day first');
  const nine = SHUFFLED.find((r) => r.id === 'breakfast');       // '9:00', unpadded
  const eleven = { date: '2027-01-01', time: '23:00' };
  check('  an unpadded 9:00 sorts before 23:00', compareScheduleRows(nine, eleven) < 0, 'time as minutes, not text');

  // Absent is not zero, in both dimensions.
  const noTime = SHUFFLED.find((r) => r.id === 'no-time');
  const timed = SHUFFLED.find((r) => r.id === 'ceremony');
  check('  an item with no time sorts last within its day', compareScheduleRows(timed, noTime) < 0, 'absent is not midnight');
  const undated = SHUFFLED.find((r) => r.id === 'undated');
  check('  an item with no date sorts last overall', compareScheduleRows(jan1, undated) < 0, 'absent is not the epoch');

  // Sorting never mutates a cached array.
  const before = SHUFFLED.map((r) => r.id).join(',');
  sortScheduleRows(SHUFFLED);
  check('  sorting returns a copy, leaving the caller’s array alone',
    SHUFFLED.map((r) => r.id).join(',') === before, 'not sorted in place');

  // Both field shapes answer the same question the same way.
  check('the entity shape and the flat shape agree',
    compareDayThenTime('2026-12-31', '15:00', '2027-01-01', '09:00') ===
      compareScheduleRows({ date: '2026-12-31', time: '15:00' }, { date: '2027-01-01', time: '09:00' }),
    'one rule, two field names');

  // Every surface reaches for it rather than rolling its own.
  const { readFileSync } = await import('node:fs');
  const { resolve, dirname } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
  const read = (p) => readFileSync(resolve(ROOT, p), 'utf8');

  const table = read('src/components/schedule/ScheduleTable.jsx');
  check('the Schedule table sorts through the shared comparator',
    /\[\.\.\.filtered\]\.sort\(compareScheduleRows\)/.test(table)
      && !/naturalCompare\(a\.date/.test(table), 'no naturalCompare on date/time');
  check('  and so do its Date and Time column headers',
    (table.match(/compare: \(a, b\) => compareDayThenTime\(a\?\.date, a\?\.time, b\?\.date, b\?\.time\)/g) || []).length === 2,
    'both columns');
  const events = read('src/lib/scheduleEvents.js');
  check('  and the day grouping sorts within a day through it too',
    /events: sortScheduleRows\(items\)/.test(events)
      && !/String\(a\.time\)\.localeCompare/.test(events), 'no string compare on time');
  const runSheet = read('src/components/schedule/RunSheet.jsx');
  check('  the run sheet still uses it', /compareScheduleItems\(/.test(runSheet), 'unchanged');

  return results;
}
