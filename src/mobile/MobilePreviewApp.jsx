import React, { useContext, useMemo, useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import MobileShell, { ShellContext } from './shell/MobileShell';
import { ApiContext } from './data/api';
import { createPreviewApi } from './fixtures/previewApi';
import HomeContainer from './screens/home/HomeContainer';
import GuestsContainer from './screens/guests/GuestsContainer';
import PlanFeatureContainer, { PlanHubContainer } from './screens/plan/PlanContainer';
import SiteContainer from './screens/site/SiteContainer';
import AccountContainer from './screens/account/AccountContainer';
import SearchContainer from './screens/search/SearchContainer';
import NotificationsScreen from './notifications/NotificationsScreen';
import NotificationSettingsScreen from './notifications/NotificationSettingsScreen';
import PushPreview from './notifications/PushPreview';
import ImageGalleryScreen from './screens/preview/ImageGalleryScreen';
import WelcomeScreen from './screens/firstrun/WelcomeScreen';
import LoginScreen from './screens/firstrun/LoginScreen';
import PrimingScreen from './screens/firstrun/PrimingScreen';
import { buildFeed } from './notifications/feed';
import { defaultSettings } from './notifications/store';
import { isDemoBuild } from './demo';
import { LaunchSplash, Greeting, briefingLine, launchPhoto } from './shell/LaunchSequence';
import { isNative } from './native';
import { daysUntilWedding } from '@/lib/weddingCountdown';
import { coupleImages } from './lib/images';
import {
  FIXTURE_WEDDING, FIXTURE_GUESTS, FIXTURE_TASKS, FIXTURE_BUDGET, FIXTURE_AVA_MESSAGES,
  FIXTURE_MESSAGES, FIXTURE_SONG_REQUESTS, FIXTURE_POLLS, FIXTURE_POLL_VOTES, FIXTURE_GIFTS, FIXTURE_NOTIFICATION_ENTITY,
} from './fixtures';

export const PREVIEW_BASE = '/m/preview';
const SYMBOL = 'A$';
const NOW = new Date('2026-09-21T09:00:00+10:00').getTime();

/**
 * /m/preview/* in development and in the demo build: the same shell and
 * the same containers as the signed-in app, driven by the preview api
 * (src/mobile/fixtures/previewApi.js) instead of Base44. No network calls.
 * Writes update the in-memory store so every sheet can be exercised.
 *
 * `?state=loading|empty|error` on any screen shows that state. `?banner=1`
 * on Home shows the in-app notification banner. `?add=1` opens the add
 * sheet where a screen has one. /m/preview/push is the lock screen mock,
 * /m/preview/images the photo manifest.
 */
function previewBriefing() {
  return briefingLine({ daysToGo: daysUntilWedding(FIXTURE_WEDDING.weddingDate), newReplies: 3 });
}

/**
 * The launch sequence runs in the preview only inside the native shell (the
 * demo build starts here); /m/preview/splash and /m/preview/greeting show
 * the two screens on their own for the web preview and its screenshots.
 */
function previewLaunch() {
  if (!isNative()) return null;
  return { ready: true, firstName: FIXTURE_WEDDING.couple1Name, line: previewBriefing(), photo: launchPhoto(), alt: 'A couple laughing together outdoors' };
}

export default function MobilePreviewApp() {
  const [params] = useSearchParams();
  const notifications = usePreviewNotifications(params.get('banner') === '1');
  const api = useMemo(() => createPreviewApi(), []);
  if (!import.meta.env.DEV && !isDemoBuild) return <Navigate to="/m" replace />;
  return (
    <ApiContext.Provider value={api}>
      <Routes>
        <Route path="push" element={<PushPreview />} />
        <Route path="welcome" element={<div className="oi-mobile-root"><WelcomeScreen onStart={() => {}} onLogin={() => {}} /></div>} />
        <Route path="login" element={<div className="oi-mobile-root"><LoginScreen onSubmit={() => {}} providers={[{ key: 'google', label: 'Continue with Google' }, { key: 'apple', label: 'Continue with Apple' }]} onForgot={() => {}} onSignUp={() => {}} onBack={() => {}} error={params.get('state') === 'error' ? 'That email and password did not match. Try again.' : ''} /></div>} />
        <Route path="priming" element={<div className="oi-mobile-root"><PrimingScreen onTurnOn={() => {}} onNotNow={() => {}} recorded={params.get('state') === 'recorded'} /></div>} />
        <Route path="splash" element={<div className="oi-mobile-root"><LaunchSplash photo={launchPhoto()} alt="A couple laughing together outdoors" /></div>} />
        <Route path="greeting" element={<div className="oi-mobile-root"><Greeting salutation="Good morning" firstName={FIXTURE_WEDDING.couple1Name} line={previewBriefing()} /></div>} />
        <Route element={<MobileShell base={PREVIEW_BASE} renderAva={({ openDetail }) => <PreviewAva openDetail={openDetail} />} notifications={notifications} forcedOffline={params.get('offline') === '1'} forcedLock={params.get('lock') === '1'} lockPhoto={coupleImages(FIXTURE_WEDDING)[0]} launch={previewLaunch()} />}>
          <Route index element={<HomeContainer />} />
          <Route path="guests" element={<GuestsContainer />} />
          <Route path="guests/:id" element={<GuestsContainer />} />
          <Route path="plan" element={<PlanHubContainer />} />
          <Route path="plan/:feature" element={<PlanFeatureContainer />} />
          <Route path="plan/:feature/:id" element={<PlanFeatureContainer />} />
          <Route path="plan/:feature/:id/:sub" element={<PlanFeatureContainer />} />
          <Route path="site" element={<SiteContainer />} />
          <Route path="account" element={<AccountContainer />} />
          <Route path="search" element={<SearchContainer />} />
          <Route path="notifications" element={<PreviewNotifications />} />
          <Route path="notifications/settings" element={<PreviewNotificationSettings />} />
          <Route path="images" element={<ImageGalleryScreen back={PREVIEW_BASE} />} />
          <Route path="*" element={<Navigate to={PREVIEW_BASE} replace />} />
        </Route>
      </Routes>
    </ApiContext.Provider>
  );
}

/* ── The notification feed, from the fixtures, no network ─────────────── */

function usePreviewNotifications(banner) {
  const [seenAt, setSeenAt] = useState(0);
  const [dismissed, setDismissed] = useState([]);
  const [settings, setSettings] = useState(defaultSettings());
  const [bannerSeen, setBannerSeen] = useState([]);
  return useMemo(() => {
    const items = buildFeed({ entity: FIXTURE_NOTIFICATION_ENTITY, guests: FIXTURE_GUESTS, messages: FIXTURE_MESSAGES, songRequests: FIXTURE_SONG_REQUESTS, pollVotes: FIXTURE_POLL_VOTES, polls: FIXTURE_POLLS, gifts: FIXTURE_GIFTS, tasks: FIXTURE_TASKS, budget: FIXTURE_BUDGET, briefing: { days: daysUntilWedding(FIXTURE_WEDDING.weddingDate, new Date(NOW)), sentence: '7 open tasks and 21 guests still to reply. The florist deposit is due Friday.' }, now: NOW, symbol: SYMBOL, base: PREVIEW_BASE })
      .map((it) => ({ ...it, unread: it.readOnServer != null ? !it.readOnServer && it.ts > seenAt : it.ts > seenAt && !dismissed.includes(it.id) }));
    const latestUnseen = banner ? items.find((i) => i.unread && !bannerSeen.includes(i.id)) || null : null;
    return {
      items, unread: items.filter((i) => i.unread).length, loading: false, error: null, reload: async () => {},
      markAllRead: async () => setSeenAt(NOW + 1), markRead: async (it) => setDismissed((d) => [...d, it.id]), settings, setSettings: async (s) => setSettings(s),
      latestUnseen, bannerShown: async (it) => setBannerSeen((b) => [...b, it.id]),
    };
  }, [seenAt, dismissed, settings, bannerSeen, banner]);
}

function PreviewNotifications() {
  const navigate = useNavigate();
  const { notifications, base } = useContext(ShellContext);
  const [params] = useSearchParams();
  const s = params.get('state');
  return <NotificationsScreen items={s === 'empty' ? [] : notifications.items} loading={s === 'loading'} error={s === 'error' ? new Error('preview') : null} onRetry={() => navigate(`${base}/notifications`)} onMarkAllRead={notifications.markAllRead} onOpen={(it) => notifications.markRead(it)} onSettings={() => navigate(`${base}/notifications/settings`)} back={base} now={NOW} />;
}

function PreviewNotificationSettings() {
  const { notifications, base } = useContext(ShellContext);
  return <NotificationSettingsScreen settings={notifications.settings} onChange={notifications.setSettings} back={`${base}/notifications`} />;
}

/** A static stand-in for the Ava pod so the preview makes no network calls. */
function PreviewAva({ openDetail }) {
  const messages = useMemo(() => FIXTURE_AVA_MESSAGES, []);
  const seed = openDetail?.seedQuestion || '';
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#0A0A0A', color: '#FFFFFF' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '84%', padding: '12px 16px', borderRadius: 20, background: m.role === 'user' ? '#E03553' : 'rgba(255,255,255,0.08)', fontSize: 15, lineHeight: '22px' }}>{m.text}</div>
        ))}
      </div>
      <div style={{ padding: 16, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <input className="oi-m-input" placeholder="Ask Ava anything" value={seed} readOnly style={{ background: 'rgba(255,255,255,0.08)', color: '#FFFFFF' }} />
      </div>
    </div>
  );
}
