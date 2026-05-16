import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function RegistryForm({ item, onSubmit, onClose }) {
  const [formData, setFormData] = useState(item || { store_name: '', url: '', description: '', image_url: '' });
  const set = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  const handleSubmit = (e) => { e.preventDefault(); onSubmit(formData); };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 480, background: '#FFFFFF' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {item ? 'Edit platform link' : 'Add platform link'}
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.4)', display: 'flex', padding: 4 }}><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Label htmlFor="store_name">Store name</Label>
              <Input id="store_name" value={formData.store_name} onChange={e => set('store_name', e.target.value)} placeholder="e.g. Crate & Barrel" required />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Label htmlFor="url">Registry URL</Label>
              <Input id="url" type="url" value={formData.url} onChange={e => set('url', e.target.value)} placeholder="https://store.com/registry/your-name" required />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Label htmlFor="image_url">Store logo URL (optional)</Label>
              <Input id="image_url" type="url" value={formData.image_url} onChange={e => set('image_url', e.target.value)} placeholder="https://store.com/logo.png" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Label htmlFor="description">Note for guests (optional)</Label>
              <Textarea id="description" value={formData.description} onChange={e => set('description', e.target.value)} placeholder="A short note for your guests" />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '16px 24px', borderTop: '1px solid rgba(10,10,10,0.08)' }}>
            <button type="button" onClick={onClose} className="btn-editorial-secondary">Cancel</button>
            <button type="submit" className="btn-primary">{item ? 'Update link' : 'Add link'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
