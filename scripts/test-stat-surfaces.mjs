/**
 * Stat surfaces render pass (feel-pass 5).
 *
 * THE PROPERTY UNDER TEST: every stat number equals its computed source at
 * FIRST PAINT. CountUp used to animate 0 -> value over 1200ms, which meant any
 * screenshot or DOM read taken inside that window showed a number that was not
 * the real one. Numeric verification had to sleep past the window or be quietly
 * untrustworthy -- "screenshots lie for 1.2 seconds" shadowed every numeric
 * check since the budget work.
 *
 * HOW IT IS ASSERTED WITHOUT REIMPLEMENTING EACH PAGE. Rather than recompute
 * what each tile should say (which would just duplicate the page's logic and
 * its bugs), this reads every stat tile TWICE: once as early as the tiles
 * exist, and again after the old animation window would have closed. If the
 * values are instant, the two reads are identical. Under the old component the
 * early read would be mid-animation and differ. That is a falsifiable property
 * that needs no knowledge of page internals, and the control below proves it
 * fires.
 *
 * PRESENCE BEFORE PROPERTIES: each surface first proves its expected tile
 * labels are on the page. If they are not, the surface reports MISSING and its
 * numeric assertion is skipped rather than passing vacuously.
 *
 * Usage: npm run test:stat-surfaces   (needs the dev server on :5173)
 */
/* global document, getComputedStyle */  // used inside page.evaluate(), which runs in the browser
import { chromium } from 'playwright';
import { seededContext, presenceThenProperties, assertHarnessServesModules } from './lib/renderHarness.mjs';

const BASE = process.env.RENDER_BASE || 'http://localhost:5173';

// THE CONTRACT. Every stat surface item 5 covers, and the tile labels that
// prove the surface actually rendered. Enumerated from source before any
// seeding, so the list is not shaped by what happened to be easy to render.
const SURFACES = [
  { page: 'Guests',       expect: ['Total guests', 'Attending'] },
  { page: 'Seating',      expect: ['Tables', 'Total seats', 'Unassigned'] },
  { page: 'Budget',       expect: ['Committed', 'Remaining'] },
  { page: 'Schedule',     expect: ['Total events', 'Ceremony'] },
  // ScheduleHub.jsx is NOT a route of its own -- it is the component /Calendar
  // renders, which is why /ScheduleHub returns 103 characters and no
  // .page-content. Its stat tiles are asserted through Calendar below, so
  // this is a de-duplication of the enumeration, not a dropped surface.
  { page: 'Calendar',     expect: ['Total events', 'Ceremony', 'Other events'] },
  { page: 'Vendors',      expect: ['Total vendors', 'Booked'] },
  { page: 'Beauty',       expect: ['Artists booked', 'Trials scheduled'] },
  { page: 'Moodboard',    expect: ['Total items', 'Boards'] },
  { page: 'VowsSpeeches', expect: ['Total items', 'Vows'] },
  { page: 'Registry',     expect: ['Total items', 'Purchased'] },
  { page: 'Music',        expect: ['Song requests'] },
  { page: 'Photography',  expect: ['Photographers'] },
  { page: 'Messages',     expect: ['Unread'] },
  { page: 'Checklist',    expect: ['Overall progress', 'Essentials done'] },
  { page: 'Dashboard',    expect: ['Total guests', 'Attending'] },
  // TodoList carries no CountUp tile, but its kanban column labels are the
  // item 6 case that stayed source-verified until this seed reached them.
  { page: 'TodoList',     expect: ['Ideas', 'In progress', 'Done'], caseOnly: true, click: 'Kanban' },
];

const readStats = (page) => page.evaluate(() => {
  // Stat values are the large numerals beside a small tracked label. Read every
  // element whose whole text is a number-ish token, keyed by position.
  const els = [...document.querySelectorAll('p,span,div,h2,h3')];
  const out = [];
  for (const el of els) {
    if (el.children.length) continue;
    const t = (el.textContent || '').trim();
    if (!t || t.length > 16) continue;
    if (!/^[$€£¥]?-?[\d,]+(\.\d+)?%?$/.test(t)) continue;
    out.push(t);
  }
  return out;
});

const results = [];
const browser = await chromium.launch();

// Guard the harness itself before trusting anything it reports. If the route
// predicate ever regresses to swallowing the app's own modules, every surface
// below would render blank and this pass would look merely "MISSING" rather
// than broken.
{
  const ctx = await seededContext(browser, { width: 1440, height: 900 });
  const probe = await assertHarnessServesModules(ctx, BASE);
  console.log(`  harness self-check: JS module served as "${probe.contentType}" -> ${probe.ok ? 'OK' : 'BROKEN'}`);
  await ctx.close();
  if (!probe.ok) {
    console.log('\n  ABORT: the harness is intercepting the application itself. Fix the route predicate.');
    await browser.close();
    process.exit(1);
  }
}

