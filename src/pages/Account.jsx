import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Check, CreditCard, Crown, Receipt } from 'lucide-react';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import AvaButton from '@/components/shared/AvaButton';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';

const PJS = "'Plus Jakarta Sans', sans-serif";

const PLAN_FEATURES = {
  free: [
    '14-day full access to every feature',
    'Unlimited guests, budget, seating & vendors',
    'Wedding website builder & premium themes',
    'Digital invitations via email & WhatsApp',
    'Online RSVP pages',
    'Ava AI — unlimited conversations',
    'Priority support',
  ],
  pro: [
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
  ],
  ultra: [
    'Everything in Pro',
    'Wedding website builder',
    'Premium themes (11 universe styles)',
    'Digital invitations via email & WhatsApp',
    'Online RSVP pages for guests',
    'Guest suite — accommodation, transport & experience guide',
    'Save the dates & thank you cards',
  ],
};

const PRICE_IDS = {
  pro: 'price_1TavqVJ4ROjxYxkaoCOUvzS8',
  ultra: 'price_1TavrJJ4ROjxYxkaM6oOwBZz',
};

const PLAN_LABELS = { free: 'Free trial', pro: 'Pro', ultra: 'Ultra' };
const NO_UPSELLS = 'No upsells, ever. Pay once, plan your entire wedding.';
const PLAN_PRICES = { pro: '$79', ultra: '$149' };

const ADMIN_EMAIL = 'lajay@openinvite.com.au';

