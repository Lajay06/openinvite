import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { X } from "lucide-react";

const CATEGORIES = [
  { value: "venue",          label: "Venue" },
  { value: "catering",       label: "Catering" },
  { value: "photography",    label: "Photography" },
  { value: "flowers",        label: "Flowers" },
  { value: "music",          label: "Music" },
  { value: "attire",         label: "Attire" },
  { value: "transportation", label: "Transportation" },
  { value: "decorations",    label: "Decorations" },
  { value: "rings",          label: "Rings" },
  { value: "stationery",     label: "Stationery" },
  { value: "beauty",         label: "Beauty" },
  { value: "honeymoon",      label: "Honeymoon" },
  { value: "miscellaneous",  label: "Miscellaneous" },
];

export default function BudgetForm({ item, onSubmit, onCancel }) {
  const [formData, setFormData] = useState(item || {
    category: "", item_name: "", budgeted_amount: "",
    actual_amount: "", vendor: "", paid: false, payment_date: "", notes: "",
  });

  const set = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      budgeted_amount: parseFloat(formData.budgeted_amount) || 0,
      actual_amount: parseFloat(formData.actual_amount) || 0,
    });
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          {item ? 'Edit expense' : 'Add expense'}
        </span>
        <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.4)', display: 'flex', padding: 4, borderRadius: 999 }}>
          <X size={16} />
        </button>
      </div>

      <form onSubmit={handleSubmit} style={{ padding: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px 32px' }}>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Label>Category *</Label>
            <Select value={formData.category} onValueChange={v => set('category', v)} required>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Label htmlFor="item_name">Item name *</Label>
            <Input
              id="item_name"
              value={formData.item_name}
              onChange={e => set('item_name', e.target.value)}
              placeholder="Item or service name"
              required
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Label htmlFor="budgeted_amount">Budgeted amount *</Label>
            <Input
              id="budgeted_amount"
              type="number"
              step="0.01"
              min="0"
              value={formData.budgeted_amount}
              onChange={e => set('budgeted_amount', e.target.value)}
              placeholder="0.00"
              required
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Label htmlFor="actual_amount">Actual amount</Label>
            <Input
              id="actual_amount"
              type="number"
              step="0.01"
              min="0"
              value={formData.actual_amount}
              onChange={e => set('actual_amount', e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Label htmlFor="vendor">Vendor</Label>
            <Input
              id="vendor"
              value={formData.vendor}
              onChange={e => set('vendor', e.target.value)}
              placeholder="Vendor or supplier name"
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Label htmlFor="payment_date">Payment date</Label>
            <Input
              id="payment_date"
              type="date"
              value={formData.payment_date}
              onChange={e => set('payment_date', e.target.value)}
            />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginTop: 24, paddingTop: 24, borderTop: '1px solid rgba(10,10,10,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Checkbox
              id="paid"
              checked={formData.paid}
              onCheckedChange={v => set('paid', v)}
            />
            <label htmlFor="paid" style={{ fontSize: 13, fontWeight: 500, color: '#0A0A0A', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Payment has been made
            </label>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Additional notes about this expense"
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(10,10,10,0.08)' }}>
          <button type="button" onClick={onCancel} className="btn-editorial-secondary">
            Cancel
          </button>
          <button type="submit" className="btn-primary">
            {item ? 'Update expense' : 'Add expense'}
          </button>
        </div>
      </form>
    </div>
  );
}
