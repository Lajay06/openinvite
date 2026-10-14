/**
 * src/pages/professional/DayOfPage.jsx
 *
 * DAY-OF MODE, designed at 390 first. Now, next and later from the run sheet,
 * big tick buttons, one tap to call or text a vendor or the team, the live
 * guest total, the emergency kit, and a copy kept on the phone for when the
 * signal drops.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Phone, MessageSquare, Check, WifiOff } from 'lucide-react';
import { useProStore, update, CURRENT } from '@/lib/professionalStore';
import { can, visibleEvents } from '@/lib/professionalAccess';
import { activeEvents, daysToGo, shortDate, daysToGoText } from '@/lib/professionalEvents';
import { fmtTime, fmtDuration } from '@/lib/professionalRunSheet';
import { nowNextLater, minuteOfDay, KIT_DEFAULT, saveDayOfCopy, readDayOfCopy, readKit, saveKit, dialable } from '@/lib/professionalDayOf';
import { linkedFeedFor } from '@/lib/professionalFeedClient';
import { panelFigures } from '@/lib/professionalGuests';
import { ProPage, ProEmpty } from '@/components/professional/ProPage';
import { s, PRO, PJS } from '@/components/professional/proTheme';
import { TYPE } from '@/styles/typeScale';

function Picker() {
  const store = useProStore();
  const me = store.ProMember.find((m) => m.id === CURRENT.memberId);
  const nav = useNavigate();
  const events = visibleEvents(me, activeEvents(store.ProEvent)).filter((e) => can(me, 'runsheet.view', e));
  return (
    <ProPage title="Day-of mode" subtitle="Pick the event you're running">
      {events.length === 0 ? <ProEmpty title="No events to run" /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {events.map((e) => (
            <button key={e.id} type="button" onClick={() => nav(e.id)} style={{ ...s.card, textAlign: 'left', cursor: 'pointer', fontFamily: PJS, padding: 16 }}>
              <span style={{ display: 'block', fontSize: TYPE.input, fontWeight: 600 }}>{e.couple_names}</span>
              <span style={s.secondary}>{shortDate(e.event_date)}, {daysToGoText(daysToGo(e.event_date)).toLowerCase()}</span>
            </button>
          ))}
        </div>
      )}
    </ProPage>
  );
}

function Row({ r, big, canTick, nameOf }) {
  return (
    <div style={{ background: '#FFFFFF', border: `1px solid ${PRO.border}`, padding: big ? 16 : 12, display: 'flex', gap: 12, alignItems: 'center' }}>
      <div style={{ width: 64, flexShrink: 0 }}>
        <div style={{ fontSize: big ? 16 : TYPE.input, fontWeight: 700 }}>{fmtTime(r.start_minute)}</div>
        <div style={s.secondary}>{fmtDuration(r.duration_minutes || 0)}</div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: big ? 16 : TYPE.input, fontWeight: 600 }}>{r.item}</div>
        <div style={s.secondary}>{[r.location, nameOf(r.owner_ref)].filter(Boolean).join(', ')}</div>
        {r.cue && <div style={{ ...s.body, marginTop: 4 }}>Cue: {r.cue}</div>}
      </div>
      {canTick && (
        <button
          type="button"
          onClick={() => update('RunSheetRow', r.id, { status: r.status === 'done' ? 'todo' : 'done' })}
          aria-label={r.status === 'done' ? `Mark ${r.item} not done` : `Mark ${r.item} done`}
          style={{ width: 56, height: 56, borderRadius: 999, border: `2px solid ${r.status === 'done' ? '#166534' : PRO.text}`, background: r.status === 'done' ? '#166534' : '#FFFFFF', color: r.status === 'done' ? '#FFFFFF' : PRO.text, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
        >
          <Check size={24} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

function Contact({ name, role, phone }) {
  const d = dialable(phone);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: '#FFFFFF', border: `1px solid ${PRO.border}` }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: TYPE.input, fontWeight: 600 }}>{name}</div>
        <div style={s.secondary}>{role}</div>
      </div>
      {d && <a href={`tel:${d}`} aria-label={`Call ${name}`} style={{ ...s.btnPrimary, display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', textDecoration: 'none' }}><Phone size={16} aria-hidden="true" />Call</a>}
      {d && <a href={`sms:${d}`} aria-label={`Text ${name}`} style={{ ...s.btnSecondary, display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', textDecoration: 'none' }}><MessageSquare size={16} aria-hidden="true" />Text</a>}
    </div>
  );
}

export default function DayOfPage() {
  const { eventId } = useParams();
  const store = useProStore();
  const me = store.ProMember.find((m) => m.id === CURRENT.memberId);
  const event = store.ProEvent.find((e) => e.id === eventId);
  const [minute, setMinute] = useState(minuteOfDay());
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  const [kit, setKit] = useState(() => (eventId ? readKit(eventId) : []));
  const [tab, setTab] = useState('run');

  useEffect(() => { const t = setInterval(() => setMinute(minuteOfDay()), 30000); return () => clearInterval(t); }, []);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  const live = useMemo(() => {
    if (!event) return null;
    const rows = store.RunSheetRow.filter((r) => r.event_id === event.id);
    const team = store.ProMember.filter((m) => m.role === 'owner' || (event.assigned_member_ids || []).includes(m.id) || (m.assigned_event_ids || []).includes(event.id));
    const vendors = store.ProVendorBooking.filter((b) => b.event_id === event.id).map((b) => ({ b, v: store.VendorContact.find((v) => v.id === b.vendor_id) })).filter((x) => x.v);
    const feed = linkedFeedFor(event, store);
    const totals = feed?.totals || panelFigures(store.ProGuest.filter((g) => g.event_id === event.id));
    return {
      rows,
      contacts: [
        ...vendors.map(({ b, v }) => ({ id: v.id, name: v.company, role: `${b.role || v.role}${v.contact ? `, ${v.contact}` : ''}`, phone: v.phone })),
        ...team.map((m) => ({ id: m.id, name: m.name, role: m.role === 'owner' ? 'Planner' : m.role === 'dayof' ? 'Day-of team' : m.role === 'assistant' ? 'Assistant' : 'Planner', phone: m.phone || '' })),
      ],
      coming: (totals.coming || 0) + (totals.plus_ones || 0),
    };
  }, [event, store]);

  useEffect(() => { if (event && live && online) saveDayOfCopy(event.id, { rows: live.rows, contacts: live.contacts, coming: live.coming }); }, [event, live, online]);

  if (!eventId) return <Picker />;
  const copy = !online || !live ? readDayOfCopy(eventId) : null;
  const data = online && live ? live : copy;
  if (!event && !copy) return <ProPage title="Day-of mode"><ProEmpty title="This event isn't one you can open" /></ProPage>;
  if (event && !can(me, 'runsheet.view', event)) return <ProPage title="Day-of mode"><ProEmpty title="This event isn't one you can open" /></ProPage>;

  const canTick = online && event && can(me, 'runsheet.tick', event);
  const nameOf = (ref) => data.contacts.find((c) => c.id === ref)?.name || '';
  const today = event ? daysToGo(event.event_date) === 0 : true;
  const nnl = nowNextLater(data.rows, today ? minute : -1);
  const toggleKit = (item) => { const next = kit.includes(item) ? kit.filter((x) => x !== item) : [...kit, item]; setKit(next); saveKit(eventId, next); };

  return (
    <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12, fontFamily: PJS }}>
      {!online && (
        <div role="status" style={{ display: 'flex', gap: 8, alignItems: 'center', background: '#fef9c3', color: '#854d0e', padding: '8px 12px', fontSize: TYPE.secondary, fontWeight: 600 }}>
          <WifiOff size={14} aria-hidden="true" /> Offline. Showing the copy saved {copy?.saved_at ? `at ${new Date(copy.saved_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : 'earlier'}. Ticks wait until you&apos;re back online.
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
        <div style={{ ...s.card, flex: 1, padding: 12 }}>
          <div style={s.label}>{event?.couple_names || 'Today'}</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{today ? fmtTime(minute) : shortDate(event?.event_date, { weekday: false })}</div>
          {!today && <div style={s.secondary}>Not today. Showing the day from the start.</div>}
        </div>
        <div style={{ ...s.card, padding: 12, minWidth: 110 }}>
          <div style={s.label}>Guests coming</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{data.coming}</div>
        </div>
      </div>
      <div role="tablist" aria-label="Day-of" style={{ display: 'flex', borderBottom: `1px solid ${PRO.border}` }}>
        {[['run', 'Run sheet'], ['contacts', 'Contacts'], ['kit', 'Emergency kit']].map(([k, l]) => (
          <button key={k} role="tab" type="button" aria-selected={tab === k} onClick={() => setTab(k)} style={{ flex: 1, background: 'none', border: 'none', borderBottom: `2px solid ${tab === k ? PRO.text : 'transparent'}`, padding: '12px 4px', fontSize: TYPE.body, fontWeight: 600, color: tab === k ? PRO.text : PRO.muted, fontFamily: PJS, cursor: 'pointer' }}>{l}</button>
        ))}
      </div>

      {tab === 'run' && (
        <>
          {nnl.overdue.length > 0 && (
            <section aria-label="Running late">
              <h2 style={{ ...s.label, color: '#991b1b', margin: '4px 0 6px' }}>Should have finished</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{nnl.overdue.map((r) => <Row key={r.id} r={r} canTick={canTick} nameOf={nameOf} />)}</div>
            </section>
          )}
          <section aria-label="Now">
            <h2 style={{ ...s.label, margin: '4px 0 6px' }}>Now</h2>
            {nnl.now.length === 0 ? <p style={{ ...s.secondary, margin: 0 }}>Nothing running this minute.</p> : <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{nnl.now.map((r) => <Row key={r.id} r={r} big canTick={canTick} nameOf={nameOf} />)}</div>}
          </section>
          <section aria-label="Next">
            <h2 style={{ ...s.label, margin: '4px 0 6px' }}>Next</h2>
            {nnl.next.length === 0 ? <p style={{ ...s.secondary, margin: 0 }}>Nothing else on the sheet.</p> : <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{nnl.next.map((r) => <Row key={r.id} r={r} canTick={canTick} nameOf={nameOf} />)}</div>}
          </section>
          {nnl.later.length > 0 && (
            <section aria-label="Later">
              <h2 style={{ ...s.label, margin: '4px 0 6px' }}>Later</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{nnl.later.map((r) => <Row key={r.id} r={r} canTick={canTick} nameOf={nameOf} />)}</div>
            </section>
          )}
          {nnl.done.length > 0 && <p style={{ ...s.secondary, margin: 0 }}>{nnl.done.length} done so far.</p>}
        </>
      )}
      {tab === 'contacts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {data.contacts.length === 0 ? <ProEmpty title="No contacts for this event yet" /> : data.contacts.map((c) => <Contact key={c.id} {...c} />)}
        </div>
      )}
      {tab === 'kit' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {KIT_DEFAULT.map((item) => (
            <label key={item} style={{ display: 'flex', gap: 12, alignItems: 'center', minHeight: 48, padding: '0 12px', background: '#FFFFFF', border: `1px solid ${PRO.border}`, fontSize: TYPE.input }}>
              <input type="checkbox" checked={kit.includes(item)} onChange={() => toggleKit(item)} style={{ width: 22, height: 22 }} />
              <span style={{ textDecoration: kit.includes(item) ? 'line-through' : 'none', color: kit.includes(item) ? PRO.muted : PRO.text }}>{item}</span>
            </label>
          ))}
          <p style={{ ...s.secondary, margin: 0 }}>Ticks stay on this phone.</p>
        </div>
      )}
    </div>
  );
}
