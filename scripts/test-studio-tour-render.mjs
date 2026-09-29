/* global document, window */
/**
 * THE STUDIO TOUR, AS A COUPLE ACTUALLY MEETS IT, at 390 and 1440.
 *
 * Goal 2026-09-28 names six things to guard: "first-run takeover, sidebar
 * entry, '?' entry landing on the right chapter, resume from a half-finished
 * tour, reduced motion showing posters, keyboard navigation."
 *
 * Every one of them is a browser fact. The source guard
 * (tests/persistence/studio-tour-copy.mjs) proves the chapters match the
 * owner's document; this proves a couple can reach them.
 *
 * ── THE SEED IS VARIED PER CASE, AND THAT IS THE POINT ─────────────────────
 *
 * The fixture wedding has guidanceState.tourSeenAt SET, so the takeover does
 * not appear on it, correctly. Three of these cases therefore run against a
 * modified seed: tourSeenAt null for the first run, and a part-filled
 * `dismissed` list for resume. A guard that could only test the default seed
 * could not test the first run at all, which is the one moment every couple
 * gets exactly once.
 *
 * ── WHAT IT DOES NOT CLAIM ─────────────────────────────────────────────────
 *
 * THE POSTER IMAGE IS BLOCKED, BY DESIGN. scripts/lib/blockRemoteImages.mjs
 * refuses Cloudinary in this harness because 95.6% of a 38.5 GB month came from
 * it. So these checks assert the poster ELEMENT and the box it reserves, never
 * that the pixels arrived. Asserting a load here would either bill the account
 * or fail forever, and a guard that needs the network to pass is a guard that
 * reports the network.
 */
import { chromium } from 'playwright';
import { seededContext, SEED } from './lib/renderHarness.mjs';
import { CHAPTERS, chapterProgressKey } from '../src/lib/studioTour.js';

const BASE = process.env.CAPTURE_BASE_URL || 'http://localhost:4222';
const results = [];
const check = (name, ok, detail) => {
  results.push(ok);
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};

/** The fixture seed with the wedding's guidanceState replaced. */
function seedWithGuidance(guidanceState) {
  return {
    ...SEED,
    WeddingDetails: (SEED.WeddingDetails || []).map((w, i) => (i === 0 ? { ...w, guidanceState } : w)),
  };
}

const FRESH = seedWithGuidance({ tourSeenAt: null, dismissed: [] });
// Three chapters done, so resume must land on the fourth.
const HALF_DONE = seedWithGuidance({
  tourSeenAt: null,
  dismissed: CHAPTERS.slice(0, 3).map((c) => chapterProgressKey(c.key)),
});

const open = async (browser, { width, height, seed, path = '/Guests', reducedMotion }) => {
  const ctx = await seededContext(browser, { width, height, seed });
  const page = await ctx.newPage();
  if (reducedMotion) await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(6500);
  return { ctx, page };
};

const browser = await chromium.launch();

