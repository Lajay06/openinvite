/**
 * CHAPTER 2, schedule: one list, and the two sheets it exports.
 *
 * The brief: "scroll the schedule, open the export menu, rest on the two-sheet
 * option."
 *
 * THERE IS NO EXPORT MENU, and inventing one on film would be worse than
 * adapting. ScheduleHub.jsx:365 is a single button that writes the workbook
 * directly, and the two sheets the chapter's tip names, All events and Run
 * sheet, are the workbook's contents rather than a choice offered first. So
 * the cursor rests on Export, which is this chapter's spotlight target, and
 * then opens the Run sheet tab: the same two things, shown where the product
 * actually keeps them.
 *
 * Export is NOT pressed. It downloads a file, which in a headless browser is a
 * dialog nobody sees and, in the footage, a click that does nothing.
 */
import { wheelBy, visible } from '../lib/steps.mjs';

export default {
  key: 'schedule',
  startPath: '/Schedule',
  async perform(page, cursor, { isPhone }) {
    await cursor.hold(900);
    await cursor.moveToPoint(isPhone ? 190 : 700, isPhone ? 500 : 560);
    await wheelBy(page, 420, { steps: 14, pause: 60 });
    await cursor.hold(1200);
    await wheelBy(page, -420, { steps: 10, pause: 50 });
    await cursor.hold(900);

    await cursor.moveTo('[data-tour-target="schedule-export"]');
    await cursor.hold(2000);

    await cursor.click(visible(page.getByRole('button', { name: 'Run sheet', exact: true })));
    await page.waitForTimeout(1800);
    await cursor.hold(1600);
  },
};
