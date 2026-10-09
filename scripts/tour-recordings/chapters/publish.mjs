/**
 * CHAPTER 7, publish: one click, then the email that carries it.
 *
 * The brief was "Guest Suite share tab, press Publish, published state, copy
 * link." Copy Link left the product in batch 1 item 12 (email is the only way
 * the site reaches a guest, #923), so the chapter ends where the tour copy
 * already says it does: "Invitations go out by email in your names." After
 * Publish, the couple picks every guest and the cursor rests on the send
 * control. It is never pressed: footage of a send would be footage of the
 * stub's answer, not of an email going anywhere.
 *
 * AN UNPUBLISHED SITE, FOR THIS CHAPTER ONLY. The rich fixture's site is live,
 * which is right for every other chapter and leaves this one with nothing to
 * press, so `seed` hands the recorder the same couple a moment earlier.
 * Pressing Publish turns the header into Unpublish plus View Live Site; the
 * backend under the page is the render harness's stub and no real wedding is
 * touched.
 */
import { visible, wheelBy } from '../lib/steps.mjs';

// THE OWNER'S LINE, verbatim (2026-10-09). The product leaves this box blank
// for the couple to write, and a blank box was the end of the chapter. Not
// edited here for any reason; if it has to change, the owner changes it.
const MESSAGE = 'Everything you need is on the site. We would love your reply by 18 June.';

export default {
  key: 'publish',
  startPath: '/studio/guest-suite/share',
  seed(base) {
    const [wd, ...rest] = base.WeddingDetails;
    return { ...base, WeddingDetails: [{ ...wd, websiteEnabled: false }, ...rest] };
  },
  async perform(page, cursor, { isPhone }) {
    await cursor.hold(600);
    await cursor.moveTo('[data-tour-target="guest-suite-publish"]');
    await cursor.hold(700);
    await cursor.click('[data-tour-target="guest-suite-publish"]');
    await page.waitForTimeout(2000);
    await cursor.hold(800);

    await cursor.click(visible(page.getByRole('button', { name: /^All Guests \(\d+\)$/ })));
    await page.waitForTimeout(600);
    await cursor.hold(500);

    await cursor.moveToPoint(isPhone ? 190 : 560, isPhone ? 560 : 620);
    await wheelBy(page, isPhone ? 900 : 520, { steps: 14, pause: 60 });
    await cursor.hold(400);
    await cursor.click(visible(page.locator('textarea')));
    await page.keyboard.type(MESSAGE, { delay: 18 });
    await cursor.hold(400);
    await cursor.moveTo(visible(page.getByRole('button', { name: /^Send to \d+ guests?$/ })));
    await cursor.hold(1000);
  },
};
