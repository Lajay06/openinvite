/* global document */  // used inside page.evaluate(), which runs in the browser
/**
 * Feature still: the morning page. The Daily update's date and its one
 * sentence, with the top of the three columns under it (This week, Ava's
 * briefing, the couple's numbers). Framed from the date to the sentence's
 * right edge, which at 1440 is wide enough that 3:2 reaches into the columns;
 * the page header above the date stays out.
 *
 * The sentence had an em dash ("nothing's on you today, 77 invitations"); the
 * owner ruled the still passes the same dash rule as copy, and the dash was
 * fixed in the product (src/lib/dayState.js) before this was shot.
 */
export default {
  key: 'feature-morning',
  startPath: '/DailyUpdate',
  async frame(page) {
    return page.evaluate(() => {
      const h1 = document.querySelector('h1');
      const s = h1.getBoundingClientRect();
      const leaves = [...document.querySelectorAll('*')].filter((e) => e.childElementCount === 0);
      const date = leaves.find((e) => /^(Mon|Tues|Wednes|Thurs|Fri|Satur|Sun)day \d/.test(e.textContent.trim())).getBoundingClientRect();
      const x = date.left - 24;
      const y = date.top - 24;
      const width = s.right + 24 - x;
      return { x, y, width, height: width / 1.5 };
    });
  },
};
