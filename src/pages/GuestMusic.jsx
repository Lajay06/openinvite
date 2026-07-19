import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Turnstile } from '@marsidev/react-turnstile';
import { fetchWeddingBySlug } from '@/lib/weddingBySlug';
import { ChevronLeft, Music } from 'lucide-react';

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;

export default function GuestMusic() {
  const { weddingSlug } = useParams();
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [guestName, setGuestName] = useState('');
  const [guestNote, setGuestNote] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const turnstileRef = useRef(null);
  const tsTokenRef = useRef('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const wedding = await fetchWeddingBySlug(weddingSlug);
        if (wedding) setDetails(wedding);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [weddingSlug]);

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0A0A0A' }}>
      <div style={{ width: 20, height: 20, border: '2px solid #EEEEEE', borderTopColor: '#0A0A0A', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (!details?.music?.guestRequestsEnabled) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0A0A0A' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#FFFFFF', marginBottom: 12 }}>Music requests unavailable</h1>
        <Link to={`/w/${weddingSlug}`} style={{ display: 'inline-block', marginTop: 24, padding: '12px 24px', background: '#1DB954', color: '#000000', textDecoration: 'none', fontSize: 13, fontWeight: 700 }}>← Back</Link>
      </div>
    </div>
  );

  const music = details?.music;
  const isOpen = !music?.requestsClosedDate || new Date(music.requestsClosedDate) > new Date();

  const submitRequest = async () => {
    if (!guestName.trim() || !selectedTrack) return;
    if (!tsTokenRef.current) { setSubmitError('Security check still loading — please try again in a moment.'); return; }
    setSubmitError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/song-request-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weddingSlug,
          spotifyTrackId: selectedTrack.id,
          title: selectedTrack.title,
          artist: selectedTrack.artist,
          album: selectedTrack.album || '',
          albumArt: selectedTrack.albumArt || '',
          duration: selectedTrack.duration || 0,
          explicit: selectedTrack.explicit || false,
          spotifyUrl: selectedTrack.spotifyUrl || '',
          submittedBy: guestName,
          guestNote: guestNote,
          turnstileToken: tsTokenRef.current,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSubmitError(data.error || 'Something went wrong. Please try again.');
        tsTokenRef.current = '';
        turnstileRef.current?.reset();
        return;
      }
      setSubmitted(true);
    } catch {
      setSubmitError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ background: '#0A0A0A', minHeight: '100svh', paddingBottom: 80, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Nav */}
      <div style={{ position: 'sticky', top: 0, zIndex: 100, height: 56, background: 'rgba(10,10,10,0.95)', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', padding: '0 16px' }}>
        <Link to={`/w/${weddingSlug}`} style={{ color: '#FFFFFF', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 600 }}>
          <ChevronLeft size={16} /> Back
        </Link>
        <p style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', fontSize: 14, fontWeight: 700, color: '#FFFFFF', margin: 0 }}>
          Song Requests
        </p>
      </div>

      {/* Hero */}
      <div style={{ padding: '60px 24px 40px', textAlign: 'center' }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#1DB954', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
          <Music size={28} color="#000000" />
        </div>
        <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 300, fontSize: 'clamp(32px, 8vw, 52px)', color: '#FFFFFF', margin: '0 0 16px', lineHeight: 1.1 }}>
          Request a Song
        </h1>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, maxWidth: 400, margin: '0 auto' }}>
          {music?.requestMessage || "Help us build the soundtrack to our night. Request a song you'd love to hear."}
        </p>
        {music?.requestsClosedDate && isOpen && (
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 12 }}>
            Requests close {new Date(music.requestsClosedDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'long' })}
          </p>
        )}
      </div>

      {!isOpen ? (
        <div style={{ padding: '40px 24px', textAlign: 'center' }}>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.4)' }}>Song requests have closed. Thank you for your suggestions!</p>
        </div>
      ) : submitted ? (
        <div style={{ padding: '40px 24px', textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#1DB954', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 300, fontSize: 32, color: '#FFFFFF', marginBottom: 12 }}>Request Submitted!</h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 32 }}>
            "{selectedTrack?.title}" by {selectedTrack?.artist} has been sent to the couple.
          </p>
          <button onClick={() => { setSubmitted(false); setSelectedTrack(null); setGuestNote(''); setSearchQuery(''); setSearchResults([]); }} style={{ padding: '12px 32px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Request Another Song
          </button>
        </div>
      ) : (
        <div style={{ padding: '0 24px' }}>
          {/* Search */}
          <div style={{ position: 'relative', marginBottom: 16 }}>
            <svg style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search for a song..."
              style={{ width: '100%', padding: '16px 16px 16px 44px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#FFFFFF', fontSize: 16, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          {/* Search results */}
          {searchResults.map(track => (
            <div
              key={track.id}
              onClick={() => setSelectedTrack(track)}
              style={{
                display: 'flex', gap: 12, padding: '12px',
                marginBottom: 8,
                background: selectedTrack?.id === track.id ? 'rgba(29,185,84,0.1)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${selectedTrack?.id === track.id ? 'rgba(29,185,84,0.4)' : 'rgba(255,255,255,0.08)'}`,
                cursor: 'pointer',
              }}
            >
              <img src={track.albumArt} alt={`${track.title} album art`} loading="lazy" style={{ width: 52, height: 52, objectFit: 'cover', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 15, fontWeight: 700, color: '#FFFFFF', margin: '0 0 4px' }}>{track.title}</p>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: 0 }}>{track.artist}</p>
              </div>
              <div style={{ width: 24, height: 24, borderRadius: '50%', border: `2px solid ${selectedTrack?.id === track.id ? '#1DB954' : 'rgba(255,255,255,0.2)'}`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {selectedTrack?.id === track.id && <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#1DB954' }} />}
              </div>
            </div>
          ))}

          {/* Guest details */}
          {selectedTrack && (
            <div style={{ marginTop: 24 }}>
              <div style={{ display: 'flex', gap: 12, padding: '14px', background: 'rgba(29,185,84,0.08)', border: '1px solid rgba(29,185,84,0.2)', marginBottom: 20, alignItems: 'center' }}>
                <img src={selectedTrack.albumArt} alt={`${selectedTrack.title} album art`} style={{ width: 44, height: 44, objectFit: 'cover', flexShrink: 0 }} />
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#FFFFFF', margin: 0 }}>{selectedTrack.title}</p>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', margin: 0 }}>{selectedTrack.artist}</p>
                </div>
                <button onClick={() => setSelectedTrack(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 20 }}>×</button>
              </div>

              <input value={guestName} onChange={e => setGuestName(e.target.value)} placeholder="Your name" style={{ width: '100%', padding: '14px 16px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF', fontSize: 16, outline: 'none', marginBottom: 10, boxSizing: 'border-box' }} />
              <textarea value={guestNote} onChange={e => setGuestNote(e.target.value)} placeholder="Add a note (optional)" rows={3} style={{ width: '100%', padding: '14px 16px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF', fontSize: 16, outline: 'none', resize: 'none', marginBottom: 20, boxSizing: 'border-box' }} />

              {submitError && (
                <p style={{ fontSize: 13, color: '#E03553', marginBottom: 16 }}>{submitError}</p>
              )}

              {/* Invisible Turnstile — execution="render" auto-generates a token on mount */}
              <Turnstile
                ref={turnstileRef}
                siteKey={TURNSTILE_SITE_KEY}
                onSuccess={(token) => { tsTokenRef.current = token; }}
                onExpire={() => { tsTokenRef.current = ''; }}
                options={{ appearance: 'execute', execution: 'render' }}
              />

              <button
                onClick={submitRequest}
                disabled={!guestName.trim() || submitting}
                style={{ width: '100%', padding: '18px', background: guestName.trim() ? '#1DB954' : 'rgba(255,255,255,0.1)', color: guestName.trim() ? '#000000' : 'rgba(255,255,255,0.3)', border: 'none', fontSize: 16, fontWeight: 700, cursor: guestName.trim() ? 'pointer' : 'not-allowed', minHeight: 60 }}
              >
                {submitting ? 'Submitting...' : 'Submit Song Request'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}