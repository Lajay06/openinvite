/* global document, getComputedStyle, location */
/**
 * EVERY WORD ON /gift FITS. Owner ruling 2026-10-13, on the review of the
 * gift pages: nothing is cut off with an ellipsis. Photo captions ("Chips on
 * the...") wrap to a second line in the lower third; option and summary pills
 * ("You two found each other, and now the pl...") wrap rather than truncate.
 *
 * What it holds, on every page of the gift flow, each section open in turn,
 * at 1440, 1280 and 390 wide:
 *   - no element is styled text-overflow: ellipsis
 *   - no element is clamped to fewer than two lines (-webkit-line-clamp)
 *   - no text element clips its own text (overflow hidden and wider inside
 *     than out)
 *   - no field's value runs past its box, including a long address typed
 *     into page 2
 *   - the note's summary chip holds the whole note, not a slice of it
 *   - page 2 at 1440: "and goes to" and an ordinary address share one line,
 *     every line of the sentence at one size; a long address shrinks on that
 *     line instead of wrapping (owner ruling 2026-10-14)
 *   - page 1: every bullet's dot sits on the first line of its text
 *
 * A render guard, because each of these is a computed style or a measured
 * box. Gifting v2 turns on only for a *.vercel.app host
 * (src/lib/giftingV2.js), so the app is opened as gift-truncation-test.vercel.app
 * and every request to that host is answered from the local preview server
 * (CAPTURE_BASE_URL). No other *.vercel.app host is reachable from the page:
 * the host block of scripts/test-gift-claim-auth.mjs, kept here too.
 *
 *   CAPTURE_BASE_URL=http://localhost:4230 node scripts/test-gift-no-truncation.mjs
 */
import { chromium } from 'playwright';

const LOCAL = process.env.CAPTURE_BASE_URL || 'http://localhost:4173';
const HOST = 'https://gift-truncation-test.vercel.app';
const SAMPLE_NOTE = 'You two found each other, and now the planning finds its place too. Enjoy every bit of it. With love, Sam';

const results = [];
const check = (name, ok, detail) => {
  results.push(ok);
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};

const PAGES = [
  ['page 1', '/gift?sample=1&step=1'],
  ['page 2', '/gift?sample=1&step=2'],
  ['page 3, all closed', '/gift?sample=1&step=3&section=none'],
  ['page 3, note open', '/gift?sample=1&step=3&section=note'],
  ['page 3, first line open', '/gift?sample=1&step=3&section=headline'],
  ['page 3, photo open', '/gift?sample=1&step=3&section=photo'],
  ['page 3, when open', '/gift?sample=1&step=3&section=when'],
];

/** Everything on the page (not inside the email preview's frame) that cuts text short. */
function findCuts() {
  const cuts = [];
  const name = (el) => `${el.tagName.toLowerCase()}${el.dataset && Object.keys(el.dataset).length ? `[data-${Object.keys(el.dataset)[0].replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}]` : ''} "${(el.textContent || '').trim().slice(0, 30)}"`;
  for (const el of document.body.querySelectorAll('*')) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    if (cs.textOverflow === 'ellipsis') cuts.push(`ellipsis: ${name(el)}`);
    const clamp = parseInt(cs.webkitLineClamp || cs.getPropertyValue('-webkit-line-clamp'), 10);
    if (Number.isFinite(clamp) && clamp < 2) cuts.push(`line-clamp ${clamp}: ${name(el)}`);
    const hasOwnText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (hasOwnText && /hidden|clip/.test(cs.overflowX) && el.scrollWidth > el.clientWidth + 1) cuts.push(`clipped: ${name(el)}`);
    // A field's value is not a text node: measured on its own. Found on gift
    // page 2, where "isla.and.theo@example.com" showed as "isla.and.theo@exa".
    if (el.tagName === 'INPUT' && el.value && el.scrollWidth > el.clientWidth + 1) cuts.push(`value cut: input "${el.value.slice(0, 30)}"`);
  }
  return cuts;
}

