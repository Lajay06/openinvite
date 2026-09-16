/* global document, window, getComputedStyle */
/**
 * A QUIET LINE, PORTRAIT ONLY, AND EDITING NEVER STOPS.
 *
 * The Design studio is hard to use in portrait on a phone. The notice says so
 * once and gets out of the way.
 *
 * ── THE THREE THINGS THAT COULD GO WRONG ───────────────────────────────────
 *
 * It could fail to appear where it is needed; it could appear where it is not
 * (landscape, or a desktop, where it is noise); or — the one that would matter
 * — it could BLOCK. A notice that disables the editor is not a notice, it is a
 * refusal, and a couple changing one word on a train would be told to turn
 * their phone first. So the guard proves the builder is still editable while
 * the notice is on screen, in the same breath as proving the notice is there.
 *
 * ── ORIENTATION IS EMULATED, NOT INFERRED ──────────────────────────────────
 *
 * A 390x844 viewport is portrait and an 844x390 one is landscape as far as the
 * orientation media query is concerned, so the two are driven by resizing
 * rather than by any flag the page could read differently from the browser.
 */
import { chromium } from 'playwright';
import { seededContext } from './lib/renderHarness.mjs';

const BASE = process.env.CAPTURE_BASE_URL || 'http://localhost:4197';
// THE OWNER'S EXACT WORDING, character for character. It named one way out
// ("turn your phone") where there are two, and a couple at a desk was being
// told to pick up their phone and turn it.
const TEXT = 'Turn your phone sideways, or use a desktop for the best experience.';

const results = [];
const check = (name, ok, detail) => {
  results.push(ok);
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};

const browser = await chromium.launch();

