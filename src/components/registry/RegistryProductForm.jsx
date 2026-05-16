import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const PLATFORMS = ['Zola', 'MyRegistry', 'The Knot', 'Amazon', 'Target', 'Williams Sonoma', 'Crate & Barrel', 'Other'];
const CATEGORIES = [
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'home_decor', label: 'Home decor' },
  { value: 'bedding', label: 'Bedding' },
  { value: 'bathroom', label: 'Bathroom' },
  { value: 'outdoor', label: 'Outdoor' },
  { value: 'electronics', label: 'Electronics' },
  { value: 'other', label: 'Other' },
];

export default function RegistryProductForm({ item, onSubmit, onClose }) {
  const [formData, setFormData] = useState(item || {
    name: '', description: '', price: '', image_url: '', product_url: '',
    category: 'other', registry_platform: '', external_id: '',
    quantity_requested: 1, priority: 'medium', notes: '',
  });
  const set = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      price: parseFloat(formData.price) || 0,
      quantity_requested: parseInt(formData.quantity_requested) || 1,
      quantity_purchased: item?.quantity_purchased || 0,
      purchased_by: item?.purchased_by || [],
    });
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', background: '#FFFFFF' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid rgba(10,10,10,0.08)', position: 'sticky', top: 0, background: '#FFFFFF', zIndex: 1 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {item ? 'Edit product' : 'Add product'}
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.4)', display: 'flex', padding: 4 }}><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Label htmlFor="name">Product name</Label>
                <Input id="name" value={formData.name} onChange={e => set('name', e.target.value)} placeholder="e.g. KitchenAid stand mixer" required />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Label htmlFor="price">Price</Label>
                <Input id="price" type="number" step="0.01" value={formData.price} onChange={e => set('price', e.target.value)} placeholder="299.99" required />
              </div>
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
                <Label>Platform</Label>
                <Select value={formData.registry_platform} onValueChange={val => set('registry_platform', val)}>
                  <SelectTrigger><SelectValue placeholder="Select platform" /></SelectTrigger>
                  <SelectContent>
                    {PLATFORMS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Label htmlFor="quantity_requested">Quantity needed</Label>
                <Input id="quantity_requested" type="number" min="1" value={formData.quantity_requested} onChange={e => set('quantity_requested', e.target.value)} />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Label>Priority</Label>
                <Select value={formData.priority} onValueChange={val => set('priority', val)}>
                  <SelectTrigger><SelectValue placeholder="Select priority" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Label htmlFor="product_url">Product URL</Label>
              <Input id="product_url" type="url" value={formData.product_url} onChange={e => set('product_url', e.target.value)} placeholder="https://store.com/product" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Label htmlFor="image_url">Product image URL</Label>
              <Input id="image_url" type="url" value={formData.image_url} onChange={e => set('image_url', e.target.value)} placeholder="https://store.com/image.jpg" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={formData.description} onChange={e => set('description', e.target.value)} placeholder="Product details" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Label htmlFor="notes">Private notes</Label>
              <Textarea id="notes" value={formData.notes} onChange={e => set('notes', e.target.value)} placeholder="Internal notes (not visible to guests)" />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '16px 24px', borderTop: '1px solid rgba(10,10,10,0.08)', position: 'sticky', bottom: 0, background: '#FFFFFF' }}>
            <button type="button" onClick={onClose} className="btn-editorial-secondary">Cancel</button>
            <button type="submit" className="btn-primary">{item ? 'Update product' : 'Add product'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
