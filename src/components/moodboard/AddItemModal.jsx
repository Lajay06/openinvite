import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Save, Image as ImageIcon } from 'lucide-react';

const labelStyle = {
  fontSize: 11, fontWeight: 700,
  letterSpacing: '0.08em', color: 'rgba(10,10,10,0.6)',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
};

export default function AddItemModal({ onClose, onAddItem, categories }) {
  const [formData, setFormData] = useState({ title: '', image_url: '', source_url: '', category: 'other', tags: '', notes: '' });
  const [preview, setPreview] = useState('');

  const set = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field === 'image_url') setPreview(value);
  };

  const handleSubmit = () => {
    if (!formData.title || !formData.image_url) return;
    onAddItem({ ...formData, tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean) });
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 680, maxHeight: '90vh', overflowY: 'auto', background: '#FFFFFF' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ImageIcon size={14} style={{ color: 'rgba(10,10,10,0.6)' }} />
            <span style={{ fontSize: 15, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Add inspiration</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.6)', display: 'flex', padding: 4 }}><X size={16} /></button>
        </div>

        <div style={{ padding: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {/* Left: fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Label style={labelStyle}>Title *</Label>
              <Input value={formData.title} onChange={e => set('title', e.target.value)} placeholder="Give your inspiration a title" required />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Label style={labelStyle}>Image URL *</Label>
              <Input type="url" value={formData.image_url} onChange={e => set('image_url', e.target.value)} placeholder="https://example.com/image.jpg" required />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Label style={labelStyle}>Source URL</Label>
              <Input type="url" value={formData.source_url} onChange={e => set('source_url', e.target.value)} placeholder="Original source link (optional)" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Label style={labelStyle}>Category</Label>
              <Select value={formData.category} onValueChange={v => set('category', v)}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c} value={c} style={{ textTransform: 'capitalize' }}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Label style={labelStyle}>Tags</Label>
              <Input value={formData.tags} onChange={e => set('tags', e.target.value)} placeholder="romantic, vintage, outdoor" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Label style={labelStyle}>Notes</Label>
              <Textarea value={formData.notes} onChange={e => set('notes', e.target.value)} placeholder="What you love about this inspiration…" />
            </div>
          </div>

          {/* Right: preview */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Label style={labelStyle}>Preview</Label>
            <div style={{ aspectRatio: '1/1', border: '1px solid rgba(10,10,10,0.08)', background: '#F5F5F5', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {preview
                ? <img src={preview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setPreview('')} />
                : <div style={{ textAlign: 'center', color: 'rgba(10,10,10,0.3)' }}>
                    <ImageIcon size={36} style={{ margin: '0 auto 8px' }} />
                    <p style={{ fontSize: 12, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Image preview</p>
                  </div>
              }
            </div>
          </div>
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(10,10,10,0.08)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} className="btn-editorial-secondary" style={{ fontSize: 13 }}>Cancel</button>
          <button onClick={handleSubmit} disabled={!formData.title || !formData.image_url} className="btn-primary"
            style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, opacity: !formData.title || !formData.image_url ? 0.5 : 1 }}>
            <Save size={13} />Add to moodboard
          </button>
        </div>
      </div>
    </div>
  );
}
