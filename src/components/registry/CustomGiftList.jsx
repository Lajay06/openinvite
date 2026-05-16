import React from 'react';
import { DollarSign, Edit, Trash2 } from 'lucide-react';

const labelStyle = {
  fontSize: 11, fontWeight: 700,
  letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
};

const CATEGORY_LABELS = { honeymoon: 'Honeymoon', home_fund: 'Home fund', charity: 'Charity', experience: 'Experience', custom: 'Custom' };
const CATEGORY_COLORS = { honeymoon: '#803D81', home_fund: '#0A1930', charity: '#E03553', experience: '#6b7700', custom: 'rgba(10,10,10,0.5)' };

export default function CustomGiftList({ items, onEdit, onDelete, loading }) {
  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#444444', fontSize: 13, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Loading…</div>;

  if (items.length === 0) {
    return (
      <div style={{ padding: '48px 24px', textAlign: 'center', border: '1px solid rgba(10,10,10,0.08)' }}>
        <DollarSign size={32} style={{ color: 'rgba(10,10,10,0.2)', margin: '0 auto 12px' }} />
        <p style={{ fontSize: 14, fontWeight: 600, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: 6 }}>No cash funds yet</p>
        <p style={{ fontSize: 13, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Create a fund for honeymoon, home, or charitable contributions.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 1, background: 'rgba(10,10,10,0.06)' }}>
      {items.map(item => {
        const catColor = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.custom;
        const catLabel = CATEGORY_LABELS[item.category] || 'Custom';
        return (
          <div key={item.id} style={{ background: '#FFFFFF', padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', padding: '2px 8px', borderRadius: 999, background: catColor.bg, color: catColor.color, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {catLabel}
              </span>
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={() => onEdit(item)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.35)', padding: 4, display: 'flex' }}><Edit size={13} /></button>
                <button onClick={() => onDelete(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#E03553', padding: 4, display: 'flex' }}><Trash2 size={13} /></button>
              </div>
            </div>
            {item.image_url && (
              <img src={item.image_url} alt={item.title} style={{ width: '100%', height: 120, objectFit: 'cover', marginBottom: 12 }} />
            )}
            <p style={{ fontSize: 15, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: 6 }}>{item.title}</p>
            {item.description && (
              <p style={{ fontSize: 13, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: 14, lineHeight: 1.5 }}>{item.description}</p>
            )}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
              <span style={labelStyle}>Goal</span>
              <span style={{ fontSize: 22, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>${item.requested_amount?.toLocaleString()}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
