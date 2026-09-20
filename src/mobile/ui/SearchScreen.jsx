import React, { useEffect, useRef } from 'react';
import { ArrowLeft, Search, X } from 'lucide-react';

/** Full-screen search: back, a pill input focused on open, results below. */
export default function SearchScreen({ open, onClose, value, onChange, placeholder = 'Search', children }) {
  const ref = useRef(null);
  useEffect(() => {
    if (open) { const t = setTimeout(() => ref.current?.focus(), 60); return () => clearTimeout(t); }
    return undefined;
  }, [open]);
  if (!open) return null;
  return (
    <div className="oi-m-search oi-m-enter" role="dialog" aria-label="Search">
      <div className="oi-m-search__bar">
        <button type="button" className="oi-m-iconbtn oi-m-iconbtn--ghost" onClick={onClose} aria-label="Back" style={{ marginLeft: -8 }}>
          <ArrowLeft size={22} strokeWidth={1.75} />
        </button>
        <div className="oi-m-search__field">
          <Search size={18} strokeWidth={1.75} style={{ color: 'var(--m-text-2)', flexShrink: 0 }} />
          <input ref={ref} className="oi-m-search__input" type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoComplete="off" autoCorrect="off" autoCapitalize="off" enterKeyHint="search" />
          {value && (
            <button type="button" className="oi-m-iconbtn oi-m-iconbtn--ghost" onClick={() => onChange('')} aria-label="Clear" style={{ width: 40, height: 40 }}>
              <X size={18} strokeWidth={1.75} />
            </button>
          )}
        </div>
      </div>
      <div className="oi-m-search__results">{children}</div>
    </div>
  );
}
