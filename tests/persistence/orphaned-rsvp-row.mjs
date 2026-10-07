/**
 * tests/persistence/orphaned-rsvp-row.mjs
 *
 * A ROW WHOSE GUEST IS GONE COUNTS FOR NOTHING.
 *
 * Owner's addition to item 8 of goals/2026-10-07-households-and-children.md:
 * an orphaned RsvpResponse row must appear in no count, no tally, no chart and
 * no Ava context.
 *
 * ── HOW A ROW IS ORPHANED, AND WHY IT IS NOT HYPOTHETICAL ──────────────────
 *
 * RsvpResponse is APPEND-ONLY and keyed by guest_id_hash, an HMAC of the Guest
 * row's id. Deleting a guest deletes no rows: nothing in the product reads a
 * hash backwards to find them, and nothing could, which is the point of the
 * hash. Every guest the couple has ever deleted after a reply, and every
 * household member moved out and re-created, has left rows behind.
 *
 * Item 3 of this goal makes it routine rather than rare: a delete is now
 * optimistic with a 30-second undo, so the product deletes guests on a timer.
 *
 * ── WHY IT HOLDS TODAY, STATED AS A PROPERTY ───────────────────────────────
 *
 * EVERY LIVE COUNT IS KEYED BY GUEST, NOT BY ROW. api/my-guests-rsvp.js groups
 * rows into Maps by hash and then iterates GUESTS, so an orphan sits in a Map
 * nobody looks up. guestCounts, tallyAttendees, RSVPChart and the Ava context
 * all take a guest list and have no row parameter at all.
 *
 * THE ONE FUNCTION THAT WOULD COUNT ROWS DIRECTLY IS UNUSED.
 * rsvpAggregation.js's aggregateEventTallies walks rows and counts statuses,
 * so an orphan WOULD be counted by it. It has no callers. That is pinned here,
 * not as trivia: the day someone wires a per-event chart to it, this guard
 * fails and asks them to deal with orphans first.
 */

import fs from 'fs';
import path from 'path';
import { pass, fail } from './_shared.mjs';
import { overlayStatusForGuest, hasNothingToOverlay } from '../../api/my-guests-rsvp.js';
import {
  latestEventResponses, latestGuestLevel, aggregateEventTallies, deriveRsvpStatus,
} from '../../src/lib/rsvpAggregation.js';
import { guestCounts, tallyAttendees } from '../../src/lib/guestRsvpTally.js';
import { counts as householdCounts } from '../../src/lib/household.js';
import { householdCountLine } from '../../src/lib/eventTallies.js';

const ROOT = path.resolve(new URL('../../', import.meta.url).pathname);
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const code = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

// Two guests and their rows, plus rows for a third guest who no longer exists.
const GUESTS = [
  { id: 'g1', name: 'Priya Patel', email: 'priya@example.com', rsvp_status: 'pending', event_responses: [] },
  { id: 'g2', name: 'Dev Patel', rsvp_status: 'pending', event_responses: [] },
];
const row = (hash, over = {}) => ({
  guest_id_hash: hash, is_plus_one: false, event_id: 'main-ceremony', status: 'yes',
  meal_choice: null, plus_ones: 0, plus_one_names: [],
  created_date: '2027-02-01T00:00:00Z', ...over,
});
const LIVE_ROWS = [row('hash-g1'), row('hash-g2', { status: 'no' })];
const ORPHAN = row('hash-of-a-deleted-guest', { status: 'yes' });

