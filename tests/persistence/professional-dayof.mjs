/**
 * tests/persistence/professional-dayof.mjs
 *
 * Openinvite Professional: day-of mode. goals/2026-10-14-professional.md,
 * What a professional gets, 11.
 *
 * PLANT (R19): a "now" that keeps a ticked item on screen must fail the same
 * check, because a tick is how the team says "that is handled".
 */
import { readFileSync } from 'node:fs';
import { pass, fail } from './_shared.mjs';
import { nowNextLater, dialable, saveDayOfCopy, readDayOfCopy, saveKit, readKit, KIT_DEFAULT } from '../../src/lib/professionalDayOf.js';

const memory = () => { const m = new Map(); return { setItem: (k, v) => m.set(k, v), getItem: (k) => (m.has(k) ? m.get(k) : null) }; };
const refusing = { setItem: () => { throw new Error('quota'); }, getItem: () => { throw new Error('blocked'); } };

export function runProfessionalDayof(split = nowNextLater) {
  const r = [];
  const check = (name, ok, detail) => r.push(ok ? pass(name, detail) : fail(name, 'see name', detail));
  console.log('\n  Professional, day-of mode:\n');
  const R = (id, start, dur, status = 'todo') => ({ id, sheet: 'S', start_minute: start, duration_minutes: dur, status, item: id });
  const rows = [R('a', 960, 30), R('b', 990, 30), R('c', 1020, 15), R('d', 1035, 15), R('e', 1050, 15), R('f', 1065, 15), R('g', 940, 10)];

  const at = split(rows, 1000);
  check('professional day-of: now is what is running this minute', at.now.map((x) => x.id).join() === 'b', at.now.map((x) => x.id).join());
  check('professional day-of: next is the next three to start, later is the rest', at.next.map((x) => x.id).join() === 'c,d,e' && at.later.map((x) => x.id).join() === 'f', `${at.next.map((x) => x.id)} / ${at.later.map((x) => x.id)}`);
  check('professional day-of: an item that should have finished and is not ticked is flagged', at.overdue.map((x) => x.id).join() === 'g,a', at.overdue.map((x) => x.id).join());
  const ticked = split(rows.map((x) => (x.id === 'b' ? { ...x, status: 'done' } : x)), 1000);
  check('professional day-of: a ticked item steps out of now', ticked.now.length === 0 && ticked.done.map((x) => x.id).join() === 'b', 'stepped aside');
  check('professional day-of: before the day starts, next is the start of the day', split(rows, -1).next.map((x) => x.id).join() === 'g,a,b', 'g,a,b');

  check('professional day-of: one tap to call or text, with a clean number', dialable('+1 (415) 555-0101') === '+14155550101' && dialable('') === null && dialable('0400 000 000') === '0400000000', dialable('+1 (415) 555-0101'));

  const store = memory();
  saveDayOfCopy('ev', { rows: [R('a', 1, 1)], contacts: [{ name: 'Wild Stem', phone: '1' }], coming: 120 }, store);
  const copy = readDayOfCopy('ev', store);
  check('professional day-of: the sheet, contacts and guest total are kept on the phone for offline', copy?.rows.length === 1 && copy.contacts[0].name === 'Wild Stem' && copy.coming === 120 && copy.saved_at, 'kept');
  check('professional day-of: a phone that refuses storage does not break the page', saveDayOfCopy('ev', {}, refusing) === false && readDayOfCopy('ev', refusing) === null && (saveKit('ev', ['x'], refusing), readKit('ev', refusing)).length === 0, 'degrades');
  saveKit('ev', [KIT_DEFAULT[0]], store);
  check('professional day-of: the emergency kit keeps its ticks', readKit('ev', store)[0] === KIT_DEFAULT[0] && KIT_DEFAULT.length >= 10, `${KIT_DEFAULT.length} items`);

  const page = readFileSync(new URL('../../src/pages/professional/DayOfPage.jsx', import.meta.url), 'utf8');
  check('professional day-of: ticks need the tick right and a connection; offline says so', /can\(me, 'runsheet\.tick', event\)/.test(page) && /const canTick = online &&/.test(page) && /Offline\. Showing the copy saved/.test(page), 'wired');
  check('professional day-of: tick buttons are big enough for a thumb (56px)', /width: 56, height: 56/.test(page), '56px');

  if (split === nowNextLater) {
    const planted = (rs, m) => ({ ...nowNextLater(rs.map((x) => ({ ...x, status: 'todo' })), m) });
    check('PLANT: a now that keeps a ticked item is told apart', planted(rows.map((x) => (x.id === 'b' ? { ...x, status: 'done' } : x)), 1000).now.length === 1, 'planted keeps it');
  }
  return r;
}
