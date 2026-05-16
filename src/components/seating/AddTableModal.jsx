import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X } from 'lucide-react';

export default function AddTableModal({ onAdd, onClose }) {
  const [name, setName] = useState('');
  const [shape, setShape] = useState('round');
  const [capacity, setCapacity] = useState(8);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name && capacity > 0) {
      onAdd({ name, shape, capacity: Number(capacity) });
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 400, background: '#FFFFFF' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Add table
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.4)', display: 'flex', padding: 4 }}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Label htmlFor="tname">Table name</Label>
              <Input
                id="tname"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Table 1, Head Table"
                required
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Label>Shape</Label>
              <Select value={shape} onValueChange={setShape}>
                <SelectTrigger><SelectValue placeholder="Select shape" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="round">Round</SelectItem>
                  <SelectItem value="rectangle">Rectangle</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Label htmlFor="tcap">Capacity</Label>
              <Input
                id="tcap"
                type="number"
                min="1"
                max="20"
                value={capacity}
                onChange={e => setCapacity(e.target.value)}
                required
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '16px 24px', borderTop: '1px solid rgba(10,10,10,0.08)' }}>
            <button type="button" onClick={onClose} className="btn-editorial-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Add table</button>
          </div>
        </form>
      </div>
    </div>
  );
}
