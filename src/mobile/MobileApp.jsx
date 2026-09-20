import React, { useContext, useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useCurrency } from '@/contexts/CurrencyContext';
import AvaChatPod from '@/components/layout/AvaChatPod';
import MobileShell, { ShellContext } from './shell/MobileShell';
import HomeContainer from './screens/home/HomeContainer';
import GuestsContainer from './screens/guests/GuestsContainer';
import PlanFeatureContainer, { PlanHubContainer } from './screens/plan/PlanContainer';
import SiteContainer from './screens/site/SiteContainer';
import AccountContainer from './screens/account/AccountContainer';
import SearchContainer from './screens/search/SearchContainer';
import useNotifications from './notifications/useNotifications';
import { useWedding } from './data/wedding';
import { heroImageFor } from './lib/images';
import { PrimingContainer, usePrimingGate, WELCOME_PREF } from './screens/firstrun/FirstRunContainers';
import { isNative, prefGet } from './native';
import NotificationsScreen from './notifications/NotificationsScreen';
import NotificationSettingsScreen from './notifications/NotificationSettingsScreen';

export const MOBILE_BASE = '/m';

/**
 * /m/* for a signed-in couple. Registered inside App.jsx behind
 * ProtectedRoute, so an unauthenticated visitor never reaches this tree.
 */
export default function MobileApp() {
  const [messages, setMessages] = useState([]);
  const [dismissed, setDismissed] = useState(() => new Set());
  const { symbol } = useCurrency();
  const notifications = useNotifications({ base: MOBILE_BASE, symbol });
  const wedding = useWedding();
  const navigate = useNavigate();
  const showPriming = usePrimingGate(notifications);
  // Native first launch: the welcome screens once, tracked locally.
  useEffect(() => { if (isNative()) prefGet(WELCOME_PREF).then((v) => { if (!v) navigate('/m/welcome', { replace: true }); }); }, [navigate]);
  const renderAva = ({ onClose }) => (
    <AvaChatPod onClose={onClose} openDetail={null} messages={messages} setMessages={setMessages} dismissed={dismissed} setDismissed={setDismissed} onClear={() => { setMessages([]); setDismissed(new Set()); }} />
  );
  if (showPriming && !window.location.pathname.endsWith('/priming')) return <Navigate to={`${MOBILE_BASE}/priming`} replace />;
  return (
    <Routes>
      <Route element={<MobileShell base={MOBILE_BASE} renderAva={renderAva} notifications={notifications} lockPhoto={heroImageFor(wedding.data)} />}>
        <Route index element={<HomeContainer />} />
        <Route path="guests" element={<GuestsContainer />} />
        <Route path="guests/:id" element={<GuestsContainer />} />
        <Route path="plan" element={<PlanHubContainer />} />
        <Route path="plan/:feature" element={<PlanFeatureContainer />} />
        <Route path="plan/:feature/:id" element={<PlanFeatureContainer />} />
        <Route path="site" element={<SiteContainer />} />
        <Route path="account" element={<AccountContainer />} />
        <Route path="search" element={<SearchContainer />} />
        <Route path="notifications" element={<NotificationsContainer />} />
        <Route path="notifications/settings" element={<NotificationSettingsContainer />} />
        <Route path="priming" element={<PrimingContainer />} />
        <Route path="*" element={<Navigate to={MOBILE_BASE} replace />} />
      </Route>
    </Routes>
  );
}

function NotificationsContainer() {
  const navigate = useNavigate();
  const { notifications, base } = useContext(ShellContext);
  const n = notifications || {};
  return <NotificationsScreen items={n.items || []} loading={n.loading} error={n.error} onRetry={n.reload} onMarkAllRead={n.markAllRead} onOpen={(it) => n.markRead?.(it)} onSettings={() => navigate(`${base}/notifications/settings`)} back={base} />;
}

function NotificationSettingsContainer() {
  const { notifications, base } = useContext(ShellContext);
  const n = notifications || {};
  return <NotificationSettingsScreen settings={n.settings} onChange={n.setSettings} back={`${base}/notifications`} />;
}
