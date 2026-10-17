import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { tableCapacityError, MIN_TABLE_CAPACITY, MAX_TABLE_CAPACITY } from '@/lib/tableCapacity';

export default function AddTableModal({ onAdd, onClose }) {
  const [name, setName] = useState('');
  const [shape, setShape] = useState('round');
  const [capacity, setCapacity] = useState(8);
  const [capacityError, setCapacityError] = useState(null);

  // The same rule a capacity edit uses (src/lib/tableCapacity.js), with no
  // one seated yet.
  const handleSubmit = (e) => {
    e.preventDefault();
    const error = tableCapacityError(capacity, 0);
    setCapacityError(error);
    if (name && !error) {
      onAdd({ name, shape, capacity: Number(capacity) });
    }
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent hideClose title="Add table" className="oi-modal-scale max-w-[400px] p-0 gap-0">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid rgba(10,10,10,0.12)' }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Add table
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.6)', display: 'flex', padding: 4 }}>
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
                min={MIN_TABLE_CAPACITY}
                max={MAX_TABLE_CAPACITY}
                value={capacity}
                onChange={e => { setCapacity(e.target.value); setCapacityError(null); }}
                required
              />
              {capacityError && (
                <p role="alert" style={{ fontSize: 12, color: '#E03553', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{capacityError}</p>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '16px 24px', borderTop: '1px solid rgba(10,10,10,0.12)' }}>
            <button type="button" onClick={onClose} className="btn-editorial-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Add table</button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
