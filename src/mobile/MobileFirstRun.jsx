import React from 'react';
import { WelcomeContainer, LoginContainer } from './screens/firstrun/FirstRunContainers';
import './styles/mobile.css';

/** /m/welcome and /m/login, outside the auth guard. Wrapped in the mobile root for tokens and safe areas. */
export default function MobileFirstRun({ screen }) {
  return (
    <div className="oi-mobile-root">
      {screen === 'welcome' ? <WelcomeContainer /> : <LoginContainer />}
    </div>
  );
}
