import { prefGet, prefSet } from '../../native';

/**
 * The hero carousel's rotation (goal 6): "Days to go" is always first; the
 * next three come from the pool of cards real data backs, starting from a
 * point that moves on every app open, so the owner does not see the same
 * set each time. The counter lives in the preferences and moves once per
 * JS load (one app open), not on every visit to Home.
 */
const ROTATION_PREF = 'hero_rotation';
let seedPromise = null;
export function heroSeed() {
  if (!seedPromise) {
    seedPromise = prefGet(ROTATION_PREF).then((v) => { const n = (parseInt(v || '0', 10) || 0) + 1; prefSet(ROTATION_PREF, String(n)).catch(() => {}); return n; }).catch(() => 1);
  }
  return seedPromise;
}

/** Four cards: the first, then three of the rest in rotation (fewer when fewer exist). */
export function pickHeroes(cards, seed = 0, count = 4) {
  if (!cards.length) return [];
  const [first, ...rest] = cards;
  if (rest.length <= count - 1) return [first, ...rest];
  const start = seed % rest.length;
  const out = [];
  for (let i = 0; i < count - 1; i += 1) out.push(rest[(start + i) % rest.length]);
  return [first, ...out];
}
