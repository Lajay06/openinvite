/**
 * src/components/professional/event/GuestsTab.jsx
 *
 * THE GUESTS PANEL. goals/2026-10-14-professional.md, What a professional
 * gets, 4, and How the link works.
 *
 * Linked: live totals and the guest list exactly as the couple shared it,
 * from the server's allowlisted feed. Never an email, phone or address.
 * Standalone: the same panel, fed by manual entry or a CSV import that drops
 * every contact column and says so. Either way, a one-click caterer sheet.
 */
import React, { useMemo, useRef, useState } from 'react';
import { useProStore, create, update, remove, bulk, STORE_LIVE, CURRENT } from '@/lib/professionalStore';
import { can } from '@/lib/professionalAccess';
import { linkedFeedFor } from '@/lib/professionalFeedClient';
import { latestLinkEvent, normalizeShares, frozenTotals } from '../../../../api/_lib/professionalFeed.js';
import { importGuests, droppedLine, panelFigures, catererSheet, feedRows, guestHeads } from '@/lib/professionalGuests';
import { suggestCode, normalizeCode, isValidEmailShape } from '@/lib/professionalCodes';
import { shortDate } from '@/lib/professionalEvents';
import { FilterPill } from '@/components/shared/TableToolbar';
import { ProTable, Pill, Stat, Field, ProEmpty } from '../ProPage';
import { downloadCsv, downloadTablePdf, fileSlug } from '../proExport';
import { s, PRO } from '../proTheme';
import { TYPE } from '@/styles/typeScale';

const STATUS = { coming: ['Coming', 'good'], not_coming: ['Not coming', 'bad'], waiting: ['Waiting', 'wait'] };
const SHARE_TEXT = { names: 'names', party: 'plus-ones and children', dietary: 'dietary needs', meals: 'meals', tables: 'tables', schedule: 'their schedule', vendors: 'their vendors', budget: 'their budget', songs: 'song requests' };

function Caterer({ rows, totals, event, brand }) {
  const sheet = catererSheet(rows);
  const h = guestHeads(totals);
  const name = fileSlug(`${event.couple_names} caterer sheet`);
  const csv = () => downloadCsv(`${name}.csv`, ['Section', 'Table', 'Meal or need', 'Guest', 'Count'], [
    ...sheet.meals.map(([meal, n]) => ['Meals', '', meal, '', n]),
    ...sheet.byTable.flatMap(([table, list]) => list.map((d) => ['Dietary and allergies', table, d.need, d.name, 1])),
  ]);
  const pdf = (format) => downloadTablePdf({
    title: `${event.couple_names}: caterer sheet`,
    subtitle: `${shortDate(event.event_date)}${event.venue ? `, ${event.venue}` : ''}. ${h.line}${h.sub ? `, ${h.sub}` : ''}.`,
    columns: [{ label: 'Table', weight: 1 }, { label: 'Meal or need', weight: 2 }, { label: 'Guest', weight: 2 }, { label: 'Count', weight: 0.6 }],
    rows: [],
    groups: [
      { label: 'Meals', rows: sheet.meals.map(([meal, n]) => ['', meal, '', String(n)]) },
      { label: 'Dietary needs and allergies, by table', rows: sheet.byTable.flatMap(([table, list]) => list.map((d) => [table, d.need, d.name, '1'])) },
    ],
    format,
    filename: `${name}-${format}.pdf`,
    brand,
  });
  return (
    <span style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap' }}>
      <button type="button" style={s.btnSecondary} onClick={() => pdf('letter')}>Caterer sheet, PDF</button>
      <button type="button" style={s.btnSecondary} onClick={() => pdf('a4')}>PDF, A4</button>
      <button type="button" style={s.btnSecondary} onClick={csv}>CSV</button>
    </span>
  );
}

