import React, { useState, useRef, useContext, createContext } from 'react';
import { Plus } from 'lucide-react';
import DatePicker from '@/components/shared/DatePicker';
import { interactiveDivProps } from '@/lib/a11y';

// ── Media Library Context ─────────────────────────────────────
export const MediaLibraryContext = createContext(null);
export const useMediaLibrary = () => useContext(MediaLibraryContext);

// ── Shared Primitives ──────────────────────────────────────────
export function FLabel({ children, style = {} }) {
  return <label style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#999', display: 'block', marginBottom: 5, ...style }}>{children}</label>;
}

export function UInput({ label, value, onChange, type = 'text', placeholder = '' }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <FLabel>{label}</FLabel>}
      <input type={type} value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: '100%', border: 'none', borderBottom: '1px solid #DDD', padding: '7px 0', fontSize: 13, color: '#0A0A0A', outline: 'none', background: 'transparent', boxSizing: 'border-box', fontFamily: 'inherit' }}
        onFocus={e => e.target.style.borderBottomColor = '#E03553'}
        onBlur={e => e.target.style.borderBottomColor = '#DDD'}
      />
    </div>
  );
}

export function Divider() {
  return <div style={{ height: 1, background: '#F0F0F0', margin: '12px 0' }} />;
}

export function AddBtn({ children, onClick }) {
  return (
    <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#888', background: 'none', border: '1px dashed #DDD', padding: '7px 12px', cursor: 'pointer', fontWeight: 600, borderRadius: 4, width: '100%', justifyContent: 'center', fontFamily: 'inherit' }}>
      <Plus size={12} /> {children}
    </button>
  );
}

export function Toggle({ label, value, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12, marginBottom: 4 }}>
      <span style={{ fontSize: 13, color: '#333' }}>{label}</span>
      <button onClick={() => onChange(!value)} aria-label={label ? `Toggle ${label}` : 'Toggle'} aria-pressed={value} style={{ width: 38, height: 21, borderRadius: 11, border: 'none', cursor: 'pointer', flexShrink: 0, background: value ? '#E03553' : '#DDD', position: 'relative', transition: 'background 0.2s' }}>
        <div style={{ position: 'absolute', width: 17, height: 17, borderRadius: '50%', background: '#fff', top: 2, left: value ? 19 : 2, transition: 'left 0.2s' }} />
      </button>
    </div>
  );
}

