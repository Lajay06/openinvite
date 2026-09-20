import React, { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import TabBar from './TabBar';
import BottomSheet from '../ui/BottomSheet';
import { bootNative, registerBackButton } from '../native';
import '../styles/mobile.css';

/**
 * The root of the mobile app: tokens, safe areas, the screen outlet, the
 * tab bar and the Ava button. `renderAva({ onClose })` supplies the chat
 * for the Ava sheet so the preview can pass a fixture and the real app the
 * existing pod.
 *
 * Sheets opened by screens portal into `sheetHost` so they sit above the tab
 * bar without every screen needing to know about it.
 */
export const ShellContext = React.createContext({ base: '/m', openAva: () => {}, closeAva: () => {} });

export default function MobileShell({ base = '/m', renderAva, showAva = true }) {
  const [avaOpen, setAvaOpen] = useState(false);
  const { pathname } = useLocation();
  const avaOpenRef = useRef(avaOpen);
  avaOpenRef.current = avaOpen;

  useEffect(() => { bootNative(); }, []);

  useEffect(() => {
    let dispose = () => {};
    registerBackButton(() => {
      if (avaOpenRef.current) { setAvaOpen(false); return true; }
      return false;
    }).then((d) => { dispose = d; });
    return () => dispose();
  }, []);

  // A route change closes the Ava sheet: the couple tapped an action card
  // that navigated somewhere, and the sheet must not sit on top of it.
  useEffect(() => { setAvaOpen(false); }, [pathname]);

  const ctx = { base, openAva: () => setAvaOpen(true), closeAva: () => setAvaOpen(false) };

  return (
    <ShellContext.Provider value={ctx}>
      <div className="oi-mobile-root">
        {/* Layout.jsx mounts the desktop Toaster; /m is outside Layout, so the
            shell carries its own. Square, flat, under the status bar. */}
        <Toaster
          position="top-center"
          containerStyle={{ top: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}
          toastOptions={{
            duration: 2500,
            style: { borderRadius: 0, boxShadow: 'none', background: '#1A1A1A', color: '#FFFFFF', fontSize: 14, fontWeight: 600, padding: '12px 16px' },
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
            <div className="oi-m-ava-host">
              {avaOpen && renderAva ? renderAva({ onClose: () => setAvaOpen(false) }) : null}
            </div>
          </BottomSheet>
        )}
      </div>
    </ShellContext.Provider>
  );
}
