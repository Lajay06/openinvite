import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * The desktop pages load with useEffect + useState + a loadData() they call
 * again after a write. This is that pattern with the three states every
 * mobile list needs (loading, error, data) and a `reload` for after writes.
 *
 * `fn` must be stable or memoised by the caller; `deps` re-runs it.
 */
export default function useLoad(fn, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const alive = useRef(true);
  const run = useCallback(async () => {
    setState((s) => ({ ...s, loading: s.data == null, error: null }));
    try {
      const data = await fn();
      if (alive.current) setState({ data, loading: false, error: null });
    } catch (err) {
      if (alive.current) setState((s) => ({ data: s.data, loading: false, error: err || new Error('Failed to load') }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => {
    alive.current = true;
    run();
    return () => { alive.current = false; };
  }, [run]);
  return { ...state, reload: run };
}
