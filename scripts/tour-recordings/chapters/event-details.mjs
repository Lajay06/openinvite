/**
 * CHAPTER 1, event-details: the theme, and where it shows up.
 *
 * The brief: "Theme tab, click two aesthetic pills and one atmosphere pill,
 * pan to the dress-code pills."
 *
 * THE DRESS CODE PILLS LIVE INSIDE AN EVENT'S EDIT FORM (EventDetails.jsx:382),
 * not on the Theme tab, so "pan to" means going to Events and opening one. The
 * chapter's own tip is about dress code, so showing where it is set is the
 * point rather than a detour.
 *
 * The accordions open collapsed, by house rule, so the aesthetic group is
 * opened before its pills can be pressed.
 */
import { visible } from '../lib/steps.mjs';

export default {
  key: 'event-details',
  startPath: '/event-details?tab=theme',
  async perform(page, cursor, { isPhone }) {
    await cursor.hold(500);
    await cursor.click(visible(page.getByText("What's the aesthetic?", { exact: true })));
    await page.waitForTimeout(700);

    for (const pill of ['Garden', 'Romantic']) {
      await cursor.click(visible(page.getByRole('button', { name: pill, exact: true })));
      await page.waitForTimeout(500);
    }

    await cursor.click(visible(page.getByText('Atmosphere', { exact: true })));
    await page.waitForTimeout(800);
    await cursor.click(visible(page.getByRole('button', { name: 'Intimate & relaxed', exact: true })));
    await page.waitForTimeout(700);

    // Where the dress code is actually set.
    await cursor.click(visible(page.getByRole('button', { name: 'Events', exact: true })));
    await page.waitForTimeout(1100);
    await cursor.click(visible(page.getByText('Edit', { exact: true })));
    await page.waitForTimeout(1200);
    const pills = visible(page.getByText('Dress code', { exact: true }));
    await pills.scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(450);
    await cursor.moveTo(pills).catch(() => {});
    await cursor.hold(900);
  },
};
