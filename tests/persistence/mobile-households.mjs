/**
 * tests/persistence/mobile-households.mjs
 *
 * HOUSEHOLDS AND CHILDREN ON THE PHONE, AS THE WEB SHOWS THEM.
 *
 * Mobile parity 4 of goals/2026-10-10-mobile-pass.md. The web learned
 * households and children in goals/2026-10-07-households-and-children.md:
 * the daily update's "By household" block ("{people} guests across
 * {invitations} invitations", then "{adults} adults, {children} children"
 * when there are children), and the guest list's "Child" or "Child, 6"
 * label. The shell predated all of it and read none of household_id,
 * is_child or child_age.
 *
 * Everything counted here comes from src/lib/household.js, which stays the
 * only place that counts. The child label is run, not read: format.js is
 * bundled the way scripts/test-guest-counts.mjs bundles the counter, so the
 * check is on what the function returns.
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import { pathToFileURL } from 'url';
import { pass, fail, stripComments } from './_shared.mjs';

const ROOT = path.resolve(new URL('../../', import.meta.url).pathname);
const read = (rel) => { try { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); } catch { return ''; } };
const code = (rel) => stripComments(read(rel), { line: true });

async function loadFormat() {
  try {
    const { build } = await import('esbuild');
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oi-mobile-hh-'));
    const out = path.join(dir, 'format.mjs');
    await build({
      entryPoints: [path.join(ROOT, 'src/mobile/lib/format.js')], outfile: out, bundle: true,
      format: 'esm', platform: 'node', logLevel: 'silent', alias: { '@': path.join(ROOT, 'src') },
    });
    const m = await import(pathToFileURL(out).href);
    fs.rmSync(dir, { recursive: true, force: true });
    return m;
  } catch (e) { return { __error: e.message }; }
}

export async function runMobileHouseholds() {
  const results = [];
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));
  const safe = (fn) => { try { return fn(); } catch (e) { return `threw: ${e.message}`; } };

  // ── THE CHILD LABEL, RUN ─────────────────────────────────────────────────
  const fmt = await loadFormat();
  ok('the shell formatters bundle and load', !fmt.__error && typeof fmt.childLabel === 'function', fmt.__error || 'childLabel exported');
  const cases = [
    [{ name: 'Priya' }, ''],
    [{ name: 'Mina', is_child: true }, 'Child'],
    [{ name: 'Mina', is_child: true, child_age: 6 }, 'Child, 6'],
    [{ name: 'Mina', is_child: true, child_age: '' }, 'Child'],
    [{ name: 'Baby', is_child: true, child_age: 0 }, 'Child, 0'],
    [{ name: 'Dev', is_child: false, child_age: 9 }, ''],
  ];
  const got = cases.map(([g]) => safe(() => fmt.childLabel(g)));
  ok('the child label reads as GuestList.jsx writes it',
     cases.every(([, want], i) => got[i] === want), got.map((g) => JSON.stringify(g)).join(', '));

  // The web's own label, so the two cannot drift apart unnoticed.
  const webList = code('src/components/guests/GuestList.jsx');
  ok("  and the web's label still has that shape", /`Child, \$\{Number\(guest\.child_age\)\}`/.test(webList) && /: 'Child'/.test(webList), 'GuestList.jsx');

  // ── THE COUNTS, FROM household.js ────────────────────────────────────────
  const web = code('src/pages/DailyUpdate.jsx');
  ok("the web's wording is the one copied",
     /\{hhCounts\.people\} guests across \{hhCounts\.invitations\} invitations/.test(web)
       && /\{hhCounts\.adults\} adults, \{hhCounts\.children\} children/.test(web), 'DailyUpdate.jsx By household');

  const list = code('src/mobile/screens/guests/GuestsScreen.jsx');
  ok('the guest list counts households through household.js',
     /import \{ counts as householdCounts(?:, groupByHousehold)? \} from '@\/lib\/household';/.test(list)
       && /const hh = useMemo\(\(\) => householdCounts\(guests\), \[guests\]\);/.test(list), 'counts(guests)');
  ok('  and prints people across invitations',
     /\{hh\.people\} guests across \{hh\.invitations\} invitations/.test(list), 'line one');
  ok('  and adults and children only when there are children',
     /\{hh\.children > 0 && <div>\{hh\.adults\} adults, \{hh\.children\} children<\/div>\}/.test(list), 'line two');

  const home = code('src/mobile/screens/home/HomeContainer.jsx');
  ok('Home carries the same two lines among its numbers',
     /import \{ counts as householdCounts \} from '@\/lib\/household';/.test(home)
       && /\['By household', `\$\{hh\.people\} guests across \$\{hh\.invitations\} invitations`\]/.test(home)
       && /hh\.children > 0 \? \[\['Adults and children', `\$\{hh\.adults\} adults, \$\{hh\.children\} children`\]\] : \[\]/.test(home),
     'By household, Adults and children');

  // ── THE GUEST DETAIL ─────────────────────────────────────────────────────
  const detail = code('src/mobile/screens/guests/GuestDetailScreen.jsx');
  ok('the guest detail labels a child under the name', /\[childLabel\(guest\), role,/.test(detail), 'header meta');
  ok('  and shows who else is on the invitation, from membersOf',
     /import \{ membersOf, salutation \} from '@\/lib\/household';/.test(detail)
       && /const household = membersOf\(guest, guests\);/.test(detail)
       && /others\.length > 0 && \(/.test(detail), 'This invitation');
  ok('  addressed as the invitation is addressed', /Addressed to \{addressedTo\}/.test(detail) && /salutation\(household\)/.test(detail), 'salutation');
  const container = code('src/mobile/screens/guests/GuestsContainer.jsx');
  ok('  with the whole list handed to it', /<GuestDetailScreen\s+guest=\{current\}\s+guests=\{list\}/.test(container), 'guests={list}');

  // ── THE IMPORT ───────────────────────────────────────────────────────────
  const sheets = code('src/mobile/screens/guests/GuestSheets.jsx');
  ok('the import keeps household_id and is_child and drops the preview label, as ImportGuestModal.jsx does',
     /const \{ _rowIndex, _error, _phoneWarning, _householdLabel, \.\.\.data \} = r;/.test(sheets), '_householdLabel stripped');

  return results;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = await runMobileHouseholds();
  process.exit(r.every(Boolean) ? 0 : 1);
}
