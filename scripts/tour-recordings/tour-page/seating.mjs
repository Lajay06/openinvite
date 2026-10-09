/**
 * /tour scene, seating: the floor plan with the room already set.
 *
 * No studio tour chapter films Seating, so /tour gets its own clip. The rich
 * fixture seats 168 of 190 guests at 18 tables, which is the state a couple six
 * weeks out is actually in: most of the room placed, a short list still to go.
 * The clip shows the room, then who is left to place and who is placed.
 */
import { visible, wheelBy } from '../lib/steps.mjs';

export default {
  key: 'seating',
  startPath: '/Seating',
  async perform(page, cursor, { isPhone }) {
    await cursor.hold(1200);
    await cursor.moveToPoint(isPhone ? 190 : 760, isPhone ? 520 : 640);
    await wheelBy(page, isPhone ? 520 : 260, { steps: 12, pause: 60 });
    await cursor.hold(1400);
    // NO CLICK ON A TABLE NAME. "Wattle" is also the table label on every
    // guest card seated there, and a click on a seated card asks to unassign
    // them through a native confirm, which would freeze the recording.
    await cursor.click(visible(page.getByRole('button', { name: 'Unassigned', exact: true })));
    await page.waitForTimeout(1300);
    await cursor.hold(1500);
    await cursor.click(visible(page.getByRole('button', { name: 'Assigned', exact: true })));
    await page.waitForTimeout(1300);
    await cursor.hold(1800);
  },
};
