/**
 * Still: the guest list at 390 with a reply that came in today.
 *
 * The product has no "new reply" marker, so the fresh reply is shown the way
 * the product shows any reply: the top household's row opened, its details
 * reading Attending with today's date (the rich fixture has that household
 * reply an hour before the still is taken). Owner ruling 2026-10-10.
 */
import { visible } from '../lib/steps.mjs';

export default {
  key: 'guests-reply',
  startPath: '/Guests',
  async prepare(page) {
    const toggle = visible(page.locator('[aria-label="Show RSVP details"]'));
    await toggle.click();
    await page.waitForTimeout(900);
    // Bring the opened row up under the page header, so the phone shows the
    // reply rather than the stat tiles above it.
    await page.evaluate(() => {
      const row = document.querySelector('[aria-label="Hide RSVP details"]') || document.querySelector('[aria-label="Show RSVP details"]');
      if (row) window.scrollTo(0, row.getBoundingClientRect().top + window.scrollY - 140);
    });
    await page.waitForTimeout(600);
    // At 390 the guest table is wider than the phone and its wrapper scrolls
    // sideways (1287px of table in a 324px view). Status and Responded cannot
    // both fit, and the date is what shows the reply is fresh, so the wrapper
    // is scrolled until the Responded column's right edge meets the view's:
    // the still shows Meal, Plus-one and Responded, with today's date.
    await page.evaluate(() => {
      const head = [...document.querySelectorAll('span')].find((s) => s.textContent.trim() === 'Responded');
      let wrap = head;
      while (wrap && !(getComputedStyle(wrap).overflowX === 'auto' && wrap.scrollWidth > wrap.clientWidth)) wrap = wrap.parentElement;
      if (!head || !wrap) return;
      const right = head.parentElement.getBoundingClientRect().right;
      const view = wrap.getBoundingClientRect();
      wrap.scrollLeft += right - view.right + 8;
    });
    await page.waitForTimeout(400);
  },
};
