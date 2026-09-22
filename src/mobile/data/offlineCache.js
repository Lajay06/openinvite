import { prefGet, prefSet } from '../native';

/**
 * The offline cache for the day (goal 8, item 11). Four screens keep the
 * last data they loaded on the device, so that with no signal (a marquee,
 * a vineyard, a basement bar) they open from the cache, read only:
 *
 *   the run sheet (schedule)      Schedule rows and the timeline's sources
 *   seating                       tables, guests, the wedding details
 *   vendor contacts               Vendor rows
 *   emergency contacts            the wedding details
 *
 * useLoad(fn, deps, { cacheKey }) does the work: every successful load
 * writes { at, data } under the key, and a load that fails (offline, or
 * the API refused) answers from the key instead, with `fromCache` and
 * `cachedAt` set so the screen can say when it last updated. Only the
 * hooks those screens use pass a key, so nothing else is written to the
 * device. Keys carry the user id so two accounts on one phone never see
 * each other's data. Capacitor Preferences natively, localStorage on the
 * web (native.ts prefGet/prefSet); a value that will not fit is simply
 * not cached.
 */
const PREFIX = 'cache';

export function cacheKeyFor(userId, key) {
  return `${PREFIX}:${userId || 'anon'}:${key}`;
}

export async function cacheRead(userId, key) {
  try {
    const raw = await prefGet(cacheKeyFor(userId, key));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed.at === 'number' && 'data' in parsed ? parsed : null;
  } catch { return null; }
}

export async function cacheWrite(userId, key, data) {
  try { await prefSet(cacheKeyFor(userId, key), JSON.stringify({ at: Date.now(), data })); } catch { /* too big, or storage refused */ }
}

/** "Last updated" wording for the offline line. */
export function cachedAtLabel(at) {
  if (!at) return '';
  const d = new Date(at);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  const time = d.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' }).replace(' ', '').toLowerCase();
  if (sameDay) return `Last updated today at ${time}`;
  return `Last updated ${d.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })} at ${time}`;
}
