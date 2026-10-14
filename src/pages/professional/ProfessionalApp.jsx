/**
 * src/pages/professional/ProfessionalApp.jsx
 *
 * /professional/app/*: the shell and every workspace screen. Where an account
 * belongs is decided by resolveEntry (src/lib/professionalAccess.js): until
 * the entities exist the app runs on the adapter's test data and says so on
 * every screen; after that a professional account enters, a couple's account
 * is told plainly that one email cannot be both, and anyone else chooses a
 * path at /professional/start.
 */
import React, { Suspense } from 'react';
import { Navigate, Route, Routes, Link } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { STORE_LIVE } from '@/lib/professionalStore';
import { resolveEntry, ONE_EMAIL_LINE } from '@/lib/professionalAccess';
import { ROUTES } from '@/lib/professionalBrand';
import { lazyWithReload } from '@/lib/lazyWithReload.js';
import ProShell from '@/components/professional/ProShell';
import { ProPage, ProEmpty } from '@/components/professional/ProPage';
import { PRO, s } from '@/components/professional/proTheme';
import { TYPE } from '@/styles/typeScale';
import EventsHome from './EventsHome';

const CalendarView = lazyWithReload(() => import('./CalendarView'));
const EventWorkspace = lazyWithReload(() => import('./EventWorkspace'));
const TasksPage = lazyWithReload(() => import('./TasksPage'));
const VendorBookPage = lazyWithReload(() => import('./VendorBookPage'));
const PaymentsPage = lazyWithReload(() => import('./PaymentsPage'));
const TemplatesPage = lazyWithReload(() => import('./TemplatesPage'));
const DayOfPage = lazyWithReload(() => import('./DayOfPage'));
const TeamPage = lazyWithReload(() => import('./TeamPage'));
const PartnerCodesPage = lazyWithReload(() => import('./PartnerCodesPage'));
const SettingsPage = lazyWithReload(() => import('./SettingsPage'));

export const TEST_DATA_LINE = 'Test data. Changes stay in this tab and are not saved.';

function TestDataNotice() {
  return (
    <div role="note" style={{ background: '#fef9c3', color: '#854d0e', fontSize: TYPE.secondary, fontWeight: 600, padding: '6px 16px' }}>
      {TEST_DATA_LINE}
    </div>
  );
}

function CoupleAccount() {
  return (
    <div style={{ minHeight: '100vh', background: PRO.work, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ ...s.card, maxWidth: 440, padding: 28, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Openinvite Professional</h1>
        <p style={{ ...s.body, margin: 0, lineHeight: 1.5 }}>{ONE_EMAIL_LINE}</p>
        <Link to="/DailyUpdate" style={{ ...s.btnSecondary, alignSelf: 'flex-start', textDecoration: 'none' }}>Back to your wedding</Link>
      </div>
    </div>
  );
}

export default function ProfessionalApp() {
  const { user, isLoadingAuth } = useAuth();
  if (STORE_LIVE && isLoadingAuth) return <div style={{ minHeight: '100vh', background: PRO.work }} />;
  const entry = resolveEntry({ user, live: STORE_LIVE });
  if (entry === 'signin') return <Navigate to={`/login?next=${encodeURIComponent(ROUTES.app)}`} replace />;
  if (entry === 'start') return <Navigate to={ROUTES.start} replace />;
  if (entry === 'couple') return <CoupleAccount />;

  return (
    <ProShell notice={entry === 'demo' ? <TestDataNotice /> : null}>
      <Suspense fallback={<div style={{ minHeight: 320 }} />}>
        <Routes>
          <Route index element={<EventsHome />} />
          <Route path="calendar" element={<CalendarView />} />
          <Route path="events/:eventId/*" element={<EventWorkspace />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="vendors" element={<VendorBookPage />} />
          <Route path="payments" element={<PaymentsPage />} />
          <Route path="templates" element={<TemplatesPage />} />
          <Route path="day-of" element={<DayOfPage />} />
          <Route path="day-of/:eventId" element={<DayOfPage />} />
          <Route path="team" element={<TeamPage />} />
          <Route path="codes" element={<PartnerCodesPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<ProPage title="Not found"><ProEmpty title="There's nothing at this address" line="Use the menu to find your way back." /></ProPage>} />
        </Routes>
      </Suspense>
    </ProShell>
  );
}
