/**
 * src/pages/professional/CalendarView.jsx
 *
 * THE CALENDAR, with clash warnings: a month grid at desktop, the same
 * month as a list at 390.
 */
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useProStore, CURRENT } from '@/lib/professionalStore';
import { activeEvents, findClashes, monthLabel, shortDate } from '@/lib/professionalEvents';
import { visibleEvents } from '@/lib/professionalAccess';
import { ROUTES } from '@/lib/professionalBrand';
import { useIsMobile } from '@/hooks/use-mobile';
import { ProPage, ProEmpty } from '@/components/professional/ProPage';
import { PRO, s } from '@/components/professional/proTheme';
import { TYPE } from '@/styles/typeScale';

const pad = (n) => String(n).padStart(2, '0');
const WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function CalendarView() {
  const store = useProStore();
  const me = store.ProMember.find((m) => m.id === CURRENT.memberId);
  const events = useMemo(() => visibleEvents(me, activeEvents(store.ProEvent)), [me, store.ProEvent]);
  const first = events.find((e) => e.event_date)?.event_date;
  const start = first ? new Date(`${first}T00:00:00Z`) : new Date();
  const [cursor, setCursor] = useState({ y: start.getUTCFullYear(), m: start.getUTCMonth() });
  const nav = useNavigate();
  const mobile = useIsMobile();

  const key = `${cursor.y}-${pad(cursor.m + 1)}`;
  const clashDates = new Set(findClashes(events).map((c) => c.date));
  const inMonth = events.filter((e) => String(e.event_date || '').startsWith(key));
  const byDay = new Map();
  inMonth.forEach((e) => byDay.set(e.event_date, [...(byDay.get(e.event_date) || []), e]));

  const daysIn = new Date(Date.UTC(cursor.y, cursor.m + 1, 0)).getUTCDate();
  const lead = (new Date(Date.UTC(cursor.y, cursor.m, 1)).getUTCDay() + 6) % 7;
  const cells = [...Array(lead).fill(null), ...Array.from({ length: daysIn }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);

  const step = (d) => setCursor(({ y, m }) => { const n = new Date(Date.UTC(y, m + d, 1)); return { y: n.getUTCFullYear(), m: n.getUTCMonth() }; });
  const open = (e) => nav(`${ROUTES.app}/events/${e.id}`);

  return (
    <ProPage title="Calendar" subtitle={`${events.length} active events`}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <button type="button" aria-label="Previous month" style={s.btnSecondary} onClick={() => step(-1)}><ChevronLeft size={14} /></button>
        <h2 style={{ fontSize: TYPE.input, fontWeight: 600, margin: 0, minWidth: 150, textAlign: 'center' }}>{monthLabel(key)}</h2>
        <button type="button" aria-label="Next month" style={s.btnSecondary} onClick={() => step(1)}><ChevronRight size={14} /></button>
      </div>
      {mobile ? (
        inMonth.length === 0 ? <ProEmpty title="Nothing this month" line="Events you add show here by date." /> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {inMonth.map((e) => (
              <button key={e.id} type="button" onClick={() => open(e)} style={{ ...s.card, padding: 14, textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', borderLeft: clashDates.has(e.event_date) ? '3px solid #854d0e' : s.card.border }}>
                <span style={{ display: 'block', fontSize: TYPE.input, fontWeight: 600 }}>{e.couple_names}</span>
                <span style={s.secondary}>{shortDate(e.event_date)}{clashDates.has(e.event_date) ? ', clashes with another event' : ''}</span>
              </button>
            ))}
          </div>
        )
      ) : (
        <div role="grid" aria-label={monthLabel(key)} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', background: PRO.border, gap: 1, border: `1px solid ${PRO.border}` }}>
          {WEEK.map((d) => <div key={d} role="columnheader" style={{ ...s.label, background: '#FAFAFA', padding: '8px 10px' }}>{d}</div>)}
          {cells.map((day, i) => {
            const date = day ? `${key}-${pad(day)}` : null;
            const list = (date && byDay.get(date)) || [];
            const clash = date && clashDates.has(date);
            return (
              <div key={i} role="gridcell" style={{ background: day ? '#FFFFFF' : '#FAFAFA', minHeight: 96, padding: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {day && <span style={{ fontSize: TYPE.secondary, color: clash ? '#854d0e' : PRO.muted, fontWeight: clash ? 600 : 400 }}>{day}{clash ? ', clash' : ''}</span>}
                {list.map((e) => (
                  <button key={e.id} type="button" onClick={() => open(e)} style={{ textAlign: 'left', border: 'none', background: clash ? '#fef9c3' : 'rgba(10,10,10,0.06)', padding: '4px 6px', fontSize: TYPE.secondary, fontWeight: 600, color: PRO.text, cursor: 'pointer', fontFamily: 'inherit', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {e.couple_names}
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </ProPage>
  );
}
