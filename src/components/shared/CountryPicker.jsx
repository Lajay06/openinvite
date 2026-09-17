import React, { useMemo, useRef, useState } from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
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
 * ── IT IS A RADIX POPOVER, AND THAT IS THE POINT ───────────────────────────
 *
 * Owner's screenshot: in Add new guest the open list showed Australia and half
 * of New Zealand. It was a hand-rolled `position: absolute` list, and the Phone
 * row sits inside an OptionAccordionSection whose body carries
 * `overflow: hidden` for its expand animation (OptionAccordion.jsx:196).
 *
 * Hand-rolling a portal instead fixed the clipping and broke two other things,
 * both only INSIDE A DIALOG and both invisible to any rectangle:
 *
 *   · Radix sets `pointer-events: none` on <body> while a dialog is open, so a
 *     body-portalled popover inherited it — painted above the form, with every
 *     click passing THROUGH it into the fields underneath;
 *   · Radix's focus trap pulled focus back into the dialog the moment the
 *     search box took it, so typing went nowhere and the list stayed unfiltered.
 *
 * A Radix Popover nested inside a Radix Dialog is the supported case: it layers
 * its own FocusScope and DismissableLayer inside the dialog's, so the input
 * receives focus and keystrokes, clicks land on rows, pointer-events are
 * handled, and its portal is outside every overflow in the form. None of that
 * is our code to maintain, which is the argument for using it.
 *
 * NOT A <select>. A native select cannot be searched past its first letter, and
 * 245 options behind one keystroke is a list you scroll rather than use.
 */
export default function CountryPicker({ value, onChange, ariaLabel = 'Country code', disabled = false }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  const selected = COUNTRIES.find((c) => c.iso === value) || COUNTRIES[0];

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
    <PopoverPrimitive.Root
      open={open}
      onOpenChange={(o) => { setOpen(o); if (!o) setQuery(''); }}
    >
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          aria-label={ariaLabel}
          disabled={disabled}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            border: '1px solid rgba(10,10,10,0.15)', borderRadius: 6,
            background: '#FFFFFF', padding: '0 10px', height: 38, flex: '0 0 auto',
            fontSize: 12, lineHeight: '14px', fontFamily: PJS, color: '#0A0A0A',
            cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1,
          }}
        >
          <Flag iso={selected.iso} />
          +{selected.dial}
        </button>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          data-country-popover
          align="start"
          sideOffset={4}
          collisionPadding={8}
          // THE SEARCH BOX TAKES FOCUS, NOT THE FIRST ROW. Radix focuses the
          // content on open; sending it to the input is what makes this a
          // search rather than a list you arrow through.
          onOpenAutoFocus={(e) => { e.preventDefault(); inputRef.current?.focus(); }}
          style={{
            zIndex: 1000,
            width: 280,
            // 360 is the owner's floor — the pinned four plus at least six more
            // — and Radix's own measurement caps it to the space available on
            // the chosen side, flipping when there is more room above.
            height: 'min(360px, var(--radix-popover-content-available-height))',
            display: 'flex', flexDirection: 'column',
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
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
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
