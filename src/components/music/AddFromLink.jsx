import React, { useState } from 'react';
import { Link2, Plus, X } from 'lucide-react';
import { parseMusicLink } from '@/lib/musicLinkParser';

const PJS = "'Plus Jakarta Sans', sans-serif";

const SOURCE_LABELS = { spotify: 'Spotify', apple: 'Apple Music', youtube: 'YouTube' };

const fieldStyle = {
  width: '100%', border: 'none', borderBottom: '1px solid rgba(10,10,10,0.18)',
  background: 'none', fontSize: 14, color: '#0A0A0A', fontFamily: PJS,
  outline: 'none', padding: '6px 0', boxSizing: 'border-box',
};

/**
 * AddFromLink — paste-a-link entry point alongside Spotify search. Apple
 * Music and YouTube have no search here (that would need their own API
 * credentials) — this is the only way to add them, so the copy says so
 * plainly rather than implying parity with Spotify search.
 */
export default function AddFromLink({ onAdd, onClose }) {
  const [url, setUrl] = useState('');
  const [songTitle, setSongTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [parsed, setParsed] = useState(null);
  const [error, setError] = useState('');

  const handleUrlChange = (e) => {
    const val = e.target.value;
    setUrl(val);
    setError('');
    if (!val.trim()) { setParsed(null); return; }
    const result = parseMusicLink(val);
    setParsed(result);
    if (!result) setError("That link wasn't recognised — paste a Spotify, Apple Music, or YouTube song link.");
  };

  const handleAdd = () => {
    if (!parsed) return;
    onAdd({
      song_title: songTitle.trim() || 'Untitled',
      artist: artist.trim(),
      source: parsed.source,
      embed_url: parsed.embed_url,
      approved: true,
      guest_suggestion: false,
    });
    setUrl(''); setSongTitle(''); setArtist(''); setParsed(null);
  };

  return (
    <div style={{ background: '#FAFAFA', borderBottom: '1px solid rgba(10,10,10,0.08)', padding: '16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link2 size={13} style={{ color: 'rgba(10,10,10,0.6)' }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS }}>Add from a link</span>
        </div>
        <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.6)', display: 'flex', padding: 4 }}>
          <X size={14} />
        </button>
      </div>

      <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.45)', fontFamily: PJS, margin: '0 0 14px' }}>
        Paste a Spotify, Apple Music, or YouTube / YouTube Music song link. Search above is Spotify-only for now —
        this is the way to add Apple Music or YouTube tracks.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input
          autoFocus
          value={url}
          onChange={handleUrlChange}
          placeholder="Paste a song link…"
          style={{ ...fieldStyle, borderBottomColor: error ? '#E03553' : 'rgba(10,10,10,0.18)' }}
        />
        {error && <p style={{ fontSize: 12, color: '#E03553', fontFamily: PJS, margin: 0 }}>{error}</p>}

        {parsed && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <input value={songTitle} onChange={e => setSongTitle(e.target.value)} placeholder="Song title" style={fieldStyle} />
              <input value={artist} onChange={e => setArtist(e.target.value)} placeholder="Artist" style={fieldStyle} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: 'rgba(10,10,10,0.6)', fontFamily: PJS }}>
                Detected: {SOURCE_LABELS[parsed.source]}
              </span>
              <button type="button" onClick={handleAdd} className="btn-primary" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
                <Plus size={12} />Add song
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
