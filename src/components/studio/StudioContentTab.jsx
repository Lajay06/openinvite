import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react';

function Input({ label, value, onChange, type = 'text', placeholder = '' }) {
  return (
    <div style={{ marginBottom: 16 }}>
      {label && <label style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#888', display: 'block', marginBottom: 6, fontWeight: 600 }}>{label}</label>}
      <input
        type={type}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%', background: 'transparent', border: 'none',
          borderBottom: '1px solid #DDDDDD', padding: '7px 0',
          fontSize: 13, color: '#0A0A0A', outline: 'none', boxSizing: 'border-box'
        }}
        onFocus={e => e.target.style.borderBottomColor = '#0A0A0A'}
        onBlur={e => e.target.style.borderBottomColor = '#DDDDDD'}
      />
    </div>
  );
}

function Textarea({ label, value, onChange, rows = 3, placeholder = '' }) {
  return (
    <div style={{ marginBottom: 16 }}>
      {label && <label style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#888', display: 'block', marginBottom: 6, fontWeight: 600 }}>{label}</label>}
      <textarea
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        style={{
          width: '100%', background: '#FAFAFA', border: '1px solid #EEEEEE',
          padding: '8px', fontSize: 13, color: '#0A0A0A', outline: 'none',
          fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box'
        }}
        onFocus={e => e.target.style.borderColor = '#0A0A0A'}
        onBlur={e => e.target.style.borderColor = '#EEEEEE'}
      />
    </div>
  );
}

function Toggle({ label, value, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
      <p style={{ fontSize: 13, color: '#0A0A0A', margin: 0, fontWeight: 500 }}>{label}</p>
      <button
        onClick={() => onChange(!value)}
        style={{
          width: 40, height: 22, borderRadius: 11, border: 'none',
          background: value ? '#E03553' : '#DDDDDD', cursor: 'pointer',
          position: 'relative', transition: 'background 0.2s', flexShrink: 0
        }}
      >
        <div style={{
          position: 'absolute', width: 18, height: 18, borderRadius: '50%',
          background: '#fff', top: 2, left: value ? 20 : 2,
          transition: 'left 0.2s ease'
        }} />
      </button>
    </div>
  );
}

function Accordion({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderBottom: '1px solid #EEEEEE', marginBottom: 0 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 0', background: 'transparent', border: 'none', cursor: 'pointer'
        }}
      >
        <p style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</p>
        {open ? <ChevronDown size={14} color="#888" /> : <ChevronRight size={14} color="#888" />}
      </button>
      {open && <div style={{ paddingBottom: 16 }}>{children}</div>}
    </div>
  );
}

