/* global document */  // used inside page.evaluate(), which runs in the browser
/**
 * Feature still: vendors. The couple's own saved vendors, not the marketplace
 * (owner ruling 2026-10-11: the render harness cannot reach Google Places).
 * The Contact and Website columns are empty in the fixture, so they are hidden
 * for the still, as the phone reply still hides its middle columns (owner
 * ruling 2026-10-10): name, category, status and price sit together in a
 * tight frame. The whole rows that fit 3:2.
 */
export default {
  key: 'feature-vendors',
  startPath: '/Vendors',
  viewportHeight: 1400,
  async prepare(page) {
    await page.evaluate(() => {
      const table = document.querySelector('table');
      const head = [...table.querySelectorAll('thead th')];
      // Contact and Website, and everything outside Vendor to Price: the
      // expand chevron, the favorite star and the row menu say nothing about
      // vendors, and a crop that merely starts past them leaves slivers.
      const first = head.findIndex((th) => /Vendor/.test(th.textContent));
      const last = head.findIndex((th) => /Price/.test(th.textContent));
      const drop = head.map((th, i) => (i < first || i > last || /^(Contact|Website)$/.test(th.textContent.trim()) ? i : -1)).filter((i) => i >= 0);
      for (const tr of table.querySelectorAll('tr')) drop.forEach((i) => { if (tr.children[i]) tr.children[i].style.display = 'none'; });
      // Pack the remaining columns, so price sits beside status rather than across the page.
      table.style.width = 'auto';
      table.style.minWidth = '0';
    });
    await page.waitForTimeout(300);
  },
  async frame(page) {
    // The fewest whole rows at least as deep as the packed table is wide over
    // 3:2, then the table widened to exactly 3:2 of them: the columns spread
    // rather than the frame showing the table's edge and the page past it.
    await page.evaluate(() => {
      const table = document.querySelector('table');
      const top = table.querySelector('thead').getBoundingClientRect().top;
      const rows = [...table.querySelectorAll('tbody tr')];
      const target = table.getBoundingClientRect().width / 1.5;
      let keep = 1;
      while (keep < rows.length && rows[keep - 1].getBoundingClientRect().bottom - top < target) keep += 1;
      rows.slice(keep).forEach((tr) => { tr.style.display = 'none'; });
      const height = rows[keep - 1].getBoundingClientRect().bottom - top;
      table.style.width = `${Math.ceil(height * 1.5) + 2}px`;
    });
    await page.waitForTimeout(200);
    return page.evaluate(() => {
      const table = document.querySelector('table');
      const t = table.getBoundingClientRect();
      const top = table.querySelector('thead').getBoundingClientRect().top;
      const rows = [...table.querySelectorAll('tbody tr')].filter((tr) => tr.style.display !== 'none');
      const height = rows[rows.length - 1].getBoundingClientRect().bottom - top;
      return { x: t.left + 1, y: top, width: height * 1.5, height };
    });
  },
};
