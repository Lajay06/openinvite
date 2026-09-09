/**
 * tests/persistence/help-and-tips-truthful.mjs
 *
 * THE PAGES THAT EXPLAIN THE PRODUCT DESCRIBE THE PRODUCT THAT EXISTS.
 *
 * The Help center documented an "Assets tab" in the Guest Suite with nine
 * downloadable pieces — Save the Date, Menu Card, Seating Chart, RSVP Card,
 * Welcome Signage, Guest Tags, Thank You Notes, an Instagram Story Kit and a
 * Motion Graphic — with print specifications, a "Download PNG" button and two
 * routes to reach them. The Guest Suite has three tabs: Website, Good to know,
 * Share. None of it was there. Two whole sections, a Quick tip and an
 * onboarding line described a feature removed in Wave 2, and a button on the
 * Ava Studio completion screen pointed at a route that does not exist.
 *
 * ── WHY A COUNT AND NOT A WORD LIST ─────────────────────────────────────────
 *
 * "Available universes (all 10 are live)" was wrong the day the eleventh
 * shipped. A guard forbidding the string "all 10" would go green on "all 15".
 * So the number Help states is READ OUT OF THE PAGE and compared with
 * UNIVERSE_CONFIGS' actual size. It cannot drift, because the fact and the
 * claim are checked against each other rather than against a constant.
 *
 * ── AND THE DEAD ROUTE, BY RESOLUTION RATHER THAN BY NAME ───────────────────
 *
 * `/studio/ava/assets` is asserted to have no reference left, but the general
 * form is what matters: every literal /studio/... path a page navigates to is
 * required to exist in App.jsx. That is the check that found this one, and it
 * is the check that finds the next one.
 */
import { pass, fail } from './_shared.mjs';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

/** Every .jsx/.js under src, so the route check cannot miss a page. */
function sourceFiles(dir = 'src', out = []) {
  for (const name of readdirSync(join(ROOT, dir))) {
    const rel = `${dir}/${name}`;
    if (statSync(join(ROOT, rel)).isDirectory()) sourceFiles(rel, out);
    else if (/\.(jsx?|mjs)$/.test(name)) out.push(rel);
  }
  return out;
}

// The surfaces whose whole job is to explain the product.
const EXPLAINERS = [
  'src/pages/Help.jsx',
  'src/components/dashboard/TipsModal.jsx',
  'src/components/studio/UniverseSelectedChoice.jsx',
  'src/components/onboarding/OnboardingStepUniverse.jsx',
];

// Each phrase names something removed in Wave 2. The Guest Suite's tabs are
// Website, Good to know and Share; there is no asset grid to download from.
const GONE = [
  'Assets tab', 'Download PNG', 'Create Assets', 'asset card', 'asset grid',
  'all 10 assets', 'every asset', 'Every asset', 'Instagram Story Kit',
  'Welcome Signage', 'Guest Tags', 'printed asset',
];

export async function runHelpAndTipsTruthful() {
  const results = [];
  const check = (name, cond, detail) => results.push(cond ? pass(name, detail) : fail(name, 'see name', detail));

  // PRESENCE BEFORE PROPERTIES: an empty Help page contains none of these.
  const help = read('src/pages/Help.jsx');
  check('the Help center still has its articles', (help.match(/': \(/g) || []).length >= 20,
    `${(help.match(/': \(/g) || []).length} sections`);
  const tips = read('src/components/dashboard/TipsModal.jsx');
  check('  and Quick tips still has its tips', (tips.match(/number: '/g) || []).length >= 5,
    `${(tips.match(/number: '/g) || []).length} tips`);

  for (const file of EXPLAINERS) {
    const src = read(file);
    const hits = GONE.filter(p => src.includes(p));
    check(`${file.split('/').pop()} names nothing that was removed`, hits.length === 0,
      hits.length ? hits.join(', ') : `${GONE.length} phrases checked`);
    // R6 is the sweep everywhere; these four are the ones this package owns.
    const ww = (src.match(/wedding website/gi) || []).length;
    check(`  and says "guest suite", not "wedding website"`, ww === 0, ww ? `${ww} occurrence(s)` : 'none');
  }

  // ── the universe count is checked against the universes ───────────────────
  const themes = read('src/lib/websiteThemes.js');
  const body = themes.slice(themes.indexOf('export const UNIVERSE_CONFIGS = {'));
  // top-level keys of the object literal: two-space indent, then `id: {`
  const real = new Set((body.match(/\n {2}([a-z][a-z0-9]*): \{/g) || []).map(m => m.trim().split(':')[0]));
  check('the real universe count was read', real.size >= 10, `${real.size} universes`);

  const WORDS = { ten: 10, eleven: 11, twelve: 12, fifteen: 15, sixteen: 16, eighteen: 18, twenty: 20, 'twenty-five': 25, thirty: 30 };
  const claims = [];
  for (const m of help.matchAll(/(\d+|[a-z-]+) universes? (?:are live|to choose)/gi)) {
    const n = /^\d+$/.test(m[1]) ? +m[1] : WORDS[m[1].toLowerCase()];
    if (n) claims.push(n);
  }
  check('  Help states how many universes there are', claims.length > 0,
    claims.length ? claims.join(', ') : 'no claim found — the scale is worth telling a couple');
  for (const n of claims) {
    check(`  and the number it states is the number there are`, n === real.size, `Help says ${n}, there are ${real.size}`);
  }

  // ── every /studio path a page navigates to exists ──────────────────────────
  const app = read('src/App.jsx');
  // matchAll, not match+slice: `'path="'` is six characters and the slice was
  // seven, so every route came back missing its leading "/" and every real
  // path read as dead. A guard whose first run says everything is broken is a
  // guard nobody believes the second time.
  const routes = new Set([...app.matchAll(/path="(\/studio[^"]*)"/g)].map(m => m[1]));
  check('App.jsx\'s studio routes were read', routes.size > 3, `${routes.size} routes`);
  const dead = [];
  for (const file of sourceFiles()) {
    if (file === 'src/App.jsx') continue;
    for (const m of read(file).matchAll(/navigate\('(\/studio\/[a-z0-9/-]*)'\)/g)) {
      if (!routes.has(m[1])) dead.push(`${file.split('/').pop()} -> ${m[1]}`);
    }
  }
  check('no page navigates to a studio route that does not exist', dead.length === 0,
    dead.length ? dead.join('; ') : `${routes.size} routes, every reference resolves`);

  return results;
}
