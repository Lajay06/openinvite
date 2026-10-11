/* global document */  // used inside page.evaluate(), which runs in the browser
/**
 * Feature still: replies arriving. The guest list's rows, from the guest's
 * name to the per-event answers, as the couple sees them land. A still, not a
 * clip (owner ruling 2026-10-11): the dashboard does not update live, so a
 * clip of replies "arriving" would show something the product does not do.
 * The whole rows that fit the 3:2 frame; nothing above the table's header.
 */
export default {
  key: 'feature-replies',
  startPath: '/Guests',
  viewportHeight: 1400,
  async frame(page) {
    return page.evaluate(() => {
      const table = document.querySelector('table');
      const head = [...table.querySelectorAll('th')];
      const guest = head.find((th) => /Guest/.test(th.textContent)).getBoundingClientRect();
      const invited = head.find((th) => /Invited to/.test(th.textContent)).getBoundingClientRect();
      const x = guest.left - 40;
      const width = invited.right - x;
      const top = table.querySelector('thead').getBoundingClientRect().top;
      // The whole rows that fit in 3:2; the rows after them are hidden for
      // the still, so the frame ends on a row's edge, not halfway through one.
      const rows = [...table.querySelectorAll('tbody tr')];
      let keep = 0;
      while (keep < rows.length && rows[keep].getBoundingClientRect().bottom - top <= width / 1.5) keep += 1;
      rows.slice(keep).forEach((tr) => { tr.style.display = 'none'; });
      return { x, y: top, width, height: width / 1.5 };
    });
  },
};
