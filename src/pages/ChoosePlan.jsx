import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Loader2 } from 'lucide-react';
import { track } from '@/lib/analytics';
import { startCheckout } from '@/lib/checkoutSession';
import { PRO_FEATURES, ULTRA_EXTRAS } from '@/lib/planFeatures';

const PJS = "'Plus Jakarta Sans', sans-serif";

function CheckIcon({ color = '#E03553' }) {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, marginTop: 2 }}>
      <path d="M2.5 7L5.5 10L11.5 4" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CrownIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
      <path d="M7 1L9 5.5L14 6.5L10.5 9.5L11.5 14L7 11.5L2.5 14L3.5 9.5L0 6.5L5 5.5Z" fill="#F59E0B" />
    </svg>
  );
}

// This account-state gate is deliberately the ONLY place that decides
// whether a just-authenticated visitor sees the plan step, regardless of
// how they got here (email/password signup, email/password login, or any
// OAuth provider via either page) — see Register.jsx/Login.jsx, both of
// which route every successful auth through here rather than straight to
// the dashboard. A user counts as already past this step if any of these
// hold: they've explicitly completed it before (plan_step_completed), OR
// they've already finished onboarding, OR they already have a paid plan —
// the last two cover every pre-existing account created before this flow
// shipped, with no migration needed (confirmed live for jaygalaxy23 and
// la.jay06: both onboardingCompleted=true, plan='ultra').
function isPastPlanStep(user) {
  return !!(user?.plan_step_completed || user?.onboardingCompleted || user?.plan === 'pro' || user?.plan === 'ultra');
}

