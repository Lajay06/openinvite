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
import { TOUR_PAGE_MEDIA, PLACEHOLDER_POSTER } from '../../src/lib/studioTour.js';
import { TOUR_MOMENTS } from '../../src/lib/tourMoments.js';
import { MARKETING_ROUTES, UNLISTED_ROUTES } from '../../scripts/marketingRoutes.mjs';
import { pass, fail, stripComments } from './_shared.mjs';

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
    // A PHONE-SCREEN TAKE (the app section's phone, batch 2): one 440 by 956
    // take at 3x, 1320 by 2868, poster at native size. app-marketing.mjs holds
    // it to its size and its never-resized URLs; here, its place in the map.
    if (entry.width === 1320 && entry.height === 2868 && !entry.phone) {
      for (const [field, ext] of [['webm', '.webm'], ['mp4', '.mp4'], ['poster', '.jpg']]) {
        check(`tour clip ${key} @ 440 ${field} is studio-tour/tour-page/${key}/440-<take>${ext}`,
          String(entry[field]).startsWith(CLOUD) && new RegExp(`/studio-tour/tour-page/${key}/440-\\d{14}\\${ext}$`).test(entry[field]), String(entry[field]).slice(-60));
      }
      check(`tour clip ${key} @ 440 mp4 carries the bounded transcode`, entry.mp4.includes('/vc_h264,q_auto:good,br_900k/'));
      check(`tour clip ${key} @ 440 poster is the frame at 1.0s, at native size`, entry.poster.includes('/so_1.0,q_auto:good/'));
      check(`tour clip ${key} @ 440 is inside the brief's ${MIN_SECONDS} to ${MAX_SECONDS} seconds`, entry.seconds >= MIN_SECONDS && entry.seconds <= MAX_SECONDS, `${entry.seconds}s`);
      continue;
    }
    for (const [label, side] of [['1440', entry], ['390', entry.phone]]) {
      const at = `tour clip ${key} @ ${label}`;
      if (!side) { check(`${at} exists`, false, 'missing'); continue; }
      for (const [field, ext] of [['webm', '.webm'], ['mp4', '.mp4'], ['poster', '.jpg']]) {
        const url = String(side[field] || '');
        check(`${at} ${field} is studio-tour/tour-page/${key}/${label}${ext}`,
          url.startsWith(CLOUD) && new RegExp(`/studio-tour/tour-page/${key}/${label}(-\\d{14})?\\${ext}$`).test(url), url.slice(-60));
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

  // FOUR MOMENTS, EACH ONE LINE AND NOTHING ELSE (site fixes batch 3, item 5,
  // owner walkthrough 2026-10-11): the morning page, replies, the seating
  // chart, the guest suite, in that order, each full width.
  const sections = [...html.matchAll(/<section\b[^>]*data-tour-moment="([a-z]+)"[^>]*>([\s\S]*?)<\/section>/g)];
  check('four moments, in order: morning, replies, seating, suite',
    sections.map((m) => m[1]).join(',') === 'morning,replies,seating,suite' && TOUR_MOMENTS.length === 4, sections.map((m) => m[1]).join(','));
  for (const [, key, body] of sections) {
    const moment = TOUR_MOMENTS.find((x) => x.key === key);
    const text = body.replace(/<[^>]+>/g, ' ').replace(/&#x27;|&#39;/g, "'").replace(/\s+/g, ' ').trim();
    check(`${key}: its one line, as its h2, and no other text`, !!moment && text === moment.line && (body.match(/<h2\b/g) || []).length === 1, text);
    check(`${key}: no em or en dash in its line`, !!moment && !/[\u2013\u2014]/.test(moment.line));
  }
  // Every image on the moments is one the moments map holds (a still's src,
  // or a clip's poster before it mounts), so nothing on the page is a stray.
  const known = new Set(TOUR_MOMENTS.flatMap((m) => [m.still?.src, m.clip?.poster, m.phone?.still?.src, m.phone?.clip?.poster]).filter(Boolean));
  const shown = sections.flatMap(([, , body]) => [...body.matchAll(/<img\b[^>]*src="([^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, '&')));
  check('every moment shows one image, and each is one the moments map holds',
    shown.length === 4 && shown.every((u) => known.has(u)), `${shown.length} images, ${shown.filter((u) => !known.has(u)).length} unknown`);
  const wideIds = TOUR_MOMENTS.flatMap((m) => [m.still?.src, m.clip?.webm]).filter(Boolean);
  // A cut clip is exactly 3:2; the guest site is shown whole, at 16:10.
  check('every moment is a versioned upload; a cut clip is exactly 3:2, the guest site whole at 16:10',
    wideIds.every((u) => /\/v[1-9]\d{5,}\/studio-tour\//.test(u))
      && TOUR_MOMENTS.filter((m) => m.clip).every((m) => { const c = /c_crop,x_\d+,y_\d+,w_(\d+),h_(\d+)/.exec(m.clip.webm); return c ? c[1] * 2 === c[2] * 3 : m.clip.aspect === '16 / 10' && m.key === 'suite'; }));

  // ── 3. live, but unlisted (site fixes batch 3, item 5) ──────────────────
  // The page stays live at its URL and keeps its title while it is rebuilt
  // as four moments, and after; it is out of the nav and the sitemap, and noindexed by
  // header, until it reads like the rest of the site.
  check('/tour is still prerendered and routed', MARKETING_ROUTES.includes('/tour')
    && /<Route path="\/tour" element=\{<Tour \/>\} \/>/.test(readFileSync(resolve(ROOT, 'src/App.jsx'), 'utf8')), 'the URL works');
  check('/tour is unlisted', UNLISTED_ROUTES.includes('/tour'));
  const sitemap = existsSync(resolve(ROOT, 'prerendered/sitemap.xml')) ? readFileSync(resolve(ROOT, 'prerendered/sitemap.xml'), 'utf8') : '';
  check('/tour is not in sitemap.xml, which still lists the rest', !/\/tour<\/loc>/.test(sitemap) && /\/features<\/loc>/.test(sitemap));
  const rule = (JSON.parse(readFileSync(resolve(ROOT, 'vercel.json'), 'utf8')).headers || []).find((h) => h.source === '/tour');
  const robots = (rule?.headers?.find((h) => h.key.toLowerCase() === 'x-robots-tag')?.value || '').toLowerCase();
  check('/tour is noindex, nofollow and noarchive by header', ['noindex', 'nofollow', 'noarchive'].every((d) => robots.includes(d)), robots || 'MISSING');
  const nav = readFileSync(resolve(ROOT, 'src/components/public/PublicNav.jsx'), 'utf8');
  const footer = readFileSync(resolve(ROOT, 'src/components/public/PublicFooter.jsx'), 'utf8');
  check('/tour is in neither the nav nor the footer',
    !/to: "\/tour"|href="\/tour"|to="\/tour"/.test(stripComments(nav)) && !/\/tour\b/.test(stripComments(footer)), 'no link');
  check('/tour has its own title', /<title>Openinvite \| Tour the studio<\/title>/.test(html));

  return r;
}