const openBuilder = async (width, height) => {
  const ctx = await seededContext(browser, { width, height });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/website-editor`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(7000);
  return { ctx, page };
};

const noticeCount = (page) => page.locator('[data-rotate-notice]').count();

/**
 * NOTHING IN THE CANVAS TOOLBAR SITS ON TOP OF ANYTHING ELSE.
 *
 * The address line is absolutely positioned and the device pills are centred,
 * so neither knows the other is there. Read as geometry, at the viewport, not
 * as a class name: a rule that matched but changed nothing would pass a source
 * check and fail a person (index.css:1399 records exactly that happening to the
 * header title, where an inline style beat the selector).
 */
const toolbarOverlap = (page) => page.evaluate(() => {
  const url = document.querySelector('.wb-canvas-url');
  const pills = [...document.querySelectorAll('div')].find((d) => d.style.borderRadius === '999px' && d.querySelector('svg'));
  const vis = (el) => !!el && getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().width > 0;
  if (!vis(url)) return { urlVisible: false, overlap: null, offscreen: false };
  const A = url.getBoundingClientRect();
  const offscreen = A.right > window.innerWidth + 1 || A.left < -1;
  if (!vis(pills)) return { urlVisible: true, overlap: null, offscreen };
  const B = pills.getBoundingClientRect();
  const ox = Math.min(A.right, B.right) - Math.max(A.left, B.left);
  const oy = Math.min(A.bottom, B.bottom) - Math.max(A.top, B.top);
  return { urlVisible: true, offscreen, overlap: (ox > 0 && oy > 0) ? { x: Math.round(ox), y: Math.round(oy) } : null };
});
/** Editing is not a claim about a flag: a field takes a value, or it does not. */
const canStillEdit = async (page) => {
  await page.getByRole('button', { name: 'Content', exact: true }).first().click({ timeout: 6000 }).catch(() => {});
  await page.waitForTimeout(1200);
  const f = page.getByPlaceholder('A line to welcome your guests').first();
  if (await f.count() === 0) return { ok: false, why: 'no editable field found' };
  await f.fill('Editing still works').catch(() => {});
  const v = await f.inputValue().catch(() => '');
  return { ok: v === 'Editing still works', why: `field holds "${v}"` };
};

// ── 1. portrait phone: it is there, and editing works anyway ────────────────
{
  console.log('\n  Portrait phone, 390x844\n');
  const { ctx, page } = await openBuilder(390, 844);
  const builderUp = await page.locator('.wb-builder-header').count();
  // PRESENCE BEFORE PROPERTIES: a builder that never rendered shows no notice
  // either, and would pass every "it is hidden" check below.
  check('the builder rendered', builderUp > 0, builderUp ? 'header present' : 'no builder');
  const n = await noticeCount(page);
  check('  the notice is shown', n === 1, `${n} notice(s)`);
  const said = await page.getByText(TEXT).count();
  check('    in the words the owner asked for', said > 0, said ? TEXT : 'copy not found');
  const edit = await canStillEdit(page);
  check('    and editing is NOT disabled', edit.ok, edit.why);

  // Dismissable, and it stays dismissed.
  await page.getByRole('button', { name: 'Dismiss', exact: true }).first().click({ timeout: 6000 }).catch(() => {});
  await page.waitForTimeout(600);
  check('    and it can be dismissed', await noticeCount(page) === 0, 'gone after the close control');

  // ── AND NOTHING OVERLAPS THE CANVAS ─────────────────────────────────────
  const t = await toolbarOverlap(page);
  check('  the address line does not run off the screen', !t.offscreen && !t.urlVisible,
    t.urlVisible ? `visible at 390 wide${t.offscreen ? ', and past the right edge' : ''}` : 'hidden on a phone');
  await ctx.close();
}

// ── 2. NARROW landscape: only the orientation clause can hide it ────────────
//
// 740x360 is a phone on its side: under 768 wide AND landscape. This case is
// here because a plant that deleted the orientation clause — leaving only
// `(max-width: 767px)` — stayed GREEN against the 844-wide landscape case
// below, since 844 is already excluded by width alone. A test whose two
// conditions are both satisfied by one of them proves only that one.
{
  console.log('\n  Narrow landscape, 740x360\n');
  const { ctx, page } = await openBuilder(740, 360);
  check('the builder rendered', await page.locator('.wb-builder-header').count() > 0, 'header present');
  const n = await noticeCount(page);
  check('  hidden in landscape even under 768', n === 0,
    n ? `${n} notice(s) — the orientation clause is not doing its job` : 'orientation, not width, is what hides it');
  await ctx.close();
}

// ── 3. wide landscape: it is not there either ───────────────────────────────
{
  console.log('\n  Landscape phone, 844x390\n');
  const { ctx, page } = await openBuilder(844, 390);
  check('the builder rendered', await page.locator('.wb-builder-header').count() > 0, 'header present');
  const n = await noticeCount(page);
  check('  the notice is hidden in landscape', n === 0, `${n} notice(s)`);
  const edit = await canStillEdit(page);
  check('    and editing works here too', edit.ok, edit.why);

  // THE OWNER'S SECOND FINDING, MEASURED. Before this package the address line
  // overlapped the device pills by 117x17px in exactly this viewport — the one
  // the notice above sends couples to.
  const t = await toolbarOverlap(page);
  check('  nothing in the canvas toolbar overlaps anything else', !t.overlap && !t.offscreen,
    t.overlap ? `the address line overlaps the device pills by ${t.overlap.x}x${t.overlap.y}px`
      : t.offscreen ? 'the address line runs past the edge' : 'clear');
  await ctx.close();
}

// ── 4. desktop: it is not there ─────────────────────────────────────────────
{
  console.log('\n  Desktop, 1440x900\n');
  const { ctx, page } = await openBuilder(1440, 900);
  check('the builder rendered', await page.locator('.wb-builder-header').count() > 0, 'header present');
  const n = await noticeCount(page);
  check('  the notice is hidden above 768', n === 0, `${n} notice(s)`);

  // THE DESKTOP CONTROL. The address line is hidden on a phone, and a rule that
  // hid it everywhere would satisfy both phone checks above while quietly
  // deleting it from the surface it belongs on.
  const t = await toolbarOverlap(page);
  check('  the address line is still there on a desktop', t.urlVisible, t.urlVisible ? 'visible at 1440' : 'hidden at 1440 — the rule is too wide');
  check('    and clear of the device pills', !t.overlap, t.overlap ? `overlaps by ${t.overlap.x}x${t.overlap.y}px` : 'clear');
  await ctx.close();
}

// ── 5. it follows the orientation, rather than the first render ─────────────
{
  console.log('\n  Turning the phone\n');
  const { ctx, page } = await openBuilder(390, 844);
  check('  portrait shows it', await noticeCount(page) === 1, 'on arrival');
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForTimeout(900);
  check('    turning to landscape hides it', await noticeCount(page) === 0, 'matchMedia change');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(900);
  check('    and turning back shows it again', await noticeCount(page) === 1, 'not a one-shot read');
  await ctx.close();
}

await browser.close();
const failed = results.filter((r) => !r).length;
console.log(`\n  ${results.length - failed}/${results.length} checks passed`);
if (failed) { console.log(`  ${failed} FAILED`); process.exit(1); }
