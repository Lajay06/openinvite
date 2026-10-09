/**
 * /tour scene, budget: what was planned, what is committed, what is paid.
 *
 * No studio tour chapter films the Budget page. Every figure here is in the
 * account's currency (A$ for this couple) with thousands separators and no
 * conversion, which is the product since #932.
 */
import { visible, wheelBy } from '../lib/steps.mjs';

export default {
  key: 'budget',
  startPath: '/Budget',
  async perform(page, cursor, { isPhone }) {
    await cursor.hold(1600);
    await cursor.click(visible(page.getByRole('tab', { name: 'Expenses', exact: true })));
    await page.waitForTimeout(1500);
    await cursor.moveToPoint(isPhone ? 190 : 760, isPhone ? 560 : 620);
    await wheelBy(page, isPhone ? 700 : 420, { steps: 14, pause: 60 });
    await cursor.hold(1400);
    await wheelBy(page, isPhone ? 600 : 360, { steps: 12, pause: 60 });
    await cursor.hold(1600);
  },
};
