/**
 * tests/persistence/mobile-status-writes.mjs
 *
 * A STATUS THE COUPLE RECORDS ON THE PHONE IS A PER-EVENT ANSWER, AND A MAYBE
 * IS COUNTED THE WAY THE WEB COUNTS IT.
 *
 * Mobile parity 5 of goals/2026-10-10-mobile-pass.md.
 *
 * Two faults, both found by lane D's scout and both invisible until a couple
 * used the control:
 *
 *   THE WRITE RECORDED NOTHING. The shell's guest sheet saved a flat
 *   rsvp_status and left event_responses alone. Since #897 a guest's status
 *   is derived from event_responses on every surface (the my-guests-rsvp
 *   overlay re-derives it on read), so a couple who marked a guest Attending
 *   saw them go straight back to Awaiting reply on the next load. The import
 *   sheet had the same fault from the other side: it never passed the
 *   wedding's events to parseGuestFile and then overwrote whatever it
 *   returned with an empty array, so an RSVP column was thrown away.
 *
 *   MAYBE WAS COUNTED AS AWAITING. The phone's counter put a maybe in
 *   Awaiting reply. The web gives it its own bucket and counts it as a reply
 *   (#936), so the two told the couple different things about the same guest.
 *
 * The count checks run the shell's real counting module against the web's own
 * predicates, so "the way the web counts it" is a comparison, not a copy of a
 * number. The write checks read source, because the container is JSX that
 * plain Node cannot load.
 */

import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { pass, fail, stripComments } from './_shared.mjs';

const ROOT = path.resolve(new URL('../../', import.meta.url).pathname);
const readOrEmpty = (p) => { try { return fs.readFileSync(path.join(ROOT, p), 'utf8'); } catch { return ''; } };
const code = (p) => stripComments(readOrEmpty(p), { trailing: true });

/** The text between two markers, or '' when either is missing. */
function span(src, from, to) {
  const a = src.indexOf(from);
  if (a < 0) return '';
  const b = src.indexOf(to, a + from.length);
  return b < 0 ? '' : src.slice(a, b);
}

const EV = [
  { event_id: 'ceremony', name: 'Ceremony', isMain: true },
  { event_id: 'reception', name: 'Reception', isMain: true },
];
const answered = (status) => EV.map((e) => ({ event_id: e.event_id, invited: true, status }));
const GUESTS = [
  { id: 'a', name: 'A', invite_sent_at: '2026-10-01', rsvp_status: 'attending', event_responses: answered('yes') },
  { id: 'd', name: 'D', invite_sent_at: '2026-10-01', rsvp_status: 'declined', event_responses: answered('no') },
  { id: 'm', name: 'M', invite_sent_at: '2026-10-01', rsvp_status: 'maybe', event_responses: answered('maybe') },
  { id: 'p', name: 'P', invite_sent_at: '2026-10-01', rsvp_status: 'pending', event_responses: answered('pending') },
  { id: 'n', name: 'N', rsvp_status: 'pending', event_responses: [] },
];

async function load(rel) {
  try { return await import(`${pathToFileURL(path.join(ROOT, rel)).href}?t=${Date.now()}`); } catch (e) { return { __error: e.message }; }
}

