/**
 * scripts/tour-recordings/lib/ffmpeg.mjs
 *
 * THE ENCODER THIS CHECKOUT ALREADY HOLDS.
 *
 * The recording brief asks for 30 fps or better. Playwright's own
 * `recordVideo` cannot do it: its encoder rate is the constant `fps = 25` in
 * playwright-core's bundle, with no option that reaches it. Re-encoding a
 * 25 fps capture to 30 would duplicate frames and report a number the footage
 * does not have.
 *
 * What Playwright DOES ship is ffmpeg, downloaded beside the browsers at
 * ms-playwright/ffmpeg-<build>/. So the frames are captured here, at the rate
 * this file asks for, and handed to that binary. No new dependency, and the
 * stop condition the goal set (a credential or tool the checkout does not
 * already hold) is not met.
 *
 * It is a DELIBERATELY STRIPPED build: mjpeg in, VP8 in a webm out, and
 * nothing else. That is not a limitation here, it is the shape of the plan
 * already recorded in src/lib/studioTour.js: webm is what we upload, and the
 * mp4 and the poster are Cloudinary delivery derivatives of that same asset.
 */
import { existsSync, readdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { homedir, platform } from 'node:os';
import { join } from 'node:path';

/** Where Playwright keeps its browsers and its ffmpeg, per platform. */
function cacheRoot() {
  if (process.env.PLAYWRIGHT_BROWSERS_PATH) return process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (platform() === 'darwin') return join(homedir(), 'Library', 'Caches', 'ms-playwright');
  if (platform() === 'win32') return join(homedir(), 'AppData', 'Local', 'ms-playwright');
  return join(homedir(), '.cache', 'ms-playwright');
}

/**
 * The ffmpeg Playwright installed.
 *
 * GLOBBED, NOT PINNED. The directory carries a build number (ffmpeg-1011 at
 * the time of writing) that changes when Playwright is upgraded, so pinning it
 * would break on the next `npm i` and read as a missing binary.
 */
export function ffmpegPath() {
  const root = cacheRoot();
  if (!existsSync(root)) return null;
  const dirs = readdirSync(root).filter((d) => d.startsWith('ffmpeg-')).sort().reverse();
  const names = ['ffmpeg-mac', 'ffmpeg-linux', 'ffmpeg-win64.exe', 'ffmpeg'];
  for (const d of dirs) {
    for (const n of names) {
      const p = join(root, d, n);
      if (existsSync(p)) return p;
    }
  }
  return null;
}

/**
 * Start an encoder reading MJPEG frames from stdin and writing one webm.
 *
 * THE RATE IS SET ON BOTH SIDES. `-framerate` tells the image2pipe demuxer how
 * to stamp the frames it is handed; `-r` tells the muxer what to write. Set
 * only the second and a pipe with no timestamps still lands at the right
 * length, but the first is what makes the stamps honest.
 *
 * The caller must write EXACTLY `fps` frames for every second of footage,
 * repeating the last frame when the page has not changed. A screencast only
 * emits on change, so a pipe fed only by new frames produces a video shorter
 * than the interaction it recorded.
 */
export function startEncoder({ outputFile, width, height, fps = 30, bitrate = '900k' }) {
  const bin = ffmpegPath();
  if (!bin) throw new Error('No ffmpeg found in the Playwright cache. Run `npx playwright install` first.');
  const args = [
    '-loglevel', 'error',
    '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', 'pipe:0',
    '-y', '-an',
    '-r', String(fps),
    '-c:v', 'vp8', '-b:v', bitrate, '-qmin', '4', '-qmax', '48', '-crf', '12',
    '-deadline', 'good', '-cpu-used', '2', '-threads', '4',
    // Pad then crop to the exact size, the way Playwright's own recorder does:
    // a screencast frame can come back a pixel or two off the viewport.
    '-vf', `pad=${width}:${height}:0:0:gray,crop=${width}:${height}:0:0`,
    outputFile,
  ];
  const proc = spawn(bin, args, { stdio: ['pipe', 'ignore', 'pipe'] });
  const errors = [];
  proc.stderr.on('data', (d) => errors.push(String(d)));
  // A closed pipe is not a crash here: the encoder can exit first on a bad
  // frame, and the writer would otherwise take the whole run down with EPIPE.
  proc.stdin.on('error', () => {});
  return {
    write(frame) {
      if (proc.stdin.writable) proc.stdin.write(frame);
    },
    async finish() {
      await new Promise((resolve) => {
        proc.on('close', resolve);
        proc.stdin.end();
      });
      return { errors: errors.join('').trim() };
    },
  };
}
