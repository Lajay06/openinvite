import React, { useState, useRef } from 'react';
import { Search, Loader2, Plus, Play, Pause, X } from 'lucide-react';

const PJS = "'Plus Jakarta Sans', sans-serif";

const labelStyle = {
  fontSize: 11, fontWeight: 700,
  letterSpacing: '0.08em', color: 'rgba(255,255,255,0.3)',
  fontFamily: PJS,
};

function fmt(ms) {
  if (!ms) return '—';
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function SpotifySearch({ onAdd, onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [playingId, setPlayingId] = useState(null);
  const audioRef = useRef(null);
  const debounceRef = useRef(null);

  const search = async (q) => {
    const sq = (q ?? query).trim();
    if (!sq) return;
    setLoading(true);
    setResults([]);
    setError('');
    try {
      const res = await fetch('/api/spotify-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: sq }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Search failed');
      setResults(data.tracks || []);
    } catch (e) {
      setError(e.message || 'Search failed. Check your connection and try again.');
    }
    setLoading(false);
  };

  const handleQueryChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    if (val.trim().length >= 2) {
      debounceRef.current = setTimeout(() => search(val), 300);
    } else {
      setResults([]);
      setError('');
    }
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
    onAdd({
      song_title:       track.name,
      artist:           track.artists,
      album:            track.album,
      duration:         fmt(track.duration_ms),
      preview_url:      track.preview_url || '',
      image_url:        track.artwork_url_small || track.artwork_url || '',
      approved:         true,
      guest_suggestion: false,
    });
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
            {loading
              ? <Loader2 size={14} className="animate-spin" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
              : <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
            }
            <input
              autoFocus
              style={{ width: '100%', background: '#111111', border: '1px solid #333333', color: '#FFFFFF', fontSize: 13, fontFamily: PJS, padding: '8px 8px 8px 32px', outline: 'none', boxSizing: 'border-box' }}
              placeholder="Search by song title or artist…"
              value={query}
              onChange={handleQueryChange}
              onKeyDown={e => e.key === 'Enter' && search()}
            />
          </div>
          <button
            onClick={() => search()}
            disabled={loading || !query.trim()}
            className="btn-primary"
            style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, opacity: !query.trim() ? 0.5 : 1 }}
          >
            <Search size={12} />
            Search
          </button>
        </div>

        {error && <p style={{ fontSize: 12, color: '#E03553', fontFamily: PJS, margin: 0 }}>{error}</p>}

        {/* Results */}
        {results.length > 0 && (
          <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1 }}>
            {results.map((track, i) => (
              <div key={track.id || i}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: '#0A0A0A' }}
                onMouseEnter={e => e.currentTarget.style.background = '#111111'}
                onMouseLeave={e => e.currentTarget.style.background = '#0A0A0A'}>
                <div style={{ width: 40, height: 40, flexShrink: 0, background: '#1A1A1A', overflow: 'hidden' }}>
                  {track.artwork_url
                    ? <img src={track.artwork_url} alt={track.album} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#333333' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 100 20A10 10 0 0012 2zm0 14a4 4 0 110-8 4 4 0 010 8zm0-6a2 2 0 100 4 2 2 0 000-4z"/></svg>
                      </div>
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#FFFFFF', fontFamily: PJS, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.name}</p>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: PJS, margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.artists}{track.album ? ` · ${track.album}` : ''}</p>
                </div>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', flexShrink: 0, fontFamily: PJS }}>{fmt(track.duration_ms)}</span>
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

        {!loading && results.length === 0 && query.trim().length >= 2 && !error && (
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontFamily: PJS, textAlign: 'center', padding: '24px 0' }}>No results. Try a different search.</p>
        )}
      </div>
    </div>
  );
}