export default function ChoosePlan() {
  const navigate = useNavigate();
  const { user, isLoadingAuth } = useAuth();
  const [checking, setChecking] = useState(true);
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [checkoutError, setCheckoutError] = useState(null);

  const params = new URLSearchParams(window.location.search);
  const next = params.get('next') || '/DailyUpdate';
  const preselect = params.get('plan');
  const [selected, setSelected] = useState(preselect === 'pro' || preselect === 'ultra' ? preselect : 'free');

  useEffect(() => {
    if (isLoadingAuth) return;
    if (isPastPlanStep(user)) {
      // Lazy backfill — an existing account reaching here for the first
      // time (e.g. signed up before this flag existed) gets the flag
      // written once, so future landings skip the check entirely rather
      // than re-deriving it from onboardingCompleted/plan every time.
      if (user && !user.plan_step_completed) {
        base44.auth.updateMe({ plan_step_completed: true }).catch(() => {});
      }
      navigate(next, { replace: true });
      return;
    }
    setChecking(false);
  }, [isLoadingAuth, user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Defensive parity with Pricing.jsx's own plan-aware buttons — normally
  // unreachable (isPastPlanStep above already redirects a pro/ultra user
  // away before this renders), but if user state resolves a beat late this
  // keeps a paid account from ever being shown a live "charge me again"
  // button for the plan it's already on.
  const isPro = user?.plan === 'pro';
  const isUltra = user?.plan === 'ultra';
  const proDisabled = !!loadingPlan || isPro || isUltra;
  const proLabel = isPro ? 'Your plan' : isUltra ? 'Included in Ultra' : 'Get Pro — US$49';
  const ultraDisabled = !!loadingPlan || isUltra;
  const ultraLabel = isUltra ? 'Your plan' : 'Get Ultra — US$99';

  const markPlanStepDone = () => base44.auth.updateMe({ plan_step_completed: true }).catch(() => {});

  const goFree = async () => {
    setLoadingPlan('free');
    track('plan_chosen', { plan: 'free' });
    // trialStartedAt marks the moment the 14-day clock actually starts.
    // Without it, Layout.jsx's trial banner fell back to the account's
    // created_date — correct only when signup and "Start free" happen at
    // the same moment. Any gap (an abandoned signup revisited weeks later,
    // a pre-existing account from before this plan gate shipped) meant the
    // banner read "Your free trial has ended" on a trial that never
    // actually started.
    await base44.auth.updateMe({ plan_step_completed: true, trialStartedAt: new Date().toISOString() }).catch(() => {});
    navigate('/onboarding');
  };

  const goPro = async () => {
    if (proDisabled) return;
    track('checkout_initiated', { plan: 'pro', price: 79 });
    await markPlanStepDone();
    startCheckout('pro', setLoadingPlan, setCheckoutError, { logPrefix: '[ChoosePlan checkout]' });
  };

  const goUltra = async () => {
    if (ultraDisabled) return;
    track('checkout_initiated', { plan: 'ultra', price: 149 });
    await markPlanStepDone();
    startCheckout('ultra', setLoadingPlan, setCheckoutError, { logPrefix: '[ChoosePlan checkout]' });
  };

  if (checking) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFFFFF' }}>
        <Loader2 size={20} style={{ color: 'rgba(10,10,10,0.3)', animation: 'oi-spin 0.8s linear infinite' }} />
        <style>{'@keyframes oi-spin { to { transform: rotate(360deg); } }'}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF', fontFamily: PJS, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 24px' }}>

      {/* Header */}
      <div style={{ textAlign: 'center', maxWidth: 560, marginBottom: 56 }}>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 800, color: '#0A0A0A', letterSpacing: '-0.02em', lineHeight: 1.15, margin: '0 0 14px', fontFamily: PJS }}>
          Choose your plan
        </h1>
        <p style={{ fontSize: 15, color: 'rgba(10,10,10,0.6)', lineHeight: 1.65, margin: 0, fontFamily: PJS }}>
          Your account is ready. Pick a plan to continue, pay once and there are no subscriptions.
        </p>
      </div>

      {/* Plan cards */}
      <div style={{ display: 'flex', gap: 20, alignItems: 'stretch', flexWrap: 'wrap', justifyContent: 'center', width: '100%', maxWidth: 1100, marginBottom: 24 }}>

        {/* Free */}
        <div style={{
          flex: '0 1 320px', minWidth: 280, border: selected === 'free' ? '1px solid #0A0A0A' : '1px solid #E5E5E5',
          background: '#FAFAF9', padding: 32, display: 'flex', flexDirection: 'column', cursor: 'pointer',
        }}
          onClick={() => setSelected('free')}
        >
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.6)', margin: '0 0 14px', fontFamily: PJS }}>Free trial</p>
          <div style={{ marginBottom: 4 }}>
            <span style={{ fontSize: 48, fontWeight: 800, color: '#0A0A0A', letterSpacing: '-0.03em', lineHeight: 1, fontFamily: PJS }}>$0</span>
          </div>
          <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.6)', margin: '0 0 16px', fontFamily: PJS }}>14 days · no card needed</p>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: 'rgba(10,10,10,0.6)', margin: '0 0 20px', fontFamily: PJS }}>
            Full Ultra access for 14 days. Choose Pro or Ultra anytime to keep your data.
          </p>
          <div style={{ height: 1, background: 'rgba(10,10,10,0.06)', marginBottom: 20 }} />
          <div style={{ flex: 1, marginBottom: 20 }} />
          <button
            onClick={goFree}
            disabled={!!loadingPlan}
            style={{
              width: '100%', padding: '13px 0', borderRadius: 999, fontSize: 13, fontWeight: 700,
              fontFamily: PJS, background: '#0A0A0A', color: '#FFFFFF', border: 'none',
              cursor: loadingPlan ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              opacity: loadingPlan && loadingPlan !== 'free' ? 0.5 : 1,
              transition: 'opacity 0.15s',
            }}
          >
            {loadingPlan === 'free' ? <><Loader2 size={14} style={{ animation: 'oi-spin 0.8s linear infinite' }} /> Setting up…</> : 'Start free'}
          </button>
        </div>

        {/* Pro */}
        <div style={{
          flex: '0 1 320px', minWidth: 280, border: selected === 'pro' ? '1px solid #E03553' : '1px solid #E5E5E5',
          background: '#FAFAF9', padding: 32, display: 'flex', flexDirection: 'column', cursor: 'pointer',
        }}
          onClick={() => setSelected('pro')}
        >
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.6)', margin: '0 0 14px', fontFamily: PJS }}>Pro</p>
          <div style={{ marginBottom: 4 }}>
            <span style={{ fontSize: 48, fontWeight: 800, color: '#0A0A0A', letterSpacing: '-0.03em', lineHeight: 1, fontFamily: PJS }}>US$49</span>
          </div>
          <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.6)', margin: '0 0 16px', fontFamily: PJS }}>24-month access · one-time payment</p>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: 'rgba(10,10,10,0.6)', margin: '0 0 20px', fontFamily: PJS }}>
            Your complete wedding planning command center. Everything from first plan to final dance.
          </p>
          <div style={{ height: 1, background: 'rgba(10,10,10,0.06)', marginBottom: 20 }} />
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px', display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
            {PRO_FEATURES.map((f, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13, color: '#0A0A0A', fontFamily: PJS }}>
                <CheckIcon />
                {f}
              </li>
            ))}
          </ul>
          <button
            onClick={goPro}
            disabled={proDisabled}
            style={{
              width: '100%', padding: '13px 0', borderRadius: 999, fontSize: 13, fontWeight: 700,
              fontFamily: PJS, border: 'none',
              background: proDisabled ? 'rgba(10,10,10,0.08)' : '#E03553',
              color: proDisabled ? 'rgba(10,10,10,0.3)' : '#FFFFFF',
              cursor: proDisabled ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              opacity: loadingPlan && loadingPlan !== 'pro' ? 0.5 : 1,
              transition: 'opacity 0.15s',
            }}
          >
            {loadingPlan === 'pro' ? <><Loader2 size={14} style={{ animation: 'oi-spin 0.8s linear infinite' }} /> Redirecting…</> : proLabel}
          </button>
        </div>

        {/* Ultra */}
        <div style={{
          flex: '0 1 320px', minWidth: 280, border: selected === 'ultra' ? '1px solid #F59E0B' : '1px solid #E5E5E5',
          background: '#FAFAF9', padding: 32, display: 'flex', flexDirection: 'column', cursor: 'pointer',
        }}
          onClick={() => setSelected('ultra')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <CrownIcon />
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.6)', margin: 0, fontFamily: PJS }}>Ultra</p>
          </div>
          <div style={{ marginBottom: 4 }}>
            <span style={{ fontSize: 48, fontWeight: 800, color: '#0A0A0A', letterSpacing: '-0.03em', lineHeight: 1, fontFamily: PJS }}>US$99</span>
          </div>
          <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.6)', margin: '0 0 16px', fontFamily: PJS }}>24-month access · one-time payment</p>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: 'rgba(10,10,10,0.6)', margin: '0 0 20px', fontFamily: PJS }}>
            Everything in Pro, plus the full digital wedding suite: website, invitations, and RSVP.
          </p>
          <div style={{ height: 1, background: 'rgba(10,10,10,0.06)', marginBottom: 14 }} />
          <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(10,10,10,0.6)', margin: '0 0 12px', letterSpacing: '0.04em', fontFamily: PJS }}>
            Everything in Pro, plus:
          </p>
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px', display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
            {ULTRA_EXTRAS.map((f, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13, color: '#0A0A0A', fontFamily: PJS }}>
                <CheckIcon />
                {f}
              </li>
            ))}
          </ul>
          <button
            onClick={goUltra}
            disabled={ultraDisabled}
            style={{
              width: '100%', padding: '13px 0', borderRadius: 999, fontSize: 13, fontWeight: 700,
              fontFamily: PJS, border: 'none',
              background: ultraDisabled ? 'rgba(10,10,10,0.08)' : '#F59E0B',
              color: ultraDisabled ? 'rgba(10,10,10,0.3)' : '#FFFFFF',
              cursor: ultraDisabled ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              opacity: loadingPlan && loadingPlan !== 'ultra' ? 0.5 : 1,
              transition: 'opacity 0.15s',
            }}
          >
            {loadingPlan === 'ultra' ? <><Loader2 size={14} style={{ animation: 'oi-spin 0.8s linear infinite' }} /> Redirecting…</> : ultraLabel}
          </button>
        </div>

      </div>

      <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.6)', margin: '0 0 24px', fontFamily: PJS }}>
        Have a gift code? You'll be able to enter it at checkout.
      </p>

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

      <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.6)', margin: 0, fontFamily: PJS }}>
        Prices in USD · Refunds as required by law · No recurring fees
      </p>
    </div>
  );
}
