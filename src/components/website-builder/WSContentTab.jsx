import React, { useState } from 'react';
import { Plus, X, ChevronDown } from 'lucide-react';

const PAGE_OPTIONS = [
  { id: 'home', label: 'Home' },
  { id: 'our-story', label: 'Our Story' },
  { id: 'celebration', label: 'Celebration' },
  { id: 'rsvp', label: 'RSVP' },
  { id: 'travel', label: 'Travel' },
  { id: 'registry', label: 'Registry' },
  { id: 'music', label: 'Music' },
  { id: 'photos', label: 'Photos' },
  { id: 'faq', label: 'FAQ' },
];

// ── Shared primitives ─────────────────────────────────────────

function FLabel({ children }) {
  return <label style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#888888', display: 'block', marginBottom: 5 }}>{children}</label>;
}
function FInput({ label, value, onChange, type = 'text', placeholder = '' }) {
  return (
    <div style={{ marginBottom: 16 }}>
      {label && <FLabel>{label}</FLabel>}
      <input type={type} value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: '100%', border: 'none', borderBottom: '1px solid #DDDDDD', padding: '7px 0', fontSize: 14, color: '#0A0A0A', outline: 'none', background: 'transparent', boxSizing: 'border-box' }}
        onFocus={e => e.target.style.borderBottomColor = '#0A0A0A'}
        onBlur={e => e.target.style.borderBottomColor = '#DDDDDD'}
      />
    </div>
  );
}
function FTextarea({ label, value, onChange, rows = 3, placeholder = '' }) {
  return (
    <div style={{ marginBottom: 16 }}>
      {label && <FLabel>{label}</FLabel>}
      <textarea value={value || ''} onChange={e => onChange(e.target.value)} rows={rows} placeholder={placeholder}
        style={{ width: '100%', border: '1px solid #EEEEEE', padding: '8px', fontSize: 14, color: '#0A0A0A', outline: 'none', fontFamily: 'inherit', resize: 'vertical', background: '#FAFAFA', boxSizing: 'border-box' }}
        onFocus={e => e.target.style.borderColor = '#0A0A0A'}
        onBlur={e => e.target.style.borderColor = '#EEEEEE'}
      />
    </div>
  );
}
function FToggle({ label, value, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12, marginBottom: 12, borderBottom: '1px solid #F5F5F5' }}>
      <span style={{ fontSize: 13, color: '#0A0A0A' }}>{label}</span>
      <button onClick={() => onChange(!value)} style={{
        width: 40, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer',
        background: value ? '#E03553' : '#DDDDDD', position: 'relative', transition: 'background 0.2s', flexShrink: 0,
      }}>
        <div style={{ position: 'absolute', width: 18, height: 18, borderRadius: '50%', background: '#fff', top: 2, left: value ? 20 : 2, transition: 'left 0.2s' }} />
      </button>
    </div>
  );
}
function FChips({ label, items, onAdd, onRemove }) {
  const [val, setVal] = useState('');
  return (
    <div style={{ marginBottom: 16 }}>
      {label && <FLabel>{label}</FLabel>}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
        {(items || []).map((it, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#F0F0F0', padding: '4px 10px', fontSize: 12 }}>
            {it}
            <button onClick={() => onRemove(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', padding: 0, lineHeight: 1, fontSize: 14 }}>×</button>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <input value={val} onChange={e => setVal(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && val.trim()) { onAdd(val.trim()); setVal(''); } }}
          placeholder="Type + Enter to add" style={{ flex: 1, border: 'none', borderBottom: '1px solid #DDDDDD', padding: '5px 0', fontSize: 12, outline: 'none', background: 'transparent' }} />
        <button onClick={() => { if (val.trim()) { onAdd(val.trim()); setVal(''); } }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#E03553', fontWeight: 700, fontSize: 12 }}>+ Add</button>
      </div>
    </div>
  );
}
function SectionHead({ children }) {
  return <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#888888', margin: '20px 0 10px' }}>{children}</p>;
}
function AddBtn({ children, onClick }) {
  return (
    <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#888', background: 'none', border: '1px solid #EEEEEE', padding: '7px 12px', cursor: 'pointer', fontWeight: 600 }}>
      <Plus size={12} /> {children}
    </button>
  );
}

// ── Page content editors ──────────────────────────────────────

function HomeContent({ details, onChange }) {
  const h = details.homeContent || {};
  const upH = (k, v) => onChange('homeContent', { ...h, [k]: v });
  return (
    <>
      <FInput label="Hero Video URL" value={details.heroVideoUrl} onChange={v => onChange('heroVideoUrl', v)} placeholder="YouTube or Vimeo URL" />
      <FInput label="Cover Photo URL" value={details.coverPhoto} onChange={v => onChange('coverPhoto', v)} placeholder="https://..." />
      <FInput label="Partner 1 Name" value={h.partnerOneName} onChange={v => upH('partnerOneName', v)} />
      <FInput label="Partner 2 Name" value={h.partnerTwoName} onChange={v => upH('partnerTwoName', v)} />
      <FInput label="Wedding Date" value={details.weddingDate} onChange={v => onChange('weddingDate', v)} type="date" />
      <FInput label="Tagline (optional)" value={h.tagline} onChange={v => upH('tagline', v)} placeholder="Join us as we celebrate…" />
      <FTextarea label="Welcome Message" value={details.welcomeMessage} onChange={v => onChange('welcomeMessage', v)} rows={3} />
    </>
  );
}
function OurStoryContent({ details, onChange }) {
  const s = details.ourStoryContent || {};
  const upS = (k, v) => onChange('ourStoryContent', { ...s, [k]: v });
  const milestones = s.milestones || [];
  return (
    <>
      <FTextarea label="Story Text" value={s.storyText || details.coupleStory} onChange={v => { upS('storyText', v); onChange('coupleStory', v); }} rows={5} />
      <SectionHead>Milestones</SectionHead>
      {milestones.map((m, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid #F0F0F0' }}>
          <input type="date" value={m.date || ''} onChange={e => { const a = [...milestones]; a[i] = { ...a[i], date: e.target.value }; upS('milestones', a); }}
            style={{ width: 130, flexShrink: 0, border: 'none', borderBottom: '1px solid #DDDDDD', padding: '5px 0', fontSize: 12, outline: 'none', background: 'transparent' }} />
          <input value={m.text || ''} onChange={e => { const a = [...milestones]; a[i] = { ...a[i], text: e.target.value }; upS('milestones', a); }}
            placeholder="Milestone description" style={{ flex: 1, border: 'none', borderBottom: '1px solid #DDDDDD', padding: '5px 0', fontSize: 13, outline: 'none', background: 'transparent' }} />
          <button onClick={() => upS('milestones', milestones.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#CCC', padding: '5px 2px' }}><X size={12} /></button>
        </div>
      ))}
      <AddBtn onClick={() => upS('milestones', [...milestones, { date: '', text: '' }])}>Add Milestone</AddBtn>
    </>
  );
}
function CelebrationContent({ details, onChange }) {
  const cc = details.celebrationContent || {};
  const upCC = (k, v) => onChange('celebrationContent', { ...cc, [k]: v });
  const schedule = cc.daySchedule || [];
  const cer = details.mainCeremony || {};
  const rec = details.reception || {};
  const upCer = (k, v) => onChange('mainCeremony', { ...cer, [k]: v });
  const upRec = (k, v) => onChange('reception', { ...rec, [k]: v });
  return (
    <>
      <SectionHead>Ceremony</SectionHead>
      <FInput label="Venue Name" value={cer.venueName} onChange={v => upCer('venueName', v)} />
      <FInput label="Address" value={cer.address} onChange={v => upCer('address', v)} />
      <FInput label="Start Time" value={cer.startTime} onChange={v => upCer('startTime', v)} type="time" />
      <FInput label="End Time" value={cer.endTime} onChange={v => upCer('endTime', v)} type="time" />
      <FInput label="Dress Code" value={cer.dressCode} onChange={v => upCer('dressCode', v)} />
      <FTextarea label="Notes" value={cer.notes} onChange={v => upCer('notes', v)} rows={2} />
      <SectionHead>Reception</SectionHead>
      <FInput label="Venue Name" value={rec.venueName} onChange={v => upRec('venueName', v)} />
      <FInput label="Address" value={rec.address} onChange={v => upRec('address', v)} />
      <FInput label="Start Time" value={rec.startTime} onChange={v => upRec('startTime', v)} type="time" />
      <FInput label="End Time" value={rec.endTime} onChange={v => upRec('endTime', v)} type="time" />
      <FTextarea label="Notes" value={rec.notes} onChange={v => upRec('notes', v)} rows={2} />
      <SectionHead>Day Schedule</SectionHead>
      {schedule.map((item, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 8 }}>
          <input type="time" value={item.time || ''} onChange={e => { const a = [...schedule]; a[i] = { ...a[i], time: e.target.value }; upCC('daySchedule', a); }}
            style={{ width: 90, flexShrink: 0, border: 'none', borderBottom: '1px solid #DDD', padding: '5px 0', fontSize: 12, outline: 'none', background: 'transparent' }} />
          <input value={item.title || ''} onChange={e => { const a = [...schedule]; a[i] = { ...a[i], title: e.target.value }; upCC('daySchedule', a); }}
            placeholder="Event title" style={{ flex: 1, border: 'none', borderBottom: '1px solid #DDD', padding: '5px 0', fontSize: 13, outline: 'none', background: 'transparent' }} />
          <button onClick={() => upCC('daySchedule', schedule.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#CCC', padding: '5px 2px' }}><X size={12} /></button>
        </div>
      ))}
      <AddBtn onClick={() => upCC('daySchedule', [...schedule, { time: '', title: '' }])}>Add Item</AddBtn>
    </>
  );
}
function RSVPContent({ details, onChange }) {
  const r = details.rsvpContent || {};
  const upR = (k, v) => onChange('rsvpContent', { ...r, [k]: v });
  return (
    <>
      <FInput label="RSVP Deadline" value={r.rsvpDeadline} onChange={v => upR('rsvpDeadline', v)} type="date" />
      <FChips label="Meal Options" items={r.mealOptions || []} onAdd={v => upR('mealOptions', [...(r.mealOptions || []), v])} onRemove={i => upR('mealOptions', (r.mealOptions || []).filter((_, j) => j !== i))} />
      <FToggle label="Enable Plus Ones" value={r.enablePlusOnes !== false} onChange={v => upR('enablePlusOnes', v)} />
      <FToggle label="Enable Dietary Field" value={r.enableDietaryField !== false} onChange={v => upR('enableDietaryField', v)} />
      <FToggle label="Enable Song Request" value={!!r.enableSongRequest} onChange={v => upR('enableSongRequest', v)} />
      <FToggle label="Enable Guest Message" value={r.enableMessage !== false} onChange={v => upR('enableMessage', v)} />
      <FTextarea label="Closing Message" value={r.closingMessage} onChange={v => upR('closingMessage', v)} rows={2} />
    </>
  );
}
function TravelContent({ details, onChange }) {
  const t = details.travelContent || {};
  const upT = (k, v) => onChange('travelContent', { ...t, [k]: v });
  const hotels = t.accommodations || [];
  return (
    <>
      <FTextarea label="Getting There Notes" value={t.gettingThereNotes} onChange={v => upT('gettingThereNotes', v)} rows={3} />
      <FInput label="Parking Info" value={t.parkingInfo} onChange={v => upT('parkingInfo', v)} />
      <FInput label="Transport / Shuttle Info" value={t.transportInfo} onChange={v => upT('transportInfo', v)} />
      <SectionHead>Hotels</SectionHead>
      {hotels.map((h, i) => (
        <div key={i} style={{ border: '1px solid #EEEEEE', padding: 12, marginBottom: 8, position: 'relative' }}>
          <button onClick={() => upT('accommodations', hotels.filter((_, j) => j !== i))} style={{ position: 'absolute', top: 8, right: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#CCC' }}><X size={12} /></button>
          <FInput label="Hotel Name" value={h.name} onChange={v => { const a = [...hotels]; a[i] = { ...a[i], name: v }; upT('accommodations', a); }} />
          <FInput label="Address" value={h.address} onChange={v => { const a = [...hotels]; a[i] = { ...a[i], address: v }; upT('accommodations', a); }} />
          <FInput label="Booking URL" value={h.url} onChange={v => { const a = [...hotels]; a[i] = { ...a[i], url: v }; upT('accommodations', a); }} />
        </div>
      ))}
      <AddBtn onClick={() => upT('accommodations', [...hotels, { name: '', address: '', url: '' }])}>Add Hotel</AddBtn>
    </>
  );
}
function RegistryContent({ details, onChange }) {
  const r = details.registryContent || {};
  const upR = (k, v) => onChange('registryContent', { ...r, [k]: v });
  const links = r.registryLinks || [];
  return (
    <>
      <FTextarea label="Registry Message" value={r.registryMessage} onChange={v => upR('registryMessage', v)} rows={3} />
      <FToggle label="No gifts please" value={!!r.noGiftsPlease} onChange={v => upR('noGiftsPlease', v)} />
      <SectionHead>Registry Links</SectionHead>
      {links.map((l, i) => (
        <div key={i} style={{ border: '1px solid #EEEEEE', padding: 12, marginBottom: 8, position: 'relative' }}>
          <button onClick={() => upR('registryLinks', links.filter((_, j) => j !== i))} style={{ position: 'absolute', top: 8, right: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#CCC' }}><X size={12} /></button>
          <FInput label="Store Name" value={l.name} onChange={v => { const a = [...links]; a[i] = { ...a[i], name: v }; upR('registryLinks', a); }} />
          <FInput label="URL" value={l.url} onChange={v => { const a = [...links]; a[i] = { ...a[i], url: v }; upR('registryLinks', a); }} />
        </div>
      ))}
      <AddBtn onClick={() => upR('registryLinks', [...links, { name: '', url: '' }])}>Add Registry</AddBtn>
    </>
  );
}
function MusicContent({ details, onChange }) {
  const m = details.musicContent || {};
  const upM = (k, v) => onChange('musicContent', { ...m, [k]: v });
  return (
    <>
      <FInput label="Spotify Playlist URL" value={m.spotifyPlaylistUrl} onChange={v => upM('spotifyPlaylistUrl', v)} placeholder="https://open.spotify.com/playlist/..." />
      <FToggle label="Enable Guest Song Requests" value={!!m.enableGuestRequests} onChange={v => upM('enableGuestRequests', v)} />
      <FInput label="Custom Message" value={m.customMessage} onChange={v => upM('customMessage', v)} />
    </>
  );
}
function FAQContent({ details, onChange }) {
  const items = details.qna || [];
  return (
    <>
      {items.map((item, i) => (
        <div key={i} style={{ border: '1px solid #EEEEEE', padding: 12, marginBottom: 8, position: 'relative' }}>
          <button onClick={() => onChange('qna', items.filter((_, j) => j !== i))} style={{ position: 'absolute', top: 8, right: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#CCC' }}><X size={12} /></button>
          <FInput label="Question" value={item.question} onChange={v => { const a = [...items]; a[i] = { ...a[i], question: v }; onChange('qna', a); }} />
          <FTextarea label="Answer" value={item.answer} onChange={v => { const a = [...items]; a[i] = { ...a[i], answer: v }; onChange('qna', a); }} rows={2} />
        </div>
      ))}
      <AddBtn onClick={() => onChange('qna', [...items, { question: '', answer: '' }])}>Add Question</AddBtn>
    </>
  );
}

const PAGE_CONTENT = {
  'home': HomeContent,
  'our-story': OurStoryContent,
  'celebration': CelebrationContent,
  'rsvp': RSVPContent,
  'travel': TravelContent,
  'registry': RegistryContent,
  'music': MusicContent,
  'faq': FAQContent,
};

export default function WSContentTab({ details, onChange, editingPage, onPageChange }) {
  const [dropOpen, setDropOpen] = useState(false);
  const enabledPages = details.enabledPages || ['home', 'our-story', 'celebration', 'rsvp'];
  const availablePages = PAGE_OPTIONS.filter(p => enabledPages.includes(p.id) || p.id === 'home');
  const currentLabel = PAGE_OPTIONS.find(p => p.id === editingPage)?.label || 'Home';
  const ContentComponent = PAGE_CONTENT[editingPage] || HomeContent;

  return (
    <div>
      {/* Page selector */}
      <div style={{ position: 'relative', marginBottom: 20 }}>
        <button onClick={() => setDropOpen(v => !v)} style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          border: 'none', borderBottom: '1px solid #DDDDDD', background: 'transparent', padding: '8px 0',
          fontSize: 14, fontWeight: 600, color: '#0A0A0A', cursor: 'pointer',
        }}>
          Editing: {currentLabel}
          <ChevronDown size={14} color="#888" style={{ transform: dropOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
        </button>
        {dropOpen && (
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #EEEEEE', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', zIndex: 100 }}>
            {availablePages.map(p => (
              <div key={p.id} onClick={() => { onPageChange(p.id); setDropOpen(false); }}
                style={{ padding: '10px 14px', fontSize: 13, cursor: 'pointer', fontWeight: editingPage === p.id ? 700 : 400, color: '#0A0A0A', background: editingPage === p.id ? '#F5F5F5' : '#fff' }}
                onMouseEnter={e => e.currentTarget.style.background = '#F8F8F8'}
                onMouseLeave={e => e.currentTarget.style.background = editingPage === p.id ? '#F5F5F5' : '#fff'}
              >
                {p.label}
              </div>
            ))}
          </div>
        )}
      </div>

      <ContentComponent details={details} onChange={onChange} />
    </div>
  );
}