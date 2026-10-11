/* global document, window, getComputedStyle */  // used inside page.evaluate(), which runs in the browser
/**
 * /features, seating row: one guest seated at one table, by clicking.
 *
 * Site fixes batch 3, item 4. The proposal said "dragged", but the product
 * seats a guest by clicking: a click on a table opens its panel, and a click on
 * a name in that panel's unassigned list seats them ("Click a table on the
 * canvas to assign guests", Seating.jsx). The clip films what the product does.
 *
 * A STUB THAT FORGETS (renderHarness.mjs, lesson 7) answers every write 200 and
 * throws it away, so Seating's reload after the assign put Matilda straight
 * back on the unassigned list and Wattle back at 9/10. This clip records
 * against its own copy of the seed, and a page route merges the two writes the
 * assign makes (Table.update, then Guest.update; src/lib/tableAssignment.js)
 * into that copy before the stub answers, so the reload shows the seat filled.
 *
 * Recorded at 1440 by 1100 and cut to 3:2 at delivery (src/lib/featureStills.js):
 * /features takes 810 by 540 around Wattle and the panel, /tour the whole
 * floor plan and panel at 975 by 650. No sidebar, no header.
 */
let live = null;

/** The center of the big table label on the canvas, not a guest card's chip. */
async function tableLabelPoint(page, name) {
  const p = await page.evaluate((n) => {
    for (const el of document.querySelectorAll('div,span,p')) {
      if (el.children.length || el.textContent.trim() !== n) continue;
      if (parseFloat(getComputedStyle(el).fontSize) < 14) continue;
      const r = el.getBoundingClientRect();
      if (r.width) return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) };
    }
    return null;
  }, name);
  if (!p) throw new Error(`No table labelled ${name} on the canvas`);
  return p;
}

export default {
  key: 'feature-seating',
  startPath: '/Seating',
  viewports: [{ width: 1440, height: 1100, label: '1440' }],
  seed(base) {
    live = { ...base, Guest: structuredClone(base.Guest), Table: structuredClone(base.Table) };
    return live;
  },
  async perform(page, cursor) {
    // NO FLOATING AVA BUTTON. It sits over the table panel's corner in the
    // /tour crop; like the cursor in a still, it is app chrome, not seating.
    await page.addStyleTag({ content: 'button[aria-label="Chat with Ava"]{display:none !important}' });
    await page.route(/\/entities\/(Table|Guest)\/[^/?]+/, async (route) => {
      const req = route.request();
      if (req.method() === 'PUT' || req.method() === 'PATCH') {
        const [, entity, id] = req.url().match(/\/entities\/(Table|Guest)\/([^/?]+)/);
        const row = live[entity].find((r) => r.id === id);
        try { if (row) Object.assign(row, JSON.parse(req.postData() || '{}')); } catch { /* the stub still answers */ }
      }
      return route.fallback();
    });
    await cursor.hold(1400);
    const table = await tableLabelPoint(page, 'Wattle');
    await cursor.moveToPoint(table.x, table.y);
    // cursor.click's own sequence, at a point rather than a locator.
    await page.waitForTimeout(300);
    const rippled = page.evaluate(() => window.__oiCursor.ripple());
    await page.mouse.down();
    await page.waitForTimeout(70);
    await page.mouse.up();
    await rippled;
    await page.waitForTimeout(900);
    await cursor.hold(1400);
    await cursor.click(page.getByText('Matilda Delaney', { exact: true }).first());
    await page.waitForTimeout(1200);
    await cursor.hold(2200);
  },
};
