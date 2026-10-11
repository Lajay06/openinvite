/* global document */  // used inside page.evaluate(), which runs in the browser
/**
 * /tour moment: replies, at the product's own size. The guest list from its
 * header down, with Guest, Category, Invited to and Last sent kept and the
 * table set to the frame's width, so each guest's answers sit beside when
 * they were last sent an invitation or reminder. A still, not a clip (owner
 * ruling 2026-10-11): the dashboard does not update live. The whole rows that
 * fit 1125 by 750 (3:2); the rest hidden.
 */
const KEEP = /^(Guest|Category|Invited to|Last sent)/;

export default {
  key: 'tour-replies',
  startPath: '/Guests',
  viewportHeight: 1400,
  async prepare(page) {
    await page.evaluate((keep) => {
      const re = new RegExp(keep);
      const table = document.querySelector('table');
      const head = [...table.querySelectorAll('thead th')];
      const drop = head.map((th, i) => (re.test(th.textContent.trim()) ? -1 : i)).filter((i) => i >= 0);
      for (const tr of table.querySelectorAll('tr')) drop.forEach((i) => { if (tr.children[i]) tr.children[i].style.display = 'none'; });
      table.style.width = '1125px';
      table.style.minWidth = '0';
    }, KEEP.source);
    await page.waitForTimeout(300);
  },
  async frame(page) {
    return page.evaluate(() => {
      const table = document.querySelector('table');
      const t = table.getBoundingClientRect();
      const top = table.querySelector('thead').getBoundingClientRect().top;
      const rows = [...table.querySelectorAll('tbody tr')];
      let keep = 0;
      while (keep < rows.length && rows[keep].getBoundingClientRect().bottom - top <= 750) keep += 1;
      rows.slice(keep).forEach((tr) => { tr.style.display = 'none'; });
      return { x: t.left, y: top, width: 1125, height: 750 };
    });
  },
};
