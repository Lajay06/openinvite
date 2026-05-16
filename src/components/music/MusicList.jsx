import React from 'react';
import { Music } from 'lucide-react';
import MusicTrackRow from './MusicTrackRow';

const labelStyle = {
  fontSize: 11, fontWeight: 700,
  letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
};

const CATEGORIES = ['ceremony', 'cocktail_hour', 'dinner', 'dancing', 'special_moments', 'general'];

const MUSIC_CAT_COLOURS = {
  ceremony:        '#E03553',
  cocktail_hour:   '#8a9a00',
  dinner:          '#803D81',
  dancing:         '#6B2CAE',
  special_moments: '#3a7a96',
  general:         'rgba(10,10,10,0.4)',
};

const CATEGORY_LABELS = {
  ceremony: 'Ceremony',
  cocktail_hour: 'Cocktail hour',
  dinner: 'Dinner',
  dancing: 'Dancing',
  special_moments: 'Special moments',
  general: 'General',
};

export default function MusicList({ items, groupByCategory, onEdit, onDelete, onToggleApproval }) {
  if (items.length === 0) {
    return (
      <div style={{ background: '#0A0A0A', padding: '64px 24px', textAlign: 'center' }}>
        <Music size={28} style={{ color: '#E03553', margin: '0 auto 12px' }} />
        <p style={{ fontSize: 13, color: '#555555', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>No songs yet. Add your first song above.</p>
      </div>
    );
  }

  if (!groupByCategory) {
    return (
      <div style={{ background: '#0A0A0A' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '8px 16px', borderBottom: '1px solid #1A1A1A' }}>
          <span style={{ width: 24 }} />
          <span style={{ width: 40, flexShrink: 0 }} />
          <span style={{ flex: 1, ...labelStyle, color: 'rgba(255,255,255,0.3)' }}>Title</span>
          <span style={{ width: 112, ...labelStyle, color: 'rgba(255,255,255,0.3)' }}>Category</span>
          <span style={{ width: 40, ...labelStyle, color: 'rgba(255,255,255,0.3)', textAlign: 'right' }}>Time</span>
          <span style={{ width: 112, flexShrink: 0 }} />
          <span style={{ width: 6, flexShrink: 0 }} />
        </div>
        {items.map((item, i) => (
          <MusicTrackRow key={item.id} item={item} index={i} onEdit={onEdit} onDelete={onDelete} onToggleApproval={onToggleApproval} />
        ))}
      </div>
    );
  }

  const grouped = CATEGORIES.reduce((acc, cat) => {
    const catItems = items.filter(i => i.category === cat);
    if (catItems.length > 0) acc[cat] = catItems;
    return acc;
  }, {});

  const uncategorized = items.filter(i => !CATEGORIES.includes(i.category));
  if (uncategorized.length) grouped['other'] = uncategorized;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {Object.entries(grouped).map(([cat, catItems]) => (
        <div key={cat} style={{ background: '#0A0A0A' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid #1A1A1A', borderLeft: `3px solid ${MUSIC_CAT_COLOURS[cat] || 'rgba(10,10,10,0.4)'}` }}>
            <span style={{ ...labelStyle, color: MUSIC_CAT_COLOURS[cat] || 'rgba(255,255,255,0.3)' }}>{CATEGORY_LABELS[cat] || cat}</span>
            <span style={{ fontSize: 12, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{catItems.length} song{catItems.length !== 1 ? 's' : ''}</span>
          </div>
          {catItems.map((item, i) => (
            <MusicTrackRow key={item.id} item={item} index={i} onEdit={onEdit} onDelete={onDelete} onToggleApproval={onToggleApproval} />
          ))}
        </div>
      ))}
    </div>
  );
}