export async function runOrphanedRsvpRow() {
  const results = [];
  const check = (label, got, want) => results.push(
    JSON.stringify(got) === JSON.stringify(want)
      ? pass(label, JSON.stringify(got))
      : fail(label, JSON.stringify(want), JSON.stringify(got)));
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));

  // ── THE OVERLAY: GROUPED BY HASH, ITERATED BY GUEST ─────────────────────
  //
  // The endpoint's own shape, rebuilt here from its exported decisions: group
  // the rows, then walk the guests. An orphan is in the Map and in nobody's
  // answer.
  const overlay = (rows) => {
    const byHash = new Map();
    for (const r of latestEventResponses(rows)) {
      if (!byHash.has(r.guest_id_hash)) byHash.set(r.guest_id_hash, []);
      byHash.get(r.guest_id_hash).push(r);
    }
    const levelByHash = new Map(latestGuestLevel(rows).map((r) => [r.guest_id_hash, r]));
    const out = {};
    for (const g of GUESTS) {
      const hash = `hash-${g.id}`;
      const eventRows = byHash.get(hash);
      const guestLevel = levelByHash.get(hash);
      const { eventResponses, rsvp_status: status } = overlayStatusForGuest(g, eventRows);
      if (hasNothingToOverlay({ eventRows, guestLevel, plusOneRsvpStatus: null,
                                storedEventResponses: g.event_responses })) continue;
      out[g.id] = status;
    }
    return out;
  };

  const without = overlay(LIVE_ROWS);
  const with_ = overlay([...LIVE_ROWS, ORPHAN]);
  check('two guests, two answers, before the orphan', without, { g1: 'attending', g2: 'declined' });
  check('the orphan changes nothing in the overlay', with_, without);
  ok('  and gets no entry of its own',
     !Object.keys(with_).some((k) => /deleted/.test(k)), Object.keys(with_).join(', '));
  // THE GROUPING SEES IT. That is what makes the iteration order the property:
  // the row is present and simply never asked for.
  ok('the orphan IS in the grouped rows, so this is not a filter that might be removed',
     latestEventResponses([...LIVE_ROWS, ORPHAN]).some((r) => r.guest_id_hash === ORPHAN.guest_id_hash),
     'present, and never looked up');

  // ── THE COUNTS, THE TALLY, THE CHART AND AVA ────────────────────────────
  //
  // None of these takes a row at all, which is the whole reason an orphan
  // cannot reach them. Asserted by driving them on the guest list and by
  // naming the signature.
  const overlaid = GUESTS.map((g) => ({
    ...g, rsvp_status: with_[g.id] || g.rsvp_status,
    event_responses: [{ event_id: 'main-ceremony', invited: true, status: with_[g.id] === 'attending' ? 'yes' : 'no' }],
  }));
  check('the invitation and people counts are the two guests',
        [guestCounts(overlaid).invitations.total, guestCounts(overlaid).people.attending], [2, 1]);
  check('  and the attendance tally agrees',
        tallyAttendees(overlaid.filter((g) => deriveRsvpStatus(g.event_responses) === 'attending')).combined.attending, 1);
  check('the household numbers are the two guests as well',
        householdCounts(overlaid), { people: 2, adults: 2, children: 0, invitations: 2 });
  check("  and so is Ava's sentence",
        householdCountLine(overlaid), '2 people across 2 invitations, of whom 2 adults and 0 children');

  const tallyLib = code(read('src/lib/guestRsvpTally.js'));
  ok('the tally takes a guest list, never rows',
     /export function guestCounts\(guests\)/.test(tallyLib)
     && !/guest_id_hash/.test(tallyLib), 'no row parameter');
  ok('  and the chart is handed guests too',
     /<RSVPChart guests=\{guests\}/.test(read('src/pages/Dashboard.jsx')), 'guests');
  const ava = code(read('src/lib/avaContextFormat.js'));
  ok('  as is the Ava context, which is handed a guest list and no rows at all',
     /export function formatWeddingContext\(\{ guests = \[\]/.test(ava)
     && !/guest_id_hash|RsvpResponse/.test(ava), 'guests = []');

  const endpoint = code(read('api/my-guests-rsvp.js'));
  ok('the endpoint answers per guest, by walking the guests',
     /for \(const g of guests\) \{/.test(endpoint) && /hashId\(g\.id\)/.test(endpoint),
     'guest-keyed');
  ok('  and the row groupings are only ever looked up by a live guest\'s hash',
     /eventsByGuestHash\.get\(gHash\)/.test(endpoint)
     && !/for \(const \[hash/.test(endpoint), 'never iterated');

  // ── THE ONE FUNCTION THAT WOULD COUNT AN ORPHAN ─────────────────────────

  check('aggregateEventTallies would count it, which is why it matters that nothing calls it',
        aggregateEventTallies([...LIVE_ROWS, ORPHAN])['main-ceremony'], { yes: 2, no: 1 });
  const callers = ['src', 'api', 'scripts'].flatMap((dir) => listFiles(path.join(ROOT, dir)))
    .filter((f) => /\.(js|jsx|mjs)$/.test(f) && !/rsvpAggregation\.js$/.test(f))
    .filter((f) => /aggregateEventTallies/.test(fs.readFileSync(f, 'utf8')));
  check('nothing calls it, so no live surface counts rows', callers.map((f) => path.relative(ROOT, f)), []);

  return results;
}

function listFiles(dir) {
  let out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out = out.concat(listFiles(full));
    else out.push(full);
  }
  return out;
}
