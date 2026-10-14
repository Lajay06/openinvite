/**
 * src/pages/professional/EventsHome.jsx
 *
 * EVERY ACTIVE EVENT, ONE ROW EACH. goals/2026-10-14-professional.md, What a
 * professional gets, 1: couple, date, venue, days to go, linked or standalone,
 * guests coming and waiting, tasks overdue, next payment due, assigned
 * planner. Sort, filter by planner and month, and clash warnings.
 */
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { useProStore, CURRENT } from '@/lib/professionalStore';
import { activeEvents, daysToGo, daysToGoText, shortDate, monthKey, monthLabel, findClashes, eventSummary, byEventDate } from '@/lib/professionalEvents';
import { visibleEvents, can } from '@/lib/professionalAccess';
import { ROUTES } from '@/lib/professionalBrand';
import { money } from '@/lib/professionalMoney';
import { linkedFeedFor } from '@/lib/professionalFeedClient';
import { useIsMobile } from '@/hooks/use-mobile';
import { FilterPill } from '@/components/shared/TableToolbar';
import { ProPage, ProTable, ProEmpty, Pill } from '@/components/professional/ProPage';
import NewEventDialog from '@/components/professional/NewEventDialog';
import { ProAvaButton } from '@/components/professional/ProAva';
import { PRO, s } from '@/components/professional/proTheme';
import { TYPE } from '@/styles/typeScale';

const SORTS = [
  { key: 'date', label: 'Date' },
  { key: 'couple', label: 'Couple' },
  { key: 'overdue', label: 'Overdue tasks' },
];

