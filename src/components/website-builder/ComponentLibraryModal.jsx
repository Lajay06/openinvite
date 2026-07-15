/**
 * ComponentLibraryModal — the Wix/Squarespace-style "Add a section" modal
 * (feat/component-library). Opened from two places: the on-canvas "+"
 * insert points (UniverseBlocks.jsx's InsertPoint, only visible in the
 * builder's own inline canvas) and the side-panel Content tab (BlockList.jsx)
 * — both call the same onSelect(catalogId) with the same modal, so there is
 * one add-block experience, not two.
 *
 * Thumbnails are small illustrative mockups (bars/shapes standing in for
 * text/images), not literal miniaturised renders of the real block — same
 * approach the deleted pre-#92 SectionTemplatePicker used, and the same
 * approach Wix/Squarespace's own pickers use. They ARE styled from the
 * couple's actual active universe (theme colours + typography), so the
 * grid visibly reflects "styled automatically for your universe" even
 * before anything is inserted — the real block, once added, renders with
 * full fidelity through UniverseBlocks.jsx, not through this thumbnail.
 */
import React, { useState } from 'react';
import { X, Search } from 'lucide-react';
import { BLOCK_TYPES, CATEGORIES } from '@/components/guest-website/blocks/blockTypes';
import { getUniverse } from '@/lib/universeCatalog';

const THUMB_KIND = {
  heading: 'text-lines-2', subheading: 'text-lines-1', paragraph: 'text-lines-3', quote: 'quote',
  'two-column-text': 'columns-text', list: 'list',
  image: 'image', 'image-with-text': 'image-text', gallery: 'grid', 'full-width-image': 'image-wide', video: 'video',
  divider: 'divider', spacer: 'spacer', columns: 'columns', button: 'button', 'quote-banner': 'banner', 'dress-code': 'card',
  countdown: 'countdown', timeline: 'timeline', 'event-details': 'card', faq: 'faq',
  'couple-intro': 'avatars-2', 'single-person': 'avatar-1', 'wedding-party': 'avatars-3',
};

function Bar({ width, color, height = 6 }) {
  return <div style={{ width, height, background: color, borderRadius: 1 }} />;
}

