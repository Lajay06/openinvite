import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
 *
 * ── THE LIST IS PORTALLED, AND THAT IS NOT A PREFERENCE ────────────────────
 *
 * Owner's screenshot: in Add new guest the open list showed Australia and half
 * of New Zealand. It was `position: absolute` inside the form, and
 * OptionAccordion's section body carries `overflow: hidden` for its expand
 * animation (OptionAccordion.jsx:196) — so the list was cut off at the bottom
 * of the Phone row. Any ancestor with overflow, a transform or a stacking
 * context does the same thing, and a picker used in five places cannot know
 * what it is inside.
 *
 * So the list renders into document.body as `position: fixed`, measured from
 * the trigger's own rect and re-measured on scroll and resize. Nothing above it
 * in the tree can clip it, and z-index 1000 puts it over the dialog it is used
 * inside.
 */
export default function CountryPicker({ value, onChange, ariaLabel = 'Country code', disabled = false }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [rect, setRect] = useState(null);
  const boxRef = useRef(null);
  const listRef = useRef(null);
  const inputRef = useRef(null);

  // WIDTH AND HEIGHT ARE DECIDED HERE, not by the content. Ten rows and the
  // search box is the owner's floor — the pinned four plus at least six more —
  // and the list never grows past the space it has, because a popover that
  // runs off the bottom of the screen is the defect this replaced.
  const WIDTH = 280;
  const MAX_HEIGHT = 360;
  const MIN_HEIGHT = 220;

  // The effect's key handler needs the CURRENT matches without re-subscribing
  // on every keystroke.
  const matchesRef = useRef([]);
  const chooseRef = useRef(() => {});

  const place = useCallback(() => {
    const el = boxRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const below = window.innerHeight - r.bottom - 8;
    const above = r.top - 8;
    // Below by default; above only when below cannot hold a usable list and
    // above can hold more. On a phone the trigger is often near the bottom.
    const useAbove = below < MIN_HEIGHT && above > below;
    const height = Math.max(120, Math.min(MAX_HEIGHT, useAbove ? above : below));
    const left = Math.min(Math.max(8, r.left), Math.max(8, window.innerWidth - WIDTH - 8));
    setRect({ left, top: useAbove ? r.top - height - 4 : r.bottom + 4, height });
  }, []);

  const selected = COUNTRIES.find((c) => c.iso === value) || COUNTRIES[0];

  useLayoutEffect(() => { if (open) place(); }, [open, place]);

  useEffect(() => {
    if (!open) return undefined;
    // BOTH REFS. The list is not inside the trigger's subtree any more, so a
    // contains() check on the trigger alone would close the popover on the
    // mousedown that precedes a row's click — every choice would be a dismiss.
    const onDown = (e) => {
      const inTrigger = boxRef.current?.contains(e.target);
      const inList = listRef.current?.contains(e.target);
      if (!inTrigger && !inList) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') { setOpen(false); return; }
      if (e.key === 'Enter' && matchesRef.current[0]) { e.preventDefault(); chooseRef.current(matchesRef.current[0].iso); }
    };
    // Capture, because an ancestor that scrolls does not bubble its scroll.
    const onScrollOrResize = () => place();
    // TYPE-AHEAD AT THE DOCUMENT, BECAUSE THE SEARCH BOX CANNOT HOLD FOCUS
    // INSIDE A DIALOG. Radix's focus trap pulls focus back into the dialog the
    // moment a portalled input takes it — measured: focusin fired straight back
    // onto the trigger, the query stayed empty, and the list stayed on
    // Australia while "new z" went nowhere. Rather than fight the trap, the
    // popover listens for the keystrokes itself, which is what a native select
    // does and works identically in and out of a dialog. The input below still
    // works normally where focus IS allowed.
    const onType = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.target === inputRef.current) return;          // it has focus; let it type
      if (e.key === 'Backspace') { setQuery((q) => q.slice(0, -1)); e.preventDefault(); return; }
      if (e.key === 'Enter') return;                      // handled below, on the list
      if (e.key.length === 1) { setQuery((q) => q + e.key); e.preventDefault(); }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    document.addEventListener('keydown', onType, true);
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    inputRef.current?.focus();
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('keydown', onType, true);
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [open, place]);

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
  matchesRef.current = matches;
  chooseRef.current = choose;

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

      {open && rect && createPortal(
        <div
          ref={listRef}
          data-country-popover
          style={{
            position: 'fixed', zIndex: 1000, top: rect.top, left: rect.left,
            // POINTER-EVENTS IS NOT DECORATION HERE. Radix sets
            // `pointer-events: none` on <body> while a dialog is open and
            // restores it only inside the dialog, so a portalled popover — a
            // body child, outside the dialog — inherits it and is painted
            // above the form while every click passes THROUGH it into the
            // fields underneath. Found by hit-testing the rows rather than
            // measuring their rectangles; the rectangle was perfect.
            pointerEvents: 'auto',
            width: WIDTH, height: rect.height, display: 'flex', flexDirection: 'column',
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
              flexShrink: 0,   // pinned: the rows scroll under it, it does not
              border: 'none', borderBottom: '1px solid rgba(10,10,10,0.12)', outline: 'none',
              padding: '10px 12px', fontSize: 12, lineHeight: '14px', fontFamily: PJS, color: '#0A0A0A',
            }}
          />
          <div data-country-list style={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>
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
        </div>,
        document.body,
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
