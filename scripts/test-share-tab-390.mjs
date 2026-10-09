/* global document, window, getComputedStyle */
/**
 * THE SHARE TAB IS USABLE ON A PHONE.
 *
 * Found by lane B's fixture audit at 390, which is the only way it could be
 * found: the share tab was a bare flex row, an email column at `flex: 1`
 * beside a sidebar at a fixed 280px, with no wrap and no breakpoint. Nothing
 * in the source states a width, so reading it tells you nothing. Measured, the
 * sidebar took its 280 and the email column was left with the remainder, so
 * the message box painted 26px wide and the send button 28px.
 *
 * ── WHAT IS MEASURED, AND WHY IT IS NOT A SCREENSHOT ──────────────────────
 *
 * "Looks cramped" is not checkable. Two things are, exactly:
 *   · the message box is at least 280px wide, which at 390 means it has the
 *     column rather than a sliver of it;
 *   · the send button's LABEL is fully visible, not merely its box.
 *
 * THE LABEL, NOT THE BUTTON, for the reason test-builder-header-390.mjs
 * records: a clipped label keeps its full box, so measuring the button passes
 * while the words are gone. The text node's own range rect is compared against
 * the button's box and hit-tested at its centre.
 *
 * THE HIT TEST ONLY APPLIES IN VIEW. The control sits below the fold at both
 * widths and the document is not the scroll container, so elementFromPoint
 * returns null for it and null is indistinguishable from covered. The first
 * version of this guard called a 966px button's label clipped because of it.
 * Geometry answers the clipping question at any position; the hit test adds
 * only "covered", which is meaningless off-screen. See the call site.
 *
 * ── AND 1440 IS PINNED ────────────────────────────────────────────────────
 *
 * The fix is a media query below 640, so nothing above it may change. That is
 * asserted rather than assumed: at 1440 the body is still a row and the
 * sidebar is still 280px. A fix that stacked the desktop too would satisfy
 * every phone check and be wrong.
 *
 * Usage: npm run test:share-tab-390   (needs a server; CAPTURE_BASE_URL)
 */
import { chromium } from 'playwright';
import { seededContext, SEED } from './lib/renderHarness.mjs';

const BASE = process.env.CAPTURE_BASE_URL || 'http://localhost:5173';

const results = [];
const check = (name, ok, detail) => {
  results.push(ok);
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};

const readShare = (page) => page.evaluate(() => {
  const body = document.querySelector('.oi-share-body');
  if (!body) return null;
  const main = document.querySelector('.oi-share-main');
  const aside = document.querySelector('.oi-share-aside');
  const box = main ? main.querySelector('textarea') : null;

  // The send button is the one whose label starts with Send, or the disabled
  // prompt that stands in its place when nothing is selected. Found by its
  // words rather than by position, so a reordering of the column cannot make
  // this guard silently measure a different control.
  const buttons = main ? [...main.querySelectorAll('button')] : [];
  const send = buttons.find((b) => /^(Send to |Select guests to send|Sending)/.test((b.innerText || '').trim()));

  // ── THE CONTROL SITS BELOW THE FOLD, AND THE HIT TEST CANNOT SEE IT ────
  //
  // Measured: the send button is at y=994 on a 900px-tall viewport at both
  // widths. elementFromPoint only answers for the VISIBLE viewport and returns
  // null for a point outside it, which no hit test can tell apart from being
  // covered. The first version of this guard therefore reported the label
  // clipped at 1440, on a 966px button holding 146px of text, which is
  // impossible. scrollIntoView does not help either: the document is not the
  // scroll container here, docScrollTop stays 0 and nothing moves.
  //
  // So the hit test is applied ONLY when the label is inside the viewport, and
  // the geometry is what answers the owner's question everywhere. That is not
  // a weakening: clipping is exactly what the geometry detects, through the
  // text node's own range rect and the button's own overflow, and those were
  // already the two checks that mattered. Being covered by another element is
  // the only thing the hit test adds, and it is a question that has no meaning
  // for a point nobody is looking at.

  const labelVisible = (b) => {
    if (!b) return false;
    const r = b.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return false;
    if (b.scrollWidth > b.clientWidth + 1) return false;
    const node = [...b.childNodes].find((n) => n.nodeType === 3 && n.textContent.trim());
    if (!node) return false;
    const range = document.createRange();
    range.selectNodeContents(node);
    const t = range.getBoundingClientRect();
    if (t.width <= 0) return false;
    if (t.right > r.right + 1 || t.left < r.left - 1) return false;
    // IN VIEW OR NOT: see the note above. Out of view, the geometry above is
    // the whole verdict; in view, it also has to be the thing under the point.
    const cx = Math.round(t.left + t.width / 2);
    const cy = Math.round(t.top + t.height / 2);
    const inViewport = cx >= 0 && cy >= 0 && cx <= window.innerWidth && cy <= window.innerHeight;
    if (!inViewport) return true;
    const hit = document.elementFromPoint(cx, cy);
    return !!(hit && (hit === b || b.contains(hit) || b.contains(hit.parentElement)));
  };

  return {
    direction: getComputedStyle(body).flexDirection,
    boxWidth: box ? Math.round(box.getBoundingClientRect().width) : 0,
    mainWidth: main ? Math.round(main.getBoundingClientRect().width) : 0,
    asideWidth: aside ? Math.round(aside.getBoundingClientRect().width) : 0,
    sendWidth: send ? Math.round(send.getBoundingClientRect().width) : 0,
    sendLabel: send ? (send.innerText || '').trim() : null,
    sendLabelVisible: labelVisible(send),
    sendPastEdge: send ? send.getBoundingClientRect().right > window.innerWidth + 1 : false,
    boxPastEdge: box ? box.getBoundingClientRect().right > window.innerWidth + 1 : false,
    pageScrollsSideways: document.documentElement.scrollWidth > window.innerWidth + 1,
  };
});

