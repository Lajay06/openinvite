/**
 * tests/persistence/guest-list-plus-ones.mjs
 *
 * A PLUS-ONE IS A ROW, NOT A COLSPAN.
 *
 * Owner, 2026-09-07: "the Beef under Harper Reid is her meal choice leaking
 * into the Contact column." It was, and the mechanism is the interesting part.
 * The sub-row was three colSpans — the name over 2, dietary + meal over 3, the
 * remainder blank — so the plus-one's MEAL landed under the heading that says
 * Contact. Nothing was wrong with the value; the table said it was a phone
 * number.
 *
 * The row now renders cell for cell against the guest above it: name · (no
 * contact) · category · tags · status · table. A plus-one has no contact
 * details on the record, so that cell is EMPTY rather than filled with
 * something else — which is the whole rule this file exists for.
 */
import { pass, fail } from './_shared.mjs';
import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const code = (p) => readFileSync(join(ROOT, p), 'utf8');
const stripped = (p) => code(p)
  .replace(/^[^\n]*?\/\/.*$/gm, (line) => line.slice(0, line.indexOf('//')))
  .replace(/\/\*[\s\S]*?\*\//g, '');

export async function runGuestListPlusOnes() {
  const results = [];
  const check = (name, cond, detail) => results.push(cond ? pass(name, detail) : fail(name, 'see name', detail));

  console.log('\n  A plus-one is a row of the same table:\n');

  const list = stripped('src/components/guests/GuestList.jsx');
  // THE WHOLE `if (guest.plus_one)` BLOCK, not just the JSX: the status and
  // the meal are computed above the row, and a check that reads only the
  // markup reports them missing.
  const sub = /if \(guest\.plus_one\) \{[\s\S]*?\n              \}/.exec(list)?.[0] || '';

  check('PLANT: the plus-one row exists and is not built from colSpans',
    sub.length > 0 && !/colSpan/.test(sub), sub ? 'cell for cell' : 'row not found');

  // ONE CELL PER COLUMN. The guest table has 8 columns plus the checkbox and
  // the actions column: 10. A row with fewer cells slides every value left,
  // which is exactly how a meal ended up under Contact.
  const cells = (sub.match(/<TableCell/g) || []).length;
  check('  and it has one cell per column of the table above it',
    cells === 10, `${cells} cells for 10 columns (checkbox · Guest · Contact · Category · Tags · Status · Last sent · Table · +1 · actions)`);

  check('PLANT: the meal never renders in the Contact cell',
    /\{\/\* Contact — a plus-one has none\. Empty, not borrowed\. \*\/\}\s*<TableCell \/>/.test(code('src/components/guests/GuestList.jsx')),
    'the cell is empty on purpose');
  check('  the meal sits under the name instead',
    /plusOneMealChoice[\s\S]{0,400}<\/TableCell>\s*\{\/\* Contact/.test(code('src/components/guests/GuestList.jsx')),
    'where the guest’s own dietary line already is');

  check('  the row carries the plus-one’s OWN status, not the guest’s',
    /plusOneRsvpStatus\(guest\)/.test(sub), 'they answer for themselves');
  check('  the category and table are inherited from the guest',
    /CATEGORY_STYLES\[guest\.category\]/.test(sub) && /formatTableAssignment\(guest\.table_assignment\)/.test(sub),
    'they came with someone and sit with them');

  // ── THE EXPANDED PANEL ──────────────────────────────────────────────────
  check('PLANT: the expanded panel shows the plus-one’s meal the way the guest’s shows',
    /const plusOneMeal = mealOptionLabel\(\s*effectiveMealChoice\(guest\.plus_one_event_responses, guest\.plus_one_meal_choice\), mealOptions,\s*\)/.test(list)
      && /\{r\.invited && r\.plus_ones > 0 && plusOneMeal &&/.test(list),
    'same helper, same label function, same treatment');

  // ── ALIGNMENT ───────────────────────────────────────────────────────────
  check('PLANT: table numbers are centred, in the cells and the heading',
    /\{\/\* ── Table — centred, because it is a number ── \*\/\}\s*<TableCell className="align-middle" style=\{\{ textAlign: 'center' \}\}/.test(code('src/components/guests/GuestList.jsx'))
      && /headStyle: \{ textAlign: 'center' \}/.test(list),
    'a right-aligned number under a left-aligned heading reads as two columns');
  check('  and the plus-one’s table number is centred with them',
    /<TableCell className="align-middle" style=\{\{ textAlign: 'center' \}\}>\s*<span style=\{\{ fontSize: 13, color: '#444444', fontFamily: PJS \}\}>\s*\{formatTableAssignment/.test(list),
    'the same column, the same alignment');
  check('  the shell can align a header with its column',
    /headStyle/.test(stripped('src/components/shared/DataTable.jsx'))
      && /style=\{\{ cursor: 'pointer', userSelect: 'none', \.\.\.style \}\}/.test(stripped('src/components/shared/SortableHead.jsx')),
    'one prop, both header kinds');

  return results;
}
