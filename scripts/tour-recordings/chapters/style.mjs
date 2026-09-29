/**
 * CHAPTER 4, style: the music table takes requests, and you answer them.
 *
 * The brief: "Music page, Create playlist, one request appears, approve it."
 *
 * CREATE PLAYLIST IS RESTED ON, NOT PRESSED. It is this chapter's spotlight
 * target, and pressing it opens a flow that has nothing to do with the
 * sentence the chapter is illustrating. The request is already waiting in the
 * fixture, so "one request appears" is the Waiting on you filter showing it,
 * and then it is approved for real.
 */
import { wheelBy, visible } from '../lib/steps.mjs';

export default {
  key: 'style',
  startPath: '/Music',
  async perform(page, cursor, { isPhone }) {
    await cursor.hold(1000);
    await cursor.moveTo('[data-tour-target="music-create-playlist"]');
    await cursor.hold(2000);

    await cursor.click(visible(page.getByRole('button', { name: /Waiting on you/ })));
    await page.waitForTimeout(2200);
    await cursor.moveToPoint(isPhone ? 190 : 700, isPhone ? 540 : 600);
    await wheelBy(page, 180, { steps: 8, pause: 55 });
    await cursor.hold(1200);

    await cursor.click(visible(page.getByRole('button', { name: 'Approve', exact: true })));
    await page.waitForTimeout(2400);
    await cursor.hold(1800);
  },
};
