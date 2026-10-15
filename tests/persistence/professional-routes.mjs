/**
 * tests/persistence/professional-routes.mjs
 *
 * Openinvite Professional, mounted: src/App.jsx gains exactly one lazy import,
 * the /professional prefix on the public list and one route; the marketing
 * nav and footer gain "For planners" only while VITE_PROFESSIONAL=1. With the
 * flag off, ProfessionalRoot sends every /professional path home, so
 * production behaves as before. goals/2026-10-14-professional.md, Marketing
 * page, and the routes held PR.
 *
 * PLANT (R19): a "For planners" link written without the flag is flagged.
 */
import { readFileSync } from 'node:fs';
import { pass, fail, stripComments } from './_shared.mjs';
import { isProfessionalOn } from '../../src/lib/professionalBrand.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
/** A "For planners" link or /professional route outside a flag check on the same line. */
export const UNGATED = (line) => /For planners|to=["']\/professional["']|to: ["']\/professional["']/.test(line) && !/isProfessionalOn\(\)/.test(line);

export function runProfessionalRoutes() {
  const r = [];
  const check = (name, ok, detail) => r.push(ok ? pass(name, detail) : fail(name, 'see name', detail));
  console.log('\n  Professional, mounted behind the flag:\n');

  const app = stripComments(read('src/App.jsx'), { trailing: true });
  const mentions = app.split('\n').filter((l) => /rofessional/.test(l)).map((l) => l.trim());
  check('professional routes: App.jsx gains exactly the lazy import, the public prefix and one route', mentions.length === 3
    && mentions[0] === "const ProfessionalRoot = lazyWithReload(() => import('./pages/professional/ProfessionalRoot'));"
    && /pathname === '\/professional' \|\| pathname\.startsWith\('\/professional\/'\);$/.test(mentions[1])
    && mentions[2] === '<Route path="/professional/*" element={<ProfessionalRoot />} />', mentions.join(' | '));
  const routeBlock = app.slice(app.indexOf('if (isPublicPath(location.pathname))'), app.indexOf('// Render the main app') > 0 ? app.indexOf('// Render the main app') : app.length);
  check('professional routes: the route sits in the public block; the Professional app does its own sign-in', /<Route path="\/professional\/\*" element=\{<ProfessionalRoot \/>\} \/>/.test(routeBlock), 'public block');
  const root = read('src/pages/professional/ProfessionalRoot.jsx');
  check('professional routes: with the flag off, every /professional path goes home', /if \(!isProfessionalOn\(\)\) return <Navigate to="\/" replace \/>/.test(root), 'ProfessionalRoot');

  const nav = stripComments(read('src/components/public/PublicNav.jsx'), { trailing: true });
  const footer = stripComments(read('src/components/public/PublicFooter.jsx'), { trailing: true });
  const ungated = [...nav.split('\n'), ...footer.split('\n')].filter(UNGATED);
  check('professional routes: "For planners" in the nav and footer only while the flag is on', ungated.length === 0 && /\.\.\.\(isProfessionalOn\(\) \? \[\{ label: "For planners", to: "\/professional" \}\] : \[\]\)/.test(nav) && /\{isProfessionalOn\(\) && <li><Link to="\/professional"[^>]*>For planners<\/Link><\/li>\}/.test(footer), ungated.join(' | ') || 'gated');
  check('professional routes: in a production build without the flag, it is off', isProfessionalOn({}) === false && isProfessionalOn({ PROD: true }) === false, 'off');

  check('PLANT: an ungated "For planners" link is flagged', UNGATED('<li><Link to="/professional">For planners</Link></li>') && !UNGATED('{isProfessionalOn() && <li><Link to="/professional">For planners</Link></li>}'), 'flagged');
  return r;
}
