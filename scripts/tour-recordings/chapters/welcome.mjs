/**
 * CHAPTER 0, welcome: the sidebar is the map.
 *
 * The brief: "cursor travels the sidebar, pausing on Planning, Guests, Style
 * and experience, Design studio, ends on the Ava sparkle."
 *
 * DESIGN STUDIO LIVES INSIDE A COLLAPSED GROUP, so resting on it means opening
 * Guest suite first. That is not a liberty taken with the brief: it is the
 * only way the row exists to rest on, and it also shows the couple where the
 * studio is kept, which is the chapter's whole subject.
 *
 * The sidebar label is "Style & experience" with an ampersand. The chapter
 * copy spells it out, and the recording follows the product.
 */
import { openSidebar, sidebarRow } from '../lib/steps.mjs';

export default {
  key: 'welcome',
  startPath: '/DailyUpdate',
  async perform(page, cursor, { isPhone }) {
    await cursor.hold(600);
    await openSidebar(page, cursor, isPhone);

    for (const label of ['Planning', 'Guests', 'Style & experience']) {
      await cursor.moveTo(sidebarRow(page, label));
      await cursor.hold(1300);
    }

    // Open the group that holds the studio, then rest on the row itself.
    await cursor.click(sidebarRow(page, 'Guest suite'));
    await page.waitForTimeout(700);
    await cursor.moveTo(sidebarRow(page, 'Design studio'));
    await cursor.hold(1100);

    await cursor.moveTo('button[aria-label="Chat with Ava"]');
    await cursor.hold(1400);
  },
};
