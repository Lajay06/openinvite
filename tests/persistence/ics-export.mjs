/**
 * tests/persistence/ics-export.mjs
 *
 * PR4a: covers src/lib/ics.js, the shared RFC 5545 builder behind
 * ScheduleHub's "Add to calendar (.ics)" (full schedule) and ScheduleList's
 * per-row calendar-plus icon (single event). Pure logic, no live
 * Base44/network calls. The actual cross-client import behavior (Google
 * Calendar / Apple Calendar / Outlook) isn't something a unit test can
 * verify — that was done manually, see PR4's description for the
 * screenshot evidence. This test guards the structural contract: valid
 * VCALENDAR/VEVENT framing, correct DTSTART/DTEND, text escaping, line
 * folding, and the "missing end_time defaults to +1h" / "missing
 * event_date or start_time is skipped" rules.
 */

import { pass, fail } from './_shared.mjs';
import { buildIcsCalendar, slugifyForFilename } from '../../src/lib/ics.js';

export async function runIcsExport() {
  const results = [];

  console.log('\n  ICS export — VCALENDAR/VEVENT structure:\n');

  // ── Basic single-event calendar ──────────────────────────────────────────
  const basic = buildIcsCalendar([
    { id: 'e1', event_name: 'Ceremony', event_date: '2026-12-31', start_time: '15:00', end_time: '15:45', location: 'Crown Sydney', responsible_person: 'Wedding planner' },
  ], 'Wedding schedule');

  results.push(basic.startsWith('BEGIN:VCALENDAR')
    ? pass('Starts with BEGIN:VCALENDAR')
    : fail('Starts with BEGIN:VCALENDAR', 'BEGIN:VCALENDAR', basic.slice(0, 20)));
  results.push(basic.trim().endsWith('END:VCALENDAR')
    ? pass('Ends with END:VCALENDAR')
    : fail('Ends with END:VCALENDAR', 'END:VCALENDAR', basic.trim().slice(-20)));
  results.push(basic.includes('VERSION:2.0')
    ? pass('Includes VERSION:2.0')
    : fail('Includes VERSION:2.0', true, false));
  results.push((basic.match(/BEGIN:VEVENT/g) || []).length === 1
    ? pass('Exactly one VEVENT for one input record')
    : fail('Exactly one VEVENT for one input record', 1, (basic.match(/BEGIN:VEVENT/g) || []).length));
  results.push(basic.includes('DTSTART:20261231T150000')
    ? pass('DTSTART reflects event_date + start_time, floating local time')
    : fail('DTSTART reflects event_date + start_time, floating local time', 'DTSTART:20261231T150000', basic));
  results.push(basic.includes('DTEND:20261231T154500')
    ? pass('DTEND reflects end_time when provided')
    : fail('DTEND reflects end_time when provided', 'DTEND:20261231T154500', basic));
  results.push(basic.includes('SUMMARY:Ceremony')
    ? pass('SUMMARY set from event_name')
    : fail('SUMMARY set from event_name', 'SUMMARY:Ceremony', basic));
  results.push(basic.includes('LOCATION:Crown Sydney')
    ? pass('LOCATION set from location')
    : fail('LOCATION set from location', 'LOCATION:Crown Sydney', basic));
  results.push(basic.includes('Responsible: Wedding planner')
    ? pass('DESCRIPTION includes responsible_person')
    : fail('DESCRIPTION includes responsible_person', 'Responsible: Wedding planner', basic));
  results.push(/\r\n/.test(basic)
    ? pass('Uses CRLF line endings (RFC 5545 requirement)')
    : fail('Uses CRLF line endings (RFC 5545 requirement)', true, false));

  // ── Missing end_time — defaults to start_time + 1 hour ───────────────────
  const noEnd = buildIcsCalendar([
    { id: 'e2', event_name: 'Getting ready', event_date: '2026-12-31', start_time: '09:00' },
  ]);
  results.push(noEnd.includes('DTEND:20261231T100000')
    ? pass('Missing end_time defaults DTEND to start_time + 1 hour', '20261231T100000')
    : fail('Missing end_time defaults DTEND to start_time + 1 hour', 'DTEND:20261231T100000', noEnd));

  // ── Records missing event_date or start_time are skipped, not crashed on ─
  const incomplete = buildIcsCalendar([
    { id: 'e3', event_name: 'Undated idea', event_date: '', start_time: '' },
    { id: 'e4', event_name: 'No start time', event_date: '2026-12-31', start_time: '' },
    { id: 'e5', event_name: 'Valid event', event_date: '2026-12-31', start_time: '10:00' },
  ]);
  results.push((incomplete.match(/BEGIN:VEVENT/g) || []).length === 1
    ? pass('Records missing event_date/start_time are silently skipped, valid ones kept', 1)
    : fail('Records missing event_date/start_time are silently skipped, valid ones kept', 1, (incomplete.match(/BEGIN:VEVENT/g) || []).length));

  // ── Text escaping ─────────────────────────────────────────────────────────
  const escaped = buildIcsCalendar([
    { id: 'e6', event_name: 'Toasts, speeches; drinks', event_date: '2026-12-31', start_time: '20:00', description: 'Line one\nLine two' },
  ]);
  results.push(escaped.includes('SUMMARY:Toasts\\, speeches\\; drinks')
    ? pass('Commas and semicolons in SUMMARY are escaped')
    : fail('Commas and semicolons in SUMMARY are escaped', 'Toasts\\, speeches\\; drinks', escaped));
  results.push(escaped.includes('Line one\\nLine two')
    ? pass('Newlines in DESCRIPTION are escaped to literal \\n')
    : fail('Newlines in DESCRIPTION are escaped to literal \\n', 'Line one\\nLine two', escaped));

  // ── Line folding — a long location must be folded at 75 octets ──────────
  const longLocation = 'A'.repeat(120);
  const folded = buildIcsCalendar([
    { id: 'e7', event_name: 'Reception', event_date: '2026-12-31', start_time: '18:00', location: longLocation },
  ]);
  const longestLine = Math.max(...folded.split('\r\n').map(l => l.length));
  results.push(longestLine <= 75
    ? pass('No output line exceeds 75 octets (RFC 5545 folding)', longestLine)
    : fail('No output line exceeds 75 octets (RFC 5545 folding)', '<=75', longestLine));
  results.push(folded.includes(longLocation.slice(0, 20))
    ? pass('Folded content still contains the original text intact')
    : fail('Folded content still contains the original text intact', true, false));

  // ── Multiple events in one calendar (full-schedule export) ──────────────
  const multi = buildIcsCalendar([
    { id: 'e8', event_name: 'Ceremony', event_date: '2026-12-31', start_time: '15:00' },
    { id: 'e9', event_name: 'Reception', event_date: '2026-12-31', start_time: '18:00' },
    { id: 'e10', event_name: 'After-party', event_date: '2027-01-01', start_time: '00:30' },
  ]);
  results.push((multi.match(/BEGIN:VEVENT/g) || []).length === 3
    ? pass('Full-schedule export includes one VEVENT per record', 3)
    : fail('Full-schedule export includes one VEVENT per record', 3, (multi.match(/BEGIN:VEVENT/g) || []).length));
  const uids = [...multi.matchAll(/UID:([^\r\n]+)/g)].map(m => m[1]);
  results.push(new Set(uids).size === uids.length
    ? pass('Every VEVENT has a unique UID', uids.length)
    : fail('Every VEVENT has a unique UID', 'all unique', uids));

  // ── Filename slug ─────────────────────────────────────────────────────────
  results.push(slugifyForFilename('First Look & Photos!') === 'first-look-photos'
    ? pass('slugifyForFilename produces a filesystem-safe slug', slugifyForFilename('First Look & Photos!'))
    : fail('slugifyForFilename produces a filesystem-safe slug', 'first-look-photos', slugifyForFilename('First Look & Photos!')));
  results.push(slugifyForFilename('') === 'event'
    ? pass('slugifyForFilename falls back to "event" for empty input')
    : fail('slugifyForFilename falls back to "event" for empty input', 'event', slugifyForFilename('')));

  return results;
}
