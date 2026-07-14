/**
 * BlockList — the couple-facing add/reorder/edit/delete UI for a page's
 * content blocks (feat/block-builder, fix/block-builder-add-ui). Lives in
 * the builder's Content tab (WBRightPanel.jsx's ContentTab), writing to
 * `{page}Content.blocks` via the same onChange(field, value) pattern every
 * other field in that tab already uses. No style/colour controls here by
 * design — a block's look always comes from the active universe
 * (UniverseBlocks.jsx), never a per-block override, so there's nothing to
 * expose here but content.
 *
 * fix/block-builder-add-ui: the previous version only appended a new block
 * to the end, via a row of small pill buttons easy to miss at the bottom of
 * an already-long form. This version puts a clear, full-width "+ Add block"
 * affordance at every insert position — above the first block, between
 * every pair of blocks, and after the last — so a couple can insert
 * anywhere, not just at the end, and the control itself is unmistakable
 * rather than buried.
 */
import React, { useState } from 'react';
import { ChevronUp, ChevronDown, Trash2, Plus, X } from 'lucide-react';
import { MediaPicker, FLabel } from './SectionEditorFields';
import { BLOCK_TYPES, blockLabel, newBlock } from '@/components/guest-website/blocks/blockTypes';

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

function BlockFields({ block, updateContent }) {
  const c = block.content || {};
  switch (block.type) {
    case 'heading':
      return (
        <>
          <DarkInput value={c.kicker} onChange={v => updateContent('kicker', v)} placeholder="Kicker label (optional)" />
          <DarkInput value={c.text} onChange={v => updateContent('text', v)} placeholder="Heading text" />
        </>
      );
    case 'paragraph':
      return <DarkTextarea value={c.text} onChange={v => updateContent('text', v)} placeholder="Write a paragraph..." rows={5} />;
    case 'photo':
      return (
        <>
          <MediaPicker label="" value={c.url} onChange={v => updateContent('url', v)} aspectRatio="16/9" />
          <DarkInput value={c.caption} onChange={v => updateContent('caption', v)} placeholder="Caption (optional)" />
        </>
      );
    case 'gallery': {
      const photos = c.photos || [];
      return (
        <>
          {photos.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6, marginBottom: 10 }}>
              {photos.map((p, i) => (
                <div key={i} style={{ position: 'relative', aspectRatio: '1', overflow: 'hidden', background: 'rgba(255,255,255,0.08)' }}>
                  <img src={p} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                  <button onClick={() => updateContent('photos', photos.filter((_, j) => j !== i))} style={{ position: 'absolute', top: 2, right: 2, width: 18, height: 18, borderRadius: '50%', background: 'rgba(0,0,0,0.7)', border: 'none', color: '#fff', fontSize: 11, cursor: 'pointer' }}>×</button>
                </div>
              ))}
            </div>
          )}
          <MediaPicker label="" value="" onChange={v => v && updateContent('photos', [...photos, v])} aspectRatio="1/1" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <FLabel style={{ margin: 0 }}>Columns</FLabel>
            {[2, 3, 4].map(n => (
              <button key={n} onClick={() => updateContent('columns', n)} style={{ width: 28, height: 24, border: `1px solid ${(c.columns || 3) === n ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.15)'}`, background: (c.columns || 3) === n ? 'rgba(255,255,255,0.12)' : 'transparent', color: (c.columns || 3) === n ? '#FFF' : 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit' }}>{n}</button>
            ))}
          </div>
        </>
      );
    }
    case 'quote':
      return (
        <>
          <DarkTextarea value={c.text} onChange={v => updateContent('text', v)} placeholder="Quote text" rows={3} />
          <DarkInput value={c.attribution} onChange={v => updateContent('attribution', v)} placeholder="Attribution (optional)" />
        </>
      );
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
    default:
      return null;
  }
}

// A clear, always-visible "+ Add block" affordance. Clicking it reveals a
// picker of the 6 block types right in place; picking one inserts a new
// block at exactly this position and closes the picker. Rendered above the
// first block, between every pair, and after the last — so both
// insert-between and add-at-end are the same mechanism, not two different
// ones a couple has to learn separately.
function InsertSlot({ onInsert }) {
  const [open, setOpen] = useState(false);

  if (open) {
    return (
      <div style={{ border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.04)', padding: 10, marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', color: 'rgba(255,255,255,0.5)' }}>Add a block</span>
          <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: 2, display: 'flex' }}><X size={14} /></button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {BLOCK_TYPES.map(t => (
            <button
              key={t.type}
              onClick={() => { onInsert(t.type); setOpen(false); }}
              style={{ padding: '7px 14px', fontSize: 12, fontWeight: 600, color: '#FFFFFF', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setOpen(true)}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', padding: '9px 0', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.55)', background: 'transparent', border: '1px dashed rgba(255,255,255,0.25)', cursor: 'pointer', fontFamily: 'inherit', marginBottom: 8, transition: 'color 0.15s, border-color 0.15s' }}
      onMouseEnter={e => { e.currentTarget.style.color = '#FFFFFF'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)'; }}
      onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.55)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; }}
    >
      <Plus size={13} /> Add block
    </button>
  );
}

export default function BlockList({ blocks = [], onChange }) {
  const sorted = [...blocks].sort((a, b) => (a.order || 0) - (b.order || 0));

  const commit = (next) => {
    onChange(next.map((b, i) => ({ ...b, order: i })));
  };

  const updateBlock = (id, updater) => {
    commit(sorted.map(b => b.id === id ? updater(b) : b));
  };

  const move = (index, dir) => {
    const newIdx = dir === 'up' ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= sorted.length) return;
    const next = [...sorted];
    [next[index], next[newIdx]] = [next[newIdx], next[index]];
    commit(next);
  };

  const remove = (id) => commit(sorted.filter(b => b.id !== id));

  // Inserts at `index` — 0 is before the first block, sorted.length is
  // after the last (i.e. add-at-end), any value between is insert-between.
  const insertAt = (index, type) => {
    const next = [...sorted];
    next.splice(index, 0, newBlock(type));
    commit(next);
  };

  return (
    <div>
      <InsertSlot onInsert={type => insertAt(0, type)} />
      {sorted.map((block, i) => (
        <React.Fragment key={block.id}>
          <div style={{ border: '1px solid rgba(255,255,255,0.08)', padding: 10, marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', color: 'rgba(255,255,255,0.4)' }}>{blockLabel(block.type)}</span>
              <div style={{ display: 'flex', gap: 2 }}>
                <button onClick={() => move(i, 'up')} disabled={i === 0} style={{ background: 'none', border: 'none', cursor: i === 0 ? 'default' : 'pointer', color: i === 0 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.5)', padding: 3, display: 'flex' }}><ChevronUp size={14} /></button>
                <button onClick={() => move(i, 'down')} disabled={i === sorted.length - 1} style={{ background: 'none', border: 'none', cursor: i === sorted.length - 1 ? 'default' : 'pointer', color: i === sorted.length - 1 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.5)', padding: 3, display: 'flex' }}><ChevronDown size={14} /></button>
                <button onClick={() => remove(block.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(224,53,83,0.7)', padding: 3, display: 'flex' }}><Trash2 size={14} /></button>
              </div>
            </div>
            <BlockFields block={block} updateContent={(key, val) => updateBlock(block.id, b => ({ ...b, content: { ...(b.content || {}), [key]: val } }))} />
          </div>
          <InsertSlot onInsert={type => insertAt(i + 1, type)} />
        </React.Fragment>
      ))}
    </div>
  );
}