export default function EventsHome() {
  const store = useProStore();
  const me = store.ProMember.find((m) => m.id === CURRENT.memberId);
  const members = store.ProMember;
  const all = useMemo(() => visibleEvents(me, activeEvents(store.ProEvent)), [me, store.ProEvent]);
  const [planner, setPlanner] = useState('all');
  const [month, setMonth] = useState('all');
  const [sort, setSort] = useState('date');
  const [creating, setCreating] = useState(false);
  const nav = useNavigate();
  const mobile = useIsMobile();

  const months = [...new Set(all.map((e) => monthKey(e.event_date)).filter(Boolean))].sort();
  const clashes = findClashes(all);
  const clashIds = new Set(clashes.flatMap((c) => c.eventIds));

  const rows = all
    .filter((e) => planner === 'all' || (e.assigned_member_ids || []).includes(planner))
    .filter((e) => month === 'all' || monthKey(e.event_date) === month)
    .map((e) => ({ ...e, sum: eventSummary(e, store, new Date(), linkedFeedFor(e, store)) }))
    .sort((a, b) => {
      if (sort === 'couple') return a.couple_names.localeCompare(b.couple_names);
      if (sort === 'overdue') return b.sum.overdue - a.sum.overdue;
      return byEventDate(a, b);
    });

  const name = (id) => members.find((m) => m.id === id)?.name || '';
  const open = (e) => nav(`${ROUTES.app}/events/${e.id}`);

  const columns = [
    { key: 'couple', label: 'Couple', render: (e) => (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
        {clashIds.has(e.id) && <AlertTriangle size={13} color="#854d0e" aria-label="Date clash" />}
        {e.couple_names}
      </span>
    ) },
    { key: 'date', label: 'Date', render: (e) => shortDate(e.event_date) },
    { key: 'venue', label: 'Venue', render: (e) => e.venue || '' },
    { key: 'togo', label: 'Days to go', render: (e) => daysToGoText(daysToGo(e.event_date)) },
    { key: 'kind', label: 'Guests from', render: (e) => (e.kind === 'linked' ? <Pill tone="good">Linked</Pill> : <Pill>Standalone</Pill>) },
    { key: 'guests', label: 'Coming', render: (e) => (e.sum.heads.heads === null ? 'Not linked yet' : <span>{e.sum.heads.line}{e.sum.heads.sub && <span style={{ ...s.secondary, display: 'block', lineHeight: 1.2 }}>{e.sum.heads.sub}</span>}</span>) },
    { key: 'waiting', label: 'Waiting', align: 'right', render: (e) => (e.sum.waiting === null ? '' : e.sum.waiting) },
    { key: 'overdue', label: 'Overdue', align: 'right', render: (e) => (e.sum.overdue ? <Pill tone="bad">{e.sum.overdue}</Pill> : '0') },
    { key: 'pay', label: 'Next payment', render: (e) => (e.sum.nextPayment && can(me, 'money.view', e) ? `${money(e.sum.nextPayment.amount)}, ${shortDate(e.sum.nextPayment.due_date, { weekday: false, year: false })}` : '') },
    { key: 'planner', label: 'Planner', render: (e) => (e.assigned_member_ids || []).map(name).filter(Boolean).join(', ') || 'Unassigned' },
  ];

  return (
    <ProPage
      title="Events"
      subtitle={`${all.length} active`}
      actions={(
        <>
          <ProAvaButton label="Ask Ava what's due" prompt="week" />
          {can(me, 'workspace.events.create') && <button type="button" style={s.btnPrimary} onClick={() => setCreating(true)}>New event</button>}
        </>
      )}
      toolbar={(
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', padding: mobile ? '12px 16px' : '12px 32px', background: '#FFFFFF', borderBottom: `1px solid ${PRO.border}` }}>
          <span style={s.label}>Planner</span>
          <FilterPill label="Everyone" active={planner === 'all'} onClick={() => setPlanner('all')} />
          {members.filter((m) => m.role !== 'dayof').map((m) => (
            <FilterPill key={m.id} label={m.name.split(' ')[0]} active={planner === m.id} onClick={() => setPlanner(m.id)} />
          ))}
          <span style={{ ...s.label, marginLeft: mobile ? 0 : 12 }}>Month</span>
          <select aria-label="Month" value={month} onChange={(e) => setMonth(e.target.value)} style={{ ...s.input, width: 'auto', fontSize: TYPE.pill }}>
            <option value="all">All months</option>
            {months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
          </select>
          <span style={{ ...s.label, marginLeft: mobile ? 0 : 12 }}>Sort</span>
          <select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value)} style={{ ...s.input, width: 'auto', fontSize: TYPE.pill }}>
            {SORTS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
        </div>
      )}
    >
      {clashes.length > 0 && (
        <div role="status" style={{ ...s.card, padding: '12px 16px', marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 4, borderLeft: '3px solid #854d0e' }}>
          {clashes.map((c) => {
            const names = c.eventIds.map((id) => all.find((e) => e.id === id)?.couple_names).filter(Boolean);
            const who = c.memberIds.map(name).filter(Boolean);
            return (
              <span key={c.date} style={s.body}>
                {shortDate(c.date)}: {names.join(' and ')} are on the same day{who.length ? `, and ${who.join(' and ')} ${who.length > 1 ? 'are' : 'is'} assigned to both` : ''}.
              </span>
            );
          })}
        </div>
      )}
      {all.length === 0 ? (
        <ProEmpty
          title="No events yet"
          line="Add your first event: the couple, the date and the venue. It takes under a minute, and you can start from a template."
          action={can(me, 'workspace.events.create') && <button type="button" style={s.btnPrimary} onClick={() => setCreating(true)}>New event</button>}
        />
      ) : mobile ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rows.map((e) => (
            <button key={e.id} type="button" onClick={() => open(e)} style={{ ...s.card, padding: 14, textAlign: 'left', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 4, fontFamily: 'inherit' }}>
              <span style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: TYPE.input, fontWeight: 600, color: PRO.text }}>{clashIds.has(e.id) ? '▲ ' : ''}{e.couple_names}</span>
                {e.kind === 'linked' ? <Pill tone="good">Linked</Pill> : <Pill>Standalone</Pill>}
              </span>
              <span style={s.secondary}>{shortDate(e.event_date)}, {daysToGoText(daysToGo(e.event_date)).toLowerCase()}</span>
              <span style={s.secondary}>{e.venue}</span>
              <span style={{ ...s.secondary, color: PRO.text }}>
                {e.sum.heads.heads === null ? 'Not linked yet' : `${e.sum.heads.line}${e.sum.heads.sub ? ` (${e.sum.heads.sub})` : ''}, ${e.sum.waiting} waiting`}{e.sum.overdue ? `, ${e.sum.overdue} overdue` : ''}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <ProTable label="Events" columns={columns} rows={rows} onRowClick={open} empty="No events match these filters." />
      )}
      {creating && <NewEventDialog onClose={() => setCreating(false)} onCreated={(e) => { setCreating(false); open(e); }} />}
    </ProPage>
  );
}
