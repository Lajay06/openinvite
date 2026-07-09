import React from 'react';
import { Link } from 'react-router-dom';
import PublicNav from '@/components/public/PublicNav';
import PublicFooter from '@/components/public/PublicFooter';

const PJS = "'Plus Jakarta Sans', sans-serif";
const H1  = { fontSize: 40, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS, letterSpacing: '-0.02em', lineHeight: 1.15, marginBottom: 16 };
const H2  = { fontSize: 20, fontWeight: 600, color: '#0A0A0A', fontFamily: PJS, letterSpacing: '-0.01em', marginTop: 48, marginBottom: 14 };
const P   = { fontSize: 15, lineHeight: 1.75, color: 'rgba(10,10,10,0.75)', fontFamily: PJS, marginBottom: 14 };
const UL  = { fontSize: 15, lineHeight: 1.75, color: 'rgba(10,10,10,0.75)', fontFamily: PJS, paddingLeft: 20, marginBottom: 14 };
const LK  = { color: '#E03553', textDecoration: 'none' };
const DIV = { borderTop: '1px solid rgba(10,10,10,0.06)', marginTop: 48 };

function PolicyCard({ icon, title, children }) {
  return (
    <div style={{ border: '1px solid rgba(10,10,10,0.08)', padding: '24px 28px', marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div style={{ fontSize: 22, flexShrink: 0, lineHeight: 1 }}>{icon}</div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS, marginBottom: 8 }}>{title}</div>
          {children}
        </div>
      </div>
    </div>
  );
}

export default function RefundPolicy() {
  return (
    <div style={{ background: '#FFFFFF', minHeight: '100vh' }}>
      <PublicNav />
      <main style={{ paddingTop: 120, paddingBottom: 120 }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 24px' }}>

          <div style={{ fontSize: 12, color: 'rgba(10,10,10,0.4)', fontFamily: PJS, marginBottom: 10 }}>Last updated: 9 July 2026</div>
          <h1 style={H1}>Refund policy</h1>
          <p style={{ fontSize: 15, lineHeight: 1.75, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, marginBottom: 48 }}>
            Pro and Ultra are one-time purchases, not subscriptions — so our refund policy is a single, simple guarantee.
          </p>

          <PolicyCard icon="🎉" title="Free trial">
            <p style={{ ...P, marginBottom: 0 }}>No charge, no refund needed. Try the full product free before you buy.</p>
          </PolicyCard>

          <PolicyCard icon="⭐" title="Pro and Ultra — 14-day money-back guarantee">
            <p style={P}>If you purchase Pro ($79 AUD) or Ultra ($149 AUD) and are not satisfied, you may request a full refund within <strong>14 days</strong> of your purchase date — no questions asked.</p>
            <p style={{ ...P, marginBottom: 0 }}>After 14 days, your purchase is non-refundable. You keep access to your plan's features for the full 24-month access period regardless.</p>
          </PolicyCard>

          <PolicyCard icon="🔄" title="Material service changes">
            <p style={P}>If we materially remove a feature you specifically purchased a plan for, you may contact us within 14 days of that change for a case-by-case refund assessment.</p>
            <p style={{ ...P, marginBottom: 0 }}>Minor updates, redesigns, or improvements do not qualify.</p>
          </PolicyCard>

          <div style={DIV} />
          <h2 style={H2}>How to request a refund</h2>
          <p style={P}>Email us with the following details:</p>
          <ul style={UL}>
            <li>Subject line: <strong>"Refund request"</strong></li>
            <li>The email address on your OpenInvite account</li>
            <li>The reason for your refund request</li>
            <li>Your purchase date, if you have it</li>
          </ul>
          <p style={P}>
            <strong>Email:</strong> <a href="mailto:customercare@openinvite.com.au" style={LK}>customercare@openinvite.com.au</a>
          </p>
          <p style={P}>We aim to process refund requests within 5–7 business days. Refunds are returned to your original payment method via Stripe and may take an additional 5–10 business days to appear, depending on your bank.</p>

          <div style={DIV} />
          <h2 style={H2}>What is not refundable</h2>
          <ul style={UL}>
            <li>Purchases past the 14-day window (unless a material change occurred, see above)</li>
            <li>Accounts suspended for violating our <Link to="/terms-of-service" style={LK}>Terms of service</Link></li>
          </ul>

          <div style={DIV} />
          <h2 style={H2}>Questions?</h2>
          <p style={P}>If you're unsure whether your situation qualifies, just ask — we'd rather find a fair solution than leave you unhappy.</p>
          <p style={P}><a href="mailto:customercare@openinvite.com.au" style={LK}>customercare@openinvite.com.au</a></p>

        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
