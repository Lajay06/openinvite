import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Loader2 } from "lucide-react";

const PJS = "'Plus Jakarta Sans', sans-serif";

const COMMON_TAGS = [
  "Family", "Work", "College friends", "High school",
  "Neighbors", "Close friends", "Extended family", "Bride's side", "Groom's side",
];

const DIETARY_OPTIONS = [
  'None', 'Vegetarian', 'Vegan', 'Gluten free', 'Dairy free',
  'Halal', 'Kosher', 'Nut allergy', 'Shellfish allergy', 'Other',
];
const KNOWN_DIETARY = new Set(DIETARY_OPTIONS.filter(o => o !== 'None' && o !== 'Other'));

/* ── Dietary helpers ─────────────────────────────────────────────────────── */

function parseDietary(str) {
  if (!str || !str.trim()) return { selected: [], other: '' };
  const parts = str.split(',').map(s => s.trim()).filter(Boolean);
  const selected = [];
  let other = '';
  for (const part of parts) {
    if (KNOWN_DIETARY.has(part)) {
      selected.push(part);
    } else if (part === 'Other') {
      if (!selected.includes('Other')) selected.push('Other');
    } else if (part.startsWith('Other: ')) {
      if (!selected.includes('Other')) selected.push('Other');
      other = part.slice(7).trim();
    } else {
      // Old free-text — treat as "Other" with the text
      if (!selected.includes('Other')) selected.push('Other');
      other = other ? `${other}, ${part}` : part;
    }
  }
  return { selected, other };
}

function dietaryToString(selected, other) {
  if (selected.length === 0) return '';
  return selected.map(s => (s === 'Other' && other ? `Other: ${other}` : s)).join(', ');
}

/* ── Component ───────────────────────────────────────────────────────────── */

