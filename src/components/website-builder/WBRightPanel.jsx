import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Plus, ChevronLeft } from 'lucide-react';
import { ASSET_EDITOR_MAP } from './AssetEditors';
import { WEBSITE_THEMES, TYPOGRAPHY_PAIRINGS, TRANSITION_OPTIONS, SCROLL_ANIMATION_OPTIONS, HERO_EFFECT_OPTIONS } from '@/lib/websiteThemes';
import { base44 } from '@/api/base44Client';
import toast from 'react-hot-toast';
import {
  FLabel, UInput, RichTextField, MediaPicker, MediaLibraryContext,
  Toggle, Divider, AddBtn, SectionStyleControls, getSectionDisplayName,
  ColorField, DatePickerField, MasterDataReference,
} from './SectionEditorFields';
import MediaLibraryModal from './MediaLibraryModal';

// ── Extra primitives used only here ───────────────────────────
function SLabel({ children, onClick, isOpen }) {
  const collapsible = typeof isOpen === 'boolean';
  return (
    <p
      onClick={onClick}
      style={{
        fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', color: 'rgba(255,255,255,0.4)',
        margin: '0 0 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        cursor: collapsible ? 'pointer' : 'default', userSelect: 'none',
      }}
    >
      <span>{children}</span>
      {collapsible && <span style={{ fontSize: 10 }}>{isOpen ? '▼' : '▶'}</span>}
    </p>
  );
}
function UTextarea({ label, value, onChange, rows = 3, placeholder = '' }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <FLabel>{label}</FLabel>}
      <textarea value={value || ''} onChange={e => onChange(e.target.value)} rows={rows} placeholder={placeholder}
        style={{ width: '100%', border: '1px solid rgba(255,255,255,0.08)', padding: '8px', fontSize: 13, color: '#FFFFFF', outline: 'none', fontFamily: 'inherit', resize: 'vertical', background: 'rgba(255,255,255,0.08)', boxSizing: 'border-box', borderRadius: 0 }}
        onFocus={e => e.target.style.borderColor = '#E03553'}
        onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
      />
    </div>
  );
}
function PillGroup({ options, value, onChange }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {options.map(opt => {
        const sel = value === opt.id;
        return (
          <button key={opt.id} onClick={() => onChange(opt.id)} style={{ padding: '5px 12px', fontSize: 12, fontWeight: 500, cursor: 'pointer', borderRadius: 999, border: '1px solid ' + (sel ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.15)'), background: sel ? 'rgba(255,255,255,0.12)' : 'transparent', color: sel ? '#fff' : 'rgba(255,255,255,0.5)', fontFamily: 'inherit' }}>{opt.name}</button>
        );
      })}
    </div>
  );
}
function ChipInput({ label, items = [], onAdd, onRemove }) {
  const [val, setVal] = useState('');
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <FLabel>{label}</FLabel>}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
        {items.map((it, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.08)', padding: '4px 10px', fontSize: 12, borderRadius: 999 }}>
            <span style={{ color: '#FFFFFF' }}>{it}</span>
            <button onClick={() => onRemove(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: 0, lineHeight: 1, fontSize: 14 }}>×</button>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <input value={val} onChange={e => setVal(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && val.trim()) { onAdd(val.trim()); setVal(''); } }}
          placeholder="Type and press Enter" style={{ flex: 1, border: 'none', borderBottom: '1px solid rgba(255,255,255,0.12)', padding: '5px 0', fontSize: 12, outline: 'none', background: 'transparent', fontFamily: 'inherit', color: '#FFFFFF' }} />
        <button onClick={() => { if (val.trim()) { onAdd(val.trim()); setVal(''); } }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#E03553', fontWeight: 700, fontSize: 12, fontFamily: 'inherit' }}>+ Add</button>
      </div>
    </div>
  );
}

const selectStyle = {
  width: '100%',
  background: '#2C2C2E',
  color: '#FFFFFF',
  border: '1px solid rgba(255,255,255,0.1)',
  padding: '8px 12px',
  fontSize: 13,
  fontFamily: '"Plus Jakarta Sans", sans-serif',
  borderRadius: 4,
  outline: 'none',
  cursor: 'pointer',
  boxSizing: 'border-box',
};

// ── DESIGN TAB ────────────────────────────────────────────────
function DesignTab({ details, onChange, universeTheme }) {
  const navigate = useNavigate();

  // Theme starts collapsed — it's a secondary refinement, not the headline choice
  const [themeOpen, setThemeOpen] = useState(false);
  const [typoOpen, setTypoOpen] = useState(false);

  const activeTypoId = details.activeTypography || 'classic';
  const activeTypo = TYPOGRAPHY_PAIRINGS.find(t => t.id === activeTypoId) || TYPOGRAPHY_PAIRINGS[0];

  // Load Google Fonts for the selected pairing so the Aa preview renders correctly
  useEffect(() => {
    if (!activeTypo.googleFonts) return;
    const href = `https://fonts.googleapis.com/css2?family=${activeTypo.googleFonts}&display=swap`;
    if (document.head.querySelector(`link[href="${href}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet'; link.href = href;
    document.head.appendChild(link);
  }, [activeTypo.googleFonts]);

  const universeName    = universeTheme?.name    || 'Aman';
  const universeAccent  = universeTheme?.accent  || '#C4956A';
  const universeFeeling = universeTheme?.feeling || 'Quiet luxury';

  return (
    <div>

      {/* ── Universe — prominent global master ───────────────── */}
      {/* Governs colour, fonts, and (in future) texture + motion */}
      <div style={{
        borderLeft: `3px solid ${universeAccent}`,
        background: 'rgba(255,255,255,0.04)',
        padding: '12px 12px 12px 14px',
        marginBottom: 16,
      }}>
        <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', margin: '0 0 8px', fontFamily: 'inherit' }}>
          Universe
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Accent swatch represents the universe's colour identity */}
          <div style={{ width: 28, height: 28, background: universeAccent, flexShrink: 0, border: '1px solid rgba(255,255,255,0.1)' }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF', margin: 0, lineHeight: 1.2, fontFamily: 'inherit' }}>
              {universeName}
            </p>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', margin: '2px 0 0', fontFamily: 'inherit' }}>
              {universeFeeling}
            </p>
          </div>
          <button
            onClick={() => navigate('/studio/universe')}
            style={{
              padding: '5px 12px', background: '#E03553', color: '#FFFFFF',
              border: 'none', borderRadius: 999, fontSize: 11, fontWeight: 600,
              cursor: 'pointer', flexShrink: 0, fontFamily: 'inherit',
            }}
          >
            Change
          </button>
        </div>
      </div>

      {/* ── Fine-tune palette — collapsed by default, secondary ─ */}
      <SLabel onClick={() => setThemeOpen(o => !o)} isOpen={themeOpen}>Fine-tune palette</SLabel>
      <div style={{ overflow: 'hidden', maxHeight: themeOpen ? '2000px' : '0px', transition: 'max-height 0.2s ease' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 8 }}>
        {WEBSITE_THEMES.map(t => {
          const sel = (details.activeTheme || 'still') === t.id;
          return (
            <div key={t.id} onClick={() => onChange('activeTheme', t.id)} style={{ cursor: 'pointer' }}>
              <div
                style={{ overflow: 'hidden', position: 'relative', aspectRatio: '3/2', border: sel ? '2px solid #FFFFFF' : '1px solid rgba(255,255,255,0.1)', transition: 'transform 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.04)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                <div style={{ height: '65%', background: t.darkBg }} />
                <div style={{ height: '35%', background: t.lightBg }} />
                <div style={{ position: 'absolute', bottom: 4, right: 4, width: 8, height: 8, borderRadius: '50%', background: t.accent, border: '1px solid rgba(0,0,0,0.15)' }} />
                {sel && <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ width: 16, height: 16, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700 }}>✓</span>
                </div>}
              </div>
              <p style={{ fontSize: 10, fontWeight: 600, textAlign: 'center', margin: '3px 0 0', color: 'rgba(255,255,255,0.4)' }}>{t.name}</p>
            </div>
          );
        })}
      </div>
      </div>
      <Divider />
      <SLabel onClick={() => setTypoOpen(o => !o)} isOpen={typoOpen}>
        {`Typography · ${activeTypo.name}`}
      </SLabel>
      <div style={{ overflow: 'hidden', maxHeight: typoOpen ? '700px' : '0px', transition: 'max-height 0.2s ease' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 8 }}>
          {TYPOGRAPHY_PAIRINGS.map(t => {
            const sel = activeTypoId === t.id;
            return (
              <div
                key={t.id}
                onClick={() => onChange('activeTypography', t.id)}
                style={{
                  border: sel ? '2px solid rgba(255,255,255,0.7)' : '1px solid rgba(255,255,255,0.1)',
                  padding: '10px 12px', cursor: 'pointer',
                  background: sel ? 'rgba(255,255,255,0.08)' : 'transparent',
                  position: 'relative', transition: 'border-color 0.15s',
                }}
              >
                {sel && (
                  <div style={{ position: 'absolute', top: 5, right: 5, width: 13, height: 13, borderRadius: '50%', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 8, fontWeight: 700, color: '#0A0A0A', lineHeight: 1 }}>✓</span>
                  </div>
                )}
                <p style={{ fontFamily: t.fontDisplay, fontSize: 18, fontWeight: 400, color: '#FFFFFF', margin: '0 0 2px', lineHeight: 1 }}>Aa</p>
                <p style={{ fontSize: 10, fontWeight: 700, color: sel ? '#FFFFFF' : 'rgba(255,255,255,0.6)', margin: '0 0 1px', fontFamily: 'inherit' }}>{t.name}</p>
                <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', margin: 0, fontFamily: 'inherit' }}>{t.description}</p>
              </div>
            );
          })}
        </div>
      </div>
      <Divider />
      <SLabel>Animations</SLabel>
      <div style={{ marginBottom: 10 }}>
        <p style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.5)', margin: '0 0 6px' }}>Page transition</p>
        <PillGroup options={TRANSITION_OPTIONS} value={details.pageTransition || 'fade'} onChange={v => onChange('pageTransition', v)} />
      </div>
      <div style={{ marginBottom: 10 }}>
        <p style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.5)', margin: '0 0 6px' }}>Scroll animation</p>
        <PillGroup options={SCROLL_ANIMATION_OPTIONS} value={details.scrollAnimation || 'subtle'} onChange={v => onChange('scrollAnimation', v)} />
      </div>
      <div>
        <p style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.5)', margin: '0 0 6px' }}>Hero effect</p>
        <PillGroup options={HERO_EFFECT_OPTIONS} value={details.heroEffect || 'static'} onChange={v => onChange('heroEffect', v)} />
      </div>
    </div>
  );
}

// ── SETTINGS TAB ──────────────────────────────────────────────
function SettingsTab({ details, onChange }) {
  const [copied, setCopied] = useState(false);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const siteUrl = details.slug ? `${origin}/w/${details.slug}` : '';
  const copyLink = () => {
    if (!siteUrl) { toast.error('Set a URL slug first.'); return; }
    navigator.clipboard.writeText(siteUrl).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div>
      <SLabel>Your site URL</SLabel>
      <div style={{ display: 'flex', alignItems: 'center', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.08)', padding: '7px 10px', marginBottom: 8 }}>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', flexShrink: 0 }}>openinvite.com.au/w/</span>
        <input value={details.slug || ''} onChange={e => onChange('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
          placeholder="your-names" style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 13, fontWeight: 600, color: '#FFFFFF', outline: 'none', fontFamily: 'inherit' }} />
      </div>
      {siteUrl && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.04)', padding: '6px 10px', marginBottom: 16 }}>
          <span style={{ flex: 1, fontSize: 11, fontFamily: 'monospace', color: 'rgba(255,255,255,0.5)', wordBreak: 'break-all' }}>{siteUrl}</span>
          <button onClick={copyLink} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: copied ? '#22C55E' : 'rgba(255,255,255,0.4)', fontWeight: 700, flexShrink: 0, fontFamily: 'inherit' }}>{copied ? 'Copied!' : 'Copy'}</button>
        </div>
      )}
      <Divider />
      <SLabel>Status</SLabel>
      <Toggle label={`Website is ${details.websiteEnabled ? 'Live' : 'Hidden'}`} value={details.websiteEnabled} onChange={v => onChange('websiteEnabled', v)} />
      <Divider />
      <SLabel>Password protection</SLabel>
      <Toggle label="Require password" value={!!(details.websitePassword?.trim())} onChange={v => onChange('websitePassword', v ? ' ' : '')} />
      {details.websitePassword?.trim() && (
        <UInput label="Password" value={details.websitePassword} onChange={v => onChange('websitePassword', v)} />
      )}
      <Divider />
      {siteUrl && (
        <>
          <button onClick={copyLink} style={{ width: '100%', padding: '10px 0', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', fontSize: 13, fontWeight: 600, borderRadius: 999, marginBottom: 8, fontFamily: 'inherit' }}>
            {copied ? '✓ Copied!' : 'Copy link'}
          </button>
          <button onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent("You're invited! " + siteUrl)}`, '_blank')}
            style={{ width: '100%', padding: '10px 0', border: 'none', background: '#25D366', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, borderRadius: 999, marginBottom: 12, fontFamily: 'inherit' }}>
            Share on WhatsApp
          </button>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <img src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(siteUrl)}&size=120x120&margin=8`} width={120} height={120} alt="QR" />
          </div>
        </>
      )}
    </div>
  );
}

// ── SECTION CONTENT EDITOR ────────────────────────────────────
function SectionContentEditor({ section, onUpdateContent, masterData }) {
  const c = section.content || {};
  const uc = (key, val) => onUpdateContent(key, val);
  const type = section.type;
  const md = masterData || {};

  if (['cinematic-hero', 'split-hero', 'minimal-text-hero'].includes(type)) {
    return (
      <div>
        <MasterDataReference label="Names / Heading" value={md.coupleNames} />
        <MasterDataReference label="Wedding date" value={md.weddingDate} />
        <MasterDataReference label="Location" value={md.mainCeremony?.venueName} />
        <Divider />
        <UInput label="Custom subtitle" value={c.subtitle} onChange={v => uc('subtitle', v)} placeholder="Are getting married" />
        <MediaPicker label="Background photo" value={c.photoUrl} onChange={v => uc('photoUrl', v)} aspectRatio="16/9" />
        {type === 'cinematic-hero' && (
          <UInput label="Video URL (YouTube / Vimeo / .mp4)" value={c.videoUrl} onChange={v => uc('videoUrl', v)} placeholder="https://youtube.com/..." />
        )}
      </div>
    );
  }

  if (['our-story', 'how-we-met'].includes(type)) {
    return (
      <div>
        <RichTextField label="Story text" value={c.text} onChange={v => uc('text', v)} rows={6} placeholder="Tell your love story here..." />
        <Divider />
        <FLabel>Story photos</FLabel>
        {(c.photos || []).map((p, i) => (
          <div key={i} style={{ position: 'relative', marginBottom: 8 }}>
            <img src={p} style={{ width: '100%', height: 80, objectFit: 'cover' }} alt="" />
            <button onClick={() => uc('photos', c.photos.filter((_, j) => j !== i))} style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.7)', border: 'none', color: '#fff', borderRadius: '50%', width: 20, height: 20, cursor: 'pointer', fontSize: 12 }}>×</button>
          </div>
        ))}
        <MediaPicker label="Add photo" value="" onChange={v => v && uc('photos', [...(c.photos || []), v])} />
      </div>
    );
  }

  if (['love-letter', 'quote'].includes(type)) {
    return (
      <div>
        <RichTextField label={type === 'love-letter' ? 'Message' : 'Quote'} value={c.quote || c.text} onChange={v => uc(type === 'love-letter' ? 'quote' : 'text', v)} rows={5} placeholder="Your heartfelt message..." />
        <UInput label="Attribution (optional)" value={c.attribution} onChange={v => uc('attribution', v)} placeholder="— Name" />
      </div>
    );
  }

  if (type === 'thank-you') {
    return (
      <div>
        <RichTextField label="Message" value={c.message} onChange={v => uc('message', v)} rows={4} />
        <UInput label="Attribution (optional)" value={c.attribution} onChange={v => uc('attribution', v)} />
      </div>
    );
  }

  if (type === 'event-details') {
    return (
      <div>
        <div style={{ background: 'rgba(224,53,83,0.08)', border: '1px solid rgba(224,53,83,0.2)', padding: '10px 12px', marginBottom: 12 }}>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', margin: 0 }}>Venue and address come from your planner. Edit them in <a href="/EventDetails" style={{ color: '#E03553', fontWeight: 600, textDecoration: 'none' }}>Event details →</a></p>
        </div>
        <MasterDataReference label="Ceremony venue" value={md.mainCeremony?.venueName} />
        <MasterDataReference label="Ceremony address" value={md.mainCeremony?.address} />
        <UInput label="Ceremony time" value={c.ceremony?.time} onChange={v => uc('ceremony', { ...c.ceremony, time: v })} placeholder="e.g. 3:00 PM" />
        <UInput label="Dress code" value={c.ceremony?.dressCode} onChange={v => uc('ceremony', { ...c.ceremony, dressCode: v })} />
        <Divider />
        <MasterDataReference label="Reception venue" value={md.reception?.venueName} />
        <MasterDataReference label="Reception address" value={md.reception?.address} />
        <UInput label="Reception time" value={c.reception?.time} onChange={v => uc('reception', { ...c.reception, time: v })} placeholder="e.g. 6:00 PM" />
      </div>
    );
  }

  if (type === 'day-timeline') {
    const events = c.events || [];
    return (
      <div>
        {events.map((ev, i) => (
          <div key={i} style={{ border: '1px solid rgba(255,255,255,0.08)', padding: 10, marginBottom: 8, position: 'relative' }}>
            <button onClick={() => uc('events', events.filter((_, j) => j !== i))} style={{ position: 'absolute', top: 6, right: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', fontSize: 16 }}>×</button>
            <UInput label="Time" value={ev.time} onChange={v => { const n = [...events]; n[i] = { ...ev, time: v }; uc('events', n); }} placeholder="3:00 PM" />
            <UInput label="Title" value={ev.title} onChange={v => { const n = [...events]; n[i] = { ...ev, title: v }; uc('events', n); }} />
            <UInput label="Description" value={ev.description} onChange={v => { const n = [...events]; n[i] = { ...ev, description: v }; uc('events', n); }} />
          </div>
        ))}
        <AddBtn onClick={() => uc('events', [...events, { time: '', title: '', description: '' }])}>Add event</AddBtn>
      </div>
    );
  }

  if (type === 'venue-showcase') {
    return (
      <div>
        <UInput label="Venue name" value={c.venue} onChange={v => uc('venue', v)} />
        <UInput label="Address" value={c.address} onChange={v => uc('address', v)} />
        <MediaPicker label="Venue photo" value={c.photoUrl} onChange={v => uc('photoUrl', v)} aspectRatio="16/9" />
        <UInput label="Google Maps URL" value={c.mapUrl} onChange={v => uc('mapUrl', v)} placeholder="https://maps.google.com/..." />
      </div>
    );
  }

  if (type === 'countdown-timer') {
    return <UInput label="Message" value={c.message} onChange={v => uc('message', v)} placeholder="Until we say I do" />;
  }

  if (['full-rsvp', 'simple-rsvp', 'rsvp-meal'].includes(type)) {
    return (
      <div>
        <DatePickerField label="RSVP deadline" value={c.deadline} onChange={v => uc('deadline', v)} />
        <UInput label="Closing message" value={c.closingMessage} onChange={v => uc('closingMessage', v)} />
        {type === 'rsvp-meal' && (
          <div>
            <FLabel>Meal options</FLabel>
            {(c.mealOptions || []).map((opt, i) => (
              <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                <input value={opt} onChange={e => { const n = [...(c.mealOptions || [])]; n[i] = e.target.value; uc('mealOptions', n); }} style={{ flex: 1, border: 'none', borderBottom: '1px solid rgba(255,255,255,0.12)', background: 'transparent', fontSize: 13, padding: '4px 0', outline: 'none', fontFamily: 'inherit', color: '#FFFFFF' }} />
                <button onClick={() => uc('mealOptions', (c.mealOptions || []).filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#E03553', fontSize: 16 }}>×</button>
              </div>
            ))}
            <button onClick={() => uc('mealOptions', [...(c.mealOptions || []), ''])} style={{ width: '100%', padding: '6px', border: '1px dashed rgba(255,255,255,0.15)', background: 'transparent', fontSize: 12, color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontFamily: 'inherit', marginTop: 4 }}>+ Add option</button>
          </div>
        )}
      </div>
    );
  }

  if (type === 'travel-stay') {
    const hotels = c.hotels || [];
    return (
      <div>
        <RichTextField label="Getting there" value={c.gettingThere} onChange={v => uc('gettingThere', v)} rows={3} />
        <UInput label="Parking info" value={c.parking} onChange={v => uc('parking', v)} />
        <Divider />
        <FLabel>Hotels / accommodations</FLabel>
        {hotels.map((h, i) => (
          <div key={i} style={{ border: '1px solid rgba(255,255,255,0.08)', padding: 10, marginBottom: 8, position: 'relative' }}>
            <button onClick={() => uc('hotels', hotels.filter((_, j) => j !== i))} style={{ position: 'absolute', top: 6, right: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', fontSize: 16 }}>×</button>
            <UInput label="Name" value={h.name} onChange={v => { const n = [...hotels]; n[i] = { ...h, name: v }; uc('hotels', n); }} />
            <UInput label="Address" value={h.address} onChange={v => { const n = [...hotels]; n[i] = { ...h, address: v }; uc('hotels', n); }} />
          </div>
        ))}
        <AddBtn onClick={() => uc('hotels', [...hotels, { name: '', address: '' }])}>Add hotel</AddBtn>
      </div>
    );
  }

  if (type === 'registry-links') {
    const links = c.links || [];
    return (
      <div>
        <RichTextField label="Message" value={c.message} onChange={v => uc('message', v)} rows={2} />
        <Divider />
        {links.map((link, i) => (
          <div key={i} style={{ border: '1px solid rgba(255,255,255,0.08)', padding: 10, marginBottom: 8, position: 'relative' }}>
            <button onClick={() => uc('links', links.filter((_, j) => j !== i))} style={{ position: 'absolute', top: 6, right: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', fontSize: 16 }}>×</button>
            <UInput label="Store name" value={link.label} onChange={v => { const n = [...links]; n[i] = { ...link, label: v }; uc('links', n); }} />
            <UInput label="URL" value={link.url} onChange={v => { const n = [...links]; n[i] = { ...link, url: v }; uc('links', n); }} placeholder="https://..." />
          </div>
        ))}
        <AddBtn onClick={() => uc('links', [...links, { label: '', url: '' }])}>Add registry</AddBtn>
      </div>
    );
  }

  if (type === 'faq-accordion') {
    const items = c.items || [];
    return (
      <div>
        {items.map((item, i) => (
          <div key={i} style={{ border: '1px solid rgba(255,255,255,0.08)', padding: 10, marginBottom: 8, position: 'relative' }}>
            <button onClick={() => uc('items', items.filter((_, j) => j !== i))} style={{ position: 'absolute', top: 6, right: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', fontSize: 16 }}>×</button>
            <UInput label="Question" value={item.question} onChange={v => { const n = [...items]; n[i] = { ...item, question: v }; uc('items', n); }} />
            <UTextarea label="Answer" value={item.answer} onChange={v => { const n = [...items]; n[i] = { ...item, answer: v }; uc('items', n); }} rows={2} />
          </div>
        ))}
        <AddBtn onClick={() => uc('items', [...items, { question: '', answer: '' }])}>Add FAQ item</AddBtn>
      </div>
    );
  }

  if (['spotify-playlist', 'music-playlist'].includes(type)) {
    return (
      <div>
        <UInput label="Spotify playlist URL" value={c.playlistUrl || c.url} onChange={v => uc('playlistUrl', v)} placeholder="https://open.spotify.com/playlist/..." />
        <RichTextField label="Message" value={c.message} onChange={v => uc('message', v)} rows={2} />
      </div>
    );
  }

  if (['song-request', 'guest-book', 'photo-upload'].includes(type)) {
    return <RichTextField label="Message" value={c.message} onChange={v => uc('message', v)} rows={3} />;
  }

  if (type === 'hashtag-wall') {
    return (
      <div>
        <UInput label="Hashtag" value={c.hashtag} onChange={v => uc('hashtag', v)} placeholder="#YourWedding" />
        <RichTextField label="Message" value={c.message} onChange={v => uc('message', v)} rows={2} />
      </div>
    );
  }

  if (type === 'save-the-date') {
    return (
      <div>
        <MasterDataReference label="Wedding date" value={md.weddingDate} />
        <UInput label="Custom date label" value={c.date} onChange={v => uc('date', v)} placeholder="e.g. June 14, 2026 (overrides planner date)" />
        <UInput label="Venue" value={c.venue} onChange={v => uc('venue', v)} />
      </div>
    );
  }

  if (type === 'featured-photo') {
    return (
      <div>
        <MediaPicker label="Photo" value={c.photoUrl} onChange={v => uc('photoUrl', v)} aspectRatio="4/3" />
        <UInput label="Caption" value={c.caption} onChange={v => uc('caption', v)} />
      </div>
    );
  }

  if (type === 'photo-grid') {
    return (
      <div>
        <FLabel>Photos</FLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6, marginBottom: 10 }}>
          {(c.photos || []).map((p, i) => (
            <div key={i} style={{ position: 'relative', aspectRatio: '1', overflow: 'hidden', background: 'rgba(255,255,255,0.08)' }}>
              <img src={p} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
              <button onClick={() => uc('photos', c.photos.filter((_, j) => j !== i))} style={{ position: 'absolute', top: 2, right: 2, width: 16, height: 16, borderRadius: '50%', background: 'rgba(0,0,0,0.7)', border: 'none', color: '#fff', fontSize: 11, cursor: 'pointer' }}>×</button>
            </div>
          ))}
        </div>
        <MediaPicker label="Add photo" value="" onChange={v => v && uc('photos', [...(c.photos || []), v])} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
          <FLabel style={{ margin: 0 }}>Columns</FLabel>
          {[2, 3, 4].map(n => (
            <button key={n} onClick={() => uc('columns', n)} style={{ width: 32, height: 28, border: `1px solid ${c.columns === n ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.15)'}`, background: c.columns === n ? 'rgba(255,255,255,0.12)' : 'transparent', color: c.columns === n ? '#FFF' : 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}>{n}</button>
          ))}
        </div>
      </div>
    );
  }

  if (type === 'meet-the-couple') {
    return (
      <div>
        {['partner1', 'partner2'].map((key, idx) => (
          <div key={key}>
            {idx > 0 && <Divider />}
            <FLabel>Partner {idx + 1}</FLabel>
            <UInput label="Name" value={c[key]?.name} onChange={v => uc(key, { ...c[key], name: v })} />
            <RichTextField label="Bio" value={c[key]?.bio} onChange={v => uc(key, { ...c[key], bio: v })} rows={3} />
            <MediaPicker label="Photo" value={c[key]?.photoUrl} onChange={v => uc(key, { ...c[key], photoUrl: v })} aspectRatio="1/1" />
          </div>
        ))}
      </div>
    );
  }

  if (type === 'spacer') {
    return (
      <div>
        <FLabel>Height: {c.height || 80}px</FLabel>
        <input type="range" min="20" max="300" value={c.height || 80} onChange={e => uc('height', parseInt(e.target.value))} style={{ width: '100%', marginTop: 8, accentColor: '#E03553' }} />
      </div>
    );
  }

  if (type === 'map-directions') {
    return (
      <div>
        <UInput label="Venue name" value={c.venue} onChange={v => uc('venue', v)} />
        <UInput label="Address" value={c.address} onChange={v => uc('address', v)} />
        <UInput label="Google Maps embed URL" value={c.mapEmbedUrl} onChange={v => uc('mapEmbedUrl', v)} placeholder="https://www.google.com/maps/embed?pb=..." />
      </div>
    );
  }

  // Fallback
  return (
    <div>
      {Object.keys(c).filter(k => typeof c[k] === 'string' || typeof c[k] === 'boolean').map(key => (
        typeof c[key] === 'boolean'
          ? <Toggle key={key} label={key.replace(/_/g, ' ')} value={c[key]} onChange={v => uc(key, v)} />
          : <UInput key={key} label={key.replace(/_/g, ' ')} value={c[key]} onChange={v => uc(key, v)} />
      ))}
    </div>
  );
}

