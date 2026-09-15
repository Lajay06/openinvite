/* global document, window */
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
const TEXT = 'Turn your phone sideways for the best editing experience';

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
  await ctx.close();
}

// ── 4. desktop: it is not there ─────────────────────────────────────────────
{
  console.log('\n  Desktop, 1440x900\n');
  const { ctx, page } = await openBuilder(1440, 900);
  check('the builder rendered', await page.locator('.wb-builder-header').count() > 0, 'header present');
  const n = await noticeCount(page);
  check('  the notice is hidden above 768', n === 0, `${n} notice(s)`);
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
