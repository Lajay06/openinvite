/**
 * scripts/test-guest-essentials-reachable.mjs
 *
 * A GUEST MUST ALWAYS BE ABLE TO FIND THE DATE AND A WAY TO REPLY.
 *
 * WHY THIS IS A REACHABILITY CHECK AND NOT A REMOVAL CHECK. When the date and
 * the RSVP left the hero, the obvious test was "are they gone from the hero" —
 * and that test PASSES on a site where they exist nowhere at all. The question
 * that finds the hole is "where can a guest still find them".
 *
 * THE CASE IT COVERS is the one that caught us: a couple who has switched off
 * every page they are allowed to. WBLeftPanel protected `home` alone, so
 * `celebration` and `rsvp` could both be disabled — and the home page's only
 * other date surface is an optional block.
 *
 * Two enforcement points, tested through the guest site because that is where
 * the guarantee has to hold: the builder refuses to switch them off, and the
 * guest site unions them in at render for records saved before the guard
 * existed.
 */
/* eslint-env browser */
/* global document */
import { chromium } from 'playwright';
import { seededContext, PUBLISHED_WEDDING, dismissEntrance } from './lib/renderHarness.mjs';

const BASE = process.env.CAPTURE_BASE_URL || 'http://localhost:4173';
const CONTROL = process.argv.includes('--control');

// The hostile case: a stored record with everything the couple could turn off,
// turned off. `--control` additionally strips the guarantee to prove the probe
// fails when the guarantee is absent.
const CASES = [
  { label: 'only home enabled',        enabledPages: ['home'] },
  { label: 'home + our-story',         enabledPages: ['home', 'our-story'] },
  { label: 'empty list',               enabledPages: [] },
  { label: 'field absent entirely',    enabledPages: undefined },
];

console.log('\n  A guest must be able to reach the date and a way to reply\n');
const browser = await chromium.launch();
let failures = 0;

for (const c of CASES) {
  const wd = { ...PUBLISHED_WEDDING };
  if (c.enabledPages === undefined) delete wd.enabledPages; else wd.enabledPages = c.enabledPages;

  const ctx = await seededContext(browser, { width: 390, height: 1000 });
  await ctx.route(
    (u) => { try { return new URL(typeof u === 'string' ? u : u.href).pathname.startsWith('/api/wedding-by-slug'); } catch { return false; } },
    (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(wd) }));
  await dismissEntrance(ctx);
  const page = await ctx.newPage();
  // The bare /w/:slug is the LANDING view and carries no page nav — it is the
  // curtain, not the site. The nav lives on the pages behind it, so that is
  // where reachability has to be measured. Measuring the landing instead
  // reported every page unreachable, which was the probe's error, not the
  // product's.
  //
  // THE VANTAGE POINT MUST BE A PAGE THE COUPLE CANNOT TURN OFF.
  // This used /our-story, which worked only because a DISABLED page still
  // rendered — the defect that unpublished-pages-are-not-reachable closed.
  // Two of the four cases here disable our-story, so once an unavailable page
  // began refusing, the probe was reading the nav of a page that correctly
  // no longer existed and reporting itself blind.
  //
  // /celebration is guaranteed by withAlwaysOnPages, so it is present in every
  // case this probe constructs — including the hostile ones.
  await page.goto(`${BASE}/w/${PUBLISHED_WEDDING.slug}/celebration`, { waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(1100);

  // Open the mobile menu: at 390 the nav is behind a hamburger, and its entries
  // are <button onClick={navigate}> — NOT <a href>. Reading hrefs found nothing
  // and reported every page unreachable, which was the probe's third error on
  // this measurement, not the product's.
  const burger = page.locator('button:has(svg)').first();
  if (await burger.count()) { await burger.click().catch(() => {}); await page.waitForTimeout(450); }
  // The nav collapses its tail into a "More" control, so RSVP can sit one tap
  // deeper. Reachable is reachable — but it has to be opened to be counted.
  // Clicked in-page by text. getByRole did not match it — the button's
  // accessible name is not its label — and a locator that silently matches
  // nothing reads exactly like a control that is not there.
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')]
      .find(x => (x.textContent || '').trim().toLowerCase() === 'more');
    if (b) b.click();
  });
  await page.waitForTimeout(450);

  const nav = await page.evaluate((strip) => {
    // CONTROL: remove the two nav entries the guarantee adds, simulating a
    // build without it, and assert the probe notices.
    if (strip) {
      for (const b of document.querySelectorAll('button')) {
        const t = (b.textContent || '').trim().toLowerCase();
        if (t === 'rsvp' || t === 'celebration') b.remove();
      }
    }
    const labels = [...document.querySelectorAll('button')]
      .map(b => (b.textContent || '').trim().toLowerCase()).filter(Boolean);
    return {
      rsvp: labels.some(l => l === 'rsvp'),
      celebration: labels.some(l => l === 'celebration'),
      // SELF-CHECK: a page that is genuinely enabled must be visible to the
      // same selector. If this is false the probe is not reading the nav at
      // all, and its negatives mean nothing.
      canSeeNav: labels.some(l => l === 'our story' || l === 'home'),
      labels: labels.slice(0, 10),
    };
  }, CONTROL);

  if (!nav.canSeeNav) {
    console.log(`  ❌ ${c.label.padEnd(26)} PROBE BLIND — nav not readable; saw ${JSON.stringify(nav.labels)}`);
    failures++; await ctx.close(); continue;
  }

  const ok = nav.rsvp && nav.celebration;
  if (!ok) failures++;
  console.log(`  ${ok ? '✅' : '❌'} ${c.label.padEnd(26)} reply:${nav.rsvp ? 'reachable' : 'UNREACHABLE'}  date:${nav.celebration ? 'reachable' : 'UNREACHABLE'}`);
  await ctx.close();
}
await browser.close();

console.log(`\n  ${CASES.length - failures}/${CASES.length} stored configurations keep both reachable\n`);
if (CONTROL) {
  if (failures > 0) { console.log('  CONTROL PASSED — without the guarantee the probe fails.\n'); process.exit(0); }
  console.log('  CONTROL FAILED — the probe did not notice the guarantee being removed.\n'); process.exit(1);
}
process.exit(failures ? 1 : 0);
