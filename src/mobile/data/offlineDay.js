import { useCallback } from 'react';
import toast from 'react-hot-toast';
import { useOnline } from '../shell/OfflineBanner';
import { cachedAtLabel } from './offlineCache';

/**
 * The offline day's two helpers (goal 8, item 11), for the four screens
 * that open from the cache with no signal.
 *
 *   useOfflineGuard()  guard(fn) runs fn online; offline it says so and
 *                      does nothing, so a write never fails halfway.
 *   offlineNotice()    the one line under the title when the data came
 *                      from the cache.
 */
export function useOfflineGuard() {
  const online = useOnline();
  const guard = useCallback((fn) => (...args) => {
    if (!online) { toast('You are offline. Changes wait until you are back online.'); return Promise.resolve(); }
    return fn(...args);
  }, [online]);
  return { online, guard };
}

export function offlineNotice(...loads) {
  const from = loads.find((l) => l && l.fromCache);
  if (!from) return undefined;
  return `${cachedAtLabel(from.cachedAt)}. Nothing here can change until you are back online.`;
}
