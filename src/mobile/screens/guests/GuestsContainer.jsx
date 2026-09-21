import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import GuestsScreen from './GuestsScreen';
import GuestDetailScreen from './GuestDetailScreen';
import GuestFormSheet from './GuestFormSheet';
import { SetEventsSheet, ImportGuestsSheet, BulkActionsSheet } from './GuestSheets';
import { ShellContext } from '../../shell/MobileShell';
import { useGuests, useWedding, useGuestWrites } from '../../data/wedding';
import { useApi, useSymbol } from '../../data/api';
import useLoad from '../../data/useLoad';
import { useConfirm } from '../../ui/ConfirmSheet';
import { BottomSheet, PillButton } from '../../ui';
import { hapticLight, exportText, shareLink } from '../../native';
import { getWeddingEvents, toggleEventInvite, getGuestEventResponse, mealOptionLabel, effectiveMealChoice } from '@/lib/weddingEvents';
import { hasPlusOne, plusOneRsvpStatus } from '@/lib/plusOne';
import { countryFromWedding } from '@/lib/countryFromVenue';
import { DEFAULT_COUNTRY } from '@/lib/phoneE164';

/** Tag-based groupings become extra filter pills, as the desktop list offers. */
function groupingsFrom(guests) {
  const tags = new Map();
  for (const g of guests) for (const t of g.tags || []) tags.set(t, (tags.get(t) || 0) + 1);
  return [...tags.entries()].slice(0, 6).map(([t, n]) => ({ key: `tag:${t}`, label: t, count: n, test: (g) => (g.tags || []).includes(t) }));
}

/**
 * /m/guests and /m/guests/:id. Loads through the api seam (getMyGuestsWithRsvp),
 * writes through guestWrites; table assignment goes through the shared
 * seating path, as Guests.jsx does. Handles ?inviteAll= and ?setEvents=
 * from Event details, ?add=1 from Home.
 */
