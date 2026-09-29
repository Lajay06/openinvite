/**
 * CHAPTER 7, publish: one click, then the link.
 *
 * The brief: "Guest Suite share tab, press Publish, published state, copy
 * link."
 *
 * All four happen for real against the seeded fixture: the button carries this
 * chapter's spotlight target, pressing it turns the header into Unpublish plus
 * View Live Site, and Copy Link is the control beside the share buttons. No
 * real wedding is touched; the backend under this page is the render harness's
 * stub.
 */
import { visible } from '../lib/steps.mjs';

export default {
  key: 'publish',
  startPath: '/studio/guest-suite/share',
  async perform(page, cursor, { isPhone }) {
    await cursor.hold(1300);
    await cursor.moveTo('[data-tour-target="guest-suite-publish"]');
    await cursor.hold(1200);
    await cursor.click('[data-tour-target="guest-suite-publish"]');
    await page.waitForTimeout(3200);
    await cursor.hold(2200);

    const copy = visible(page.getByRole('button', { name: 'Copy Link', exact: true })
      .or(page.getByRole('button', { name: 'Copy', exact: true })));
    await cursor.click(copy);
    await page.waitForTimeout(1800);
    await cursor.hold(1800);
  },
};
