/* global document, getComputedStyle */  // used inside page.evaluate(), which runs in the browser
/**
 * /tour moment: the morning page, at the product's own size. The Daily
 * update's date and sentence and the three columns under it, 1125 by 750 (3:2) from
 * the date's corner, with no sidebar and no top bar. A number the frame's edge
 * would cut in half is hidden, as in the /features still.
 */
export default {
  key: 'tour-morning',
  startPath: '/DailyUpdate',
  viewportHeight: 1000,
  // 1325 makes the content area (the window less the 200 sidebar) exactly the
  // frame's 1125, so the sentence wraps inside it instead of running past.
  viewportWidth: 1325,
  async frame(page) {
    return page.evaluate(() => {
      const leaves = [...document.querySelectorAll('*')].filter((e) => e.childElementCount === 0);
      const date = leaves.find((e) => /^(Mon|Tues|Wednes|Thurs|Fri|Satur|Sun)day \d/.test(e.textContent.trim())).getBoundingClientRect();
      const x = date.left - 40; // the sidebar's edge
      const y = date.top - 40;
      const width = 1125; // 3:2, the site's ratio
      const height = 750;
      for (const el of leaves) {
        if (!/^\d/.test(el.textContent.trim()) || parseFloat(getComputedStyle(el).fontSize) < 36) continue;
        const block = el.parentElement;
        if (block.getBoundingClientRect().bottom > y + height) block.style.visibility = 'hidden';
      }
      return { x, y, width, height };
    });
  },
};
