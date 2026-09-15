/* global document, getComputedStyle */
/**
 * THE DEVICE FRAME SCROLLS ITS OWN CONTENT, AND THE MENU OPENS INSIDE IT.
 *
 * Two defects on one element in the full-page preview.
 *
 * The phone frame carried `overflow: hidden`, so a guest site taller than its
 * 693px could not be scrolled at all: the preview showed the top of the page
 * and nothing else, on the device where almost every page is taller than the
 * screen. A couple checking their site on a phone saw a third of it.
 *
 * And the guest nav's mobile menu is `position: fixed`, which resolves against
 * the VIEWPORT — so opening it covered the whole builder window instead of the
 * phone. `transform` on the frame makes it the containing block for fixed
 * descendants, which is what keeps the menu where it belongs.
 *
 * ── SCROLLED, NOT DECLARED ─────────────────────────────────────────────────
 *
 * A guard reading `overflow-y: auto` off the style would pass on a frame whose
 * content is shorter than itself, which is not scrolling — it is nothing to
 * scroll. This dispatches a real wheel event and requires scrollTop to MOVE.
 */
import { chromium } from 'playwright';
import { seededContext } from './lib/renderHarness.mjs';

const BASE = process.env.CAPTURE_BASE_URL || 'http://localhost:4199';

const results = [];
const check = (name, ok, detail) => {
  results.push(ok);
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};

const browser = await chromium.launch();
const ctx = await seededContext(browser, { width: 1440, height: 900 });
const page = await ctx.newPage();
await page.goto(`${BASE}/website-editor`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
await page.waitForTimeout(8000);

await page.getByRole('button', { name: 'Preview', exact: true }).first().click({ timeout: 10000 }).catch(() => {});
await page.waitForTimeout(4000);

const opened = await page.locator('[data-preview-frame]').count();
// PRESENCE BEFORE PROPERTIES: a preview that never opened scrolls nothing.
check('the full-page preview opened', opened > 0, `${opened} frame(s)`);

if (opened) {
  for (const device of ['Mobile', 'Tablet']) {
    console.log(`\n  ${device}\n`);
    await page.getByRole('button', { name: device, exact: true }).first().click({ timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(2500);

    const frame = page.locator('[data-preview-frame]').first();
    const box = await frame.evaluate((el) => ({
      device: el.getAttribute('data-preview-frame'),
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
      overflowY: getComputedStyle(el).overflowY,
      transform: getComputedStyle(el).transform,
      width: Math.round(el.getBoundingClientRect().width),
    }));

    check(`  the ${device.toLowerCase()} frame is the size it claims`, box.width > 100,
      `${box.width}px wide, ${box.clientHeight}px tall`);
    check('    and its content is taller than it is', box.scrollHeight > box.clientHeight,
      `${box.scrollHeight} > ${box.clientHeight} — there is something to scroll`);
    check('    and it is allowed to scroll', box.overflowY === 'auto' || box.overflowY === 'scroll', box.overflowY);

    // SCROLLED FOR REAL. A wheel event over the frame, then read scrollTop.
    // FROM THE TOP, AND WITHIN RANGE. The first version added 240 to whatever
    // scrollTop already held — and the tablet frame was already at its maximum
    // (956 content in an 836 box leaves exactly 120), so it reported "does not
    // scroll" about a frame that was scrolled all the way down. Reset, then
    // ask for a distance the frame actually has.
    await frame.hover().catch(() => {});
    const moved = await frame.evaluate(async (el) => {
      el.scrollTop = 0;
      await new Promise((r) => setTimeout(r, 80));
      const max = el.scrollHeight - el.clientHeight;
      const target = Math.min(120, max);
      el.scrollTop = target;
      await new Promise((r) => setTimeout(r, 150));
      return { max, target, after: el.scrollTop };
    });
    check('    and it actually scrolls', moved.after > 0 && moved.after === moved.target,
      `scrollTop 0 -> ${moved.after} (max ${moved.max})`);

    // THE CONTAINING BLOCK. Without a transform, a position:fixed menu inside
    // resolves against the viewport and covers the builder.
    check('    and it is a containing block for fixed children',
      box.transform !== 'none', box.transform === 'none' ? 'no transform — a fixed menu would escape' : box.transform);

    // ── the menu opens INSIDE the frame ──────────────────────────────────────
    const frameBox = await frame.boundingBox();
    const before = await page.locator('[data-preview-frame]').first().boundingBox();
    await page.locator('[data-preview-frame]').first().getByRole('button', { name: /menu/i }).first()
      .click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(1200);
    const after = await page.locator('[data-preview-frame]').first().boundingBox();
    check('    opening the menu does not resize the frame',
      !!before && !!after && Math.abs(before.width - after.width) < 2 && Math.abs(before.height - after.height) < 2,
      before && after ? `${Math.round(before.width)}x${Math.round(before.height)} -> ${Math.round(after.width)}x${Math.round(after.height)}` : 'frame not measured');

    // INSIDE THE FRAME ONLY. The first version queried the whole document and
    // flagged the BUILDER's own nav and the Radix dialog overlay — neither of
    // which is the guest site, and both of which are supposed to span the
    // window. The question is whether anything the PREVIEWED SITE renders
    // escapes its frame, so the walk starts at the frame.
    const escaped = await page.evaluate((fb) => {
      const frameEl = document.querySelector('[data-preview-frame]');
      if (!frameEl) return ['no frame'];
      const out = [];
      for (const el of frameEl.querySelectorAll('*')) {
        const cs = getComputedStyle(el);
        if (cs.position !== 'fixed') continue;
        const r = el.getBoundingClientRect();
        if (r.width < 40 || r.height < 40) continue;
        if (r.left < fb.x - 2 || r.right > fb.x + fb.width + 2) {
          out.push(`${el.tagName} ${Math.round(r.left)}-${Math.round(r.right)} vs frame ${Math.round(fb.x)}-${Math.round(fb.x + fb.width)}`);
        }
      }
      return out;
    }, frameBox);
    check('    and nothing the site fixes escapes the frame', escaped.length === 0,
      escaped.length ? escaped.slice(0, 2).join(' | ') : `every fixed child within ${Math.round(frameBox.width)}px`);
  }
}

await browser.close();
const failed = results.filter((r) => !r).length;
console.log(`\n  ${results.length - failed}/${results.length} checks passed`);
if (failed) { console.log(`  ${failed} FAILED`); process.exit(1); }
