import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Edit3, Trash2, Heart, ExternalLink, Eye, X, Save, Image as ImageIcon } from 'lucide-react';
import { interactiveDivProps, useModalFocusTrap } from '@/lib/a11y';

const labelStyle = {
  fontSize: 11, fontWeight: 700,
  letterSpacing: '0.08em', color: 'rgba(10,10,10,0.6)',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
};

const CATEGORY_COLORS = {
  venue:        { color: '#FFFFFF', bg: 'rgba(10,10,10,0.6)' },
  decor:        { color: '#FFFFFF', bg: '#803D81' },
  flowers:      { color: '#FFFFFF', bg: '#6b7700' },
  dress:        { color: '#FFFFFF', bg: '#E03553' },
  cake:         { color: '#FFFFFF', bg: '#8a9a00' },
  colors:       { color: '#FFFFFF', bg: '#0A1930' },
  invitations:  { color: '#FFFFFF', bg: '#3a7a96' },
  photography:  { color: '#FFFFFF', bg: 'rgba(10,10,10,0.55)' },
  hairstyle:    { color: '#FFFFFF', bg: '#6B2CAE' },
  makeup:       { color: '#FFFFFF', bg: '#803D81' },
  centerpieces: { color: '#FFFFFF', bg: '#6b7700' },
  lighting:     { color: '#FFFFFF', bg: '#8a9a00' },
  other:        { color: '#FFFFFF', bg: 'rgba(10,10,10,0.6)' },
};

function EditItemModal({ item, editData, setEditData, onSave, onClose }) {
  const dialogRef = useModalFocusTrap(onClose);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9200, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={onClose} {...interactiveDivProps(onClose, { label: 'Close' })}>
      <div ref={dialogRef} tabIndex={-1} style={{ width: '100%', maxWidth: 440, background: '#FFFFFF' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Edit item</span>
          <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.6)', display: 'flex', padding: 4 }}><X size={14} /></button>
        </div>
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Label style={labelStyle}>Title</Label>
            <Input value={editData.title} onChange={e => setEditData(p => ({ ...p, title: e.target.value }))} placeholder="Title" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Label style={labelStyle}>Tags</Label>
            <Input value={editData.tags} onChange={e => setEditData(p => ({ ...p, tags: e.target.value }))} placeholder="romantic, vintage, outdoor" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Label style={labelStyle}>Notes</Label>
            <Textarea value={editData.notes} onChange={e => setEditData(p => ({ ...p, notes: e.target.value }))} placeholder="What you love about this…" />
          </div>
        </div>
        <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(10,10,10,0.08)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} className="btn-editorial-secondary" style={{ fontSize: 13 }}>Cancel</button>
          <button onClick={onSave} className="btn-primary" style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Save size={13} />Save
          </button>
        </div>
      </div>
    </div>
  );
}

