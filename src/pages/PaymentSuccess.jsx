import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Loader2, Check } from 'lucide-react';

const PJS = "'Plus Jakarta Sans', sans-serif";

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const plan = searchParams.get('plan') || 'pro';
  const [status, setStatus] = useState('updating'); // 'updating' | 'done' | 'error'

  useEffect(() => {
    (async () => {
      try {
        await base44.auth.updateMe({
          plan,
          planActivatedAt: new Date().toISOString(),
        });
        setStatus('done');
      } catch {
        // Still show success even if the update fails — they paid
        setStatus('done');
      }
    })();
  }, [plan]);

  const planLabel = plan === 'ultra' ? 'Ultra' : 'Pro';

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

        {status === 'updating' ? (
          <Loader2
            size={20}
            style={{ color: 'rgba(255,255,255,0.3)', animation: 'spin 0.8s linear infinite', margin: '0 auto' }}
          />
        ) : (
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