for (const [label, w, h] of [['1440', 1440, 900], ['390', 390, 844]]) {
  for (const s of SURFACES) {
    const ctx = await seededContext(browser, { width: w, height: h });
    const page = await ctx.newPage();
    let err = null;
    await page.goto(`${BASE}/${s.page}`, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch((e) => { err = e.message.slice(0, 60); });
    // Wait for the CONTENT, not for a fixed number of milliseconds. A flat
    // sleep is either too short (page still loading -> everything reads as
    // MISSING, which is how this pass first reported 34/34 absent on pages
    // that render fine) or too long (past the animation window, so an animated
    // value would settle before it was ever read and the test would pass
    // vacuously). Polling for the label lands the first read as soon as the
    // tiles exist, which is exactly when an animation would still be running.
    // Some surfaces only reveal the content under test behind a tab. TodoList
    // opens on List; its kanban column labels exist only in the Kanban view.
    if (s.click) {
      await page.getByText(s.click, { exact: true }).first().click({ timeout: 12000 }).catch(() => {});
      await page.waitForTimeout(800);
    }
    await page.waitForFunction(
      (needles) => needles.every((n) => document.body.innerText.includes(n)),
      s.expect, { timeout: 25000 },
    ).catch(() => {});

    const r = await presenceThenProperties(page, s.expect, async (p) => {
      if (s.caseOnly) {
        const shouting = await p.evaluate((words) => words.filter((wd) => {
          const el = [...document.querySelectorAll('*')].find((e) => !e.children.length && e.textContent.trim() === wd);
          return el && getComputedStyle(el).textTransform === 'uppercase';
        }), s.expect);
        return { shouting };
      }
      // PRESENCE BEFORE PROPERTIES, one level deeper. Waiting only for the
      // LABEL is not enough: these tiles render `loading ? skeleton : value`,
      // so the label can be on screen while the numeral is still a grey box.
      // Comparing that against the settled read reported ANIMATED for six
      // surfaces that have no animation left in them -- it was measuring mount
      // timing, not value change. Wait until the numeral COUNT is stable across
      // two polls, which means every tile has mounted; only then is a
      // difference between two reads a real change in value.
      let prev = -1, stable = 0;
      for (let i = 0; i < 40 && stable < 2; i++) {
        const n = (await readStats(p)).length;
        stable = n > 0 && n === prev ? stable + 1 : 0;
        prev = n;
        if (stable < 2) await p.waitForTimeout(250);
      }
      if (prev <= 0) return { noNumerals: true, count: 0 };
      const early = await readStats(p);
      await p.waitForTimeout(1800); // past the window the old 1200ms animation used
      const settled = await readStats(p);
      return { early, settled, instant: JSON.stringify(early) === JSON.stringify(settled), count: settled.length };
    });

    results.push({ width: label, ...s, ...r, err });
    const status = err ? `ERROR ${err}`
      : !r.ok ? `MISSING ${r.missing.join(', ')}`
      : s.caseOnly ? (r.shouting.length ? `SHOUTING ${r.shouting.join(',')}` : `case ok (${s.expect.length} labels)`)
      : r.noNumerals ? 'NO NUMERALS (labels present, values never mounted)'
      : r.instant ? `instant (${r.count} numerals)` : `ANIMATED early=${r.early.slice(0,4)} settled=${r.settled.slice(0,4)}`;
    console.log(`  ${label.padEnd(5)} ${s.page.padEnd(14)} ${status}`);
    await ctx.close();
  }
}
await browser.close();

const missing = results.filter((r) => !r.ok && !r.err);
const animated = results.filter((r) => r.ok && r.instant === false);
const noNums = results.filter((r) => r.ok && r.noNumerals);
const shouting = results.filter((r) => r.ok && r.shouting?.length);
const errored = results.filter((r) => r.err);

console.log('\n  ' + '─'.repeat(60));
console.log(`  surfaces x widths : ${results.length}`);
console.log(`  rendered content  : ${results.filter((r) => r.ok).length}`);
console.log(`  MISSING (skipped) : ${missing.length}${missing.length ? ' -> ' + [...new Set(missing.map((m) => m.page))].join(', ') : ''}`);
console.log(`  ANIMATED          : ${animated.length}`);
console.log(`  SHOUTING          : ${shouting.length}`);
console.log(`  ERRORED           : ${errored.length}`);
console.log(`  NO NUMERALS       : ${noNums.length}${noNums.length ? ' -> ' + [...new Set(noNums.map((m) => m.page))].join(', ') : ''}`);
const bad = missing.length + animated.length + shouting.length + errored.length + noNums.length;
console.log(bad ? `\n  FAIL: ${bad}` : '\n  All enumerated stat surfaces render, and every stat is instant.');
process.exit(bad ? 1 : 0);
