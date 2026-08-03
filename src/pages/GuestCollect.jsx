import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Turnstile } from '@marsidev/react-turnstile';
import { ChevronLeft } from 'lucide-react';
import { fetchWeddingBySlug } from '@/lib/weddingBySlug';
import { getUniverse } from '@/lib/universeCatalog';
import { loadUniverseFont } from '@/lib/lazyUniverseFonts';

const PJS = "'Plus Jakarta Sans', sans-serif";
const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;

// Honeypot: a decoy field real guests never see (positioned off-screen, not
// display:none/visibility:hidden — some bots specifically skip those two
// and still fill an off-screen field). Any non-empty value on submit means
// a bot filled every field blind; server-side this no-ops with a 200
// (api/collect-guest-contact.js), so the bot gets no signal it was caught.
function Honeypot({ value, onChange }) {
  return (
    <div style={{ position: 'absolute', left: -9999, top: -9999, width: 1, height: 1, overflow: 'hidden' }} aria-hidden="true">
      <label htmlFor="company">Company</label>
      <input
        id="company"
        name="company"
        type="text"
        tabIndex={-1}
        autoComplete="off"
        value={value}
        onChange={onChange}
      />
    </div>
  );
}

export default function GuestCollect() {
  const { weddingSlug } = useParams();
  const [wedding, setWedding] = useState(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [mailingAddress, setMailingAddress] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const turnstileRef = useRef(null);
  const tsTokenRef = useRef('');

  useEffect(() => {
    fetchWeddingBySlug(weddingSlug).then(w => {
      setWedding(w);
      setLoading(false);
    });
  }, [weddingSlug]);

  const universe = getUniverse(wedding?.activeUniverse) || getUniverse('london');
  useEffect(() => {
    if (universe) loadUniverseFont(universe);
  }, [universe]);

  const coupleNames = wedding?.coupleNames
    || [wedding?.couple1Name, wedding?.couple2Name].filter(Boolean).join(' & ')
    || 'the couple';

  const colors = universe?.colors || {};
  const typography = universe?.typography || {};

  const submit = async () => {
    if (!name.trim()) return;
    const turnstileToken = tsTokenRef.current;
    if (!turnstileToken) {
      setSubmitError('Security check still loading — please wait a moment and try again.');
      return;
    }
    setSubmitError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/collect-guest-contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weddingSlug,
          name,
          email,
          phone,
          mailingAddress,
          honeypot,
          turnstileToken,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSubmitError(data.error || 'Something went wrong. Please try again.');
        return;
      }
      setSubmitted(true);
    } catch {
      setSubmitError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0A0A0A' }}>
      <div style={{ width: 20, height: 20, border: '2px solid #EEEEEE', borderTopColor: '#0A0A0A', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (!wedding) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0A0A0A' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#FFFFFF', marginBottom: 12, fontFamily: PJS }}>Wedding not found</h1>
      </div>
    </div>
  );

  const inputStyle = {
    width: '100%', padding: '14px 16px', background: 'rgba(255,255,255,0.06)',
    border: `1px solid ${colors.lightBg}33`, color: colors.lightBg || '#FFFFFF',
    fontSize: 16, fontFamily: typography.bodyFont || PJS, outline: 'none',
    marginBottom: 12, boxSizing: 'border-box',
  };

  return (
    <div style={{ background: colors.darkBg || '#0A0A0A', minHeight: '100svh', paddingBottom: 80, fontFamily: typography.bodyFont || PJS }}>
      {/* Nav */}
      <div style={{ position: 'sticky', top: 0, zIndex: 100, height: 56, background: `${colors.darkBg || '#0A0A0A'}F2`, borderBottom: `1px solid ${colors.lightBg || '#FFFFFF'}1A`, display: 'flex', alignItems: 'center', padding: '0 16px' }}>
        <Link to={`/w/${weddingSlug}`} style={{ color: colors.lightBg || '#FFFFFF', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 600, fontFamily: PJS }}>
          <ChevronLeft size={16} /> Back
        </Link>
      </div>

      {/* Hero */}
      <div style={{ padding: '60px 24px 40px', textAlign: 'center' }}>
        <h1 style={{ fontFamily: typography.headingFont || PJS, fontWeight: typography.headingFont ? 400 : 700, fontSize: 'clamp(32px, 8vw, 52px)', color: colors.lightBg || '#FFFFFF', margin: '0 0 16px', lineHeight: 1.1 }}>
          Share your details
        </h1>
        <p style={{ fontSize: 15, color: `${colors.lightBg || '#FFFFFF'}8C`, lineHeight: 1.7, maxWidth: 420, margin: '0 auto' }}>
          {coupleNames} would love to send you an invitation. Leave your details below and they'll take it from here.
        </p>
      </div>

      <div style={{ padding: '0 24px', maxWidth: 440, margin: '0 auto' }}>
        {submitted ? (
          <div style={{ padding: '40px 0', textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: colors.accent || '#E03553', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
            </div>
            <h2 style={{ fontFamily: typography.headingFont || PJS, fontWeight: typography.headingFont ? 400 : 700, fontSize: 28, color: colors.lightBg || '#FFFFFF', marginBottom: 12 }}>
              Thank you!
            </h2>
            <p style={{ fontSize: 14, color: `${colors.lightBg || '#FFFFFF'}8C`, fontFamily: PJS }}>
              Your details have been sent to {coupleNames}.
            </p>
          </div>
        ) : (
          <div style={{ padding: '0 0 40px' }}>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" style={inputStyle} />
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email (optional)" type="email" style={inputStyle} />
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone (optional)" type="tel" style={inputStyle} />
            <input value={mailingAddress} onChange={e => setMailingAddress(e.target.value)} placeholder="Mailing address (optional)" style={{ ...inputStyle, marginBottom: 20 }} />

            <Honeypot value={honeypot} onChange={e => setHoneypot(e.target.value)} />

            {submitError && (
              <p style={{ fontSize: 13, color: '#E03553', marginBottom: 16, fontFamily: PJS }}>{submitError}</p>
            )}

            <button
              onClick={submit}
              disabled={!name.trim() || submitting}
              style={{
                width: '100%', padding: '18px', background: name.trim() ? (colors.accent || '#E03553') : `${colors.lightBg || '#FFFFFF'}1A`,
                color: name.trim() ? '#FFFFFF' : `${colors.lightBg || '#FFFFFF'}4D`, border: 'none', fontSize: 16, fontWeight: 700,
                cursor: name.trim() ? 'pointer' : 'not-allowed', minHeight: 60, fontFamily: PJS,
              }}
            >
              {submitting ? 'Sending…' : 'Send my details'}
            </button>
          </div>
        )}
      </div>

      {/* Invisible Turnstile — execution="render" auto-generates a token on
          mount, matching the pattern already used by WeddingPollsPage.jsx. */}
      {!submitted && (
        <Turnstile
          ref={turnstileRef}
          siteKey={TURNSTILE_SITE_KEY}
          onSuccess={(token) => { tsTokenRef.current = token; }}
          onExpire={() => { tsTokenRef.current = ''; }}
          options={{ appearance: 'execute', execution: 'render' }}
        />
      )}
    </div>
  );
}
