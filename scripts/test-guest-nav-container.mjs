/* global document, getComputedStyle */
/**
 * THE GUEST NAV FOLLOWS THE FRAME IT IS DRAWN IN, NOT THE BROWSER WINDOW.
 *
 * The builder renders the guest site inside a 390px frame while the window is
 * 1440. A media query reads the WINDOW, so the phone preview painted the
 * desktop navigation — the frame was the right width and the site inside it
 * was laid out for a screen four times wider. A couple checking their site on
 * phone was shown something no guest will ever see.
 *
 * ── THREE SURFACES, AND THE THIRD IS THE ONE THAT COULD REGRESS ─────────────
 *
 * The fix is a container query, added BESIDE the viewport classes rather than
 * replacing them. So this checks all three states:
 *
 *   canvas at 390 inside a 1440 window   -> hamburger   (the defect)
 *   full-page preview at 390, same       -> hamburger   (the second surface)
 *   a real 390 viewport, no container    -> hamburger   (must not regress)
 *
 * and the desktop case, because a container query that fired at every width
 * would give every guest a hamburger on a laptop and pass all three above.
 *
 * Usage: npm run test:guest-nav-container  (needs a server; CAPTURE_BASE_URL)
 */
import { chromium } from 'playwright';
import { seededContext, dismissEntrance, SEED, PUBLISHED_WEDDING } from './lib/renderHarness.mjs';

const BASE = process.env.CAPTURE_BASE_URL || 'http://localhost:5173';

const results = [];
const check = (name, ok, detail) => {
  results.push(ok);
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};

/** What the nav is actually showing: the links row, or the hamburger. */
const navShape = (page) => page.evaluate(() => {
  const nav = document.querySelector('nav');
  if (!nav) return null;
  const painted = (el) => { if (!el) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const desktop = nav.querySelector('.oi-nav-desktop');
  const burger = nav.querySelector('.oi-nav-mobile');
  return {
    width: Math.round(nav.getBoundingClientRect().width),
    desktopShown: painted(desktop) && getComputedStyle(desktop).display !== 'none',
    burgerShown: painted(burger) && getComputedStyle(burger).display !== 'none',
  };
});

console.log('\n  The guest nav, against the frame it is in:\n');

const browser = await chromium.launch();

// ── the builder, window 1440, frame 390 ─────────────────────────────────────
{
  const ctx = await seededContext(browser, { width: 1440, height: 900, seed: SEED });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/website-editor`, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(5000);

  // PRESENCE BEFORE PROPERTIES: a canvas with no nav has no desktop row to
  // hide, and would pass every assertion below by rendering nothing.
  const desk = await navShape(page);
  check('the canvas renders the guest nav', !!desk, desk ? `${desk.width}px wide` : 'no nav');
  check('  at full width it shows the links, not a hamburger',
    !!desk && desk.desktopShown && !desk.burgerShown,
    desk ? `desktop=${desk.desktopShown} burger=${desk.burgerShown}` : 'no nav');

  await page.locator('button:has(svg.lucide-smartphone)').filter({ hasNotText: /\S/ }).first().click().catch(() => {});
  await page.waitForTimeout(1200);
  const phone = await navShape(page);
  check('  set to phone, the frame is 390', !!phone && phone.width === 390, phone ? `${phone.width}px` : 'no nav');
  check('  and the nav inside it collapses to the hamburger',
    !!phone && phone.burgerShown && !phone.desktopShown,
    phone ? `desktop=${phone.desktopShown} burger=${phone.burgerShown}` : 'no nav');

  // The full-page preview is a second surface with its own frame.
  await page.getByRole('button', { name: /^Preview$/ }).first().click().catch(() => {});
  await page.waitForTimeout(2500);
  await page.getByRole('button', { name: 'Mobile' }).first().click().catch(() => {});
  await page.waitForTimeout(1500);
  const full = await navShape(page);
  check('the full-page preview at phone width does the same',
    !!full && full.burgerShown && !full.desktopShown,
    full ? `${full.width}px desktop=${full.desktopShown} burger=${full.burgerShown}` : 'no nav');
  await ctx.close();
}

// ── a real phone, where no container exists and nothing must change ─────────
{
  const ctx = await seededContext(browser, { width: 390, height: 844, seed: SEED });
  await dismissEntrance(ctx);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/w/${PUBLISHED_WEDDING.slug}`, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(4000);
  const real = await navShape(page);
  check('a real 390 viewport still gets the hamburger',
    !!real && real.burgerShown && !real.desktopShown,
    real ? `desktop=${real.desktopShown} burger=${real.burgerShown}` : 'no nav');
  await ctx.close();
}

// ── and a real desktop, which the container query must not take over ────────
{
  const ctx = await seededContext(browser, { width: 1440, height: 900, seed: SEED });
  await dismissEntrance(ctx);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/w/${PUBLISHED_WEDDING.slug}`, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(4000);
  const wide = await navShape(page);
  check('a real 1440 viewport still gets the links',
    !!wide && wide.desktopShown && !wide.burgerShown,
    wide ? `desktop=${wide.desktopShown} burger=${wide.burgerShown}` : 'no nav');
  await ctx.close();
}

await browser.close();

const passed = results.filter(Boolean).length;
console.log(`\n  ${passed}/${results.length} ${passed === results.length ? 'ALL PASS' : 'FAILURES PRESENT'}\n`);
process.exit(passed === results.length ? 0 : 1);
