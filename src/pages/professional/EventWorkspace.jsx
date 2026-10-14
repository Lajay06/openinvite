/**
 * src/pages/professional/EventWorkspace.jsx
 *
 * ONE EVENT: a tab per area, each gated by the member's role on this event.
 * Read-only when the plan is over its limit, archived, or canceled.
 */
import React, { Suspense, useMemo } from 'react';
import { NavLink, Navigate, Route, Routes, useParams } from 'react-router-dom';
import { useProStore, CURRENT } from '@/lib/professionalStore';
import { can } from '@/lib/professionalAccess';
import { readOnlyEventIds } from '@/lib/professionalPlans';
import { shortDate, daysToGo, daysToGoText } from '@/lib/professionalEvents';
import { ROUTES } from '@/lib/professionalBrand';
import { useIsMobile } from '@/hooks/use-mobile';
import { ProPage, ProEmpty, Pill } from '@/components/professional/ProPage';
import { EVENT_TABS } from '@/components/professional/event/tabs';
import { PRO } from '@/components/professional/proTheme';
import { TYPE } from '@/styles/typeScale';

export default function EventWorkspace() {
  const { eventId } = useParams();
  const store = useProStore();
  const me = store.ProMember.find((m) => m.id === CURRENT.memberId);
  const ws = store.ProWorkspace.find((w) => w.id === CURRENT.workspaceId);
  const event = store.ProEvent.find((e) => e.id === eventId);
  const mobile = useIsMobile();
  const readOnly = useMemo(
    () => (event ? readOnlyEventIds(store.ProEvent, ws?.plan, { canceled: ws?.plan_status === 'canceled' }).has(event.id) : true),
    [event, store.ProEvent, ws],
  );

  if (!event || !can(me, 'event.view', event)) {
    return (
      <ProPage title="Event">
        <ProEmpty title="This event isn't one you can open" line="It may have been removed, or it isn't assigned to you. Ask the workspace owner." />
      </ProPage>
    );
  }
  const tabs = EVENT_TABS.filter((t) => can(me, t.area, event));
  const base = `${ROUTES.app}/events/${event.id}`;

  return (
    <ProPage
      title={event.couple_names}
      subtitle={`${shortDate(event.event_date)}${event.venue ? `, ${event.venue}` : ''}, ${daysToGoText(daysToGo(event.event_date)).toLowerCase()}`}
      actions={<span style={{ display: 'inline-flex', gap: 6 }}>{event.kind === 'linked' ? <Pill tone="good">Linked couple</Pill> : <Pill>Standalone</Pill>}{readOnly && <Pill tone="wait">Read-only</Pill>}</span>}
      toolbar={(
        <nav aria-label="Event" style={{ display: 'flex', gap: 0, overflowX: 'auto', background: '#FFFFFF', borderBottom: `1px solid ${PRO.border}`, padding: mobile ? '0 8px' : '0 24px' }}>
          {tabs.map((t) => (
            <NavLink
              key={t.key}
              to={t.key === 'overview' ? base : `${base}/${t.key}`}
              end={t.key === 'overview'}
              style={({ isActive }) => ({
                padding: '12px 10px', fontSize: TYPE.body, fontWeight: 600, whiteSpace: 'nowrap', textDecoration: 'none',
                color: isActive ? PRO.text : PRO.muted, borderBottom: `2px solid ${isActive ? PRO.text : 'transparent'}`,
              })}
            >
              {t.label}
            </NavLink>
          ))}
        </nav>
      )}
    >
      <Suspense fallback={<div style={{ minHeight: 240 }} />}>
      <Routes>
        {tabs.map((t) => (
          <Route key={t.key} path={t.key === 'overview' ? '' : t.key} element={<t.Component event={event} me={me} readOnly={readOnly} />} />
        ))}
        <Route path="*" element={<Navigate to={base} replace />} />
      </Routes>
      </Suspense>
    </ProPage>
  );
}
