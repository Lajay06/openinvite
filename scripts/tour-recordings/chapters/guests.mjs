/**
 * CHAPTER 3, guests: the list, the invitations, and a reply.
 *
 * The brief: "scroll the guest list, open Send invitations, close it, rest on
 * a guest row with a reply shown."
 *
 * The control is labelled "Send invites" in the product and carries this
 * chapter's spotlight target. The reply is shown by the row's own "Show RSVP
 * details" toggle, on a guest the fixture has attending.
 */
import { wheelBy, visible } from '../lib/steps.mjs';

export default {
  key: 'guests',
  startPath: '/Guests',
  async perform(page, cursor, { isPhone }) {
    await cursor.hold(600);
    await cursor.moveToPoint(isPhone ? 190 : 700, isPhone ? 520 : 600);
    await wheelBy(page, 360, { steps: 12, pause: 60 });
    await cursor.hold(600);
    await wheelBy(page, -360, { steps: 9, pause: 50 });
    await cursor.hold(400);

    // SEND INVITES IS A PAGE, NOT A DIALOG. It replaces the list with the
    // invitation composer, so "close it" is the composer's own way back and
    // Escape does nothing at all: the first version of this script pressed
    // Escape, stayed on the composer, and then waited out fifteen seconds for
    // a guest row that was no longer rendered.
    await cursor.click('[data-tour-target="guests-send-invitations"]');
    await page.waitForTimeout(2400);
    await cursor.hold(1600);
    await cursor.click(visible(page.getByRole('button', { name: 'Back to guest list' })));
    await page.waitForTimeout(2200);

    // AN ARIA-LABEL, NOT TEXT. GuestList.jsx:1011 labels this control rather
    // than writing words in it, so getByText finds nothing and waits out its
    // timeout on a button that is plainly on screen.
    const toggle = visible(page.locator('[aria-label="Show RSVP details"]'));
    await cursor.click(toggle);
    await page.waitForTimeout(1500);
    await cursor.hold(1200);
  },
};
