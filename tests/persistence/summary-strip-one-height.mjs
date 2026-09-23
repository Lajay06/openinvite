/**
 * Summary strips are one box, on every page that has one.
 *
 * ── WHAT THE OWNER ASKED FOR ───────────────────────────────────────────────
 *
 * Round two, item 6: "Schedule summary cards: remove the second subtitle line
 * on every card. Heading and number only. Separator lines between cards must
 * reach the heading edge. Remove the line 'Visible to guests in your guest
 * suite'. Match card height to the Guest list summary cards, then audit every
 * page's summary cards and make them one height."
 *
 * ── THE SEPARATOR CLAUSE AND THE NOTE CLAUSE ARE THE SAME INSTRUCTION ──────
 *
 * Read on its own, "the separators must reach the heading edge" sounds like a
 * border that stops short. It is not. The separators are the cards' own
 * borderRight and they fill the card. What sat between the header's rule and
 * the top of the strip was a 14px band holding the note — so on Schedule, and
 * only on Schedule, the separators began below the heading rather than at it.
 * Removing the note closes the gap. One change answers both clauses, which is
 * why they arrived in the same bullet.
 *
 * ── WHY A GUARD AND NOT JUST AN EDIT ───────────────────────────────────────
 *
 * The strip is copy-pasted into sixteen pages. There is no shared component to
 * put the rule in, and extracting one would touch every page in the product at
 * once — a far bigger change than the owner asked for, in shared chrome. So
 * the invariant lives here instead: every page that renders the 48px summary
 * tile declares the same box, and the next copy-paste that drifts is named.
 *
 * GUEST SUITE › POLLS IS DELIBERATELY NOT IN THE LIST. Its strip is a
 * different card — a 24px figure on 16px padding, not the 48px tile — so
 * holding it to this box would be a redesign nobody asked for. It is reported
 * rather than swept.
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pass, fail } from './_shared.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = (p) => resolve(__dir, '../../', p);
const read = (p) => readFileSync(root(p), 'utf8');
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/** Every page rendering the 48px summary tile. */
const PAGES = [
  'src/pages/Guests.jsx',
  'src/pages/Budget.jsx',
  'src/pages/Seating.jsx',
  'src/pages/ScheduleHub.jsx',
  'src/pages/Calendar.jsx',
  'src/pages/Checklist.jsx',
  'src/pages/Messages.jsx',
  'src/pages/Moodboard.jsx',
  'src/pages/Music.jsx',
  'src/pages/Registry.jsx',
  'src/pages/VowsSpeeches.jsx',
  'src/pages/Vendors.jsx',
  'src/pages/Photography.jsx',
];

/** The one box. Quotes differ between files, so the test is on the values. */
const TILE = /className="grow shrink basis-1\/2 min-w-0 lg:flex-1"[\s\S]{0,60}?style=\{\{([\s\S]{0,400}?)\}\}>/;

export async function runSummaryStripOneHeight() {
  const results = [];
  const check = (n, ok, d) => results.push(ok ? pass(n, d) : fail(n, 'see name', d));
  console.log('\n  Summary strips — one box on every page that has one:\n');

  for (const page of PAGES) {
    const src = strip(read(page));
    const m = TILE.exec(src);
    const name = page.replace('src/pages/', '');
    if (!m) { check(`${name} still renders a summary tile`, false, 'strip not found'); continue; }
    const style = m[1];
    check(`${name} — 24px/32px padding`, /padding:\s*['"]24px 32px['"]/.test(style), 'padding');
    check(`  ${name} — the 80px floor`, /minHeight:\s*80/.test(style), 'minHeight: 80');
  }

  // ── Schedule: the three explicit asks ─────────────────────────────────────
  const HUB = read('src/pages/ScheduleHub.jsx');
  const HUB_CODE = strip(HUB);
  check('Schedule’s cards are heading and number only — no second line',
    !/\{s\.sub\s*&&/.test(HUB_CODE), 'no sub render');
  check('  and no card declares one any more',
    !/\bsub:\s/.test(HUB_CODE.slice(HUB_CODE.indexOf('const STAT_CARDS'), HUB_CODE.indexOf('const STAT_CARDS') + 600)),
    'no sub key');
  check('  the note above the strip is gone, so the separators start at the heading',
    !/Visible to guests in your Guest Suite/.test(HUB), 'note removed');
  check('  and the strip is the first thing under the page header',
    /<DashboardPageHeader[\s\S]{0,400}?\/>\s*(?:\{\/\*[\s\S]*?\*\/\}\s*)*<div className="flex flex-wrap w-full"/.test(HUB),
    'header then strip');

  // ── The Guest list is the reference, so it must not have moved ────────────
  const GUESTS = strip(read('src/pages/Guests.jsx'));
  check('the Guest list strip is unchanged — it is the reference, not a target',
    /padding: '24px 32px', minHeight: 80/.test(GUESTS) && /\{s\.sub && !loading &&/.test(GUESTS),
    'still 24/32/80, still shows its own sub when there are plus-ones');

  return results;
}