export async function runMobileStatusWrites() {
  const results = [];
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));
  const safe = (fn) => { try { return fn(); } catch (e) { return { __error: e.message }; } };

  // ── THE COUNT, AGAINST THE WEB'S OWN PREDICATES ──────────────────────────
  const counts = await load('src/mobile/screens/guests/guestCounts.js');
  const tally = await load('src/lib/guestRsvpTally.js');
  ok('the shell counter and the web tally both load', !counts.__error && !tally.__error,
     counts.__error || tally.__error || 'guestCounts.js, guestRsvpTally.js');

  const all = safe(() => counts.countGuests(GUESTS, null)) || {};
  ok('all events: a maybe has its own number', all.maybe === 1, `maybe ${all.maybe}`);
  ok('  and is not awaiting a reply', all.awaiting === 1, `awaiting ${all.awaiting}, only the pending guest`);
  ok('  awaiting is the web\'s isAwaitingPrimary, guest for guest',
     typeof tally.isAwaitingPrimary === 'function' && all.guests?.awaiting === GUESTS.filter(tally.isAwaitingPrimary).length,
     `shell ${all.guests?.awaiting}, web ${safe(() => GUESTS.filter(tally.isAwaitingPrimary).length)}`);
  ok('  and the numbers still add up to invited',
     safe(() => counts.holdsInvariant(all)) === true, `${all.invited} = ${all.attending} + ${all.declined} + ${all.maybe} + ${all.awaiting}`);

  const one = safe(() => counts.countGuests(GUESTS, EV[0])) || {};
  ok('one event: a maybe answer is its own number, as eventStats counts it',
     one.maybe === 1 && one.awaiting === 2 && one.invited === 5, `invited ${one.invited}, maybe ${one.maybe}, awaiting ${one.awaiting}`);

  const m = GUESTS[2];
  ok('the Maybe filter selects the maybe, and Awaiting reply does not',
     safe(() => counts.guestMatchesStat(m, 'maybe')) === true && safe(() => counts.guestMatchesStat(m, 'awaiting')) === false
       && safe(() => counts.guestMatchesStat(m, 'maybe', EV[0])) === true && safe(() => counts.guestMatchesStat(m, 'awaiting', EV[0])) === false,
     'all events and one event');
  ok('Maybe is a stat, shown only when someone is a maybe',
     Array.isArray(counts.GUEST_STAT_LABELS) && counts.GUEST_STAT_LABELS.some((s) => s.key === 'maybe' && s.whenAny), 'whenAny');

  const screen = code('src/mobile/screens/guests/GuestsScreen.jsx');
  ok('the list screen filters on maybe', /case 'maybe':/.test(screen), "applyGuestFilter has a 'maybe' case");
  ok('  hides the Maybe stat at zero', /GUEST_STAT_LABELS\.filter\(\(st\) => !st\.whenAny \|\| counts\[st\.key\] > 0\)/.test(screen), 'whenAny honored');
  ok('  and its replied bar counts a maybe as a reply',
     /ProgressBar value=\{counts\.invited - counts\.awaiting\}/.test(screen), 'invited minus awaiting');

  // A per-event maybe fell through to the pending chip and read "Awaiting reply".
  const detail = code('src/mobile/screens/guests/GuestDetailScreen.jsx');
  ok('a per-event maybe is labeled Maybe on the row and on the detail',
     [screen, detail].every((s) => /const EVENT_STATUS = \{[^}]*maybe: \['neutral', 'Maybe'\]/.test(s)), 'GuestsScreen, GuestDetailScreen');

  // ── THE WRITE, THROUGH statusWrite.js ────────────────────────────────────
  const container = code('src/mobile/screens/guests/GuestsContainer.jsx');
  ok('the guest container imports the web status write',
     /import \{ applyStatusToEventResponses \} from '@\/lib\/statusWrite';/.test(container), '@/lib/statusWrite');
  const save = span(container, 'const save = async', 'const removeGuest');
  ok('  and the sheet save builds event_responses with it',
     /event_responses:\s*applyStatusToEventResponses\(\{/.test(save), 'inside save');
  ok('  from the wedding\'s events, the guest being edited and the chosen status',
     /events:\s*weddingEvents/.test(save) && /guest:\s*sheet\.guest \|\| \{\}/.test(save) && /status:\s*fieldsOut\.rsvp_status/.test(save),
     'events, guest, status');
  ok('  and both the update and the create send that object',
     /guestWrites\.update\(sheet\.guest\.id, (?:withBounceCleared\()?rest[,)]/.test(save) && /guestWrites\.create\(rest, d\)/.test(save), 'rest carries it');

  const sheets = code('src/mobile/screens/guests/GuestSheets.jsx');
  const importSheet = span(sheets, 'export function ImportGuestsSheet', '\nexport function ');
  ok('the import sheet parses with the wedding\'s events',
     (importSheet.match(/parseGuestFile\([^)]*, weddingEvents\)/g) || []).length === 2, 'both parse calls');
  ok('  and keeps the answers the parse returned',
     /onCreate\(\{ event_responses: \[\], \.\.\.data \}\)/.test(importSheet) && !/\.\.\.data, event_responses:/.test(importSheet),
     'the empty default comes first, the parsed rows win');
  ok('  and the container hands it the events',
     /<ImportGuestsSheet\b[^\n]*\bweddingEvents=\{weddingEvents\}/.test(container), 'prop passed');

  return results;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = await runMobileStatusWrites();
  process.exit(r.every(Boolean) ? 0 : 1);
}
