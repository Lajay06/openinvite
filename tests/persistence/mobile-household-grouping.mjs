/**
 * tests/persistence/mobile-household-grouping.mjs
 *
 * ON THE PHONE, A HOUSEHOLD SITS TOGETHER UNDER ITS LEAD, AS ON THE WEB.
 *
 * Lane D's finding 4 of goals/2026-10-10-mobile-pass.md, ordered on
 * 2026-10-12. GuestList.jsx draws its rows through src/lib/household.js's
 * groupByHousehold: whatever the sort, a household stays together, the lead
 * first, and a member's row carries an indent. The shell drew the sorted list
 * as it came, so a household's members were scattered through it.
 *
 * The rule is consumed, not retyped: the guard checks that the web still
 * draws through groupByHousehold, that the shell draws through the same
 * function, and that no list render in the shell goes round it.
 */

import fs from 'fs';
import path from 'path';
import { pass, fail, stripComments } from './_shared.mjs';

const ROOT = path.resolve(new URL('../../', import.meta.url).pathname);
const read = (rel) => { try { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); } catch { return ''; } };
const code = (rel) => stripComments(read(rel), { line: true });

function span(src, from, to) {
  const a = src.indexOf(from);
  if (a < 0) return '';
  const b = src.indexOf(to, a + from.length);
  return b < 0 ? src.slice(a) : src.slice(a, b);
}

export async function runMobileHouseholdGrouping() {
  const results = [];
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));

  const web = code('src/components/guests/GuestList.jsx');
  ok('the web draws its rows through groupByHousehold', /import \{ groupByHousehold, isChild \} from "@\/lib\/household";/.test(web)
     && /const rows = groupByHousehold\(sortedGuests\);/.test(web), 'GuestList.jsx');
  ok('  and indents a member under the lead', /!\(householdRowFor\.get\(guest\.id\)\?\.isLead \?\? true\) && \(\s*<span\s+data-household-member/.test(web), 'data-household-member');

  const shell = code('src/mobile/screens/guests/GuestsScreen.jsx');
  ok('the shell imports the same function', /import \{ counts as householdCounts, groupByHousehold \} from '@\/lib\/household';/.test(shell), 'GuestsScreen.jsx');
  ok('  groups the list after its own filter and sort, as the web does',
     /const rows = useMemo\(\(\) => groupByHousehold\(visible\), \[visible\]\);/.test(shell), 'rows');
  const list = span(shell, '<RowGroup>\n              {rows.map', '</RowGroup>');
  ok('  and draws those rows, not the ungrouped list', list.length > 0 && !/visible\.map\(/.test(shell), 'rows.map');
  ok('  with the member flag on both kinds of row',
     (list.match(/<GuestRow key=\{g\.id\} guest=\{g\} member=\{!isLead\}|<GuestRow guest=\{g\} member=\{!isLead\}/g) || []).length === 2, 'swipe row and select row');
  const row = span(shell, 'export function GuestRow', '\nexport function ');
  ok('a member row carries the indent', /\{member && <span data-household-member aria-hidden="true"/.test(row), 'GuestRow');
  ok('  and a lead or a guest alone does not', /member = false \}\) \{/.test(row), 'default off');

  return results;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = await runMobileHouseholdGrouping();
  process.exit(r.every(Boolean) ? 0 : 1);
}
