import { useEffect, useState } from 'react';
import { prefGet, prefSet } from '../native';

/** Remembers a list's view ('cards' | 'grid') locally, per key. */
export function useListView(key, initial = 'cards') {
  const [view, setView] = useState(initial);
  useEffect(() => { prefGet(`view_${key}`).then((v) => { if (v === 'cards' || v === 'grid') setView(v); }); }, [key]);
  const set = (v) => { setView(v); prefSet(`view_${key}`, v); };
  return [view, set];
}
