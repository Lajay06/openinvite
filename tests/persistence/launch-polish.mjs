/**
 * tests/persistence/launch-polish.mjs
 *
 * THE LAUNCH POLISH THAT CAN BE READ OFFLINE (goals/2026-10-15-consumer-
 * launch-website.md, item 6). Each marketing page, as prerendered, has its own
 * title and description and shares its own picture: its hero photograph at
 * the 1200 by 630 card, or the brand poster for Home, the FAQ and the legal
 * and sign-in pages. The sitemap lists every page it should, and robots points
 * at it. The layout half of item 6 (no sideways scroll, nothing clipped,
 * every image loads with alt text, no internal link lands on the 404) is
 * measured in a browser at 390 and 1440 and reported with the run.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pass, fail } from './_shared.mjs';
import { DEFAULT_OG_IMAGE, getShareImage, MARKETING_PAGE_SEO } from '../../src/lib/marketingSeo.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const PRE = join(ROOT, 'prerendered');
const OWN_PICTURE = ['/features', '/ava', '/universes', '/pricing', '/gifting', '/contact', '/tour', '/app', '/about'];
const POSTER = ['/', '/faq', '/privacy-policy', '/terms-of-service', '/login', '/register', '/forgot-password'];
const head = (route) => {
  const p = join(PRE, route === '/' ? 'index.html' : `${route.slice(1)}/index.html`);
  return existsSync(p) ? readFileSync(p, 'utf8').replace(/&amp;/g, '&').split('</head>')[0] : '';
};
const meta = (h, attr, key) => new RegExp(`<meta ${attr}="${key}" content="([^"]*)"`).exec(h)?.[1] || new RegExp(`<meta content="([^"]*)" ${attr}="${key}"`).exec(h)?.[1] || '';

export function runLaunchPolish() {
  const r = [];
  const check = (name, ok, detail) => r.push(ok ? pass(name, detail) : fail(name, 'see name', detail));
  console.log('\n  Launch polish, as prerendered:\n');

  const routes = [...OWN_PICTURE, ...POSTER];
  const heads = Object.fromEntries(routes.map((x) => [x, head(x)]));
  const titles = routes.map((x) => /<title>([^<]*)<\/title>/.exec(heads[x])?.[1] || '');
  check('every page has its own title', titles.every(Boolean) && new Set(titles).size === titles.length, titles.join(' / '));
  const descs = routes.map((x) => meta(heads[x], 'name', 'description'));
  check('every page has its own description', descs.every((d) => d.length >= 30) && new Set(descs).size === descs.length);
  for (const x of OWN_PICTURE) {
    const og = meta(heads[x], 'property', 'og:image');
    check(`${x} shares its own hero at 1200 by 630`, og === getShareImage(x) && og !== DEFAULT_OG_IMAGE && /c_fill,g_auto,w_1200,h_630/.test(og) && meta(heads[x], 'name', 'twitter:image') === og, og.slice(-60));
  }
  const pictures = OWN_PICTURE.map(getShareImage);
  check('no two pages share the same picture', new Set(pictures).size === pictures.length);
  check('Home, the FAQ, legal and sign-in pages share the brand poster', POSTER.every((x) => meta(heads[x], 'property', 'og:image') === DEFAULT_OG_IMAGE));
  check('every page with SEO copy is in the map', routes.every((x) => MARKETING_PAGE_SEO[x]));

  const sitemap = existsSync(join(PRE, 'sitemap.xml')) ? readFileSync(join(PRE, 'sitemap.xml'), 'utf8') : '';
  const listed = [...sitemap.matchAll(/<loc>https:\/\/www\.openinvite\.com\.au([^<]*)<\/loc>/g)].map((m) => m[1] || '/');
  const want = ['/', '/features', '/ava', '/faq', '/universes', '/gifting', '/pricing', '/contact', '/about', '/app', '/privacy-policy', '/terms-of-service'];
  check('the sitemap lists every public marketing page, on www', want.every((x) => listed.includes(x)), listed.join(' '));
  const robots = readFileSync(join(ROOT, 'public/robots.txt'), 'utf8');
  check('robots allows the site, keeps /api, /rsvp and /w out, and names the sitemap',
    /User-agent: \*\s*\nAllow: \/\s*\nDisallow: \/api\/\s*\nDisallow: \/rsvp\/\s*\nDisallow: \/w\//.test(robots) && /Sitemap: https:\/\/www\.openinvite\.com\.au\/sitemap\.xml/.test(robots));
  return r;
}
