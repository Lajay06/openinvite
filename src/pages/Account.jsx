import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Check, CreditCard, Crown, Receipt, AlertTriangle } from 'lucide-react';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import AvaButton from '@/components/shared/AvaButton';
import CurrencyModal from '@/components/layout/CurrencyModal';
import { useAuth } from '@/lib/AuthContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { base44 } from '@/api/base44Client';
import toast from 'react-hot-toast';

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

// Same env vars (+ fallback literals) as src/pages/Pricing.jsx / PlanSelection.jsx —
// keeping one source per plan avoids a hardcoded price ID silently drifting
// from whatever VITE_STRIPE_*_PRICE_ID is actually configured (e.g. test vs
// live mode), which would send a priceId the server-side resolver rejects.
const PRICE_IDS = {
  pro: import.meta.env.VITE_STRIPE_PRO_PRICE_ID || 'price_1TavqVJ4ROjxYxkaoCOUvzS8',
  ultra: import.meta.env.VITE_STRIPE_ULTRA_PRICE_ID || 'price_1TavrJJ4ROjxYxkaM6oOwBZz',
};

// $79/$149 are the real one-time USD amounts Stripe actually charges (fixed
// Price objects — Stripe Checkout doesn't support converting a single Price
// to the viewer's currency on the fly). formatCurrency() below only affects
// the *displayed* reference figure; the checkout session always charges USD.
const PLAN_PRICES_USD = { pro: 79, ultra: 149 };

const PLAN_LABELS = { free: 'Free trial', pro: 'Pro', ultra: 'Ultra' };
const NO_UPSELLS = 'No upsells, ever. Pay once, plan your entire wedding.';

const ADMIN_EMAIL = 'lajay@openinvite.com.au';

const TABS = [
  { id: 'settings', label: 'Settings' },
  { id: 'billing', label: 'Billing' },
  { id: 'security', label: 'Security' },
];

const labelStyle = {
  fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
  color: 'rgba(10,10,10,0.6)', fontFamily: PJS, display: 'block', marginBottom: 6,
};

const sectionTitleStyle = {
  fontSize: 13, fontWeight: 700, color: '#0A0A0A', margin: '0 0 20px', fontFamily: PJS,
};

function TempUnitToggle({ value, onChange, saving }) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {['C', 'F'].map(u => (
        <button
          key={u}
          onClick={() => onChange(u)}
          disabled={saving}
          style={{
            padding: '7px 18px', borderRadius: 999, fontSize: 12, fontWeight: 700, fontFamily: PJS,
            cursor: saving ? 'not-allowed' : 'pointer',
            border: `1.5px solid ${value === u ? '#0A0A0A' : 'rgba(10,10,10,0.15)'}`,
            background: value === u ? '#0A0A0A' : 'none',
            color: value === u ? '#FFFFFF' : 'rgba(10,10,10,0.5)',
          }}
        >
          °{u}
        </button>
      ))}
    </div>
  );
}

