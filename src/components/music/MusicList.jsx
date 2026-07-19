import React from 'react';
import { Music } from 'lucide-react';
import MusicTrackRow from './MusicTrackRow';

const labelStyle = {
  fontSize: 11, fontWeight: 700,
  letterSpacing: '0.08em', color: 'rgba(10,10,10,0.6)',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
};

const CATEGORIES = ['ceremony', 'cocktail_hour', 'dinner', 'dancing', 'special_moments', 'general'];

const MUSIC_CAT_COLOURS = {
  ceremony:        '#E03553',
  cocktail_hour:   '#8a9a00',
  dinner:          '#803D81',
  dancing:         '#6B2CAE',
  special_moments: '#3a7a96',
  general:         'rgba(10,10,10,0.6)',
};

const CATEGORY_LABELS = {
  ceremony: 'Ceremony',
  cocktail_hour: 'Cocktail hour',
  dinner: 'Dinner',
  dancing: 'Dancing',
  special_moments: 'Special moments',
  general: 'General',
};

export default function MusicList({ items, groupByCategory, onEdit, onDelete, onToggleApproval, readOnly = false }) {
  if (items.length === 0) {
    return (
      <div style={{ background: '#F5F4F0', padding: '64px 24px', textAlign: 'center' }}>
        <Music size={28} style={{ color: 'rgba(10,10,10,0.2)', margin: '0 auto 12px', display: 'block' }} />
        <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.6)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>No songs yet. Add your first song above.</p>
      </div>
    );
  }

  if (!groupByCategory) {
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 16px', borderBottom: '1px solid rgba(10,10,10,0.06)', background: '#FAFAFA' }}>
          <span style={{ width: 14, flexShrink: 0 }} />
          <span style={{ width: 20, flexShrink: 0 }} />
          <span style={{ width: 48, flexShrink: 0 }} />
          <span style={{ flex: 1, ...labelStyle }}>Title</span>
          <span style={{ width: 100, ...labelStyle }}>Category</span>
          <span style={{ width: 36, ...labelStyle, textAlign: 'right' }}>Time</span>
          <span style={{ width: 120, flexShrink: 0 }} />
        </div>
        {items.map((item, i) => (
          <MusicTrackRow key={item.id} item={item} index={i} onEdit={onEdit} onDelete={onDelete} onToggleApproval={onToggleApproval} readOnly={readOnly} />
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
        <div key={cat}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid rgba(10,10,10,0.06)', borderLeft: `3px solid ${MUSIC_CAT_COLOURS[cat] || 'rgba(10,10,10,0.2)'}`, background: '#FAFAFA' }}>
            <span style={{ ...labelStyle, color: MUSIC_CAT_COLOURS[cat] || 'rgba(10,10,10,0.6)' }}>{CATEGORY_LABELS[cat] || cat}</span>
            <span style={{ fontSize: 12, color: 'rgba(10,10,10,0.6)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{catItems.length} song{catItems.length !== 1 ? 's' : ''}</span>
          </div>
          {catItems.map((item, i) => (
            <MusicTrackRow key={item.id} item={item} index={i} onEdit={onEdit} onDelete={onDelete} onToggleApproval={onToggleApproval} readOnly={readOnly} />
          ))}
        </div>
      ))}
    </div>
  );
}