function InviteCouple({ event, onClose }) {
  const store = useProStore();
  const ws = store.ProWorkspace.find((w) => w.id === CURRENT.workspaceId);
  const code = store.PartnerCode.find((c) => c.workspace_id === CURRENT.workspaceId && c.status === 'active')?.code || suggestCode(ws?.name);
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const send = (e) => {
    e.preventDefault();
    if (!isValidEmailShape(email)) { setNote('Check the email address.'); return; }
    create('PlannerLink', { event_id: event.id, workspace_id: CURRENT.workspaceId, event_type: 'request', code: normalizeCode(code), created_date: new Date().toISOString(), is_test: true });
    setNote(STORE_LIVE ? `Sent to ${email}.` : `Recorded for ${email}. In the live product this sends the email.`);
  };
  return (
    <form onSubmit={send} style={{ ...s.card, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h3 style={s.cardTitle}>Invite the couple</h3>
      <p style={{ ...s.secondary, margin: 0, lineHeight: 1.5 }}>
        They get an email: &quot;{store.ProMember.find((m) => m.id === CURRENT.memberId)?.name || 'Your planner'} would like to plan your wedding with you on Openinvite.&quot;
        It carries your code {code}, for 10% off Pro or Ultra. When they link, you see who&apos;s coming here, live. You never see guests&apos; emails, phones or addresses.
      </p>
      <Field label="The couple's email"><input type="email" style={s.input} value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <button type="submit" style={s.btnPrimary}>Send the invite</button>
        <button type="button" style={s.btnSecondary} onClick={onClose}>Close</button>
        {note && <span role="status" style={s.secondary}>{note}</span>}
      </div>
    </form>
  );
}

export default function GuestsTab({ event, me, readOnly }) {
  const store = useProStore();
  const ws = store.ProWorkspace.find((w) => w.id === CURRENT.workspaceId);
  const brand = ws?.plan === 'agency' ? ws?.brand_name : '';
  const [filter, setFilter] = useState('all');
  const [inviting, setInviting] = useState(false);
  const [importMsg, setImportMsg] = useState(null);
  const [form, setForm] = useState({ name: '', dietary: '', meal: '', table: '', status: 'coming', plus_one: false, child: false });
  const fileRef = useRef(null);
  const editable = !readOnly && can(me, 'guests.edit', event);

  const linkRows = store.PlannerLink.filter((l) => l.event_id === event.id);
  const latest = latestLinkEvent(linkRows);
  const feed = linkedFeedFor(event, store);
  const pending = latest?.event_type === 'request';
  const unlinked = latest?.event_type === 'unlink';
  const linked = event.kind === 'linked' && !!feed;

  const standalone = store.ProGuest.filter((g) => g.event_id === event.id);
  const rows = useMemo(() => (linked ? feedRows(feed) : standalone.map((g) => ({ ...g }))), [linked, feed, standalone]);
  const fig = panelFigures(rows);
  const totals = linked && feed.totals ? feed.totals : fig;
  const shown = filter === 'all' ? rows : rows.filter((g) => g.status === filter);

  const add = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    create('ProGuest', { ...form, name: form.name.trim(), event_id: event.id, is_test: true });
    setForm({ ...form, name: '', dietary: '', meal: '', table: '' });
  };
  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const res = importGuests(await file.text());
    if (res.error) { setImportMsg({ tone: 'bad', text: res.error }); return; }
    bulk(({ create: c }) => res.guests.forEach((g) => c('ProGuest', { ...g, event_id: event.id, is_test: true })));
    setImportMsg({ tone: 'good', text: `Added ${res.guests.length} guest${res.guests.length === 1 ? '' : 's'}. ${droppedLine(res.dropped)}`.trim() });
  };
  const approveAsCouple = () => { update('ProEvent', event.id, { kind: 'linked' }); create('PlannerLink', { event_id: event.id, workspace_id: CURRENT.workspaceId, event_type: 'approve', shares: { totals: true, names: true, party: true, dietary: true, meals: true, tables: true, basics: true }, created_date: new Date().toISOString(), is_test: true }); };
  const unlinkAsCouple = () => {
    update('ProEvent', event.id, { frozen_totals: frozenTotals(feed) });
    create('PlannerLink', { event_id: event.id, workspace_id: CURRENT.workspaceId, event_type: 'unlink', created_date: new Date().toISOString(), is_test: true });
  };

  const sharedList = linked ? Object.entries(normalizeShares(latest?.shares)).filter(([k, v]) => v && SHARE_TEXT[k]).map(([k]) => SHARE_TEXT[k]) : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {linked && (
        <div style={{ ...s.card, display: 'flex', flexDirection: 'column', gap: 4, borderLeft: '3px solid #166534' }}>
          <span style={{ ...s.body, fontWeight: 600 }}>Live from {event.couple_names}&apos;s Openinvite</span>
          <span style={s.secondary}>They share {sharedList.join(', ') || 'their totals'}. Emails, phones and addresses are never shared. Each time you open this, the couple can see it was viewed.</span>
          {!STORE_LIVE && <button type="button" style={{ ...s.btnQuiet, alignSelf: 'flex-start', padding: 0, color: PRO.muted }} onClick={unlinkAsCouple}>Test data: unlink as the couple</button>}
        </div>
      )}
      {!linked && unlinked && (
        <div style={{ ...s.card, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ ...s.body, fontWeight: 600 }}>The couple unlinked their Openinvite</span>
          <span style={s.secondary}>Their guest list no longer feeds this event. You keep your run sheet and notes{event.frozen_totals ? `, and the last totals: ${event.frozen_totals.coming} coming, ${event.frozen_totals.waiting} waiting` : ''}.</span>
        </div>
      )}
      {!linked && pending && (
        <div style={{ ...s.card, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={s.body}>Invite sent. Their guests show here once the couple links their Openinvite.</span>
          {!STORE_LIVE && <button type="button" style={s.btnSecondary} onClick={approveAsCouple}>Test data: approve as the couple</button>}
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <Stat label="Coming" value={guestHeads(totals).heads} sub={guestHeads(totals).sub || 'Plus-ones and children included'} />
        <Stat label="Not coming" value={totals.not_coming} />
        <Stat label="Waiting" value={totals.waiting} />
        <Stat label="Children" value={totals.children} />
      </div>

      {(Object.keys(fig.meals).length > 0 || fig.dietary.length > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 8 }}>
          <section style={s.card} aria-label="Meals">
            <h3 style={{ ...s.cardTitle, marginBottom: 8 }}>Meals</h3>
            {Object.entries(fig.meals).sort((a, b) => b[1] - a[1]).map(([meal, n]) => <div key={meal} style={{ ...s.body, display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}><span>{meal}</span><span>{n}</span></div>)}
          </section>
          <section style={s.card} aria-label="Dietary needs and allergies">
            <h3 style={{ ...s.cardTitle, marginBottom: 8 }}>Dietary needs and allergies</h3>
            {fig.dietary.length === 0 ? <span style={s.secondary}>None so far.</span> : fig.dietary.map((d, i) => <div key={i} style={{ ...s.body, padding: '3px 0' }}>{d.need}<span style={s.secondary}>, {d.name}{d.table ? `, ${d.table}` : ''}</span></div>)}
          </section>
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        {[['all', 'Everyone'], ['coming', 'Coming'], ['waiting', 'Waiting'], ['not_coming', 'Not coming']].map(([k, l]) => <FilterPill key={k} label={l} active={filter === k} onClick={() => setFilter(k)} />)}
        <span style={{ flex: 1 }} />
        {rows.length > 0 && <Caterer rows={rows} totals={totals} event={event} brand={brand} />}
        {!linked && can(me, 'link.invite', event) && !readOnly && !pending && <button type="button" style={s.btnPrimary} onClick={() => setInviting(true)}>Invite the couple</button>}
      </div>
      {inviting && <InviteCouple event={event} onClose={() => setInviting(false)} />}

      {!linked && editable && (
        <div style={{ ...s.card, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <form onSubmit={add} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, alignItems: 'end' }}>
            <Field label="Guest"><input style={s.input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Status"><select style={s.input} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{Object.entries(STATUS).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}</select></Field>
            <Field label="Meal"><input style={s.input} value={form.meal} onChange={(e) => setForm({ ...form, meal: e.target.value })} /></Field>
            <Field label="Dietary or allergy"><input style={s.input} value={form.dietary} onChange={(e) => setForm({ ...form, dietary: e.target.value })} /></Field>
            <Field label="Table"><input style={s.input} value={form.table} onChange={(e) => setForm({ ...form, table: e.target.value })} /></Field>
            <button type="submit" style={s.btnPrimary}>Add guest</button>
          </form>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <button type="button" style={s.btnSecondary} onClick={() => fileRef.current?.click()}>Import a CSV</button>
            <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={onFile} style={{ display: 'none' }} aria-label="Guest CSV file" />
            <span style={s.secondary}>Names, dietary needs, meals and tables. Email, phone and address columns are left out.</span>
          </div>
          {importMsg && <p role="status" style={{ margin: 0, fontSize: TYPE.secondary, color: importMsg.tone === 'bad' ? '#991b1b' : PRO.text }}>{importMsg.text}</p>}
        </div>
      )}

      {rows.length === 0 ? (
        <ProEmpty title={linked ? 'No guests on their list yet' : 'No guests yet'} line={linked ? 'They show here as the couple adds them.' : 'Invite the couple to see their replies live, or add guests yourself.'} />
      ) : (
        <ProTable
          label="Guests"
          rows={shown.map((g, i) => ({ ...g, id: g.id || `row${i}` }))}
          columns={[
            { key: 'name', label: 'Guest', render: (g) => <span style={{ fontWeight: 600 }}>{g.name}{g.plus_one ? <span style={s.secondary}>{g.plus_one_name ? `, with ${g.plus_one_name}` : ', plus one'}</span> : null}</span> },
            { key: 'status', label: 'Reply', render: (g) => <Pill tone={STATUS[g.status]?.[1]}>{STATUS[g.status]?.[0] || 'Waiting'}</Pill> },
            { key: 'child', label: 'Child', render: (g) => (g.child ? 'Yes' : '') },
            { key: 'meal', label: 'Meal' },
            { key: 'dietary', label: 'Dietary' },
            { key: 'table', label: 'Table' },
            ...(!linked && editable ? [{ key: 'x', label: '', render: (g) => <button type="button" style={s.btnQuiet} onClick={() => remove('ProGuest', g.id)}>Remove</button> }] : []),
          ]}
        />
      )}
    </div>
  );
}
