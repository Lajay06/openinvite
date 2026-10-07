/**
 * tests/persistence/duplicate-check-and-undo.mjs
 *
 * TWO WAYS A GUEST LIST LOSES WORK, AND BOTH ARE NOW RECOVERABLE.
 *
 * Item 3 of goals/2026-10-07-households-and-children.md, C12 and C5 from the
 * essentials sweep.
 *
 *   C12  the single-add form created a second "Priya Patel" beside the first
 *        and said nothing. The import has reported duplicates since it was
 *        written; the form that adds one person at a time did not.
 *   C5   deleting went through window.confirm and then straight to the server,
 *        so the only protection was a modal dismissed by reflex and the only
 *        recovery was retyping the person: name, email, table, dietary notes,
 *        every per-event chip.
 *
 * Both decisions are pure modules, and the delete's clock is injectable, so
 * this drives them rather than waiting thirty seconds or reading the page.
 *
 * ── WHAT THE UNDO IS REALLY PROTECTING ─────────────────────────────────────
 *
 * Not the typing. The ID. A design that deleted immediately and re-created on
 * undo would hand the guest a new id, and every Table.assigned_guests entry,
 * every RsvpResponse keyed to their hash and every per-event row still pointing
 * at the old one would be orphaned BY THE RECOVERY. So the central assertion
 * here is that an undo writes nothing at all: the row never left the database.
 */

import fs from 'fs';
import path from 'path';
import { pass, fail } from './_shared.mjs';
import { findDuplicate, normalizeName, normalizeEmail } from '../../src/lib/guestDuplicate.js';
import { createPendingDeletes, UNDO_WINDOW_MS } from '../../src/lib/pendingDelete.js';

const ROOT = path.resolve(new URL('../../', import.meta.url).pathname);
const stripComments = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[^\n]*?\/\/.*$/gm, (l) => l.slice(0, l.indexOf('//')));
const readCode = (p) => stripComments(fs.readFileSync(path.join(ROOT, p), 'utf8'));

const LIST = [
  { id: 'g1', name: 'Priya Patel', email: 'priya@example.com' },
  { id: 'g2', name: 'Dev Patel' },
  { id: 'g3', name: 'Mina Patel', email: '' },
];

/** A fake clock, so the thirty seconds cost nothing to test. */
function fakeClock() {
  let now = 0;
  const timers = [];
  return {
    setTimer: (fn, ms) => { const t = { fn, at: now + ms, live: true }; timers.push(t); return t; },
    clearTimer: (t) => { if (t) t.live = false; },
    tick: (ms) => { now += ms; for (const t of timers) if (t.live && t.at <= now) { t.live = false; t.fn(); } },
  };
}
const settle = () => new Promise((r) => setTimeout(r, 0));

