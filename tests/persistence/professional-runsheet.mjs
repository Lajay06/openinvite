/**
 * tests/persistence/professional-runsheet.mjs
 *
 * Openinvite Professional: the run sheet's rules. goals/2026-10-14-professional.md,
 * What a professional gets, 3.
 *
 * PLANT (R19): a shift that also moves the selected row, or rows on other
 * sheets, must fail the same check that passes the real one.
 */
import { readFileSync } from 'node:fs';
import { pass, fail } from './_shared.mjs';
import {
  fmtTime, parseTime, grid, shiftAfter, moveTo, findIssues, toCsv, vendorRows, sheetsOf, duplicateOf, STEPS, DAY_START, DAY_END,
} from '../../src/lib/professionalRunSheet.js';

const R = (id, sheet, start, dur, owner = '', item = id) => ({ id, sheet, start_minute: start, duration_minutes: dur, owner_ref: owner, item, sort: 0 });

export function runProfessionalRunsheet(shift = shiftAfter) {
  const r = [];
  const check = (name, ok, detail) => r.push(ok ? pass(name, detail) : fail(name, 'see name', detail));
  console.log('\n  Professional, the run sheet:\n');

  check('professional run sheet: 15-minute rows from 7:00 to midnight by default', grid([]).length === (DAY_END - DAY_START) / 15 && grid([])[0].minute === 420, `${grid([]).length} rows`);
  check('professional run sheet: switchable to 5 or 30', STEPS.join() === '5,15,30' && grid([], { step: 5 }).length === 204 && grid([], { step: 30 }).length === 34, '5, 15, 30');
  check('professional run sheet: a row before 7:00 stretches the grid instead of hiding', grid([R('early', 'Setup', 330, 30)])[0].minute === 330, fmtTime(330));
  check('professional run sheet: times read and write both ways', fmtTime(990) === '4:30 pm' && fmtTime(1440) === 'midnight' && parseTime('4:30 pm') === 990 && parseTime('16:30') === 990 && parseTime('9am') === 540 && parseTime('25:00') === null, 'ok');

  const rows = [R('a', 'Ceremony', 960, 30), R('b', 'Ceremony', 990, 15), R('c', 'Ceremony', 1020, 30), R('x', 'Reception', 1000, 60)];
  const moved = shift(rows, 'b', 20);
  check('professional run sheet: shifting after a row moves only the rows after it, on its sheet', moved.length === 1 && moved[0].id === 'c' && moved[0].start_minute === 1040, JSON.stringify(moved));
  check('professional run sheet: a negative shift pulls rows earlier', shiftAfter(rows, 'a', -10).map((p) => p.start_minute).join() === '980,1010', 'earlier');

  const mv = moveTo(rows.filter((x) => x.sheet === 'Ceremony'), 'c', 'a');
  check('professional run sheet: dragging a row onto another takes its place and time', mv[0].id === 'c' && mv[0].start_minute === 960 && mv.map((p) => p.sort).join() === '0,1,2', JSON.stringify(mv));

  const clash = findIssues([R('p', 'Ceremony', 960, 30, 'sam', 'Ceremony'), R('q', 'Reception', 975, 30, 'sam', 'Canapes'), R('z', 'Reception', 1200, 15, 'jo')], (x) => x);
  check('professional run sheet: one person on two overlapping rows is a clash, across sheets', clash.some((i) => i.kind === 'clash' && i.text.includes('sam')), clash.map((i) => i.text).join(' | '));
  check('professional run sheet: more than 30 minutes with nothing running is a gap', clash.some((i) => i.kind === 'gap' && i.text.startsWith('Reception')), 'gap found');
  check('professional run sheet: back-to-back rows are neither', findIssues([R('a', 'S', 600, 30, 'sam'), R('b', 'S', 630, 30, 'sam')]).length === 0, 'none');

  const csv = toCsv([R('a', 'Ceremony', 960, 30, '', '=HYPERLINK("x")'), R('b', 'Setup', 540, 60, 'v1', 'Load, in')], (x) => (x === 'v1' ? 'Wild Stem' : ''));
  const lines = csv.split('\r\n');
  check('professional run sheet: CSV in planner order, Setup before Ceremony, with a header', lines[0].startsWith('Sheet,Start,End') && lines[1].startsWith('Setup') && lines[2].startsWith('Ceremony'), lines.slice(0, 3).join(' / '));
  check('professional run sheet: a cell that a spreadsheet would run as a formula is written as text', lines[2].includes('"\'=HYPERLINK(""x"")"') && lines[1].includes('"Load, in"'), lines[2]);

  check('professional run sheet: a vendor sheet holds that vendor’s rows only, across sheets', vendorRows([R('a', 'S', 1, 1, 'v1'), R('b', 'T', 2, 1, 'v2'), R('c', 'T', 3, 1, 'v1')], 'v1').map((x) => x.id).join() === 'a,c', 'a,c');
  check('professional run sheet: default sheets come first, custom after', sheetsOf([R('a', 'Afterparty', 1, 1), R('b', 'Reception', 1, 1), R('c', 'Setup', 1, 1)]).join() === 'Setup,Reception,Afterparty', 'ordered');
  const dup = duplicateOf({ id: 'a', created_date: 'x', item: 'Speeches', status: 'done', sort: 2 });
  check('professional run sheet: a duplicate is a new row, just after, not done', !('id' in dup) && dup.sort === 2.5 && dup.status === 'todo', JSON.stringify(dup));

  // The tab's keyboard contract, read from source: arrows, Enter, Cmd or Ctrl+D.
  const tab = readFileSync(new URL('../../src/components/professional/event/RunSheetTab.jsx', import.meta.url), 'utf8');
  check('professional run sheet: the keyboard handles arrows, Enter and Cmd or Ctrl+D', /ArrowDown/.test(tab) && /e\.key === 'Enter' && selected/.test(tab) && /\(e\.metaKey \|\| e\.ctrlKey\) && e\.key\.toLowerCase\(\) === 'd'/.test(tab), 'wired');
  check('professional run sheet: PDF in A4 and Letter, landscape, and CSV', /pdf\('a4'\)/.test(tab) && /pdf\('letter'\)/.test(tab) && /orientation: 'landscape'/.test(readFileSync(new URL('../../src/components/professional/proExport.js', import.meta.url), 'utf8')), 'both');

  // PLANT: a shift that includes the row itself and every sheet.
  if (shift === shiftAfter) {
    const planted = (rs, id, n) => rs.map((x) => ({ id: x.id, start_minute: x.start_minute + n }));
    const bad = planted(rows, 'b', 20);
    check('PLANT: a shift that moves the selected row and other sheets is told apart', !(bad.length === 1 && bad[0].id === 'c'), `${bad.length} rows moved`);
  }
  return r;
}
