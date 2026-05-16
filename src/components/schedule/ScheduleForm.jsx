import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";

const CATEGORIES = [
  { value: "ceremony",       label: "Ceremony" },
  { value: "reception",      label: "Reception" },
  { value: "photography",    label: "Photography" },
  { value: "preparation",    label: "Preparation" },
  { value: "transportation", label: "Transportation" },
  { value: "rehearsal",      label: "Rehearsal" },
  { value: "pre_wedding",    label: "Pre-wedding" },
  { value: "post_wedding",   label: "Post-wedding" },
  { value: "other",          label: "Other" },
];

export default function ScheduleForm({ item, onSubmit, onCancel }) {
  const [formData, setFormData] = useState(item || {
    event_name: "", event_date: "", start_time: "", end_time: "",
    location: "", description: "", responsible_person: "", category: "other", notes: "",
  });

  const set = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          {item?.id ? 'Edit event' : 'Add event'}
        </span>
        <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.4)', display: 'flex', padding: 4, borderRadius: 999 }}>
          <X size={16} />
        </button>
      </div>

      <form onSubmit={handleSubmit} style={{ padding: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px 32px' }}>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Label htmlFor="event_name">Event name *</Label>
            <Input id="event_name" value={formData.event_name} onChange={e => set('event_name', e.target.value)} placeholder="Event or activity name" required />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Label>Category</Label>
            <Select value={formData.category} onValueChange={v => set('category', v)}>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Label htmlFor="event_date">Event date *</Label>
            <Input id="event_date" type="date" value={formData.event_date} onChange={e => set('event_date', e.target.value)} required />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Label htmlFor="start_time">Start time *</Label>
            <Input id="start_time" type="time" value={formData.start_time} onChange={e => set('start_time', e.target.value)} required />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Label htmlFor="end_time">End time</Label>
            <Input id="end_time" type="time" value={formData.end_time} onChange={e => set('end_time', e.target.value)} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Label htmlFor="location">Location</Label>
            <Input id="location" value={formData.location} onChange={e => set('location', e.target.value)} placeholder="Venue or location" />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, gridColumn: '1 / -1' }}>
            <Label htmlFor="responsible_person">Responsible person</Label>
            <Input id="responsible_person" value={formData.responsible_person} onChange={e => set('responsible_person', e.target.value)} placeholder="Who is responsible for this event" />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 24, paddingTop: 24, borderTop: '1px solid rgba(10,10,10,0.08)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" value={formData.description} onChange={e => set('description', e.target.value)} placeholder="What happens during this event" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" value={formData.notes} onChange={e => set('notes', e.target.value)} placeholder="Additional notes" />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(10,10,10,0.08)' }}>
          <button type="button" onClick={onCancel} className="btn-editorial-secondary">Cancel</button>
          <button type="submit" className="btn-primary">{item?.id ? 'Update event' : 'Add event'}</button>
        </div>
      </form>
    </div>
  );
}
