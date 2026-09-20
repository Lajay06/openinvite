import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * The desktop pages load with useEffect + useState + a loadData() they call
 * again after a write. This is that pattern with the three states every
 * mobile list needs (loading, error, data) and a `reload` for after writes.
 *
 * `fn` is read through a ref, so callers can pass an inline function; the
 * load re-runs when `deps` change (compared by value) or on reload().
 */
export default function useLoad(fn, deps = []) {
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const key = JSON.stringify(deps);
  const [tick, setTick] = useState(0);
  const [state, setState] = useState({ data: null, loading: true, error: null });

  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: s.data == null, error: null }));
    (async () => {
      try {
        const data = await fnRef.current();
        if (alive) setState({ data, loading: false, error: null });
      } catch (err) {
        if (alive) setState((s) => ({ data: s.data, loading: false, error: err || new Error('Failed to load') }));
      }
    })();
    return () => { alive = false; };
  }, [key, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, reload };
}
