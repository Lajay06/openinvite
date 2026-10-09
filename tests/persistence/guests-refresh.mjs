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

  // ── 3. THE PAGE: ONLY A SUCCESSFUL LOAD MAY CLAIM FRESHNESS ─────────────
  const g = code('src/pages/Guests.jsx');

  ok('the page has a Refresh control at the top of the list',
     /data-guests-refresh/.test(g) && /onClick=\{refreshNow\}/.test(g), 'Refresh');
  ok('  and the age beside it', /data-guests-updated/.test(g), 'updated line');
  ok('  both reading from the same lastLoadedAt',
     /updatedLabel\(lastLoadedAt\)/.test(g) && /refreshFailedLine\(lastLoadedAt\)/.test(g), 'one source');

  // THE CENTRAL ASSERTION. setLastLoadedAt may appear exactly once, and it
  // must be inside the success path: more than one call site is how a failed
  // attempt would come to move the timestamp.
  const stamps = (g.match(/setLastLoadedAt\(/g) || []).length;
  ok('the timestamp is set in exactly one place', stamps === 1, `${stamps} call site(s)`);
  const stampAt = g.indexOf('setLastLoadedAt(');
  const catchAt = g.indexOf('setRefreshFailed(true)');
  ok('  and that place is before the catch, so only a success moves it',
     stampAt > 0 && catchAt > 0 && stampAt < catchAt, `stamp at ${stampAt}, catch at ${catchAt}`);

  // THE LIST SURVIVES. The catch must not clear the rows; asserted on what
  // the catch block contains rather than on the absence of a setter
  // elsewhere, because setGuests([]) is legitimate on other paths.
  const catchBlock = g.slice(catchAt - 200, catchAt + 300);
  ok('a failed refresh does not empty the list',
     !/setGuests\(\s*\[\s*\]\s*\)/.test(catchBlock), 'rows kept');
  ok('  and does not clear the tables either',
     !/setTables\(\s*\[\s*\]\s*\)/.test(catchBlock), 'tables kept');
  ok('  it records the failure so the line can be shown',
     /setRefreshFailed\(true\)/.test(g), 'flagged');
  ok('  and a later success clears that flag',
     /setRefreshFailed\(false\)/.test(g), 'cleared on success');

  // THE TICK CARRIES NO STATE. It exists to re-render, and the owner's words
  // were "driven by the time of the last successful load, not by the page's
  // own clock": a counter started at mount would survive a failed refresh.
  ok('the re-render tick holds no age of its own',
     /setNowTick\(\(t\) => t \+ 1\)/.test(g) && /clearInterval\(id\)/.test(g),
     'interval, cleaned up');
  ok('  and the label is never computed from it',
     !/updatedLabel\([^)]*[Tt]ick/.test(g), 'tick is not an input');

  return results;
}