// ── Rich Text Field with toolbar ──────────────────────────────
export function RichTextField({ label, value, onChange, rows = 4, placeholder }) {
  const [focused, setFocused] = useState(false);
  const textareaRef = useRef(null);

  const applyFormat = (format) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = (value || '').slice(start, end);
    const before = (value || '').slice(0, start);
    const after = (value || '').slice(end);
    let newText = value || '';
    let newCursorStart = start;
    let newCursorEnd = end;

    switch (format) {
      case 'bold':
        if (selected) { newText = `${before}**${selected}**${after}`; newCursorEnd = end + 4; }
        else { newText = `${before}****${after}`; newCursorStart = start + 2; newCursorEnd = start + 2; }
        break;
      case 'italic':
        if (selected) { newText = `${before}*${selected}*${after}`; newCursorEnd = end + 2; }
        else { newText = `${before}**${after}`; newCursorStart = start + 1; newCursorEnd = start + 1; }
        break;
      case 'uppercase': newText = `${before}${selected.toUpperCase()}${after}`; break;
      case 'lowercase': newText = `${before}${selected.toLowerCase()}${after}`; break;
      case 'h1': newText = `${before}\n# ${selected || 'Heading'}${after}`; break;
      case 'h2': newText = `${before}\n## ${selected || 'Heading'}${after}`; break;
      case 'quote': newText = `${before}\n> ${selected || 'Quote'}${after}`; break;
      default: return;
    }
    onChange(newText);
    requestAnimationFrame(() => {
      if (el) { el.focus(); el.setSelectionRange(newCursorStart, newCursorEnd); }
    });
  };

  return (
    <div style={{ marginBottom: 14 }}>
      {label && <FLabel>{label}</FLabel>}

      {/* Toolbar — always shown, dims when not focused */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, padding: '5px 8px', background: '#F8F8F8', border: '1px solid #DDDDDD', borderRadius: '6px 6px 0 0', borderBottom: 'none', opacity: focused ? 1 : 0.55, transition: 'opacity 0.2s' }}>
        {[
          { id: 'bold', label: 'B', style: { fontWeight: 700 } },
          { id: 'italic', label: 'I', style: { fontStyle: 'italic' } },
        ].map(btn => (
          <button key={btn.id} onMouseDown={e => { e.preventDefault(); applyFormat(btn.id); }}
            style={{ width: 26, height: 24, border: '1px solid #DDD', background: '#FFF', borderRadius: 3, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', ...btn.style, fontFamily: 'inherit' }}>
            {btn.label}
          </button>
        ))}
        <div style={{ width: 1, background: '#DDD', margin: '0 3px' }} />
        {[{ id: 'h1', label: 'H1' }, { id: 'h2', label: 'H2' }].map(btn => (
          <button key={btn.id} onMouseDown={e => { e.preventDefault(); applyFormat(btn.id); }}
            style={{ padding: '0 7px', height: 24, border: '1px solid #DDD', background: '#FFF', borderRadius: 3, cursor: 'pointer', fontSize: 11, fontWeight: 700, fontFamily: 'inherit' }}>
            {btn.label}
          </button>
        ))}
        <div style={{ width: 1, background: '#DDD', margin: '0 3px' }} />
        <button onMouseDown={e => { e.preventDefault(); applyFormat('quote'); }}
          style={{ width: 26, height: 24, border: '1px solid #DDD', background: '#FFF', borderRadius: 3, cursor: 'pointer', fontSize: 15, fontFamily: 'inherit' }} title="Block quote" aria-label="Block quote">❝</button>
        <div style={{ width: 1, background: '#DDD', margin: '0 3px' }} />
        {[{ id: 'uppercase', label: 'AA' }, { id: 'lowercase', label: 'aa' }].map(btn => (
          <button key={btn.id} onMouseDown={e => { e.preventDefault(); applyFormat(btn.id); }}
            style={{ padding: '0 7px', height: 24, border: '1px solid #DDD', background: '#FFF', borderRadius: 3, cursor: 'pointer', fontSize: 11, fontWeight: btn.id === 'uppercase' ? 700 : 400, fontFamily: 'inherit' }}>
            {btn.label}
          </button>
        ))}
      </div>

      <textarea
        ref={textareaRef}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        rows={rows}
        placeholder={placeholder}
        style={{
          width: '100%', border: '1px solid #DDDDDD', borderRadius: '0 0 6px 6px',
          background: '#FFFFFF', resize: 'vertical', fontSize: 13,
          padding: '9px 10px', outline: 'none', fontFamily: 'inherit',
          lineHeight: 1.6, color: '#0A0A0A', boxSizing: 'border-box',
          borderColor: focused ? '#0A0A0A' : '#DDD', transition: 'border-color 0.15s',
        }}
      />
      <p style={{ fontSize: 11, color: '#AAAAAA', margin: '3px 0 0' }}>Select text then click B, I, H1, H2, or ❝</p>
    </div>
  );
}

