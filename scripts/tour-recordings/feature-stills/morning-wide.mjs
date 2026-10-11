/* global document, window, getComputedStyle */  // used inside page.evaluate(), which runs in the browser
/**
 * Feature still: the morning page, as the band at the top of the Customizable
 * Dashboard section on /features (owner ruling 2026-10-12): full width, 2:1.
 *
 * At 1440 the band is the page less the section's 64px gutters, 1312 wide, so
 * the window is 1512: the 200 sidebar plus a content area exactly 1312 wide,
 * which puts the product at its own size in the band. Framed from the bottom
 * of the page header (kept out) across the whole content area, 1312 by 656:
 * the date, the sentence, and the top of the three columns. A number the
 * frame's edge would cut in half is hidden, as in ./morning.mjs.
 */
export default {
  key: 'feature-morning-wide',
  startPath: '/DailyUpdate',
  viewportWidth: 1512,
  viewportHeight: 1000,
  ratio: 2,
  async frame(page) {
    return page.evaluate(() => {
      const leaves = [...document.querySelectorAll('*')].filter((e) => e.childElementCount === 0);
      const date = leaves.find((e) => /^(Mon|Tues|Wednes|Thurs|Fri|Satur|Sun)day \d/.test(e.textContent.trim())).getBoundingClientRect();
      const x = date.left - 40; // the sidebar's edge
      const y = date.top - 48; // just under the page header's rule
      const width = window.innerWidth - x;
      const height = width / 2;
      for (const el of leaves) {
        if (!/^\d/.test(el.textContent.trim()) || parseFloat(getComputedStyle(el).fontSize) < 36) continue;
        const block = el.parentElement;
        if (block.getBoundingClientRect().bottom > y + height) block.style.visibility = 'hidden';
      }
      return { x, y, width, height };
    });
  },
};
