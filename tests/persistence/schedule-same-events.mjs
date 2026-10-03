/**
 * tests/persistence/schedule-same-events.mjs
 *
 * THE COUPLE'S SCHEDULE AND THEIR GUESTS' SCHEDULE SHOW THE SAME EVENTS.
 *
 * They did not. The guest site's celebration page lists the ceremony, the
 * reception and every pre or post-wedding event the couple created, grouped by
 * day. The dashboard schedule listed the Schedule entity's rows, the vendor
 * dates, the deadlines and three LEGACY named fields (rehearsal, welcomeDinner,
 * dayAfterBrunch) that predate preWeddingEvents, and none of the events
 * themselves. A couple who added "Mehndi" on Event details could see it on
 * their guests' site and not on their own schedule.
 *
 * WHICH SOURCE WON, AND WHY IT WAS THIS ONE. The couple's events are now the
 * shared set, and the Schedule entity stays the couple's own run sheet rather
 * than being published to guests. Schedule rows carry responsible_person,
 * description and notes, which are operational and private, there is no
 * per-row guest-visible flag, and Schedule has no event_id to place a row
 * under the event it belongs to. Both of those absences are schema changes.
 * That reasoning is asserted below, not just written down: if Schedule ever
 * gains an event_id, the last check fails and says to revisit it.
 *
 * ONE THING, ONE ROW, in a fixed order of precedence:
 *   a Schedule row            the one the couple can edit on this page
 *   the couple's own event    has an event_id, and is what guests RSVP to
 *   the legacy named field    the old shape of the same party
 */

import fs from 'fs';
import path from 'path';
import { pass, fail } from './_shared.mjs';
import { buildScheduleEvents, ROW_HOME } from '../../src/lib/scheduleEvents.js';
import { getWeddingEvents } from '../../src/lib/weddingEvents.js';

const ROOT = path.resolve(new URL('../../', import.meta.url).pathname);

const DAY = '2027-07-03';
const WD = {
  weddingDate: DAY,
  mainCeremony: { startTime: '15:00', venueName: 'St Mary' },
  reception:    { startTime: '18:30', venueName: 'The Hall' },
  preWeddingEvents: [
    { event_id: 'mehndi',  name: 'Mehndi',         date: '2027-07-01', startTime: '18:00', venueName: 'Home' },
    { event_id: 'wdrinks', name: 'Welcome drinks', date: '2027-07-02', startTime: '19:00' },
  ],
  postWeddingEvents: [
    { event_id: 'brunch', name: 'Recovery brunch', date: '2027-07-04', startTime: '11:00' },
  ],
  // The legacy named field for the same party as 'wdrinks', entered twice.
  welcomeDinner: { date: '2027-07-02', venueName: 'The old field' },
};

const titles = (rows) => rows.map((r) => r.title);

export async function runScheduleSameEvents() {
  const results = [];
  const check = (label, ok, detail) => results.push(ok ? pass(label, detail) : fail(label, 'see name', detail));

  // ── PARITY ──────────────────────────────────────────────────────────────

  const rows = buildScheduleEvents({ weddingDate: DAY, wd: WD });
  const shown = new Set(titles(rows));
  const missing = getWeddingEvents(WD).map((e) => e.name).filter((n) => !shown.has(n));
  check('every event the guest site shows is on the dashboard schedule',
        missing.length === 0, missing.length ? `missing: ${missing.join(', ')}` : titles(rows).join(', '));

  const mehndi = rows.find((r) => r.title === 'Mehndi');
  check('  each one carries its own date, time and venue',
        !!mehndi && mehndi.date === '2027-07-01' && mehndi.time === '18:00' && mehndi.location === 'Home',
        mehndi ? `${mehndi.date} ${mehndi.time} ${mehndi.location}` : 'no row');

  const ceremony = rows.find((r) => r.title === 'Ceremony');
  check("  a main event takes the wedding's own date, which it does not store",
        !!ceremony && ceremony.date === DAY && ceremony.time === '15:00',
        ceremony ? `${ceremony.date} ${ceremony.time}` : 'no row');

  check('  and it is read-only here, pointing home to Event details',
        rows.filter((r) => r.kind === 'wedding-event').every((r) => r.readOnly === true)
        && ROW_HOME['wedding-event']?.to === '/EventDetails',
        `${rows.filter((r) => r.kind === 'wedding-event').length} row(s), home /EventDetails`);

  check('  an event with no date at all is not invented onto the timeline',
        buildScheduleEvents({ wd: { preWeddingEvents: [{ event_id: 'x', name: 'Someday' }] } })
          .every((r) => r.title !== 'Someday'), 'skipped');

  // ── ONE THING, ONE ROW ──────────────────────────────────────────────────

  const withSchedule = buildScheduleEvents({
    weddingDate: DAY, wd: WD,
    scheduleItems: [{ id: 's1', event_name: 'Ceremony', event_date: DAY, start_time: '15:00', location: 'Observatory' }],
  });
  const ceremonies = withSchedule.filter((r) => r.title === 'Ceremony');
  check('a Schedule row for the same event collapses it, and the Schedule row wins',
        ceremonies.length === 1 && ceremonies[0].type === 'schedule' && ceremonies[0].location === 'Observatory',
        ceremonies.map((r) => `${r.type}/${r.location}`).join(' + ') || 'none');

  check("the couple's own event beats the legacy named field for the same party",
        titles(rows).includes('Welcome drinks') && !titles(rows).includes('Welcome dinner'),
        'Welcome drinks kept, Welcome dinner dropped');

  check('  and the legacy field survives on its own when there is no event for it',
        titles(buildScheduleEvents({ weddingDate: DAY, wd: { welcomeDinner: { date: '2027-07-02' } } }))
          .includes('Welcome dinner'), 'kept');

  check('a wedding with no events of its own is unchanged',
        buildScheduleEvents({ weddingDate: DAY, wd: { rehearsal: { date: '2027-07-02' } } })
          .filter((r) => r.kind === 'wedding-event').length === 0, 'no event rows');

  // ── WHY THE SCHEDULE ENTITY DID NOT TRAVEL THE OTHER WAY ────────────────

  const schedule = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'base44/entities/Schedule.jsonc'), 'utf8').replace(/^\s*\/\/.*$/gm, ''));
  const props = schedule.properties || {};
  check('Schedule still carries couple-private operational fields',
        !!props.responsible_person && !!props.notes,
        'responsible_person, notes');
  check('  with no per-row guest-visible flag to publish them behind',
        !Object.keys(props).some((k) => /guest|public|visible|published/i.test(k)),
        Object.keys(props).join(', '));
  check('  and no event_id, so a row could not be placed under its event anyway',
        !props.event_id,
        !props.event_id ? 'no event_id' : 'Schedule now has event_id: revisit which source the guest site reads');

  // The guest site must not have quietly started reading Schedule.
  const celebration = fs.readFileSync(
    path.join(ROOT, 'src/components/guest-website/pages/WeddingCelebrationPage.jsx'), 'utf8');
  check('the guest celebration page reads no Schedule row',
        !/entities\.Schedule|scheduleItems|buildScheduleEvents/.test(celebration),
        'the wedding record only');

  return results;
}
