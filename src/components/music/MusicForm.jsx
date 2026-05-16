import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Save, Search, Loader2 } from 'lucide-react';
import { InvokeLLM } from '@/integrations/Core';

const labelStyle = {
  fontSize: 11, fontWeight: 700,
  letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
};

const CATEGORIES = [
  { value: 'ceremony', label: 'Ceremony' },
  { value: 'cocktail_hour', label: 'Cocktail hour' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'dancing', label: 'Dancing' },
  { value: 'special_moments', label: 'Special moments' },
  { value: 'general', label: 'General' },
];

function Toggle({ value, onChange }) {
  return (
    <button type="button" onClick={() => onChange(!value)}
      style={{ width: 36, height: 20, borderRadius: 10, border: 'none', background: value ? '#E03553' : 'rgba(10,10,10,0.12)', cursor: 'pointer', position: 'relative', flexShrink: 0 }}>
      <span style={{ position: 'absolute', top: 2, left: value ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#FFFFFF', transition: 'left 0.18s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
    </button>
  );
}

export default function MusicForm({ item, onSubmit, onCancel }) {
  const [formData, setFormData] = useState(item || {
    song_title: '', artist: '', album: '', duration: '',
    category: 'general', guest_suggestion: false, approved: true,
    notes: '', spotify_track_id: '', preview_url: '', image_url: '',
  });
  const [isSearching, setIsSearching] = useState(false);

  const set = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  const handleSpotifySearch = async () => {
    if (!formData.song_title && !formData.artist) return;
    setIsSearching(true);
    try {
      await InvokeLLM({
        prompt: `Find info about "${formData.song_title}" by "${formData.artist}".`,
        add_context_from_internet: true,
      });
    } catch (e) {
      console.error(e);
    }
    setIsSearching(false);
  };

  return (
    <div style={{ background: '#FFFFFF', borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          {item?.id ? 'Edit song' : 'Add song manually'}
        </span>
        <button type="button" onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.4)', display: 'flex', padding: 4 }}>
          <X size={14} />
        </button>
      </div>

      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Label style={labelStyle}>Song title *</Label>
            <Input value={formData.song_title} onChange={e => set('song_title', e.target.value)} placeholder="Enter song title" required />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Label style={labelStyle}>Artist *</Label>
            <div style={{ display: 'flex', gap: 8 }}>
              <Input value={formData.artist} onChange={e => set('artist', e.target.value)} placeholder="Enter artist name" required />
              <button type="button" onClick={handleSpotifySearch} disabled={isSearching}
                className="btn-editorial-secondary" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                {isSearching ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Label style={labelStyle}>Album</Label>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              {formData.image_url && <img src={formData.image_url} alt="album" style={{ width: 36, height: 36, objectFit: 'cover', flexShrink: 0 }} />}
              <Input value={formData.album} onChange={e => set('album', e.target.value)} placeholder="Album name" />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Label style={labelStyle}>Duration</Label>
            <Input value={formData.duration} onChange={e => set('duration', e.target.value)} placeholder="3:45" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Label style={labelStyle}>Category</Label>
            <Select value={formData.category} onValueChange={v => set('category', v)}>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Guest suggestion</span>
            <Toggle value={formData.guest_suggestion} onChange={v => set('guest_suggestion', v)} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Approved for playlist</span>
            <Toggle value={formData.approved} onChange={v => set('approved', v)} />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Label style={labelStyle}>Notes</Label>
          <Textarea value={formData.notes} onChange={e => set('notes', e.target.value)} placeholder="Special notes about this song…" />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4, borderTop: '1px solid rgba(10,10,10,0.08)' }}>
          <button type="button" onClick={onCancel} className="btn-editorial-secondary" style={{ fontSize: 12 }}>Cancel</button>
          <button type="button" onClick={() => onSubmit(formData)} className="btn-primary" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
            <Save size={12} />{item?.id ? 'Update song' : 'Add song'}
          </button>
        </div>
      </div>
    </div>
  );
}