function Thumbnail({ catalogId, theme, typography }) {
  const kind = THUMB_KIND[catalogId] || 'text-lines-2';
  const ink = `${theme.lightText}35`;
  const soft = `${theme.lightText}12`;
  const wrap = { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 10, boxSizing: 'border-box' };

  switch (kind) {
    case 'text-lines-1':
      return <div style={wrap}><Bar width="55%" color={ink} height={7} /></div>;
    case 'text-lines-2':
      return <div style={wrap}><Bar width="60%" color={ink} height={8} /><Bar width="38%" color={soft} height={5} /></div>;
    case 'text-lines-3':
      return <div style={wrap}><Bar width="80%" color={soft} /><Bar width="70%" color={soft} /><Bar width="50%" color={soft} /></div>;
    case 'quote':
      return <div style={wrap}><span style={{ fontFamily: typography.headingFont, fontStyle: 'italic', fontSize: 22, color: theme.accent, lineHeight: 1 }}>“</span><Bar width="65%" color={soft} /><Bar width="35%" color={soft} /></div>;
    case 'columns-text':
      return (
        <div style={{ ...wrap, flexDirection: 'row', alignItems: 'flex-start' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}><Bar width="90%" color={soft} /><Bar width="70%" color={soft} /></div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}><Bar width="90%" color={soft} /><Bar width="70%" color={soft} /></div>
        </div>
      );
    case 'list':
      return <div style={{ ...wrap, alignItems: 'flex-start', paddingLeft: 24 }}>{[0, 1, 2].map(i => <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}><span style={{ color: theme.accent, fontSize: 10 }}>—</span><Bar width={40 - i * 6} color={soft} height={5} /></div>)}</div>;
    case 'image':
      return <div style={{ ...wrap, padding: 14 }}><div style={{ width: '100%', height: '100%', background: soft, borderRadius: 2 }} /></div>;
    case 'image-wide':
      return <div style={{ width: '100%', height: '100%', background: soft }} />;
    case 'image-text':
      return (
        <div style={{ ...wrap, flexDirection: 'row', padding: 10 }}>
          <div style={{ flex: 1, height: '100%', background: soft, borderRadius: 2 }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5, paddingLeft: 8 }}><Bar width="90%" color={soft} height={5} /><Bar width="70%" color={soft} height={5} /></div>
        </div>
      );
    case 'grid':
      return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 3, width: '70%', height: '70%' }}>{[0, 1, 2, 3, 4, 5].map(i => <div key={i} style={{ background: soft, borderRadius: 1 }} />)}</div>;
    case 'video':
      return <div style={{ ...wrap, padding: 14, position: 'relative' }}><div style={{ width: '100%', height: '100%', background: soft, borderRadius: 2 }} /><div style={{ position: 'absolute', width: 0, height: 0, borderTop: '7px solid transparent', borderBottom: '7px solid transparent', borderLeft: `11px solid ${theme.accent}` }} /></div>;
    case 'divider':
      return <div style={wrap}><div style={{ width: '60%', height: 1, background: ink }} /></div>;
    case 'spacer':
      return <div style={wrap}><div style={{ width: 10, height: 10, border: `1px dashed ${ink}` }} /></div>;
    case 'columns':
      return <div style={{ ...wrap, flexDirection: 'row' }}>{[0, 1, 2].map(i => <div key={i} style={{ flex: 1, height: '70%', background: soft, borderRadius: 1 }} />)}</div>;
    case 'button':
      return <div style={wrap}><div style={{ padding: '6px 18px', borderRadius: 999, background: theme.accent }} /></div>;
    case 'banner':
      return <div style={{ width: '100%', height: '100%', background: theme.darkBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Bar width="55%" color={`${theme.darkText}50`} /></div>;
    case 'card':
      return <div style={{ ...wrap, border: `1px solid ${theme.accent}50`, width: '75%', height: '65%' }}><Bar width="50%" color={ink} height={5} /><Bar width="65%" color={soft} height={5} /></div>;
    case 'countdown':
      return <div style={wrap}><span style={{ fontFamily: typography.headingFont, fontSize: 20, color: theme.lightText }}>12</span><Bar width="45%" color={soft} height={5} /></div>;
    case 'timeline':
      return <div style={{ ...wrap, alignItems: 'flex-start', paddingLeft: 20 }}>{[0, 1, 2].map(i => <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Bar width={14} color={theme.accent} height={5} /><Bar width={34} color={soft} height={5} /></div>)}</div>;
    case 'faq':
      return <div style={{ ...wrap, alignItems: 'flex-start', paddingLeft: 20 }}>{[0, 1].map(i => <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 4 }}><Bar width={50} color={ink} height={5} /><Bar width={64} color={soft} height={4} /></div>)}</div>;
    case 'avatar-1':
      return <div style={wrap}><div style={{ width: 28, height: 28, borderRadius: '50%', background: soft }} /><Bar width="40%" color={soft} height={5} /></div>;
    case 'avatars-2':
      return <div style={{ ...wrap, flexDirection: 'row', gap: 14 }}>{[0, 1].map(i => <div key={i} style={{ width: 28, height: 28, borderRadius: '50%', background: soft }} />)}</div>;
    case 'avatars-3':
      return <div style={{ ...wrap, flexDirection: 'row', gap: 8 }}>{[0, 1, 2].map(i => <div key={i} style={{ width: 22, height: 22, borderRadius: '50%', background: soft }} />)}</div>;
    default:
      return <div style={wrap}><Bar width="60%" color={soft} /></div>;
  }
}

export default function ComponentLibraryModal({ onSelect, onClose, theme, typography, activeUniverse }) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');

  const filtered = BLOCK_TYPES.filter(t => {
    const matchesCategory = category === 'All' || t.category === category;
    const matchesSearch = search === '' || t.label.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const universeName = getUniverse(activeUniverse)?.name || 'Your universe';

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ width: '100%', maxWidth: 980, height: '82vh', maxHeight: 720, background: '#1C1C1E', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <h2 style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 700, color: '#FFFFFF', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Add a section</h2>
            <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Styled automatically for your universe · {universeName}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', padding: 4 }}><X size={18} /></button>
        </div>

        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Category sidebar */}
          <div style={{ width: 160, flexShrink: 0, borderRight: '1px solid rgba(255,255,255,0.08)', padding: '16px 8px', overflowY: 'auto' }}>
            {['All', ...CATEGORIES].map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', marginBottom: 2, border: 'none', borderRadius: 6,
                  background: category === cat ? 'rgba(255,255,255,0.1)' : 'transparent',
                  color: category === cat ? '#FFFFFF' : 'rgba(255,255,255,0.5)',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search + grid */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', padding: '8px 12px' }}>
                <Search size={14} color="rgba(255,255,255,0.4)" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search sections..."
                  style={{ flex: 1, border: 'none', background: 'transparent', color: '#FFFFFF', fontSize: 13, outline: 'none', fontFamily: 'inherit' }}
                />
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
              {filtered.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.35)', fontSize: 13, marginTop: 40 }}>No sections match “{search}”</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 14 }}>
                  {filtered.map(t => (
                    <button
                      key={t.catalogId}
                      onClick={() => onSelect(t.catalogId)}
                      style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', padding: 0, cursor: 'pointer', textAlign: 'left', overflow: 'hidden', transition: 'border-color 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#E03553'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                    >
                      <div style={{ height: 90, background: theme.lightBg }}>
                        <Thumbnail catalogId={t.catalogId} theme={theme} typography={typography} />
                      </div>
                      <div style={{ padding: '8px 10px' }}>
                        <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#FFFFFF', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{t.label}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
