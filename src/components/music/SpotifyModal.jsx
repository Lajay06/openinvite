import React, { useState } from 'react';
import { X, Search, Loader2, Plus, Music2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const PJS = "'Plus Jakarta Sans', sans-serif";

async function getSpotifyToken() {
  const CACHE_KEY = 'oi_spotify_token';
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
    if (cached && Date.now() < cached.expires) return cached.token;
  } catch {}
  const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
  const clientSecret = import.meta.env.VITE_SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('Spotify credentials not configured. Add VITE_SPOTIFY_CLIENT_ID and VITE_SPOTIFY_CLIENT_SECRET to your .env file.');
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
    },
    body: 'grant_type=client_credentials',
  });
  const data = await res.json();
  if (!data.access_token) throw new Error('Failed to get Spotify token');
  localStorage.setItem(CACHE_KEY, JSON.stringify({ token: data.access_token, expires: Date.now() + (data.expires_in - 60) * 1000 }));
  return data.access_token;
}

function fmt(ms) {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function SpotifyModal({ playlistId, onAdd, onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [addedIds, setAddedIds] = useState(new Set());

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setResults([]);
    setError('');
    try {
      const token = await getSpotifyToken();
      const res = await fetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=20`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      setResults(data.tracks?.items || []);
    } catch (e) {
      setError(e.message || 'Search failed. Check Spotify credentials.');
    }
    setLoading(false);
  };

  const handleAdd = async (track) => {
    const trackData = {
      title: track.name,
      artist: track.artists.map(a => a.name).join(', '),
      album: track.album.name,
      duration: fmt(track.duration_ms),
      spotifyId: track.id,
      artworkUrl: track.album.images[0]?.url || '',
      playlistId: playlistId || 'general',
    };
    try { await base44.entities.MusicTrack.create(trackData); } catch {}
    onAdd({
      song_title: trackData.title,
      artist: trackData.artist,
      album: trackData.album,
      duration: trackData.duration,
      image_url: trackData.artworkUrl,
      preview_url: track.preview_url || '',
      category: playlistId || 'general',
      approved: true,
      guest_suggestion: false,
    });
    setAddedIds(prev => new Set([...prev, track.id]));
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-[9999]"
      style={{ background: 'rgba(0,0,0,0.55)', padding: 24 }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: '#FFFFFF', border: '1px solid #E5E5E5', width: '100%', maxWidth: 560, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid rgba(10,10,10,0.08)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#1DB954">
              <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424c-.18.295-.563.387-.857.207-2.35-1.435-5.305-1.76-8.786-.963-.335.077-.67-.133-.746-.469-.077-.336.132-.67.469-.746 3.809-.87 7.077-.496 9.713 1.115.293.18.386.563.207.856zm1.223-2.723c-.226.367-.706.482-1.072.257-2.687-1.652-6.785-2.131-9.965-1.166-.413.127-.848-.105-.975-.517-.127-.412.104-.848.517-.975 3.632-1.102 8.147-.568 11.238 1.33.366.225.48.706.257 1.071zm.105-2.835C14.692 8.95 9.375 8.775 6.297 9.71c-.493.15-1.016-.129-1.166-.624-.149-.495.13-1.016.625-1.166 3.532-1.073 9.404-.866 13.115 1.337.445.264.59.837.327 1.282-.264.444-.838.59-1.284.327z" />
            </svg>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS }}>Search Spotify</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.4)', padding: 4 }}>
            <X size={16} />
          </button>
        </div>

        {/* Search input */}
        <div style={{ padding: '16px 24px', flexShrink: 0, borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={13} style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', color: 'rgba(10,10,10,0.35)', pointerEvents: 'none' }} />
              <input
                autoFocus
                placeholder="Search by song title or artist…"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && search()}
                style={{ width: '100%', border: 'none', borderBottom: '1px solid rgba(10,10,10,0.18)', background: 'none', paddingLeft: 20, paddingBottom: 8, fontSize: 14, fontFamily: PJS, outline: 'none', color: '#0A0A0A', boxSizing: 'border-box' }}
              />
            </div>
            <button onClick={search} disabled={loading || !query.trim()} className="btn-primary" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, opacity: !query.trim() ? 0.5 : 1 }}>
              {loading ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
              Search
            </button>
          </div>
          {error && <p style={{ fontSize: 12, color: '#E03553', fontFamily: PJS, marginTop: 8 }}>{error}</p>}
        </div>

        {/* Results */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading && (
            <div style={{ padding: '40px 24px', textAlign: 'center' }}>
              <Loader2 size={20} className="animate-spin" style={{ color: 'rgba(10,10,10,0.3)', margin: '0 auto', display: 'block' }} />
            </div>
          )}
          {!loading && results.length === 0 && query && !error && (
            <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.4)', fontFamily: PJS, textAlign: 'center', padding: '40px 24px' }}>No results found. Try a different search.</p>
          )}
          {!loading && !query && (
            <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.4)', fontFamily: PJS, textAlign: 'center', padding: '40px 24px' }}>Search for a song or artist to get started.</p>
          )}
          {results.map(track => {
            const added = addedIds.has(track.id);
            const artwork = track.album.images[1]?.url || track.album.images[0]?.url;
            return (
              <div key={track.id}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 24px', borderBottom: '1px solid rgba(10,10,10,0.05)', background: 'transparent', transition: 'background 0.1s' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(10,10,10,0.02)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{ width: 40, height: 40, flexShrink: 0, background: 'rgba(10,10,10,0.06)', overflow: 'hidden', borderRadius: 4 }}>
                  {artwork
                    ? <img src={artwork} alt={track.album.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Music2 size={14} style={{ color: 'rgba(10,10,10,0.3)' }} /></div>
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A', fontFamily: PJS, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.name}</p>
                  <p style={{ fontSize: 11, color: '#999999', fontFamily: PJS, margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {track.artists.map(a => a.name).join(', ')}{track.album.name ? ` · ${track.album.name}` : ''}
                  </p>
                </div>
                <span style={{ fontSize: 11, color: '#999999', flexShrink: 0, fontFamily: PJS }}>{fmt(track.duration_ms)}</span>
                <button
                  onClick={() => !added && handleAdd(track)}
                  disabled={added}
                  style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: added ? 'rgba(10,10,10,0.06)' : 'none', border: added ? 'none' : '1px solid rgba(10,10,10,0.15)', borderRadius: 4, cursor: added ? 'default' : 'pointer', color: added ? 'rgba(10,10,10,0.3)' : '#0A0A0A', flexShrink: 0 }}
                >
                  <Plus size={13} />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
