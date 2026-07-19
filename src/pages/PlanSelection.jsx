import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Loader2, Check, Crown } from 'lucide-react';
import { track } from '@/lib/analytics';
import { startCheckout } from '@/lib/checkoutSession';

const PJS = "'Plus Jakarta Sans', sans-serif";

const PRO_FEATURES = [
  'Unlimited guests & full RSVP management',
  'Complete budget suite',
  'Ava AI — unlimited & context-aware',
  'Full vendor management & marketplace',
  'Seating planner',
  'Schedule & day-of timeline',
  'Photography, styling & moodboard tools',
  'Music planner & registry management',
  'Vows & speeches writer',
  'Priority support',
  '24-month access',
];

const ULTRA_EXTRAS = [
  'Wedding website builder',
  'Premium themes (11 universe styles)',
  'Digital invitations via email & WhatsApp',
  'Online RSVP pages for guests',
  'Guest suite — accommodation & experience guide',
  'Save the dates & thank you cards',
];

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, marginTop: 2 }}>
      <path d="M2.5 7L5.5 10L11.5 4" stroke="#E03553" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function PlanSelection() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const plan = user?.plan || 'free';
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [checkoutError, setCheckoutError] = useState(null);

  const goPro   = () => { track('checkout_initiated', { plan: 'pro',   price: 79  }); startCheckout('pro',   setLoadingPlan, setCheckoutError); };
  const goUltra = () => { track('checkout_initiated', { plan: 'ultra', price: 149 }); startCheckout('ultra', setLoadingPlan, setCheckoutError); };

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF', fontFamily: PJS, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 24px' }}>

      {/* Header */}
      <div style={{ textAlign: 'center', maxWidth: 560, marginBottom: 56 }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(10,10,10,0.4)', margin: '0 0 12px', fontFamily: PJS }}>
          YOUR 14-DAY TRIAL IS ENDING
        </p>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 800, color: '#0A0A0A', letterSpacing: '-0.02em', lineHeight: 1.15, margin: '0 0 14px', fontFamily: PJS }}>
          Choose your plan
        </h1>
        <p style={{ fontSize: 15, color: 'rgba(10,10,10,0.5)', lineHeight: 1.65, margin: 0, fontFamily: PJS }}>
          Pay once. No monthly fees. No subscriptions. No upsells, ever.
        </p>
      </div>

      {/* Plan cards */}
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', justifyContent: 'center', width: '100%', maxWidth: 760, marginBottom: 32 }}>

        {/* Pro */}
        <div style={{ flex: '0 1 340px', minWidth: 280, border: '1px solid #E5E5E5', background: '#FAFAF9', padding: 32, display: 'flex', flexDirection: 'column' }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)', margin: '0 0 14px', fontFamily: PJS }}>Pro</p>
          <div style={{ marginBottom: 4 }}>
            <span style={{ fontSize: 44, fontWeight: 800, color: '#0A0A0A', letterSpacing: '-0.03em', lineHeight: 1, fontFamily: PJS }}>$79</span>
          </div>
          <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.4)', margin: '0 0 20px', fontFamily: PJS }}>24-month access · one-time payment</p>
          <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.6)', lineHeight: 1.6, margin: '0 0 20px', fontFamily: PJS }}>
            Your complete wedding planning command centre.
          </p>
          <div style={{ height: 1, background: 'rgba(10,10,10,0.06)', marginBottom: 20 }} />
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', display: 'flex', flexDirection: 'column', gap: 9, flex: 1 }}>
            {PRO_FEATURES.map((f, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13, color: '#0A0A0A', fontFamily: PJS }}>
                <CheckIcon />
                {f}
              </li>
            ))}
          </ul>
          <button
            onClick={goPro}
            disabled={!!loadingPlan}
            style={{
              width: '100%', padding: '13px 0', borderRadius: 999, fontSize: 13, fontWeight: 700,
              fontFamily: PJS, background: '#E03553', color: '#FFFFFF', border: 'none',
              cursor: loadingPlan ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              opacity: loadingPlan && loadingPlan !== 'pro' ? 0.5 : 1,
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => { if (!loadingPlan) e.currentTarget.style.opacity = '0.88'; }}
            onMouseLeave={e => { if (!loadingPlan) e.currentTarget.style.opacity = '1'; }}
          >
            {loadingPlan === 'pro' ? <><Loader2 size={14} style={{ animation: 'oi-spin 0.8s linear infinite' }} /> Redirecting…</> : 'Get Pro — $79'}
          </button>
        </div>

        {/* Ultra */}
        <div style={{ flex: '0 1 340px', minWidth: 280, border: '1px solid #E5E5E5', background: '#FAFAF9', padding: 32, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Crown size={13} style={{ color: '#F59E0B', flexShrink: 0 }} />
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)', margin: 0, fontFamily: PJS }}>Ultra</p>
          </div>
          <div style={{ marginBottom: 4 }}>
            <span style={{ fontSize: 44, fontWeight: 800, color: '#0A0A0A', letterSpacing: '-0.03em', lineHeight: 1, fontFamily: PJS }}>$149</span>
          </div>
          <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.4)', margin: '0 0 20px', fontFamily: PJS }}>24-month access · one-time payment</p>
          <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.6)', lineHeight: 1.6, margin: '0 0 20px', fontFamily: PJS }}>
            Everything in Pro, plus the full digital wedding suite.
          </p>
          <div style={{ height: 1, background: 'rgba(10,10,10,0.06)', marginBottom: 12 }} />
          <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(10,10,10,0.4)', letterSpacing: '0.04em', margin: '0 0 12px', fontFamily: PJS }}>
            Everything in Pro, plus:
          </p>
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', display: 'flex', flexDirection: 'column', gap: 9, flex: 1 }}>
            {ULTRA_EXTRAS.map((f, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13, color: '#0A0A0A', fontFamily: PJS }}>
                <CheckIcon />
                {f}
              </li>
            ))}
          </ul>
          <button
            onClick={goUltra}
            disabled={!!loadingPlan}
            style={{
              width: '100%', padding: '13px 0', borderRadius: 999, fontSize: 13, fontWeight: 700,
              fontFamily: PJS, background: 'linear-gradient(135deg, #FBBF24, #F59E0B)', color: '#FFFFFF', border: 'none',
              cursor: loadingPlan ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              opacity: loadingPlan && loadingPlan !== 'ultra' ? 0.5 : 1,
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => { if (!loadingPlan) e.currentTarget.style.opacity = '0.88'; }}
            onMouseLeave={e => { if (!loadingPlan) e.currentTarget.style.opacity = '1'; }}
          >
            {loadingPlan === 'ultra' ? <><Loader2 size={14} style={{ animation: 'oi-spin 0.8s linear infinite' }} /> Redirecting…</> : 'Get Ultra — $149'}
          </button>
        </div>

      </div>

      {/* ── Checkout error banner ── */}
      {checkoutError && (
        <div style={{
          maxWidth: 720, width: '100%', margin: '0 auto', marginBottom: 24,
          background: '#FEF2F2', border: '1px solid #FECACA',
          padding: '14px 20px',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16,
        }}>
          <p style={{ fontSize: 13, color: '#991B1B', margin: 0, lineHeight: 1.5, fontFamily: PJS, flex: 1 }}>
            {checkoutError}
          </p>
          <button
            onClick={() => setCheckoutError(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#991B1B', fontSize: 16, lineHeight: 1, padding: 0, flexShrink: 0 }}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      {/* Free trial continue */}
      {plan === 'free' && (
        <button
          onClick={() => navigate('/Dashboard')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'rgba(10,10,10,0.4)', fontFamily: PJS, textDecoration: 'underline', textDecorationColor: 'rgba(10,10,10,0.2)' }}
        >
          Continue with free trial
        </button>
      )}

      <p style={{ fontSize: 11, color: 'rgba(10,10,10,0.3)', margin: '20px 0 0', fontFamily: PJS }}>
        Prices in AUD · 14-day money-back guarantee · No recurring fees
      </p>

      <style>{`@keyframes oi-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