function FullViewModal({ item, onClose }) {
  const dialogRef = useModalFocusTrap(onClose);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9200, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={onClose} {...interactiveDivProps(onClose, { label: 'Close' })}>
      <div ref={dialogRef} tabIndex={-1} style={{ display: 'flex', maxWidth: 1100, width: '100%', maxHeight: '90vh', overflow: 'hidden', background: '#FFFFFF' }} onClick={e => e.stopPropagation()}>
        <div style={{ flex: 1, background: '#F5F5F5', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          <img src={item.image_url} alt={item.title} style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain' }} />
        </div>
        <div style={{ width: 320, padding: 24, display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <p style={{ fontSize: 18, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", flex: 1, margin: 0 }}>{item.title}</p>
            <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.6)', display: 'flex', padding: 4, flexShrink: 0 }}><X size={16} /></button>
          </div>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', padding: '2px 8px', borderRadius: 999, background: 'rgba(10,10,10,0.06)', color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {item.category}
          </span>
          {item.notes && <p style={{ fontSize: 13, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1.6 }}>{item.notes}</p>}
          {item.tags?.length > 0 && (
            <div>
              <p style={{ ...labelStyle, marginBottom: 8 }}>Tags</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {item.tags.map((tag, i) => (
                  <span key={i} style={{ fontSize: 11, padding: '2px 10px', border: '1px solid rgba(10,10,10,0.12)', borderRadius: 999, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{tag}</span>
                ))}
              </div>
            </div>
          )}
          {item.source_url && (
            <a href={item.source_url} target="_blank" rel="noopener noreferrer" className="btn-editorial-secondary" style={{ fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, textDecoration: 'none', marginTop: 'auto' }}>
              <ExternalLink size={12} />View source
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function MoodboardCard({ item, size, onDelete, onUpdate, readOnly }) {
  const [hovered, setHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showFull, setShowFull] = useState(false);
  const [liked, setLiked] = useState(false);
  const [editData, setEditData] = useState({ title: item.title, notes: item.notes || '', tags: item.tags?.join(', ') || '' });

  const cat = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.other;
  const rowSpan = size === 'large' ? 3 : size === 'small' ? 1 : 2;

  const handleSave = () => {
    onUpdate(item.id, { ...editData, tags: editData.tags.split(',').map(t => t.trim()).filter(Boolean) });
    setIsEditing(false);
  };

  return (
    <>
      <div
        style={{ gridRow: `span ${rowSpan}`, position: 'relative', overflow: 'hidden', background: '#F5F5F5' }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <img src={item.image_url} alt={item.title} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.3s', transform: hovered ? 'scale(1.04)' : 'scale(1)' }} />

        {/* Hover overlay */}
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', opacity: hovered ? 1 : 0, transition: 'opacity 0.25s', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 12 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', padding: '2px 8px', borderRadius: 999, background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.9)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {item.category}
            </span>
            {!readOnly && (
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={() => setIsEditing(true)} aria-label="Edit" style={{ width: 28, height: 28, background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Edit3 size={12} />
                </button>
                <button onClick={() => onDelete(item.id)} aria-label="Delete" style={{ width: 28, height: 28, background: 'rgba(224,53,83,0.3)', border: 'none', cursor: 'pointer', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Trash2 size={12} />
                </button>
              </div>
            )}
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: 8, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.title}</p>
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={() => setShowFull(true)} aria-label="View" style={{ width: 28, height: 28, background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Eye size={12} />
              </button>
              <button onClick={() => setLiked(v => !v)} aria-label={liked ? 'Unlike' : 'Like'} style={{ width: 28, height: 28, background: liked ? 'rgba(224,53,83,0.4)' : 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', color: liked ? '#E03553' : '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Heart size={12} style={{ fill: liked ? '#E03553' : 'none' }} />
              </button>
              {item.source_url && (
                <a href={item.source_url} target="_blank" rel="noopener noreferrer" style={{ width: 28, height: 28, background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
                  <ExternalLink size={12} />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit modal */}
      {isEditing && (
        <EditItemModal
          item={item}
          editData={editData}
          setEditData={setEditData}
          onSave={handleSave}
          onClose={() => setIsEditing(false)}
        />
      )}

      {/* Full view modal */}
      {showFull && (
        <FullViewModal item={item} onClose={() => setShowFull(false)} />
      )}
    </>
  );
}

export default function MoodboardGrid({ items, onDeleteItem, onUpdateItem, readOnly = false }) {
  if (items.length === 0) {
    return (
      <div style={{ padding: '80px 24px', textAlign: 'center', border: '1px solid rgba(10,10,10,0.08)' }}>
        <ImageIcon size={40} style={{ color: 'rgba(10,10,10,0.15)', margin: '0 auto 16px' }} />
        <p style={{ fontSize: 16, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: 8 }}>Your moodboard is empty</p>
        <p style={{ fontSize: 14, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Start adding inspiration images to bring your wedding vision to life</p>
      </div>
    );
  }

  const itemsWithSizes = items.map((item, i) => ({
    ...item,
    size: i % 5 === 0 ? 'large' : i % 3 === 0 ? 'small' : 'medium',
  }));

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gridAutoRows: 200, gap: 4 }}>
      {itemsWithSizes.map(item => (
        <MoodboardCard key={item.id} item={item} size={item.size} onDelete={onDeleteItem} onUpdate={onUpdateItem} readOnly={readOnly} />
      ))}
    </div>
  );
}
