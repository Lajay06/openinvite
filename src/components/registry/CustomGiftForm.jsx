import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const CATEGORIES = [
  { value: 'honeymoon', label: 'Honeymoon' },
  { value: 'home_fund', label: 'Home fund' },
  { value: 'charity', label: 'Charity' },
  { value: 'experience', label: 'Experience' },
  { value: 'custom', label: 'Custom' },
];

export default function CustomGiftForm({ item, onSubmit, onClose }) {
  const [formData, setFormData] = useState(item || { title: '', description: '', category: 'honeymoon', requested_amount: '', image_url: '' });
  const set = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ ...formData, requested_amount: parseFloat(formData.requested_amount) || 0 });
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 480, background: '#FFFFFF' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {item ? 'Edit cash fund' : 'Create cash fund'}
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.4)', display: 'flex', padding: 4 }}><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Label htmlFor="title">Fund name</Label>
              <Input id="title" value={formData.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Honeymoon airfare" required />
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Label>Category</Label>
                <Select value={formData.category} onValueChange={val => set('category', val)}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Label htmlFor="requested_amount">Goal amount</Label>
                <Input id="requested_amount" type="number" value={formData.requested_amount} onChange={e => set('requested_amount', e.target.value)} placeholder="500" required />
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Label htmlFor="image_url">Image URL (optional)</Label>
              <Input id="image_url" type="url" value={formData.image_url} onChange={e => set('image_url', e.target.value)} placeholder="https://example.com/image.png" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea id="description" value={formData.description} onChange={e => set('description', e.target.value)} placeholder="Tell guests about this fund" />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '16px 24px', borderTop: '1px solid rgba(10,10,10,0.08)' }}>
            <button type="button" onClick={onClose} className="btn-editorial-secondary">Cancel</button>
            <button type="submit" className="btn-primary">{item ? 'Update fund' : 'Create fund'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
