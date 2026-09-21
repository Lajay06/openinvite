import React from 'react';
import { useSearchParams } from 'react-router-dom';
import FilterPills from './FilterPills';

/**
 * A screen's segments (the desktop page's tabs), kept in ?segment= so a
 * link can open one directly and the back button returns to it.
 */
export function useSegment(options, fallback) {
  const [params, setParams] = useSearchParams();
  const keys = options.map((o) => o.key);
  const current = keys.includes(params.get('segment')) ? params.get('segment') : (fallback || keys[0]);
  const set = (k) => { const next = new URLSearchParams(params); next.set('segment', k); setParams(next, { replace: true }); };
  return [current, set];
}

export default function Segments({ options, value, onChange }) {
  return <FilterPills className="oi-m-segments" options={options} value={value} onChange={onChange} />;
}
