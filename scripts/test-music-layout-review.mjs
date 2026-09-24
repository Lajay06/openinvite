/* global document, getComputedStyle */
/**
 * THE MUSIC PAGE USES ITS PAGE, AND A REQUEST CAN BE ANSWERED.
 *
 * Owner walk-through, Run 4 S7, two claims. One reproduced; the other was
 * already built, and this guard is what keeps it built.
 *
 * ── THE EMPTY RIGHT COLUMN ─────────────────────────────────────────────────
 *
 * The playlist tab capped its content at `maxWidth: 760` inside a panel
 * measured at 1240px on a 1440 screen: 480px of nothing down the right. At 390
 * the cap never bound (326px of 390), which is why it read as "content stacked
 * on the left" rather than as a broken layout — it was a desktop-only defect.
 * Full width now, like the other planner pages.
 *
 * ── THE REVIEW CONTROLS ────────────────────────────────────────────────────
 *
 * Approve and Decline already existed (Music.jsx:560-565), writing through
 * reviewRequest(id, 'approve'|'decline'), with the status filter beside them.
 * The walk-through reported them missing, and the most likely reason is the
 * one this fixture now removes: THE CONTROLS ONLY RENDER FOR A PENDING
 * REQUEST, so a couple with no pending request sees a list and no buttons.
 *
 * So the fixture carries one pending row and one already answered, and this
 * asserts both directions: the waiting request offers both controls, and the
 * answered one offers neither. A guard that only proved the buttons exist
 * would pass on a page that showed them on every row, including the ones the
 * couple has already decided.
 *
 * ── THE SHAPE CHANGED; THE CLAIM DID NOT ───────────────────────────────────
 *
 * Round two, item 12 rebuilt this page as a table, and the hand-rolled request
 * rows and their four status tabs went with it. Both of this guard's claims
 * still hold and are still checked, on the new shape:
 *
 *   THE WIDTH  unchanged — the panel and its content, at both widths.
 *   THE ANSWER Approve and Decline are in the ROW, not behind the table's
 *              "···" menu. That is deliberate and it is what this guard is
 *              about: the walk-through reported these controls MISSING when
 *              they were merely conditional, and a dropdown is one more place
 *              for them to be missing from.
 *   THE SECTION opens on the songs table now, not on the playlist link. A
 *              table like every other table in the product is not one a couple
 *              has to unfold to find the thing waiting on them.
 *
 * The status TABS are gone on purpose and are not checked here: every request
 * is a row with its status printed on it, and test-song-status-coverage.mjs
 * holds that property where it now lives.
 */
import { chromium } from 'playwright';
import { seededContext } from './lib/renderHarness.mjs';

const BASE = process.env.CAPTURE_BASE_URL || 'http://localhost:4208';
const SECTIONS = ['Your playlist', 'Your songs', 'Share with guests'];
const WAITING = 'Just Like Heaven';
const ANSWERED = 'This Must Be the Place';

const results = [];
const check = (name, ok, detail) => {
  results.push(ok);
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};

const browser = await chromium.launch();

