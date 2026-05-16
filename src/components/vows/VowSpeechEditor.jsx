import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save } from 'lucide-react';

const labelStyle = {
  fontSize: 11, fontWeight: 700,
  letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
};

export default function VowSpeechEditor({ initialData, onSave, onCancel }) {
  const [data, setData] = useState(initialData || {
    title: '', type: 'vow', author: '', content: '', notes: '',
  });

  const set = (field, value) => setData(prev => ({ ...prev, [field]: value }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ padding: '16px 32px', borderBottom: '1px solid rgba(10,10,10,0.08)', flexShrink: 0 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          {initialData?.id ? 'Edit' : 'New'} {data.type === 'vow' ? 'vow' : 'speech'}
        </span>
      </div>

      {/* Form */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Label style={labelStyle}>Title *</Label>
            <Input value={data.title} onChange={e => set('title', e.target.value)} placeholder="e.g. My vows to Alex" required />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Label style={labelStyle}>Author / Speaker *</Label>
            <Input value={data.author} onChange={e => set('author', e.target.value)} placeholder="e.g. Jane Doe" required />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 240 }}>
          <Label style={labelStyle}>Type</Label>
          <Select value={data.type} onValueChange={v => set('type', v)}>
            <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="vow">Vow</SelectItem>
              <SelectItem value="speech">Speech</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
          <Label style={labelStyle}>Content</Label>
          <Textarea
            value={data.content}
            onChange={e => set('content', e.target.value)}
            placeholder="Write your vows or speech here…"
            style={{ minHeight: 280, resize: 'vertical' }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Label style={labelStyle}>Private notes / prompts</Label>
          <Textarea
            value={data.notes}
            onChange={e => set('notes', e.target.value)}
            placeholder="e.g. 'Pause here', 'Look at Alex when saying this'…"
          />
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: '16px 32px', borderTop: '1px solid rgba(10,10,10,0.08)', display: 'flex', justifyContent: 'flex-end', gap: 8, flexShrink: 0 }}>
        <button type="button" onClick={onCancel} className="btn-editorial-secondary" style={{ fontSize: 13 }}>Cancel</button>
        <button type="button" onClick={() => onSave(data)} disabled={!data.title || !data.author} className="btn-primary"
          style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, opacity: !data.title || !data.author ? 0.5 : 1 }}>
          <Save size={13} />Save
        </button>
      </div>
    </div>
  );
}
