/**
 * BlockFields — the per-type content editing form for a single block.
 * Used by WBRightPanel.jsx's block-editor view, shown when a block is
 * selected on the canvas (feat/canvas-builder) — the canvas itself has no
 * separate editing UI of its own; this is the one implementation of "how
 * do you edit a heading/photo/quote/...".
 *
 * feat/canvas-builder removed the side-panel's block list/add control
 * entirely (BlockList.jsx, from feat/block-builder + feat/component-library)
 * — adding now only happens on the canvas via ComponentLibraryModal. This
 * file keeps just the reusable per-type fields that used to live there.
 */
import React from 'react';
import { MediaPicker, FLabel } from './SectionEditorFields';

function DarkInput({ value, onChange, placeholder }) {
  return (
    <input
      type="text" value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={{ width: '100%', border: '1px solid rgba(255,255,255,0.08)', padding: '8px', fontSize: 13, color: '#FFFFFF', outline: 'none', fontFamily: 'inherit', background: 'rgba(255,255,255,0.08)', boxSizing: 'border-box', borderRadius: 0, marginBottom: 8 }}
      onFocus={e => e.target.style.borderColor = '#E03553'}
      onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
    />
  );
}

function DarkTextarea({ value, onChange, placeholder, rows = 4 }) {
  return (
    <textarea
      value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
      style={{ width: '100%', border: '1px solid rgba(255,255,255,0.08)', padding: '8px', fontSize: 13, color: '#FFFFFF', outline: 'none', fontFamily: 'inherit', resize: 'vertical', background: 'rgba(255,255,255,0.08)', boxSizing: 'border-box', borderRadius: 0, marginBottom: 8 }}
      onFocus={e => e.target.style.borderColor = '#E03553'}
      onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
    />
  );
}

function PhotoListField({ photos, onChange }) {
  return (
    <>
      {photos.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6, marginBottom: 10 }}>
          {photos.map((p, i) => (
            <div key={i} style={{ position: 'relative', aspectRatio: '1', overflow: 'hidden', background: 'rgba(255,255,255,0.08)' }}>
              <img src={p} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
              <button onClick={() => onChange(photos.filter((_, j) => j !== i))} style={{ position: 'absolute', top: 2, right: 2, width: 18, height: 18, borderRadius: '50%', background: 'rgba(0,0,0,0.7)', border: 'none', color: '#fff', fontSize: 11, cursor: 'pointer' }}>×</button>
            </div>
          ))}
        </div>
      )}
      <MediaPicker label="" value="" onChange={v => v && onChange([...photos, v])} aspectRatio="1/1" />
    </>
  );
}

function ListEditor({ items, onChange, placeholder }) {
  return (
    <>
      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
          <input value={item} onChange={e => { const n = [...items]; n[i] = e.target.value; onChange(n); }} placeholder={placeholder}
            style={{ flex: 1, border: 'none', borderBottom: '1px solid rgba(255,255,255,0.12)', background: 'transparent', fontSize: 13, padding: '4px 0', outline: 'none', fontFamily: 'inherit', color: '#FFFFFF' }} />
          <button onClick={() => onChange(items.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#E03553', fontSize: 16 }}>×</button>
        </div>
      ))}
      <button onClick={() => onChange([...items, ''])} style={{ width: '100%', padding: '6px', border: '1px dashed rgba(255,255,255,0.15)', background: 'transparent', fontSize: 12, color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontFamily: 'inherit', marginTop: 2 }}>+ Add item</button>
    </>
  );
}

