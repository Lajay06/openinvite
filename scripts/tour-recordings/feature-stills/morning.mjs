/* global document, getComputedStyle */  // used inside page.evaluate(), which runs in the browser
/**
 * Feature still: the morning page. The Daily update's date and its one
 * sentence, with the top of the three columns under it (This week, Ava's
 * briefing, the couple's numbers). Framed from the date to the sentence's
 * right edge, which is wide enough that 3:2 reaches into the columns;
 * the page header above the date stays out, and a number the frame's edge
 * would cut in half is hidden.
 *
 * The sentence had an em dash ("nothing's on you today, 77 invitations"); the
 * owner ruled the still passes the same dash rule as copy, and the dash was
 * fixed in the product (src/lib/dayState.js) before this was shot.
 */
export default {
  key: 'feature-morning',
  startPath: '/DailyUpdate',
  // At 1440 the sentence runs two lines across the page and the frame is
  // 1208 wide, so at 552 the columns under it are unreadable. A 1024 window
  // wraps it to three lines and frames about 790 wide.
  viewportWidth: 1024,
  async frame(page) {
    return page.evaluate(() => {
      // The sentence, not the page header's own h1: the largest one on the page.
      const h1 = [...document.querySelectorAll('h1')].sort((a, b) => parseFloat(getComputedStyle(b).fontSize) - parseFloat(getComputedStyle(a).fontSize))[0];
      const s = h1.getBoundingClientRect();
      const leaves = [...document.querySelectorAll('*')].filter((e) => e.childElementCount === 0);
      const date = leaves.find((e) => /^(Mon|Tues|Wednes|Thurs|Fri|Satur|Sun)day \d/.test(e.textContent.trim())).getBoundingClientRect();
      const x = date.left - 24;
      const y = date.top - 24;
      const width = s.right + 24 - x;
      const height = width / 1.5;
      // The numbers column runs past the frame; a figure cut in half reads as
      // a broken page, so any number block not wholly inside is hidden (its
      // space kept, so nothing above it moves).
      for (const el of leaves) {
        if (!/^\d/.test(el.textContent.trim()) || parseFloat(getComputedStyle(el).fontSize) < 36) continue;
        const block = el.parentElement;
        if (block.getBoundingClientRect().bottom > y + height) block.style.visibility = 'hidden';
      }
      return { x, y, width, height };
    });
  },
};
