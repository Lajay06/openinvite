/**
 * tests/persistence/gift-seo-sitemap.mjs
 *
 * /gift IS A PAGE OF ITS OWN (owner ruling 2026-10-16). It has its own title,
 * description and canonical, set by the same hook as every marketing page, and
 * it is in sitemap.xml. It is not prerendered: its on switch is a build
 * variable set in production only, so a local prerender would capture the
 * redirect to /gifting. /tour stays out of the sitemap.
 *
 * Also held here, from the same ruling: the parking label reads "Nearby
 * parking" on the web and in the app, never "Nearby car parks".
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pass, fail, stripComments } from './_shared.mjs';
import { MARKETING_PAGE_SEO, getMarketingSeo } from '../../src/lib/marketingSeo.js';
import { MARKETING_ROUTES, UNLISTED_ROUTES, SITEMAP_ONLY_ROUTES } from '../../scripts/marketingRoutes.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

export function runGiftSeoSitemap() {
  const r = [];
  const check = (name, ok, detail) => r.push(ok ? pass(name, detail) : fail(name, 'see name', detail));
  console.log('\n  /gift, its page and its place in the sitemap:\n');

  const gift = MARKETING_PAGE_SEO['/gift'];
  check('/gift has its own title and description, not the gifting page\'s',
    !!gift && gift.title !== MARKETING_PAGE_SEO['/gifting'].title && gift.description !== MARKETING_PAGE_SEO['/gifting'].description && getMarketingSeo('/gift') === gift, gift?.title);
  check('  and no dash in either', !/[–—]/.test(gift.title + gift.description));
  check('the gift page sets them, with the canonical from its own path',
    /export default function GiftV2\(\) \{\s*useMarketingSeo\(\);/.test(stripComments(read('src/pages/GiftV2.jsx'))));

  const sitemap = read('prerendered/sitemap.xml');
  const listed = [...sitemap.matchAll(/<loc>https:\/\/www\.openinvite\.com\.au([^<]*)<\/loc>/g)].map((m) => m[1] || '/');
  const want = [...MARKETING_ROUTES.filter((x) => !UNLISTED_ROUTES.includes(x)), ...SITEMAP_ONLY_ROUTES];
  check('the sitemap is exactly what the generator writes, /gift included', JSON.stringify(listed) === JSON.stringify(want) && listed.includes('/gift'), listed.join(' '));
  check('/tour stays out of the sitemap', !listed.includes('/tour'));
  check('/gift is listed but never prerendered', SITEMAP_ONLY_ROUTES.includes('/gift') && !MARKETING_ROUTES.includes('/gift'));
  check('the generator reads the sitemap-only list', /\.\.\.SITEMAP_ONLY_ROUTES\]/.test(read('scripts/prerender.mjs')));

  check('"Nearby parking" on the web and in the app, never "Nearby car parks"',
    />Nearby parking</.test(read('src/pages/Transport.jsx')) && /title: 'Nearby parking'/.test(read('src/mobile/features/schemas.js'))
      && !/Nearby car parks/.test(read('src/pages/Transport.jsx') + read('src/mobile/features/schemas.js')));
  return r;
}
