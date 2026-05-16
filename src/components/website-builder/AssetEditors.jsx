import React, { useState } from 'react';

const sans = "'Plus Jakarta Sans', sans-serif";

function FLabel({ children }) {
  return <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#888', margin: '0 0 6px', fontFamily: sans }}>{children}</p>;
}
function UInput({ label, value, onChange, placeholder = '' }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <FLabel>{label}</FLabel>}
      <input value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: '100%', borderBottom: '1px solid #DDD', border: 'none', background: 'transparent', fontSize: 13, padding: '6px 0', outline: 'none', fontFamily: sans, boxSizing: 'border-box', color: '#0A0A0A' }}
        onFocus={e => e.target.style.borderBottomColor = '#E03553'}
        onBlur={e => e.target.style.borderBottomColor = '#DDD'}
      />
    </div>
  );
}
function SliderField({ label, value, onChange, min = 0, max = 100, unit = '%' }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <FLabel>{label}</FLabel>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#0A0A0A', fontFamily: sans }}>{value || min}{unit}</span>
      </div>
      <input type="range" min={min} max={max} value={value || min} onChange={e => onChange(parseInt(e.target.value))}
        style={{ width: '100%', accentColor: '#E03553' }} />
    </div>
  );
}
function BgPicker({ value, onChange }) {
  const opts = [{ id: 'ivory', label: 'Ivory', color: '#FAF8F3' }, { id: 'white', label: 'White', color: '#FFFFFF' }, { id: 'dark', label: 'Dark', color: '#0A0A0A' }];
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
      {opts.map(o => (
        <button key={o.id} onClick={() => onChange(o.id)} style={{ flex: 1, padding: '10px 4px', background: o.color, border: `2px solid ${value === o.id ? '#E03553' : '#DDD'}`, cursor: 'pointer', fontSize: 11, fontFamily: sans, fontWeight: 600, color: o.id === 'dark' ? '#fff' : '#0A0A0A' }}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
function MediaPickerBtn({ label, value, onChange }) {
  return (
    <div style={{ marginBottom: 16 }}>
      {label && <FLabel>{label}</FLabel>}
      {value && <img src={value} style={{ width: '100%', height: 120, objectFit: 'cover', marginBottom: 8, border: '1px solid #EEE' }} alt="" />}
      <input type="text" value={value || ''} onChange={e => onChange(e.target.value)} placeholder="Paste image URL..."
        style={{ width: '100%', borderBottom: '1px solid #DDD', border: 'none', background: 'transparent', fontSize: 12, padding: '6px 0', outline: 'none', fontFamily: sans, boxSizing: 'border-box', color: '#0A0A0A' }} />
    </div>
  );
}
function CourseBuilder({ label, items, onUpdate }) {
  const addItem = () => onUpdate([...items, { name: '', description: '' }]);
  const removeItem = (i) => onUpdate(items.filter((_, j) => j !== i));
  const updateItem = (i, field, val) => { const n = [...items]; n[i] = { ...n[i], [field]: val }; onUpdate(n); };
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <FLabel>{label}</FLabel>
        <button onClick={addItem} style={{ fontSize: 11, color: '#E03553', background: 'none', border: 'none', cursor: 'pointer', fontFamily: sans, fontWeight: 600 }}>+ Add</button>
      </div>
      {items.map((item, i) => (
        <div key={i} style={{ border: '1px solid #EEE', padding: 10, marginBottom: 6, position: 'relative' }}>
          <button onClick={() => removeItem(i)} style={{ position: 'absolute', top: 4, right: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#CCC', fontSize: 16, lineHeight: 1 }}>×</button>
          <input value={item.name || ''} onChange={e => updateItem(i, 'name', e.target.value)} placeholder="Dish name"
            style={{ width: '100%', border: 'none', borderBottom: '1px solid #EEE', background: 'transparent', fontSize: 13, padding: '4px 0', outline: 'none', fontFamily: sans, marginBottom: 4 }} />
          <input value={item.description || ''} onChange={e => updateItem(i, 'description', e.target.value)} placeholder="Description (optional)"
            style={{ width: '100%', border: 'none', borderBottom: '1px solid #EEE', background: 'transparent', fontSize: 12, padding: '4px 0', outline: 'none', fontFamily: sans, color: '#888' }} />
        </div>
      ))}
    </div>
  );
}

function Section({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderBottom: '1px solid #F0F0F0', marginBottom: 0 }}>
      <button onClick={() => setOpen(v => !v)} style={{ width: '100%', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: sans }}>
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#888' }}>{title}</span>
        <span style={{ fontSize: 14, color: '#888' }}>{open ? '−' : '+'}</span>
      </button>
      {open && <div style={{ padding: '4px 16px 16px' }}>{children}</div>}
    </div>
  );
}

export function SaveTheDateEditor({ content, onChange }) {
  const c = content || {};
  return (
    <div>
      <Section title="Media">
        <MediaPickerBtn label="Background Photo" value={c.photoUrl} onChange={v => onChange('photoUrl', v)} />
        <SliderField label="Overlay Strength" value={c.overlayStrength ?? 40} onChange={v => onChange('overlayStrength', v)} min={0} max={80} />
      </Section>
      <Section title="Text">
        <UInput label="Header Line" value={c.customText} onChange={v => onChange('customText', v)} placeholder="SAVE THE DATE" />
        <UInput label="Subtitle" value={c.subtitle} onChange={v => onChange('subtitle', v)} placeholder="Formal invitation to follow" />
      </Section>
      <Section title="Layout" defaultOpen={false}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {['Centered', 'Split', 'Minimal', 'Bold'].map(l => (
            <button key={l} onClick={() => onChange('layout', l.toLowerCase())} style={{ padding: '10px 6px', border: `1px solid ${c.layout === l.toLowerCase() ? '#0A0A0A' : '#DDD'}`, background: c.layout === l.toLowerCase() ? '#0A0A0A' : '#FFF', color: c.layout === l.toLowerCase() ? '#FFF' : '#444', fontSize: 12, fontFamily: sans, fontWeight: 600, cursor: 'pointer' }}>{l}</button>
          ))}
        </div>
      </Section>
    </div>
  );
}

export function DigitalInvitationEditor({ content, onChange }) {
  const c = content || {};
  return (
    <div>
      <Section title="Photo">
        <MediaPickerBtn label="Photo" value={c.photoUrl} onChange={v => onChange('photoUrl', v)} />
      </Section>
      <Section title="Message">
        <UInput label="Personal Message" value={c.personalMessage} onChange={v => onChange('personalMessage', v)} placeholder="We would be honoured..." />
      </Section>
    </div>
  );
}

export function MenuCardEditor({ content, onChange }) {
  const c = content || {};
  return (
    <div>
      <Section title="Card Style">
        <FLabel>Background</FLabel>
        <BgPicker value={c.background || 'ivory'} onChange={v => onChange('background', v)} />
        <UInput label="Card Title" value={c.title} onChange={v => onChange('title', v)} placeholder="MENU" />
        <UInput label="Footer Note" value={c.footerNote} onChange={v => onChange('footerNote', v)} placeholder="Please inform us of any dietary requirements" />
      </Section>
      <Section title="Starters">
        <CourseBuilder label="" items={c.starters || []} onUpdate={v => onChange('starters', v)} />
      </Section>
      <Section title="Mains">
        <CourseBuilder label="" items={c.mains || []} onUpdate={v => onChange('mains', v)} />
      </Section>
      <Section title="Desserts">
        <CourseBuilder label="" items={c.desserts || []} onUpdate={v => onChange('desserts', v)} />
      </Section>
      <Section title="Drinks">
        <CourseBuilder label="" items={c.drinks || []} onUpdate={v => onChange('drinks', v)} />
      </Section>
    </div>
  );
}

export function SeatingChartEditor({ content, onChange }) {
  const c = content || {};
  return (
    <div>
      <Section title="Display">
        <UInput label="Title" value={c.title} onChange={v => onChange('title', v)} placeholder="SEATING ARRANGEMENT" />
        <FLabel>Background</FLabel>
        <div style={{ display: 'flex', gap: 8 }}>
          {[{ id: 'light', label: 'Light', bg: '#FAF8F3', color: '#0A0A0A' }, { id: 'dark', label: 'Dark', bg: '#0A0A0A', color: '#fff' }].map(o => (
            <button key={o.id} onClick={() => onChange('background', o.id)} style={{ flex: 1, padding: '10px', background: o.bg, border: `2px solid ${c.background === o.id ? '#E03553' : '#DDD'}`, color: o.color, fontSize: 12, fontFamily: sans, fontWeight: 600, cursor: 'pointer' }}>{o.label}</button>
          ))}
        </div>
      </Section>
      <Section title="Note" defaultOpen={false}>
        <p style={{ fontSize: 12, color: '#888', fontFamily: sans, lineHeight: 1.6 }}>Seating data is pulled automatically from your Guest List & Seating planner.</p>
      </Section>
    </div>
  );
}

export function RSVPCardEditor({ content, onChange }) {
  const c = content || {};
  return (
    <div>
      <Section title="Text">
        <UInput label="Heading" value={c.heading} onChange={v => onChange('heading', v)} placeholder="Kindly Reply" />
        <UInput label="RSVP Deadline" value={c.deadline} onChange={v => onChange('deadline', v)} placeholder="1 February 2026" />
      </Section>
      <Section title="Layout" defaultOpen={false}>
        <div style={{ display: 'flex', gap: 8 }}>
          {['Minimal', 'Classic', 'Bold'].map(l => (
            <button key={l} onClick={() => onChange('layout', l.toLowerCase())} style={{ flex: 1, padding: '10px 6px', border: `1px solid ${c.layout === l.toLowerCase() ? '#0A0A0A' : '#DDD'}`, background: c.layout === l.toLowerCase() ? '#0A0A0A' : '#FFF', color: c.layout === l.toLowerCase() ? '#FFF' : '#444', fontSize: 12, fontFamily: sans, fontWeight: 600, cursor: 'pointer' }}>{l}</button>
          ))}
        </div>
      </Section>
    </div>
  );
}

export function InstagramStoryEditor({ content, onChange }) {
  const c = content || {};
  return (
    <div>
      <Section title="Photo">
        <MediaPickerBtn label="Background Photo" value={c.photoUrl} onChange={v => onChange('photoUrl', v)} />
      </Section>
      <Section title="Design" defaultOpen={false}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[1, 2, 3, 4].map(d => (
            <button key={d} onClick={() => onChange('design', d)} style={{ padding: '10px', border: `1px solid ${c.design === d ? '#0A0A0A' : '#DDD'}`, background: c.design === d ? '#0A0A0A' : '#FFF', color: c.design === d ? '#FFF' : '#444', fontSize: 12, fontFamily: sans, fontWeight: 600, cursor: 'pointer' }}>Design {d}</button>
          ))}
        </div>
      </Section>
    </div>
  );
}

export function WelcomeSignageEditor({ content, onChange }) {
  const c = content || {};
  return (
    <div>
      <Section title="Text">
        <UInput label="Welcome Message" value={c.welcomeMessage} onChange={v => onChange('welcomeMessage', v)} placeholder="Welcome" />
        <UInput label="Subtitle" value={c.subtitle} onChange={v => onChange('subtitle', v)} placeholder="Please find your seat" />
      </Section>
      <Section title="Orientation" defaultOpen={false}>
        <div style={{ display: 'flex', gap: 8 }}>
          {[{ id: 'portrait', label: 'Portrait' }, { id: 'landscape', label: 'Landscape' }].map(o => (
            <button key={o.id} onClick={() => onChange('orientation', o.id)} style={{ flex: 1, padding: '10px', border: `1px solid ${(c.orientation || 'portrait') === o.id ? '#0A0A0A' : '#DDD'}`, background: (c.orientation || 'portrait') === o.id ? '#0A0A0A' : '#FFF', color: (c.orientation || 'portrait') === o.id ? '#FFF' : '#444', fontSize: 12, fontFamily: sans, fontWeight: 600, cursor: 'pointer' }}>{o.label}</button>
          ))}
        </div>
      </Section>
    </div>
  );
}

export function GuestTagsEditor({ content, onChange }) {
  const c = content || {};
  return (
    <div>
      <Section title="Style">
        <FLabel>Card Style</FLabel>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {[{ id: 'light', label: 'Light', bg: '#FFFFFF', color: '#0A0A0A' }, { id: 'dark', label: 'Dark', bg: '#0A0A0A', color: '#fff' }].map(o => (
            <button key={o.id} onClick={() => onChange('layout', o.id)} style={{ flex: 1, padding: '10px', background: o.bg, border: `2px solid ${(c.layout || 'light') === o.id ? '#E03553' : '#DDD'}`, color: o.color, fontSize: 12, fontFamily: sans, fontWeight: 600, cursor: 'pointer' }}>{o.label}</button>
          ))}
        </div>
      </Section>
      <Section title="Display Options" defaultOpen={false}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, cursor: 'pointer', fontFamily: sans, fontSize: 13 }}>
          <input type="checkbox" checked={c.showTable !== false} onChange={e => onChange('showTable', e.target.checked)} style={{ accentColor: '#E03553', width: 14, height: 14 }} />
          Show Table Number
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontFamily: sans, fontSize: 13 }}>
          <input type="checkbox" checked={c.showWebsite !== false} onChange={e => onChange('showWebsite', e.target.checked)} style={{ accentColor: '#E03553', width: 14, height: 14 }} />
          Show Website URL
        </label>
      </Section>
    </div>
  );
}

