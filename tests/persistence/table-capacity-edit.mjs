/**
 * tests/persistence/table-capacity-edit.mjs
 *
 * A TABLE'S CAPACITY CAN BE CHANGED, UNDER THE RULE IT WAS CREATED WITH.
 *
 * Fix batch 1, item 4. Capacity was set once in AddTableModal and nothing
 * could change it. Creation and editing now share one rule
 * (src/lib/tableCapacity.js): a whole number from 1 to 20, and for an existing
 * table never below the guests already seated. The rule is DRIVEN here, not
 * read, and the two callers are held to calling it.
 *
 * SEATS ARE NUMBERED, NOT PACKED, which is why there is a second function. A
 * count check alone lets a table of 10 with a guest at seat 9 drop to 5 and
 * leave that guest on a seat that no longer exists.
 *
 * The plant: change `n < seatedCount` to `n < seatedCount - 1` in
 * tableCapacity.js and the below-the-seated-count check goes red.
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pass, fail, stripComments } from './_shared.mjs';
import { tableCapacityError, fitSeatsToCapacity, MIN_TABLE_CAPACITY, MAX_TABLE_CAPACITY } from '../../src/lib/tableCapacity.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const code = (p) => stripComments(readFileSync(join(ROOT, p), 'utf8'));

export function runTableCapacityEdit() {
  const results = [];
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));

  console.log('\n  The one capacity rule:\n');
  ok('the range is 1 to 20, as creation always allowed', MIN_TABLE_CAPACITY === 1 && MAX_TABLE_CAPACITY === 20, `${MIN_TABLE_CAPACITY}-${MAX_TABLE_CAPACITY}`);
  ok('a new table of 8 is valid', tableCapacityError(8, 0) === null, String(tableCapacityError(8, 0)));
  ok('0, 21, 2.5, blank and text are refused',
     [0, 21, 2.5, '', 'eight'].every(v => typeof tableCapacityError(v, 0) === 'string'), 'five refusals');
  ok('a table with 6 seated cannot go to 5', typeof tableCapacityError(5, 6) === 'string', String(tableCapacityError(5, 6)));
  ok('  and the reason names the seated count', /6 guests are seated/.test(tableCapacityError(5, 6) || ''), tableCapacityError(5, 6));
  ok('  but it can go to exactly 6', tableCapacityError(6, 6) === null, 'null');
  ok('  and the upper bound still holds with guests seated', typeof tableCapacityError(21, 6) === 'string', 'refused');

  console.log('\n  Nobody is left on a seat that is gone:\n');
  const before = [{ guest_id: 'a', seat_index: 0 }, { guest_id: 'b', seat_index: 4 }, { guest_id: 'c', seat_index: 9 }];
  const after = fitSeatsToCapacity(before, 5);
  ok('every seat is inside the new capacity', after.every(a => a.seat_index < 5), JSON.stringify(after.map(a => a.seat_index)));
  ok('  no two guests share a seat', new Set(after.map(a => a.seat_index)).size === after.length, 'unique');
  ok('  guests already inside keep their seat',
     after.find(a => a.guest_id === 'a').seat_index === 0 && after.find(a => a.guest_id === 'b').seat_index === 4, 'a@0, b@4');
  ok('  and nobody is dropped', after.length === 3 && ['a', 'b', 'c'].every(id => after.some(x => x.guest_id === id)), '3 of 3');
  ok('growing a table moves nobody', JSON.stringify(fitSeatsToCapacity(before, 12)) === JSON.stringify(before), 'unchanged');

  console.log('\n  Both callers use it:\n');
  const modal = code('src/components/seating/AddTableModal.jsx');
  ok('AddTableModal validates creation with tableCapacityError', /tableCapacityError\(capacity, 0\)/.test(modal), 'creation');
  const lib = code('src/lib/tableAssignment.js');
  const setter = lib.slice(lib.indexOf('export async function setTableCapacity'));
  ok('setTableCapacity validates against the seated count before writing',
     /tableCapacityError\(.*, assigned\.length\)/.test(setter) && setter.indexOf('tableCapacityError') < setter.indexOf('Table.update'), 'validate, then write');
  ok('  and writes the refitted seats with the capacity', /Table\.update\(tableId, \{ capacity, assigned_guests \}\)/.test(setter), 'one write');
  const page = code('src/pages/Seating.jsx');
  ok('Seating offers the edit and routes it through setTableCapacity',
     /data-edit-capacity/.test(page) && /await setTableCapacity\(\{/.test(page), 'Edit capacity');
  ok('  not to a collaborator', /\{!readOnly && \(editingCapacityId === selectedTable\.id/.test(page), '!readOnly');

  return results;
}
