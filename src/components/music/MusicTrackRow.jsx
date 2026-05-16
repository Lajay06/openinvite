import React, { useRef, useState } from 'react';
import { Play, Pause, Check, Clock, Trash2, Edit2 } from 'lucide-react';

const CATEGORY_LABELS = {
  ceremony: 'Ceremony',
  cocktail_hour: 'Cocktail hour',
  dinner: 'Dinner',
  dancing: 'Dancing',
  special_moments: 'Special moments',
  general: 'General',
};

export default function MusicTrackRow({ item, index, onEdit, onDelete, onToggleApproval }) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef(null);

  const handlePlay = () => {
    if (!item.preview_url) return;
    if (playing) {
      audioRef.current?.pause();
      setPlaying(false);
    } else {
      audioRef.current = new Audio(item.preview_url);
      audioRef.current.play();
      audioRef.current.onended = () => setPlaying(false);
      setPlaying(true);
    }
  };

  return (
    <div className="group" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '10px 16px', borderBottom: '1px solid #111', cursor: 'default' }}
      onMouseEnter={e => e.currentTarget.style.background = '#0D0D0D'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>

      <span style={{ width: 24, textAlign: 'center', fontSize: 11, color: '#333333', flexShrink: 0 }}>{index + 1}</span>

      <div style={{ width: 40, height: 40, flexShrink: 0, background: '#1A1A1A', overflow: 'hidden' }}>
        {item.image_url
          ? <img src={item.image_url} alt={item.album || item.song_title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#333"><path d="M12 2a10 10 0 100 20A10 10 0 0012 2zm0 14a4 4 0 110-8 4 4 0 010 8zm0-6a2 2 0 100 4 2 2 0 000-4z"/></svg>
            </div>
        }
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#FFFFFF', fontFamily: "'Plus Jakarta Sans', sans-serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.song_title}</span>
          {item.guest_suggestion && (
            <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '1px 6px', background: 'rgba(224,53,83,0.15)', color: '#E03553', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Guest pick</span>
          )}
        </div>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.artist}{item.album ? ` · ${item.album}` : ''}
        </p>
      </div>

      <span style={{ fontSize: 11, color: '#444444', flexShrink: 0, width: 112, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        {CATEGORY_LABELS[item.category] || item.category}
      </span>

      <span style={{ fontSize: 11, color: '#444444', flexShrink: 0, width: 40, textAlign: 'right', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{item.duration || '—'}</span>

      <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0, width: 112, justifyContent: 'flex-end', opacity: 0, transition: 'opacity 0.15s' }}
        className="group-hover-actions">
        <button onClick={handlePlay} disabled={!item.preview_url}
          style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: item.preview_url ? 'pointer' : 'not-allowed', color: playing ? '#E03553' : 'rgba(255,255,255,0.4)', opacity: item.preview_url ? 1 : 0.2 }}>
          {playing ? <Pause size={13} /> : <Play size={13} />}
        </button>
        <button onClick={() => onToggleApproval(item)}
          style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: item.approved ? '#6b7700' : 'rgba(255,255,255,0.4)' }}
          title={item.approved ? 'Approved' : 'Mark as approved'}>
          {item.approved ? <Check size={13} /> : <Clock size={13} />}
        </button>
        <button onClick={() => onEdit(item)}
          style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)' }}>
          <Edit2 size={12} />
        </button>
        <button onClick={() => onDelete(item.id)}
          style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)' }}>
          <Trash2 size={12} />
        </button>
      </div>

      <div style={{ width: 6, height: 6, flexShrink: 0, background: item.approved ? '#6b7700' : '#333333', borderRadius: '50%' }} />
    </div>
  );
}
