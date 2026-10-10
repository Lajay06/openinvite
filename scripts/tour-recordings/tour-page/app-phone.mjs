/**
 * The app section's phone: the daily update on a phone screen.
 *
 * Site fixes batch 2, item 1 (owner ruling 2026-10-10). One take at a 440 by
 * 956 viewport at 3x, so the video is 1320 by 2868, a large phone's screen,
 * placed in the site's own phone frame at native size, never resized.
 * Recorded frame by frame (recordStepped) along the scroll timeline below,
 * with no drawn cursor: a phone has no pointer. It starts and ends at the top,
 * so the loop does not jump.
 */
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
// [start second, end second, from y, to y]; holds between moves.
const MOVES = [[2.0, 3.6, 0, 520], [5.4, 7.0, 520, 1120], [8.8, 10.8, 1120, 0]];

export default {
  key: 'app-phone',
  startPath: '/DailyUpdate',
  cursor: false,
  bitrate: '700k',
  seconds: 12,
  viewports: [{ width: 440, height: 956, label: '440', deviceScaleFactor: 3 }],
  scrollAt(t) {
    let y = 0;
    for (const [a, b, from, to] of MOVES) {
      if (t >= b) y = to;
      else if (t > a) return from + (to - from) * ease((t - a) / (b - a));
    }
    return y;
  },
};
