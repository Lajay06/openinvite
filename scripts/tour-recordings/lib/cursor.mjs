/**
 * scripts/tour-recordings/lib/cursor.mjs
 *
 * A CURSOR, BECAUSE THE BROWSER DOES NOT DRAW ONE.
 *
 * Headless Chromium composites no pointer into its frames, so a recording made
 * without this shows controls operating themselves. The brief asks for a
 * synthetic cursor with eased movement, a 300 ms settle before every click and
 * a soft click ripple; all three are here.
 *
 * TWO CURSORS MOVE, AND THAT IS ON PURPOSE. The drawn one animates in the page
 * at the display's own refresh, so the footage is smooth. The REAL mouse is
 * stepped along the same eased path at the same time, so hover states, focus
 * rings and tooltips are the product's genuine response to a pointer rather
 * than something a screenshot faked. Fewer samples on the real one is
 * invisible: both follow one curve over one duration.
 *
 * IT IS NEVER PART OF THE PRODUCT. Nothing here is imported by src/. It is
 * injected into a preview server by a recording script and it leaves with the
 * browser.
 */

/** Injected into every document. Kept as one string so re-injection is exact. */
const CURSOR_SOURCE = `(() => {
  if (window.__oiCursor) return;
  const EASE = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const state = { x: 40, y: 40, el: null, ripple: null };

  function mount() {
    if (state.el || !document.body) return;
    const wrap = document.createElement('div');
    wrap.id = 'oi-recording-cursor';
    wrap.setAttribute('aria-hidden', 'true');
    wrap.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;pointer-events:none;z-index:2147483647;';
    // An arrow with a light fill and a dark outline, so it reads on a white
    // dashboard and on a dark universe hero without changing color.
    wrap.innerHTML = '<svg width="26" height="26" viewBox="0 0 26 26" style="position:absolute;left:0;top:0;overflow:visible">'
      + '<path d="M3 2 L3 19 L8 14.4 L11.4 22 L14.8 20.4 L11.4 13 L18 12.6 Z"'
      + ' fill="#FFFFFF" stroke="#0A0A0A" stroke-width="1.6" stroke-linejoin="round"/></svg>'
      + '<div id="oi-recording-ripple" style="position:absolute;left:0;top:0;width:34px;height:34px;margin:-17px 0 0 -17px;'
      + 'border-radius:999px;border:2px solid rgba(224,53,83,0.9);background:rgba(224,53,83,0.16);'
      + 'opacity:0;transform:scale(0.25);"></div>';
    document.body.appendChild(wrap);
    state.el = wrap;
    state.ripple = wrap.querySelector('#oi-recording-ripple');
    paint();
  }

  function paint() {
    if (state.el) state.el.style.transform = 'translate(' + state.x + 'px,' + state.y + 'px)';
  }

  window.__oiCursor = {
    mount,
    at() { return { x: state.x, y: state.y }; },
    place(x, y) { state.x = x; state.y = y; mount(); paint(); },
    moveTo(tx, ty, ms) {
      mount();
      const sx = state.x, sy = state.y;
      const start = performance.now();
      return new Promise((resolve) => {
        function step(now) {
          const t = Math.min(1, (now - start) / Math.max(1, ms));
          const e = EASE(t);
          state.x = sx + (tx - sx) * e;
          state.y = sy + (ty - sy) * e;
          paint();
          if (t < 1) requestAnimationFrame(step); else resolve();
        }
        requestAnimationFrame(step);
      });
    },
    ripple() {
      mount();
      const r = state.ripple;
      if (!r) return Promise.resolve();
      r.style.transition = 'none';
      r.style.opacity = '0';
      r.style.transform = 'scale(0.25)';
      // Two frames, so the reset lands before the growth starts. One frame is
      // sometimes coalesced with the change that follows it and the ripple
      // never appears.
      return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => {
        r.style.transition = 'opacity 380ms ease-out, transform 380ms ease-out';
        r.style.opacity = '1';
        r.style.transform = 'scale(1.5)';
        setTimeout(() => { r.style.opacity = '0'; resolve(); }, 300);
      })));
    },
  };
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
})()`;

/** Install on a context, so every document in it gets the cursor. */
export async function installCursor(ctx) {
  await ctx.addInitScript(CURSOR_SOURCE);
}

/** Put it back after anything that replaced the document or the body. */
export async function ensureCursor(page) {
  await page.evaluate(CURSOR_SOURCE);
  await page.evaluate(() => window.__oiCursor.mount());
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const EASE = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/**
 * A cursor bound to one page.
 *
 * Every method awaits the motion it starts, so a chapter script reads as the
 * sequence a viewer sees rather than as a pile of timers.
 */
export function cursorFor(page) {
  let pos = { x: 40, y: 40 };

  async function moveToPoint(x, y, { ms } = {}) {
    const dist = Math.hypot(x - pos.x, y - pos.y);
    const duration = ms ?? clamp(Math.round(260 + dist * 1.15), 380, 1150);
    const drawn = page.evaluate(([tx, ty, d]) => window.__oiCursor.moveTo(tx, ty, d), [x, y, duration]);
    // The real pointer, along the same curve. Ten samples is enough for hover
    // and cheap enough not to stretch the duration it is meant to match.
    const steps = 10;
    const from = { ...pos };
    for (let i = 1; i <= steps; i += 1) {
      const e = EASE(i / steps);
      await page.mouse.move(from.x + (x - from.x) * e, from.y + (y - from.y) * e);
      await page.waitForTimeout(Math.max(0, Math.round(duration / steps) - 4));
    }
    await drawn;
    pos = { x, y };
  }

  /** The point a control is actually at, so the cursor lands on the thing. */
  async function pointOf(target, { dx = 0, dy = 0 } = {}) {
    const loc = typeof target === 'string' ? page.locator(target).first() : target;
    await loc.waitFor({ state: 'visible', timeout: 15000 });
    await loc.scrollIntoViewIfNeeded().catch(() => {});
    const box = await loc.boundingBox();
    if (!box) throw new Error(`No box for ${typeof target === 'string' ? target : 'locator'}`);
    return { x: Math.round(box.x + box.width / 2 + dx), y: Math.round(box.y + box.height / 2 + dy) };
  }

  return {
    get position() { return { ...pos }; },
    place: async (x, y) => { pos = { x, y }; await page.evaluate(([a, b]) => window.__oiCursor.place(a, b), [x, y]); await page.mouse.move(x, y); },
    moveToPoint,
    async moveTo(target, opts = {}) {
      const p = await pointOf(target, opts);
      await moveToPoint(p.x, p.y, opts);
    },
    /** Move, settle for 300 ms as the brief asks, ripple, then really click. */
    async click(target, opts = {}) {
      const p = await pointOf(target, opts);
      await moveToPoint(p.x, p.y, opts);
      await page.waitForTimeout(300);
      const rippled = page.evaluate(() => window.__oiCursor.ripple());
      await page.mouse.down();
      await page.waitForTimeout(70);
      await page.mouse.up();
      await rippled;
    },
    /** Hold still. A recording needs rests as much as it needs movement. */
    hold: (ms) => page.waitForTimeout(ms),
  };
}
