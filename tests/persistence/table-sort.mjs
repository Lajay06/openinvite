/**
 * tests/persistence/table-sort.mjs
 *
 * THE GUEST LIST SORTS EXACTLY AS IT DID BEFORE THE EXTRACTION.
 *
 * naturalCompare, the blanks-always-last rule, the asc → desc → unsorted
 * cycle and the header itself were private to GuestList.jsx. The schedule's
 * List tab needs the same behavior, and the owner's instruction is to consume
 * it rather than fork it — so it moved to src/lib/tableSort.js and
 * components/shared/SortableHead.jsx, and GuestList imports it.
 *
 * THE BASELINE BELOW WAS CAPTURED BEFORE THE MOVE, by running the old private
 * `sortGuests` over this fixture. It is not a description of what the code
 * ought to do; it is what the page actually did, recorded and frozen. A
 * refactor that changes any of these nine orders is not the refactor it says
 * it is.
 *
 * The fixture is chosen for the traps: "Table 2" against "Table 10" (numeric
 * order, not lexical), "ada" against "Bob" (case-insensitive), "Zoë" and
 * "Íris" (accents), blanks in three different columns, and one guest with no
 * event responses at all, which is the "not yet invited" status bucket.
 */
import { pass, fail } from './_shared.mjs';
import { naturalCompare, sortRows, nextSortState } from '../../src/lib/tableSort.js';
import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const code = (p) => readFileSync(join(ROOT, p), 'utf8')
  .replace(/^[^\n]*?\/\/.*$/gm, (line) => line.slice(0, line.indexOf('//')))
  .replace(/\/\*[\s\S]*?\*\//g, '');

const GUESTS = [
  { id: '1', name: 'Table 10 Tom', category: 'friends', rsvp_status: 'pending',   table_assignment: 'Table 10', event_responses: [{}] },
  { id: '2', name: 'ada',          category: 'family',  rsvp_status: 'attending', table_assignment: 'Table 2',  event_responses: [{}] },
  { id: '3', name: 'Zoë',          category: '',        rsvp_status: 'declined',  table_assignment: '',         event_responses: [{}] },
  { id: '4', name: '',             category: 'work',    rsvp_status: 'attending', table_assignment: 'Table 1',  event_responses: [{}] },
  { id: '5', name: 'Bob',          category: 'family',  rsvp_status: 'pending',   table_assignment: 'Table 9',  event_responses: [] },
  { id: '6', name: 'alice',        category: 'Family',  rsvp_status: 'attending', table_assignment: 'Table 10', event_responses: [{}] },
  { id: '7', name: 'Íris',         category: 'friends', rsvp_status: undefined,   table_assignment: 'Table 3',  event_responses: [{}] },
];

/** The guest column map, as it still stands on the page. */
const STATUS_SORT_RANK = { attending: 0, pending: 1, declined: 2 };
const guestStatusSortKey = (g) => {
  const hasResponses = Array.isArray(g.event_responses) && g.event_responses.length > 0;
  if (!hasResponses) return 3;
  return STATUS_SORT_RANK[g.rsvp_status] ?? 1;
};
const COLUMNS = {
  name:     { getValue: (g) => g.name || '', compare: naturalCompare },
  category: { getValue: (g) => g.category || '', compare: naturalCompare },
  status:   { getValue: (g) => guestStatusSortKey(g), compare: (a, b) => a - b },
  table:    { getValue: (g) => g.table_assignment || '', compare: naturalCompare },
};

/** Captured from the pre-extraction `sortGuests`, on the fixture above. */
const BASELINE = {
  'unsorted':      '1 2 3 4 5 6 7',
  'name asc':      '2 6 5 7 1 3 4',
  'name desc':     '3 1 7 5 6 2 4',
  'category asc':  '2 5 6 1 7 4 3',
  'category desc': '4 1 7 2 5 6 3',
  'status asc':    '2 4 6 1 7 3 5',
  'status desc':   '5 3 1 7 2 4 6',
  'table asc':     '4 2 7 5 1 6 3',
  'table desc':    '1 6 5 7 2 4 3',
};

export async function runTableSort() {
  const results = [];
  const check = (name, cond, detail) => results.push(cond ? pass(name, detail) : fail(name, 'see name', detail));

  console.log('\n  The guest list sorts exactly as it did before the extraction:\n');

  // ── EVERY COLUMN, EVERY STATE, AGAINST THE CAPTURED ORDER ───────────────
  for (const [label, expected] of Object.entries(BASELINE)) {
    const [field, direction] = label === 'unsorted' ? [null, 'asc'] : label.split(' ');
    const got = sortRows(GUESTS, { field, direction }, COLUMNS).map((g) => g.id).join(' ');
    check(`PLANT: ${label.padEnd(14)} ${expected}`, got === expected, got);
  }

  // ── THE RULES THAT ORDER DEPENDS ON, NAMED ──────────────────────────────
  check('blanks are last in BOTH directions, not first in one',
    sortRows(GUESTS, { field: 'name', direction: 'asc' }, COLUMNS).at(-1).id === '4'
      && sortRows(GUESTS, { field: 'name', direction: 'desc' }, COLUMNS).at(-1).id === '4',
    'a guest with no name is not the smallest name');
  check('  and a blank in another column behaves the same way',
    sortRows(GUESTS, { field: 'table', direction: 'asc' }, COLUMNS).at(-1).id === '3'
      && sortRows(GUESTS, { field: 'table', direction: 'desc' }, COLUMNS).at(-1).id === '3',
    'table');
  check('"Table 2" sorts before "Table 10" — numeric, not lexical',
    naturalCompare('Table 2', 'Table 10') < 0, 'the trap a plain compare falls into');
  check('  case and accents do not split a column',
    naturalCompare('ada', 'Ada') === 0 && naturalCompare('Zoe', 'Zoë') === 0, 'sensitivity: base');
  check('an unsorted state returns the caller\'s own order, untouched',
    sortRows(GUESTS, { field: null, direction: 'asc' }, COLUMNS) === GUESTS,
    'the same array, not a copy in a default order');
  check('  and so does a column the table does not declare',
    sortRows(GUESTS, { field: 'nonsense', direction: 'asc' }, COLUMNS) === GUESTS, 'no throw, no reorder');

  // ── THE CYCLE ───────────────────────────────────────────────────────────
  {
    const a = nextSortState('name', { field: null, direction: 'asc' });
    const b = nextSortState('name', a);
    const c = nextSortState('name', b);
    check('PLANT: the header cycles asc → desc → unsorted',
      a.direction === 'asc' && b.direction === 'desc' && c.field === null,
      `${a.direction} → ${b.direction} → ${c.field === null ? 'unsorted' : c.direction}`);
    check('  and a different column always starts at asc',
      nextSortState('table', b).field === 'table' && nextSortState('table', b).direction === 'asc',
      'not carried over from the last column');
    check('  the third state keeps the shape the page has always held',
      c.field === null && c.direction === 'asc', '{ field: null }, not a bare null');
  }

  // ── CONSUMED, NOT FORKED ────────────────────────────────────────────────
  {
    const gl = code('src/components/guests/GuestList.jsx');
    check('GuestList imports the shared sort rather than keeping its own',
      /from '@\/lib\/tableSort'/.test(gl) && /from '@\/components\/shared\/SortableHead'/.test(gl),
      'consumed');
    check('  and no copy of the machinery is left behind on the page',
      !/function naturalCompare/.test(gl) && !/function sortGuests/.test(gl)
        && !/function SortableHead/.test(gl),
      'one implementation, not two that drift');
    check('  while the column map stays with the table that owns it',
      /const SORTABLE_COLUMNS = \{/.test(gl) && /guestStatusSortKey/.test(gl),
      'which columns sort is the page\'s business; how they sort is not');
  }

  return results;
}
