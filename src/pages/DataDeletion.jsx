import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Loader2 } from 'lucide-react';
import PublicNav from '@/components/public/PublicNav';
import PublicFooter from '@/components/public/PublicFooter';

const PJS = "'Plus Jakarta Sans', sans-serif";
const LK  = { color: '#E03553', textDecoration: 'none' };

const REASONS = [
  'No longer planning a wedding',
  'Switched to a different tool',
  'Privacy concerns',
  'Too expensive',
  'Missing features I need',
  'Just trying it out, no longer needed',
  'Other',
];

const inputStyle = {
  width: '100%', border: 'none', borderBottom: '1px solid rgba(10,10,10,0.18)',
  background: 'none', fontSize: 15, color: '#0A0A0A', fontFamily: PJS,
  outline: 'none', padding: '8px 0', boxSizing: 'border-box',
};
const labelStyle = {
  fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
  color: 'rgba(10,10,10,0.4)', fontFamily: PJS, display: 'block', marginBottom: 8,
};

export default function DataDeletion() {
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 1000));
    setSubmitting(false);
    setDone(true);
  };

  return (
    <div style={{ background: '#FFFFFF', minHeight: '100vh' }}>
      <PublicNav />
      <main style={{ paddingTop: 120, paddingBottom: 120 }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 24px' }}>

          <div style={{ fontSize: 12, color: 'rgba(10,10,10,0.4)', fontFamily: PJS, marginBottom: 10 }}>Data deletion request</div>
          <h1 style={{ fontSize: 40, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS, letterSpacing: '-0.02em', lineHeight: 1.15, marginBottom: 16 }}>Delete your account and data</h1>
          <p style={{ fontSize: 15, lineHeight: 1.75, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, marginBottom: 48 }}>
            We are sorry to see you go. Your data belongs to you — here is how to remove it.
          </p>

          {/* Option 1 */}
          <div style={{ border: '1px solid rgba(10,10,10,0.08)', padding: '28px 32px', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 13, fontWeight: 700, color: '#FFFFFF', fontFamily: PJS }}>1</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 17, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS, marginBottom: 6 }}>Delete from your account settings</div>
                <p style={{ fontSize: 14, lineHeight: 1.7, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, marginBottom: 16 }}>
                  If you are logged in, the fastest way to delete your account and all data is through your account settings.
                </p>
                <Link to="/Dashboard"
                  style={{ display: 'inline-block', padding: '9px 20px', borderRadius: 999, fontSize: 13, fontWeight: 700, fontFamily: PJS, background: '#0A0A0A', color: '#FFFFFF', textDecoration: 'none' }}>
                  Go to account settings
                </Link>
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'center', fontSize: 13, color: 'rgba(10,10,10,0.35)', fontFamily: PJS, padding: '12px 0' }}>or</div>

          {/* Option 2 */}
          <div style={{ border: '1px solid rgba(10,10,10,0.08)', padding: '28px 32px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 13, fontWeight: 700, color: '#FFFFFF', fontFamily: PJS }}>2</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 17, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS, marginBottom: 6 }}>Submit a deletion request</div>
                <p style={{ fontSize: 14, lineHeight: 1.7, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, marginBottom: 24 }}>
                  Not logged in? Submit your email address below and we will process your deletion request within 7 business days.
                </p>

                {done ? (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', padding: '16px 20px' }}>
                    <Check size={18} style={{ color: '#10B981', marginTop: 1, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS, marginBottom: 4 }}>Request received</div>
                      <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, margin: 0 }}>
                        We will process your deletion request and send a confirmation to <strong>{email}</strong> within 7 business days.
                      </p>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div>
                      <label style={labelStyle}>Email address</label>
                      <input
                        type="email" required value={email} onChange={e => setEmail(e.target.value)}
                        placeholder="The email address on your OpenInvite account"
                        style={inputStyle}
                        onFocus={e => e.target.style.borderBottomColor = '#E03553'}
                        onBlur={e => e.target.style.borderBottomColor = 'rgba(10,10,10,0.18)'}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Reason (optional)</label>
                      <select value={reason} onChange={e => setReason(e.target.value)}
                        style={{ ...inputStyle, appearance: 'none', cursor: 'pointer', color: reason ? '#0A0A0A' : 'rgba(10,10,10,0.4)' }}>
                        <option value="">Select a reason…</option>
                        {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                    <div>
                      <button type="submit" disabled={submitting}
                        style={{ padding: '11px 28px', borderRadius: 999, fontSize: 13, fontWeight: 700, fontFamily: PJS, cursor: submitting ? 'not-allowed' : 'pointer', border: 'none', background: '#E03553', color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: 8, opacity: submitting ? 0.7 : 1 }}>
                        {submitting && <Loader2 size={14} className="animate-spin" />}
                        Submit deletion request
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>

          {/* What gets deleted */}
          <div style={{ marginTop: 48, borderTop: '1px solid rgba(10,10,10,0.06)', paddingTop: 40 }}>
            <h2 style={{ fontSize: 20, fontWeight: 600, color: '#0A0A0A', fontFamily: PJS, marginBottom: 14 }}>What gets deleted</h2>
            <p style={{ fontSize: 15, lineHeight: 1.75, color: 'rgba(10,10,10,0.75)', fontFamily: PJS, marginBottom: 14 }}>When we delete your account, the following is permanently removed:</p>
            <ul style={{ fontSize: 15, lineHeight: 1.75, color: 'rgba(10,10,10,0.75)', fontFamily: PJS, paddingLeft: 20, marginBottom: 14 }}>
              <li>Your account and profile information</li>
              <li>All wedding details and planning data</li>
              <li>Your guest list and RSVP data</li>
              <li>Budget, vendor, checklist, and schedule data</li>
              <li>Your wedding website (if created)</li>
              <li>All AI conversation history with Ava</li>
            </ul>
            <p style={{ fontSize: 14, lineHeight: 1.7, color: 'rgba(10,10,10,0.5)', fontFamily: PJS }}>
              Backup copies are purged within 90 days. Some transaction records may be retained for legal compliance. See our <Link to="/privacy-policy" style={LK}>Privacy policy</Link> for full details.
            </p>
          </div>

        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