export function BlockFields({ block, updateContent }) {
  const c = block.content || {};
  switch (block.type) {
    case 'heading':
      return (
        <>
          <DarkInput value={c.kicker} onChange={v => updateContent('kicker', v)} placeholder="Kicker label (optional)" />
          <DarkInput value={c.text} onChange={v => updateContent('text', v)} placeholder="Heading text" />
        </>
      );
    case 'subheading':
      return <DarkInput value={c.text} onChange={v => updateContent('text', v)} placeholder="Subheading text" />;
    case 'paragraph':
      return <DarkTextarea value={c.text} onChange={v => updateContent('text', v)} placeholder="Write a paragraph..." rows={5} />;
    case 'quote':
    case 'quote-banner':
      return (
        <>
          <DarkTextarea value={c.text} onChange={v => updateContent('text', v)} placeholder="Quote text" rows={3} />
          <DarkInput value={c.attribution} onChange={v => updateContent('attribution', v)} placeholder="Attribution (optional)" />
        </>
      );
    case 'two-column-text':
      return (
        <>
          <DarkTextarea value={c.left} onChange={v => updateContent('left', v)} placeholder="Left column" rows={4} />
          <DarkTextarea value={c.right} onChange={v => updateContent('right', v)} placeholder="Right column" rows={4} />
        </>
      );
    case 'list':
      return (
        <>
          <DarkInput value={c.title} onChange={v => updateContent('title', v)} placeholder="Title (optional)" />
          <ListEditor items={c.items || []} onChange={v => updateContent('items', v)} placeholder="List item" />
        </>
      );
    case 'photo':
      return (
        <>
          <MediaPicker label="" value={c.url} onChange={v => updateContent('url', v)} aspectRatio="16/9" />
          <DarkInput value={c.caption} onChange={v => updateContent('caption', v)} placeholder="Caption (optional)" />
        </>
      );
    case 'full-width-image':
      return (
        <>
          <MediaPicker label="" value={c.url} onChange={v => updateContent('url', v)} aspectRatio="21/9" />
          <DarkInput value={c.caption} onChange={v => updateContent('caption', v)} placeholder="Caption (optional)" />
        </>
      );
    case 'image-with-text':
      return (
        <>
          <MediaPicker label="" value={c.url} onChange={v => updateContent('url', v)} aspectRatio="4/3" />
          <DarkTextarea value={c.text} onChange={v => updateContent('text', v)} placeholder="Text" rows={4} />
          <div style={{ display: 'flex', gap: 6 }}>
            {[{ id: 'left', label: 'Image left' }, { id: 'right', label: 'Image right' }].map(opt => (
              <button key={opt.id} onClick={() => updateContent('imageSide', opt.id)} style={{ padding: '5px 10px', fontSize: 11, fontWeight: 500, cursor: 'pointer', borderRadius: 999, border: '1px solid ' + ((c.imageSide || 'left') === opt.id ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.15)'), background: (c.imageSide || 'left') === opt.id ? 'rgba(255,255,255,0.12)' : 'transparent', color: (c.imageSide || 'left') === opt.id ? '#fff' : 'rgba(255,255,255,0.5)', fontFamily: 'inherit' }}>{opt.label}</button>
            ))}
          </div>
        </>
      );
    case 'gallery': {
      const photos = c.photos || [];
      return (
        <>
          <PhotoListField photos={photos} onChange={v => updateContent('photos', v)} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <FLabel style={{ margin: 0 }}>Columns</FLabel>
            {[2, 3, 4].map(n => (
              <button key={n} onClick={() => updateContent('columns', n)} style={{ width: 28, height: 24, border: `1px solid ${(c.columns || 3) === n ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.15)'}`, background: (c.columns || 3) === n ? 'rgba(255,255,255,0.12)' : 'transparent', color: (c.columns || 3) === n ? '#FFF' : 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit' }}>{n}</button>
            ))}
          </div>
        </>
      );
    }
    case 'video':
      return <DarkInput value={c.url} onChange={v => updateContent('url', v)} placeholder="YouTube, Vimeo, or direct .mp4 URL" />;
    case 'spacer':
      return (
        <>
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            {[{ id: 'rule', label: 'Divider' }, { id: 'space', label: 'Plain gap' }].map(opt => (
              <button key={opt.id} onClick={() => updateContent('variant', opt.id)} style={{ padding: '5px 12px', fontSize: 12, fontWeight: 500, cursor: 'pointer', borderRadius: 999, border: '1px solid ' + ((c.variant || 'rule') === opt.id ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.15)'), background: (c.variant || 'rule') === opt.id ? 'rgba(255,255,255,0.12)' : 'transparent', color: (c.variant || 'rule') === opt.id ? '#fff' : 'rgba(255,255,255,0.5)', fontFamily: 'inherit' }}>{opt.label}</button>
            ))}
          </div>
          {c.variant === 'space' && (
            <input type="range" min="20" max="200" value={c.height || 40} onChange={e => updateContent('height', parseInt(e.target.value, 10))} style={{ width: '100%', accentColor: '#E03553' }} />
          )}
        </>
      );
    case 'columns': {
      const cols = c.columns || [];
      return (
        <>
          {cols.map((col, i) => (
            <DarkTextarea key={i} value={col.text} onChange={v => { const n = [...cols]; n[i] = { text: v }; updateContent('columns', n); }} placeholder={`Column ${i + 1}`} rows={3} />
          ))}
          <div style={{ display: 'flex', gap: 6 }}>
            {cols.length < 3 && <button onClick={() => updateContent('columns', [...cols, { text: '' }])} style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', background: 'transparent', border: '1px dashed rgba(255,255,255,0.2)', padding: '5px 10px', cursor: 'pointer', fontFamily: 'inherit' }}>+ Add column</button>}
            {cols.length > 2 && <button onClick={() => updateContent('columns', cols.slice(0, -1))} style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', background: 'transparent', border: '1px dashed rgba(255,255,255,0.2)', padding: '5px 10px', cursor: 'pointer', fontFamily: 'inherit' }}>− Remove column</button>}
          </div>
        </>
      );
    }
    case 'button':
      return (
        <>
          <DarkInput value={c.label} onChange={v => updateContent('label', v)} placeholder="Button text" />
          <DarkInput value={c.url} onChange={v => updateContent('url', v)} placeholder="https://..." />
        </>
      );
    case 'dress-code':
      return <DarkTextarea value={c.text} onChange={v => updateContent('text', v)} placeholder="e.g. Black tie, garden formal..." rows={3} />;
    case 'countdown':
      return <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: 0 }}>Counts down to your wedding date automatically — set the date under "The couple" in the Content tab.</p>;
    case 'timeline': {
      const items = c.items || [];
      return (
        <>
          {items.map((ev, i) => (
            <div key={i} style={{ border: '1px solid rgba(255,255,255,0.08)', padding: 8, marginBottom: 6, position: 'relative' }}>
              <button onClick={() => updateContent('items', items.filter((_, j) => j !== i))} style={{ position: 'absolute', top: 4, right: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>×</button>
              <DarkInput value={ev.time} onChange={v => { const n = [...items]; n[i] = { ...ev, time: v }; updateContent('items', n); }} placeholder="Time, e.g. 3:00 PM" />
              <DarkInput value={ev.title} onChange={v => { const n = [...items]; n[i] = { ...ev, title: v }; updateContent('items', n); }} placeholder="Title" />
              <DarkInput value={ev.description} onChange={v => { const n = [...items]; n[i] = { ...ev, description: v }; updateContent('items', n); }} placeholder="Description (optional)" />
            </div>
          ))}
          <button onClick={() => updateContent('items', [...items, { time: '', title: '', description: '' }])} style={{ width: '100%', padding: '6px', border: '1px dashed rgba(255,255,255,0.15)', background: 'transparent', fontSize: 12, color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontFamily: 'inherit' }}>+ Add event</button>
        </>
      );
    }
    case 'event-details':
      return <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: 0 }}>Shows your ceremony &amp; reception venue and time automatically — set them in the wedding planner's Event details page, not here.</p>;
    case 'faq': {
      const items = c.items || [];
      return (
        <>
          {items.map((item, i) => (
            <div key={i} style={{ border: '1px solid rgba(255,255,255,0.08)', padding: 8, marginBottom: 6, position: 'relative' }}>
              <button onClick={() => updateContent('items', items.filter((_, j) => j !== i))} style={{ position: 'absolute', top: 4, right: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>×</button>
              <DarkInput value={item.question} onChange={v => { const n = [...items]; n[i] = { ...item, question: v }; updateContent('items', n); }} placeholder="Question" />
              <DarkTextarea value={item.answer} onChange={v => { const n = [...items]; n[i] = { ...item, answer: v }; updateContent('items', n); }} placeholder="Answer" rows={2} />
            </div>
          ))}
          <button onClick={() => updateContent('items', [...items, { question: '', answer: '' }])} style={{ width: '100%', padding: '6px', border: '1px dashed rgba(255,255,255,0.15)', background: 'transparent', fontSize: 12, color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontFamily: 'inherit' }}>+ Add question</button>
        </>
      );
    }
    case 'couple-intro':
      return (
        <>
          {['partner1', 'partner2'].map((key, idx) => (
            <div key={key} style={{ marginBottom: idx === 0 ? 12 : 0, paddingBottom: idx === 0 ? 12 : 0, borderBottom: idx === 0 ? '1px solid rgba(255,255,255,0.08)' : 'none' }}>
              <MediaPicker label="" value={c[key]?.photoUrl} onChange={v => updateContent(key, { ...c[key], photoUrl: v })} aspectRatio="1/1" />
              <DarkInput value={c[key]?.name} onChange={v => updateContent(key, { ...c[key], name: v })} placeholder="Name" />
              <DarkTextarea value={c[key]?.bio} onChange={v => updateContent(key, { ...c[key], bio: v })} placeholder="Short bio" rows={2} />
            </div>
          ))}
        </>
      );
    case 'single-person':
      return (
        <>
          <MediaPicker label="" value={c.photoUrl} onChange={v => updateContent('photoUrl', v)} aspectRatio="1/1" />
          <DarkInput value={c.name} onChange={v => updateContent('name', v)} placeholder="Name" />
          <DarkInput value={c.role} onChange={v => updateContent('role', v)} placeholder="Role (optional)" />
          <DarkTextarea value={c.bio} onChange={v => updateContent('bio', v)} placeholder="Short bio" rows={3} />
        </>
      );
    case 'wedding-party': {
      const people = c.people || [];
      return (
        <>
          {people.map((p, i) => (
            <div key={i} style={{ border: '1px solid rgba(255,255,255,0.08)', padding: 8, marginBottom: 6, position: 'relative' }}>
              <button onClick={() => updateContent('people', people.filter((_, j) => j !== i))} style={{ position: 'absolute', top: 4, right: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>×</button>
              <MediaPicker label="" value={p.photoUrl} onChange={v => { const n = [...people]; n[i] = { ...p, photoUrl: v }; updateContent('people', n); }} aspectRatio="1/1" />
              <DarkInput value={p.name} onChange={v => { const n = [...people]; n[i] = { ...p, name: v }; updateContent('people', n); }} placeholder="Name" />
              <DarkInput value={p.role} onChange={v => { const n = [...people]; n[i] = { ...p, role: v }; updateContent('people', n); }} placeholder="Role, e.g. Bridesmaid" />
            </div>
          ))}
          <button onClick={() => updateContent('people', [...people, { name: '', role: '', photoUrl: '' }])} style={{ width: '100%', padding: '6px', border: '1px dashed rgba(255,255,255,0.15)', background: 'transparent', fontSize: 12, color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontFamily: 'inherit' }}>+ Add person</button>
        </>
      );
    }
    default:
      return null;
  }
}
