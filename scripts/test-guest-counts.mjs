/**
 * scripts/test-guest-counts.mjs
 *
 * The guest numbers on the phone add up (mobile goal 8, item 3). For every
 * wedding event in the demo fixtures, and for all events together:
 *
 *   invited === attending + declined + awaiting
 *
 * and the list filter behind each stat selects exactly the rows the stat
 * counts (per event, where rows are what is counted). It also pins the
 * per-event function to the desktop's own inline logic in Guests.jsx by
 * recomputing it here the way that page does.
 *
 * The fixtures import the image manifest (a .ts file with bundler-style
 * paths), so the test bundles its entry with esbuild first, the same tool
 * Vite uses, and runs the result under plain Node. No browser, no network.
 *
 * Usage: npm run test:guest-counts
 */
import { build } from 'esbuild';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const dir = await mkdtemp(path.join(tmpdir(), 'oi-guest-counts-'));
const entry = path.join(dir, 'entry.mjs');
const out = path.join(dir, 'bundle.mjs');
await writeFile(entry, `
  export { countGuests, holdsInvariant, guestMatchesStat, GUEST_STAT_LABELS } from '${root}/src/mobile/screens/guests/guestCounts.js';
  export { FIXTURE_GUESTS, FIXTURE_WEDDING } from '${root}/src/mobile/fixtures/index.js';
  export { getWeddingEvents, getGuestEventResponse } from '${root}/src/lib/weddingEvents.js';
`);
await build({
  entryPoints: [entry], outfile: out, bundle: true, format: 'esm', platform: 'node', logLevel: 'silent',
  alias: { '@': path.join(root, 'src') },
  loader: { '.webp': 'dataurl', '.png': 'dataurl', '.svg': 'dataurl' },
});
const m = await import(pathToFileURL(out).href);
await rm(dir, { recursive: true, force: true });

const { countGuests, holdsInvariant, guestMatchesStat, GUEST_STAT_LABELS, FIXTURE_GUESTS, FIXTURE_WEDDING, getWeddingEvents, getGuestEventResponse } = m;
const events = getWeddingEvents(FIXTURE_WEDDING);
assert.ok(events.length >= 2, 'the fixtures have at least the ceremony and the reception');

let checks = 0;
const say = (s) => { checks++; console.log(`  ok  ${s}`); };

// All events.
{
  const c = countGuests(FIXTURE_GUESTS, null);
  assert.ok(holdsInvariant(c), `all events: ${c.invited} invited, ${c.attending} + ${c.declined} + ${c.awaiting}`);
  say(`all events: ${c.invited} invited = ${c.attending} attending + ${c.declined} declined + ${c.awaiting} awaiting reply`);
  assert.ok(holdsInvariant(c.plusOnes) && holdsInvariant(c.guests), 'the plus-one and guest breakdowns add up on their own');
  for (const k of ['invited', 'attending', 'declined', 'awaiting']) assert.equal(c.guests[k] + c.plusOnes[k], c[k], `${k}: guests + plus-ones = total`);
  say(`all events: ${c.guests.invited} guests and ${c.plusOnes.invited} plus-ones make the ${c.invited}`);
  // The rows a stat filter selects are the primaries the stat counts.
  for (const { key } of GUEST_STAT_LABELS) {
    const rows = FIXTURE_GUESTS.filter((g) => guestMatchesStat(g, key, null)).length;
    assert.equal(rows, c.guests[key], `all events, ${key}: the filter lists ${rows} rows, the stat counts ${c.guests[key]} guests`);
  }
  say('all events: each stat filter lists exactly the guests it counts');
  assert.ok(c.invited > 0 && c.attending > 0 && c.declined > 0 && c.awaiting > 0, 'the fixtures exercise every column');
}

// Every event.
for (const ev of events) {
  const c = countGuests(FIXTURE_GUESTS, ev);
  assert.ok(holdsInvariant(c), `${ev.name}: ${c.invited} invited, ${c.attending} + ${c.declined} + ${c.awaiting}`);
  // Guests.jsx's eventStats, recomputed the way that page does it.
  let invited = 0, yes = 0, no = 0, pending = 0;
  for (const g of FIXTURE_GUESTS) { const r = getGuestEventResponse(g, ev); if (!r.invited) continue; invited++; if (r.status === 'yes') yes++; else if (r.status === 'no') no++; else pending++; }
  assert.deepEqual({ invited: c.invited, attending: c.attending, declined: c.declined, awaiting: c.awaiting }, { invited, attending: yes, declined: no, awaiting: pending }, `${ev.name}: matches the desktop's per-event counts`);
  for (const { key } of GUEST_STAT_LABELS) {
    const rows = FIXTURE_GUESTS.filter((g) => guestMatchesStat(g, key, ev)).length;
    assert.equal(rows, c[key], `${ev.name}, ${key}: the filter lists ${rows} rows, the stat says ${c[key]}`);
  }
  say(`${ev.name}: ${c.invited} invited = ${c.attending} + ${c.declined} + ${c.awaiting}, as the desktop counts it, and each filter matches`);
}

// The invariant is a property, not a coincidence of the fixtures: constructed edge cases.
{
  const mk = (id, extra) => ({ id, name: `G ${id}`, ...extra });
  const edge = [
    mk('a', { rsvp_status: 'attending' }),                                   // answered, no invitation on record
    mk('b', { rsvp_status: 'maybe', invite_sent_at: '2026-01-01' }),          // a maybe is still awaiting
    mk('c', { invite_sent_at: '2026-01-01' }),                                // no status at all
    mk('d', { rsvp_status: 'declined', invite_sent_at: '2026-01-01', plus_one: true, plus_one_name: 'Pat', plus_one_rsvp: 'attending' }),
    mk('e', { rsvp_status: 'pending' }),                                      // never invited, never answered: not counted
    mk('f', { plus_one: true }),                                              // a permission is not a person
  ];
  const c = countGuests(edge, null);
  assert.ok(holdsInvariant(c), 'edge cases add up');
  assert.deepEqual({ invited: c.invited, attending: c.attending, declined: c.declined, awaiting: c.awaiting }, { invited: 5, attending: 2, declined: 1, awaiting: 2 });
  assert.equal(c.plusOnes.attending, 1, 'the named plus-one counts as a head');
  say('edge cases: an answer without an invitation, a maybe, a blank status, a named plus-one, the uninvited and the bare permission all add up');
  const ev = { event_id: 'x', name: 'X', isMain: true };
  const ce = countGuests([mk('a', { event_responses: [{ event_id: 'x', invited: true, status: 'yes' }] }), mk('b', { event_responses: [{ event_id: 'x', invited: true, status: 'maybe' }] }), mk('c', { event_responses: [{ event_id: 'x', invited: false }] }), mk('d', {})], ev);
  assert.deepEqual({ invited: ce.invited, attending: ce.attending, declined: ce.declined, awaiting: ce.awaiting }, { invited: 3, attending: 1, declined: 0, awaiting: 2 }, 'per event: a main event invites a guest with no responses, a maybe awaits');
  say('edge cases, per event: the main-event default and a maybe both land in a column');
}

console.log(`\n  ${checks} checks passed.\n`);
