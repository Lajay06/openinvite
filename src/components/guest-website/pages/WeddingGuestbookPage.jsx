import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Turnstile } from '@marsidev/react-turnstile';

const PJS = "'Plus Jakarta Sans', sans-serif";
const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;

function GuestbookCard({ entry, theme }) {
  return (
    <div style={{ padding: '18px 0', borderBottom: `1px solid ${theme.darkText}15` }}>
      <p style={{ fontSize: 14, fontWeight: 700, color: theme.accent, margin: '0 0 6px', fontFamily: PJS }}>
        {entry.guest_name}
      </p>
      <p style={{ fontSize: 14, color: theme.darkText, lineHeight: 1.6, margin: 0, fontFamily: PJS, whiteSpace: 'pre-wrap' }}>
        {entry.message}
      </p>
    </div>
  );
}

export default function WeddingGuestbookPage({ weddingDetails, theme, typography }) {
  const [entries, setEntries] = useState([]);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [guestName, setGuestName] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const turnstileRef = useRef(null);
  const tsTokenRef = useRef('');

  const loadEntries = useCallback(async () => {
    if (!weddingDetails?.slug) return;
    try {
      const res = await fetch(`/api/wedding-guestbook?slug=${encodeURIComponent(weddingDetails.slug)}`);
      if (res.ok) {
        const { entries: rows } = await res.json();
        setEntries(rows || []);
      }
    } catch (e) {
      console.error('Guestbook load error', e);
    }
    setLoadingEntries(false);
  }, [weddingDetails?.slug]);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!guestName.trim() || !message.trim()) {
      setError('Please add your name and a message.');
      return;
    }
    const token = tsTokenRef.current;
    if (!token) {
      setError('Security check still loading — please try again in a moment.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/guestbook-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weddingSlug: weddingDetails.slug,
          guestName: guestName.trim(),
          message: message.trim(),
          turnstileToken: token,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.');
        setSubmitting(false);
        return;
      }
      tsTokenRef.current = '';
      turnstileRef.current?.reset();
      setGuestName('');
      setMessage('');
      setSubmitted(true);
      await loadEntries();
    } catch (err) {
      console.error('Guestbook submit error', err);
      setError('Something went wrong. Please try again.');
    }
    setSubmitting(false);
  };

  return (
    <div style={{ backgroundColor: theme.lightBg, color: theme.lightText, minHeight: '100vh', padding: '60px 24px' }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          style={{
            fontFamily: typography.headingFont,
            fontSize: 'clamp(2rem, 5vw, 3rem)',
            fontWeight: typography.headingWeight,
            marginBottom: '12px',
            textAlign: 'center',
          }}
        >
          Guestbook
        </motion.h1>
        <p style={{ textAlign: 'center', fontSize: 14, color: theme.lightText, opacity: 0.7, marginBottom: 40, fontFamily: PJS }}>
          Leave the couple a message they'll keep forever.
        </p>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          style={{ backgroundColor: theme.darkBg, color: theme.darkText, padding: '32px', marginBottom: 40 }}
        >
          {submitted ? (
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <p style={{ fontSize: 15, color: theme.darkText, margin: '0 0 12px', fontFamily: PJS }}>
                Thank you — your message has been added to the guestbook.
              </p>
              <button
                type="button"
                onClick={() => setSubmitted(false)}
                style={{ background: 'none', border: 'none', fontSize: 13, color: theme.accent, cursor: 'pointer', fontFamily: PJS, textDecoration: 'underline' }}
              >
                Leave another message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: theme.accent, display: 'block', marginBottom: 8 }}>
                  Your name
                </label>
                <input
                  type="text"
                  value={guestName}
                  onChange={e => setGuestName(e.target.value)}
                  placeholder="Your name"
                  maxLength={80}
                  style={{
                    width: '100%', backgroundColor: 'transparent', border: 'none',
                    borderBottom: `1px solid ${theme.accent}40`, padding: '8px 0',
                    color: theme.darkText, fontSize: 15, fontFamily: typography.bodyFont, outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: theme.accent, display: 'block', marginBottom: 8 }}>
                  Your message
                </label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Share your wishes for the couple…"
                  rows={4}
                  maxLength={1000}
                  style={{
                    width: '100%', backgroundColor: 'transparent',
                    border: `1px solid ${theme.accent}40`, padding: 10,
                    color: theme.darkText, fontSize: 15, fontFamily: typography.bodyFont, outline: 'none',
                    resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.6,
                  }}
                />
              </div>

              {error && (
                <p style={{ fontSize: 13, color: '#E03553', marginBottom: 16, fontFamily: PJS }}>{error}</p>
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
                type="submit"
                disabled={submitting}
                style={{
                  padding: '12px 28px', backgroundColor: theme.accent, color: theme.darkBg,
                  border: 'none', borderRadius: 999, fontSize: 14, fontWeight: 600,
                  cursor: submitting ? 'default' : 'pointer', opacity: submitting ? 0.6 : 1,
                  fontFamily: PJS,
                }}
              >
                {submitting ? 'Sending…' : 'Sign the guestbook'}
              </button>
            </form>
          )}
        </motion.div>

        {/* Entries — newest first */}
        {!loadingEntries && entries.length === 0 && (
          <p style={{ textAlign: 'center', fontSize: 14, color: theme.lightText, opacity: 0.5, fontFamily: PJS }}>
            Be the first to leave a message.
          </p>
        )}
        {entries.map(entry => (
          <GuestbookCard key={entry.id} entry={entry} theme={theme} />
        ))}
      </div>
    </div>
  );
}
