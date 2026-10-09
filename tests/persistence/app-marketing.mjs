/**
 * tests/persistence/app-marketing.mjs
 *
 * THE MARKETING SITE SAYS THERE IS AN APP, IN THE OWNER'S WORDS, AND LINKS
 * TO NO STORE YET.
 *
 * goals/2026-10-10-app-on-the-marketing-site.md. Read off prerendered/, which
 * is what a visitor is served before any script runs, so the copy is checked
 * on the page and not in a component that might not be mounted.
 *
 * THE ABSENCE IS ASSERTED, NOT ASSUMED. The app is in neither store, so until
 * the owner supplies the links no page may carry a link or an image pointing
 * at apps.apple.com or play.google.com; every place a badge would go carries
 * the plain store line instead.
 *
 * Each item of the goal extends this guard: item 1 is the home block.
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MEDIA } from '../../src/lib/studioTour.js';
import { pass, fail } from './_shared.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const PRE = resolve(ROOT, 'prerendered');
export const STORE_LINE = 'Coming to the App Store and Google Play at launch.';
const STORE_HOSTS = /apps\.apple\.com|play\.google\.com/i;

/** The text of an HTML string, tags out and entities for quotes decoded. */
function textOf(html) {
  return html.replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<[^>]+>/g, ' ').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ');
}

/** The inner HTML of the first element carrying `attr`, by tag depth. */
function sectionWith(html, attr) {
  const at = html.indexOf(attr);
  if (at < 0) return '';
  const open = html.lastIndexOf('<', at);
  const tag = /^<([a-z0-9]+)/i.exec(html.slice(open))?.[1];
  if (!tag) return '';
  let depth = 0;
  const re = new RegExp(`<\\/?${tag}\\b[^>]*>`, 'gi');
  re.lastIndex = open;
  let m;
  while ((m = re.exec(html))) {
    depth += m[0][1] === '/' ? -1 : 1;
    if (depth === 0) return html.slice(open, re.lastIndex);
  }
  return '';
}

function htmlFiles(dir) {
  const out = [];
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) out.push(...htmlFiles(p));
    else if (f.endsWith('.html')) out.push(p);
  }
  return out;
}

export function runAppMarketing() {
  const r = [];
  const check = (name, ok, detail) => r.push(ok ? pass(name, detail) : fail(name, 'see name', detail));
  console.log('\n  The app on the marketing site, as prerendered:\n');

  // ── no store link or badge anywhere, until the owner supplies them ────
  const pages = existsSync(PRE) ? htmlFiles(PRE) : [];
  const withStore = pages.filter((p) => STORE_HOSTS.test(readFileSync(p, 'utf8')));
  check('no marketing page links to or shows an App Store or Google Play asset',
    pages.length > 0 && withStore.length === 0,
    withStore.length ? withStore.map((p) => p.slice(PRE.length + 1)).join(', ') : `${pages.length} pages`);

  // ── item 1: the home block ─────────────────────────────────────────────
  const home = existsSync(join(PRE, 'index.html')) ? readFileSync(join(PRE, 'index.html'), 'utf8') : '';
  const block = sectionWith(home, 'data-home-app');
  check('home: the app block is on the page', !!block);
  const t = textOf(block);
  check('home: the heading, verbatim', t.includes('The whole planner, in your pocket.'));
  check('home: the body, verbatim', t.includes('Plan on the train, on the couch, in the queue for coffee. The guest list, the budget, the seating chart and Ava are all on your phone, and a reply from a guest reaches you the moment it lands. Your guests never need the app; they open a link.'));
  check('home: the store line, as text', t.includes(STORE_LINE) && /data-app-store-line/.test(block));
  check('home: the store line is not a link', !/<a\b[^>]*>[^<]*Coming to the App Store/.test(block));
  const imgs = [...block.matchAll(/<img\b[^>]*src="([^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, '&'));
  check('home: one picture, and no video', imgs.length === 1 && !/<video\b/.test(block), `${imgs.length} img`);
  check('home: the picture is the daily update at 390, from the recording',
    imgs[0] === MEDIA.welcome?.phone?.poster, String(imgs[0]).slice(-60));
  const blockAt = home.indexOf('data-home-app');
  const pricingAt = home.indexOf('section-pricing');
  const cardsAt = home.indexOf('section-features');
  check('home: after the six cards and before pricing',
    cardsAt > -1 && blockAt > cardsAt && pricingAt > blockAt, `cards ${cardsAt}, app ${blockAt}, pricing ${pricingAt}`);

  // ── item 3: the pricing line ──────────────────────────────────────────
  const pricing = existsSync(join(PRE, 'pricing/index.html')) ? readFileSync(join(PRE, 'pricing/index.html'), 'utf8') : '';
  const planLines = [...pricing.matchAll(/<li\b[^>]*data-plan-app[^>]*>([\s\S]*?)<\/li>/g)].map((m) => textOf(m[1]).trim());
  check('pricing: each of the two plan cards says "Includes the app."',
    planLines.length === 2 && planLines.every((t) => t === 'Includes the app.'), JSON.stringify(planLines));
  check('pricing: the line appears nowhere else on the page',
    (textOf(pricing).match(/Includes the app\./g) || []).length === 2);

  return r;
}
