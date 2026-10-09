/**
 * /tour scene, your site: what a guest opens.
 *
 * The couple's published site in the florence universe, as /w/<slug> renders
 * it from the rich fixture's published record. This is the couple's design,
 * so nothing in it is chrome. The clip holds on the hero, reads down the home
 * page, then opens the Celebration page where the weekend's events are.
 */
import { visible, wheelBy } from '../lib/steps.mjs';

export default {
  key: 'site',
  startPath: '/w/isla-and-kai',
  async perform(page, cursor, { isPhone }) {
    await cursor.hold(2600);
    await cursor.moveToPoint(isPhone ? 190 : 720, isPhone ? 600 : 560);
    await wheelBy(page, isPhone ? 900 : 700, { steps: 16, pause: 60 });
    await cursor.hold(1600);
    if (!isPhone) {
      await cursor.click(visible(page.getByRole('link', { name: 'Celebration', exact: true })
        .or(page.getByRole('button', { name: 'Celebration', exact: true }))));
      await page.waitForTimeout(2200);
      await cursor.moveToPoint(720, 560);
      await wheelBy(page, 600, { steps: 14, pause: 60 });
    } else {
      await wheelBy(page, 700, { steps: 14, pause: 60 });
    }
    await cursor.hold(1800);
  },
};
