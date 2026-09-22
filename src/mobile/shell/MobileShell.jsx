import React, { useCallback, useEffect, useRef, useState } from 'react';
import { avaDetailFor } from '../features/avaContext';
import { Outlet, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import TabBar from './TabBar';
import AppLock from './AppLock';
import OfflineBanner, { NetworkProvider } from './OfflineBanner';
import useEdgeSwipeBack from './useEdgeSwipeBack';
import BottomSheet from '../ui/BottomSheet';
import Banner from '../notifications/Banner';
import DailyUpdateHost from './DailyUpdateHost';
import { bootNative, registerBackButton, registerDeepLinks, hideSplash, onNotificationOpened, onNotificationReceived } from '../native';
import '../styles/mobile.css';

/**
 * The root of the mobile app: tokens, safe areas, the screen outlet, the
 * floating tab bar, the Ava button and sheet, the notification banner.
 *
 * `notifications` is the object from useNotifications (or a fixture in the
 * preview): the bell reads `unread`, the banner reads `latestUnseen`.
 * `renderAva({ onClose })` supplies the chat for the Ava sheet.
 */
export const ShellContext = React.createContext({ base: '/m', unread: 0, openAva: () => {}, closeAva: () => {}, notifications: null, search: null, showDailyUpdate: () => {} });

export default function MobileShell({ base = '/m', renderAva, showAva = true, notifications = null, search = null, lockPhoto = '', forcedOffline = false, forcedLock = false, daily = null, forceDaily = false }) {
  const [avaOpen, setAvaOpen] = useState(false);
  const navigate = useNavigate();
  const rootRef = useRef(null);
  useEdgeSwipeBack(base, rootRef);
  const [banner, setBanner] = useState(null);
  const { pathname } = useLocation();
  const avaOpenRef = useRef(avaOpen);
  avaOpenRef.current = avaOpen;

  // Boot: status bar and keyboard, and the native launch screen goes the
  // moment this shell has painted its first frame (goal 7: no in-app splash,
  // no minimum; two frames in, so the paint has happened, then a 200ms fade
  // set in capacitor.config.ts). The line logged is the cold-start marker
  // MOBILE_APP.md's timings read from the simulator's console.
  useEffect(() => {
    bootNative();
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => { raf2 = requestAnimationFrame(() => { hideSplash(); console.info(`[oi] shell painted ${Math.round(performance.now())}ms after the page started`); }); });
    return () => { cancelAnimationFrame(raf1); cancelAnimationFrame(raf2); };
  }, []);

  // openinvite:// and universal links route into /m; auth callbacks store
  // the token first (native.ts) and then reload so AuthContext sees it.
  useEffect(() => {
    let dispose = () => {};
    registerDeepLinks((path, raw) => {
      if (/access_token=/.test(raw)) { window.location.replace(path); return; }
      navigate(path);
    }).then((d) => { dispose = d; });
    return () => dispose();
  }, [navigate]);

  // A local notification (goal 7's test): a tap from the lock screen opens
  // its screen by the same link the notification center uses; one that
  // lands while the app is open shows as the in-app banner.
  useEffect(() => {
    let disposeOpen = () => {}; let disposeReceived = () => {};
    onNotificationOpened((link) => navigate(link)).then((d) => { disposeOpen = d; });
    onNotificationReceived((n) => setBanner({ id: `local:${Date.now()}`, type: n.type, title: n.title, body: n.body, link: n.link, ts: Date.now() })).then((d) => { disposeReceived = d; });
    return () => { disposeOpen(); disposeReceived(); };
  }, [navigate]);

  // Tapping outside an input dismisses the keyboard.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return undefined;
    const onTouch = (e) => {
      const a = document.activeElement;
      if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && !a.contains(e.target) && !e.target.closest('input, textarea, select, button, [role=button], a')) a.blur();
    };
    el.addEventListener('touchstart', onTouch, { passive: true });
    return () => el.removeEventListener('touchstart', onTouch);
  }, []);

  useEffect(() => {
    let dispose = () => {};
    registerBackButton(() => { if (avaOpenRef.current) { setAvaOpen(false); return true; } return false; }).then((d) => { dispose = d; });
    return () => dispose();
  }, []);

  // A route change closes the Ava sheet: the couple tapped an action card
  // that navigated somewhere, and the sheet must not sit on top of it.
  useEffect(() => { setAvaOpen(false); }, [pathname]);

  // Something new arrived while the app is open: show it once, as a banner,
  // unless the couple is already looking at the center.
  const latest = notifications?.latestUnseen || null;
  useEffect(() => {
    if (!latest || banner || pathname.endsWith('/notifications')) return;
    setBanner(latest);
  }, [latest, banner, pathname]);
  const onBannerDone = useCallback((item) => { setBanner(null); notifications?.bannerShown?.(item); }, [notifications]);

  // The page-scoped Ava: the screen's desktop page, its voice line and its quick actions ride into the pod (avaContext.js).
  const [avaDetail, setAvaDetail] = useState(null);
  const openAva = useCallback((extra = {}) => { setAvaDetail({ ...(avaDetailFor(window.location.pathname, base) || {}), ...extra }); setAvaOpen(true); }, [base]);
  // The daily update on demand (the demo build's long press on the Account title): a counter the host watches.
  const [dailyReplay, setDailyReplay] = useState(0);
  const showDailyUpdate = useCallback(() => setDailyReplay((n) => n + 1), []);
  const ctx = { base, unread: notifications?.unread || 0, openAva, closeAva: () => setAvaOpen(false), notifications, search, showDailyUpdate };

  return (
    <ShellContext.Provider value={ctx}>
      <NetworkProvider forcedOffline={forcedOffline}>
      <AppLock photo={lockPhoto} forced={forcedLock}>
      <div className="oi-mobile-root" ref={rootRef}>
        <Toaster
          position="top-center"
          containerStyle={{ top: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}
          toastOptions={{
            duration: 2500,
            style: { borderRadius: 999, boxShadow: 'none', background: '#0A0A0A', color: '#FFFFFF', fontSize: 13, fontWeight: 600, padding: '10px 16px' },
            success: { iconTheme: { primary: '#E03553', secondary: '#FFFFFF' } },
            error: { iconTheme: { primary: '#E03553', secondary: '#FFFFFF' } },
          }}
        />
        <Outlet />
        <TabBar base={base} />
        {showAva && (
          <button type="button" className="oi-m-ava" onClick={() => openAva()} aria-label="Ask Ava">
            <span aria-hidden="true">✦</span>
          </button>
        )}
        {showAva && (
          <BottomSheet open={avaOpen} onClose={() => setAvaOpen(false)} title={avaDetail?.title ? `Ava, ${avaDetail.title}` : 'Ava'} full flush>
            {avaDetail?.quickActions?.length > 0 && (
              <div className="oi-m-ava-quick" role="group" aria-label="Quick questions">
                {avaDetail.quickActions.map((q) => <button key={q} type="button" className="oi-m-filter" onClick={() => setAvaDetail((d) => ({ ...d, seedQuestion: q, seededAt: Date.now() }))}>{q}</button>)}
              </div>
            )}
            <div className="oi-m-ava-host">{avaOpen && renderAva ? renderAva({ onClose: () => setAvaOpen(false), openDetail: avaDetail }) : null}</div>
          </BottomSheet>
        )}
        {banner && <Banner item={banner} onDone={onBannerDone} />}
        <OfflineBanner />
        {daily && <DailyUpdateHost daily={daily} force={forceDaily} replay={dailyReplay} />}
      </div>
      </AppLock>
      </NetworkProvider>
    </ShellContext.Provider>
  );
}
