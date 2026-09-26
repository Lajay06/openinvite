/**
 * The guidance system: built for every page, and off until the owner says so.
 *
 * ── THE RULING ─────────────────────────────────────────────────────────────
 *
 * Round two, item 17: "Two layers. A global first-run tour — 'Quick tips' —
 * shown once after onboarding completes, walking the dashboard. And a
 * page-specific 'What's here' panel on every page, opened from a consistent
 * control, the way Ava is both global and page-specific.
 *
 * Content model per page: { purpose, actions: [three strings], loop?,
 * helpHref }. … Loop, on four pages only (Guest list, Schedule, Guest suite,
 * Design studio), is the recurring thing to come back for.
 *
 * Persistence — tour seen, panels dismissed — needs a guidanceState field only
 * the owner can add in Base44. That is a stop condition for the persistence
 * part only. Build the panel, the tour, the content for every page, and the
 * control, behind a flag defaulting off."
 *
 * ── WHY THE FLAG IS NOT OPTIONAL ───────────────────────────────────────────
 *
 * The tour is shown ONCE and a panel is dismissed ONE AT A TIME. Both facts
 * have to be remembered per couple. Without somewhere to remember them, a tour
 * that "shows once" shows on every load and a dismissed panel returns on the
 * next navigation. On by default, that would be worse than shipping nothing —
 * which is why this guard checks the default as carefully as it checks the
 * content.
 *
 * ── WHY THE CONTENT IS CHECKED AGAINST THE NAV ─────────────────────────────
 *
 * "Every page" is a claim that decays. The sidebar is the list of pages a
 * couple can reach, so the guard reads the routes out of it and requires an
 * entry for each: a page added next month arrives with no guidance and this
 * says so, rather than a couple finding a control that opens nothing.
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pass, fail } from './_shared.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = (p) => resolve(__dir, '../../', p);
const read = (p) => { try { return readFileSync(root(p), 'utf8'); } catch { return ''; } };
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const NAV = strip(read('src/components/layout/AnimatedSidebar.jsx'));
const HEADER = strip(read('src/components/layout/DashboardPageHeader.jsx'));
const CONTROL = strip(read('src/components/guidance/WhatsHereControl.jsx'));
const PANEL = strip(read('src/components/guidance/WhatsHerePanel.jsx'));
const TOUR = strip(read('src/components/guidance/QuickTipsTour.jsx'));
const FLAG = strip(read('src/lib/guidanceFlag.js'));

/** Every route the sidebar links to, however it is written. */
function navRoutes() {
  const out = new Set();
  for (const m of NAV.matchAll(/url:\s*createPageUrl\("([^"]+)"\)/g)) out.add(`/${m[1].replace(/ /g, '-')}`);
  for (const m of NAV.matchAll(/url:\s*"(\/[^"]*)"/g)) out.add(m[1]);
  return [...out];
}

export async function runGuidanceBehindAFlag() {
  const results = [];
  const check = (n, ok, d) => results.push(ok ? pass(n, d) : fail(n, 'see name', d));
  console.log('\n  Guidance — every page, and off until the field exists:\n');

  let lib = {};
  try { lib = await import('../../src/lib/pageGuidance.js'); } catch { /* reported below */ }
  const G = lib.PAGE_GUIDANCE;
  check('there is a guidance content model', !!G && typeof G === 'object', 'pageGuidance.js');

  // ── The two layers exist ──────────────────────────────────────────────────
  check('there is a "What’s here" panel', /export default function WhatsHerePanel/.test(PANEL), 'WhatsHerePanel');
  check('  it renders the purpose, the actions and the loop',
    /\{purpose\}/.test(PANEL) && /actions\.map/.test(PANEL) && /\{loop\}/.test(PANEL), 'all three');
  check('  and dismissal is offered only when there is somewhere to record it',
    /onDismiss \?/.test(PANEL), 'no promise the product cannot keep');
  check('there is a "Quick tips" tour', /export default function QuickTipsTour/.test(TOUR), 'QuickTipsTour');
  check('  which reads the same content rather than restating it',
    /PAGE_GUIDANCE\[stop\.path\]/.test(TOUR), 'one source');
  const stops = [...TOUR.matchAll(/path: '([^']+)'/g)].map((m) => m[1]);
  check('  and every stop it walks has guidance', stops.length > 0 && stops.every((p) => !!G[p]), stops.join(', '));

  // ── One control, in the one place ─────────────────────────────────────────
  check('the control lives in the shared page header',
    /<WhatsHereControl \/>/.test(HEADER), 'DashboardPageHeader');
  check('  so it is one change, not one per page',
    (HEADER.match(/<WhatsHereControl/g) || []).length === 1, 'once');
  check('  and it renders nothing on a page with no guidance',
    /if \(!guidance\) return null;/.test(CONTROL), 'no empty panel');
  check('  or outside a router, where useLocation would throw',
    /catch \{\s*return null;\s*\}/.test(CONTROL), 'wrapped');

  // ── Off by default ────────────────────────────────────────────────────────
  check('the control is behind the flag',
    /if \(!isGuidanceEnabled\(\)/.test(CONTROL), 'isGuidanceEnabled');
  // ON BY DEFAULT SINCE 2026-09-26, AND THIS PAIR IS THE INVERSE OF WHAT IT WAS.
  //
  // The flag defaulted OFF because the tour is shown once and a panel is
  // dismissed one at a time, and neither could be remembered:
  // WeddingDetails.guidanceState did not exist. The owner declared it on
  // 2026-09-25, so the guarantee is keepable and the default flips.
  //
  // It is an OFF switch now, not an on switch, and the direction matters: a
  // storage read that throws must leave the system ON, because the alternative
  // is a browser with blocked site data silently losing a feature.
  check('  the flag is now an off switch — only \'off\' turns it off',
    /getItem\(GUIDANCE_FLAG_KEY\) !== 'off'/.test(FLAG), "anything but 'off' is on");
  check('  a storage read that throws leaves it ON, not broken',
    /catch \{\s*return true;\s*\}/.test(FLAG), 'try/catch returns true');

  // ── The stop, named in the code and not only in a report ──────────────────
  check('the field the owner must add is named in the source',
    /GUIDANCE_STATE_FIELD = 'guidanceState'/.test(FLAG), 'guidanceState');
  // IT IS WRITTEN NOW, and where matters: one hook owns the round trip, so
  // there is one place that can refuse to write on a wedding that has not
  // loaded. A component writing it directly would have to repeat that guard.
  const HOOK = strip(read('src/hooks/useGuidanceState.js'));
  check('  the field is written through one hook, not from a component',
    /guidanceState: next/.test(HOOK)
      && !/guidanceState:/.test(PANEL + TOUR + CONTROL),
    'useGuidanceState owns the write');

  // THE PANEL, THE TOUR, THE CONTROL AND THE FLAG ARE CHECKED FIRST ON
  // PURPOSE. Without the content module there is no model to assert on, but
  // every other half of the ruling is still readable — and a guard that
  // reported one failure and stopped would say far less about what is missing
  // than one that names each part.
  if (!G) return results;

  // ── The content model's shape, on every entry ─────────────────────────────
  const entries = Object.entries(G);
  check('it covers a real number of pages', entries.length >= 30, `${entries.length} pages`);
  const badPurpose = entries.filter(([, v]) => typeof v.purpose !== 'string' || !v.purpose.trim());
  check('every page has a purpose', badPurpose.length === 0, badPurpose.map(([k]) => k).join(', ') || 'all');
  const badSentence = entries.filter(([, v]) => (v.purpose.match(/\./g) || []).length !== 1 || !/\.$/.test(v.purpose));
  check('  and it is ONE sentence, as the model says', badSentence.length === 0,
    badSentence.map(([k]) => k).join(', ') || 'all one sentence');
  const badActions = entries.filter(([, v]) => !Array.isArray(v.actions) || v.actions.length !== 3
    || v.actions.some((a) => typeof a !== 'string' || !a.trim()));
  check('every page has exactly THREE actions', badActions.length === 0, badActions.map(([k]) => k).join(', ') || 'all three');
  const badHelp = entries.filter(([, v]) => typeof v.helpHref !== 'string' || !v.helpHref.startsWith('/'));
  check('every page has a helpHref', badHelp.length === 0, badHelp.map(([k]) => k).join(', ') || 'all');

  // ── Loop, on four pages only ──────────────────────────────────────────────
  const withLoop = entries.filter(([, v]) => v.loop).map(([k]) => k).sort();
  check('loop is on exactly four pages', withLoop.length === 4, withLoop.join(', '));
  check('  and they are the four the ruling names',
    JSON.stringify(withLoop) === JSON.stringify(['/GuestSuiteSchedule', '/Guests', '/Schedule', '/studio']),
    withLoop.join(', '));
  check('  which is what LOOP_PAGES says too',
    JSON.stringify([...(lib.LOOP_PAGES || [])].sort()) === JSON.stringify(withLoop), (lib.LOOP_PAGES || []).join(', '));

  // ── Every page a couple can reach ─────────────────────────────────────────
  const routes = navRoutes();
  check('the sidebar routes were readable', routes.length >= 30, `${routes.length} routes`);
  const missing = routes.filter((r) => !G[r]);
  check('every page in the sidebar has guidance', missing.length === 0, missing.join(', ') || 'none missing');

  // ── The copy rules this is product chrome under ───────────────────────────
  const allText = entries.flatMap(([, v]) => [v.purpose, ...(v.actions || []), v.loop].filter(Boolean));
  check('no exclamation marks — this is chrome, not voiced copy',
    !allText.some((t) => t.includes('!')), `${allText.length} strings`);
  check('  and no emoji', !allText.some((t) => /️|[\u{1F300}-\u{1FAFF}]/u.test(t)), 'none');
  check('  and no ALL CAPS shouting',
    !allText.some((t) => /\b[A-Z]{4,}\b/.test(t.replace(/\b(FAQ|BYO|RSVP|OK)\b/g, ''))), 'sentence case');


  return results;
}