export default function GuestsContainer() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const { base } = useContext(ShellContext);
  const api = useApi();
  const symbol = useSymbol();
  const guests = useGuests();
  const wedding = useWedding();
  const gifts = useLoad(() => api.list('ReceivedGift', '-created_date').catch(() => []), []);
  const tables = useLoad(() => api.list('Table', '-created_date').catch(() => []), []);
  const guestWrites = useGuestWrites();
  const [filter, setFilter] = useState(params.get('filter') || 'all');
  const [eventFilter, setEventFilter] = useState('all');
  const [sheet, setSheet] = useState({ open: false, guest: null });
  const [selected, setSelected] = useState(null); // Set | null
  const [bulkOpen, setBulkOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [events, setEvents] = useState(null); // { guests, autoSend } for the set-events sheet
  const [bulkInvite, setBulkInvite] = useState(null); // { event, targets }
  const [confirm, confirmEl] = useConfirm();

  const d = wedding.data || null;
  const weddingEvents = useMemo(() => getWeddingEvents(d), [d]);
  const mealOptions = d?.mealOptions || [];
  const country = countryFromWedding(d) || DEFAULT_COUNTRY;
  const list = guests.data || [];
  const groupings = useMemo(() => groupingsFrom(list), [list]);
  const current = id ? list.find((g) => g.id === id) : null;
  const selectedGuests = useMemo(() => (selected ? list.filter((g) => selected.has(g.id)) : []), [list, selected]);

  // ?add=1 from Home's quick action opens the sheet once, then clears itself.
  const handled = useRef(false);
  useEffect(() => {
    if (handled.current) return;
    handled.current = true;
    const next = new URLSearchParams(params);
    let touched = false;
    if (params.get('add') === '1') { setSheet({ open: true, guest: null }); next.delete('add'); touched = true; }
    if (touched) setParams(next, { replace: true });
  }, [params, setParams]);

  // Both entry points from Event details. inviteAll confirms with the count before the bulk write; setEvents opens the picker over everyone.
  const handledEvents = useRef(false);
  useEffect(() => {
    if (handledEvents.current || guests.loading || !d) return;
    const inviteAll = params.get('inviteAll');
    const setEv = params.get('setEvents');
    if (!inviteAll && !setEv) return;
    handledEvents.current = true;
    const ev = weddingEvents.find((e) => e.event_id === (inviteAll || setEv));
    const next = new URLSearchParams(params); next.delete('inviteAll'); next.delete('setEvents'); next.delete('eventName'); setParams(next, { replace: true });
    if (!ev) return;
    if (inviteAll) setBulkInvite({ event: ev, targets: list.filter((g) => !getGuestEventResponse(g, ev).invited) });
    else { setSelected(new Set(list.map((g) => g.id))); setEvents({ guests: list, autoSend: false }); }
  }, [params, setParams, guests.loading, d, weddingEvents, list]);

  const reload = () => { guests.reload(); tables.reload(); };

  const applyTable = async (guestId, nextName, prevName) => {
    const nextT = (nextName || '').trim();
    if (nextT === (prevName || '').trim()) return;
    try {
      if (nextT) { const r = await api.seating.assignByName({ guestId, tableName: nextT, tables: tables.data || [] }); if (r.created) toast.success(`Created ${r.tableName} and seated the guest`); if (r.grewCapacityTo) toast(`${r.tableName} grew to ${r.grewCapacityTo} seats`); }
      else await api.seating.unassign({ guestId, tables: tables.data || [] });
    } catch (e) { toast.error(e?.message || 'Could not update the table'); }
  };
  const save = async (fields) => {
    const { table_assignment, ...rest } = fields;
    if (sheet.guest) {
      await guestWrites.update(sheet.guest.id, rest);
      await applyTable(sheet.guest.id, table_assignment, sheet.guest.table_assignment);
      toast.success('Guest updated');
    } else {
      const created = await guestWrites.create(rest, d);
      if (table_assignment && created?.id) await applyTable(created.id, table_assignment, '');
      toast.success('Guest added');
    }
    hapticLight();
    reload();
  };
  const removeGuest = async (g, { goBack = false } = {}) => {
    if (!g) return;
    if (!(await confirm({ title: `Remove ${g.name || 'this guest'}`, body: 'They come off your list, your seating and your sends.', action: 'Remove' }))) return;
    try { await guestWrites.remove(g.id); toast.success('Guest removed'); reload(); if (goBack) navigate(`${base}/guests`, { replace: true }); } catch (e) { toast.error(e?.message || 'Could not remove this guest. Try again.'); }
  };
  const updateGuest = async (gid, updates) => { await guestWrites.update(gid, updates); };

  const exportCsv = async () => {
    const csv = [['Name', 'Email', 'Phone', 'Category', 'RSVP Status', 'Meal Choice', 'Table Assignment', 'Plus One', 'Plus One Name', 'Dietary Restrictions', 'Plus One RSVP', 'Plus One Meal', 'Plus One Dietary', 'Mailing Address', 'Notes', 'Special Requests', 'Plus One Email'].join(','),
      ...list.map((g) => [g.name, g.email || '', g.phone || '', g.category || '', g.rsvp_status || '', mealOptionLabel(effectiveMealChoice(g.event_responses, g.meal_choice), mealOptions) || '', g.table_assignment || '', g.plus_one ? 'Yes' : 'No', g.plus_one_name || '', g.dietary_restrictions || '', hasPlusOne(g) ? plusOneRsvpStatus(g) : '', hasPlusOne(g) ? (mealOptionLabel(effectiveMealChoice(g.plus_one_event_responses, g.plus_one_meal_choice), mealOptions) || '') : '', hasPlusOne(g) ? (g.plus_one_dietary_restrictions || '') : '', g.mailing_address || '', g.notes || '', g.special_requests || '', hasPlusOne(g) ? (g.plus_one_email || '') : ''].map((f) => `"${String(f ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const r = await exportText('guest-list.csv', 'text/csv', csv);
    if (r !== 'failed') toast.success('Guest list exported'); else toast.error('Could not export the list.');
  };
  const copyLinks = async (targets) => {
    if (!targets.length) return;
    const tid = toast.loading('Getting the links');
    try {
      const map = await api.guestLinks(targets.map((g) => g.id));
      const urls = targets.map((g) => map[g.id]?.rsvpUrl).filter(Boolean);
      if (!urls.length) throw new Error('Could not generate RSVP links');
      if (urls.length === 1) { const r = await shareLink({ title: `${targets[0].name}'s RSVP link`, url: urls[0] }); toast.success(r === 'copied' ? 'RSVP link copied' : 'RSVP link ready', { id: tid }); return; }
      await navigator.clipboard.writeText(urls.join('\n'));
      toast.success(`${urls.length} RSVP links copied`, { id: tid });
    } catch (e) { toast.error(e?.message || 'Could not get the links', { id: tid }); }
  };
  const goSend = (ids, restrictEventIds) => navigate(`${base}/plan/send-invites${ids?.length ? `?ids=${ids.join(',')}${restrictEventIds ? `&events=${restrictEventIds.join(',')}` : ''}` : ''}`);
  const bulk = {
    setCategory: async (category) => { try { await Promise.all(selectedGuests.map((g) => guestWrites.update(g.id, { category }))); toast.success(`Category set for ${selectedGuests.length}`); reload(); } catch { toast.error('Could not update some guests'); } },
    setDietary: async (dietary_restrictions) => { try { await Promise.all(selectedGuests.map((g) => guestWrites.update(g.id, { dietary_restrictions }))); toast.success(`Dietary set for ${selectedGuests.length}`); reload(); } catch { toast.error('Could not update some guests'); } },
    addTag: async (tag) => { const t = selectedGuests.filter((g) => !(g.tags || []).includes(tag)); try { await Promise.all(t.map((g) => guestWrites.update(g.id, { tags: [...(g.tags || []), tag] }))); toast.success(`Tagged ${t.length} guest${t.length === 1 ? '' : 's'} ${tag}`); reload(); } catch { toast.error('Could not tag some guests'); } },
    removeTag: async (tag) => { const t = selectedGuests.filter((g) => (g.tags || []).includes(tag)); try { await Promise.all(t.map((g) => guestWrites.update(g.id, { tags: (g.tags || []).filter((x) => x !== tag) }))); toast.success(`Removed ${tag} from ${t.length}`); reload(); } catch { toast.error('Could not update some guests'); } },
    remove: async () => {
      if (!(await confirm({ title: `Remove ${selectedGuests.length} guest${selectedGuests.length === 1 ? '' : 's'}`, body: 'They come off your list, your seating and your sends.', action: 'Remove' }))) return;
      try { await Promise.all(selectedGuests.map((g) => guestWrites.remove(g.id))); toast.success(`Removed ${selectedGuests.length}`); setSelected(null); reload(); } catch { toast.error('Could not remove some guests'); }
    },
  };
  const runBulkInvite = async () => {
    const { event, targets } = bulkInvite;
    const tid = toast.loading(`Inviting ${targets.length} to ${event.name}`);
    let ok = 0; let err = 0;
    for (const g of targets) { try { await guestWrites.update(g.id, { event_responses: toggleEventInvite(g, event, true) }); ok++; } catch { err++; } }
    (err ? toast.error : toast.success)(err ? `${ok} invited, ${err} did not save` : `${ok} guest${ok === 1 ? '' : 's'} invited to ${event.name}`, { id: tid });
    setBulkInvite(null); reload();
  };

  return (
    <>
      {id ? (
        <GuestDetailScreen
          guest={current}
          weddingEvents={weddingEvents}
          mealOptions={mealOptions}
          gifts={gifts.data || []}
          symbol={symbol}
          back={`${base}/guests`}
          onEdit={() => setSheet({ open: true, guest: current })}
          onEditEvents={() => setEvents({ guests: [current], autoSend: false })}
          onDelete={() => removeGuest(current, { goBack: true })}
          onCopyLink={() => copyLinks([current])}
          onSendInvite={() => goSend([current.id])}
          loading={guests.loading && !current}
          error={guests.error}
          onRetry={reload}
        />
      ) : (
        <GuestsScreen
          guests={list}
          filter={filter}
          onFilter={setFilter}
          eventFilter={eventFilter}
          onEventFilter={setEventFilter}
          weddingEvents={weddingEvents}
          groupings={groupings}
          onOpenGuest={(g) => navigate(`${base}/guests/${g.id}`)}
          onAdd={() => setSheet({ open: true, guest: null })}
          onRemove={(g) => removeGuest(g)}
          onImport={() => setImportOpen(true)}
          onExport={exportCsv}
          onSend={() => goSend(selected ? [...selected] : [])}
          selected={selected}
          onToggleSelect={(g) => setSelected((s) => { const n = new Set(s || []); if (n.has(g.id)) n.delete(g.id); else n.add(g.id); return n; })}
          onSelectAll={(visible) => setSelected((s) => { if (!s) return new Set(visible.map((g) => g.id)); return s.size === visible.length && visible.length ? new Set() : new Set(visible.map((g) => g.id)); })}
          onClearSelection={() => setSelected(null)}
          onBulk={() => setBulkOpen(true)}
          loading={guests.loading}
          error={guests.error}
          onRetry={reload}
          onRefresh={async () => { reload(); }}
        />
      )}
      <GuestFormSheet open={sheet.open} guest={sheet.guest} mealOptions={mealOptions} country={country} onClose={() => setSheet((s) => ({ ...s, open: false }))} onSave={save} />
      <SetEventsSheet open={!!events} guests={events?.guests || []} weddingEvents={weddingEvents} onUpdate={updateGuest} onClose={() => setEvents(null)} onSaved={(newly) => { reload(); if (newly?.length && events?.guests?.length === 1) toast((t) => <span>Invited to {newly.length} new event{newly.length === 1 ? '' : 's'}<button type="button" className="oi-m-toast-action" onClick={() => { toast.dismiss(t.id); goSend([events.guests[0].id], newly); }}>Send invite</button></span>, { duration: 6000 }); }} />
      <ImportGuestsSheet open={importOpen} onClose={() => setImportOpen(false)} existingGuests={list} country={country} onCreate={(data) => guestWrites.create(data, d)} onImported={reload} />
      <BulkActionsSheet open={bulkOpen} onClose={() => setBulkOpen(false)} guests={selectedGuests} onSetCategory={bulk.setCategory} onSetDietary={bulk.setDietary} onAddTag={bulk.addTag} onRemoveTag={bulk.removeTag} onSetEvents={() => setEvents({ guests: selectedGuests, autoSend: false })} onCopyLinks={() => copyLinks(selectedGuests)} onSend={() => goSend(selectedGuests.map((g) => g.id))} onDelete={bulk.remove} />
      <BottomSheet open={!!bulkInvite} onClose={() => setBulkInvite(null)} title={bulkInvite ? `Invite everyone to ${bulkInvite.event.name}?` : ''} footer={bulkInvite ? (
        <>
          <PillButton variant="secondary" onClick={() => setBulkInvite(null)}>Not now</PillButton>
          <PillButton variant="primary" style={{ flex: 1 }} onClick={runBulkInvite} disabled={!bulkInvite.targets.length}>Invite {bulkInvite.targets.length}</PillButton>
        </>
      ) : undefined}>
        {bulkInvite && <p className="oi-m-body">{bulkInvite.targets.length ? `${bulkInvite.targets.length} guest${bulkInvite.targets.length === 1 ? ' is' : 's are'} not invited to ${bulkInvite.event.name} yet. This marks them invited; it sends nothing until you send.` : `Everyone on the list is already invited to ${bulkInvite.event.name}.`}</p>}
      </BottomSheet>
      {confirmEl}
    </>
  );
}
