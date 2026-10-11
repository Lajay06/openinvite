/* global document */  // used inside page.evaluate(), which runs in the browser
/**
 * Feature still: vendors. The couple's own saved vendors, not the marketplace
 * (owner ruling 2026-10-11: the render harness cannot reach Google Places).
 * The Contact and Website columns are empty in the fixture, so they are hidden
 * for the still, as the phone reply still hides its middle columns (owner
 * ruling 2026-10-10): name, category, status and price sit together in a
 * tight frame. As many rows as fill 3:2.
 */
export default {
  key: 'feature-vendors',
  startPath: '/Vendors',
  viewportHeight: 1400,
  async prepare(page) {
    await page.evaluate(() => {
      const table = document.querySelector('table');
      const head = [...table.querySelectorAll('thead th')];
      const drop = head.map((th, i) => (/^(Contact|Website)$/.test(th.textContent.trim()) ? i : -1)).filter((i) => i >= 0);
      for (const tr of table.querySelectorAll('tr')) drop.forEach((i) => { if (tr.children[i]) tr.children[i].style.display = 'none'; });
      // Pack the remaining columns, so price sits beside status rather than across the page.
      table.style.width = 'auto';
      table.style.minWidth = '0';
    });
    await page.waitForTimeout(300);
  },
  async frame(page) {
    return page.evaluate(() => {
      const table = document.querySelector('table');
      const head = [...table.querySelectorAll('thead th')];
      const price = head.find((th) => /Price/.test(th.textContent)).getBoundingClientRect();
      const t = table.getBoundingClientRect();
      const width = price.right + 4 - t.left;
      const top = table.querySelector('thead').getBoundingClientRect().top;
      let bottom = top;
      for (const tr of table.querySelectorAll('tbody tr')) { bottom = tr.getBoundingClientRect().bottom; if (bottom - top >= width / 1.5) break; }
      return { x: t.left, y: top, width, height: bottom - top };
    });
  },
};
