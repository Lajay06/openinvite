import React, { useCallback, useContext, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import WelcomeScreen from './WelcomeScreen';
import LoginScreen from './LoginScreen';
import PrimingScreen from './PrimingScreen';
import { BottomSheet, PillButton } from '../../ui';
import { isNative, openExternal, prefGet, prefSet, requestNotificationPermission, PROD_ORIGIN, APP_SCHEME } from '../../native';
import { ShellContext } from '../../shell/MobileShell';
import { sendTestNotifications } from '../../notifications/testNotification';

export const WELCOME_PREF = 'welcome_seen';
export const PRIMING_PREF = 'notif_priming';

/**
 * /m/welcome: shown once. "Get started" goes to sign up (the website, when
 * native), "I already have an account" to /m/login.
 */
export function WelcomeContainer() {
  const navigate = useNavigate();
  const done = async (to) => { await prefSet(WELCOME_PREF, '1'); navigate(to, { replace: true }); };
  return <WelcomeScreen onStart={() => done('/m/login?signup=1')} onLogin={() => done('/m/login')} />;
}

/**
 * /m/login: the existing auth client, exactly as src/pages/Login.jsx uses
 * it. Email and password is an XHR and works everywhere. Providers do a
 * full-page redirect to base44.app with a from_url; natively that from_url
 * is the openinvite:// scheme so the token comes back through the
 * deep-link handler (native.ts routeForDeepLink). The web login page is
 * untouched.
 */
export function LoginContainer() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { isAuthenticated, isLoadingAuth } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [signup, setSignup] = useState(params.get('signup') === '1');
  const next = params.get('next') && params.get('next').startsWith('/m') ? params.get('next') : '/m';

  useEffect(() => { if (!isLoadingAuth && isAuthenticated) window.location.replace(next); }, [isLoadingAuth, isAuthenticated, next]);

  const submit = async ({ email, password }) => {
    setBusy(true); setError('');
    try {
      await base44.auth.loginViaEmailPassword(email, password);
      // Full reload, as Login.jsx does: AuthContext only checks the session on mount.
      window.location.replace(next);
    } catch (e) {
      setError(e?.message || 'That email and password did not match. Try again.');
      setBusy(false);
    }
  };
  const provider = (key) => {
    // Natively the callback must come back into the app, so from_url is the
    // scheme. The web build keeps the same /choose-plan landing as Login.jsx.
    const fromUrl = isNative() ? `${APP_SCHEME}://auth?next=${encodeURIComponent(next)}` : `/choose-plan?next=${encodeURIComponent(next)}`;
    base44.auth.loginWithProvider(key, fromUrl);
  };
  return (
    <>
      <LoginScreen
        onSubmit={submit}
        onProvider={provider}
        providers={[{ key: 'google', label: 'Continue with Google' }, { key: 'apple', label: 'Continue with Apple' }]}
        onForgot={() => (isNative() ? openExternal(`${PROD_ORIGIN}/forgot-password`) : navigate('/forgot-password'))}
        onSignUp={() => setSignup(true)}
        onBack={() => navigate('/m/welcome')}
        busy={busy}
        error={error}
      />
      <BottomSheet open={signup} onClose={() => setSignup(false)} title="Create an account">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p className="oi-m-body">Accounts are created on the Openinvite website, where you also choose a plan. It takes a minute, and then you sign in here.</p>
          <PillButton variant="primary" block onClick={() => (isNative() ? openExternal(`${PROD_ORIGIN}/register`) : navigate('/register'))}>Open the website</PillButton>
          <PillButton variant="ghost" block onClick={() => setSignup(false)}>Not now</PillButton>
        </div>
      </BottomSheet>
    </>
  );
}

/**
 * Whether the priming screen should show, and how it is closed.
 *
 * TWO BUGS LIVED HERE. The gate read the pref ONCE, on mount, and the
 * screen wrote it with prefSet and navigated away — so the gate still said
 * "show", the redirect in MobileApp fired again, and both buttons looked
 * dead. `record()` is now the only way the screen finishes, and it moves
 * this state as well as the stored value.
 *
 * And the ask itself has to be TRUE. It says "your first reply is in", so
 * it may only appear when a reply really is in: a feed that loaded every
 * one of its sources (`complete`), carrying an rsvp item. A couple whose
 * guest list had not loaded saw the ask over a Replies count of 0, off the
 * one source that had.
 */
export function usePrimingGate(notifications) {
  const [seen, setSeen] = useState(true);
  useEffect(() => { prefGet(PRIMING_PREF).then((v) => setSeen(!!v)); }, []);
  const record = useCallback(async (choice) => {
    setSeen(true);
    await prefSet(PRIMING_PREF, choice);
  }, []);
  const hasReply = !!notifications?.complete && (notifications?.items || []).some((i) => i.type.startsWith('rsvp_'));
  return { show: !seen && hasReply, record };
}

/**
 * /m/priming: records the choice locally and, natively, asks the system
 * (goal 7: local notifications carry the test notification; real push is
 * still to come). With `?test=1` (the Account row in review builds) the
 * same screen and prompt lead to three test notifications, then back to
 * Account.
 */
export function PrimingContainer({ onDone, onChoice }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { base, notifications } = useContext(ShellContext);
  const [recorded, setRecorded] = useState(params.get('state') === 'recorded');
  const [busy, setBusy] = useState(false);
  const test = params.get('test') === '1';
  const home = () => (onDone ? onDone() : navigate(base, { replace: true }));
  /**
   * BOTH BUTTONS RECORD AND LEAVE. The choice is written first — through
   * the gate's own `record` where it owns the state, so the screen cannot
   * be shown again the moment it navigates — and only then does "Turn on"
   * ask the system. A refused system prompt is still a recorded choice:
   * the couple answered, and the screen has no business asking twice.
   */
  const finish = async (choice) => {
    if (busy) return;
    setBusy(true);
    try {
      if (onChoice) await onChoice(choice); else await prefSet(PRIMING_PREF, choice);
    } catch { /* a device that cannot store the choice still gets past this screen */ }
    if (choice !== 'on') { if (test) navigate(`${base}/account`, { replace: true }); else home(); return; }
    const permission = await requestNotificationPermission();
    if (!test) {
      if (permission === 'denied') { toast('Notifications are off for Openinvite in Settings.'); home(); return; }
      setRecorded(true); setTimeout(home, 1800); return;
    }
    if (permission === 'denied') toast.error('Notifications are off for Openinvite in Settings.');
    else if (permission === 'unavailable') toast('Test notifications need the phone app.');
    else if (await sendTestNotifications(base, notifications?.items || [])) toast.success('Three are on their way. Lock your phone.');
    else toast.error('Could not schedule them.');
    navigate(`${base}/account`, { replace: true });
  };
  return <PrimingScreen onTurnOn={() => finish('on')} onNotNow={() => finish('later')} recorded={recorded} busy={busy} />;
}