export async function runDuplicateCheckAndUndo() {
  const results = [];
  const check = (label, got, want) => results.push(
    JSON.stringify(got) === JSON.stringify(want)
      ? pass(label, JSON.stringify(got))
      : fail(label, JSON.stringify(want), JSON.stringify(got)));
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));

  // ── C12: THE DUPLICATE CHECK ────────────────────────────────────────────

  const dup = (cand, excludeId) => {
    const r = findDuplicate(cand, LIST, excludeId);
    return r ? [r.on, r.guest.id] : null;
  };

  check('an exact name matches', dup({ name: 'Priya Patel' }), ['name', 'g1']);
  check('  case and inner spacing are noise', dup({ name: '  priya   PATEL ' }), ['name', 'g1']);
  check('an email matches even when the name differs', dup({ name: 'P Patel', email: 'PRIYA@EXAMPLE.COM' }), ['email', 'g1']);
  check('  and the email is reported as the reason, not the name',
        findDuplicate({ name: 'Priya Patel', email: 'priya@example.com' }, LIST).on, 'email');
  check('a new person matches nothing', dup({ name: 'Rohan Patel' }), null);
  check('an empty name matches nothing', dup({ name: '   ' }), null);
  check('  and neither does an empty email on its own', dup({ name: '', email: '  ' }), null);
  check('editing a guest is never a duplicate of itself', dup({ name: 'Priya Patel' }, 'g1'), null);
  check('  but is still caught against someone else', dup({ name: 'Dev Patel' }, 'g1'), ['name', 'g2']);
  check('an empty stored email does not match an empty candidate email',
        dup({ name: 'Someone New', email: '' }), null);

  // ACCENTS ARE NOT FOLDED, deliberately: "Rene" and "Rene" with an accent are
  // plausibly two people, and the couple can say "Add anyway" if not.
  check('accents are not folded away', dup({ name: 'Priyá Patel' }), null);

  check('normalizeName collapses and lowercases', normalizeName('  A   b  C '), 'a b c');
  check('normalizeEmail only trims and lowercases', normalizeEmail('  A@B.Com '), 'a@b.com');

  // ── C5: THE UNDO WINDOW ─────────────────────────────────────────────────

  check('the window is thirty seconds, as ruled', UNDO_WINDOW_MS, 30000);

  {
    const c = fakeClock();
    const deleted = [];
    const p = createPendingDeletes({ commit: async (id) => { deleted.push(id); },
                                     setTimer: c.setTimer, clearTimer: c.clearTimer });
    p.schedule({ id: 'g1', name: 'Priya Patel' });
    check('scheduling writes nothing yet', [p.size(), deleted], [1, []]);
    c.tick(29999); await settle();
    check('  still nothing one millisecond before the window closes', [p.size(), deleted], [1, []]);
    c.tick(2); await settle();
    check('  and the delete goes when it closes', [p.size(), deleted], [0, ['g1']]);
  }

  {
    const c = fakeClock();
    const deleted = [];
    const p = createPendingDeletes({ commit: async (id) => { deleted.push(id); },
                                     setTimer: c.setTimer, clearTimer: c.clearTimer });
    const guest = { id: 'g2', name: 'Dev Patel', email: 'dev@example.com', table_assignment: 't1' };
    p.schedule(guest);
    const back = p.undo('g2');
    check('undo returns the guest, whole and unchanged', back, guest);
    ok('  the same object, so nothing was rebuilt from fields', back === guest, 'identity preserved');
    c.tick(UNDO_WINDOW_MS * 3); await settle();
    check('  and NOTHING is ever written, however long the clock runs', deleted, []);
    check('  with nothing left pending', p.size(), 0);
  }

  check('undoing something that is not pending is a no-op',
        createPendingDeletes({ commit: async () => {} }).undo('nobody'), null);

  {
    const c = fakeClock();
    const deleted = [];
    const p = createPendingDeletes({ commit: async (id) => { deleted.push(id); },
                                     setTimer: c.setTimer, clearTimer: c.clearTimer });
    p.schedule({ id: 'a' }); p.schedule({ id: 'b' }); p.schedule({ id: 'c' });
    check('three pending at once', [p.size(), p.ids()], [3, ['a', 'b', 'c']]);
    p.undo('b');
    await p.flush();
    check('  leaving the page commits the rest and not the undone one',
          [deleted.sort(), p.size()], [['a', 'c'], 0]);
  }

  {
    const c = fakeClock();
    const p = createPendingDeletes({ commit: async () => { throw new Error('offline'); },
                                     setTimer: c.setTimer, clearTimer: c.clearTimer });
    p.schedule({ id: 'g9' });
    let reported = null;
    await p.commitOne('g9', (_id, err) => { reported = err?.message || null; });
    check('a failed commit is reported so the row can come back', reported, 'offline');
    check('  and is not left pending forever', p.size(), 0);
  }

  {
    const c = fakeClock();
    const deleted = [];
    const p = createPendingDeletes({ commit: async (id) => { deleted.push(id); },
                                     setTimer: c.setTimer, clearTimer: c.clearTimer });
    p.schedule({ id: 'x' }); p.schedule({ id: 'x' });
    c.tick(UNDO_WINDOW_MS + 1); await settle();
    check('scheduling the same guest twice deletes them once', deleted, ['x']);
  }

  // ── THE WIRING ──────────────────────────────────────────────────────────

  const page = readCode('src/pages/Guests.jsx');
  const wiring = [
    ['the add checks for a duplicate before it creates',
      /if \(!guestData\.__allowDuplicate\) \{[\s\S]{0,200}?findDuplicate\(restGuestData, guests\)/],
    ['  and "Add anyway" resends the same data with the check waived',
      /__allowDuplicate: true/],
    ['  the waiver never reaches a write',
      /__allowDuplicate: _allowDup, \.\.\.restGuestData \} = guestData;/],
    ['the delete removes the row from the list at once',
      /setGuests\(\(prev\) => prev\.filter\(\(g\) => g\.id !== guestId\)\)/],
    ['  schedules the write rather than sending it',
      /pendingDeletes\.current\.schedule\(guest,/],
    ['  offers Undo for the window length',
      /duration: UNDO_WINDOW_MS, id: `undo-\$\{guestId\}`/],
    ['  and puts the row back on a failed commit',
      /prev\.some\(\(g\) => g\.id === guestId\) \? prev : \[\.\.\.prev, guest\]/],
    ['leaving the page commits what is pending',
      /addEventListener\('pagehide', flush\)[\s\S]{0,200}?flush\(\);/],
  ];
  for (const [label, re] of wiring) {
    results.push(re.test(page) ? pass(`Guests page: ${label}`, 'present')
                               : fail(`Guests page: ${label}`, 'present', 'the line is gone'));
  }

  ok('the confirm is gone, so the delete cannot ask before it acts',
     !/window\.confirm\([^)]*Delete this guest/.test(page), 'no confirm');

  // THE OWNER'S COPY, VERBATIM. calm-copy only reads lines added in a diff, so
  // once these are on main nothing else holds them.
  const raw = fs.readFileSync(path.join(ROOT, 'src/pages/Guests.jsx'), 'utf8');
  for (const [label, needle] of [
    ['the duplicate line', 'Already on your list: {duplicateOf.guest.name}'],
    ['the waiver', 'Add anyway'],
    ['the delete toast', 'Deleted.'],
    ['the undo', 'Undo'],
  ]) {
    ok(`${label} is the owner's words`, raw.includes(needle), needle);
  }

  // ── THE RATCHET CAME DOWN WITH IT ───────────────────────────────────────
  const ratchet = fs.readFileSync(path.join(ROOT, 'tests/persistence/no-native-dialog.mjs'), 'utf8');
  ok('the native-dialog baseline records Guests.jsx at one, not two',
     /'src\/pages\/Guests\.jsx': 1,/.test(ratchet), 'brought down with the confirm');

  return results;
}
