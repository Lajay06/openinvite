/**
 * tests/persistence/features-accordion-rows.mjs
 *
 * THE EIGHT ROWS THE FEATURES ACCORDION CARRIES, AND NOTHING ELSE.
 *
 * Item 1 of goals/2026-10-08-site-fixes-batch-1.md. The owner dictated eight
 * rows, in order, copy verbatim, and named two rows to drop. Every existing row
 * was either dropped or replaced, so the end state is exactly these eight.
 *
 * ── WHY THE COPY IS ASSERTED IN FULL ───────────────────────────────────────
 *
 * A title check would pass on a row whose body someone tightened later, and
 * this copy is dictated: "use the copy above verbatim" is the goal's own
 * ruling. So each body is compared whole. A later edit to any of these strings
 * fails here and has to be an owner decision rather than a tidy-up.
 *
 * ── AND WHY THE ABSENCES ARE ASSERTED TOO ──────────────────────────────────
 *
 * The two dropped rows are named, because "replaced" and "replaced, and the
 * old one still sits further down the array" look identical from a count. The
 * universes row is the one worth stating: after this, the word "universe"
 * appears nowhere on the Features page, which is a consequence the owner ruled
 * for deliberately (/universes is where that story lives) and not a gap.
 *
 * Read from source, because a .jsx page cannot be imported by a node guard,
 * with comments stripped first: a sentence about the copy must not satisfy a
 * check about the copy.
 */

import fs from 'fs';
import path from 'path';
import { pass, fail } from './_shared.mjs';

const ROOT = path.resolve(new URL('../../', import.meta.url).pathname);
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const code = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const ROWS = [
  ['Vendors and the marketplace',
    'Every vendor in one place, with contact, quote, deposit and what is still owed. Browse the marketplace for the ones you have not booked yet and send an enquiry without leaving the studio.'],
  ['Seating chart and the visualizer',
    'Drag guests onto tables, see who is still unseated, and walk the room before anyone else does. The visualizer shows the layout the way your guests will see it.'],
  ['Calendar',
    'One calendar for the whole engagement: deadlines, vendor payments, fittings, and every event on your run sheet. Subscribe from your phone so nothing lives only in the studio.'],
  ['Ava on every page',
    'Ava has read your wedding. Ask what is unpaid, who has not replied, or what still needs a decision, on any page, at any hour.'],
  ['Mood board',
    'Pin the looks you keep coming back to, colors, florals, dresses, tables, and keep them next to the plan instead of across six apps.'],
  ['Toasts and speeches',
    'Who is speaking, in what order, for how long. Speakers get a short brief and a deadline so nobody writes theirs in the car.'],
  ['On the day details',
    'Getting there, where to stay, who to call, what to wear. Written once, shown to guests where they need it.'],
  ['Registry and cash funds',
    'Link the registry you already have, or set up a cash fund with a note that does not feel awkward. Guests see it only when you say so.'],
];

const GONE = ['A guest suite, written for you', 'Twenty universes', 'Invitations and RSVP',
              'Vendors, seating and your calendar'];

export async function runFeaturesAccordionRows() {
  const results = [];
  // `show` RATHER THAN JSON.stringify DIRECTLY, because stringify returns
  // undefined for undefined and .slice then throws. Against main the titles do
  // not match, every body lookup is undefined, and a guard that throws reports
  // an error where it should report a named failing check.
  const show = (v) => String(JSON.stringify(v)).slice(0, 70);
  const check = (label, got, want) => results.push(
    JSON.stringify(got) === JSON.stringify(want)
      ? pass(label, show(got))
      : fail(label, show(want), show(got)));
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));

  const src = code(read('src/pages/Features.jsx'));
  const start = src.indexOf('const ALL_FEATURES = [');
  ok('the accordion list is where it was', start > -1, 'ALL_FEATURES');
  const block = src.slice(start, src.indexOf('}];', start) + 3);

  // ── THE TITLES, IN ORDER ────────────────────────────────────────────────
  const titles = [...block.matchAll(/\{ title: "([^"]+)"/g)].map((m) => m[1]);
  check('eight rows, in the order the owner dictated', titles, ROWS.map((r) => r[0]));

  // ── AND EACH BODY, WHOLE ────────────────────────────────────────────────
  const bodies = [...block.matchAll(/bullets: \["([^"]+)"\] \}/g)].map((m) => m[1]);
  check('one paragraph per row, not a bullet list', bodies.length, 8);
  for (const [title, body] of ROWS) {
    const i = titles.indexOf(title);
    check(`  ${title}`, bodies[i], body);
  }

  // ── THE ROWS THAT WENT ──────────────────────────────────────────────────
  for (const t of GONE) {
    ok(`"${t}" is gone from the list`, !block.includes(`title: "${t}"`), 'absent');
  }
  // THE CONSEQUENCE THE OWNER RULED FOR, pinned so nobody restores it by
  // accident and nobody reports it as a gap.
  //
  // CODE, NOT PROSE. This read the whole file and failed on the comment that
  // explains WHY the word is gone and where the story moved to. A comment
  // naming it in order to say the page no longer does is the opposite of the
  // violation, and it is the one place a reader should find the reason.
  ok('the word universe is rendered nowhere on the Features page',
     !/universe/i.test(src), '/universes carries it');

  // ── EIGHT ROWS AGAINST SIX COLORS ───────────────────────────────────────
  //
  // borders[6] and borders[7] were undefined the moment the list grew: an
  // invalid border-left and an uncolored glyph on the last two rows.
  const comp = code(read('src/pages/Features.jsx'));
  ok('the border color cycles rather than running off the end of the palette',
     /borders\[i % borders\.length\]/.test(comp) && !/borders\[i\]/.test(comp), 'modulo');
  const palette = (comp.match(/const ACCORDION_BORDERS = \[([^\]]+)\]/) || [])[1] || '';
  ok('  and the palette is unchanged, so no color is invented',
     (palette.match(/#/g) || []).length === 6, `${(palette.match(/#/g) || []).length} colors`);

  // ── THE SNAPSHOT SHIPS WITH THE PAGE ────────────────────────────────────
  //
  // A marketing page change that leaves prerendered/<page>/index.html behind
  // serves the old copy to a crawler and to the first paint.
  const snap = read('prerendered/features/index.html');
  ok('the prerendered snapshot carries the new copy',
     snap.includes(ROWS[0][0]) && snap.includes(ROWS[7][0]), 'regenerated');
  for (const t of GONE) {
    ok(`  and not "${t}"`, !snap.includes(t), 'absent from the snapshot');
  }

  return results;
}
