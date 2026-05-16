import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Loader2, Plus, Play, Pause, X } from 'lucide-react';

const labelStyle = {
  fontSize: 11, fontWeight: 700,
  letterSpacing: '0.08em', color: 'rgba(255,255,255,0.3)',
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

export default function SpotifySearch({ onAdd, onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [playingId, setPlayingId] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('general');
  const audioRef = useRef(null);

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setResults([]);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Search for music tracks matching: "${query}". Return exactly 6 real, well-known tracks. For each: song_title, artist, album, duration (MM:SS), preview_url (real Spotify URL or null), image_url (real CDN URL).`,
        add_context_from_internet: true,
        response_json_schema: {
          type: 'object',
          properties: {
            tracks: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  song_title: { type: 'string' }, artist: { type: 'string' },
                  album: { type: 'string' }, duration: { type: 'string' },
                  preview_url: { type: 'string' }, image_url: { type: 'string' },
                },
              },
            },
          },
        },
      });
      setResults(res.tracks || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handlePlay = (track, index) => {
    if (!track.preview_url) return;
    if (playingId === index) {
      audioRef.current?.pause();
      setPlayingId(null);
    } else {
      if (audioRef.current) audioRef.current.pause();
      audioRef.current = new Audio(track.preview_url);
      audioRef.current.play();
      audioRef.current.onended = () => setPlayingId(null);
      setPlayingId(index);
    }
  };

  const handleAdd = (track) => {
    onAdd({ song_title: track.song_title, artist: track.artist, album: track.album, duration: track.duration, preview_url: track.preview_url || '', image_url: track.image_url || '', category: selectedCategory, approved: true, guest_suggestion: false });
  };

  return (
    <div style={{ background: '#0A0A0A' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid #222222' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #E03553, #803D81)', flexShrink: 0 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/></svg>
          </div>
          <span style={labelStyle}>Search &amp; add songs</span>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', display: 'flex', padding: 4 }}><X size={14} /></button>
      </div>

      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Search bar */}
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
            <input
              style={{ width: '100%', background: '#111111', border: '1px solid #333333', color: '#FFFFFF', fontSize: 13, fontFamily: "'Plus Jakarta Sans', sans-serif", padding: '8px 8px 8px 32px', outline: 'none', boxSizing: 'border-box' }}
              placeholder="Search by song title or artist…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && search()}
            />
          </div>
          <button onClick={search} disabled={loading} className="btn-primary" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            {loading ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
            Search
          </button>
        </div>

        {/* Category selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={labelStyle}>Add to:</span>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger style={{ background: '#111111', border: '1px solid #333333', color: '#FFFFFF', height: 32, fontSize: 12, width: 176 }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent style={{ background: '#111111', border: '1px solid #333333' }}>
              {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value} style={{ fontSize: 12 }}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1 }}>
            {results.map((track, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: '#0A0A0A' }}
                onMouseEnter={e => e.currentTarget.style.background = '#111111'}
                onMouseLeave={e => e.currentTarget.style.background = '#0A0A0A'}>
                <div style={{ width: 40, height: 40, flexShrink: 0, background: '#1A1A1A', overflow: 'hidden' }}>
                  {track.image_url
                    ? <img src={track.image_url} alt={track.album} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#333333' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 100 20A10 10 0 0012 2zm0 14a4 4 0 110-8 4 4 0 010 8zm0-6a2 2 0 100 4 2 2 0 000-4z"/></svg>
                      </div>
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#FFFFFF', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.song_title}</p>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.artist}{track.album ? ` · ${track.album}` : ''}</p>
                </div>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', flexShrink: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{track.duration}</span>
                <button onClick={() => handlePlay(track, i)} disabled={!track.preview_url}
                  style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: track.preview_url ? 'pointer' : 'not-allowed', color: playingId === i ? '#E03553' : 'rgba(255,255,255,0.4)', opacity: track.preview_url ? 1 : 0.3 }}>
                  {playingId === i ? <Pause size={13} /> : <Play size={13} />}
                </button>
                <button onClick={() => handleAdd(track)}
                  style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)' }}>
                  <Plus size={13} />
                </button>
              </div>
            ))}
          </div>
        )}

        {!loading && results.length === 0 && query && (
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontFamily: "'Plus Jakarta Sans', sans-serif", textAlign: 'center', padding: '24px 0' }}>No results. Try a different search.</p>
        )}
      </div>
    </div>
  );
}
