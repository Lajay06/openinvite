import React, { useState } from 'react';
import { X, Copy, CheckCircle, Share2, Users, Music } from 'lucide-react';
import toast from 'react-hot-toast';

const labelStyle = {
  fontSize: 11, fontWeight: 700,
  letterSpacing: '0.08em', color: 'rgba(10,10,10,0.6)',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
};

const underlineInput = {
  flex: 1, border: 'none', borderBottom: '1px solid rgba(10,10,10,0.18)',
  background: 'none', fontSize: 13, color: '#0A0A0A',
  fontFamily: "'Plus Jakarta Sans', sans-serif", outline: 'none', padding: '6px 0',
};

export default function SharePlaylist({ onClose, playlistStats }) {
  const [copied, setCopied] = useState(false);
  const shareUrl = `${window.location.origin}/playlist/contribute`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success('Link copied');
    setTimeout(() => setCopied(false), 2000);
  };

  const shareMessage = `Help us create the perfect wedding playlist! Add your favourite songs: ${shareUrl}`;
  const handleEmail = () => window.open(`mailto:?subject=${encodeURIComponent('Help create our wedding playlist!')}&body=${encodeURIComponent(`Hi!\n\nWe're creating a collaborative playlist and would love your song suggestions!\n\n${shareUrl}\n\nThanks!`)}`, '_blank');
  const handleSMS = () => window.open(`sms:?body=${encodeURIComponent(shareMessage)}`, '_blank');

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 520, background: '#FFFFFF' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Share2 size={14} style={{ color: 'rgba(10,10,10,0.6)' }} />
            <span style={{ fontSize: 15, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Share playlist</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.6)', display: 'flex', padding: 4 }}><X size={16} /></button>
        </div>

        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Stats */}
          <div>
            <p style={{ ...labelStyle, marginBottom: 10 }}>Playlist summary</p>
            <div style={{ display: 'flex' }}>
              {[
                { label: 'Total songs', value: playlistStats.totalSongs },
                { label: 'Approved', value: playlistStats.approvedSongs },
                { label: 'From guests', value: playlistStats.guestSuggestions },
              ].map((s, i, arr) => (
                <div key={i} style={{ flex: 1, padding: '16px 20px', border: '1px solid rgba(10,10,10,0.08)', borderRight: i < arr.length - 1 ? 'none' : '1px solid rgba(10,10,10,0.08)', textAlign: 'center' }}>
                  <p style={{ fontSize: 24, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0 }}>{s.value}</p>
                  <p style={labelStyle}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Shareable link */}
          <div>
            <p style={{ ...labelStyle, marginBottom: 10 }}>Shareable link</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input value={shareUrl} readOnly style={underlineInput} />
              <button onClick={handleCopy} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, flexShrink: 0 }}>
                {copied ? <><CheckCircle size={12} />Copied</> : <><Copy size={12} />Copy</>}
              </button>
            </div>
            <p style={{ fontSize: 12, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", marginTop: 6 }}>
              Share this link with guests so they can add song suggestions.
            </p>
          </div>

          {/* Share via */}
          <div>
            <p style={{ ...labelStyle, marginBottom: 10 }}>Share via</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { label: 'Email', fn: handleEmail, color: '#E03553' },
                { label: 'SMS', fn: handleSMS, color: '#6b7700' },
              ].map(s => (
                <button key={s.label} onClick={s.fn} className="btn-editorial-secondary"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 13 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* How it works */}
          <div style={{ border: '1px solid rgba(10,10,10,0.08)', padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Users size={13} style={{ color: 'rgba(10,10,10,0.6)' }} />
              <span style={labelStyle}>How it works</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {['Guests click the link to access the song suggestion form', 'They add songs with artist, title, and category', 'All suggestions appear in your playlist for approval', 'Approve or decline each suggestion'].map((text, i) => (
                <div key={i} style={{ display: 'flex', gap: 8 }}>
                  <span style={{ fontSize: 11, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", marginTop: 2 }}>—</span>
                  <span style={{ fontSize: 12, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Coming soon */}
          <div style={{ border: '1px solid rgba(10,10,10,0.08)', padding: 16, background: '#0A1930' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Music size={13} style={{ color: '#DDF762' }} />
              <span style={{ ...labelStyle, color: 'rgba(255,255,255,0.5)' }}>Coming soon — Spotify integration</span>
            </div>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0 }}>
              Direct Spotify playlist creation and sharing is on the way.
            </p>
          </div>
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(10,10,10,0.08)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} className="btn-editorial-secondary" style={{ fontSize: 13 }}>Close</button>
          <button onClick={handleCopy} className="btn-primary" style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Copy size={12} />Copy link
          </button>
        </div>
      </div>
    </div>
  );
}