// ── SECTION EDITOR PANEL (Content + Style tabs) ───────────────
function SectionEditorPanel({ details, onChange, sectionId, onClose, masterData }) {
  const [tab, setTab] = useState('content');

  const allSections = details.pageSections || {};
  let section = null;
  let pageSlug = null;
  for (const [slug, secs] of Object.entries(allSections)) {
    const found = (secs || []).find(s => s.id === sectionId);
    if (found) { section = found; pageSlug = slug; break; }
  }
  if (!section) return <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', padding: 16 }}>Section not found.</p>;

  const updateContent = (key, val) => {
    const pageSecs = [...(allSections[pageSlug] || [])];
    const idx = pageSecs.findIndex(s => s.id === sectionId);
    if (idx === -1) return;
    pageSecs[idx] = { ...pageSecs[idx], content: { ...(section.content || {}), [key]: val } };
    onChange('pageSections', { ...allSections, [pageSlug]: pageSecs });
  };

  const updateSection = (updatedSection) => {
    const pageSecs = [...(allSections[pageSlug] || [])];
    const idx = pageSecs.findIndex(s => s.id === sectionId);
    if (idx === -1) return;
    pageSecs[idx] = updatedSection;
    onChange('pageSections', { ...allSections, [pageSlug]: pageSecs });
  };

  const deleteSection = () => {
    const pageSecs = (allSections[pageSlug] || []).filter(s => s.id !== sectionId).map((s, i) => ({ ...s, order: i }));
    onChange('pageSections', { ...allSections, [pageSlug]: pageSecs });
    onClose();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', flexShrink: 0, position: 'sticky', top: 0, background: '#1C1C1E', zIndex: 10 }}>
        <div style={{ flex: 1 }}>
          <p style={{ margin: '0 0 1px', fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', color: 'rgba(255,255,255,0.35)' }}>Editing</p>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#FFFFFF' }}>{getSectionDisplayName(section.type)}</p>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', padding: 4 }}><X size={16} /></button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
        {['content', 'style'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: '10px', border: 'none', background: 'none', fontSize: 13, fontWeight: 600, color: tab === t ? '#FFFFFF' : 'rgba(255,255,255,0.35)', borderBottom: tab === t ? '2px solid #FFFFFF' : '2px solid transparent', cursor: 'pointer', textTransform: 'capitalize', fontFamily: 'inherit' }}>
            {t}
          </button>
        ))}
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {tab === 'content' ? (
          <div style={{ padding: 16 }}>
            <SectionContentEditor section={section} onUpdateContent={updateContent} masterData={masterData} />
          </div>
        ) : (
          <SectionStyleControls section={section} onUpdate={updateSection} />
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
        <button onClick={deleteSection} style={{ width: '100%', padding: '8px', border: '1px solid rgba(224,53,83,0.4)', background: 'transparent', color: '#E03553', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit', borderRadius: 999 }}>
          Delete section
        </button>
      </div>
    </div>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────
export default function WBRightPanel({ details, universeTheme, onChange, selectedSection, onClearSection, rightTab, onRightTabChange, masterData, selectedAsset, assetContent, onAssetChange, onClearAsset }) {
  const [mediaLibrary, setMediaLibrary] = useState([]);
  const [mediaModalOpen, setMediaModalOpen] = useState(false);
  const [mediaCallback, setMediaCallback] = useState(null);

  useEffect(() => {
    base44.entities.Photo.list('-created_date', 100).then(photos => {
      setMediaLibrary(photos.map(p => ({
        id: p.id,
        url: p.url || p.photo_url || p.imageUrl || '',
        thumbnail: p.url || p.photo_url || p.imageUrl || '',
        type: 'photo',
        name: p.caption || p.title || 'Photo',
      })).filter(p => p.url));
    }).catch(() => {});
  }, []);

  const openMediaLibrary = (callback) => {
    setMediaCallback(() => callback);
    setMediaModalOpen(true);
  };

  const handleUploaded = (item) => {
    const newItem = { id: Date.now() + '', ...item };
    setMediaLibrary(prev => [newItem, ...prev]);
  };

  const isDynamicSection = selectedSection && selectedSection.startsWith('sec_');
  const isStaticSection = selectedSection && !isDynamicSection;
  const showSectionEditor = isDynamicSection || isStaticSection;

  const AssetEditorComp = selectedAsset ? ASSET_EDITOR_MAP[selectedAsset] : null;

  return (
    <MediaLibraryContext.Provider value={{ open: openMediaLibrary }}>
      <div style={{ width: '100%', flexShrink: 0, background: '#1C1C1E', borderLeft: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', overflowY: (showSectionEditor || selectedAsset) ? 'hidden' : 'auto', zIndex: 50, height: '100%', color: '#FFFFFF' }}>

        {selectedAsset ? (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <button onClick={onClearAsset} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', padding: 2, display: 'flex', alignItems: 'center' }}><ChevronLeft size={16} /></button>
              <div>
                <p style={{ margin: '0 0 1px', fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', color: 'rgba(255,255,255,0.35)' }}>Editing asset</p>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#FFFFFF', textTransform: 'capitalize' }}>{selectedAsset.replace(/([A-Z])/g, ' $1').trim()}</p>
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {AssetEditorComp ? (
                <AssetEditorComp content={assetContent} onChange={(field, value) => onAssetChange(selectedAsset, field, value)} />
              ) : (
                <p style={{ padding: 16, fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>No editor for this asset.</p>
              )}
            </div>
          </div>
        ) : showSectionEditor ? (
          isDynamicSection ? (
            <SectionEditorPanel
              details={details}
              onChange={onChange}
              sectionId={selectedSection}
              onClose={onClearSection}
              masterData={masterData}
            />
          ) : (
            <>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#FFFFFF', margin: 0 }}>{selectedSection}</p>
                <button onClick={onClearSection} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', padding: 4 }}><X size={16} /></button>
              </div>
              <div style={{ flex: 1, padding: 16, overflowY: 'auto' }}>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>Use the sections above to edit this content.</p>
              </div>
            </>
          )
        ) : (
          <>
            {/* Design / Settings tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0, position: 'sticky', top: 0, background: '#1C1C1E', zIndex: 10 }}>
              {[{ id: 'design', label: 'Design' }, { id: 'settings', label: 'Settings' }].map(tab => (
                <button key={tab.id} onClick={() => onRightTabChange(tab.id)} style={{ flex: 1, height: 44, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: rightTab === tab.id ? '#FFFFFF' : 'rgba(255,255,255,0.35)', borderBottom: rightTab === tab.id ? '2px solid #FFFFFF' : '2px solid transparent', fontFamily: 'inherit' }}>
                  {tab.label}
                </button>
              ))}
            </div>
            <div style={{ flex: 1, padding: 16, overflowY: 'auto' }}>
              {rightTab === 'design' ? (
                <DesignTab details={details} onChange={onChange} universeTheme={universeTheme} />
              ) : (
                <SettingsTab details={details} onChange={onChange} />
              )}
            </div>
            {rightTab === 'design' && (
              <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', textAlign: 'center', margin: 0 }}>Click any section in the preview to edit it</p>
              </div>
            )}
          </>
        )}
      </div>

      {mediaModalOpen && (
        <MediaLibraryModal
          library={mediaLibrary}
          onClose={() => setMediaModalOpen(false)}
          onSelect={(url) => { if (mediaCallback) mediaCallback(url); }}
          onUploaded={handleUploaded}
        />
      )}
    </MediaLibraryContext.Provider>
  );
}