export function ThankYouNotesEditor({ content, onChange }) {
  const c = content || {};
  return (
    <div>
      <Section title="Message">
        <div style={{ marginBottom: 14 }}>
          <FLabel>Message</FLabel>
          <textarea value={c.message || ''} onChange={e => onChange('message', e.target.value)} rows={4} placeholder="Thank you so much for celebrating with us."
            style={{ width: '100%', border: '1px solid #EEE', padding: '8px', fontSize: 13, outline: 'none', resize: 'vertical', fontFamily: sans, lineHeight: 1.6, boxSizing: 'border-box' }} />
        </div>
        <UInput label="Closing Line" value={c.closing} onChange={v => onChange('closing', v)} placeholder="With love" />
      </Section>
      <Section title="Style" defaultOpen={false}>
        <div style={{ display: 'flex', gap: 8 }}>
          {['Minimal', 'Classic', 'Floral'].map(s => (
            <button key={s} onClick={() => onChange('style', s.toLowerCase())} style={{ flex: 1, padding: '10px 6px', border: `1px solid ${(c.style || 'minimal') === s.toLowerCase() ? '#0A0A0A' : '#DDD'}`, background: (c.style || 'minimal') === s.toLowerCase() ? '#0A0A0A' : '#FFF', color: (c.style || 'minimal') === s.toLowerCase() ? '#FFF' : '#444', fontSize: 11, fontFamily: sans, fontWeight: 600, cursor: 'pointer' }}>{s}</button>
          ))}
        </div>
      </Section>
    </div>
  );
}

