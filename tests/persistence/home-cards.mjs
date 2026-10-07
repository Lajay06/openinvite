/**
 * tests/persistence/home-cards.mjs
 *
 * SIX CARDS ON THE HOME PAGE, ENDING ON PLUS 1.
 *
 * Item 2 of goals/2026-10-08-site-fixes-batch-1.md, whose ruling is the whole
 * of this guard: "remove Guest suite, change nothing else".
 *
 * ── SO "NOTHING ELSE" IS WHAT IS ASSERTED ──────────────────────────────────
 *
 * A title list would pass on a set where someone also reworded a description
 * or swapped a photo. The ruling is about the rest of the set holding still,
 * so every surviving card's number, title, description and bullets are
 * compared whole. That makes the guard fail on a future copy edit, which is
 * the intent: the next change to these words should be a decision, not a
 * tidy-up.
 *
 * ── THE NUMBERING IS WHY THE LAST CARD WAS THE EASY ONE TO LOSE ────────────
 *
 * The cards carry their own "01" to "07" labels. Guest suite was 07 and last,
 * so removing it leaves 01 to 06 contiguous and nothing renumbered. Had it sat
 * in the middle, every card after it would have had to move, and the ruling
 * "change nothing else" would have been impossible to keep literally.
 *
 * Read from source, comments stripped: the comment that explains the removal
 * names the card, and prose about an absence must not satisfy a check about it.
 */

import fs from 'fs';
import path from 'path';
import { pass, fail } from './_shared.mjs';

const ROOT = path.resolve(new URL('../../', import.meta.url).pathname);
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const code = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

// The six that stay, exactly as they stand today.
const CARDS = [
  ['01', 'Guest management',
    "RSVP tracking, seating charts and the wedding party, all in one list that never gets out of sync.",
    ['Guest list & RSVP tracking', 'Seating chart planner', 'Wedding party coordination']],
  ['02', 'Budget & registry',
    "See what's spent, what's owed and what's coming, plus a registry your guests actually enjoy using.",
    ['Budget vs. actual spend', 'Vendor payment tracking', 'Gift registry']],
  ['03', 'Planning & schedule',
    "A day-of timeline builder, a shared to-do list, and daily nudges so nothing slips through.",
    ['Day-of timeline builder', 'Shared to-do list', 'Daily planning updates']],
  ['04', 'Vendors',
    "Track every vendor you've booked, and discover new ones without leaving your planner.",
    ['Vendor directory', 'Marketplace discovery', 'Payment & contract tracking']],
  ['05', 'Style & experience',
    "Moodboards, music, photography and styling: every creative decision, kept in one place.",
    ['Moodboard & styling', 'Music & guest song requests', 'Photography & vows']],
  ['06', 'Plus 1',
    "Bring someone into the planning. Invite your partner, a parent or a friend to share the load.",
    ['Invite a partner, parent or friend', 'Their own login and their own access', 'Everyone stays in sync automatically']],
];

export async function runHomeCards() {
  const results = [];
  const show = (v) => String(JSON.stringify(v)).slice(0, 80);
  const check = (label, got, want) => results.push(
    JSON.stringify(got) === JSON.stringify(want)
      ? pass(label, show(got))
      : fail(label, show(want), show(got)));
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));

  const raw = read('src/components/home/HorizontalScrollSection.jsx');
  const src = code(raw);
  const start = src.indexOf('const CARDS = [');
  ok('the card set is where it was', start > -1, 'CARDS');
  const block = src.slice(start, src.indexOf('\n];', start));

  check('six cards, numbered without a gap',
        [...block.matchAll(/num: "(\d+)"/g)].map((m) => m[1]), CARDS.map((c) => c[0]));
  check('  in order, ending on Plus 1',
        [...block.matchAll(/title: "([^"]+)"/g)].map((m) => m[1]), CARDS.map((c) => c[1]));

  // NOTHING ELSE CHANGED, card by card.
  const descs = [...block.matchAll(/desc: "((?:[^"\\]|\\.)*)"/g)].map((m) => m[1].replace(/\\"/g, '"'));
  const bulletSets = [...block.matchAll(/bullets: \[([^\]]*)\]/g)]
    .map((m) => [...m[1].matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((b) => b[1].replace(/\\"/g, '"')));
  for (let i = 0; i < CARDS.length; i += 1) {
    check(`  ${CARDS[i][1]}: description unchanged`, descs[i], CARDS[i][2]);
    check(`  ${CARDS[i][1]}: bullets unchanged`, bulletSets[i], CARDS[i][3]);
  }
  check('and no seventh card of any name', descs.length, 6);

  // ── THE CARD THAT WENT ──────────────────────────────────────────────────
  ok('no Guest suite card is rendered', !/Guest suite/.test(src), 'absent from the code');
  ok('  and its photo went with it',
     !/ID3565|Early_Honey_Moon/.test(src), 'no orphaned asset reference');
  // THE DASHBOARD'S OWN "Guest suite" IS A DIFFERENT THING and must not be
  // swept by a later reading of this item: it is a sidebar group, pinned by
  // tests/persistence/dashboard-top.mjs.
  ok('the dashboard sidebar group of that name is untouched',
     /'Guest suite'/.test(read('tests/persistence/dashboard-top.mjs')), 'still pinned there');

  // ── THE SNAPSHOT SHIPS WITH THE PAGE ────────────────────────────────────
  const snap = read('prerendered/index.html');
  ok('the prerendered home snapshot ends on Plus 1', snap.includes('Plus 1'), 'present');
  ok('  and carries no Guest suite card', !snap.includes('Guest suite'), 'regenerated');

  return results;
}
