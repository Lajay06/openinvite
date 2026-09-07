/**
 * tests/persistence/design-studio-polish.mjs
 *
 * THE DESIGN STUDIO, AFTER THE OWNER'S 2026-09-07 PASS.
 *
 * The typography item is NOT here, and that is the point: "all 20 look
 * identical" cannot be caught by reading source. The JSX declared
 * `fontFamily: typography.headingFont` the whole time and was overruled by
 * `*, *::before, *::after { font-family: … !important }` in index.css. Only a
 * render knows which declaration won, so that check lives in
 * scripts/test-universe-typography.mjs, in the browser lane.
 *
 * What IS here is everything a source check can actually decide.
 */
import { pass, fail } from './_shared.mjs';
import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const raw = (p) => readFileSync(join(ROOT, p), 'utf8');
const code = (p) => raw(p)
  .replace(/^[^\n]*?\/\/.*$/gm, (line) => line.slice(0, line.indexOf('//')))
  .replace(/\/\*[\s\S]*?\*\//g, '');

export async function runDesignStudioPolish() {
  const results = [];
  const check = (name, cond, detail) => results.push(cond ? pass(name, detail) : fail(name, 'see name', detail));

  console.log('\n  The design studio:\n');

  // ── THE LANDING ─────────────────────────────────────────────────────────
  {
    const hub = code('src/pages/StudioHub.jsx');
    check('PLANT: no icon medallion on the Guest Suite or My Universe card',
      !/<Icon size=\{20\}/.test(hub) && !/icon: Globe/.test(hub) && !/icon: Sparkles/.test(hub),
      'the photograph is the card');
    check('  and the badge keeps its place at the right',
      /justifyContent: 'flex-end', marginBottom: 'auto'/.test(hub), 'Live · Draft · Ultra');
    check('PLANT: My Universe shows the universe’s CURRENT hero, not the old static',
      /getSampleWedding\(universeId\)\?\.coverPhoto \|\| universe\?\.imageUrl/.test(hub),
      '/universes/paris.jpg predates the Cloudinary folders');
  }

  // ── THE DETAIL PAGE ─────────────────────────────────────────────────────
  {
    const view = code('src/components/universe-studio/UniverseWorldView.jsx');
    const rawView = raw('src/components/universe-studio/UniverseWorldView.jsx');

    check('PLANT: the type specimen can escape the global font lock',
      /className="oi-universe-face--heading"/.test(view) && /className="oi-universe-face--body"/.test(view)
        && /'--oi-heading-font': typography\.headingFont/.test(view),
      'custom properties, as the guest site already does');
    check('  and the CSS gives those two classes the higher-specificity rule',
      /\.oi-universe-face--heading \{[\s\S]{0,120}var\(--oi-heading-font/.test(raw('src/index.css'))
        && /\.oi-universe-face--body \{[\s\S]{0,120}var\(--oi-body-font/.test(raw('src/index.css')),
      'the `*` lock is beaten deliberately, not by accident');

    check('PLANT: a breadcrumb, with each crumb its own control',
      /aria-label="Breadcrumb"/.test(view)
        && /onClick=\{\(\) => navigate\('\/studio'\)\}/.test(view)
        && /onClick=\{onBack\} style=\{CRUMB\}/.test(view),
      'Design studio › My universe › <name>');
    check('  the page you are on is not a link',
      /aria-current="page"/.test(view), 'the last crumb is text');
    // The breadcrumb specifically: three controls as SIBLINGS inside the nav.
    // The whole-file "no button inside a button" scan is wrong — this file
    // has many buttons, and any two of them within 400 characters trip it.
    const nav = /<nav\b[\s\S]*?<\/nav>/.exec(view)?.[0] || '';
    // SIBLINGS, NOT NESTED: the first button must CLOSE before the second
    // opens. A regex looking for "<button … <button" cannot tell nesting from
    // sequence — it matched two siblings and reported them as nested, which
    // is the check failing for the shape it exists to allow.
    const firstClose = nav.indexOf('</button>');
    const secondOpen = nav.indexOf('<button', nav.indexOf('<button') + 1);
    check('  and it is a nav of buttons, not a button of buttons',
      nav.length > 0 && (nav.match(/<button/g) || []).length === 2
        && firstClose > -1 && secondOpen > firstClose,
      'a button inside a button stops being clickable');

    // THE CTAs. Every button on this page paints a solid background — the
    // "Marrakech transparent CTA" was its palette failing 4.5:1 (4.06), which
    // is fixed by readableOn in the design-system sweep, not by opacity.
    const backgrounds = [...rawView.matchAll(/<button[\s\S]{0,600}?background: ([^,]+),/g)].map((m) => m[1].trim());
    check('PLANT: no hero CTA is transparent',
      backgrounds.length > 0 && backgrounds.every((b) => !/transparent|rgba\([^)]*,\s*0(\.\d+)?\)/.test(b)),
      backgrounds.join(' · ') || 'no buttons found');
    check('  and their text colour is derived, not hard-paired',
      /readableOn\(/.test(view) && !/color: (universe\.)?colors\.darkBg/.test(view),
      'navy-on-black was 1.04:1');
  }

  return results;
}
