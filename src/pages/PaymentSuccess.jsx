import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { track, identify } from '@/lib/analytics';
import { Loader2, Check } from 'lucide-react';

const PJS = "'Plus Jakarta Sans', sans-serif";

// Plan activation is written server-side by api/webhooks/stripe.js on the
// verified checkout.session.completed event — this page never writes the
// plan itself (a client-side write from a URL query param would let anyone
// grant themselves a paid plan for free by just visiting this URL with
// ?plan=ultra). Instead it polls base44.auth.me() until the webhook's write
// shows up, since webhook delivery and this redirect happen asynchronously
// and in no guaranteed order.
const POLL_INTERVAL_MS = 1500;
const MAX_POLLS = 8; // ~12s total — comfortably more than typical webhook latency

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { checkAppState } = useAuth();
  // Query param is a display/expectation hint only ("which plan are we
  // waiting to see confirmed") — never treated as the source of truth.
  const expectedPlan = searchParams.get('plan') === 'ultra' ? 'ultra' : 'pro';
  const [status, setStatus] = useState('confirming'); // 'confirming' | 'done' | 'pending'

  useEffect(() => {
    let cancelled = false;

    (async () => {
      for (let attempt = 0; attempt < MAX_POLLS; attempt++) {
        if (cancelled) return;
        try {
          const me = await base44.auth.me();
          if (me?.plan === expectedPlan) {
            // Refresh the app-wide auth context too, so Layout/sidebar/
            // gating reflect the new plan immediately — no hard refresh
            // needed when the user navigates on from here.
            await checkAppState();
            if (cancelled) return;
            track('purchase_completed', {
              plan: me.plan,
              amount: me.plan === 'ultra' ? 149 : 79,
              currency: 'AUD',
            });
            if (me?.id) identify(me.id, { email: me.email, name: me.full_name });
            setStatus('done');
            return;
          }
        } catch {
          // base44.auth.me() failing transiently mid-poll isn't fatal —
          // just try again next tick.
        }
        await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
      }
      if (!cancelled) setStatus('pending');
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const planLabel = expectedPlan === 'ultra' ? 'Ultra' : 'Pro';

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0A0A0A',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        fontFamily: PJS,
      }}
    >
      <div style={{ width: '100%', maxWidth: 480, textAlign: 'center' }}>
        {/* Logo */}
        <img
          src="https://static.wixstatic.com/media/d2df22_ed803ca7c6de491a90af0df6d06a8e54~mv2.png"
          alt="Openinvite"
          style={{ height: 20, width: 'auto', objectFit: 'contain', filter: 'brightness(0) invert(1)', marginBottom: 64 }}
        />

        {status === 'confirming' && (
          <>
            <Loader2
              size={20}
              style={{ color: 'rgba(255,255,255,0.3)', animation: 'spin 0.8s linear infinite', margin: '0 auto 24px' }}
            />
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', margin: 0, fontFamily: PJS }}>
              Confirming your payment…
            </p>
          </>
        )}

        {status === 'pending' && (
          <>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em', lineHeight: 1.15, margin: '0 0 16px', fontFamily: PJS }}>
              Almost there.
            </h1>
            <p style={{ fontSize: 15, lineHeight: 1.65, color: 'rgba(255,255,255,0.5)', margin: '0 0 40px', fontFamily: PJS }}>
              Your payment went through, but it's taking a little longer than usual to activate your account. This
              can take a minute — try refreshing, or check your account page shortly. If it's still not showing up,
              contact us and we'll sort it out.
            </p>
            <button
              onClick={() => navigate('/account')}
              style={{
                background: '#FFFFFF', color: '#0A0A0A', border: 'none', borderRadius: 999,
                padding: '14px 40px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: PJS,
              }}
            >
              Go to my account
            </button>
          </>
        )}

        {status === 'done' && (
          <>
            {/* Check mark */}
            <div
              style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'rgba(34,197,94,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 32px',
              }}
            >
              <Check size={24} style={{ color: '#22C55E' }} />
            </div>

            <h1
              style={{
                fontSize: 36, fontWeight: 800, color: '#FFFFFF',
                letterSpacing: '-0.03em', lineHeight: 1.1,
                margin: '0 0 16px', fontFamily: PJS,
              }}
            >
              You're all set.
            </h1>

            <p
              style={{
                fontSize: 16, lineHeight: 1.65,
                color: 'rgba(255,255,255,0.5)',
                margin: '0 0 48px', fontFamily: PJS,
              }}
            >
              Welcome to Openinvite {planLabel}. Your account has been upgraded
              and everything is ready for you.
            </p>

            <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', marginBottom: 40 }} />

            <button
              onClick={() => navigate('/Dashboard')}
              style={{
                background: '#FFFFFF',
                color: '#0A0A0A',
                border: 'none',
                borderRadius: 999,
                padding: '14px 40px',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: PJS,
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
            >
              Go to dashboard
            </button>
          </>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