function SettingsTab({ user, refreshUser }) {
  const { currencyCode } = useCurrency();
  const [name, setName] = useState(user?.full_name || '');
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [currencyModalOpen, setCurrencyModalOpen] = useState(false);
  const [tempUnit, setTempUnit] = useState(user?.tempUnit || 'C');
  const [savingUnit, setSavingUnit] = useState(false);

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
      refreshUser?.();
    } catch {
      setSaveStatus('idle');
      toast.error('Failed to save name');
    }
    setSaving(false);
  };

  const handleTempUnitChange = async (unit) => {
    setTempUnit(unit);
    setSavingUnit(true);
    try {
      await base44.auth.updateMe({ tempUnit: unit });
      try {
        const stored = JSON.parse(localStorage.getItem('oi_user') || '{}');
        localStorage.setItem('oi_user', JSON.stringify({ ...stored, tempUnit: unit }));
      } catch {}
      toast.success(`Temperature now shown in °${unit}`);
      refreshUser?.();
    } catch {
      toast.error('Failed to save — please try again');
      setTempUnit(user?.tempUnit || 'C');
    }
    setSavingUnit(false);
  };

  return (
    <div>
      {/* Avatar + name/email */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
        <div style={{
          width: 52, height: 52, borderRadius: '50%',
          background: 'linear-gradient(135deg, #ec4899, #9333ea)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: 18, fontWeight: 700, fontFamily: PJS, flexShrink: 0,
        }}>
          {(user?.full_name || user?.email || 'U').split(/\s+/).filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase() || 'U'}
        </div>
        <div>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#0A0A0A', margin: '0 0 2px', fontFamily: PJS }}>
            {user?.full_name || 'Your account'}
          </p>
          <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.6)', margin: 0, fontFamily: PJS }}>
            {user?.email || ''}
          </p>
        </div>
        {saveStatus === 'saving' && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, marginLeft: 'auto' }}>
            <Loader2 size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> Saving…
          </span>
        )}
        {saveStatus === 'saved' && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#22C55E', fontWeight: 600, fontFamily: PJS, marginLeft: 'auto' }}>
            <Check size={13} /> Saved
          </span>
        )}
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
              background: '#0A0A0A', color: '#FFFFFF', border: 'none',
              cursor: saving || !name.trim() ? 'not-allowed' : 'pointer',
              fontSize: 12, fontWeight: 700, fontFamily: PJS,
              padding: '7px 16px', borderRadius: 999, flexShrink: 0,
              opacity: saving || !name.trim() ? 0.4 : 1, marginBottom: 1,
            }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {/* Email field (read-only) */}
      <div style={{ marginBottom: 32 }}>
        <label style={labelStyle}>Email address</label>
        <input
          type="email"
          value={user?.email || ''}
          readOnly
          className="input-editorial"
          style={{ color: 'rgba(10,10,10,0.35)', cursor: 'not-allowed' }}
        />
        <p style={{ fontSize: 11, color: 'rgba(10,10,10,0.6)', margin: '6px 0 0', fontFamily: PJS }}>
          Contact support to change your email address.
        </p>
      </div>

      <div style={{ height: 1, background: 'rgba(10,10,10,0.08)', margin: '32px 0' }} />

      {/* Preferences */}
      <p style={sectionTitleStyle}>Preferences</p>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A', margin: '0 0 2px', fontFamily: PJS }}>Currency</p>
          <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.6)', margin: 0, fontFamily: PJS }}>Used across your budget and pricing</p>
        </div>
        <button
          onClick={() => setCurrencyModalOpen(true)}
          style={{ padding: '7px 16px', borderRadius: 999, fontSize: 12, fontWeight: 700, fontFamily: PJS, cursor: 'pointer', border: '1.5px solid rgba(10,10,10,0.15)', background: 'none', color: '#0A0A0A' }}
        >
          {currencyCode} →
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A', margin: '0 0 2px', fontFamily: PJS }}>Temperature unit</p>
          <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.6)', margin: 0, fontFamily: PJS }}>Used for your wedding-day weather</p>
        </div>
        <TempUnitToggle value={tempUnit} onChange={handleTempUnitChange} saving={savingUnit} />
      </div>

      <div style={{ padding: '14px 16px', background: 'rgba(10,10,10,0.03)', marginTop: 8 }}>
        <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.45)', margin: 0, fontFamily: PJS, lineHeight: 1.6 }}>
          Multi-language support isn't built yet — the app is English-only for now. A language selector will return once translations ship.
        </p>
      </div>

      {currencyModalOpen && (
        <CurrencyModal onClose={() => setCurrencyModalOpen(false)} />
      )}
    </div>
  );
}

