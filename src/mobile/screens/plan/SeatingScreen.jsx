import React, { useMemo, useState } from 'react';
import { Armchair, Plus, UserMinus, Search, Sparkles, Monitor } from 'lucide-react';
import toast from 'react-hot-toast';
import Screen from '../../shell/Screen';
import { Row, RowGroup, PanelCard, EmptyState, ErrorState, SkeletonRows, BottomSheet, PillButton, ItemCard, ItemList, FilterPills, TextField, SelectField, Checkbox, StatCard } from '../../ui';
import { useConfirm } from '../../ui/ConfirmSheet';
import { initials } from '../../lib/format';
import { getGuestEventResponse, RECEPTION_EVENT_ID } from '@/lib/weddingEvents';
import { resolveAttendees } from '@/lib/attendees';
import { DEFAULT_TABLE_CAPACITY, DEFAULT_TABLE_SHAPE } from '@/lib/tableAssignment';

const SHAPES = [{ value: 'round', label: 'Round' }, { value: 'rectangle', label: 'Rectangle' }];
const resolveEventId = (row) => row.event_id || RECEPTION_EVENT_ID;

/**
 * Seating, as lists: the desktop page's per-event tabs, stats, tables
 * (add, rename, shape, capacity, delete), seats (seat a guest, unseat),
 * the unseated pool with search and Attending only, and Ava's seating
 * plan with a review before it applies. The drag canvas, venue assets,
 * layout export and import stay on desktop.
 *
 * Attendees are resolved as Seating.jsx resolves them: the event's pool is
 * everyone invited and not declined, a plus-one appears only where the
 * event granted one, and plus-one ids are the synthetic `host::plus-one`.
 */
