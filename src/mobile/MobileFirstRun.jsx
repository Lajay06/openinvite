import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { WelcomeContainer, LoginContainer } from './screens/firstrun/FirstRunContainers';
import { bootNative, hideSplash, registerDeepLinks } from './native';
import { NATIVE_HOLD } from './shell/LaunchSequence';
import './styles/mobile.css';

/** /m/welcome and /m/login, outside the auth guard. Wrapped in the mobile root for tokens and safe areas. */
export default function MobileFirstRun({ screen }) {
  const navigate = useNavigate();

  // On a fresh install there is no session, so these screens are the first
  // thing the shell renders and MobileShell (which normally does both of the
  // following) never mounts. Found on the first simulator run: the splash
  // sat over the welcome screen forever. No-ops on the web.
  //
  // Boot: status bar and keyboard, then the splash goes once the screen has
  // painted (a short fade is in capacitor.config.ts).
  useEffect(() => {
    bootNative();
    const t = setTimeout(() => hideSplash(), NATIVE_HOLD);
    return () => clearTimeout(t);
  }, []);

  // The provider sign-in returns to openinvite://auth?access_token=... while
  // this screen is showing, so the listener has to live here as well as in
  // the shell. native.ts stores the token; the reload lets AuthContext see it.
  useEffect(() => {
    let dispose = () => {};
    registerDeepLinks((path, raw) => {
      if (/access_token=/.test(raw)) { window.location.replace(path); return; }
      navigate(path);
    }).then((d) => { dispose = d; });
    return () => dispose();
  }, [navigate]);

  return (
    <div className="oi-mobile-root">
      {screen === 'welcome' ? <WelcomeContainer /> : <LoginContainer />}
    </div>
  );
}