function BillingTab({ user }) {
  const { formatCurrency } = useCurrency();
  const [checkoutLoading, setCheckoutLoading] = useState(null);
  const [portalLoading, setPortalLoading] = useState(false);

  const plan = user?.plan || 'free';
  const planLabel = PLAN_LABELS[plan] || 'Free trial';
  const planActivatedAt = user?.planActivatedAt
    ? new Date(user.planActivatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  const handlePortal = async () => {
    setPortalLoading(true);
    try {
      const token = localStorage.getItem('base44_access_token');
      const res = await fetch('/api/create-portal-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
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
        body: JSON.stringify({ priceId: PRICE_IDS[planKey], userId: user?.id || '', userEmail: user?.email || '' }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {}
    setCheckoutLoading(null);
  };

  return (
    <div>
      <p style={sectionTitleStyle}>Plan & billing</p>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <span style={{
          fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', fontFamily: PJS,
          color: plan === 'free' ? 'rgba(10,10,10,0.55)' : '#FFFFFF',
          background: plan === 'ultra' ? 'linear-gradient(135deg, #FBBF24, #F59E0B)' : plan === 'pro' ? '#0A0A0A' : 'rgba(10,10,10,0.08)',
          padding: '4px 12px', borderRadius: 999,
        }}>
          {planLabel}
        </span>
        {planActivatedAt && (
          <span style={{ fontSize: 12, color: 'rgba(10,10,10,0.6)', fontFamily: PJS }}>Active since {planActivatedAt}</span>
        )}
      </div>

      {plan === 'free' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" style={{ marginBottom: 12 }}>
            {(['pro', 'ultra']).map(pk => (
              <div key={pk} style={{ border: '1px solid rgba(10,10,10,0.1)', padding: '20px', background: '#FAFAFA' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                  {pk === 'ultra' && <Crown size={13} style={{ color: '#F59E0B', flexShrink: 0 }} />}
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#0A0A0A', margin: 0, fontFamily: PJS }}>{PLAN_LABELS[pk]}</p>
                </div>
                <p style={{ fontSize: 22, fontWeight: 700, color: '#0A0A0A', margin: '0 0 16px', fontFamily: PJS }}>
                  {formatCurrency(PLAN_PRICES_USD[pk])}
                  <span style={{ fontSize: 12, fontWeight: 400, color: 'rgba(10,10,10,0.6)' }}> one-time (USD {PLAN_PRICES_USD[pk]} charged)</span>
                </p>
                <button
                  onClick={() => handleCheckout(pk)}
                  disabled={!!checkoutLoading}
                  style={{
                    width: '100%', padding: '9px 0',
                    background: pk === 'ultra' ? 'linear-gradient(135deg, #FBBF24, #F59E0B)' : '#0A0A0A',
                    color: '#FFFFFF', border: 'none', cursor: checkoutLoading ? 'not-allowed' : 'pointer',
                    fontSize: 12, fontWeight: 700, fontFamily: PJS, borderRadius: 999,
                    opacity: checkoutLoading && checkoutLoading !== pk ? 0.5 : 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}
                >
                  {checkoutLoading === pk && <Loader2 size={13} style={{ animation: 'spin 0.8s linear infinite' }} />}
                  Upgrade to {PLAN_LABELS[pk]}
                </button>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.35)', margin: '0 0 28px', fontFamily: PJS }}>{NO_UPSELLS}</p>
        </>
      )}

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
              {formatCurrency(PLAN_PRICES_USD.ultra)} <span style={{ fontSize: 12, fontWeight: 400, color: 'rgba(10,10,10,0.6)' }}>one-time (USD {PLAN_PRICES_USD.ultra} charged)</span>
            </p>
            <button
              onClick={() => handleCheckout('ultra')}
              disabled={!!checkoutLoading}
              style={{
                width: '100%', padding: '9px 0', background: 'linear-gradient(135deg, #FBBF24, #F59E0B)',
                color: '#FFFFFF', border: 'none', cursor: checkoutLoading ? 'not-allowed' : 'pointer',
                fontSize: 12, fontWeight: 700, fontFamily: PJS, borderRadius: 999,
                opacity: checkoutLoading ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              {checkoutLoading === 'ultra' && <Loader2 size={13} style={{ animation: 'spin 0.8s linear infinite' }} />}
              Upgrade to Ultra
            </button>
          </div>
          <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.35)', margin: '0 0 28px', fontFamily: PJS }}>{NO_UPSELLS}</p>
        </>
      )}

      {plan === 'ultra' && (
        <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.45)', margin: '0 0 28px', fontFamily: PJS }}>
          You're on our best plan. {NO_UPSELLS}
        </p>
      )}

      {(plan === 'pro' || plan === 'ultra') && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 28 }}>
          <a
            href="mailto:lajay@openinvite.com.au?subject=Billing inquiry"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 20px', borderRadius: 999, background: '#0A0A0A', color: '#FFFFFF', fontSize: 12, fontWeight: 700, fontFamily: PJS, textDecoration: 'none' }}
          >
            <CreditCard size={13} />
            Manage billing
          </a>

          {user?.stripeCustomerId && (
            <button
              onClick={handlePortal}
              disabled={portalLoading}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 20px', borderRadius: 999,
                background: 'rgba(10,10,10,0.06)', border: '1px solid rgba(10,10,10,0.12)', color: '#0A0A0A',
                fontSize: 12, fontWeight: 700, fontFamily: PJS, cursor: portalLoading ? 'not-allowed' : 'pointer',
                opacity: portalLoading ? 0.6 : 1,
              }}
            >
              {portalLoading ? <Loader2 size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Receipt size={13} />}
              View receipts & billing
            </button>
          )}
        </div>
      )}

      <div>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: 'rgba(10,10,10,0.6)', margin: '0 0 12px', fontFamily: PJS }}>
          {plan === 'free' ? "What's included in your free trial" : `What's included in ${planLabel}`}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(PLAN_FEATURES[plan] || PLAN_FEATURES.free).map((feature, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Check size={13} style={{ color: plan === 'ultra' ? '#7c3aed' : plan === 'pro' ? '#E03553' : 'rgba(10,10,10,0.35)', flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: '#0A0A0A', fontFamily: PJS }}>{feature}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SecurityTab({ user }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deletionRequested, setDeletionRequested] = useState(!!user?.deletionRequestedAt);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation don\'t match.');
      return;
    }
    setChangingPassword(true);
    try {
      await base44.auth.changePassword({ userId: user.id, currentPassword, newPassword });
      toast.success('Password updated.');
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (err) {
      setPasswordError(
        err?.message?.toLowerCase().includes('password')
          ? err.message
          : "Couldn't update your password. If you signed in with Google, Microsoft, Facebook, or Apple, you don't have a password here to change — manage sign-in through that provider instead."
      );
    }
    setChangingPassword(false);
  };

  const handleDeleteRequest = async () => {
    setDeleting(true);
    try {
      await base44.integrations.Core.SendEmail({
        to: 'customercare@openinvite.com.au',
        subject: 'Account deletion request',
        body: `Account deletion requested in-app.\n\nEmail: ${user?.email || 'unknown'}\nName: ${user?.full_name || 'unknown'}\nUser ID: ${user?.id || 'unknown'}\n\nPlease verify and process per the data deletion policy (openinvite.com.au/data-deletion).`,
      });
      await base44.auth.updateMe({ deletionRequestedAt: new Date().toISOString() });
      setDeletionRequested(true);
      setDeleteOpen(false);
      toast.success('Deletion request received — we\'ll confirm by email within 7 business days.');
    } catch {
      toast.error('Something went wrong — please email customercare@openinvite.com.au directly.');
    }
    setDeleting(false);
  };

  return (
    <div>
      <p style={sectionTitleStyle}>Update password</p>
      <form onSubmit={handleChangePassword} style={{ marginBottom: 40, maxWidth: 420 }}>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Current password</label>
          <input type="password" className="input-editorial" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required autoComplete="current-password" />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>New password</label>
          <input type="password" className="input-editorial" value={newPassword} onChange={e => setNewPassword(e.target.value)} required autoComplete="new-password" minLength={8} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Confirm new password</label>
          <input type="password" className="input-editorial" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required autoComplete="new-password" minLength={8} />
        </div>
        {passwordError && (
          <p style={{ fontSize: 12, color: '#E03553', margin: '0 0 12px', fontFamily: PJS, lineHeight: 1.6 }}>{passwordError}</p>
        )}
        <button
          type="submit"
          disabled={changingPassword}
          style={{ background: '#0A0A0A', color: '#FFFFFF', border: 'none', cursor: changingPassword ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 700, fontFamily: PJS, padding: '9px 20px', borderRadius: 999, opacity: changingPassword ? 0.6 : 1 }}
        >
          {changingPassword ? 'Updating…' : 'Update password'}
        </button>
        <p style={{ fontSize: 11, color: 'rgba(10,10,10,0.35)', margin: '10px 0 0', fontFamily: PJS, lineHeight: 1.6 }}>
          Signed in with Google, Microsoft, Facebook, or Apple? You don't have a password to manage here — sign-in security is handled by that provider.
        </p>
      </form>

      <div style={{ height: 1, background: 'rgba(10,10,10,0.08)', margin: '32px 0' }} />

      <p style={sectionTitleStyle}>Delete account</p>
      {deletionRequested ? (
        <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.55)', fontFamily: PJS, lineHeight: 1.7, maxWidth: 480 }}>
          Deletion requested. We verify every request by email before removing anything — you'll hear from us at <strong>{user?.email}</strong> within 7 business days.
        </p>
      ) : (
        <>
          <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.55)', fontFamily: PJS, lineHeight: 1.7, maxWidth: 480, marginBottom: 16 }}>
            We can't delete your account instantly from here — deletion is verified by our team first, per our{' '}
            <a href="/data-deletion" target="_blank" rel="noreferrer" style={{ color: '#E03553' }}>data deletion policy</a>.
            Submitting a request below emails customercare@openinvite.com.au on your behalf; we'll confirm and process it within 7 business days.
          </p>
          <button
            onClick={() => setDeleteOpen(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 20px', borderRadius: 999, background: 'none', border: '1.5px solid #E03553', color: '#E03553', fontSize: 12, fontWeight: 700, fontFamily: PJS, cursor: 'pointer' }}
          >
            <AlertTriangle size={13} />
            Request account deletion
          </button>
        </>
      )}

      {deleteOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999] p-6" onClick={() => setDeleteOpen(false)}>
          <div
            style={{ background: '#FFFFFF', border: '1px solid #EEEEEE', width: '100%', maxWidth: 440 }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ padding: '28px 28px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <AlertTriangle size={18} style={{ color: '#E03553' }} />
                <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0A0A0A', margin: 0, fontFamily: PJS }}>Request account deletion</h2>
              </div>
              <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, lineHeight: 1.7, margin: '0 0 20px' }}>
                This submits a deletion request for <strong>{user?.email}</strong> — your wedding details, guest list, budget, vendors, and website will be permanently removed once we verify it's you. This can't be undone after processing.
              </p>
              <label style={labelStyle}>Type DELETE to confirm</label>
              <input
                className="input-editorial"
                value={deleteConfirmText}
                onChange={e => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                style={{ marginBottom: 20 }}
              />
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => setDeleteOpen(false)}
                  style={{ flex: 1, padding: '10px 0', borderRadius: 999, fontSize: 12, fontWeight: 700, fontFamily: PJS, cursor: 'pointer', border: '1.5px solid rgba(10,10,10,0.15)', background: 'none', color: '#0A0A0A' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteRequest}
                  disabled={deleteConfirmText !== 'DELETE' || deleting}
                  style={{
                    flex: 1, padding: '10px 0', borderRadius: 999, fontSize: 12, fontWeight: 700, fontFamily: PJS,
                    cursor: deleteConfirmText !== 'DELETE' || deleting ? 'not-allowed' : 'pointer',
                    border: 'none', background: '#E03553', color: '#FFFFFF',
                    opacity: deleteConfirmText !== 'DELETE' || deleting ? 0.4 : 1,
                  }}
                >
                  {deleting ? 'Sending…' : 'Submit request'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AccountPage() {
  const navigate = useNavigate();
  const { user, checkAppState } = useAuth();
  const [tab, setTab] = useState('settings');

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF', fontFamily: PJS }}>
      <DashboardPageHeader title="Account" subtitle="Manage your profile, plan, and security" />

      <div className="flex flex-wrap items-center justify-between gap-y-2 px-4 md:px-8 py-4" style={{ borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
        <AvaButton label="Ask Ava about your account or plan" />
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid rgba(10,10,10,0.08)', padding: '0 32px' }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '14px 18px', fontSize: 13, fontWeight: tab === t.id ? 700 : 500, fontFamily: PJS,
              cursor: 'pointer', border: 'none', background: 'none',
              color: tab === t.id ? '#0A0A0A' : 'rgba(10,10,10,0.45)',
              borderBottom: tab === t.id ? '2px solid #0A0A0A' : '2px solid transparent',
              marginBottom: -1,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ padding: '32px 32px 48px', maxWidth: 720 }}>
        {tab === 'settings' && <SettingsTab user={user} refreshUser={checkAppState} />}
        {tab === 'billing' && <BillingTab user={user} />}
        {tab === 'security' && <SecurityTab user={user} />}

        {/* Hidden admin link — only visible to admin */}
        {user?.email === ADMIN_EMAIL && (
          <div style={{ marginTop: 48, paddingTop: 24, borderTop: '1px solid rgba(10,10,10,0.06)' }}>
            <button
              onClick={() => navigate('/admin')}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 11, color: 'rgba(10,10,10,0.3)', fontFamily: PJS, textDecoration: 'underline', textDecorationColor: 'rgba(10,10,10,0.2)' }}
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
