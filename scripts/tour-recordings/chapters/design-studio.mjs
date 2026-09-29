/**
 * CHAPTER 5, design-studio: one universe, carried everywhere.
 *
 * The brief: "My Universe card, choose a universe, the preview re-themes."
 *
 * The studio hub holds two cards; My Universe carries this chapter's spotlight
 * target. Opening it lists every universe, and opening one of those is the
 * re-theme: the detail page is drawn in that universe's own type, palette and
 * photography, which is the thing the chapter is claiming.
 *
 * "MAKE THIS MY UNIVERSE" IS NOT PRESSED. The recording would then show a
 * couple changing their wedding's whole look on camera for no reason, and the
 * fixture's own universe is London, which chapter 8 and the guest-suite
 * chapter both still need.
 */
import { wheelBy, visible } from '../lib/steps.mjs';

export default {
  key: 'design-studio',
  startPath: '/studio',
  async perform(page, cursor, { isPhone }) {
    await cursor.hold(1100);
    await cursor.click('[data-tour-target="studio-my-universe"]');
    await page.waitForTimeout(3200);

    await cursor.moveToPoint(isPhone ? 190 : 720, isPhone ? 520 : 560);
    await wheelBy(page, 320, { steps: 12, pause: 80 });
    await cursor.hold(1100);

    await cursor.click(visible(page.getByText('Organic luxury', { exact: false })));
    await page.waitForTimeout(3400);
    await cursor.hold(1400);
    await wheelBy(page, 380, { steps: 12, pause: 80 });
    await cursor.hold(1800);
  },
};
