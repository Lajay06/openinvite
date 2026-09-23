/**
 * The To do page has no export, and this file is why.
 *
 * ── THE RULING ─────────────────────────────────────────────────────────────
 *
 * Round two, item 6: "To do: remove the Export CSV button." Removed, along
 * with its handler — a handler nothing calls is not a smaller change, it is a
 * bigger one, because the next reader has to work out whether it is dead.
 *
 * ── WHAT THIS GUARD USED TO ASSERT, AND WHY IT IS KEPT ─────────────────────
 *
 * Until now this file held seventeen checks on the shape of that CSV, and the
 * findings behind them are worth more than the checks were:
 *
 *   WHICH ENTITY "notes" MEANS. There are TWO routed surfaces both titled
 *   "To do list" — /TodoList (TodoList.jsx) reads the Note entity, with the
 *   kanban `status`; /Notes (Notes.jsx) reads Task, with no kanban. Only
 *   /TodoList is linked from the sidebar, and on the live app Note held 16
 *   rows while Task held ZERO across every account. Note is the couple's
 *   data; Task is a vestigial surface.
 *
 *   WHY `status` EARNED ITS OWN COLUMN. It is the only thing the kanban view
 *   carries that a list view does not, so a flat export without it collapses
 *   Ideas / In progress / Done into an undifferentiated list. It sat SECOND,
 *   not buried, and beside `Done` rather than merged into it — a note can be
 *   In progress and not done, and those are different facts.
 *
 *   THE EIGHT COLUMNS, in order: Task, Status, Done, Priority, Due date,
 *   Category, Timeline, Description. Quotes inside free text were doubled per
 *   RFC 4180 rather than stripped.
 *
 * A to-do with a date is already a row on the schedule, so a list of them
 * still leaves the product — through the schedule's export, not this page's.
 * If an export ever returns here, it starts from the paragraph above rather
 * than from a fresh guess at what a useful one contains.
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
  console.log('\n  To do — no export, and no half-removed one:\n');

  check('the Export CSV button is gone', !/Export CSV/.test(CODE), 'no button');
  check('  and so is its handler, rather than being left unreferenced',
    !/exportNotes/.test(CODE), 'no exportNotes');
  check('  nothing on the page still builds a CSV',
    !/wedding-notes\.csv/.test(CODE) && !/text\/csv/.test(CODE), 'no blob, no filename');
  check('  and no download link is left behind',
    !/link\.download/.test(CODE) && !/createObjectURL/.test(CODE), 'no anchor');

  // The row the button sat in still has to render its one remaining child.
  check('the count beside it survives the removal',
    /Nothing left/.test(CODE) && /\$\{total - done\} left|left`/.test(CODE), 'the "N left" line');

  // The page itself is unchanged in what it reads — this was a chrome removal,
  // not a data change, and a regression here would be the real damage.
  check('the page still reads Note filtered to view_type "todo"',
    /getMyRecords\('Note'/.test(CODE) && /view_type === 'todo'/.test(CODE), 'Note + todo filter');
  check('  and still keeps Status and Done as separate facts on screen',
    /status/.test(CODE) && /completed/.test(CODE), 'kanban intact');

  return results;
}
