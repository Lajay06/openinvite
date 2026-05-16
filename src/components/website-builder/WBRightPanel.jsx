import React, { useState, useEffect, useRef } from 'react';
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
function SLabel({ children }) {
  return <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#888', margin: '0 0 10px' }}>{children}</p>;
}
function UTextarea({ label, value, onChange, rows = 3, placeholder = '' }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <FLabel>{label}</FLabel>}
      <textarea value={value || ''} onChange={e => onChange(e.target.value)} rows={rows} placeholder={placeholder}
        style={{ width: '100%', border: '1px solid #EEE', padding: '8px', fontSize: 13, color: '#0A0A0A', outline: 'none', fontFamily: 'inherit', resize: 'vertical', background: '#FAFAFA', boxSizing: 'border-box', borderRadius: 4 }}
        onFocus={e => e.target.style.borderColor = '#E03553'}
        onBlur={e => e.target.style.borderColor = '#EEE'}
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
          <button key={opt.id} onClick={() => onChange(opt.id)} style={{ padding: '5px 12px', fontSize: 12, fontWeight: 500, cursor: 'pointer', borderRadius: 100, border: '1px solid ' + (sel ? '#0A0A0A' : '#DDD'), background: sel ? '#0A0A0A' : 'transparent', color: sel ? '#fff' : '#444', fontFamily: 'inherit' }}>{opt.name}</button>
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
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#F0F0F0', padding: '4px 10px', fontSize: 12, borderRadius: 4 }}>
            {it}
            <button onClick={() => onRemove(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999', padding: 0, lineHeight: 1, fontSize: 14 }}>×</button>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <input value={val} onChange={e => setVal(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && val.trim()) { onAdd(val.trim()); setVal(''); } }}
          placeholder="Type and press Enter" style={{ flex: 1, border: 'none', borderBottom: '1px solid #DDD', padding: '5px 0', fontSize: 12, outline: 'none', background: 'transparent', fontFamily: 'inherit' }} />
        <button onClick={() => { if (val.trim()) { onAdd(val.trim()); setVal(''); } }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#E03553', fontWeight: 700, fontSize: 12, fontFamily: 'inherit' }}>+ Add</button>
      </div>
    </div>
  );
}

// ── DESIGN TAB ────────────────────────────────────────────────
function DesignTab({ details, onChange }) {
  return (
    <div>
      <SLabel>Theme</SLabel>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 8 }}>
        {WEBSITE_THEMES.map(t => {
          const sel = (details.activeTheme || 'still') === t.id;
          return (
            <div key={t.id} onClick={() => onChange('activeTheme', t.id)} style={{ cursor: 'pointer' }}>
              <div style={{ borderRadius: 5, overflow: 'hidden', position: 'relative', aspectRatio: '3/2', outline: sel ? '2px solid #0A0A0A' : '2px solid transparent', outlineOffset: 1, transition: 'transform 0.15s' }}
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
              <p style={{ fontSize: 9, fontWeight: 700, textAlign: 'center', margin: '3px 0 0', color: '#0A0A0A' }}>{t.name}</p>
            </div>
          );
        })}
      </div>
      <Divider />
      <SLabel>Typography</SLabel>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8, marginBottom: 8 }}>
        {TYPOGRAPHY_PAIRINGS.map(t => {
          const sel = (details.activeTypography || 'classic') === t.id;
          return (
            <div key={t.id} onClick={() => onChange('activeTypography', t.id)} style={{ border: sel ? '2px solid #0A0A0A' : '1px solid #EEE', borderRadius: 8, padding: 12, cursor: 'pointer', position: 'relative', background: sel ? '#FAFAFA' : '#fff', transition: 'border-color 0.15s' }}>
              {sel && <span style={{ position: 'absolute', top: 6, right: 6, fontSize: 8, background: '#0A0A0A', color: '#fff', borderRadius: '50%', width: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✓</span>}
              <p style={{ fontFamily: t.headingFont + ',serif', fontSize: 14, fontWeight: t.headingWeight, fontStyle: t.headingStyle || 'normal', color: '#0A0A0A', margin: '0 0 2px' }}>S & J</p>
              <p style={{ fontFamily: t.bodyFont, fontSize: 10, color: '#888', margin: '0 0 6px' }}>Together forever.</p>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#0A0A0A', margin: '0 0 1px' }}>{t.name}</p>
              <p style={{ fontSize: 9, color: '#AAA', margin: 0 }}>{t.mood}</p>
            </div>
          );
        })}
      </div>
      <Divider />
      <SLabel>Animations</SLabel>
      <div style={{ marginBottom: 10 }}>
        <p style={{ fontSize: 11, fontWeight: 500, color: '#555', margin: '0 0 6px' }}>Page Transition</p>
        <PillGroup options={TRANSITION_OPTIONS} value={details.pageTransition || 'fade'} onChange={v => onChange('pageTransition', v)} />
      </div>
      <div style={{ marginBottom: 10 }}>
        <p style={{ fontSize: 11, fontWeight: 500, color: '#555', margin: '0 0 6px' }}>Scroll Animation</p>
        <PillGroup options={SCROLL_ANIMATION_OPTIONS} value={details.scrollAnimation || 'subtle'} onChange={v => onChange('scrollAnimation', v)} />
      </div>
      <div>
        <p style={{ fontSize: 11, fontWeight: 500, color: '#555', margin: '0 0 6px' }}>Hero Effect</p>
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
      <SLabel>Your Site URL</SLabel>
      <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #EEE', background: '#FAFAFA', padding: '7px 10px', marginBottom: 8, borderRadius: 4 }}>
        <span style={{ fontSize: 12, color: '#999', flexShrink: 0 }}>openinvite.com/w/</span>
        <input value={details.slug || ''} onChange={e => onChange('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
          placeholder="your-names" style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 13, fontWeight: 600, color: '#0A0A0A', outline: 'none', fontFamily: 'inherit' }} />
      </div>
      {siteUrl && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#F5F5F5', padding: '6px 10px', borderRadius: 4, marginBottom: 16 }}>
          <span style={{ flex: 1, fontSize: 11, fontFamily: 'monospace', color: '#555', wordBreak: 'break-all' }}>{siteUrl}</span>
          <button onClick={copyLink} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: copied ? '#22C55E' : '#888', fontWeight: 700, flexShrink: 0, fontFamily: 'inherit' }}>{copied ? 'Copied!' : 'Copy'}</button>
        </div>
      )}
      <Divider />
      <SLabel>Status</SLabel>
      <Toggle label={`Website is ${details.websiteEnabled ? 'Live' : 'Hidden'}`} value={details.websiteEnabled} onChange={v => onChange('websiteEnabled', v)} />
      <Divider />
      <SLabel>Password Protection</SLabel>
      <Toggle label="Require Password" value={!!(details.websitePassword?.trim())} onChange={v => onChange('websitePassword', v ? ' ' : '')} />
      {details.websitePassword?.trim() && (
        <UInput label="Password" value={details.websitePassword} onChange={v => onChange('websitePassword', v)} />
      )}
      <Divider />
      {siteUrl && (
        <>
          <button onClick={copyLink} style={{ width: '100%', padding: '10px 0', border: '1px solid #0A0A0A', background: 'transparent', color: '#0A0A0A', cursor: 'pointer', fontSize: 13, fontWeight: 600, borderRadius: 4, marginBottom: 8, fontFamily: 'inherit' }}>
            {copied ? '✓ Copied!' : 'Copy Link'}
          </button>
          <button onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent("You're invited! " + siteUrl)}`, '_blank')}
            style={{ width: '100%', padding: '10px 0', border: 'none', background: '#25D366', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, borderRadius: 4, marginBottom: 12, fontFamily: 'inherit' }}>
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
        <MasterDataReference label="Wedding Date" value={md.weddingDate} />
        <MasterDataReference label="Location" value={md.mainCeremony?.venueName} />
        <Divider />
        <UInput label="Custom Subtitle" value={c.subtitle} onChange={v => uc('subtitle', v)} placeholder="Are getting married" />
        <MediaPicker label="Background Photo" value={c.photoUrl} onChange={v => uc('photoUrl', v)} aspectRatio="16/9" />
        {type === 'cinematic-hero' && (
          <UInput label="Video URL (YouTube / Vimeo / .mp4)" value={c.videoUrl} onChange={v => uc('videoUrl', v)} placeholder="https://youtube.com/..." />
        )}
      </div>
    );
  }

  if (['our-story', 'how-we-met'].includes(type)) {
    return (
      <div>
        <RichTextField label="Story Text" value={c.text} onChange={v => uc('text', v)} rows={6} placeholder="Tell your love story here..." />
        <Divider />
        <FLabel>Story Photos</FLabel>
        {(c.photos || []).map((p, i) => (
          <div key={i} style={{ position: 'relative', marginBottom: 8 }}>
            <img src={p} style={{ width: '100%', height: 80, objectFit: 'cover', borderRadius: 4 }} alt="" />
            <button onClick={() => uc('photos', c.photos.filter((_, j) => j !== i))} style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.7)', border: 'none', color: '#fff', borderRadius: '50%', width: 20, height: 20, cursor: 'pointer', fontSize: 12 }}>×</button>
          </div>
        ))}
        <MediaPicker label="Add Photo" value="" onChange={v => v && uc('photos', [...(c.photos || []), v])} />
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
        <div style={{ background: 'rgba(224,53,83,0.04)', border: '1px solid rgba(224,53,83,0.12)', borderRadius: 6, padding: '10px 12px', marginBottom: 12 }}>
          <p style={{ fontSize: 12, color: '#666', margin: 0 }}>Venue and address come from your planner. Edit them in <a href="/EventDetails" style={{ color: '#E03553', fontWeight: 600, textDecoration: 'none' }}>Event Details →</a></p>
        </div>
        <MasterDataReference label="Ceremony Venue" value={md.mainCeremony?.venueName} />
        <MasterDataReference label="Ceremony Address" value={md.mainCeremony?.address} />
        <UInput label="Ceremony Time" value={c.ceremony?.time} onChange={v => uc('ceremony', { ...c.ceremony, time: v })} placeholder="e.g. 3:00 PM" />
        <UInput label="Dress Code" value={c.ceremony?.dressCode} onChange={v => uc('ceremony', { ...c.ceremony, dressCode: v })} />
        <Divider />
        <MasterDataReference label="Reception Venue" value={md.reception?.venueName} />
        <MasterDataReference label="Reception Address" value={md.reception?.address} />
        <UInput label="Reception Time" value={c.reception?.time} onChange={v => uc('reception', { ...c.reception, time: v })} placeholder="e.g. 6:00 PM" />
      </div>
    );
  }

  if (type === 'day-timeline') {
    const events = c.events || [];
    return (
      <div>
        {events.map((ev, i) => (
          <div key={i} style={{ border: '1px solid #EEE', borderRadius: 6, padding: 10, marginBottom: 8, position: 'relative' }}>
            <button onClick={() => uc('events', events.filter((_, j) => j !== i))} style={{ position: 'absolute', top: 6, right: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#CCC', fontSize: 16 }}>×</button>
            <UInput label="Time" value={ev.time} onChange={v => { const n = [...events]; n[i] = { ...ev, time: v }; uc('events', n); }} placeholder="3:00 PM" />
            <UInput label="Title" value={ev.title} onChange={v => { const n = [...events]; n[i] = { ...ev, title: v }; uc('events', n); }} />
            <UInput label="Description" value={ev.description} onChange={v => { const n = [...events]; n[i] = { ...ev, description: v }; uc('events', n); }} />
          </div>
        ))}
        <AddBtn onClick={() => uc('events', [...events, { time: '', title: '', description: '' }])}>Add Event</AddBtn>
      </div>
    );
  }

  if (type === 'venue-showcase') {
    return (
      <div>
        <UInput label="Venue Name" value={c.venue} onChange={v => uc('venue', v)} />
        <UInput label="Address" value={c.address} onChange={v => uc('address', v)} />
        <MediaPicker label="Venue Photo" value={c.photoUrl} onChange={v => uc('photoUrl', v)} aspectRatio="16/9" />
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
        <DatePickerField label="RSVP Deadline" value={c.deadline} onChange={v => uc('deadline', v)} />
        <UInput label="Closing Message" value={c.closingMessage} onChange={v => uc('closingMessage', v)} />
        {type === 'rsvp-meal' && (
          <div>
            <FLabel>Meal Options</FLabel>
            {(c.mealOptions || []).map((opt, i) => (
              <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                <input value={opt} onChange={e => { const n = [...(c.mealOptions || [])]; n[i] = e.target.value; uc('mealOptions', n); }} style={{ flex: 1, border: 'none', borderBottom: '1px solid #DDD', background: 'transparent', fontSize: 13, padding: '4px 0', outline: 'none', fontFamily: 'inherit' }} />
                <button onClick={() => uc('mealOptions', (c.mealOptions || []).filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#E03553', fontSize: 16 }}>×</button>
              </div>
            ))}
            <button onClick={() => uc('mealOptions', [...(c.mealOptions || []), ''])} style={{ width: '100%', padding: '6px', border: '1px dashed #DDD', background: 'transparent', borderRadius: 4, fontSize: 12, color: '#888', cursor: 'pointer', fontFamily: 'inherit', marginTop: 4 }}>+ Add Option</button>
          </div>
        )}
      </div>
    );
  }

  if (type === 'travel-stay') {
    const hotels = c.hotels || [];
    return (
      <div>
        <RichTextField label="Getting There" value={c.gettingThere} onChange={v => uc('gettingThere', v)} rows={3} />
        <UInput label="Parking Info" value={c.parking} onChange={v => uc('parking', v)} />
        <Divider />
        <FLabel>Hotels / Accommodations</FLabel>
        {hotels.map((h, i) => (
          <div key={i} style={{ border: '1px solid #EEE', borderRadius: 6, padding: 10, marginBottom: 8, position: 'relative' }}>
            <button onClick={() => uc('hotels', hotels.filter((_, j) => j !== i))} style={{ position: 'absolute', top: 6, right: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#CCC', fontSize: 16 }}>×</button>
            <UInput label="Name" value={h.name} onChange={v => { const n = [...hotels]; n[i] = { ...h, name: v }; uc('hotels', n); }} />
            <UInput label="Address" value={h.address} onChange={v => { const n = [...hotels]; n[i] = { ...h, address: v }; uc('hotels', n); }} />
          </div>
        ))}
        <AddBtn onClick={() => uc('hotels', [...hotels, { name: '', address: '' }])}>Add Hotel</AddBtn>
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
          <div key={i} style={{ border: '1px solid #EEE', borderRadius: 6, padding: 10, marginBottom: 8, position: 'relative' }}>
            <button onClick={() => uc('links', links.filter((_, j) => j !== i))} style={{ position: 'absolute', top: 6, right: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#CCC', fontSize: 16 }}>×</button>
            <UInput label="Store Name" value={link.label} onChange={v => { const n = [...links]; n[i] = { ...link, label: v }; uc('links', n); }} />
            <UInput label="URL" value={link.url} onChange={v => { const n = [...links]; n[i] = { ...link, url: v }; uc('links', n); }} placeholder="https://..." />
          </div>
        ))}
        <AddBtn onClick={() => uc('links', [...links, { label: '', url: '' }])}>Add Registry</AddBtn>
      </div>
    );
  }

  if (type === 'faq-accordion') {
    const items = c.items || [];
    return (
      <div>
        {items.map((item, i) => (
          <div key={i} style={{ border: '1px solid #EEE', borderRadius: 6, padding: 10, marginBottom: 8, position: 'relative' }}>
            <button onClick={() => uc('items', items.filter((_, j) => j !== i))} style={{ position: 'absolute', top: 6, right: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#CCC', fontSize: 16 }}>×</button>
            <UInput label="Question" value={item.question} onChange={v => { const n = [...items]; n[i] = { ...item, question: v }; uc('items', n); }} />
            <UTextarea label="Answer" value={item.answer} onChange={v => { const n = [...items]; n[i] = { ...item, answer: v }; uc('items', n); }} rows={2} />
          </div>
        ))}
        <AddBtn onClick={() => uc('items', [...items, { question: '', answer: '' }])}>Add FAQ Item</AddBtn>
      </div>
    );
  }

  if (['spotify-playlist', 'music-playlist'].includes(type)) {
    return (
      <div>
        <UInput label="Spotify Playlist URL" value={c.playlistUrl || c.url} onChange={v => uc('playlistUrl', v)} placeholder="https://open.spotify.com/playlist/..." />
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
        <MasterDataReference label="Wedding Date" value={md.weddingDate} />
        <UInput label="Custom Date Label" value={c.date} onChange={v => uc('date', v)} placeholder="e.g. June 14, 2026 (overrides planner date)" />
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
            <div key={i} style={{ position: 'relative', aspectRatio: '1', borderRadius: 4, overflow: 'hidden', background: '#EEE' }}>
              <img src={p} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
              <button onClick={() => uc('photos', c.photos.filter((_, j) => j !== i))} style={{ position: 'absolute', top: 2, right: 2, width: 16, height: 16, borderRadius: '50%', background: 'rgba(0,0,0,0.7)', border: 'none', color: '#fff', fontSize: 11, cursor: 'pointer' }}>×</button>
            </div>
          ))}
        </div>
        <MediaPicker label="Add Photo" value="" onChange={v => v && uc('photos', [...(c.photos || []), v])} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
          <FLabel style={{ margin: 0 }}>Columns</FLabel>
          {[2, 3, 4].map(n => (
            <button key={n} onClick={() => uc('columns', n)} style={{ width: 32, height: 28, border: `1px solid ${c.columns === n ? '#0A0A0A' : '#DDD'}`, background: c.columns === n ? '#0A0A0A' : '#FFF', color: c.columns === n ? '#FFF' : '#444', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}>{n}</button>
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
        <UInput label="Venue Name" value={c.venue} onChange={v => uc('venue', v)} />
        <UInput label="Address" value={c.address} onChange={v => uc('address', v)} />
        <UInput label="Google Maps Embed URL" value={c.mapEmbedUrl} onChange={v => uc('mapEmbedUrl', v)} placeholder="https://www.google.com/maps/embed?pb=..." />
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

  // Find section in pageSections
  const allSections = details.pageSections || {};
  let section = null;
  let pageSlug = null;
  for (const [slug, secs] of Object.entries(allSections)) {
    const found = (secs || []).find(s => s.id === sectionId);
    if (found) { section = found; pageSlug = slug; break; }
  }
  if (!section) return <p style={{ fontSize: 13, color: '#888', padding: 16 }}>Section not found.</p>;

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
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #EEEEEE', display: 'flex', alignItems: 'center', flexShrink: 0, position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
        <div style={{ flex: 1 }}>
          <p style={{ margin: '0 0 1px', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#888' }}>Editing</p>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0A0A0A' }}>{getSectionDisplayName(section.type)}</p>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', padding: 4 }}><X size={16} /></button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #EEE', flexShrink: 0 }}>
        {['content', 'style'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: '10px', border: 'none', background: 'none', fontSize: 13, fontWeight: 600, color: tab === t ? '#0A0A0A' : '#888', borderBottom: tab === t ? '2px solid #E03553' : '2px solid transparent', cursor: 'pointer', textTransform: 'capitalize', fontFamily: 'inherit' }}>
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
      <div style={{ padding: '12px 16px', borderTop: '1px solid #F0F0F0', flexShrink: 0 }}>
        <button onClick={deleteSection} style={{ width: '100%', padding: '8px', border: '1px solid #FFE0E0', background: 'transparent', color: '#E03553', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit' }}>
          Delete Section
        </button>
      </div>
    </div>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────
export default function WBRightPanel({ details, onChange, selectedSection, onClearSection, rightTab, onRightTabChange, masterData, selectedAsset, assetContent, onAssetChange, onClearAsset }) {
  const [mediaLibrary, setMediaLibrary] = useState([]);
  const [mediaModalOpen, setMediaModalOpen] = useState(false);
  const [mediaCallback, setMediaCallback] = useState(null);

  // Load photo entity for media library
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

  // Asset editor mode
  const AssetEditorComp = selectedAsset ? ASSET_EDITOR_MAP[selectedAsset] : null;

  return (
    <MediaLibraryContext.Provider value={{ open: openMediaLibrary }}>
      <div style={{ width: 320, flexShrink: 0, background: '#fff', borderLeft: '1px solid #EEE', display: 'flex', flexDirection: 'column', overflowY: (showSectionEditor || selectedAsset) ? 'hidden' : 'auto', zIndex: 50, height: '100%' }}>

        {selectedAsset ? (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #EEEEEE', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <button onClick={onClearAsset} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', padding: 2, display: 'flex', alignItems: 'center' }}><ChevronLeft size={16} /></button>
              <div>
                <p style={{ margin: '0 0 1px', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#888' }}>Editing Asset</p>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0A0A0A', textTransform: 'capitalize' }}>{selectedAsset.replace(/([A-Z])/g, ' $1').trim()}</p>
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {AssetEditorComp ? (
                <AssetEditorComp content={assetContent} onChange={(field, value) => onAssetChange(selectedAsset, field, value)} />
              ) : (
                <p style={{ padding: 16, fontSize: 13, color: '#888' }}>No editor for this asset.</p>
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
            // Legacy static section header
            <>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid #EEE', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#0A0A0A', margin: 0 }}>{selectedSection}</p>
                <button onClick={onClearSection} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', padding: 4 }}><X size={16} /></button>
              </div>
              <div style={{ flex: 1, padding: 16, overflowY: 'auto' }}>
                <p style={{ fontSize: 13, color: '#888' }}>Use the sections above to edit this content.</p>
              </div>
            </>
          )
        ) : (
          <>
            {/* Default tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid #EEE', flexShrink: 0, position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
              {[{ id: 'design', label: 'Design' }, { id: 'settings', label: 'Settings' }].map(tab => (
                <button key={tab.id} onClick={() => onRightTabChange(tab.id)} style={{ flex: 1, height: 44, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: rightTab === tab.id ? '#0A0A0A' : '#888', borderBottom: rightTab === tab.id ? '2px solid #E03553' : '2px solid transparent', fontFamily: 'inherit' }}>
                  {tab.label}
                </button>
              ))}
            </div>
            <div style={{ flex: 1, padding: 16, overflowY: 'auto' }}>
              {rightTab === 'design' ? (
                <DesignTab details={details} onChange={onChange} />
              ) : (
                <SettingsTab details={details} onChange={onChange} />
              )}
            </div>
            {rightTab === 'design' && (
              <div style={{ padding: '12px 16px', borderTop: '1px solid #F0F0F0', flexShrink: 0 }}>
                <p style={{ fontSize: 11, color: '#BBB', textAlign: 'center', margin: 0 }}>💡 Click any section in the preview to edit it</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Media Library Modal */}
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