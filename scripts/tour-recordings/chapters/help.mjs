/**
 * CHAPTER 8, help: the question mark is always there.
 *
 * The brief: "cursor to the '?', panel opens on this page's chapter, close."
 *
 * Recorded from the guest list on purpose. The panel opens on the page's OWN
 * chapter, so a page whose chapter is this one would show the tour describing
 * itself; from /Guests it opens on The people, which is the behavior the
 * chapter is actually describing.
 */
import { visible } from '../lib/steps.mjs';

export default {
  key: 'help',
  startPath: '/Guests',
  async perform(page, cursor) {
    await cursor.hold(900);
    await cursor.moveTo('[data-tour-target="whats-here-control"]');
    await cursor.hold(900);
    await cursor.click('[data-tour-target="whats-here-control"]');
    await page.waitForTimeout(2200);
    await cursor.hold(2200);

    const close = visible(page.locator('[data-studio-tour]').getByRole('button', { name: /close/i }));
    if (await close.isVisible().catch(() => false)) await cursor.click(close);
    else await page.keyboard.press('Escape');
    await page.waitForTimeout(1200);
  },
};
