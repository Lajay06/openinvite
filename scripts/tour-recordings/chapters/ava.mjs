/**
 * CHAPTER 6, ava: she has read all of it.
 *
 * The brief: "open Ava, type 'What am I missing for the ceremony?', show the
 * reply."
 *
 * THE REPLY IS THE OWNER'S OWN TEXT, supplied for this recording and held in
 * ../lib/avaFixture.mjs. Nothing in src/ imports it and no production build can
 * reach it. The chapter stopped the first recording run without it, because the
 * harness stubs InvokeLLM and the pod rendered "I'm having trouble responding
 * right now": filming that would have been footage of Ava failing.
 *
 * THE QUESTION IS TYPED, NOT FILLED. `fill()` puts the whole sentence in at
 * once, which reads as a paste rather than as a couple asking something. The
 * reply then arrives the way the product delivers one: three pulsing dots
 * while `loading` is true (AvaChatPod.jsx:315), then the finished bubble. The
 * pod does not stream, so nothing here pretends it does.
 */
import { visible } from '../lib/steps.mjs';
import { AVA_QUESTION } from '../lib/avaFixture.mjs';

export default {
  key: 'ava',
  startPath: '/DailyUpdate',
  async perform(page, cursor, { isPhone }) {
    await cursor.hold(700);
    await cursor.click('button[aria-label="Chat with Ava"]');
    await page.waitForTimeout(1200);

    const composer = visible(page.locator('[data-tour-target="ava-composer"]').or(page.locator('textarea')));
    await cursor.click(composer);
    await page.waitForTimeout(400);
    await page.keyboard.type(AVA_QUESTION, { delay: 42 });
    await cursor.hold(700);

    await page.keyboard.press('Enter');
    // The dots, then the bubble. The fixture holds the reply back so both are
    // on camera; the wait is longer than the hold so the answer is read, not
    // glimpsed.
    await page.waitForTimeout(2800);
    await cursor.hold(1200);
    await cursor.moveToPoint(isPhone ? 200 : 1100, isPhone ? 430 : 520);
    await cursor.hold(1400);
  },
};
