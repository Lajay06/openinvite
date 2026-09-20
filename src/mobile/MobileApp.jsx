import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AvaChatPod from '@/components/layout/AvaChatPod';
import MobileShell from './shell/MobileShell';
import HomeContainer from './screens/home/HomeContainer';
import GuestsContainer from './screens/guests/GuestsContainer';
import PlanContainer from './screens/plan/PlanContainer';
import SiteContainer from './screens/site/SiteContainer';
import AccountContainer from './screens/account/AccountContainer';

export const MOBILE_BASE = '/m';

/**
 * /m/* for a signed-in couple. Registered inside App.jsx's ProtectedRoute
 * block, so an unauthenticated visitor never reaches this tree.
 *
 * The Ava sheet renders the existing AvaChatPod unchanged; the conversation
 * lives here so it survives closing and reopening the sheet, as it does in
 * Layout.jsx.
 */
export default function MobileApp() {
  const [messages, setMessages] = useState([]);
  const [dismissed, setDismissed] = useState(() => new Set());
  const renderAva = ({ onClose }) => (
    <AvaChatPod
      onClose={onClose}
      openDetail={null}
      messages={messages}
      setMessages={setMessages}
      dismissed={dismissed}
      setDismissed={setDismissed}
      onClear={() => { setMessages([]); setDismissed(new Set()); }}
    />
  );
  return (
    <Routes>
      <Route element={<MobileShell base={MOBILE_BASE} renderAva={renderAva} />}>
        <Route index element={<HomeContainer />} />
        <Route path="guests" element={<GuestsContainer />} />
        <Route path="guests/:id" element={<GuestsContainer />} />
        <Route path="plan" element={<PlanContainer />} />
        <Route path="plan/budget/:category" element={<PlanContainer />} />
        <Route path="site" element={<SiteContainer />} />
        <Route path="account" element={<AccountContainer />} />
        <Route path="*" element={<Navigate to={MOBILE_BASE} replace />} />
      </Route>
    </Routes>
  );
}