export function MotionGraphicEditor({ content, onChange }) {
  const c = content || {};
  return (
    <div>
      <Section title="Style">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
          {['Minimal', 'Cinematic', 'Floral', 'Bold'].map(s => (
            <button key={s} onClick={() => onChange('style', s.toLowerCase())} style={{ padding: '10px', border: `1px solid ${(c.style || 'minimal') === s.toLowerCase() ? '#0A0A0A' : '#DDD'}`, background: (c.style || 'minimal') === s.toLowerCase() ? '#0A0A0A' : '#FFF', color: (c.style || 'minimal') === s.toLowerCase() ? '#FFF' : '#444', fontSize: 12, fontFamily: sans, fontWeight: 600, cursor: 'pointer' }}>{s}</button>
          ))}
        </div>
      </Section>
      <Section title="Animation" defaultOpen={false}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {['Fade', 'Slide', 'Zoom', 'Reveal'].map(a => (
            <button key={a} onClick={() => onChange('animationType', a.toLowerCase())} style={{ padding: '10px', border: `1px solid ${(c.animationType || 'fade') === a.toLowerCase() ? '#0A0A0A' : '#DDD'}`, background: (c.animationType || 'fade') === a.toLowerCase() ? '#0A0A0A' : '#FFF', color: (c.animationType || 'fade') === a.toLowerCase() ? '#FFF' : '#444', fontSize: 12, fontFamily: sans, fontWeight: 600, cursor: 'pointer' }}>{a}</button>
          ))}
        </div>
      </Section>
    </div>
  );
}

export const ASSET_EDITOR_MAP = {
  saveTheDate: SaveTheDateEditor,
  digitalInvitation: DigitalInvitationEditor,
  menuCard: MenuCardEditor,
  seatingChart: SeatingChartEditor,
  rsvpCard: RSVPCardEditor,
  instagramStory: InstagramStoryEditor,
  welcomeSignage: WelcomeSignageEditor,
  guestTags: GuestTagsEditor,
  thankYouNotes: ThankYouNotesEditor,
  motionGraphic: MotionGraphicEditor,
};