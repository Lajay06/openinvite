import React, { useEffect, useMemo, useRef, useState } from 'react';
import { COUNTRIES } from '@/lib/countryCodes.generated';
import { color } from '@/styles/tokens';

const PJS = "'Plus Jakarta Sans', sans-serif";

/**
 * ONE COUNTRY PICKER, FOR EVERY PLACE A DIAL CODE IS CHOSEN.
 *
 * It offered fourteen countries in a native <select>, twice, and assumed
 * Australia everywhere else — including the CSV import, where a US couple's
 * whole guest list became Australian numbers without anything being asked or
 * shown. This is the full ISO list: 245 countries, searchable by what people
 * type rather than by what CLDR prints, with the flag drawn from a sprite.
 *
 * FLAGS ARE ARTWORK, NOT EMOJI. The no-emoji rule is about presentation — a
 * glyph rendered in the system emoji font, outside our type control. A flag
 * emoji is exactly that, and on Windows it is not even drawn. These are SVGs
 * from public/flags/flags.svg, one request, cached, sized by us.
 *
 * NOT A <select>. A native select cannot be searched past its first letter, and
 * 245 options behind one keystroke is a list you scroll rather than use.
 */
export default function CountryPicker({ value, onChange, ariaLabel = 'Country code', disabled = false }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const boxRef = useRef(null);
  const inputRef = useRef(null);

  const selected = COUNTRIES.find((c) => c.iso === value) || COUNTRIES[0];

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    inputRef.current?.focus();
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRIES;
    const digits = q.replace(/[^\d]/g, '');
    return COUNTRIES.filter((c) =>
      c.label.toLowerCase().includes(q)
      || c.iso.toLowerCase() === q
      || (digits && c.dial.startsWith(digits))
      || (c.aliases || []).some((a) => a.startsWith(q)),
    );
  }, [query]);

  const choose = (iso) => { onChange(iso); setOpen(false); setQuery(''); };

  return (
    <div ref={boxRef} style={{ position: 'relative', flex: '0 0 auto' }}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          border: '1px solid rgba(10,10,10,0.15)', borderRadius: 6,
          background: '#FFFFFF', padding: '0 10px', height: 38,
          fontSize: 12, lineHeight: '14px', fontFamily: PJS, color: '#0A0A0A',
          cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1,
        }}
      >
        <Flag iso={selected.iso} />
        +{selected.dial}
      </button>

      {open && (
        <div
          style={{
            position: 'absolute', zIndex: 60, top: 'calc(100% + 4px)', left: 0,
            width: 280, maxHeight: 320, display: 'flex', flexDirection: 'column',
            background: '#FFFFFF', border: '1px solid rgba(10,10,10,0.15)', borderRadius: 6,
          }}
        >
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && matches[0]) { e.preventDefault(); choose(matches[0].iso); } }}
            placeholder="Search countries"
            aria-label="Search countries"
            style={{
              border: 'none', borderBottom: '1px solid rgba(10,10,10,0.12)', outline: 'none',
              padding: '10px 12px', fontSize: 12, lineHeight: '14px', fontFamily: PJS, color: '#0A0A0A',
            }}
          />
          <div data-country-list style={{ overflowY: 'auto', flex: 1 }}>
            {matches.length === 0 && (
              <p style={{ margin: 0, padding: '12px', fontSize: 12, lineHeight: '14px', fontFamily: PJS, color: color.textMuted }}>
                No country matches that.
              </p>
            )}
            {matches.map((c) => (
              <button
                key={c.iso}
                type="button"
                onClick={() => choose(c.iso)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                  border: 'none', background: c.iso === selected.iso ? 'rgba(224,53,83,0.06)' : 'transparent',
                  padding: '8px 12px', cursor: 'pointer', textAlign: 'left',
                  fontSize: 12, lineHeight: '14px', fontFamily: PJS, color: '#0A0A0A',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(10,10,10,0.04)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = c.iso === selected.iso ? 'rgba(224,53,83,0.06)' : 'transparent'; }}
              >
                <Flag iso={c.iso} />
                <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.label}</span>
                <span style={{ color: color.textMuted }}>+{c.dial}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** One symbol out of the sprite. 18x12 is the 3:2 the artwork is drawn at. */
export function Flag({ iso }) {
  return (
    <svg width="18" height="12" aria-hidden="true" style={{ flexShrink: 0, display: 'block' }}>
      <use href={`/flags/flags.svg#flag-${String(iso).toLowerCase()}`} />
    </svg>
  );
}
