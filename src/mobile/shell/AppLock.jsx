import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Lock } from 'lucide-react';
import { PillButton, SmartImage } from '../ui';
import { isNative, biometricUnlock, biometricsAvailable, onAppStateChange, prefGet, prefSet } from '../native';
import { imageUrl } from '../images';

export const LOCK_PREF = 'app_lock';
const BACKGROUND_GRACE_MS = 5 * 60 * 1000;

/** Reads and writes the "Require Face ID to open" choice. */
export function useAppLockSetting() {
  const [on, setOn] = useState(false);
  const [info, setInfo] = useState({ available: false, kind: '' });
  useEffect(() => { prefGet(LOCK_PREF).then((v) => setOn(v === '1')); biometricsAvailable().then(setInfo); }, []);
  const set = async (v) => {
    if (v) { const ok = await biometricUnlock('Confirm to turn on the app lock'); if (!ok) return; }
    setOn(v);
    await prefSet(LOCK_PREF, v ? '1' : '0');
  };
  return { on, set, ...info };
}

/**
 * A branded lock screen over the shell: shown on cold start when the lock
 * is on, and again after five minutes in the background. Unlocks with
 * biometrics, device passcode as fallback. Web and preview: never shown
 * unless `forced` (the preview uses that to render it).
 */
export default function AppLock({ children, forced = false, photo }) {
  const [locked, setLocked] = useState(forced);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const hiddenAt = useRef(null);
  const enabled = useRef(false);

  const tryUnlock = useCallback(async () => {
    if (forced) return;
    setBusy(true); setFailed(false);
    const ok = await biometricUnlock('Unlock Openinvite');
    setBusy(false);
    if (ok) setLocked(false); else setFailed(true);
  }, [forced]);

  useEffect(() => {
    if (forced || !isNative()) return undefined;
    let dispose = () => {};
    prefGet(LOCK_PREF).then((v) => {
      enabled.current = v === '1';
      if (enabled.current) { setLocked(true); tryUnlock(); }
    });
    onAppStateChange((active) => {
      if (!enabled.current) return;
      if (!active) { hiddenAt.current = Date.now(); return; }
      if (hiddenAt.current && Date.now() - hiddenAt.current > BACKGROUND_GRACE_MS) { setLocked(true); tryUnlock(); }
      hiddenAt.current = null;
    }).then((d) => { dispose = d; });
    return () => dispose();
  }, [forced, tryUnlock]);

  return (
    <>
      {children}
      {locked && (
        <div className="oi-m-lock" role="dialog" aria-modal="true" aria-label="Openinvite is locked">
          <SmartImage src={photo || imageUrl('lock')} alt="" width={390} ratio="4/5" square eager tone="ink" style={{ position: 'absolute', inset: 0, height: '100%', aspectRatio: 'auto' }} />
          <div className="oi-m-hero__scrim" style={{ background: 'linear-gradient(to top, rgba(10,10,10,0.94) 0%, rgba(10,10,10,0.6) 50%, rgba(10,10,10,0.35) 100%)' }} />
          <div className="oi-m-lock__body">
            <span className="oi-m-lock__mark" aria-hidden="true"><span /></span>
            <h1 className="oi-m-title oi-m-on-dark">Openinvite</h1>
            <p className="oi-m-body oi-m-on-dark-2">{failed ? 'That did not work. Try again, or use your passcode.' : 'Unlock to keep planning.'}</p>
            <PillButton variant="light" icon={Lock} onClick={tryUnlock} disabled={busy} style={{ minWidth: 160 }}>{busy ? 'Unlocking' : 'Unlock'}</PillButton>
          </div>
        </div>
      )}
    </>
  );
}
