/**
 * Polls and games sits in Style and experience, not in Guests.
 *
 * ── THE RULING ─────────────────────────────────────────────────────────────
 *
 * Round two, item 6: "Navigation: move 'Polls and games' out of Guests to the
 * bottom of Style and experience. Guests becomes: Guest list, Messages,
 * Seating, Wedding party."
 *
 * The reasoning, as the grouping reads it: Guests is the group a couple opens
 * to do something TO their guest list — add people, message them, seat them,
 * name the wedding party. A quiz is something the couple MAKES, and it belongs
 * with the other things they make.
 *
 * ── WHY THE HELP PAGE IS IN THIS GUARD ─────────────────────────────────────
 *
 * Help.jsx prints the sidebar's groups as a list, by hand. Nothing links the
 * two, so a nav change silently leaves the help text describing a sidebar that
 * no longer exists — and the help text is what a couple reads precisely when
 * they cannot find something. The two are pinned together here.
 *
 * The prose further down Help ("Polls & games lets you send guests private
 * questions…") is about the FEATURE, not its position, and is untouched.
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pass, fail } from './_shared.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = (p) => resolve(__dir, '../../', p);
const read = (p) => readFileSync(root(p), 'utf8');
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const NAV = strip(read('src/components/layout/AnimatedSidebar.jsx'));
const HELP = read('src/pages/Help.jsx');

/** The items of one labelled group, in order. */
function groupItems(label) {
  const at = NAV.indexOf(`label: "${label}",`);
  if (at < 0) return null;
  const open = NAV.indexOf('items: [', at);
  const close = NAV.indexOf('\n    ],', open);
  if (open < 0 || close < 0) return null;
  return [...NAV.slice(open, close).matchAll(/label:\s*"([^"]+)"/g)].map((m) => m[1]);
}

export async function runPollsLivesInStyle() {
  const results = [];
  const check = (n, ok, d) => results.push(ok ? pass(n, d) : fail(n, 'see name', d));
  console.log('\n  Navigation — Polls and games is something the couple makes:\n');

  const guests = groupItems('Guests');
  const style = groupItems('Style & experience');

  check('the Guests group is readable', Array.isArray(guests) && guests.length > 0, (guests || []).join(', '));
  check('Guests is exactly Guest list, Messages, Seating, Wedding party',
    JSON.stringify(guests) === JSON.stringify(['Guest list', 'Messages', 'Seating', 'Wedding party']),
    (guests || []).join(', '));

  check('the Style & experience group is readable', Array.isArray(style) && style.length > 0, (style || []).join(', '));
  check('Polls & games is in it', (style || []).includes('Polls & games'), 'present');
  check('  and it is LAST in the group, as the ruling puts it',
    (style || [])[style ? style.length - 1 : 0] === 'Polls & games',
    (style || []).slice(-2).join(' → '));
  check('  the eight that were already there keep their order',
    JSON.stringify((style || []).slice(0, 8)) === JSON.stringify([
      'Moodboard', 'Styling', 'Beauty', 'Food & beverage', 'Music', 'Photography', 'Vows & speeches', 'Guest gifts',
    ]),
    (style || []).slice(0, 8).join(', '));

  check('the page itself is still routed and reachable',
    /createPageUrl\("Polls"\)/.test(NAV), 'url unchanged');
  check('  and it moved rather than being duplicated',
    (NAV.match(/label: "Polls & games"/g) || []).length === 1, 'one entry');

  // ── Help prints the same groups by hand ───────────────────────────────────
  check('Help’s Guests line matches the sidebar',
    /<strong>Guests:<\/strong> Guest list, Messages, Seating, Wedding party</.test(HELP), 'in step');
  check('Help’s Style & experience line ends with Polls & games',
    /<strong>Style & experience:<\/strong>[^<]*Guest gifts, Polls & games</.test(HELP), 'in step');

  return results;
}
