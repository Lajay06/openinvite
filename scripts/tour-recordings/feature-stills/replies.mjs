/* global document */  // used inside page.evaluate(), which runs in the browser
/**
 * Feature still: replies. The guest list's rows, each guest's name beside
 * their answer for every event. A still, not a clip (owner ruling
 * 2026-10-11): the dashboard does not update live, so a clip of replies
 * "arriving" would show something the product does not do.
 *
 * Only Guest and Invited to are kept, packed together, as the vendors still
 * and the phone reply still keep only their telling columns (owner ruling
 * 2026-10-10). The whole rows that fit 3:2; nothing above the table's header.
 *
 * MEASURED AFTER HIDING, NOT BEFORE. The first version measured the columns
 * and then hid the rows that did not fit; the rows it hid were the ones with
 * the longest content, the columns narrowed, and the next column slid into
 * the frame.
 */
const KEEP = /^(Guest|Invited to)/;

export default {
  key: 'feature-replies',
  startPath: '/Guests',
  viewportHeight: 1400,
  async prepare(page) {
    await page.evaluate((keep) => {
      const re = new RegExp(keep);
      const table = document.querySelector('table');
      const head = [...table.querySelectorAll('thead th')];
      // The checkbox column goes too; the row's expand chevron sits in the
      // Guest cell and stays, as it is part of how the row reads.
      const drop = head.map((th, i) => (re.test(th.textContent.trim()) ? -1 : i)).filter((i) => i >= 0);
      for (const tr of table.querySelectorAll('tr')) drop.forEach((i) => { if (tr.children[i]) tr.children[i].style.display = 'none'; });
      table.style.width = 'auto';
      table.style.minWidth = '0';
    }, KEEP.source);
    await page.waitForTimeout(300);
  },
  async frame(page) {
    const measure = () => page.evaluate(() => {
      const table = document.querySelector('table');
      const t = table.getBoundingClientRect();
      const top = table.querySelector('thead').getBoundingClientRect().top;
      return { x: t.left, top, width: t.width };
    });
    let m = await measure();
    await page.evaluate(({ top, width }) => {
      const rows = [...document.querySelectorAll('table tbody tr')];
      let keep = 0;
      while (keep < rows.length && rows[keep].getBoundingClientRect().bottom - top <= width / 1.5) keep += 1;
      rows.slice(keep).forEach((tr) => { tr.style.display = 'none'; });
    }, m);
    await page.waitForTimeout(200);
    m = await measure();
    return { x: m.x, y: m.top, width: m.width, height: m.width / 1.5 };
  },
};
