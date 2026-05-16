import React from 'react';
import { Gift, Edit, Trash2, ArrowRight } from 'lucide-react';

const labelStyle = {
  fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
};

export default function RegistryList({ items, onEdit, onDelete, loading }) {
  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#444444', fontSize: 13, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Loading…</div>;

  if (items.length === 0) {
    return (
      <div style={{ padding: '48px 24px', textAlign: 'center', border: '1px solid rgba(10,10,10,0.08)' }}>
        <Gift size={32} style={{ color: 'rgba(10,10,10,0.2)', margin: '0 auto 12px' }} />
        <p style={{ fontSize: 14, fontWeight: 600, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: 6 }}>No platforms added yet</p>
        <p style={{ fontSize: 13, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Add your first registry platform link above.</p>
      </div>
    );
  }

  return (
    <div style={{ border: '1px solid rgba(10,10,10,0.08)' }}>
      <div style={{ display: 'flex', padding: '10px 20px', background: '#FAFAFA', borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
        <span style={{ ...labelStyle, flex: 2 }}>Store</span>
        <span style={{ ...labelStyle, flex: 3 }}>Description</span>
        <span style={{ ...labelStyle, flex: 1, textAlign: 'right' }}>Actions</span>
      </div>
      {items.map((item, i) => (
        <div key={item.id} style={{ display: 'flex', alignItems: 'center', padding: '14px 20px', borderBottom: i < items.length - 1 ? '1px solid rgba(10,10,10,0.06)' : 'none' }}>
          <div style={{ flex: 2, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, border: '1px solid rgba(10,10,10,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {item.image_url
                ? <img src={item.image_url} alt={item.store_name} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 4 }} />
                : <Gift size={18} style={{ color: 'rgba(10,10,10,0.25)' }} />
              }
            </div>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{item.store_name}</span>
          </div>
          <div style={{ flex: 3 }}>
            <span style={{ fontSize: 13, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{item.description || '—'}</span>
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
            <a href={item.url} target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", border: '1px solid rgba(10,10,10,0.15)', borderRadius: 999, padding: '5px 12px', textDecoration: 'none' }}>
              Visit <ArrowRight size={11} />
            </a>
            <button onClick={() => onEdit(item)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.35)', padding: 6, display: 'flex' }}>
              <Edit size={14} />
            </button>
            <button onClick={() => onDelete(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#E03553', padding: 6, display: 'flex' }}>
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
