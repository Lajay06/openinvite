/* global document */
/**
 * THE TRAIL SAYS WHERE IT GOES, AND IT IS ON SCREEN.
 *
 * Two separate properties, and the reason both are here is that each hides
 * the other's failure. A trail that renders with the wrong words looks
 * correct in a screenshot; a trail with the right words behind an overlay
 * looks correct in the DOM. #701 was reported as having removed the
 * breadcrumb — it had not, it had added one — and the real defect was a
 * single word: the middle crumb said "My universe" while its onClick was
 * onBack, which returns to the WALL. On the current universe's own page it
 * read as a link back to the page you were already on.
 *
 * SO PAINTED-NESS IS MEASURED, NOT ASSUMED. getBoundingClientRect gives a
 * positive box even for something covered by an overlay, so elementFromPoint
 * at the box's centre has to land inside the nav as well. That is the check
 * that would have caught the failure the report described, had it been real.
 *
 * BOTH ROUTES. The current universe and a non-current one reach the same
 * component by different paths (isCurrent changes the hero's control, and
 * the current one is what the "Your current universe" chip opens). A guard
 * that only visits one cannot see a conditional that skips the other.
 *
 * Usage: npm run test:universe-breadcrumb  (needs a server; CAPTURE_BASE_URL)
 */
import { chromium } from 'playwright';
import { seededContext, SEED } from './lib/renderHarness.mjs';

const BASE = process.env.CAPTURE_BASE_URL || 'http://localhost:5173';

/** The trail, exactly. A crumb that drifts is the defect this exists for. */
const EXPECTED = (name) => ['Design studio', 'All universes', name];

const results = [];
const check = (name, ok, detail) => {
  results.push(ok);
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};

/** Opens one universe's detail page and reads the trail off the rendered DOM. */
async function readTrail(browser, { width, activeUniverse, open }) {
  const seed = { ...SEED, WeddingDetails: [{ ...SEED.WeddingDetails[0], activeUniverse }] };
  const ctx = await seededContext(browser, { width, height: 1000, seed });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/studio/universe`, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(4000);
  const opened = await page.getByText(new RegExp(`^${open}$`)).first().click().then(() => true).catch(() => false);
  await page.waitForTimeout(3500);
  const out = await page.evaluate(() => {
    const nav = document.querySelector('nav[aria-label="Breadcrumb"]');
    if (!nav) return { present: false };
    const r = nav.getBoundingClientRect();
    const cx = Math.round(r.x + r.width / 2), cy = Math.round(r.y + r.height / 2);
    const hit = document.elementFromPoint(cx, cy);
    return {
      present: true,
      // Text of each crumb, in order, separators excluded — the '›' spans are
      // aria-hidden decoration, not part of the trail.
      crumbs: [...nav.children]
        .filter((el) => el.getAttribute('aria-hidden') !== 'true')
        .map((el) => (el.innerText || '').trim()),
      rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
      painted: !!hit && (hit === nav || nav.contains(hit)),
      // A lone back pill must never sit beside the trail.
      lonePills: [...document.querySelectorAll('button')]
        .filter((b) => /←\s*All universes/i.test(b.innerText || '')).length,
    };
  });
  await ctx.close();
  return { opened, ...out };
}

console.log('\n  The universe breadcrumb — right words, on screen:\n');

const browser = await chromium.launch();

// kyoto is the couple's own universe here, so opening kyoto is the
// current-universe route and opening paris is a non-current one.
const ROUTES = [
  { label: 'current universe (kyoto)',     open: 'Kyoto', name: 'Kyoto' },
  { label: 'a non-current universe (Paris)', open: 'Paris', name: 'Paris' },
];

for (const width of [1440, 1998]) {
  for (const route of ROUTES) {
    const t = await readTrail(browser, { width, activeUniverse: 'kyoto', open: route.open });
    const where = `${width}px · ${route.label}`;

    // PRESENCE BEFORE PROPERTIES: without this, every assertion below passes
    // by measuring nothing when the page fails to open.
    check(`${where} — the detail page opened`, t.opened && t.present,
      t.present ? 'nav present' : 'no breadcrumb in the DOM');
    if (!t.present) continue;

    check('  the trail reads exactly Design studio › All universes › <name>',
      JSON.stringify(t.crumbs) === JSON.stringify(EXPECTED(route.name)),
      t.crumbs.join(' › '));
    check('  it has a real box', t.rect.w > 0 && t.rect.h > 0,
      `${t.rect.w}x${t.rect.h} at ${t.rect.x},${t.rect.y}`);
    check('  and something of it is actually under the cursor at its centre',
      t.painted, t.painted ? 'elementFromPoint lands inside the nav' : 'covered — the trail is in the DOM but not on screen');
    check('  no lone "← All universes" pill beside it', t.lonePills === 0, `${t.lonePills} found`);
  }
}

await browser.close();

const passed = results.filter(Boolean).length;
console.log(`\n  ${passed}/${results.length} ${passed === results.length ? 'ALL PASS' : 'FAILURES PRESENT'}\n`);
process.exit(passed === results.length ? 0 : 1);