function TagList({ items, onAdd, onRemove, placeholder = 'Add item' }) {
  const [input, setInput] = useState('');
  const handleAdd = () => {
    if (input.trim()) { onAdd(input.trim()); setInput(''); }
  };
  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
        {(items || []).map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#F0F0F0', padding: '4px 10px' }}>
            <span style={{ fontSize: 12, color: '#0A0A0A' }}>{item}</span>
            <button onClick={() => onRemove(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', padding: 0, lineHeight: 1 }}>×</button>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder={placeholder}
          style={{ flex: 1, border: 'none', borderBottom: '1px solid #DDDDDD', padding: '5px 0', fontSize: 12, outline: 'none', background: 'transparent' }}
        />
        <button onClick={handleAdd} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#E03553', fontSize: 11, fontWeight: 700 }}>+ Add</button>
      </div>
    </div>
  );
}

export default function StudioContentTab({ wedding, onChange }) {
  const W = wedding;

  const updateNested = (field, subField, value) => {
    onChange(field, { ...(W[field] || {}), [subField]: value });
  };

  return (
    <div>
      <Accordion title="Hero" defaultOpen>
        <Input label="Hero Video URL" value={W.heroVideoUrl} onChange={v => onChange('heroVideoUrl', v)} placeholder="YouTube or Vimeo URL" />
        <Input label="Cover Photo URL" value={W.coverPhoto} onChange={v => onChange('coverPhoto', v)} placeholder="https://..." />
        <Input label="Couple Names" value={W.coupleNames} onChange={v => onChange('coupleNames', v)} placeholder="Sarah & James" />
        <Input label="Wedding Date" value={W.weddingDate} onChange={v => onChange('weddingDate', v)} type="date" />
        <Input label="Tagline (optional)" value={W.homeContent?.tagline} onChange={v => onChange('homeContent', { ...(W.homeContent || {}), tagline: v })} placeholder="Join us as we celebrate…" />
        <Textarea label="Welcome Message" value={W.welcomeMessage} onChange={v => onChange('welcomeMessage', v)} rows={3} />
      </Accordion>

      <Accordion title="Our Story">
        <Textarea label="Story Text" value={W.coupleStory || W.ourStoryContent?.storyText} onChange={v => onChange('coupleStory', v)} rows={6} />
      </Accordion>

      <Accordion title="Ceremony & Reception">
        <p style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Ceremony</p>
        <Input label="Venue Name" value={W.mainCeremony?.venueName} onChange={v => updateNested('mainCeremony', 'venueName', v)} />
        <Input label="Address" value={W.mainCeremony?.address} onChange={v => updateNested('mainCeremony', 'address', v)} />
        <Input label="Start Time" value={W.mainCeremony?.startTime} onChange={v => updateNested('mainCeremony', 'startTime', v)} type="time" />
        <Input label="Dress Code" value={W.mainCeremony?.dressCode} onChange={v => updateNested('mainCeremony', 'dressCode', v)} />
        <Textarea label="Notes" value={W.mainCeremony?.notes} onChange={v => updateNested('mainCeremony', 'notes', v)} rows={2} />

        <p style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12, marginTop: 8 }}>Reception</p>
        <Input label="Venue Name" value={W.reception?.venueName} onChange={v => updateNested('reception', 'venueName', v)} />
        <Input label="Address" value={W.reception?.address} onChange={v => updateNested('reception', 'address', v)} />
        <Input label="Start Time" value={W.reception?.startTime} onChange={v => updateNested('reception', 'startTime', v)} type="time" />
        <Textarea label="Notes" value={W.reception?.notes} onChange={v => updateNested('reception', 'notes', v)} rows={2} />
      </Accordion>

      <Accordion title="RSVP Settings">
        <Input label="RSVP Deadline" value={W.rsvpContent?.rsvpDeadline} onChange={v => updateNested('rsvpContent', 'rsvpDeadline', v)} type="date" />
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#888', display: 'block', marginBottom: 8, fontWeight: 600 }}>Meal Options</label>
          <TagList
            items={W.rsvpContent?.mealOptions || []}
            onAdd={item => updateNested('rsvpContent', 'mealOptions', [...(W.rsvpContent?.mealOptions || []), item])}
            onRemove={i => updateNested('rsvpContent', 'mealOptions', (W.rsvpContent?.mealOptions || []).filter((_, j) => j !== i))}
            placeholder="e.g. Beef, Chicken, Vegetarian"
          />
        </div>
        <Toggle label="Enable plus ones" value={W.rsvpContent?.enablePlusOnes !== false} onChange={v => updateNested('rsvpContent', 'enablePlusOnes', v)} />
        <Toggle label="Enable dietary field" value={W.rsvpContent?.enableDietaryField !== false} onChange={v => updateNested('rsvpContent', 'enableDietaryField', v)} />
        <Toggle label="Enable song request" value={!!W.rsvpContent?.enableSongRequest} onChange={v => updateNested('rsvpContent', 'enableSongRequest', v)} />
        <Toggle label="Enable message field" value={W.rsvpContent?.enableMessage !== false} onChange={v => updateNested('rsvpContent', 'enableMessage', v)} />
        <Input label="Closing Message" value={W.rsvpContent?.closingMessage} onChange={v => updateNested('rsvpContent', 'closingMessage', v)} placeholder="Thank you for RSVPing!" />
      </Accordion>

      <Accordion title="Travel">
        <Textarea label="Getting There Notes" value={W.travelContent?.gettingThereNotes} onChange={v => updateNested('travelContent', 'gettingThereNotes', v)} rows={3} />
        <Input label="Parking Info" value={W.travelContent?.parkingInfo} onChange={v => updateNested('travelContent', 'parkingInfo', v)} />
        <Input label="Shuttle / Transport Info" value={W.travelContent?.transportInfo} onChange={v => updateNested('travelContent', 'transportInfo', v)} />
      </Accordion>

      <Accordion title="Registry">
        <Textarea label="Registry Message" value={W.registryContent?.registryMessage} onChange={v => updateNested('registryContent', 'registryMessage', v)} rows={3} />
        <Toggle label="No gifts please" value={!!W.registryContent?.noGiftsPlease} onChange={v => updateNested('registryContent', 'noGiftsPlease', v)} />
      </Accordion>

      <Accordion title="Music">
        <Input label="Spotify Playlist URL" value={W.musicContent?.spotifyPlaylistUrl} onChange={v => updateNested('musicContent', 'spotifyPlaylistUrl', v)} placeholder="https://open.spotify.com/playlist/..." />
        <Toggle label="Enable guest song requests" value={!!W.musicContent?.enableGuestRequests} onChange={v => updateNested('musicContent', 'enableGuestRequests', v)} />
        <Input label="Custom Message" value={W.musicContent?.customMessage} onChange={v => updateNested('musicContent', 'customMessage', v)} />
      </Accordion>

      <Accordion title="FAQ">
        {(W.qna || []).map((item, i) => (
          <div key={i} style={{ marginBottom: 16, padding: 12, background: '#FAFAFA', border: '1px solid #EEEEEE', position: 'relative' }}>
            <button
              onClick={() => onChange('qna', W.qna.filter((_, j) => j !== i))}
              style={{ position: 'absolute', top: 8, right: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#CCC' }}
            >
              <Trash2 size={12} />
            </button>
            <Input label="Question" value={item.question} onChange={v => {
              const updated = [...W.qna]; updated[i] = { ...updated[i], question: v }; onChange('qna', updated);
            }} />
            <Textarea label="Answer" value={item.answer} onChange={v => {
              const updated = [...W.qna]; updated[i] = { ...updated[i], answer: v }; onChange('qna', updated);
            }} rows={2} />
          </div>
        ))}
        <button
          onClick={() => onChange('qna', [...(W.qna || []), { question: '', answer: '' }])}
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#888', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}
        >
          <Plus size={12} /> Add FAQ
        </button>
      </Accordion>
    </div>
  );
}