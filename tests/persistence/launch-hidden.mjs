/**
 * tests/persistence/launch-hidden.mjs
 *
 * HIDDEN UNTIL AFTER LAUNCH (goals/2026-10-15-consumer-launch-website.md,
 * item 5; owner ruling 2026-10-15). Openinvite launches for couples and the
 * app. Professional and Friends of Openinvite come after: no public page
 * links to, shows or names either, and "For planners" stays behind its flag.
 *
 * Read off prerendered/, the built marketing pages a visitor is served before
 * any script runs, with scripts, styles and asset links stripped, so a chunk
 * named professionalBrand-*.js is not a mention but a link or a word is. The
 * flag itself is read with no build variables, as production builds it.
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pass, fail } from './_shared.mjs';
import { isProfessionalOn } from '../../src/lib/professionalBrand.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const PRE = join(ROOT, 'prerendered');
// The product's name is capitalized; "professional legal ... advice" in the
// privacy policy is the ordinary word, and stays.
const SEEN = { test: (s) => /for planners|friends of openinvite|href="\/professional|href="\/friends/i.test(s) || /\bProfessional\b/.test(s) };

const pages = (dir) => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? pages(p) : f.endsWith('.html') ? [p] : [];
});
/** What a visitor can see or follow: no scripts, styles or asset links. */
export const visible = (html) => html
  .replace(/<script\b[\s\S]*?<\/script>/gi, '')
  .replace(/<style\b[\s\S]*?<\/style>/gi, '')
  .replace(/<link\b[^>]*>/gi, '');

export function runLaunchHidden() {
  const r = [];
  const check = (name, ok, detail) => r.push(ok ? pass(name, detail) : fail(name, 'see name', detail));
  console.log('\n  Hidden until after launch:\n');

  const all = existsSync(PRE) ? pages(PRE) : [];
  check('the built marketing pages are there to read', all.length >= 10, `${all.length} pages`);
  const named = all.filter((p) => SEEN.test(visible(readFileSync(p, 'utf8'))));
  check('no public page links to, shows or names Professional, Friends or "For planners"',
    named.length === 0, named.map((p) => p.slice(PRE.length + 1)).join(', ') || `${all.length} pages clean`);
  const sitemap = join(PRE, 'sitemap.xml');
  const sm = existsSync(sitemap) ? readFileSync(sitemap, 'utf8') : readFileSync(join(ROOT, 'public/sitemap.xml'), 'utf8');
  check('the sitemap lists neither', !/professional|friends/i.test(sm));
  check('"For planners" is off in a build with no flag set, as production builds it', isProfessionalOn({}) === false);
  check('and the check would catch a mention', SEEN.test('<a href="/professional">For planners</a>') && SEEN.test('Openinvite Professional') && !SEEN.test('never professional legal advice') && !SEEN.test(visible('<link rel="modulepreload" href="/assets/professionalBrand-x.js">')));
  return r;
}
