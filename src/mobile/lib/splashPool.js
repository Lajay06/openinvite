import { IMAGES, imageUrl } from '../images';
import { prefGet, prefSet } from '../native';

/** The splash pool: every `splashN` slot in the manifest, in order. */
export const SPLASH_KEYS = Object.keys(IMAGES).filter((k) => /^splash\d+$/.test(k)).sort((a, b) => Number(a.slice(6)) - Number(b.slice(6)));

const ORDER_PREF = 'splash_order';
const LAST_PREF = 'splash_last';

function shuffle(list, avoidFirst) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) { const j = Math.floor(Math.random() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  // Never the same photo twice running across a cycle boundary.
  if (out.length > 1 && out[0] === avoidFirst) [out[0], out[1]] = [out[1], out[0]];
  return out;
}

/**
 * The photo for this open: a different one each time, the whole pool before
 * any repeats (a shuffled order is drawn down in the preferences), and never
 * the same one twice in a row. Returns the slot key; `imageUrl(key)` is the
 * photo. With one photo in the pool it is simply that photo.
 */
export async function nextSplashKey() {
  if (SPLASH_KEYS.length === 0) return null;
  if (SPLASH_KEYS.length === 1) return SPLASH_KEYS[0];
  let order = [];
  let last = null;
  try { order = JSON.parse((await prefGet(ORDER_PREF)) || '[]').filter((k) => SPLASH_KEYS.includes(k)); last = await prefGet(LAST_PREF); } catch { order = []; }
  if (!order.length) order = shuffle(SPLASH_KEYS, last);
  const key = order.shift();
  await Promise.all([prefSet(ORDER_PREF, JSON.stringify(order)), prefSet(LAST_PREF, key)]).catch(() => {});
  return key;
}

export async function nextSplashPhoto() {
  const key = await nextSplashKey();
  return key ? { key, url: imageUrl(key), alt: IMAGES[key].alt } : { key: null, url: '', alt: '' };
}
