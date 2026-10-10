import { useCallback, useEffect, useRef, useState } from 'react';
import { cacheRead, cacheWrite } from './offlineCache';

const TIMEOUT_MS = 15000;

/**
 * The desktop pages load with useEffect + useState + a loadData() they call
 * again after a write. This is that pattern with the three states every
 * mobile list needs (loading, error, data), a `reload` for after writes,
 * and a timeout: no request path spins forever. After 15 seconds the load
 * resolves to an error the screen renders with a retry button, and any
 * data already shown stays on screen.
 *
 * `fn` is read through a ref, so callers can pass an inline function; the
 * load re-runs when `deps` change (compared by value) or on reload().
 *
 * `options.cacheKey` (goal 8, the offline day): every successful load is
 * kept on the device under the key, and a failed load answers from it,
 * with `fromCache: true` and `cachedAt` so the screen can say so. See
 * offlineCache.js. `options.userId` scopes the key to the account.
 */
export default function useLoad(fn, deps = [], options = {}) {
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const { cacheKey = null, userId = null } = options;
  const key = JSON.stringify(deps);
  const [tick, setTick] = useState(0);
  const [state, setState] = useState({ data: null, loading: true, error: null, timedOut: false, fromCache: false, cachedAt: null });

  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: s.data == null, error: null, timedOut: false }));
    const timeout = new Promise((_, reject) => setTimeout(() => reject(Object.assign(new Error('This is taking longer than usual.'), { timedOut: true })), TIMEOUT_MS));
    (async () => {
      try {
        const data = await Promise.race([fnRef.current(), timeout]);
        if (alive) setState({ data, loading: false, error: null, timedOut: false, fromCache: false, cachedAt: null });
        if (cacheKey) cacheWrite(userId, cacheKey, data);
      } catch (err) {
        const cached = cacheKey ? await cacheRead(userId, cacheKey) : null;
        if (!alive) return;
        if (cached) setState({ data: cached.data, loading: false, error: null, timedOut: false, fromCache: true, cachedAt: cached.at });
        else setState((s) => ({ ...s, data: s.data, loading: false, error: err || new Error('Failed to load'), timedOut: !!err?.timedOut }));
      }
    })();
    return () => { alive = false; };
  }, [key, tick, cacheKey, userId]);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  /**
   * Optimistic update: apply `patch(data)` now, run `commit()`, and roll
   * back with `onFail(err)` if it rejects. For the quick actions only.
   */
  const optimistic = useCallback(async (patch, commit, onFail) => {
    let before = null;
    setState((s) => { before = s.data; return { ...s, data: patch(s.data) }; });
    try {
      await commit();
    } catch (err) {
      setState((s) => ({ ...s, data: before }));
      onFail?.(err);
      throw err;
    }
  }, []);

  return { ...state, reload, optimistic };
}
