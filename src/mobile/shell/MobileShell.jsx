import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import TabBar from './TabBar';
import AppLock from './AppLock';
import OfflineBanner, { NetworkProvider } from './OfflineBanner';
import useEdgeSwipeBack from './useEdgeSwipeBack';
import BottomSheet from '../ui/BottomSheet';
import Banner from '../notifications/Banner';
import LaunchSequence from './LaunchSequence';
import { bootNative, registerBackButton, registerDeepLinks, hideSplash, setStatusBarDark } from '../native';
import '../styles/mobile.css';

/**
 * The root of the mobile app: tokens, safe areas, the screen outlet, the
 * floating tab bar, the Ava button and sheet, the notification banner.
 *
 * `notifications` is the object from useNotifications (or a fixture in the
 * preview): the bell reads `unread`, the banner reads `latestUnseen`.
 * `renderAva({ onClose })` supplies the chat for the Ava sheet.
 */
export const ShellContext = React.createContext({ base: '/m', unread: 0, openAva: () => {}, closeAva: () => {}, notifications: null, search: null });

// The launch sequence runs once per app open, not on every mount of the
// shell (a route change, a lock, a reload of the tree keep it away).
let launchShown = false;

export default function MobileShell({ base = '/m', renderAva, showAva = true, notifications = null, search = null, lockPhoto = '', forcedOffline = false, forcedLock = false, launch = null }) {
  const [avaOpen, setAvaOpen] = useState(false);
  const [launching, setLaunching] = useState(() => !!launch && !launchShown);
  useEffect(() => { if (launching) launchShown = true; }, [launching]);
  const navigate = useNavigate();
  const rootRef = useRef(null);
  useEdgeSwipeBack(base, rootRef);
  const [banner, setBanner] = useState(null);
  const { pathname } = useLocation();
  const avaOpenRef = useRef(avaOpen);
  avaOpenRef.current = avaOpen;

  // Boot: status bar and keyboard, then the splash goes once the shell has
  // painted its first frame (a short fade is in capacitor.config.ts).
  useEffect(() => {
    bootNative().then(() => { if (launching) setStatusBarDark(true); });
    const t = setTimeout(() => hideSplash(), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const ctx = { base, unread: notifications?.unread || 0, openAva: () => setAvaOpen(true), closeAva: () => setAvaOpen(false), notifications, search };

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
            style: { borderRadius: 999, boxShadow: 'none', background: '#0A0A0A', color: '#FFFFFF', fontSize: 14, fontWeight: 600, padding: '10px 16px' },
            success: { iconTheme: { primary: '#E03553', secondary: '#FFFFFF' } },
            error: { iconTheme: { primary: '#E03553', secondary: '#FFFFFF' } },
          }}
        />
        <Outlet />
        <TabBar base={base} />
        {showAva && (
          <button type="button" className="oi-m-ava" onClick={() => setAvaOpen(true)} aria-label="Ask Ava">
            <span aria-hidden="true">✦</span>
          </button>
        )}
        {showAva && (
          <BottomSheet open={avaOpen} onClose={() => setAvaOpen(false)} title="Ava" full flush>
            <div className="oi-m-ava-host">{avaOpen && renderAva ? renderAva({ onClose: () => setAvaOpen(false) }) : null}</div>
          </BottomSheet>
        )}
        {banner && <Banner item={banner} onDone={onBannerDone} />}
        <OfflineBanner />
        {launching && launch && <LaunchSequence ready={!!launch.ready} firstName={launch.firstName} line={launch.line} photo={launch.photo} alt={launch.alt} onDone={() => setLaunching(false)} />}
      </div>
      </AppLock>
      </NetworkProvider>
    </ShellContext.Provider>
  );
}
