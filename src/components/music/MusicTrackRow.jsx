import React, { useRef, useState } from 'react';
import { Play, Pause, Check, Clock, Trash2, Edit2, GripVertical } from 'lucide-react';

const PJS = "'Plus Jakarta Sans', sans-serif";

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
    <div
      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: '1px solid rgba(10,10,10,0.06)', background: 'transparent', transition: 'background 0.1s', cursor: 'default' }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(10,10,10,0.02)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
    >
      {/* Drag handle */}
      <span style={{ color: 'rgba(10,10,10,0.2)', flexShrink: 0, cursor: 'grab', display: 'flex' }}>
        <GripVertical size={14} />
      </span>

      {/* Index */}
      <span style={{ width: 20, textAlign: 'center', fontSize: 11, color: 'rgba(10,10,10,0.3)', flexShrink: 0, fontFamily: PJS }}>{index + 1}</span>

      {/* Artwork */}
      <div style={{ width: 48, height: 48, flexShrink: 0, background: 'rgba(10,10,10,0.06)', overflow: 'hidden', borderRadius: 4 }}>
        {item.image_url
          ? <img src={item.image_url} alt={item.album || item.song_title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="rgba(10,10,10,0.2)"><path d="M12 2a10 10 0 100 20A10 10 0 0012 2zm0 14a4 4 0 110-8 4 4 0 010 8zm0-6a2 2 0 100 4 2 2 0 000-4z" /></svg>
            </div>
        }
      </div>

      {/* Title + artist */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: '#0A0A0A', fontFamily: PJS, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.song_title}</span>
          {item.guest_suggestion && (
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', padding: '2px 8px', borderRadius: 999, background: 'rgba(128,61,129,0.1)', color: '#803D81', fontFamily: PJS, flexShrink: 0 }}>
              Guest request
            </span>
          )}
        </div>
        <p style={{ fontSize: 11, color: '#999999', fontFamily: PJS, margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.artist}{item.album ? ` · ${item.album}` : ''}
        </p>
      </div>

      {/* Category */}
      <span style={{ fontSize: 11, color: 'rgba(10,10,10,0.4)', flexShrink: 0, width: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: PJS }}>
        {CATEGORY_LABELS[item.category] || item.category}
      </span>

      {/* Duration */}
      <span style={{ fontSize: 11, color: '#999999', flexShrink: 0, width: 36, textAlign: 'right', fontFamily: PJS }}>{item.duration || '—'}</span>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
        {item.preview_url && (
          <button onClick={handlePlay}
            style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: playing ? '#E03553' : 'rgba(10,10,10,0.35)' }}>
            {playing ? <Pause size={13} /> : <Play size={13} />}
          </button>
        )}
        <button onClick={() => onToggleApproval(item)}
          style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: item.approved ? '#6b7700' : 'rgba(10,10,10,0.3)' }}
          title={item.approved ? 'Approved' : 'Mark as approved'}>
          {item.approved ? <Check size={13} /> : <Clock size={13} />}
        </button>
        <button onClick={() => onEdit(item)}
          style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.35)' }}>
          <Edit2 size={12} />
        </button>
        <button onClick={() => onDelete(item.id)}
          style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.35)' }}>
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}