export default function AccountPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [name, setName] = useState(user?.full_name || '');
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [checkoutLoading, setCheckoutLoading] = useState(null);
  const [portalLoading, setPortalLoading] = useState(false);

  const plan = user?.plan || 'free';
  const planLabel = PLAN_LABELS[plan] || 'Free trial';

  const initials = (user?.full_name || user?.email || 'U')
    .split(/\s+/).filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase() || 'U';

  const planActivatedAt = user?.planActivatedAt
    ? new Date(user.planActivatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  const handleSaveName = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setSaveStatus('saving');
    try {
      await base44.auth.updateMe({ full_name: name.trim() });
      try {
        const stored = JSON.parse(localStorage.getItem('oi_user') || '{}');
        localStorage.setItem('oi_user', JSON.stringify({ ...stored, full_name: name.trim() }));
      } catch {}
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      setSaveStatus('idle');
    }
    setSaving(false);
  };

  const handlePortal = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch('/api/create-portal-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: user?.stripeCustomerId }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {}
    setPortalLoading(false);
  };

  const handleCheckout = async (planKey) => {
    setCheckoutLoading(planKey);
    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: PRICE_IDS[planKey],
          userId: user?.id || '',
          userEmail: user?.email || '',
        }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {}
    setCheckoutLoading(null);
  };

  const labelStyle = {
    fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
    color: 'rgba(10,10,10,0.4)', fontFamily: PJS, display: 'block', marginBottom: 6,
  };

  const sectionTitleStyle = {
    fontSize: 13, fontWeight: 700, color: '#0A0A0A', margin: '0 0 20px', fontFamily: PJS,
  };

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF', fontFamily: PJS }}>
      <DashboardPageHeader title="Account & billing" subtitle="Manage your profile and subscription" />

      {/* Ava + actions bar */}
      <div className="flex flex-wrap items-center justify-between gap-y-2 px-4 md:px-8 py-4" style={{ borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
        <AvaButton label="Ask Ava about your account or plan" />
        <div className="flex flex-wrap items-center gap-[10px]">
          {saveStatus === 'saving' && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'rgba(10,10,10,0.4)', fontFamily: PJS }}>
              <Loader2 size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> Saving…
            </span>
          )}
          {saveStatus === 'saved' && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#22C55E', fontWeight: 600, fontFamily: PJS }}>
              <Check size={13} /> Saved
            </span>
          )}
        </div>
      </div>

      <div style={{ padding: '32px 32px 48px', maxWidth: 720 }}>

        {/* ── Profile ─────────────────────────────────────── */}
        <p style={sectionTitleStyle}>Profile</p>

        {/* Avatar + name/email */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            background: 'linear-gradient(135deg, #ec4899, #9333ea)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 18, fontWeight: 700, fontFamily: PJS, flexShrink: 0,
          }}>
            {initials}
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#0A0A0A', margin: '0 0 2px', fontFamily: PJS }}>
              {user?.full_name || 'Your account'}
            </p>
            <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.4)', margin: 0, fontFamily: PJS }}>
              {user?.email || ''}
            </p>
          </div>
        </div>

        {/* Name field */}
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Full name</label>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSaveName()}
              placeholder="Your full name"
              className="input-editorial"
              style={{ flex: 1 }}
            />
            <button
              onClick={handleSaveName}
              disabled={saving || !name.trim()}
              style={{
                background: '#0A0A0A', color: '#FFFFFF',
                border: 'none', cursor: saving || !name.trim() ? 'not-allowed' : 'pointer',
                fontSize: 12, fontWeight: 700, fontFamily: PJS,
                padding: '7px 16px', borderRadius: 999, flexShrink: 0,
                opacity: saving || !name.trim() ? 0.4 : 1,
                transition: 'opacity 0.15s',
                marginBottom: 1,
              }}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>

        {/* Email field (read-only) */}
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Email address</label>
          <input
            type="email"
            value={user?.email || ''}
            readOnly
            className="input-editorial"
            style={{ color: 'rgba(10,10,10,0.35)', cursor: 'not-allowed' }}
          />
          <p style={{ fontSize: 11, color: 'rgba(10,10,10,0.4)', margin: '6px 0 0', fontFamily: PJS }}>
            Contact support to change your email address.
          </p>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(10,10,10,0.08)', margin: '32px 0' }} />

        {/* ── Plan & billing ───────────────────────────────── */}
        <p style={sectionTitleStyle}>Plan & billing</p>

        {/* Current plan badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <span style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', fontFamily: PJS,
            color: plan === 'free' ? 'rgba(10,10,10,0.55)' : '#FFFFFF',
            background: plan === 'ultra'
              ? 'linear-gradient(135deg, #FBBF24, #F59E0B)'
              : plan === 'pro'
                ? '#0A0A0A'
                : 'rgba(10,10,10,0.08)',
            padding: '4px 12px', borderRadius: 999,
          }}>
            {planLabel}
          </span>
          {planActivatedAt && (
            <span style={{ fontSize: 12, color: 'rgba(10,10,10,0.4)', fontFamily: PJS }}>
              Active since {planActivatedAt}
            </span>
          )}
        </div>

        {/* Upgrade cards (free trial users see both Pro and Ultra) */}
        {plan === 'free' && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" style={{ marginBottom: 12 }}>
              {(['pro', 'ultra']).map(pk => (
                <div key={pk} style={{ border: '1px solid rgba(10,10,10,0.1)', padding: '20px', background: '#FAFAFA' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                    {pk === 'ultra' && <Crown size={13} style={{ color: '#F59E0B', flexShrink: 0 }} />}
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#0A0A0A', margin: 0, fontFamily: PJS }}>
                      {PLAN_LABELS[pk]}
                    </p>
                  </div>
                  <p style={{ fontSize: 22, fontWeight: 700, color: '#0A0A0A', margin: '0 0 16px', fontFamily: PJS }}>
                    {PLAN_PRICES[pk]}
                    <span style={{ fontSize: 12, fontWeight: 400, color: 'rgba(10,10,10,0.4)' }}> one-time</span>
                  </p>
                  <button
                    onClick={() => handleCheckout(pk)}
                    disabled={!!checkoutLoading}
                    style={{
                      width: '100%', padding: '9px 0',
                      background: pk === 'ultra' ? 'linear-gradient(135deg, #FBBF24, #F59E0B)' : '#0A0A0A',
                      color: '#FFFFFF', border: 'none',
                      cursor: checkoutLoading ? 'not-allowed' : 'pointer',
                      fontSize: 12, fontWeight: 700, fontFamily: PJS, borderRadius: 999,
                      opacity: checkoutLoading && checkoutLoading !== pk ? 0.5 : 1,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      transition: 'opacity 0.15s',
                    }}
                  >
                    {checkoutLoading === pk && (
                      <Loader2 size={13} style={{ animation: 'spin 0.8s linear infinite' }} />
                    )}
                    Upgrade to {PLAN_LABELS[pk]}
                  </button>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.35)', margin: '0 0 28px', fontFamily: PJS }}>{NO_UPSELLS}</p>
          </>
        )}

        {/* Upgrade to Ultra (Pro users) */}
        {plan === 'pro' && (
          <>
            <div style={{ border: '1px solid rgba(10,10,10,0.1)', padding: '20px', background: '#FAFAFA', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                <Crown size={13} style={{ color: '#F59E0B', flexShrink: 0 }} />
                <p style={{ fontSize: 14, fontWeight: 700, color: '#0A0A0A', margin: 0, fontFamily: PJS }}>Ultra</p>
              </div>
              <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.55)', margin: '0 0 6px', fontFamily: PJS, lineHeight: 1.5 }}>
                Add the digital suite: wedding website, invitations, online RSVP, and premium themes.
              </p>
              <p style={{ fontSize: 22, fontWeight: 700, color: '#0A0A0A', margin: '0 0 16px', fontFamily: PJS }}>
                $149 <span style={{ fontSize: 12, fontWeight: 400, color: 'rgba(10,10,10,0.4)' }}>one-time</span>
              </p>
              <button
                onClick={() => handleCheckout('ultra')}
                disabled={!!checkoutLoading}
                style={{
                  width: '100%', padding: '9px 0',
                  background: 'linear-gradient(135deg, #FBBF24, #F59E0B)',
                  color: '#FFFFFF', border: 'none',
                  cursor: checkoutLoading ? 'not-allowed' : 'pointer',
                  fontSize: 12, fontWeight: 700, fontFamily: PJS, borderRadius: 999,
                  opacity: checkoutLoading ? 0.5 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  transition: 'opacity 0.15s',
                }}
              >
                {checkoutLoading === 'ultra' && <Loader2 size={13} style={{ animation: 'spin 0.8s linear infinite' }} />}
                Upgrade to Ultra
              </button>
            </div>
            <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.35)', margin: '0 0 28px', fontFamily: PJS }}>{NO_UPSELLS}</p>
          </>
        )}

        {/* On best plan (Ultra users) */}
        {plan === 'ultra' && (
          <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.45)', margin: '0 0 28px', fontFamily: PJS }}>
            You're on our best plan. {NO_UPSELLS}
          </p>
        )}

        {/* Manage billing (paid plans) */}
        {(plan === 'pro' || plan === 'ultra') && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 28 }}>
            <a
              href="mailto:lajay@openinvite.com.au?subject=Billing inquiry"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                padding: '9px 20px', borderRadius: 999,
                background: '#0A0A0A', color: '#FFFFFF',
                fontSize: 12, fontWeight: 700, fontFamily: PJS,
                textDecoration: 'none', transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.opacity = '0.8'; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
            >
              <CreditCard size={13} />
              Manage billing
            </a>

            {user?.stripeCustomerId && (
              <button
                onClick={handlePortal}
                disabled={portalLoading}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 7,
                  padding: '9px 20px', borderRadius: 999,
                  background: 'rgba(10,10,10,0.06)',
                  border: '1px solid rgba(10,10,10,0.12)',
                  color: '#0A0A0A',
                  fontSize: 12, fontWeight: 700, fontFamily: PJS,
                  cursor: portalLoading ? 'not-allowed' : 'pointer',
                  opacity: portalLoading ? 0.6 : 1,
                  transition: 'opacity 0.15s',
                }}
                onMouseEnter={e => { if (!portalLoading) e.currentTarget.style.opacity = '0.7'; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = portalLoading ? '0.6' : '1'; }}
              >
                {portalLoading
                  ? <Loader2 size={13} style={{ animation: 'spin 0.8s linear infinite' }} />
                  : <Receipt size={13} />
                }
                View receipts & billing
              </button>
            )}
          </div>
        )}

        {/* Features list */}
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: 'rgba(10,10,10,0.4)', margin: '0 0 12px', fontFamily: PJS }}>
            {plan === 'free' ? "What's included in your free trial" : `What's included in ${planLabel}`}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(PLAN_FEATURES[plan] || PLAN_FEATURES.free).map((feature, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Check
                  size={13}
                  style={{
                    color: plan === 'ultra' ? '#7c3aed' : plan === 'pro' ? '#E03553' : 'rgba(10,10,10,0.35)',
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: 13, color: '#0A0A0A', fontFamily: PJS }}>{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Hidden admin link — only visible to admin */}
        {user?.email === ADMIN_EMAIL && (
          <div style={{ marginTop: 48, paddingTop: 24, borderTop: '1px solid rgba(10,10,10,0.06)' }}>
            <button
              onClick={() => navigate('/admin')}
              style={{
                background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                fontSize: 11, color: 'rgba(10,10,10,0.3)', fontFamily: PJS,
                textDecoration: 'underline', textDecorationColor: 'rgba(10,10,10,0.2)',
              }}
            >
              Admin dashboard →
            </button>
          </div>
        )}

      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