export default function GuestForm({ guest, onSubmit, onCancel, saving = false }) {
  const [formData, setFormData] = useState(guest || {
    name: '', email: '', phone: '', category: 'family',
    tags: [], table_assignment: '', dietary_restrictions: '',
    rsvp_status: 'pending', plus_one: false, plus_one_name: '', plus_one_dietary: '', notes: '',
  });
  const [tagInput, setTagInput] = useState('');

  // Dietary pill state — parsed from the existing field value
  const init = parseDietary((guest || {}).dietary_restrictions || '');
  const [dietarySelected, setDietarySelected] = useState(init.selected);
  const [dietaryOther, setDietaryOther] = useState(init.other);

  // Plus-one dietary pill state
  const initPo = parseDietary((guest || {}).plus_one_dietary || '');
  const [poDietarySelected, setPoDietarySelected] = useState(initPo.selected);
  const [poDietaryOther, setPoDietaryOther] = useState(initPo.other);

  const set = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  /* Tags */
  const addTag = (e) => {
    e?.preventDefault();
    const t = tagInput.trim();
    if (t && !formData.tags?.includes(t)) {
      set('tags', [...(formData.tags || []), t]);
      setTagInput('');
    }
  };
  const addQuickTag = (tag) => {
    if (!formData.tags?.includes(tag)) set('tags', [...(formData.tags || []), tag]);
  };
  const removeTag = (tag) => set('tags', (formData.tags || []).filter(t => t !== tag));

  /* Dietary pills */
  const toggleDietary = (option) => {
    let next;
    if (option === 'None') {
      next = [];
    } else {
      next = dietarySelected.includes(option)
        ? dietarySelected.filter(s => s !== option)
        : [...dietarySelected, option];
    }
    setDietarySelected(next);
    set('dietary_restrictions', dietaryToString(next, dietaryOther));
  };

  const handleOtherText = (text) => {
    setDietaryOther(text);
    set('dietary_restrictions', dietaryToString(dietarySelected, text));
  };

  const togglePoDietary = (option) => {
    let next;
    if (option === 'None') {
      next = [];
    } else {
      next = poDietarySelected.includes(option)
        ? poDietarySelected.filter(s => s !== option)
        : [...poDietarySelected, option];
    }
    setPoDietarySelected(next);
    set('plus_one_dietary', dietaryToString(next, poDietaryOther));
  };

  const handlePoOtherText = (text) => {
    setPoDietaryOther(text);
    set('plus_one_dietary', dietaryToString(poDietarySelected, text));
  };

  const noneActive = dietarySelected.length === 0;
  const poNoneActive = poDietarySelected.length === 0;

  return (
    <div style={{ border: '1px solid rgba(10,10,10,0.08)', marginBottom: 24 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS }}>
          {guest ? 'Edit guest' : 'Add new guest'}
        </span>
        <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.4)', display: 'flex', padding: 4, borderRadius: 999 }}>
          <X size={16} />
        </button>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); onSubmit(formData); }} style={{ padding: 24 }}>

        {/* ── 2-column grid ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px 32px' }}>

          {/* Row 1: Name + Email */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Label htmlFor="name">Full name *</Label>
            <Input id="name" value={formData.name} onChange={e => set('name', e.target.value)} placeholder="Guest's full name" required />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={formData.email} onChange={e => set('email', e.target.value)} placeholder="guest@example.com" />
          </div>

          {/* Row 2: Phone + Category */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" value={formData.phone} onChange={e => set('phone', e.target.value)} placeholder="Phone number" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Label>Category</Label>
            <Select value={formData.category} onValueChange={v => set('category', v)}>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="family">Family</SelectItem>
                <SelectItem value="friends">Friends</SelectItem>
                <SelectItem value="colleagues">Colleagues</SelectItem>
                <SelectItem value="partners_family">Partner's family</SelectItem>
                <SelectItem value="partners_friends">Partner's friends</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Row 3: Table + RSVP */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Label htmlFor="table_assignment">Table assignment</Label>
            <Input id="table_assignment" value={formData.table_assignment} onChange={e => set('table_assignment', e.target.value)} placeholder="Table number or name" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Label>RSVP status</Label>
            <Select value={formData.rsvp_status} onValueChange={v => set('rsvp_status', v)}>
              <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="attending">Attending</SelectItem>
                <SelectItem value="declined">Declined</SelectItem>
                <SelectItem value="maybe">Maybe</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tags — full width */}
          <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Label htmlFor="tags">
              Tags{' '}
              <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, fontSize: 11, color: 'rgba(10,10,10,0.4)' }}>
                (for smart seating)
              </span>
            </Label>
            <div style={{ display: 'flex', gap: 8 }}>
              <Input
                id="tags"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addTag(e)}
                placeholder="Add a tag and press Enter"
                style={{ flex: 1 }}
              />
              <button type="button" onClick={addTag} className="btn-editorial-secondary" style={{ flexShrink: 0 }}>
                Add
              </button>
            </div>

            {/* Quick-add */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'rgba(10,10,10,0.4)', fontFamily: PJS }}>Quick add:</span>
              {COMMON_TAGS.map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => addQuickTag(tag)}
                  disabled={formData.tags?.includes(tag)}
                  style={{
                    fontSize: 11, fontWeight: 600, padding: '3px 10px',
                    borderRadius: 999, border: '1px solid rgba(10,10,10,0.18)',
                    background: formData.tags?.includes(tag) ? 'rgba(10,10,10,0.06)' : 'transparent',
                    color: formData.tags?.includes(tag) ? 'rgba(10,10,10,0.3)' : '#444444',
                    cursor: formData.tags?.includes(tag) ? 'default' : 'pointer',
                    fontFamily: PJS,
                  }}
                >
                  {tag}
                </button>
              ))}
            </div>

            {/* Active tags */}
            {formData.tags && formData.tags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {formData.tags.map(tag => (
                  <span key={tag} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    fontSize: 11, fontWeight: 700, padding: '4px 10px',
                    borderRadius: 999, background: '#0A0A0A', color: '#FFFFFF',
                    fontFamily: PJS,
                  }}>
                    {tag}
                    <button type="button" onClick={() => removeTag(tag)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', display: 'flex', padding: 0, lineHeight: 1 }}>
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Extra fields ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginTop: 24, paddingTop: 24, borderTop: '1px solid rgba(10,10,10,0.08)' }}>

          {/* Dietary restrictions — pill buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Label>
              Dietary restrictions
            </Label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {DIETARY_OPTIONS.map(option => {
                const active = option === 'None' ? noneActive : dietarySelected.includes(option);
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => toggleDietary(option)}
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      padding: '5px 13px',
                      borderRadius: 999,
                      border: active ? 'none' : '1px solid rgba(10,10,10,0.15)',
                      background: active ? '#E03553' : 'rgba(10,10,10,0.04)',
                      color: active ? '#FFFFFF' : '#444444',
                      cursor: 'pointer',
                      fontFamily: PJS,
                      transition: 'background 0.12s, color 0.12s, border 0.12s',
                    }}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
            {/* "Other" text input */}
            {dietarySelected.includes('Other') && (
              <Input
                value={dietaryOther}
                onChange={e => handleOtherText(e.target.value)}
                placeholder="Describe the restriction…"
                style={{ maxWidth: 360 }}
              />
            )}
          </div>

          {/* Plus one */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Checkbox id="plus_one" checked={formData.plus_one} onCheckedChange={v => set('plus_one', v)} />
            <label htmlFor="plus_one" style={{ fontSize: 13, fontWeight: 500, color: '#0A0A0A', cursor: 'pointer', fontFamily: PJS }}>
              Guest can bring a plus one
            </label>
          </div>

          {formData.plus_one && (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Label htmlFor="plus_one_name">Plus one name</Label>
                <Input id="plus_one_name" value={formData.plus_one_name} onChange={e => set('plus_one_name', e.target.value)} placeholder="Plus one's name" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Label>Plus one dietary restrictions</Label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                  {DIETARY_OPTIONS.map(option => {
                    const active = option === 'None' ? poNoneActive : poDietarySelected.includes(option);
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => togglePoDietary(option)}
                        style={{
                          fontSize: 12, fontWeight: 600, padding: '5px 13px', borderRadius: 999,
                          border: active ? 'none' : '1px solid rgba(10,10,10,0.15)',
                          background: active ? '#E03553' : 'rgba(10,10,10,0.04)',
                          color: active ? '#FFFFFF' : '#444444',
                          cursor: 'pointer', fontFamily: PJS,
                          transition: 'background 0.12s, color 0.12s, border 0.12s',
                        }}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
                {poDietarySelected.includes('Other') && (
                  <Input
                    value={poDietaryOther}
                    onChange={e => handlePoOtherText(e.target.value)}
                    placeholder="Describe the restriction…"
                    style={{ maxWidth: 360 }}
                  />
                )}
              </div>
            </>
          )}

          {/* Notes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" value={formData.notes} onChange={e => set('notes', e.target.value)} placeholder="Additional notes about this guest" />
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(10,10,10,0.08)' }}>
          <button type="button" onClick={onCancel} className="btn-editorial-secondary" disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={saving} style={{ opacity: saving ? 0.75 : 1 }}>
            {saving && <Loader2 size={13} className="animate-spin" />}
            {saving ? 'Saving…' : (guest ? 'Update guest' : 'Add guest')}
          </button>
        </div>
      </form>
    </div>
  );
}
