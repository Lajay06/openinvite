/* global document */  // used inside page.evaluate(), which runs in the browser
/**
 * Feature still: the guest suite. The published site's Celebration page, as a
 * guest sees it: the day, then the ceremony with its time, its place and what
 * to wear. The couple's own design (florence, from the rich fixture), so
 * nothing in it is chrome; framed from the day's date to the end of the first
 * event.
 */
export default {
  key: 'feature-suite',
  startPath: '/w/isla-and-kai/celebration',
  viewportHeight: 1000,
  async frame(page) {
    return page.evaluate(() => {
      const leaves = [...document.querySelectorAll('*')].filter((e) => e.childElementCount === 0);
      const day = leaves.find((e) => /^Sunday$/i.test(e.textContent.trim())).getBoundingClientRect();
      const ceremony = leaves.find((e) => e.textContent.trim() === 'Ceremony');
      let block = ceremony;
      while (block && !/save you/.test(block.textContent)) block = block.parentElement;
      const b = block.getBoundingClientRect();
      const height = b.bottom + 24 - (day.top - 24);
      return { x: day.left - 24, y: day.top - 24, width: height * 1.5, height };
    });
  },
};
