/**
 * tests/persistence/guests-refresh.mjs
 *
 * THE REFRESH CONTROL AND THE AGE LINE ARE GONE, AND STAY GONE.
 *
 * This guard used to prove the other thing. Item 4 of
 * goals/2026-10-09-reply-lifecycle.md gave the Guests page a line saying how
 * old the list was and a Refresh control beside it, and the interesting half
 * was the failure path: a refresh that failed had to keep the rows and must
 * not move the timestamp, or the page would claim to be fresh while showing
 * stale data.
 *
 * The owner's walkthrough took both controls off the page (item 3 of
 * goals/2026-10-11-dashboard-fixes-batch-1.md), and item 7 of that goal then
 * removed src/lib/lastUpdated.js, which they were the only consumer of. Two
 * sections of this file went with the module: they drove updatedLabel,
 * refreshFailedLine and clockTime directly, and a guard for a module that no
 * longer exists is not a guard.
 *
 * WHAT IS LEFT IS WORTH KEEPING, which is why this file is not deleted with
 * them. A removal nobody guards is a removal a later refactor can read as an
 * accident and undo. So this asserts the absence: the controls, the state
 * behind them, and the re-render tick, with the one thing the removal must
 * NOT have taken, which is the page still loading itself.
 */

import fs from 'fs';
import path from 'path';
import { pass, fail, stripComments } from './_shared.mjs';

const ROOT = path.resolve(new URL('../../', import.meta.url).pathname);
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const code = (p) => stripComments(read(p));


export async function runGuestsRefresh() {
  const results = [];
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));

  // ── THE PAGE NO LONGER CARRIES EITHER CONTROL ───────────────────────────
  //
  // REMOVED BY OWNER RULING, 2026-10-11, item 3 of
  // goals/2026-10-11-dashboard-fixes-batch-1.md: the Refresh button and the
  // age line go together, which is how they shipped. Everything this section
  // used to assert about them is therefore obsolete, and deleting the section
  // outright would leave nothing to stop them being reinstated by a later
  // refactor that read the removal as an accident.
  //
  // So it inverts: the controls must stay gone, and the page must not carry
  // the state they needed. src/lib/lastUpdated.js is gone too, by item 7,
  // because this page was its only consumer.
  const g = code('src/pages/Guests.jsx');

  ok('the Refresh control is gone from the Guests page',
     !/data-guests-refresh/.test(g), 'removed');
  ok('  and the age line with it',
     !/data-guests-updated/.test(g), 'removed');
  ok('  neither label is computed anywhere on the page',
     !/updatedLabel\(/.test(g) && !/refreshFailedLine\(/.test(g), 'no caller');
  // THE MODULE ITSELF IS GONE, which is the other half of item 7: a dead
  // module left in the tree is a thing someone imports again by accident.
  // Asserted across the product source rather than on this page alone.
  ok('  and the module they came from is gone from the repo',
     !fs.existsSync(path.join(ROOT, 'src/lib/lastUpdated.js')), 'deleted');
  ok('  with nothing left importing it',
     !/lib\/lastUpdated/.test(g)
       && !fs.readdirSync(path.join(ROOT, 'src/lib')).includes('lastUpdated.js'),
     'no import, no file');

  ok('the freshness state is gone too, not just the controls',
     !/setLastLoadedAt\(/.test(g) && !/lastLoadedAt/.test(g)
       && !/setRefreshFailed\(/.test(g) && !/refreshFailed/.test(g),
     'no state');
  ok('  including the re-render tick, which existed only to age the label',
     !/setNowTick/.test(g), 'removed');

  // WHAT THE REMOVAL MUST NOT HAVE TAKEN WITH IT. The list still reloads on
  // mount and after every write, which is what it did before either control
  // existed. A removal that also stopped the page reloading would read as
  // "Refresh was the only way to get fresh data", which was never true.
  ok('the list still loads itself',
     /const loadGuests = async \(\) => \{/.test(g) && /loadGuests\(\)/.test(g), 'still loads');
  ok('  and a failed load still leaves the rows alone',
     (() => {
       const i = g.indexOf('toast.error("Failed to load guests")');
       if (i < 0) return false;
       const block = g.slice(i - 400, i + 200);
       return !/setGuests\(\s*\[\s*\]\s*\)/.test(block) && !/setTables\(\s*\[\s*\]\s*\)/.test(block);
     })(), 'rows kept');

  return results;
}