console.log('\n  Every word on /gift fits:\n');
const browser = await chromium.launch();
try {
  for (const [w, h] of [[1440, 900], [1280, 800], [390, 844]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    await ctx.route((u) => u.hostname.endsWith('.vercel.app') && u.origin !== HOST, (route) => route.abort());
    await ctx.route((u) => u.origin === HOST, async (route) => {
      const url = new URL(route.request().url());
      if (url.pathname.startsWith('/api/')) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
      const res = await fetch(`${LOCAL}${url.pathname}${url.search}`);
      return route.fulfill({ status: res.status, headers: Object.fromEntries(res.headers), body: Buffer.from(await res.arrayBuffer()) });
    });
    const page = await ctx.newPage();
    for (const [label, path] of PAGES) {
      await page.goto(`${HOST}${path}`, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => {});
      await page.waitForTimeout(800);
      const seen = await page.evaluate(() => ({ text: (document.body.innerText || '').trim().length, path: location.pathname }));
      // PRESENCE BEFORE PROPERTIES: a redirect to /gifting or a blank page
      // would have nothing to cut.
      if (seen.path !== '/gift' || seen.text < 40) { check(`${w}, ${label}: the gift page renders`, false, `${seen.path}, ${seen.text} chars`); continue; }
      const cuts = await page.evaluate(findCuts);
      check(`${w}, ${label}: no ellipsis, no single-line clamp, no clipped text`, cuts.length === 0, cuts.slice(0, 4).join(' | ') || 'none');
      if (label === 'page 1') {
        const dots = await page.evaluate(() => [...document.querySelectorAll('li')].filter((li) => li.firstElementChild?.textContent === '•').map((li) => {
          const dot = li.firstElementChild.getBoundingClientRect();
          const text = li.lastElementChild.getClientRects()[0];
          return { line: li.lastElementChild.textContent.slice(0, 24), off: Math.abs(dot.top - text.top) };
        }));
        check(`${w}, ${label}: every bullet's dot sits on its first line`, dots.length > 0 && dots.every((d) => d.off <= 2), dots.filter((d) => d.off > 2).map((d) => `${d.line} ${Math.round(d.off)}px`).join(' | ') || `${dots.length} bullets`);
      }
      if (label === 'page 2' && w === 1440) {
        const row = async (email) => {
          await page.locator('input[type="email"]').fill(email);
          await page.waitForTimeout(250);
          return page.evaluate(() => [...document.querySelectorAll('input.s1-input')].map((i) => {
            const l = i.parentElement.querySelector('span');
            return { fs: parseFloat(getComputedStyle(i).fontSize), labelFs: parseFloat(getComputedStyle(l).fontSize), sameRow: Math.abs(i.getBoundingClientRect().top - l.getBoundingClientRect().top) < 20 };
          }));
        };
        const ordinary = await row('la.jay06@gmail.com');
        check(`${w}, ${label}: "and goes to la.jay06@gmail.com" is one line, the sentence one size`,
          ordinary[1].sameRow && ordinary.every((f) => f.fs === ordinary[0].labelFs && f.labelFs === ordinary[0].labelFs), JSON.stringify(ordinary[1]));
        const long = await row('isla.and.theo.featherstonehaugh@example.com');
        check(`${w}, ${label}: a long address shrinks on its line instead of wrapping`, long[1].sameRow && long[1].fs < long[1].labelFs, JSON.stringify(long[1]));
      }
      if (label === 'page 2') {
        await page.locator('input[type="email"]').fill('isla.and.theo.featherstonehaugh@example.com');
        await page.waitForTimeout(200);
        const long = await page.evaluate(findCuts);
        check(`${w}, ${label}: a long address shows whole`, long.length === 0, long.slice(0, 3).join(' | ') || 'none');
      }
      if (label === 'page 3, all closed') {
        const chips = await page.evaluate(() => [...document.querySelectorAll('span')].map((s) => s.textContent.trim()));
        check(`${w}, ${label}: the note's summary chip holds the whole note`, chips.includes(SAMPLE_NOTE));
      }
      if (label === 'page 3, photo open') {
        const fit = await page.evaluate(() => [...document.querySelectorAll('[data-tile-caption]')].map((t) => {
          const band = t.querySelector('[data-tile-caption-band]');
          return band ? band.getBoundingClientRect().height / t.getBoundingClientRect().height : 1;
        }));
        check(`${w}, ${label}: every caption stays in the lower third`, fit.length > 0 && fit.every((r) => r <= 0.334), `${fit.length} tiles, tallest ${Math.round(Math.max(...fit) * 100)}%`);
      }
    }
    await ctx.close();
  }
} finally {
  await browser.close();
}

const failed = results.filter((ok) => !ok).length;
console.log(`\n  ${results.length - failed}/${results.length} passed\n`);
process.exit(failed ? 1 : 0);