const browser = await chromium.launch();

console.log('\n  The share tab, at both widths:\n');

for (const width of [390, 1440]) {
  const ctx = await seededContext(browser, { width, height: 900, seed: SEED });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/studio/guest-suite/share`, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(5000);

  const s = await readShare(page);
  // PRESENCE BEFORE PROPERTIES: an absent tab has no narrow message box,
  // which is not the same as a message box that fits.
  check(`${width}: the share tab is on screen`, !!s && s.mainWidth > 0,
    s ? `main ${s.mainWidth}px, aside ${s.asideWidth}px, ${s.direction}` : 'no share body');

  if (!s) {
    check('  the message box is wide enough', false, 'no share body');
    check('  the send label is fully visible', false, 'no share body');
    await ctx.close();
    continue;
  }

  check('  the message box and the send button both exist', s.boxWidth > 0 && s.sendWidth > 0,
    `box ${s.boxWidth}px, button ${s.sendWidth}px${s.sendLabel ? ` ("${s.sendLabel}")` : ''}`);

  if (width === 390) {
    // THE TWO NUMBERS THE FIX EXISTS FOR. 26px and 28px were the measured
    // values before it; 280 is the floor the owner set.
    check('  the columns have stacked', s.direction === 'column', s.direction);
    check('  the message box is at least 280px wide', s.boxWidth >= 280, `${s.boxWidth}px`);
    check('  and the send button is too', s.sendWidth >= 280, `${s.sendWidth}px`);
    check('  the send button label is fully visible', s.sendLabelVisible === true,
      s.sendLabelVisible ? `"${s.sendLabel}" readable` : `"${s.sendLabel}" clipped or covered`);
    check('  nothing runs past the right edge', !s.boxPastEdge && !s.sendPastEdge,
      `box ${s.boxPastEdge ? 'overflows' : 'inside'}, button ${s.sendPastEdge ? 'overflows' : 'inside'}`);
    check('  and the page does not scroll sideways', s.pageScrollsSideways === false,
      s.pageScrollsSideways ? 'horizontal scroll' : 'no horizontal scroll');
  } else {
    // THE DESKTOP IS UNCHANGED, asserted so a phone fix cannot quietly
    // restyle 1440 and pass everything.
    check('  the desktop is still a row', s.direction === 'row', s.direction);
    check('  with the sidebar still 280px', s.asideWidth === 280, `${s.asideWidth}px`);
    check('  and the email column still wider than it', s.mainWidth > s.asideWidth,
      `main ${s.mainWidth}px vs aside ${s.asideWidth}px`);
    check('  the send button label is fully visible', s.sendLabelVisible === true,
      s.sendLabelVisible ? `"${s.sendLabel}" readable` : `"${s.sendLabel}" clipped or covered`);
  }
  await ctx.close();
}

await browser.close();

const passed = results.filter(Boolean).length;
console.log(`\n  ${passed}/${results.length} ${passed === results.length ? 'ALL PASS' : 'FAILURES PRESENT'}\n`);
process.exit(passed === results.length ? 0 : 1);
