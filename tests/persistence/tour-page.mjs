/**
 * tests/persistence/tour-page.mjs
 *
 * /tour SHOWS THE PRODUCT, NOT A PROMISE OF IT.
 *
 * The page shipped with eight grey boxes reading "Dashboard capture 16:10".
 * Each scene now plays a recording, and this guard holds that line on the
 * page a visitor is actually served: prerendered/tour/index.html, which is
 * what Vercel returns before any script runs. The selectors are the audit's
 * (item 1 of goals/2026-10-07-rich-recordings-and-tour-page.md): the
 * placeholder's own text, and the data-tour-placeholder marker it carries.
 *
 * It also reads the /tour clips' media map with no network, the same way
 * tour-recordings.mjs reads the chapters', and checks the page is public:
 * listed, in the sitemap, and not noindexed. Delivery (status, type, size) is
 * tour-recordings-live.mjs, which covers these clips too.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MEDIA, TOUR_PAGE_MEDIA, PLACEHOLDER_POSTER } from '../../src/lib/studioTour.js';
import { MARKETING_ROUTES } from '../../scripts/marketingRoutes.mjs';
import { pass, fail } from './_shared.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const MIN_SECONDS = 8;
const MAX_SECONDS = 20;
const CLOUD = 'https://res.cloudinary.com/dsr84xknv/video/upload/';

export function runTourPage() {
  const r = [];
  const check = (name, ok, detail) => r.push(ok ? pass(name, detail) : fail(name, 'see name', detail));
  console.log('\n  The /tour page, as prerendered, and its clips:\n');

  // ── 1. the clips' map ─────────────────────────────────────────────────
  for (const [key, entry] of Object.entries(TOUR_PAGE_MEDIA)) {
    check(`tour clip ${key} is recorded`, !!entry, entry ? 'footage' : 'null: not recorded yet');
    if (!entry) continue;
    for (const [label, side] of [['1440', entry], ['390', entry.phone]]) {
      const at = `tour clip ${key} @ ${label}`;
      if (!side) { check(`${at} exists`, false, 'missing'); continue; }
      for (const [field, ext] of [['webm', '.webm'], ['mp4', '.mp4'], ['poster', '.jpg']]) {
        const url = String(side[field] || '');
        check(`${at} ${field} is studio-tour/tour-page/${key}/${label}${ext}`,
          url.startsWith(CLOUD) && url.endsWith(`/studio-tour/tour-page/${key}/${label}${ext}`), url.slice(-60));
      }
      check(`${at} mp4 carries the bounded transcode`, side.mp4.includes('/vc_h264,q_auto:good,br_900k/'));
      check(`${at} poster is the frame at 1.0s`, side.poster.includes(`/so_1.0,w_${label === '390' ? 780 : 1280},q_auto:good/`));
      check(`${at} poster is not the placeholder`, side.poster !== PLACEHOLDER_POSTER);
      check(`${at} is inside the brief's ${MIN_SECONDS} to ${MAX_SECONDS} seconds`,
        side.seconds >= MIN_SECONDS && side.seconds <= MAX_SECONDS, `${side.seconds}s`);
    }
  }

  // ── 2. the page a visitor is served ───────────────────────────────────
  const file = resolve(ROOT, 'prerendered/tour/index.html');
  check('/tour is prerendered', existsSync(file), 'prerendered/tour/index.html');
  if (!existsSync(file)) return r;
  const html = readFileSync(file, 'utf8');
  const markers = (html.match(/data-tour-placeholder="([^"]*)"/g) || []).map((m) => m.slice(23, -1));
  check('no scene carries a placeholder marker', markers.length === 0, markers.length ? markers.join(', ') : 'none');
  check('no "Dashboard capture 16:10" text', !html.includes('Dashboard capture 16:10'));
  const posters = [...html.matchAll(/https:\/\/res\.cloudinary\.com\/dsr84xknv\/video\/upload\/[^"' )]+\.jpg/g)].map((m) => m[0]);
  const known = new Set([...Object.values(MEDIA), ...Object.values(TOUR_PAGE_MEDIA)].filter(Boolean)
    .flatMap((m) => [m.poster, m.phone?.poster]).filter(Boolean));
  check('every scene poster on the page is one the media maps hold',
    posters.length >= 8 && posters.every((p) => known.has(p)), `${posters.length} posters, ${posters.filter((p) => !known.has(p)).length} unknown`);

  // ── 3. public ─────────────────────────────────────────────────────────
  check('/tour is in MARKETING_ROUTES', MARKETING_ROUTES.includes('/tour'));
  const sitemap = existsSync(resolve(ROOT, 'prerendered/sitemap.xml')) ? readFileSync(resolve(ROOT, 'prerendered/sitemap.xml'), 'utf8') : '';
  check('/tour is in sitemap.xml', /\/tour<\/loc>/.test(sitemap));
  check('/tour is not noindexed', !/<meta name="robots"[^>]*noindex/i.test(html));
  check('/tour has its own title', /<title>Tour the studio<\/title>/.test(html));

  return r;
}
