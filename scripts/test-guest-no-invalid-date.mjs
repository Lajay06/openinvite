/**
 * scripts/test-guest-no-invalid-date.mjs
 *
 * THE PROBE FOR A DEFECT THAT SHIPPED TO EVERY GUEST OF EVERY WEDDING.
 * The celebration page rendered `Invalid Date` as a day header in all 20
 * universes: `weddingDate` is stored as a FULL ISO timestamp, and the code
 * appended 'T00:00:00' to it unconditionally.
 *
 * WHY A RENDER PROBE AND NOT A UNIT TEST. The bug was invisible to source
 * review — the call sat inside a try/catch and READ as defended. It could not
 * fire, because toLocaleDateString RETURNS the string "Invalid Date" rather
 * than throwing. Only rendering the page shows the text a guest actually gets.
 *
 * THE SEED MUST CARRY A FULL ISO TIMESTAMP for this to prove anything — that is
 * the shape that triggers it. PUBLISHED_WEDDING.weddingDate already does
 * (iso(300)), which is why the harness reproduced it once anyone looked.
 *
 * PRE-MORTEM — what would make this pass while the defect exists:
 *   · The page renders its empty state, so there are no day headers at all.
 *     Guarded: the run asserts the seeded event titles are present first, and
 *     fails the route rather than skipping it.
 *   · Only one universe is checked. Guarded: all 20 are, since the day header
 *     is rendered by a different branch per layout.
 */
/* eslint-env browser */
/* global document */  // used inside page.evaluate(), which runs in the browser
import { chromium } from 'playwright';
import { seededContext, PUBLISHED_WEDDING, dismissEntrance } from './lib/renderHarness.mjs';
import { UNIVERSE_CONFIGS } from '../src/lib/websiteThemes.js';

const BASE = process.env.CAPTURE_BASE_URL || 'http://localhost:4173';
const SLUG = PUBLISHED_WEDDING.slug;
const BAD = /Invalid Date|NaN undefined|undefined NaN/;

console.log('\n  Guest pages must never render an unparsed date\n');
if (String(PUBLISHED_WEDDING.weddingDate).length <= 10) {
  console.log('  FATAL: the seed carries a date-only weddingDate, which cannot');
  console.log('  reproduce this defect. The probe would pass vacuously.');
  process.exit(1);
}

const browser = await chromium.launch();
let failures = 0, checked = 0;
for (const uni of Object.keys(UNIVERSE_CONFIGS)) {
  const ctx = await seededContext(browser, { width: 390, height: 1200 });
  await ctx.route(
    (u) => { try { return new URL(typeof u === 'string' ? u : u.href).pathname.startsWith('/api/wedding-by-slug'); } catch { return false; } },
    (r) => r.fulfill({ status: 200, contentType: 'application/json',
                       body: JSON.stringify({ ...PUBLISHED_WEDDING, activeUniverse: uni }) }));
  await dismissEntrance(ctx);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/w/${SLUG}/celebration`, { waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(600);
  const text = await page.evaluate(() =>
    (document.querySelector('.wb-guest-root') || document.body).innerText || '');

  // PRESENCE BEFORE PROPERTIES: no day headers means nothing was under test.
  if (!/Ceremony|Reception/i.test(text)) {
    console.log(`  ❌ ${uni} — PRESENCE FAILED (no seeded events rendered); not measured`);
    failures++; await ctx.close(); continue;
  }
  checked++;
  const hit = text.match(BAD);
  if (hit) { console.log(`  ❌ ${uni} — renders ${JSON.stringify(hit[0])}`); failures++; }
  else console.log(`  ✅ ${uni}`);
  await ctx.close();
}
await browser.close();
console.log(`\n  ${checked}/${Object.keys(UNIVERSE_CONFIGS).length} universes measured, ${failures} failing\n`);
process.exit(failures ? 1 : 0);
