import { prefGet, prefSet } from '../../native';

/**
 * The hero carousel's rotation (goals 6 and 7): "Days to go" is always
 * first and the guest suite share card always last; between them two cards
 * from the pool real data backs (RSVPs, from Ava, budget, next payment, next
 * task, song requests or the guestbook), starting from a point that moves
 * on every app open, so the owner does not see the same pair each time.
 * The counter lives in the preferences and moves once per JS load (one app
 * open), not on every visit to Home.
 */
const ROTATION_PREF = 'hero_rotation';
let seedPromise = null;
export function heroSeed() {
  if (!seedPromise) {
    seedPromise = prefGet(ROTATION_PREF).then((v) => { const n = (parseInt(v || '0', 10) || 0) + 1; prefSet(ROTATION_PREF, String(n)).catch(() => {}); return n; }).catch(() => 1);
  }
  return seedPromise;
}

/** first, then `count` of the middle in rotation (fewer when fewer exist), then last. */
export function pickHeroes({ first, middle = [], last = null }, seed = 0, count = 2) {
  const out = [];
  if (first) out.push(first);
  if (middle.length <= count) out.push(...middle);
  else {
    const start = seed % middle.length;
    for (let i = 0; i < count; i += 1) out.push(middle[(start + i) % middle.length]);
  }
  if (last) out.push(last);
  return out;
}
