/**
 * tests/persistence/dashboard-top.mjs
 *
 * THE TOP OF THE DASHBOARD, AS THE OWNER RULED IT (2026-09-07).
 *
 *   "the Overall in planning is still there, that needs to go"
 *
 * Overall is removed; its stat tiles moved onto the daily update page as one
 * full-width row. Daily update is the first sidebar item and the page a couple
 * lands on. The eight sidebar groups became the calm pass's five (PR2, the
 * proposal recorded in DECISION-LOG.md 2026-09-04). Design studio left the top
 * slot for the Website & invitations group, where the Ultra treatment lives.
 *
 * Every check here is a PLANT: each one was run against the old shape and
 * reported red before the change that makes it green.
 */
import { pass, fail } from './_shared.mjs';
import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const code = (p) => readFileSync(join(ROOT, p), 'utf8')
  .replace(/^[^\n]*?\/\/.*$/gm, (line) => line.slice(0, line.indexOf('//')))
  .replace(/\/\*[\s\S]*?\*\//g, '');

/**
 * THE GROUPS, IN ORDER — the ones that were there before #697 recut them.
 *
 * Owner ruling on review, 2026-09-07: revert the headings and the grouping,
 * KEEP the collapsing. The calm pass's five (Foundations · Guests · The day ·
 * Money & vendors · Website & invitations) are gone; what survives from that
 * pass is the behaviour, not the taxonomy.
 *
 * "Guest suite" is the brand name, exactly — it was "Guest Suite" before and
 * "Website & invitations" briefly. The owner named the spelling.
 */
const GROUPS = ['Planning', 'Guests', 'Style & experience', 'Vendors', 'On the day', 'Finances', 'Guest suite', 'Extras'];

export async function runDashboardTop() {
  const results = [];
  const check = (name, cond, detail) => results.push(cond ? pass(name, detail) : fail(name, 'see name', detail));

  console.log('\n  The top of the dashboard:\n');

  const nav = code('src/components/layout/AnimatedSidebar.jsx');
  const app = code('src/App.jsx');
  const cfg = code('src/pages.config.js');

  // ── OVERALL IS GONE ─────────────────────────────────────────────────────
  check('PLANT: Overall is not a nav item',
    !/label: "Overall"/.test(nav) && !/label="Overall"/.test(nav), 'removed from the sidebar');
  check('PLANT: /Dashboard redirects to the daily update',
    /pathname === '\/dashboard' \|\| location\.pathname === '\/Dashboard'/.test(app)
      && /<Navigate to="\/DailyUpdate" replace \/>/.test(app),
    'a bookmarked Overall lands somewhere');
  check('  and the page is no longer routed',
    !/"Dashboard": Dashboard/.test(cfg), 'out of the Pages map, so no auto-route');

  // ── DAILY UPDATE IS FIRST, AND IS WHERE LOGIN LANDS ─────────────────────
  const ungrouped = /export const UNGROUPED_ITEMS = \[([\s\S]*?)\];/.exec(nav)?.[1] || '';
  const topLabels = [...ungrouped.matchAll(/label: "([^"]+)"/g)].map((m) => m[1]);
  check('PLANT: Daily update is the first item in the sidebar',
    topLabels[0] === 'Daily update', topLabels.join(' → ') || 'none');
  // TO DO WENT BACK INTO PLANNING with the revert; what stays ungrouped is
  // Daily update (the landing page) and Event details (the judgment call the
  // owner accepted by name).
  check('  with Event details beside it, ungrouped',
    topLabels[1] === 'Event details', topLabels.join(' → '));
  check('PLANT: login lands on the daily update',
    /get\('next'\) \|\| '\/DailyUpdate'/.test(code('src/pages/Login.jsx')), 'the landing page');

  // ── FIVE GROUPS, IN THE CALM PASS'S ORDER ───────────────────────────────
  // Groups now declare an icon, and the guest suite declares both. The
  // matcher has to allow either, in that order, or it silently finds none —
  // which is a guard reporting "the groups are wrong" when they are right.
  const groups = [...nav.matchAll(/\n    label: "([^"]+)",\n    (?:icon: \w+,\n    )?(?:guestSuite: true,\n    )?items: \[/g)].map((m) => m[1]);
  check('PLANT: the pre-#697 groups are back',
    groups.length === GROUPS.length, `${groups.length}: ${groups.join(' · ')}`);
  check('  in their original order, with the guest suite named exactly',
    groups.join('|') === GROUPS.join('|'), groups.join(' · '));
  check('PLANT: every group carries an icon, so a collapsed sidebar reads',
    (nav.match(/\n    icon: [A-Z]\w+,/g) || []).length === GROUPS.length,
    'eight groups, eight icons, none invented');
  check('  and the header renders it',
    /\{section\.icon && <section\.icon size=\{11\}/.test(nav), 'beside the label');

  // ── DESIGN STUDIO'S NEW HOME ────────────────────────────────────────────
  const website = /label: "Guest suite",[\s\S]*?items: \[([\s\S]*?)\n    \],/.exec(nav)?.[1] || '';
  const websiteItems = [...website.matchAll(/label: "([^"]+)"/g)].map((m) => m[1]);
  check('PLANT: Design studio is the FIRST item of Guest suite',
    websiteItems[0] === 'Design studio', websiteItems.join(' · '));
  check('  it keeps its Ultra treatment',
    /label: "Design studio",\s*url: "\/studio", ultraBadge: true/.test(nav)
      && /label: "Guest suite",\s*icon: Globe,\s*guestSuite: true/.test(nav),
    'the badge on the item and the Ultra tag on the group');
  check('  and it is no longer a top-level link',
    !/label="Design studio"/.test(nav), 'one entry, not two');

  // ── COLLAPSE DEFAULTS ───────────────────────────────────────────────────
  // OWNER RULING, REVISED 2026-09-08: every group is collapsed on first load,
  // the first one included. The clause this replaces — `i === 0 ||` — was the
  // whole of what changed; the active-page clause below is untouched and is
  // the reason the revision does not make the sidebar annoying.
  check('PLANT: every group is collapsed on a first load',
    /open\[sec\.label\] = holdsActive\(sec\)/.test(nav) && !/i === 0 \|\|/.test(nav),
    'nothing opens by position');
  check('  and a group holding the active page opens',
    /holdsActive\(sec\)/.test(nav) && /\(sec\.items \|\| \[\]\)\.some\(\(it\) => isActive\(it\.url\)\)/.test(nav),
    'you never land on a page whose own group is shut');
  check('  the items render only when the group is open',
    (nav.match(/\{open && section\.items\.map/g) || []).length === 2,
    'both the desktop and the mobile renderer');
  // The caret pair (U+25BC / U+25B6) is gone: owner ruling 2026-09-08, the
  // indicator is the same lucide ChevronDown the rest of the dashboard uses,
  // rotated -90deg when closed. Those glyphs were never an emoji violation —
  // that rule is about presentation, not about a block — they were simply not
  // the shape everything else draws. The RENDERED chevron, its rotation, and
  // the absence of any stray arrow are checked in scripts/test-sidebar-groups.mjs.
  check('  and the header says which way it is',
    /aria-expanded=\{open\}/.test(nav) && /<ChevronDown/.test(nav) && /rotate\(-90deg\)/.test(nav),
    'a chevron, rotated');
  check('  and the couple’s choice is remembered per device',
    /localStorage\.setItem\(GROUP_OPEN_KEY/.test(nav) && /localStorage\.getItem\(GROUP_OPEN_KEY/.test(nav),
    'read and written in localStorage, not on the record');

  return results;
}
