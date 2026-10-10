/**
 * tests/persistence/features-accordion-rows.mjs
 *
 * THE EIGHT ROWS THE FEATURES ACCORDION CARRIES, AND NOTHING ELSE.
 *
 * Batch 2 (2026-10-10) gave each row four bullets again; the rows, their
 * order and the absences below are batch 1's and unchanged.
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
  ["Vendors and the marketplace", [
    "Every vendor in one place, with contact, quote, deposit and what is still owed",
    "A marketplace connected to Google Places, with vendors worldwide",
    "Send an enquiry without leaving the studio",
    "Keep quotes, contracts and contacts with each vendor",
  ]],
  ["Seating chart and the visualizer", [
    "Lay out the venue and drag guests onto tables",
    "See who is still unseated at a glance",
    "Walk the room in the visualizer, the way guests will see it",
    "A seating plan for each event, from the reception to the brunch",
  ]],
  ["Calendar", [
    "One calendar for the whole engagement",
    "Deadlines, vendor payments and fittings beside every event on your run sheet",
    "Subscribe from your phone's calendar, so an edit here reaches it on its own.",
    "Export the run sheet for your vendors",
  ]],
  ["Ava on every page", [
    "A short briefing each morning: what is coming up, what needs a decision",
    "Ask Ava from any page, about the page you are on",
    "Answers drawn from your own wedding, never generic advice",
    "Ask what is unpaid, who has not replied, or what still needs a decision",
  ]],
  ["Mood board", [
    "Pin the looks you keep coming back to: colors, florals, dresses, tables",
    "Boards for the venue, the dress, the palette, or anything you name",
    "A note on every pin",
    "Inspiration next to the plan, not across six apps",
  ]],
  ["Toasts and speeches", [
    "Who is speaking, in what order, for how long",
    "A short brief and a deadline for every speaker, so nobody writes theirs in the car",
    "Vow drafts in the tone you choose, refined until they sound like you",
    "Your vows locked behind a PIN",
  ]],
  ["On the day details", [
    "Getting there, where to stay, who to call, what to wear",
    "Stay and Getting here pages for out-of-town guests",
    "Dress code and policies in one place",
    "Written once, shown to guests on your guest suite where they need it",
  ]],
  ["Registry and cash funds", [
    "Link the registry you already have",
    "Products and cash funds side by side on one registry page",
    "Guests give toward a honeymoon or a specific gift",
    "Shown to guests only when you say so",
  ]],
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

  // ── AND EACH ROW'S FOUR BULLETS, WHOLE ─────────────────────────────────
  // Owner ruling 2026-10-10 (site fixes batch 2): four bullets per row again,
  // after batch 1's one sentence per row. Each bullet is compared whole.
  const bullets = [...block.matchAll(/bullets: \[(.*?)\] \}/g)]
    .map((m) => [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]));
  check('four bullets per row, 32 in all', bullets.map((b) => b.length), ROWS.map(() => 4));
  for (const [title, want] of ROWS) {
    const i = titles.indexOf(title);
    check(`  ${title}`, bullets[i], want);
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

  // ── NO COLORED BAR ──────────────────────────────────────────────────────
  //
  // Owner ruling 2026-10-10 (site fixes batch 2): the open row's 3px colored
  // left border and the matching glyph color are gone, so the six-color
  // palette that fed them is gone too.
  const comp = code(read('src/pages/Features.jsx'));
  const acc = comp.slice(comp.indexOf('function AccordionSection'), comp.indexOf('function AccordionSection') + 4000);
  ok('the accordion draws no colored left bar', !/borderLeft/.test(acc) && !/border-left/i.test(acc), 'no border-left in AccordionSection');
  ok('  and its glyph is the page text color', /marginLeft: 16, color: "#0A0A0A"/.test(acc) && !/borders\[/.test(comp), '#0A0A0A');
  ok('  and the bar palette is gone', !/ACCORDION_BORDERS/.test(comp), 'ACCORDION_BORDERS removed');

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
