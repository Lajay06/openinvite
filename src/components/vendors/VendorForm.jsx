import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";

const CATEGORIES = [
  { value: "venue",          label: "Venue" },
  { value: "catering",       label: "Catering" },
  { value: "photography",    label: "Photography" },
  { value: "videography",    label: "Videography" },
  { value: "flowers",        label: "Flowers & florist" },
  { value: "music",          label: "Music & DJ" },
  { value: "bakery",         label: "Bakery & cake" },
  { value: "transportation", label: "Transportation" },
  { value: "beauty",         label: "Beauty & hair" },
  { value: "attire",         label: "Attire & fashion" },
  { value: "planning",       label: "Wedding planning" },
  { value: "decorations",    label: "Decorations" },
  { value: "entertainment",  label: "Entertainment" },
  { value: "other",          label: "Other" },
];

const STATUSES = [
  { value: "researching", label: "Researching" },
  { value: "contacted",   label: "Contacted" },
  { value: "quoted",      label: "Quoted" },
  { value: "booked",      label: "Booked" },
  { value: "rejected",    label: "Rejected" },
];

const PRICE_RANGES = [
  { value: "$",    label: "$ — Budget friendly" },
  { value: "$$",   label: "$$ — Moderate" },
  { value: "$$$",  label: "$$$ — Premium" },
  { value: "$$$$", label: "$$$$ — Luxury" },
];

export default function VendorForm({ vendor, onSubmit, onCancel }) {
  const [formData, setFormData] = useState(vendor || {
    name: "", category: "", contact_person: "", phone: "", email: "",
    website: "", address: "", rating: "", price_range: "",
    status: "researching", quoted_price: "", contract_date: "",
    payment_schedule: "", notes: "",
  });

  const set = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      rating: formData.rating ? parseFloat(formData.rating) : null,
      quoted_price: formData.quoted_price ? parseFloat(formData.quoted_price) : null,
    });
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          {vendor?.id ? 'Edit vendor' : 'Add vendor'}
        </span>
        <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.4)', display: 'flex', padding: 4, borderRadius: 999 }}>
          <X size={16} />
        </button>
      </div>

      <form onSubmit={handleSubmit} style={{ padding: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px 32px' }}>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, gridColumn: '1 / -1' }}>
            <Label htmlFor="name">Business name *</Label>
            <Input id="name" value={formData.name} onChange={e => set('name', e.target.value)} placeholder="Vendor or business name" required />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Label>Category *</Label>
            <Select value={formData.category} onValueChange={v => set('category', v)} required>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Label>Status</Label>
            <Select value={formData.status} onValueChange={v => set('status', v)}>
              <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
              <SelectContent>
                {STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Label htmlFor="contact_person">Contact person</Label>
            <Input id="contact_person" value={formData.contact_person} onChange={e => set('contact_person', e.target.value)} placeholder="Primary contact name" />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" value={formData.phone} onChange={e => set('phone', e.target.value)} placeholder="Phone number" />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={formData.email} onChange={e => set('email', e.target.value)} placeholder="Email address" />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Label htmlFor="website">Website</Label>
            <Input id="website" value={formData.website} onChange={e => set('website', e.target.value)} placeholder="Website URL" />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, gridColumn: '1 / -1' }}>
            <Label htmlFor="address">Address</Label>
            <Input id="address" value={formData.address} onChange={e => set('address', e.target.value)} placeholder="Street address or city" />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Label htmlFor="quoted_price">Quoted price</Label>
            <Input id="quoted_price" type="number" step="0.01" min="0" value={formData.quoted_price} onChange={e => set('quoted_price', e.target.value)} placeholder="0.00" />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Label>Price range</Label>
            <Select value={formData.price_range} onValueChange={v => set('price_range', v)}>
              <SelectTrigger><SelectValue placeholder="Select price range" /></SelectTrigger>
              <SelectContent>
                {PRICE_RANGES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Label htmlFor="rating">Rating (1–5)</Label>
            <Input id="rating" type="number" min="1" max="5" step="0.1" value={formData.rating} onChange={e => set('rating', e.target.value)} placeholder="e.g. 4.8" />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Label htmlFor="contract_date">Contract date</Label>
            <Input id="contract_date" type="date" value={formData.contract_date} onChange={e => set('contract_date', e.target.value)} />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 24, paddingTop: 24, borderTop: '1px solid rgba(10,10,10,0.08)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Label htmlFor="payment_schedule">Payment schedule</Label>
            <Input id="payment_schedule" value={formData.payment_schedule} onChange={e => set('payment_schedule', e.target.value)} placeholder="e.g. 50% deposit, 50% on wedding day" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" value={formData.notes} onChange={e => set('notes', e.target.value)} placeholder="Additional notes about this vendor" />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(10,10,10,0.08)' }}>
          <button type="button" onClick={onCancel} className="btn-editorial-secondary">Cancel</button>
          <button type="submit" className="btn-primary">{vendor?.id ? 'Update vendor' : 'Add vendor'}</button>
        </div>
      </form>
    </div>
  );
}
