/**
 * Notes export (E3).
 *
 * Which entity is "notes" was not obvious and is worth recording. There are
 * TWO routed surfaces both titled "To do list":
 *   /TodoList (TodoList.jsx) -> the Note entity, with the kanban `status`
 *   /Notes    (Notes.jsx)    -> the Task entity, no kanban
 * Only /TodoList is linked from the sidebar, and on the live app Note holds
 * 16 rows while Task holds ZERO across every account. So Note is the couple's
 * notes data and Task is a vestigial surface.
 *
 * `status` is the field that earns this its own export: it is the only thing
 * the kanban view carries that a list view does not, so a CSV without it
 * flattens Ideas / In progress / Done into an undifferentiated list.
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pass, fail } from './_shared.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const SRC = readFileSync(resolve(__dir, '../../src/pages/TodoList.jsx'), 'utf8');
const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

export async function runNotesExport() {
  const results = [];
  const check = (n, ok, d) => results.push(ok ? pass(n, d) : fail(n, 'see name', d));
  console.log('\n  Notes export — the kanban status is the point:\n');

  check('an export exists on the notes surface', /const exportNotes = \(\) =>/.test(CODE), 'exportNotes');
  check('it writes its own file', /wedding-notes\.csv/.test(CODE), 'wedding-notes.csv');

  const hdr = CODE.match(/\['Task', 'Status'[^\]]*\]/);
  const cols = hdr ? [...hdr[0].matchAll(/'([^']+)'/g)].map(m => m[1]) : [];
  check('  header parsed', cols.length === 8, cols.join('|'));
  check('  Status is the SECOND column, not buried', cols[1] === 'Status', cols[1]);
  for (const c of ['Task', 'Status', 'Done', 'Priority', 'Due date', 'Category', 'Timeline', 'Description']) {
    check(`    exports "${c}"`, cols.includes(c), cols.includes(c) ? 'yes' : 'MISSING');
  }

  // Done and Status are different facts: a note can be In progress and not done.
  check('Status and Done are separate columns (not collapsed)',
    cols.includes('Status') && cols.includes('Done'), 'both present');
  check('  an unset status defaults to Ideas, matching the schema default',
    /t\.status \|\| 'Ideas'/.test(CODE), "|| 'Ideas'");

  // the source rows
  check('exports the same filtered rows the page renders',
    /\.\.\.tasks\.map\(t =>/.test(CODE), 'maps `tasks`');
  check("  `tasks` is Note filtered to view_type 'todo'",
    /getMyRecords\('Note'/.test(CODE) && /view_type === 'todo'/.test(CODE), 'Note + todo filter');

  // CSV correctness: notes are free text and will contain quotes
  check('embedded quotes are escaped, not truncated',
    /replace\(\/"\/g, '""'\)/.test(CODE), 'doubled per RFC 4180');
  check('the button is disabled with nothing to export',
    /disabled=\{tasks\.length === 0\}/.test(CODE), 'guarded');

  return results;
}
