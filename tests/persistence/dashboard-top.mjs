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

/** The five groups, in order, exactly as the calm pass names them. */
const GROUPS = ['Foundations', 'Guests', 'The day', 'Money & vendors', 'Website & invitations'];

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
  check('  with To do beside it, ungrouped',
    topLabels[1] === 'To do', topLabels.join(' → '));
  check('PLANT: login lands on the daily update',
    /get\('next'\) \|\| '\/DailyUpdate'/.test(code('src/pages/Login.jsx')), 'the landing page');

  // ── FIVE GROUPS, IN THE CALM PASS'S ORDER ───────────────────────────────
  const groups = [...nav.matchAll(/\n    label: "([^"]+)",\n    (?:guestSuite: true,\n    )?items: \[/g)].map((m) => m[1]);
  check('PLANT: five groups, not eight',
    groups.length === 5, `${groups.length}: ${groups.join(' · ')}`);
  check('  and they are the calm pass’s five, in order',
    groups.join('|') === GROUPS.join('|'), groups.join(' · '));

  // ── DESIGN STUDIO'S NEW HOME ────────────────────────────────────────────
  const website = /label: "Website & invitations",[\s\S]*?items: \[([\s\S]*?)\n    \],/.exec(nav)?.[1] || '';
  const websiteItems = [...website.matchAll(/label: "([^"]+)"/g)].map((m) => m[1]);
  check('PLANT: Design studio is the FIRST item of Website & invitations',
    websiteItems[0] === 'Design studio', websiteItems.join(' · '));
  check('  it keeps its Ultra treatment',
    /label: "Design studio",\s*url: "\/studio", ultraBadge: true/.test(nav)
      && /label: "Website & invitations",\s*guestSuite: true/.test(nav),
    'the badge on the item and the Ultra tag on the group');
  check('  and it is no longer a top-level link',
    !/label="Design studio"/.test(nav), 'one entry, not two');

  // ── COLLAPSE DEFAULTS ───────────────────────────────────────────────────
  check('PLANT: every group is collapsed except the first',
    /open\[sec\.label\] = i === 0 \|\| holdsActive\(sec\)/.test(nav),
    'index 0 open, the rest shut');
  check('  and a group holding the active page opens',
    /holdsActive\(sec\)/.test(nav) && /\(sec\.items \|\| \[\]\)\.some\(\(it\) => isActive\(it\.url\)\)/.test(nav),
    'you never land on a page whose own group is shut');
  check('  the items render only when the group is open',
    (nav.match(/\{open && section\.items\.map/g) || []).length === 2,
    'both the desktop and the mobile renderer');
  check('  and the header says which way it is',
    /aria-expanded=\{open\}/.test(nav) && /\\u25BC/.test(nav) && /\\u25B6/.test(nav),
    'a text-presentation caret, not an emoji');

  return results;
}
