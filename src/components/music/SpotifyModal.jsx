import React, { useState, useRef } from 'react';
import { X, Search, Loader2, Plus, Music2 } from 'lucide-react';
import { interactiveDivProps } from '@/lib/a11y';

const PJS = "'Plus Jakarta Sans', sans-serif";

function fmt(ms) {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000).toString().padStart(2, '0');
  return `${m}:${s}`;
}

const SpotifyIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="#1DB954">
    <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424c-.18.295-.563.387-.857.207-2.35-1.435-5.305-1.76-8.786-.963-.335.077-.67-.133-.746-.469-.077-.336.132-.67.469-.746 3.809-.87 7.077-.496 9.713 1.115.293.18.386.563.207.856zm1.223-2.723c-.226.367-.706.482-1.072.257-2.687-1.652-6.785-2.131-9.965-1.166-.413.127-.848-.105-.975-.517-.127-.412.104-.848.517-.975 3.632-1.102 8.147-.568 11.238 1.33.366.225.48.706.257 1.071zm.105-2.835C14.692 8.95 9.375 8.775 6.297 9.71c-.493.15-1.016-.129-1.166-.624-.149-.495.13-1.016.625-1.166 3.532-1.073 9.404-.866 13.115 1.337.445.264.59.837.327 1.282-.264.444-.838.59-1.284.327z"/>
  </svg>
);

export default function SpotifyModal({ playlistId, spotifyConnection, onUpdateConnection, onAdd, onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [addedIds, setAddedIds] = useState(new Set());
  const debounceRef = useRef(null);

  const search = async (q) => {
    const sq = (q ?? query).trim();
    if (!sq) return;
    setLoading(true);
    setResults([]);
    setError('');
    try {
      const body = { q: sq };
      if (spotifyConnection?.accessToken) {
        body.accessToken  = spotifyConnection.accessToken;
        body.refreshToken = spotifyConnection.refreshToken;
        body.expiresAt    = spotifyConnection.expiresAt;
      }

      const res  = await fetch('/api/spotify-search', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          setError('Your Spotify session has expired — please reconnect in Settings.');
        } else {
          throw new Error(data.error || 'Search failed');
        }
        setLoading(false);
        return;
      }

      setResults(data.tracks || []);

      // If the server refreshed the access token, persist the new one
      if (data.newToken && onUpdateConnection && spotifyConnection) {
        onUpdateConnection({
          ...spotifyConnection,
          accessToken: data.newToken.accessToken,
          expiresAt:   data.newToken.expiresAt,
        });
      }
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

  const handleAdd = (track) => {
    onAdd({
      song_title:  track.name,
      artist:      track.artists,
      album:       track.album,
      duration:    fmt(track.duration_ms),
      image_url:   track.artwork_url_small || track.artwork_url || '',
      preview_url: track.preview_url || '',
      category:    playlistId || 'general',
      approved:    true,
      guest_suggestion: false,
    });
    setAddedIds(prev => new Set([...prev, track.id]));
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-[9999]"
      style={{ background: 'rgba(0,0,0,0.55)', padding: 24 }}
      onClick={onClose}
      {...interactiveDivProps(onClose, { label: 'Close Spotify search modal' })}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: '#FFFFFF', border: '1px solid #E5E5E5', width: '100%', maxWidth: 560, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid rgba(10,10,10,0.08)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <SpotifyIcon />
            <span style={{ fontSize: 15, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS }}>Search Spotify</span>
            {spotifyConnection?.displayName && (
              <span style={{ fontSize: 11, color: 'rgba(10,10,10,0.6)', fontFamily: PJS }}>
                · {spotifyConnection.displayName}
              </span>
            )}
          </div>
          <button onClick={onClose} aria-label="Close Spotify search modal" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.6)', padding: 4 }}>
            <X size={16} />
          </button>
        </div>

        {/* Search input */}
        <div style={{ padding: '16px 24px', flexShrink: 0, borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              {loading
                ? <Loader2 size={13} className="animate-spin" style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', color: 'rgba(10,10,10,0.35)', pointerEvents: 'none' }} />
                : <Search size={13} style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', color: 'rgba(10,10,10,0.35)', pointerEvents: 'none' }} />
              }
              <input
                autoFocus
                placeholder="Search by song title or artist…"
                value={query}
                onChange={handleQueryChange}
                onKeyDown={e => e.key === 'Enter' && search()}
                style={{ width: '100%', border: 'none', borderBottom: '1px solid rgba(10,10,10,0.18)', background: 'none', paddingLeft: 20, paddingBottom: 8, fontSize: 14, fontFamily: PJS, outline: 'none', color: '#0A0A0A', boxSizing: 'border-box' }}
              />
            </div>
            <button onClick={() => search()} disabled={loading || !query.trim()} className="btn-primary" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, opacity: !query.trim() ? 0.5 : 1 }}>
              <Search size={12} />
              Search
            </button>
          </div>
          {error && <p style={{ fontSize: 12, color: '#E03553', fontFamily: PJS, marginTop: 8, margin: '8px 0 0' }}>{error}</p>}
        </div>

        {/* Results */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading && (
            <div style={{ padding: '40px 24px', textAlign: 'center' }}>
              <Loader2 size={20} className="animate-spin" style={{ color: 'rgba(10,10,10,0.3)', margin: '0 auto', display: 'block' }} />
            </div>
          )}
          {!loading && results.length === 0 && query && !error && (
            <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, textAlign: 'center', padding: '40px 24px' }}>No results found. Try a different search.</p>
          )}
          {!loading && !query && (
            <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, textAlign: 'center', padding: '40px 24px' }}>Search for a song or artist to get started.</p>
          )}
          {results.map(track => {
            const added = addedIds.has(track.id);
            return (
              <div key={track.id}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 24px', borderBottom: '1px solid rgba(10,10,10,0.05)', transition: 'background 0.1s' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(10,10,10,0.02)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{ width: 40, height: 40, flexShrink: 0, background: 'rgba(10,10,10,0.06)', overflow: 'hidden', borderRadius: 4 }}>
                  {track.artwork_url
                    ? <img src={track.artwork_url} alt={track.album} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Music2 size={14} style={{ color: 'rgba(10,10,10,0.3)' }} /></div>
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A', fontFamily: PJS, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.name}</p>
                  <p style={{ fontSize: 11, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {track.artists}{track.album ? ` · ${track.album}` : ''}
                  </p>
                </div>
                <span style={{ fontSize: 11, color: 'rgba(10,10,10,0.6)', flexShrink: 0, fontFamily: PJS }}>{fmt(track.duration_ms)}</span>
                <button
                  onClick={() => !added && handleAdd(track)}
                  disabled={added}
                  aria-label={added ? `Added ${track.name}` : `Add ${track.name}`}
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
