/**
 * tests/persistence/auth-carousel.mjs
 *
 * THE TWO REPLACED PHOTOGRAPHS ARE GONE, AND ONE CONSTANT FEEDS SIX PAGES.
 *
 * Owner, 2026-09-10: replace two of the four auth-carousel slides. They were
 * identified BY PUBLIC ID rather than by position, and that mattered — both
 * are named SNOWBOUND and they are different photographs, so a positional
 * swap would have been a coin toss. The one to go from slide 1 was the couple
 * in the snow in a red jacket (…ID12431_yunnan); from slide 3, the indoor
 * couple under the yellow blanket with mugs (…ID12430_hmrv0c).
 *
 * ── WHY THIS IS A SOURCE CHECK AND WHAT IT REFUSES TO ASSUME ────────────────
 *
 * The carousel is one exported constant with no per-page override anywhere, so
 * "no longer referenced on the register page" is a fact about that constant.
 * But the reason it is one constant is exactly what could change underneath
 * this: the day a page passes its own `images`, the register page could carry
 * an old asset again while this file still read clean. So the single-source
 * property is asserted too — no consumer may pass `images` without this guard
 * being updated to look there as well.
 *
 * The prerendered register page is checked separately, because it is a
 * committed artifact that goes stale on its own and is what a visitor with no
 * JavaScript is served.
 */
import { pass, fail } from './_shared.mjs';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

/** The two photographs the owner replaced. Neither may come back. */
const RETIRED = ['ID12431_yunnan', 'ID12430_hmrv0c'];
/** The two that replaced them. */
const ADDED = [
  'hf_20260904_090213_dcaa917a-e117-4610-8618-a399139999a4_jv74kl',
  'hf_20260905_095507_0842f0f9-82bb-462a-9756-c6d1b1cb4486_po7vnk',
];

export async function runAuthCarousel() {
  const results = [];
  const check = (name, cond, detail) => results.push(cond ? pass(name, detail) : fail(name, 'see name', detail));

  const layout = readFileSync(join(ROOT, 'src/components/AuthLayout.jsx'), 'utf8');
  const urls = [...layout.matchAll(/https:\/\/res\.cloudinary\.com\/[^"']+/g)].map((m) => m[0]);

  // PRESENCE BEFORE PROPERTIES: an empty carousel contains no retired asset
  // either, and would pass every assertion below.
  check('the auth carousel still has its four slides', urls.length === 4, `${urls.length} url(s)`);

  for (const id of ADDED) {
    check(`  it carries ${id.slice(-6)}`, urls.some((u) => u.includes(id)), id.slice(0, 30) + '…');
  }
  for (const id of RETIRED) {
    // The URLS, not the file: the comment above the constant names both
    // retired assets on purpose, so a whole-file search would never pass.
    check(`  and no longer serves ${id}`, !urls.some((u) => u.includes(id)), id);
  }

  // The chain was to be left alone.
  const chains = [...new Set(urls.map((u) => (u.split('/upload/')[1] || '').split('/')[0]))];
  // ONE CHAIN, A WIDTH, AND c_limit. Without a width Cloudinary serves the
  // whole master and the two new 1792x2400 slides cost 899KB more than the
  // 1280px assets they replaced. Without c_limit the width UPSCALES the two
  // slides that are still 1280 — measured, 396->433KB and 118->151KB for no
  // more detail, which is #670's finding a second time. Both halves are
  // asserted, because a chain with the width and no cap is worse than the
  // chain this replaced.
  check('  every slide shares one chain, and it caps at the slot without enlarging',
    chains.length === 1 && chains[0] === 'f_auto,q_auto,w_1440,c_limit', chains.join(' · '));

  // ONE SOURCE, SIX PAGES — and nothing may quietly opt out of it.
  const pages = readdirSync(join(ROOT, 'src/pages')).filter((f) => f.endsWith('.jsx'));
  const overrides = pages.filter((f) => /<AuthLayout[^>]*\simages=/.test(readFileSync(join(ROOT, 'src/pages', f), 'utf8')));
  check('  and no page passes its own carousel behind this guard\'s back',
    overrides.length === 0, overrides.join(', ') || 'every AuthLayout page uses the one constant');

  // The committed artifact a visitor with no JavaScript is served.
  const html = readFileSync(join(ROOT, 'prerendered/register/index.html'), 'utf8');
  check('the prerendered register page carries a carousel slide',
    /res\.cloudinary\.com/.test(html), 'at least one image');
  for (const id of RETIRED) {
    check(`  and not ${id}`, !html.includes(id), id);
  }
  return results;
}
