/* global document */  // used inside page.evaluate(), which runs in the browser
/**
 * Feature still: the budget. The Forecasting tab's Risk flags card: for each
 * flagged category, what was budgeted, what was spent and the benchmark. The
 * proposal's "planned, paid and still owed line with four category bars" is
 * not a view the product has (neither tab draws category bars), so this is
 * the nearest real view of the same thing, framed tight.
 */
export default {
  key: 'feature-budget',
  startPath: '/Budget',
  viewportHeight: 1400,
  async prepare(page) {
    await page.getByRole('tab', { name: 'Forecasting' }).or(page.getByRole('button', { name: 'Forecasting' })).first().click();
    await page.waitForTimeout(1500);
  },
  async frame(page) {
    return page.evaluate(() => {
      // The card is the nearest ancestor of its title that also holds the
      // flagged categories' figures.
      const title = [...document.querySelectorAll('*')].find((e) => e.childElementCount === 0 && e.textContent.trim() === 'Risk flags' && e.getBoundingClientRect().width > 0);
      let card = title;
      while (card && !/Budgeted:/.test(card.textContent)) card = card.parentElement;
      return card.getBoundingClientRect().toJSON();
    });
  },
};