// ── Media Picker ───────────────────────────────────────────────
export function MediaPicker({ label, value, onChange, aspectRatio = '16/9' }) {
  const ctx = useMediaLibrary();

  const handleClick = () => {
    if (ctx?.open) {
      ctx.open(onChange);
    }
  };

  return (
    <div style={{ marginBottom: 14 }}>
      {label && <FLabel>{label}</FLabel>}
      {value ? (
        <div style={{ position: 'relative', borderRadius: 6, overflow: 'hidden', aspectRatio }}>
          <img src={value} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} alt="" />
          <div style={{ position: 'absolute', bottom: 6, right: 6, display: 'flex', gap: 5 }}>
            <button onClick={handleClick} style={{ background: 'rgba(0,0,0,0.75)', color: '#FFF', border: 'none', borderRadius: 4, padding: '5px 10px', fontSize: 11, cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit' }}>Change</button>
            <button onClick={() => onChange('')} aria-label="Remove image" style={{ background: 'rgba(200,0,0,0.8)', color: '#FFF', border: 'none', borderRadius: 4, padding: '5px 8px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>×</button>
          </div>
        </div>
      ) : (
        <div
          onClick={handleClick}
          {...interactiveDivProps(handleClick, { label: label || 'Select from library' })}
          style={{ border: '2px dashed #DDDDDD', borderRadius: 8, padding: '28px 16px', textAlign: 'center', cursor: 'pointer', background: '#FAFAFA', transition: 'all 0.2s' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#E03553'; e.currentTarget.style.background = 'rgba(224,53,83,0.03)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#DDDDDD'; e.currentTarget.style.background = '#FAFAFA'; }}
        >
          <div style={{ fontSize: 26, marginBottom: 8 }}>🖼</div>
          <p style={{ fontSize: 12, fontWeight: 600, color: '#444', margin: '0 0 3px' }}>Click to select from library</p>
          <p style={{ fontSize: 11, color: '#AAA', margin: 0 }}>or drag and drop a file</p>
        </div>
      )}
    </div>
  );
}

// ── Color Picker ───────────────────────────────────────────────
export function ColorField({ label, value, onChange }) {
  const presets = ['#FFFFFF', '#0A0A0A', '#888888', '#E03553', '#803D81', '#DDF762', '#C2E5F3', '#F5F0EA'];
  return (
    <div style={{ marginBottom: 14 }}>
      <FLabel>{label}</FLabel>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
        {presets.map(color => (
          <div key={color} onClick={() => onChange(color)} {...interactiveDivProps(() => onChange(color), { label: color })} style={{ width: 22, height: 22, borderRadius: '50%', background: color, border: value === color ? '3px solid #E03553' : '2px solid #EEE', cursor: 'pointer', boxSizing: 'border-box', flexShrink: 0 }} />
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input type="color" value={value || '#FFFFFF'} onChange={e => onChange(e.target.value)} style={{ width: 32, height: 26, border: '1px solid #DDD', borderRadius: 4, cursor: 'pointer', padding: 2 }} />
        <input type="text" value={value || ''} onChange={e => onChange(e.target.value)} placeholder="#FFFFFF"
          style={{ flex: 1, border: 'none', borderBottom: '1px solid #DDD', padding: '4px 0', fontSize: 12, outline: 'none', fontFamily: 'monospace' }} />
      </div>
    </div>
  );
}

// ── Section Style Controls ─────────────────────────────────────
export function SectionStyleControls({ section, onUpdate }) {
  const updateStyle = (key, val) => {
    onUpdate({ ...section, style: { ...(section.style || {}), [key]: val } });
  };

  return (
    <div style={{ padding: '12px 16px' }}>
      {/* Background */}
      <div style={{ marginBottom: 14 }}>
        <FLabel>Background</FLabel>
        <div style={{ display: 'flex', gap: 6 }}>
          {['dark', 'light', 'custom'].map(bg => (
            <button key={bg} onClick={() => updateStyle('backgroundType', bg)} style={{
              flex: 1, padding: '7px 0', border: `1px solid ${section.style?.backgroundType === bg ? '#0A0A0A' : '#DDD'}`,
              background: section.style?.backgroundType === bg ? '#0A0A0A' : bg === 'dark' ? '#1A1A1A' : bg === 'light' ? '#F8F8F8' : '#FFF',
              color: (section.style?.backgroundType === bg || bg === 'dark') ? '#FFF' : '#444',
              borderRadius: 4, cursor: 'pointer', fontSize: 11, fontWeight: 600, textTransform: 'capitalize', fontFamily: 'inherit',
            }}>{bg}</button>
          ))}
        </div>
        {section.style?.backgroundType === 'custom' && (
          <div style={{ marginTop: 8 }}>
            <ColorField label="" value={section.style?.backgroundColor || '#FFFFFF'} onChange={v => updateStyle('backgroundColor', v)} />
          </div>
        )}
      </div>

      <Divider />

      {/* Vertical Padding */}
      <div style={{ marginBottom: 14 }}>
        <FLabel>Vertical Padding</FLabel>
        <div style={{ display: 'flex', gap: 6 }}>
          {[{ label: 'S', value: 40 }, { label: 'M', value: 80 }, { label: 'L', value: 120 }, { label: 'XL', value: 160 }].map(opt => (
            <button key={opt.label} onClick={() => updateStyle('paddingY', opt.value)} style={{
              flex: 1, padding: '7px 0', border: `1px solid ${section.style?.paddingY === opt.value ? '#0A0A0A' : '#DDD'}`,
              background: section.style?.paddingY === opt.value ? '#0A0A0A' : '#FFF',
              color: section.style?.paddingY === opt.value ? '#FFF' : '#444',
              borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
            }}>{opt.label}</button>
          ))}
        </div>
      </div>

      {/* Text Alignment */}
      <div style={{ marginBottom: 14 }}>
        <FLabel>Text Alignment</FLabel>
        <div style={{ display: 'flex', gap: 6 }}>
          {['left', 'center', 'right'].map(align => (
            <button key={align} onClick={() => updateStyle('textAlign', align)} style={{
              flex: 1, padding: '7px 0', border: `1px solid ${section.style?.textAlign === align ? '#0A0A0A' : '#DDD'}`,
              background: section.style?.textAlign === align ? '#0A0A0A' : '#FFF',
              color: section.style?.textAlign === align ? '#FFF' : '#444',
              borderRadius: 4, cursor: 'pointer', fontSize: 11, fontWeight: 600, textTransform: 'capitalize', fontFamily: 'inherit',
            }}>{align}</button>
          ))}
        </div>
      </div>

      {/* Content Width */}
      <div style={{ marginBottom: 14 }}>
        <FLabel>Content Width</FLabel>
        <div style={{ display: 'flex', gap: 6 }}>
          {[{ label: 'Narrow', value: 640 }, { label: 'Medium', value: 900 }, { label: 'Wide', value: 1200 }, { label: 'Full', value: '100%' }].map(opt => (
            <button key={opt.label} onClick={() => updateStyle('maxWidth', opt.value)} style={{
              flex: 1, padding: '7px 0', border: `1px solid ${section.style?.maxWidth === opt.value ? '#0A0A0A' : '#DDD'}`,
              background: section.style?.maxWidth === opt.value ? '#0A0A0A' : '#FFF',
              color: section.style?.maxWidth === opt.value ? '#FFF' : '#444',
              borderRadius: 4, cursor: 'pointer', fontSize: 10, fontWeight: 600, fontFamily: 'inherit',
            }}>{opt.label}</button>
          ))}
        </div>
      </div>

      <Divider />

      {/* Text Color Override */}
      <ColorField label="Text Color Override" value={section.style?.textColor || ''} onChange={v => updateStyle('textColor', v)} />
    </div>
  );
}

// ── Date Picker Field (thin wrapper for use in editors) ────────
export function DatePickerField({ label, value, onChange }) {
  return <DatePicker label={label} value={value} onChange={onChange} />;
}

// ── Master Data Reference (read-only, links to planner) ────────
export function MasterDataReference({ label, value, fieldName }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <p style={{ fontSize: 11, fontWeight: 600, color: '#888888', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>{label}</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#F8F8F8', borderRadius: 6, border: '1px solid #EEEEEE' }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        <span style={{ flex: 1, fontSize: 13, color: value ? '#0A0A0A' : '#AAAAAA', fontWeight: value ? 500 : 400 }}>
          {value || 'Not set in planner'}
        </span>
        <a href="/event-details" style={{ fontSize: 11, color: '#E03553', fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}>Edit in Planner →</a>
      </div>
    </div>
  );
}

// ── Section display name map ───────────────────────────────────
export const getSectionDisplayName = (type) => {
  const names = {
    'cinematic-hero': 'Cinematic Hero', 'split-hero': 'Split Hero', 'minimal-text-hero': 'Minimal Hero',
    'our-story': 'Our Story', 'love-letter': 'Love Letter', 'event-details': 'Event Details',
    'day-timeline': 'Day Timeline', 'venue-showcase': 'Venue Showcase', 'countdown-timer': 'Countdown Timer',
    'photo-grid': 'Photo Grid', 'photo-strip': 'Photo Strip', 'featured-photo': 'Featured Photo',
    'full-rsvp': 'RSVP Form', 'simple-rsvp': 'Simple RSVP', 'rsvp-meal': 'RSVP + Meal Choice',
    'travel-stay': 'Travel & Stay', 'registry-links': 'Registry Links', 'faq-accordion': 'FAQ',
    'spotify-playlist': 'Spotify Playlist', 'song-request': 'Song Request', 'guest-book': 'Guest Book',
    'thank-you': 'Thank You', 'quote': 'Quote', 'spacer': 'Spacer', 'meet-the-couple': 'Meet the Couple',
    'how-we-met': 'How We Met', 'full-screen-gallery': 'Full Screen Gallery',
    'map-directions': 'Map & Directions', 'save-the-date': 'Save the Date',
    'hashtag-wall': 'Hashtag Wall', 'photo-upload': 'Guest Photo Upload', 'music-playlist': 'Music & Playlist',
  };
  return names[type] || type.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
};