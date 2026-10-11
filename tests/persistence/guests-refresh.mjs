/**
 * tests/persistence/guests-refresh.mjs
 *
 * THE LIST SAYS HOW OLD IT IS, AND A FAILED REFRESH DOES NOT LIE ABOUT IT.
 *
 * Item 4 of goals/2026-10-09-reply-lifecycle.md. The Guests page fetched once
 * on mount and again after every write, and never told the couple when. On a
 * page whose whole job is "who have I not heard from", a list of unknown age
 * is a list you cannot act on.
 *
 * ── THE ONE THAT MATTERS IS THE FAILURE PATH ──────────────────────────────
 *
 * The owner's guard for this item is that a failed refresh KEEPS THE LIST and
 * shows the fallback line. Both halves are failure modes with teeth:
 *
 *   · a refresh that failed and then emptied the table reads as "every guest
 *     is gone", which is worse than showing nothing new;
 *   · a timestamp moved by a failed attempt makes the page claim to be fresh
 *     while showing stale rows, which is the lie the whole item replaces.
 *
 * So the label is a pure function of two instants and nothing accumulates,
 * which is also why src/lib/lastUpdated.js takes `now` as an argument: a
 * guard that cannot fix the clock cannot test a boundary.
 */

import fs from 'fs';
import path from 'path';
import { pass, fail, stripComments } from './_shared.mjs';
import { updatedLabel, refreshFailedLine, clockTime } from '../../src/lib/lastUpdated.js';

const ROOT = path.resolve(new URL('../../', import.meta.url).pathname);
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const code = (p) => stripComments(read(p));

const LOADED = new Date('2026-10-09T14:05:00');
const at = (ms) => new Date(LOADED.getTime() + ms);
const MIN = 60 * 1000;

export async function runGuestsRefresh() {
  const results = [];
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));

  // ── 1. THE OWNER'S TWO SHAPES, AND THE BOUNDARY BETWEEN THEM ────────────
  const LABELS = [
    [0, 'Updated just now', 'the instant it loaded'],
    [59 * 1000, 'Updated just now', 'one second before a minute'],
    [60 * 1000, 'Updated 1 minute ago', 'exactly a minute, and singular'],
    [2 * MIN, 'Updated 2 minutes ago', 'plural from two'],
    [59 * MIN, 'Updated 59 minutes ago', 'the last minute before an hour'],
    [60 * MIN, 'Updated 1 hour ago', 'an hour, singular'],
    [90 * MIN, 'Updated 1 hour ago', 'rounded down, never up'],
    [25 * 60 * MIN, 'Updated 1 day ago', 'a day'],
  ];
  for (const [ms, want, why] of LABELS) {
    const got = updatedLabel(LOADED, at(ms));
    results.push(got === want
      ? pass(`label: ${why}`, got)
      : fail(`label: ${why}`, want, got));
  }

  // NOTHING LOADED YET IS NOT "just now". An empty string lets the caller
  // render it unguarded and show nothing before the first load lands.
  ok('before the first load the label is empty', updatedLabel(null, LOADED) === '', 'empty');
  ok('  and an unreadable timestamp is empty too, not NaN',
     updatedLabel('not a date', LOADED) === '', 'empty');
  // A CLOCK THAT WENT BACKWARDS. Daylight saving and a corrected system clock
  // both do this, and "Updated -3 minutes ago" is what a person screenshots.
  ok('a clock that went backwards reads as just now, never negative',
     updatedLabel(LOADED, at(-5000)) === 'Updated just now', updatedLabel(LOADED, at(-5000)));

  // ── 2. THE FALLBACK LINE, WORD FOR WORD ─────────────────────────────────
  ok('the failed-refresh line is the owner\'s sentence',
     refreshFailedLine(LOADED) === 'Could not refresh. Showing the list from 2:05 pm.',
     refreshFailedLine(LOADED));
  ok('  and it names the last SUCCESSFUL load, not now',
     refreshFailedLine(LOADED).includes(clockTime(LOADED)), clockTime(LOADED));
  ok('  with a usable sentence when nothing had loaded yet',
     refreshFailedLine(null) === 'Could not refresh. Please try again.', refreshFailedLine(null));
  // BUILT FROM PARTS, so no locale can turn 2:05 pm into something else and
  // no guard has to pin a locale to read it.
  ok('the time is built from parts, so a locale cannot vary it',
     !/toLocaleTimeString|toLocaleString/.test(code('src/lib/lastUpdated.js')), 'no locale call');

  // ── 3. THE PAGE NO LONGER CARRIES EITHER CONTROL ────────────────────────
  //
  // REMOVED BY OWNER RULING, 2026-10-11, item 3 of
  // goals/2026-10-11-dashboard-fixes-batch-1.md: the Refresh button and the
  // age line go together, which is how they shipped. Everything this section
  // used to assert about them is therefore obsolete, and deleting the section
  // outright would leave nothing to stop them being reinstated by a later
  // refactor that read the removal as an accident.
  //
  // So it inverts: the controls must stay gone, and the page must not carry
  // the state they needed. The sections above are untouched, because
  // src/lib/lastUpdated.js still behaves correctly and is still worth
  // guarding. It now has NO CONSUMERS: the Guests page was its only one, and
  // that is reported rather than resolved by deleting a working module.
  const g = code('src/pages/Guests.jsx');

  ok('the Refresh control is gone from the Guests page',
     !/data-guests-refresh/.test(g), 'removed');
  ok('  and the age line with it',
     !/data-guests-updated/.test(g), 'removed');
  ok('  neither label is computed anywhere on the page',
     !/updatedLabel\(/.test(g) && !/refreshFailedLine\(/.test(g), 'no caller');
  ok('  and the page no longer imports them',
     !/lib\/lastUpdated/.test(g), 'no import');

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