for (const [w, h] of [[390, 844], [1440, 950]]) {
  console.log(`\n  ${w}px:`);

  // ── 1. the first-run takeover ────────────────────────────────────────────
  {
    const { ctx, page } = await open(browser, { width: w, height: h, seed: FRESH });
    const offer = page.locator('[data-studio-tour="offer"]');
    check('  the takeover opens on a wedding that has not seen the tour',
      (await offer.count()) === 1, `${await offer.count()} found`);
    const text = await page.evaluate(() => document.body.innerText || '');
    check('  it offers the tour with its total time',
      /Take the tour, about \d+ minutes|Take the tour, about a minute/.test(text),
      (text.match(/Take the tour[^\n]*/) || ['not found'])[0]);
    check('  and offers Later beside it', /\bLater\b/.test(text), 'no third option');
    // NO NAGGING. Owner ruling: Later writes tourSeenAt the same as finishing.
    await page.getByRole('button', { name: 'Later' }).click().catch(() => {});
    await page.waitForTimeout(1200);
    check('  Later closes it', (await page.locator('[data-studio-tour]').count()) === 0, 'gone');
    await ctx.close();
  }

  // ── 2. taking the tour from the takeover ─────────────────────────────────
  {
    const { ctx, page } = await open(browser, { width: w, height: h, seed: FRESH });
    await page.getByRole('button', { name: /Take the tour/ }).click().catch(() => {});
    await page.waitForTimeout(1200);
    check('  taking the tour opens the chapters',
      (await page.locator('[data-studio-tour="takeover"]').count()) === 1, 'takeover mode');
    check('  the rail lists all nine',
      (await page.locator('[data-tour-chapter]').count()) === CHAPTERS.length,
      `${await page.locator('[data-tour-chapter]').count()} of ${CHAPTERS.length}`);
    // IT STARTS AT THE BEGINNING on a fresh wedding.
    const body = await page.evaluate(() => document.body.innerText || '');
    check('  and starts at the welcome chapter', /1 of 9/.test(body), 'first chapter');
    check('  with the couple\'s own name in it', /Welcome to your studio, Ada & Alan\./.test(body),
      'personalized from data already loaded');

    // ── keyboard: arrows move, Escape closes ───────────────────────────────
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(700);
    check('  ArrowRight moves to the next chapter',
      /2 of 9/.test(await page.evaluate(() => document.body.innerText || '')), 'chapter 2');
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(700);
    check('  ArrowLeft moves back',
      /1 of 9/.test(await page.evaluate(() => document.body.innerText || '')), 'chapter 1');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(900);
    check('  Escape closes the tour',
      (await page.locator('[data-studio-tour]').count()) === 0, 'closed');
    await ctx.close();
  }

  // ── 3. resume from a half-finished tour ──────────────────────────────────
  {
    const { ctx, page } = await open(browser, { width: w, height: h, seed: HALF_DONE, path: '/DailyUpdate' });
    // The sidebar entry resumes; the takeover is also up on this seed, so it is
    // dismissed first to reach the sidebar underneath.
    if (await page.locator('[data-studio-tour="offer"]').count()) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(900);
    }
    // AT 390 THE SIDEBAR IS A SHEET, and the desktop row is hidden-but-present
    // (hidden lg:flex). The first version of this check clicked the hidden row,
    // which did nothing, and reported a resume failure that was the guard's.
    if (w <= 720) {
      await page.getByRole('button', { name: 'Open menu' }).click().catch(() => {});
      await page.waitForTimeout(1200);
    }
    const entry = page.getByRole('button', { name: 'Studio tour' }).locator('visible=true').first();
    const viaSidebar = await entry.count();
    check('  the sidebar has a Studio tour entry', viaSidebar > 0, `${viaSidebar} found`);
    if (viaSidebar > 0) {
      await entry.click().catch(() => {});
      await page.waitForTimeout(1300);
      const body = await page.evaluate(() => document.body.innerText || '');
      check('  it resumes at the first unfinished chapter', /4 of 9/.test(body),
        (body.match(/\d of 9/) || ['none'])[0]);
      // THREE, NOT FOUR. A chapter is marked when the couple leaves it, so the
      // one they are reading is not counted as done. The first version of this
      // expected four and was reporting the product's own oddity as correct.
      check('  and the rail shows three already done, not the one being read',
        /3 of 9 done/.test(body) || w <= 720,
        w <= 720 ? 'the narrow rail is a strip with no count' : (body.match(/\d of 9 done/) || ['none'])[0]);
    }
    await ctx.close();
  }

  // ── 4. the "?" lands on the page's own chapter ───────────────────────────
  for (const [path, expected, label] of [
    ['/Guests', '4 of 9', 'Guests opens the guests chapter'],
    ['/Music', '5 of 9', 'Music opens the style chapter'],
    ['/studio', '6 of 9', 'the studio opens the design chapter'],
  ]) {
    const { ctx, page } = await open(browser, { width: w, height: h, path });
    const q = page.locator('[data-tour-target="whats-here-control"]');
    if ((await q.count()) === 0) {
      check(`  ${label}`, false, 'no question mark on this page');
      await ctx.close();
      continue;
    }
    await q.first().click().catch(() => {});
    await page.waitForTimeout(1300);
    const body = await page.evaluate(() => document.body.innerText || '');
    check(`  ${label}`, body.includes(expected), (body.match(/\d of 9/) || ['none'])[0]);
    await ctx.close();
  }

  // ── 5. reduced motion shows the poster and does not autoplay ─────────────
  {
    const { ctx, page } = await open(browser, { width: w, height: h, reducedMotion: true });
    await page.locator('[data-tour-target="whats-here-control"]').first().click().catch(() => {});
    await page.waitForTimeout(1300);
    const posters = await page.locator('[data-tour-media="poster"]').count();
    const videos = await page.locator('[data-tour-media="video"]').count();
    check('  reduced motion renders the poster frame', posters === 1, `${posters} poster(s)`);
    check('  and mounts no playing video', videos === 0, `${videos} video(s)`);
    // THE BOX IS RESERVED EVEN THOUGH THE IMAGE IS BLOCKED. The harness refuses
    // Cloudinary, so this asserts the layout the poster holds, not its pixels.
    const box = await page.locator('[data-tour-media="poster"]').first().boundingBox();
    const ratio = box ? box.width / box.height : 0;
    check('  the poster reserves a 16 by 9 box', !!box && Math.abs(ratio - 16 / 9) < 0.1,
      box ? `${Math.round(box.width)} by ${Math.round(box.height)}, ratio ${ratio.toFixed(2)}` : 'no box');
    await ctx.close();
  }

  // ── 6. it fits the viewport ──────────────────────────────────────────────
  {
    const { ctx, page } = await open(browser, { width: w, height: h });
    await page.locator('[data-tour-target="whats-here-control"]').first().click().catch(() => {});
    await page.waitForTimeout(1300);
    const fits = await page.evaluate(() => ({
      doc: document.documentElement.scrollWidth, win: window.innerWidth,
    }));
    check('  the page does not scroll sideways with the tour open',
      fits.doc <= fits.win, `${fits.doc} <= ${fits.win}`);
    const panel = await page.locator('[data-studio-tour]').first().boundingBox();
    check('  and the panel stays inside the viewport',
      !!panel && panel.width <= fits.win + 1, panel ? `${Math.round(panel.width)}px` : 'no box');
    await ctx.close();
  }
}

await browser.close();
const failed = results.filter((r) => !r).length;
console.log(`\n  ${results.length - failed}/${results.length} checks passed`);
if (failed) { console.log(`  ${failed} FAILED`); process.exit(1); }