export default function SeatingScreen({ notice, tables = [], guests = [], weddingEvents = [], activeEventId, onEvent, manualEvents = [], onAddEventTab, onAddTable, onUpdateTable, onDeleteTable, onSeat, onUnseat, onAvaPlan, onApplyPlan, loading, error, onRetry, back, onDesktop, onRefresh }) {
  const [tableSheet, setTableSheet] = useState(null); // { table } | { create: true }
  const [seatSheet, setSeatSheet] = useState(null); // { table, seatIndex } | { attendee }
  const [attendingOnly, setAttendingOnly] = useState(false);
  const [q, setQ] = useState('');
  const [ava, setAva] = useState(null); // { plan } | { busy }
  const [confirm, confirmEl] = useConfirm();

  const reception = weddingEvents.find((e) => e.event_id === RECEPTION_EVENT_ID) || { event_id: RECEPTION_EVENT_ID, name: 'Reception', isMain: true };
  const withLayout = useMemo(() => new Set(tables.map(resolveEventId)), [tables]);
  const tabs = useMemo(() => [reception, ...weddingEvents.filter((e) => e.event_id !== RECEPTION_EVENT_ID && (withLayout.has(e.event_id) || manualEvents.includes(e.event_id)))], [reception, weddingEvents, withLayout, manualEvents]);
  const addable = weddingEvents.filter((e) => !tabs.some((t) => t.event_id === e.event_id));
  const activeEvent = tabs.find((e) => e.event_id === activeEventId) || reception;
  const eventTables = useMemo(() => tables.filter((t) => resolveEventId(t) === activeEvent.event_id), [tables, activeEvent]);
  const attendees = useMemo(() => {
    const out = [];
    for (const g of guests) {
      const r = getGuestEventResponse(g, activeEvent);
      if (!r.invited || !(r.status === 'yes' || r.status === 'pending')) continue;
      if (attendingOnly && r.status !== 'yes') continue;
      const resolved = resolveAttendees([g]);
      const primary = resolved.find((a) => !a.isPlusOne);
      const plusOne = resolved.find((a) => a.isPlusOne);
      if (primary) out.push({ ...primary, status: r.status });
      if (plusOne && (r.plus_ones || 0) > 0) out.push({ ...plusOne, status: r.status });
    }
    return out;
  }, [guests, activeEvent, attendingOnly]);
  const allAttendees = useMemo(() => attendees, [attendees]);
  const seatedIds = useMemo(() => new Set(eventTables.flatMap((t) => (t.assigned_guests || []).map((a) => a.guest_id))), [eventTables]);
  const nameOf = (id) => allAttendees.find((a) => a.id === id)?.name || guests.find((g) => g.id === id)?.name || 'Guest';
  const [panel, setPanel] = useState('unassigned'); // Seating.jsx's guest panel: All / Unassigned / Assigned
  const tableOf = (id) => eventTables.find((t) => (t.assigned_guests || []).some((a) => a.guest_id === id));
  // Seating.jsx: search by name or dietary, over the chosen panel filter.
  const panelList = useMemo(() => { const s = q.trim().toLowerCase(); return attendees.filter((a) => (panel === 'all' || (panel === 'assigned' ? seatedIds.has(a.id) : !seatedIds.has(a.id))) && (!s || a.name.toLowerCase().includes(s) || (a.dietary_restrictions || '').toLowerCase().includes(s))); }, [attendees, seatedIds, q, panel]);
  const unseated = panelList;
  const seats = eventTables.reduce((s, t) => s + (t.capacity || 0), 0);
  const seatedCount = attendees.filter((a) => seatedIds.has(a.id)).length;

  const removeTable = async (t) => {
    if (!(await confirm({ title: `Delete ${t.name}`, body: (t.assigned_guests || []).length ? `${(t.assigned_guests || []).length} people lose their seat.` : 'This table has no one at it.', action: 'Delete' }))) return;
    await onDeleteTable(t); setTableSheet(null);
  };
  const seatAt = async (attendee, table, seatIndex) => {
    const res = await onSeat({ guestId: attendee.id, tableId: table.id, seatIndex });
    if (res?.ok === false) { toast.error(res.reason === 'already-seated-in-event' ? `${attendee.name} is already at ${res.tableName}` : 'Could not seat that guest'); return; }
    setSeatSheet(null);
  };
  const firstFree = (t) => { const used = new Set((t.assigned_guests || []).map((a) => a.seat_index)); let i = 0; while (used.has(i) && i < (t.capacity || DEFAULT_TABLE_CAPACITY)) i++; return i < (t.capacity || DEFAULT_TABLE_CAPACITY) ? i : -1; };
  const runAva = async () => {
    setAva({ busy: true });
    try { const plan = await onAvaPlan(attendees, eventTables); setAva({ plan }); } catch (e) { toast.error(e?.message || 'Ava could not build a plan.'); setAva(null); }
  };

  return (
    <Screen notice={notice} title="Seating" subtitle={loading ? '' : `${eventTables.length} table${eventTables.length === 1 ? '' : 's'}, ${attendees.length - seatedCount} to seat`} back={back} actions={[{ icon: Plus, label: 'Add table', onClick: () => setTableSheet({ create: true }) }]} onRefresh={onRefresh}>
      {tabs.length + addable.length > 1 && <FilterPills options={[...tabs.map((e) => ({ key: e.event_id, label: e.name })), ...(addable.length ? [{ key: '__add', label: 'Add event' }] : [])]} value={activeEvent.event_id} onChange={(k) => (k === '__add' ? setTableSheet({ addEvent: true }) : onEvent(k))} />}
      <div className="oi-m-stack oi-m-stack--24" style={{ paddingTop: 16 }}>
        {error && !loading ? <ErrorState onRetry={onRetry} /> : loading ? <SkeletonRows count={4} /> : (
          <>
            <div className="oi-m-grid2">
              <StatCard icon={Armchair} label="Tables" numeric={eventTables.length} sub={`${seats} seat${seats === 1 ? '' : 's'}`} />
              <StatCard icon={Armchair} label="Guests" numeric={attendees.length} sub={`${activeEvent.name}, ${attendingOnly ? 'attending only' : 'excludes declined'}`} ink />
              <StatCard icon={Armchair} label="Assigned" numeric={seatedCount} sub={`${attendees.length - seatedCount} unassigned`} />
              <StatCard icon={Armchair} label="Complete" numeric={attendees.length ? Math.round((seatedCount / attendees.length) * 100) : 0} suffix="%" ink />
            </div>
            <PanelCard tone="neutral" label="Best on desktop" body="The table layout is drawn on a bigger screen. Here you can add tables, seat people and move them." action="Open on desktop" onClick={onDesktop}>
              <Monitor size={18} style={{ opacity: 0.6 }} />
            </PanelCard>
            <section>
              <div className="oi-m-section-head">
                <h2 className="oi-m-section">Tables</h2>
                <button type="button" className="oi-m-block__link" onClick={() => setTableSheet({ create: true })}>Add table</button>
              </div>
              {eventTables.length === 0 ? <EmptyState icon={Armchair} text={`No tables for ${activeEvent.name} yet.`} actionLabel="Add a table" onAction={() => setTableSheet({ create: true })} /> : (
                <ItemList>
                  {eventTables.map((t) => <ItemCard key={t.id} icon={Armchair} tile="neutral" title={t.name} meta={`${t.shape === 'rectangle' ? 'Rectangle' : 'Round'}, ${t.capacity || DEFAULT_TABLE_CAPACITY} seats`} value={`${(t.assigned_guests || []).length} of ${t.capacity || DEFAULT_TABLE_CAPACITY} seated`} onClick={() => setTableSheet({ table: t })} />)}
                </ItemList>
              )}
            </section>
            <section>
              <div className="oi-m-section-head">
                <h2 className="oi-m-section">{panel === 'assigned' ? 'Seated' : panel === 'all' ? 'Everyone' : 'Still to seat'}</h2>
                {attendees.length > 1 && eventTables.length > 0 && <button type="button" className="oi-m-block__link" onClick={runAva}>Ask Ava to seat everyone</button>}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search size={18} strokeWidth={1.75} style={{ position: 'absolute', left: 14, top: 15, color: 'var(--m-text-2)', pointerEvents: 'none' }} />
                  <input className="oi-m-input" style={{ paddingLeft: 42 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name or dietary" />
                </div>
              </div>
              <div style={{ marginBottom: 12 }}><FilterPills options={[{ key: 'unassigned', label: 'Unassigned' }, { key: 'assigned', label: 'Assigned' }, { key: 'all', label: 'All' }]} value={panel} onChange={setPanel} /></div>
              <div className="oi-m-row" style={{ background: 'transparent', padding: '0 4px 12px', minHeight: 44 }}>
                <Checkbox checked={attendingOnly} onChange={setAttendingOnly} label="Attending only" />
                <button type="button" className="oi-m-row__body" style={{ textAlign: 'left', minHeight: 44, alignSelf: 'stretch' }} onClick={() => setAttendingOnly((v) => !v)}><div className="oi-m-row__label">Attending only</div><div className="oi-m-row__sub">Hide guests who have not replied yet</div></button>
              </div>
              {unseated.length === 0 ? <div className="oi-m-card"><p className="oi-m-meta">{attendees.length ? (panel === 'unassigned' ? 'Everyone here has a seat.' : 'No one matches.') : `No one is invited to ${activeEvent.name} yet.`}</p></div> : (
                <RowGroup>
                  {unseated.map((a) => { const t = tableOf(a.id); return <Row key={a.id} initials={initials(a.name)} label={a.name} sub={[t ? `At ${t.name}` : '', a.isPlusOne ? 'Plus one' : '', a.status === 'pending' ? 'Not replied yet' : '', a.dietary_restrictions].filter(Boolean).join(', ')} onClick={() => (t ? setTableSheet({ table: t }) : setSeatSheet({ attendee: a }))} value={t ? 'Move' : 'Seat'} />; })}
                </RowGroup>
              )}
            </section>
          </>
        )}
      </div>

      {tableSheet?.addEvent && (
        <BottomSheet open onClose={() => setTableSheet(null)} title="Seat another event">
          <RowGroup>{addable.map((e) => <Row key={e.event_id} label={e.name} sub={e.date || ''} onClick={() => { onAddEventTab(e.event_id); setTableSheet(null); }} />)}</RowGroup>
        </BottomSheet>
      )}
      {(tableSheet?.create || tableSheet?.table) && (
        <TableSheet table={tableSheet.table || null} eventName={activeEvent.name} nameOf={nameOf} onClose={() => setTableSheet(null)}
          onSave={async (v) => { if (tableSheet.table) await onUpdateTable(tableSheet.table, v); else await onAddTable({ ...v, event_id: activeEvent.event_id }); setTableSheet(null); }}
          onDelete={tableSheet.table ? () => removeTable(tableSheet.table) : undefined}
          onSeatTap={(table, seatIndex, guestId) => { if (guestId) setSeatSheet({ unseat: { table, seatIndex, guestId } }); else setSeatSheet({ table, seatIndex }); }} />
      )}
      {seatSheet?.attendee && (
        <BottomSheet open onClose={() => setSeatSheet(null)} title={`Seat ${seatSheet.attendee.name}`}>
          {eventTables.length === 0 ? <p className="oi-m-meta">Add a table first.</p> : (
            <RowGroup>
              {eventTables.map((t) => { const free = firstFree(t); return <Row key={t.id} icon={Armchair} tile="neutral" label={t.name} sub={free < 0 ? 'Full' : `Seat ${free + 1} of ${t.capacity || DEFAULT_TABLE_CAPACITY} is free`} onClick={free < 0 ? undefined : () => seatAt(seatSheet.attendee, t, free)} />; })}
            </RowGroup>
          )}
        </BottomSheet>
      )}
      {seatSheet?.table && (
        <BottomSheet open onClose={() => setSeatSheet(null)} title={`${seatSheet.table.name}, seat ${seatSheet.seatIndex + 1}`} full>
          {unseated.length === 0 ? <p className="oi-m-meta">Everyone here already has a seat.</p> : (
            <RowGroup>{unseated.map((a) => <Row key={a.id} initials={initials(a.name)} label={a.name} sub={a.isPlusOne ? 'Plus one' : ''} onClick={() => seatAt(a, seatSheet.table, seatSheet.seatIndex)} />)}</RowGroup>
          )}
        </BottomSheet>
      )}
      {seatSheet?.unseat && (
        <BottomSheet open onClose={() => setSeatSheet(null)} title={`Unseat ${nameOf(seatSheet.unseat.guestId)}?`} footer={(
          <>
            <PillButton variant="secondary" onClick={() => setSeatSheet(null)}>Keep</PillButton>
            <PillButton variant="primary" icon={UserMinus} style={{ flex: 1 }} onClick={async () => { await onUnseat({ guestId: seatSheet.unseat.guestId, tableId: seatSheet.unseat.table.id, seatIndex: seatSheet.unseat.seatIndex }); setSeatSheet(null); }}>Unseat</PillButton>
          </>
        )}>
          <p className="oi-m-body">They go back to the Still to seat list.</p>
        </BottomSheet>
      )}
      {ava && (
        <BottomSheet open onClose={() => setAva(null)} title="Ava's seating plan" full footer={ava.plan ? (
          <>
            <PillButton variant="secondary" onClick={() => setAva(null)}>Discard</PillButton>
            <PillButton variant="primary" style={{ flex: 1 }} onClick={async () => { await onApplyPlan(ava.plan, attendees); setAva(null); }}>Apply this plan</PillButton>
          </>
        ) : undefined}>
          {ava.busy ? <p className="oi-m-body" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Sparkles size={16} /> Ava is grouping by tags, then by relationship, keeping plus ones with their guests.</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {ava.plan.summary && <p className="oi-m-body">{ava.plan.summary}</p>}
              {(ava.plan.assignments || []).map((a) => (
                <div key={a.tableId} className="oi-m-card" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div className="oi-m-body oi-m-strong">{a.tableName || eventTables.find((t) => t.id === a.tableId)?.name || 'Table'}</div>
                  <div className="oi-m-meta" style={{ color: 'var(--m-text)' }}>{(a.guests || []).map(nameOf).join(', ') || 'No one'}</div>
                  {a.reasoning && <div className="oi-m-meta">{a.reasoning}</div>}
                </div>
              ))}
              {(ava.plan.unassigned || []).length > 0 && <div className="oi-m-card"><div className="oi-m-body oi-m-strong">Still to seat</div><div className="oi-m-meta">{ava.plan.unassigned.map(nameOf).join(', ')}</div></div>}
              {(ava.plan.assignments || []).length === 0 && <p className="oi-m-meta">Ava did not return a plan. Try again, or seat people by hand.</p>}
            </div>
          )}
        </BottomSheet>
      )}
      {confirmEl}
    </Screen>
  );
}

/** A table: name, shape, capacity, the seats with who is in each, delete. */
function TableSheet({ table, eventName, nameOf, onClose, onSave, onDelete, onSeatTap }) {
  const [name, setName] = useState(table?.name || '');
  const [shape, setShape] = useState(table?.shape || DEFAULT_TABLE_SHAPE);
  const [capacity, setCapacity] = useState(table?.capacity || DEFAULT_TABLE_CAPACITY);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const save = async () => {
    if (!name.trim()) { setErr('Give the table a name.'); return; }
    if (!(Number(capacity) > 0)) { setErr('Capacity must be at least one.'); return; }
    const highest = Math.max(-1, ...(table?.assigned_guests || []).map((a) => a.seat_index ?? 0));
    if (table && Number(capacity) <= highest) { setErr(`Seat ${highest + 1} is taken, so the table needs at least ${highest + 1} seats. Unseat someone first.`); return; }
    setSaving(true); setErr('');
    try { await onSave({ name: name.trim(), shape, capacity: Number(capacity) }); } catch (e) { setErr(e?.message || 'Could not save the table.'); } finally { setSaving(false); }
  };
  const seatsOf = table ? Array.from({ length: Number(table.capacity) || DEFAULT_TABLE_CAPACITY }, (_, i) => ({ i, guestId: (table.assigned_guests || []).find((a) => a.seat_index === i)?.guest_id || null })) : [];
  return (
    <BottomSheet open onClose={onClose} title={table ? table.name : `Add a table to ${eventName}`} full footer={(
      <>
        {onDelete && <PillButton variant="ghost" onClick={onDelete} disabled={saving} style={{ color: 'var(--m-primary)' }}>Delete</PillButton>}
        <PillButton variant="secondary" onClick={onClose} disabled={saving}>Cancel</PillButton>
        <PillButton variant="primary" onClick={save} disabled={saving} style={{ flex: 1 }}>{saving ? 'Saving' : table ? 'Save' : 'Add table'}</PillButton>
      </>
    )}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Table 1, Head table" error={err} autoCapitalize="words" />
        <SelectField label="Shape" value={shape} onChange={(e) => setShape(e.target.value)} options={SHAPES} />
        <TextField label="Capacity" type="number" inputMode="numeric" value={capacity} onChange={(e) => setCapacity(e.target.value)} />
        {table && (
          <div>
            <h3 className="oi-m-section" style={{ marginBottom: 12 }}>Seats</h3>
            <RowGroup>
              {seatsOf.map(({ i, guestId }) => <Row key={i} initials={guestId ? initials(nameOf(guestId)) : String(i + 1)} tile={guestId ? 'tint' : 'neutral'} label={guestId ? nameOf(guestId) : 'Empty'} sub={`Seat ${i + 1}`} value={guestId ? 'Unseat' : 'Seat someone'} onClick={() => onSeatTap(table, i, guestId)} />)}
            </RowGroup>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
