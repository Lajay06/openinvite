/**
 * src/pages/professional/ProfessionalStart.jsx
 *
 * /professional/start: a new account picks its path. A professional writes
 * accountType "professional" on the account (a new User field the owner
 * adds); a couple goes to the couple's sign-up as today. One email cannot be
 * both, and the page says so.
 *
 * Until STORE_LIVE, nothing is written: the button opens the app on test data.
 */
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { STORE_LIVE } from '@/lib/professionalStore';
import { isCoupleAccount, ONE_EMAIL_LINE } from '@/lib/professionalAccess';
import { ROUTES, PRODUCT_NAME } from '@/lib/professionalBrand';
import { ProLogo } from '@/components/professional/ProShell';
import { PRO, PJS, s } from '@/components/professional/proTheme';
import { TYPE } from '@/styles/typeScale';

const DID_NOT_GO_THROUGH = 'That did not go through. Try again in a moment.';

export default function ProfessionalStart() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const couple = isCoupleAccount(user) || user?.accountType === 'couple';

  const choosePro = async () => {
    setError('');
    if (!STORE_LIVE) { nav(ROUTES.app); return; }
    if (!user) { nav(`/login?next=${encodeURIComponent(ROUTES.start)}`); return; }
    setBusy(true);
    try {
      await base44.auth.updateMe({ accountType: 'professional' });
      nav(ROUTES.app);
    } catch {
      setError(DID_NOT_GO_THROUGH);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: PRO.bar, fontFamily: PJS, display: 'flex', flexDirection: 'column' }}>
      <header style={{ height: PRO.barHeight, display: 'flex', alignItems: 'center', padding: '0 16px' }}><ProLogo /></header>
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div style={{ background: '#FFFFFF', maxWidth: 520, width: '100%', padding: 28, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: PRO.text }}>Which Openinvite is this account for?</h1>
          {couple ? (
            <>
              <p style={{ ...s.body, margin: 0, lineHeight: 1.5 }}>{ONE_EMAIL_LINE}</p>
              <Link to="/DailyUpdate" style={{ ...s.btnSecondary, alignSelf: 'flex-start', textDecoration: 'none' }}>Back to your wedding</Link>
            </>
          ) : (
            <>
              <button type="button" onClick={choosePro} disabled={busy} style={{ ...s.card, textAlign: 'left', cursor: 'pointer', fontFamily: PJS, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: TYPE.input, fontWeight: 600, color: PRO.text }}>I plan weddings for clients</span>
                <span style={s.secondary}>{PRODUCT_NAME}: every event you run, the run sheets, vendors, payments and your team. 14 days free, no card.</span>
              </button>
              <Link to="/choose-plan" style={{ ...s.card, textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: TYPE.input, fontWeight: 600, color: PRO.text }}>We&apos;re getting married</span>
                <span style={s.secondary}>Openinvite for couples: invitations, replies, the guest list and the whole plan.</span>
              </Link>
              <p style={{ ...s.secondary, margin: 0 }}>One email can&apos;t be both. A planner who is also getting married uses a second email for one of them.</p>
              {error && <p role="alert" style={{ margin: 0, fontSize: TYPE.secondary, color: '#991b1b' }}>{error}</p>}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
