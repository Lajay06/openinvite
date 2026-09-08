/* global document, getComputedStyle */
/**
 * THE BUILDER'S CUSTOM PAGES: the order they were given, the brand's own
 * button, and an affordance you can see without hunting for it.
 *
 * Three of the four things the owner reported. The fourth — adding blocks to
 * a custom page — is NOT here, and deliberately: it cannot be built without a
 * schema addition, and a guard asserting a control that silently drops its
 * writes would be worse than no guard. See the PR body.
 *
 * Usage: npm run test:builder-custom-pages  (needs a server; CAPTURE_BASE_URL)
 */
import { chromium } from 'playwright';
import { seededContext, SEED } from './lib/renderHarness.mjs';

const BASE = process.env.CAPTURE_BASE_URL || 'http://localhost:5173';

const results = [];
const check = (name, ok, detail) => {
  results.push(ok);
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};

/**
 * A wedding with two custom pages whose ARRAY order is deliberately the
 * opposite of the couple's arranged order. If the panel reads the array, the
 * rows come out backwards — which is exactly what the couple saw.
 */
const CUSTOM = [
  { id: 'welcome-drinks', name: 'Welcome drinks', slug: 'welcome-drinks', template: 'blank' },
  { id: 'brunch', name: 'Day-after brunch', slug: 'brunch', template: 'blank' },
];
const SEEDED = {
  ...SEED,
  WeddingDetails: [{
    ...SEED.WeddingDetails[0],
    activeUniverse: 'paris',
    customPages: CUSTOM,                                   // catalog order: drinks, brunch
    enabledPages: ['home', 'our-story', 'celebration', 'rsvp', 'brunch', 'welcome-drinks'],
  }],                                                      // arranged order: brunch BEFORE drinks
};

console.log('\n  Custom pages in the builder:\n');

const browser = await chromium.launch();

{
  const ctx = await seededContext(browser, { width: 1440, height: 950, seed: SEEDED });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/website-editor`, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(6000);

  // ── (c) THE ARRANGED ORDER IS WHAT RENDERS ──────────────────────────────
  const order = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('span')]
      .map((s) => (s.textContent || '').trim())
      .filter((t) => t === 'Welcome drinks' || t === 'Day-after brunch');
    return rows;
  });
  check('both custom pages render', order.length === 2, order.join(' · ') || '(none)');
  // enabledPages puts brunch first. The customPages array puts drinks first.
  // Reading the array is the bug; reading enabledPages is the fix.
  check('they render in the couple’s arranged order, not the catalog’s',
    order[0] === 'Day-after brunch' && order[1] === 'Welcome drinks',
    order.join(' → '));

  // ── (d) THE ADD-BLOCK AFFORDANCE IS PAINTED WITHOUT HOVER ───────────────
  //
  // Measured with the cursor parked far away, because the whole complaint is
  // that it only appeared under the pointer.
  await page.mouse.move(5, 5);
  await page.waitForTimeout(400);
  const insert = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')].filter((b) => b.getAttribute('aria-label') === 'Add a section');
    if (btns.length === 0) return { count: 0 };
    const painted = btns.map((b) => {
      const cs = getComputedStyle(b);
      const r = b.getBoundingClientRect();
      return { opacity: parseFloat(cs.opacity), events: cs.pointerEvents, w: Math.round(r.width) };
    });
    return { count: btns.length, painted, minOpacity: Math.min(...painted.map((p) => p.opacity)) };
  });
  check('every block boundary offers an add control', insert.count > 0, `${insert.count} found`);
  check('  and it is painted with no hover anywhere near it',
    insert.count > 0 && insert.minOpacity > 0,
    insert.count ? `min opacity ${insert.minOpacity}` : 'none');
  check('  and it can be clicked at rest',
    insert.count > 0 && insert.painted.every((p) => p.events !== 'none'),
    'pointer-events on');

  // ── (b) NO GRADIENT ON THE BUILDER'S BUTTONS ────────────────────────────
  await page.getByText('New page', { exact: true }).first().click().catch(() => {});
  await page.waitForTimeout(1200);
  // FILL IT FIRST. The button is #DDD while the form is empty — measuring the
  // disabled state and calling it "not the brand colour" would be the guard
  // reporting a bug that is actually correct behaviour.
  await page.locator('input').first().fill('Rehearsal dinner').catch(() => {});
  await page.waitForTimeout(600);
  const cta = await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((x) => (x.textContent || '').trim() === 'Create page');
    if (!b) return null;
    const cs = getComputedStyle(b);
    return { bg: cs.backgroundImage, colour: cs.backgroundColor, radius: cs.borderTopLeftRadius, weight: cs.fontWeight, h: Math.round(b.getBoundingClientRect().height) };
  });
  check('the Create page button exists', !!cta, cta ? 'found' : 'not found — did the modal open?');
  if (cta) {
    check('  it carries no gradient', cta.bg === 'none', cta.bg);
    check('  it is the brand strawberry', cta.colour === 'rgb(224, 53, 83)', cta.colour);
    check('  and it wears the builder’s pill, not a 6px corner',
      parseFloat(cta.radius) >= 99 && cta.weight === '600', `${cta.radius} / ${cta.weight}`);
  }
  await ctx.close();
}

await browser.close();

const passed = results.filter(Boolean).length;
console.log(`\n  ${passed}/${results.length} ${passed === results.length ? 'ALL PASS' : 'FAILURES PRESENT'}\n`);
process.exit(passed === results.length ? 0 : 1);