// ── the layout, at both widths ─────────────────────────────────────────────
for (const [w, h] of [[1440, 950], [390, 844]]) {
  const ctx = await seededContext(browser, { width: w, height: h });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/Music`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(7000);
  const r = await page.evaluate((titles) => {
    const panel = [...document.querySelectorAll('div')].find((d) => d.style && d.style.padding === '32px 32px 48px');
    if (!panel) return null;
    const inner = panel.firstElementChild;
    const pr = panel.getBoundingClientRect(), ir = inner.getBoundingClientRect();
    const sections = [...panel.querySelectorAll('[aria-expanded]')].map((el) => ({
      title: (el.innerText || '').trim().split('\n')[0],
      open: el.getAttribute('aria-expanded') === 'true',
    })).filter((x) => titles.includes(x.title));
    return { panelW: Math.round(pr.width), innerW: Math.round(ir.width), sections };
  }, SECTIONS);

  // PRESENCE BEFORE PROPERTIES.
  check(`${w}px: the playlist tab rendered`, !!r, r ? `panel ${r.panelW}px` : 'no panel');
  if (!r) { await ctx.close(); continue; }
  // 80px covers the panel's own 32px of padding either side with room to spare;
  // the defect being guarded was 480px of unused width, not a rounding error.
  check('  the content uses the page it is on', r.panelW - r.innerW <= 80,
    `panel ${r.panelW}px, content ${r.innerW}px, ${r.panelW - r.innerW}px unused`);
  check('  all three sections are there', r.sections.length === 3,
    r.sections.map((x) => x.title).join(' · ') || 'none');
  // THE TABLE OPENS, not the playlist link. See the header.
  const open = r.sections.find((x) => x.open);
  check('    the songs table is the section that opens', open?.title === 'Your songs', `open=${open?.title}`);
  check('    and the other two are collapsed',
    r.sections.filter((x) => x.title !== 'Your songs').every((x) => x.open === false),
    r.sections.filter((x) => x.title !== 'Your songs').map((x) => `${x.title}=${x.open}`).join(' · '));
  await ctx.close();
}

// ── the review controls ────────────────────────────────────────────────────
{
  const ctx = await seededContext(browser, { width: 1440, height: 950 });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/Music`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(7000);
  // The songs table already opens by default; this is a no-op when it is
  // open and reopens it if a future change collapses it, so the controls are
  // checked either way.
  const songs = page.getByRole('button', { name: /^Your songs/ }).first();
  if (await songs.count() > 0 && (await songs.getAttribute('aria-expanded')) === 'false') {
    await songs.click({ timeout: 10000 }).catch(() => {});
  }
  await page.waitForTimeout(1500);

  const rows = await page.evaluate(([waiting, answered]) => {
    const out = {};
    for (const name of [waiting, answered]) {
      // A TABLE ROW NOW, not a stack of <p>s. The song title is a cell; the
      // controls, if any, are buttons in the same <tr>.
      const cell = [...document.querySelectorAll('td')].find((x) => (x.innerText || '').trim() === name);
      const row = cell ? cell.closest('tr') : null;
      out[name] = row ? [...row.querySelectorAll('button')].map((b) => (b.innerText || '').trim()).filter(Boolean) : null;
    }
    // The four views the toolbar offers. Named so a filter quietly dropped is
    // caught, without pinning the counts, which move with the fixture.
    const filters = [...document.querySelectorAll('button')].map((b) => (b.innerText || '').trim())
      .filter((t) => /^(All|Waiting on you|Your playlist|Guest requests) \(/.test(t));
    return { ...out, filters };
  }, [WAITING, ANSWERED]);

  check('both requests are listed', !!rows[WAITING] && !!rows[ANSWERED],
    `${WAITING}: ${rows[WAITING] ? 'row' : 'MISSING'} · ${ANSWERED}: ${rows[ANSWERED] ? 'row' : 'MISSING'}`);
  check('  the waiting request can be approved', !!rows[WAITING]?.includes('Approve'),
    (rows[WAITING] || []).join(' · ') || 'no buttons');
  check('  and declined', !!rows[WAITING]?.includes('Decline'), (rows[WAITING] || []).join(' · ') || 'no buttons');
  check('  the answered one offers neither', !(rows[ANSWERED] || []).some((t) => /approve|decline/i.test(t)),
    (rows[ANSWERED] || []).join(' · ') || 'no buttons, as it should be');
  check('  and the four views are all offered', rows.filters.length === 4, rows.filters.join(' · ') || 'no filters');
  await ctx.close();
}

await browser.close();
const failed = results.filter((r) => !r).length;
console.log(`\n  ${results.length - failed}/${results.length} checks passed`);
if (failed) { console.log(`  ${failed} FAILED`); process.exit(1); }
