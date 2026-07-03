import React, { useState } from 'react';
import { motion } from 'framer-motion';

const STATUS = { idle: 'idle', sending: 'sending', sent: 'sent', error: 'error' };

export default function WeddingRSVPPage({ weddingDetails, theme, typography }) {
  const content = weddingDetails.rsvpContent || {};
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState(STATUS.idle);

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSubmit = async () => {
    if (!isValidEmail || status === STATUS.sending) return;
    setStatus(STATUS.sending);
    try {
      const res = await fetch('/api/rsvp-link-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, weddingSlug: weddingDetails.slug }),
      });
      setStatus(res.ok ? STATUS.sent : STATUS.error);
    } catch {
      setStatus(STATUS.error);
    }
  };

  return (
    <div style={{ backgroundColor: theme.lightBg, color: theme.lightText, minHeight: '100vh', padding: '60px 24px' }}>
      <div style={{ maxWidth: '520px', margin: '0 auto' }}>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          style={{
            fontFamily: typography.headingFont,
            fontSize: 'clamp(2rem, 5vw, 3rem)',
            fontWeight: typography.headingWeight,
            marginBottom: '12px',
            textAlign: 'center'
          }}
        >
          RSVP
        </motion.h1>

        {content.rsvpDeadline && (
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            style={{
              textAlign: 'center',
              fontSize: '0.875rem',
              color: theme.accent,
              marginBottom: '32px'
            }}
          >
            Please respond by {new Date(content.rsvpDeadline).toLocaleDateString()}
          </motion.p>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          style={{
            backgroundColor: theme.darkBg,
            color: theme.darkText,
            padding: '40px',
            borderRadius: 0
          }}
        >
          <p style={{
            margin: '0 0 28px',
            fontSize: '0.9375rem',
            lineHeight: 1.7,
            color: theme.darkText,
            opacity: 0.85,
          }}>
            Each guest responds using their own personal invite link. If you can't find yours,
            enter the email your invite was sent to and we'll send it straight to your inbox.
          </p>

          {status === STATUS.sent ? (
            <p style={{ fontSize: '0.9375rem', lineHeight: 1.7, color: theme.darkText }}>
              If that email is on the guest list, we've just sent your personal RSVP link —
              check your inbox (and spam folder, just in case).
            </p>
          ) : (
            <>
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  color: theme.accent,
                  display: 'block',
                  marginBottom: '8px'
                }}>
                  Your email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); if (status === STATUS.error) setStatus(STATUS.idle); }}
                  placeholder="you@example.com"
                  style={{
                    width: '100%',
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderBottom: `1px solid ${theme.accent}40`,
                    padding: '8px 0',
                    color: theme.darkText,
                    fontSize: '1rem',
                    fontFamily: typography.bodyFont,
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {status === STATUS.error && (
                <p style={{ fontSize: '0.8125rem', color: '#E03553', marginBottom: '16px' }}>
                  Something went wrong — please try again in a moment.
                </p>
              )}

              <button
                type="button"
                onClick={handleSubmit}
                disabled={!isValidEmail || status === STATUS.sending}
                style={{
                  padding: '12px 28px',
                  backgroundColor: theme.accent,
                  color: theme.darkBg,
                  border: 'none',
                  borderRadius: 999,
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: (!isValidEmail || status === STATUS.sending) ? 'not-allowed' : 'pointer',
                  opacity: (!isValidEmail || status === STATUS.sending) ? 0.5 : 1,
                  marginTop: '4px'
                }}
              >
                {status === STATUS.sending ? 'Sending…' : 'Send me my RSVP link'}
              </button>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
