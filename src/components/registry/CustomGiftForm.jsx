import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
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

// Same https:// check the server enforces again (defense in depth) before
// ever sending this link to the public guest site — see
// api/_lib/guestSafeRegistry.js's isSafeHttpsUrl. Validating on entry here
// just gives the couple an immediate, clear error instead of silently
// having their link dropped later.
function isHttpsUrl(value) {
  if (!value.trim()) return true; // optional field — empty is valid
  try {
    return new URL(value.trim()).protocol === 'https:';
  } catch {
    return false;
  }
}

export default function CustomGiftForm({ item, onSubmit, onClose }) {
  const [formData, setFormData] = useState(item || { title: '', description: '', category: 'honeymoon', requested_amount: '', image_url: '', payment_link_url: '' });
  const [linkError, setLinkError] = useState('');
  const set = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isHttpsUrl(formData.payment_link_url || '')) {
      setLinkError('Enter a valid https:// link, or leave this blank.');
      return;
    }
    setLinkError('');
    onSubmit({ ...formData, requested_amount: parseFloat(formData.requested_amount) || 0 });
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent hideClose title={item ? 'Edit cash fund' : 'Create cash fund'} className="max-w-[480px] p-0 gap-0">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {item ? 'Edit cash fund' : 'Create cash fund'}
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.6)', display: 'flex', padding: 4 }}><X size={16} /></button>
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
              <Label htmlFor="payment_link_url">Payment link (optional)</Label>
              <Input
                id="payment_link_url"
                type="url"
                value={formData.payment_link_url || ''}
                onChange={e => { set('payment_link_url', e.target.value); if (linkError) setLinkError(''); }}
                placeholder="https://paypal.me/yourname"
              />
              <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.6)', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0 }}>
                Paste your PayPal.me, Stripe payment link, or bank transfer link. Guests are taken here to contribute.
              </p>
              {linkError ? (
                <p style={{ fontSize: 12, color: '#E03553', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0 }}>{linkError}</p>
              ) : !formData.payment_link_url?.trim() && (
                <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.45)', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0, fontStyle: 'italic' }}>
                  No link added yet. Guests won't see a Contribute button.
                </p>
              )}
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
      </DialogContent>
    </Dialog>
  );
}
