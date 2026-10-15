/**
 * tests/persistence/product-showcases.mjs
 *
 * THE FIVE PRODUCT SHOWCASES, AS THE CONSUMER LAUNCH GOAL PLACED THEM
 * (goals/2026-10-15-consumer-launch-website.md, items 1 and 2, and its brand
 * contract). Read from source, offline, every run.
 *
 * What it holds:
 *   - each showcase REPLACES the section with its job, in the ruled order:
 *     /features runs quick start (black), concept 1 (white), the app, the
 *     accordion, concept 4 (black), concept 2 (white), concept 3 (photo),
 *     smart budget (white), the end cap; Home has concept 5 where "One
 *     aesthetic vision" was, and nothing else added
 *   - the grounds alternate as ruled, and every desktop panel is 900px
 *   - one red pill at most per panel, the site's rule and type, no eyebrow,
 *     no uppercase, no cream, no em or en dash in any string
 *   - cards keep the site's card: no shadow, and rounding only on pills
 *   - every photograph is one of the owned Higgsfield ids, never a DTS photo
 *   - every line height is whole pixels, so no panel lands on a half pixel
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pass, fail, stripComments } from './_shared.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const DIR = 'src/components/marketing/showcase';

export async function runProductShowcases() {
  const r = [];
  const check = (name, ok, detail) => r.push(ok ? pass(name, detail) : fail(name, 'see name', detail));
  console.log('\n  The product showcases:\n');

  // ── placement ──────────────────────────────────────────────────────────
  const features = stripComments(read('src/pages/Features.jsx'));
  const at = (s, name) => { const m = new RegExp(`<${name}\\b`).exec(s); return m ? m.index : -1; };
  const fOrder = ['QuickStartSection', 'ShowcaseInvitation', 'FeaturesAppSection', 'AccordionSection', 'ShowcaseYear', 'ShowcaseReplies', 'ShowcaseSeating', 'ShowcaseBudget', 'MarketingEndCap'];
  const fPos = fOrder.map((n) => at(features.slice(features.indexOf('export default function Features')), n));
  check('/features: concept 1 replaces the dashboard, and 4, 2, 3 then budget replace the deep dives, in order',
    fPos.every((p, i) => p > 0 && (i === 0 || p > fPos[i - 1])), fOrder.map((n, i) => `${n}@${fPos[i]}`).join(' '));
  check('/features: the dashboard section, its morning band and the three deep dives are gone',
    !/DashboardSection|data-dashboard-band|FeatureTimeline|FeatureGuests|FeatureBudget|Customizable Dashboard/.test(features));
  const home = stripComments(read('src/pages/Home.jsx'));
  check('Home: concept 5 stands where the universe teaser stood, between the universes photo and the Ava banner',
    at(home, 'UniverseMiniHero') > 0 && at(home, 'ShowcaseWorlds') > at(home, 'UniverseMiniHero') && home.indexOf('AI meets I Do') > at(home, 'ShowcaseWorlds')
      && !/UniverseTeaserSection/.test(home) && !existsSync(join(ROOT, 'src/components/home/UniverseTeaserSection.jsx')));
  check('Home: "One aesthetic vision" is gone from the page, and nothing else was added',
    !/One aesthetic vision/.test(home) && (home.match(/<Showcase[A-Z]\w*/g) || []).length === 1);

  // ── grounds and the panel ──────────────────────────────────────────────
  const files = readdirSync(join(ROOT, DIR)).filter((f) => f.endsWith('.jsx'));
  const src = Object.fromEntries(files.map((f) => [f, stripComments(read(`${DIR}/${f}`))]));
  const ground = (f) => /<ShowcasePanel ground="(\w+)"/.exec(src[f])?.[1];
  const want = { 'ShowcaseInvitation.jsx': 'white', 'ShowcaseYear.jsx': 'black', 'ShowcaseReplies.jsx': 'white', 'ShowcaseSeating.jsx': 'photo', 'ShowcaseBudget.jsx': 'white', 'ShowcaseWorlds.jsx': 'black' };
  check('grounds as ruled: concept 1 white, 4 black, 2 white, 3 the photograph, budget white, 5 black',
    Object.entries(want).every(([f, g]) => ground(f) === g), Object.keys(want).map((f) => `${f}:${ground(f)}`).join(' '));
  const panel = src['ShowcasePanel.jsx'];
  check('every desktop panel is exactly 900px', /@media \(min-width: 1024px\) \{\s*\.showcase \{ height: 900px; \}/.test(panel));
  check('the site\'s rule and type: a 56 by 4 red rule, a 700 headline at -0.03em, left aligned',
    /\.showcase__rule \{ width: 56px; height: 4px; background: \$\{SHOWCASE_RED\}/.test(panel) && /\.showcase__heading \{[^}]*letter-spacing: -0\.03em; font-weight: 700;/.test(panel) && !/\.showcase__(copy|heading|body)[^{]*\{[^}]*text-align:\s*center/.test(Object.values(src).join('\n')));
  for (const f of files.filter((x) => x !== 'ShowcasePanel.jsx')) {
    const ctas = (src[f].match(/cta=\{\{/g) || []).length;
    check(`${f}: at most one red pill`, ctas <= 1, `${ctas}`);
  }

  // ── the contract ───────────────────────────────────────────────────────
  const all = Object.values(src).join('\n');
  const strings = (all.match(/"[^"\n]*"|'[^'\n]*'|>[^<>{}\n]+</g) || []).join('\n');
  check('no em or en dash in any string', !/[–—]/.test(strings));
  check('no eyebrow and no uppercase', !/text-transform:\s*uppercase|textTransform|eyebrow/i.test(all));
  check('no cream: no warm off-white ground', !/#(FAF9F5|F5F5F3|FAF7F2|F7F3EE|FDF8F0|F8F4EC)/i.test(all));
  const radii = all.match(/border-radius:\s*[^;]+;/g) || [];
  check('rounding only on pills and dots (999px)', radii.every((x) => /999px/.test(x)), radii.join(' '));
  check('the card has no shadow', !/\.showcase__card[^{]*\{[^}]*box-shadow/.test(all) && !/box-shadow:\s*0 \d+px \d+px/.test(all));
  const lh = all.match(/line-height:\s*[^;]+;/g) || [];
  check('every line height is whole pixels', lh.every((x) => /line-height: \d+px;/.test(x)), lh.filter((x) => !/line-height: \d+px;/.test(x)).join(' '));

  // ── photographs ────────────────────────────────────────────────────────
  const ids = [...panel.matchAll(/id: "([^"]+)"/g)].map((m) => m[1]);
  check('nine owned Higgsfield photographs, no DTS photo', ids.length === 9 && ids.every((id) => /^(hf_|pin_|pin2_)/.test(id)) && !/DTS_/.test(all), ids.join(', '));
  const keys = [...all.matchAll(/showcasePhoto\("(\w+)"/g), ...all.matchAll(/photo: "(\w+)"/g)].map((m) => m[1]);
  check('every photograph a showcase asks for is in that list', keys.length > 0 && keys.every((k) => new RegExp(`\\b${k}: \\{ id:`).test(panel)), keys.join(', '));
  check('every photograph has alt text', !/<img(?![^>]*\balt=)[^>]*>/.test(all));
  check('the universe names keep their own face through the specimen escape',
    /oi-universe-face--heading/.test(src['ShowcaseWorlds.jsx']) && /"--oi-heading-font": w\.font\.family/.test(src['ShowcaseWorlds.jsx']) && /loadFontFamilies/.test(src['ShowcaseWorlds.jsx']));

  return r;
}
