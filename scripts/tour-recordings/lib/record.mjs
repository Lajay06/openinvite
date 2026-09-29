/**
 * scripts/tour-recordings/lib/record.mjs
 *
 * ONE RECORDING: a seeded studio, a drawn cursor, and frames at a steady rate.
 *
 * WHY NOT playwright's recordVideo. Its encoder runs at the constant fps = 25
 * in playwright-core's bundle and no option reaches it, so it cannot meet the
 * brief's "30 fps or better". Frames are captured here through the DevTools
 * screencast and handed to the ffmpeg Playwright already installed. See
 * ./ffmpeg.mjs.
 *
 * THE PACER IS THE WHOLE TRICK. A screencast emits a frame when the page
 * CHANGES, so a pipe fed only by new frames produces a video shorter than the
 * interaction, and a still moment vanishes rather than reading as a pause. The
 * pacer writes `fps` frames for every second of wall clock, repeating the last
 * frame when nothing moved. Duration out equals duration recorded, which is
 * what lets the guard compare a chapter's measured length against the
 * `seconds` its data claims.
 *
 * REAL IMAGES, COUNTED. Every other caller of the harness blocks
 * res.cloudinary.com, because our own test loop was 95.6% of a 38.5 GB month
 * (scripts/lib/blockRemoteImages.mjs). A recording is the case that comment
 * anticipated: a universe hero drawn as a 1x1 transparent GIF would be a
 * recording of a broken page. So this context lets them through and COUNTS
 * them, and the runner prints the count, because an unbounded exception is how
 * that bill came back the first time.
 */
import { chromium } from 'playwright';
import { mkdirSync, statSync } from 'node:fs';
import { dirname } from 'node:path';
import { SEED, stubBackend, FIXTURE_USER } from '../../lib/renderHarness.mjs';
import { countRemoteImages } from '../../lib/blockRemoteImages.mjs';
import { installCursor, cursorFor } from './cursor.mjs';
import { startEncoder } from './ffmpeg.mjs';

export const FPS = 30;
export const WIDTHS = [
  { width: 1440, height: 900, label: '1440' },
  { width: 390, height: 844, label: '390' },
];

/**
 * The fixture couple, with the tour already behind them.
 *
 * SEED already carries guidanceState.tourSeenAt set, and that matters more
 * here than anywhere: an unseeded fixture opens the first-run takeover over
 * the dashboard, and every recording would be a recording of the tour talking
 * about itself.
 */
export const RECORDING_SEED = SEED;

/** A context that renders the studio as a couple sees it, cursor included. */
export async function recordingContext(browser, { width, height }) {
  const ctx = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
    // The recordings are read as "this is your studio", so the dates in them
    // should not depend on where the machine recording them happens to be.
    timezoneId: 'Australia/Sydney',
  });
  await ctx.addInitScript(() => {
    // A dummy string, never a real credential, exactly as seededContext does
    // it: it exists only to get AuthContext past `if (token)`.
    localStorage.setItem('base44_access_token', 'recording-harness-not-a-real-token');
    localStorage.setItem('oi_auth', '1');
  });
  await stubBackend(ctx, { seed: RECORDING_SEED, user: FIXTURE_USER });
  await installCursor(ctx);
  ctx.__cloudinary = countRemoteImages(ctx);
  return ctx;
}

/**
 * Capture frames from one page into one webm until `stop()`.
 *
 * @returns {{ stop: () => Promise<{ file: string, frames: number, seconds: number, bytes: number }> }}
 */
export async function startCapture(page, { outputFile, width, height, fps = FPS, bitrate }) {
  mkdirSync(dirname(outputFile), { recursive: true });
  const encoder = startEncoder({ outputFile, width, height, fps, bitrate });
  const cdp = await page.context().newCDPSession(page);
  let latest = null;
  let written = 0;
  let stopped = false;

  cdp.on('Page.screencastFrame', async (frame) => {
    latest = Buffer.from(frame.data, 'base64');
    // ACK OR THE STREAM STOPS. Chromium sends the next frame only once the
    // previous one is acknowledged; without this the capture delivers one
    // frame and then silence.
    await cdp.send('Page.screencastFrameAck', { sessionId: frame.sessionId }).catch(() => {});
  });

  await cdp.send('Page.startScreencast', {
    format: 'jpeg', quality: 92, maxWidth: width, maxHeight: height, everyNthFrame: 1,
  });

  // Wait for the first frame, so the pacer never has nothing to write.
  const firstFrameBy = Date.now() + 5000;
  while (!latest && Date.now() < firstFrameBy) await page.waitForTimeout(20);
  if (!latest) throw new Error('No screencast frame arrived in 5s.');

  const started = Date.now();
  const interval = setInterval(() => {
    if (stopped || !latest) return;
    // SELF CORRECTING, not a fixed 33 ms. setInterval drifts, and a drifting
    // pacer makes a 14-second interaction into a 15-second video that the
    // duration guard then reports as wrong.
    const due = Math.round((Date.now() - started) / (1000 / fps));
    let behind = due - written;
    if (behind > 6) behind = 6; // never burst a stall into a freeze-frame
    for (let i = 0; i < behind; i += 1) { encoder.write(latest); written += 1; }
  }, Math.round(1000 / fps));

  return {
    get frames() { return written; },
    async stop() {
      stopped = true;
      clearInterval(interval);
      await cdp.send('Page.stopScreencast').catch(() => {});
      const { errors } = await encoder.finish();
      if (errors) throw new Error(`ffmpeg: ${errors}`);
      const bytes = statSync(outputFile).size;
      return { file: outputFile, frames: written, seconds: +(written / fps).toFixed(2), bytes };
    },
  };
}

/**
 * Record one chapter at one width, start to finish.
 *
 * `chapter.perform(page, cursor, ctxInfo)` is the only part that differs per
 * chapter, which is why each one is its own file in ../chapters/.
 */
export async function recordChapter(chapter, { width, height, label, base, outDir, holdMs = 1000 }) {
  const browser = await chromium.launch();
  const ctx = await recordingContext(browser, { width, height });
  const page = await ctx.newPage();
  const outputFile = `${outDir}/${chapter.key}-${label}.webm`;
  let capture = null;
  try {
    await page.goto(`${base}${chapter.startPath}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    // THE SETTLING WAIT IS THE HARNESS'S OWN. 6.5s is what every render guard
    // uses for this app on this seed; starting the capture earlier records the
    // dashboard assembling itself.
    await page.waitForTimeout(6500);
    await page.evaluate(() => window.__oiCursor && window.__oiCursor.mount());
    const cursor = cursorFor(page);
    await cursor.place(Math.round(width * 0.5), Math.round(height * 0.45));

    capture = await startCapture(page, { outputFile, width, height, fps: FPS, bitrate: chapter.bitrate });
    await chapter.perform(page, cursor, { width, height, label, isPhone: width < 700, base });
    // ONE SECOND ON THE LAST FRAME, per the brief, so a loop does not snap.
    await page.waitForTimeout(holdMs);
    const result = await capture.stop();
    capture = null;
    return { ...result, cloudinary: ctx.__cloudinary.requested };
  } finally {
    if (capture) await capture.stop().catch(() => {});
    await ctx.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}
