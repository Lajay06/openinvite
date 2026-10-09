/**
 * Still: the guest list at 390 with a reply that came in today.
 *
 * The product has no "new reply" marker, so the fresh reply is shown the way
 * the product shows any reply: the top household's row opened, with the
 * guest's name and the Responded date, today's (the rich fixture has that
 * household reply an hour before the still is taken). Owner rulings
 * 2026-10-10.
 */
/* global window, document, getComputedStyle */  // used inside page.evaluate(), which runs in the browser
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
    // At 390 the guest table is wider than the phone and scrolls sideways, so
    // the guest's name and the Responded date cannot be in view together.
    // OWNER RULING 2026-10-10: crop the reply table so both are. The four
    // middle columns of the reply details (Invited, Status, Meal, Plus-one)
    // are hidden for this still, leaving Event and Responded side by side
    // under the guest's name; status is off-frame by that ruling. Nothing is
    // added or rewritten: what shows is the product's own text.
    await page.evaluate(() => {
      const rows = [...document.querySelectorAll('div')].filter((d) => d.style.gridTemplateColumns === '1.3fr 0.8fr 0.8fr 0.7fr 1.1fr 0.9fr');
      for (const row of rows) {
        row.style.gridTemplateColumns = '1.3fr 0.9fr';
        [...row.children].forEach((cell, i) => { if (i >= 1 && i <= 4) cell.style.display = 'none'; });
      }
      const wrap = [...document.querySelectorAll('div')].find((d) => getComputedStyle(d).overflowX === 'auto' && d.scrollWidth > d.clientWidth && d.querySelector('table'));
      if (wrap) wrap.scrollLeft = 0;
      const box = rows[0]?.parentElement;
      if (box) box.style.maxWidth = '300px';
    });
    await page.waitForTimeout(400);
  },
};
