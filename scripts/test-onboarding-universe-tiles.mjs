/* global document */
/**
 * THE PICKER SHOWS THE PICTURE THE UNIVERSE ACTUALLY SHOWS.
 *
 * The onboarding picker rendered `imageUrl || /universes/<id>.jpg` — the local
 * statics that predate the Cloudinary folders the owner replaced them with.
 * Marketing's twenty-universe grid and five-universe scroll were moved onto
 * `universeTileImage` on 2026-09-07, in universeCatalog's own words "so
 * marketing and the product cannot drift apart". This picker was not, so a
 * couple chose their aesthetic from one photograph and the design studio then
 * showed them another.
 *
 * ── THE ASSERTION IS EQUALITY WITH THE HERO, NOT A PATTERN ─────────────────
 *
 * A guard that only checked "the src contains cloudinary" would pass on a tile
 * pointing at any Cloudinary image at all — including a different universe's.
 * Per universe, the rendered tile src is compared to what the resolver returns
 * for that id, computed here from the same module the product calls. If the
 * two ever diverge again, the divergence is named with both URLs.
 *
 * ── AND THAT NOTHING FELL BACK ─────────────────────────────────────────────
 *
 * universeTileImage returns the old static when a universe has no sample
 * block, which is correct behaviour and would also be the symptom of the bug
 * this fixes — every universe silently resolving to the fallback, which is
 * exactly what happened when the resolver was first called from a top-level
 * map. So the count of tiles still on `/universes/` is asserted to be zero,
 * separately, with the ids named.
 */
import { chromium } from 'playwright';
import { seededContext, ONBOARDING_SEED, ONBOARDING_USER } from './lib/renderHarness.mjs';
import { UNIVERSE_CATALOG, universeTileImage } from '../src/lib/universeCatalog.js';

const BASE = process.env.CAPTURE_BASE_URL || 'http://localhost:4198';

const results = [];
const check = (name, ok, detail) => {
  results.push(ok);
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};

const browser = await chromium.launch();

for (const width of [390, 1440]) {
  console.log(`\n  The onboarding universe tiles at ${width}\n`);
  const ctx = await seededContext(browser, { width, height: 950, seed: ONBOARDING_SEED, user: ONBOARDING_USER });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/onboarding`, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(3000);

  const step = async (fn) => { await fn(); await page.waitForTimeout(1300); };
  await step(() => page.getByRole('button', { name: 'Get started', exact: true }).first().click({ timeout: 8000 }).catch(() => {}));
  await page.getByPlaceholder('Your name').fill('Ada').catch(() => {});
  await page.getByPlaceholder("Partner's name").fill('Alan').catch(() => {});
  await step(() => page.getByRole('button', { name: /^Continue/ }).first().click({ timeout: 8000 }).catch(() => {}));
  await step(() => page.getByRole('button', { name: /^We haven't set a date yet/ }).first().click({ timeout: 8000 }).catch(() => {}));
  await step(() => page.getByRole('button', { name: /^Not sure yet/ }).first().click({ timeout: 8000 }).catch(() => {}));
  await step(() => page.getByRole('button', { name: 'Celebration', exact: false }).first().click({ timeout: 8000 }).catch(() => {}));
  await step(() => page.getByRole('button', { name: /^Continue/ }).first().click({ timeout: 8000 }).catch(() => {}));
  await step(() => page.getByRole('button', { name: /^Vibe$/ }).first().click({ timeout: 8000 }).catch(() => {}));
  const pill = page.getByRole('button').filter({ hasNotText: /Style|Ceremony type|Vibe|Back|Continue/ });
  if (await pill.count() > 0) await step(() => pill.first().click({ timeout: 8000 }).catch(() => {}));
  await step(() => page.getByRole('button', { name: /^Continue/ }).first().click({ timeout: 8000 }).catch(() => {}));
  await step(() => page.getByRole('button', { name: /^Got it, let's go/ }).first().click({ timeout: 8000 }).catch(() => {}));
  await page.waitForTimeout(2500);

  /** Every tile's image, keyed by the universe it announces itself as. */
  const rendered = await page.evaluate(() => {
    const out = {};
    for (const tile of document.querySelectorAll('[aria-label]')) {
      const m = (tile.getAttribute('aria-label') || '').match(/Preview the (.+?) universe/i);
      if (!m) continue;
      const img = tile.querySelector('img');
      if (img) out[m[1].toLowerCase()] = img.getAttribute('src') || '';
    }
    return out;
  });

  const ids = Object.keys(rendered);
  // PRESENCE BEFORE PROPERTIES: no tiles means no wrong tiles.
  check('the picker rendered its tiles', ids.length >= 15, `${ids.length} tile(s) with an image`);
  if (!ids.length) { await ctx.close(); continue; }

  // ── per universe, the tile IS the hero ───────────────────────────────────
  const wrong = [];
  const stale = [];
  for (const u of UNIVERSE_CATALOG) {
    const src = rendered[u.id];
    if (!src) continue;
    const expected = universeTileImage(u.id, { width: 900, height: 1200 });
    if (expected && src !== expected) wrong.push(`${u.id}: tile ${src.slice(-50)} vs hero ${expected.slice(-50)}`);
    if (/^\/universes\//.test(src)) stale.push(u.id);
  }
  check('  every tile is the universe\'s own hero', wrong.length === 0,
    wrong.length ? wrong.slice(0, 3).join(' | ') : `${ids.length} tile(s) match universeTileImage exactly`);

  // The fallback is correct behaviour AND the symptom of the bug, so it is
  // counted separately rather than folded into the equality above.
  check('    and none fell back to the old local statics', stale.length === 0,
    stale.length ? `still on /universes/: ${stale.join(', ')}` : 'no tile resolves to /universes/');

  const cloudinary = Object.values(rendered).filter((s) => /res\.cloudinary\.com/.test(s)).length;
  check('    and they are served from the hero folders', cloudinary >= ids.length - 1,
    `${cloudinary}/${ids.length} on Cloudinary`);

  await ctx.close();
}

await browser.close();
const failed = results.filter((r) => !r).length;
console.log(`\n  ${results.length - failed}/${results.length} checks passed`);
if (failed) { console.log(`  ${failed} FAILED`); process.exit(1); }
