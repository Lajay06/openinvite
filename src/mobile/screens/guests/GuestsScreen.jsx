import React, { useEffect, useMemo, useState } from 'react';
import { Search, Plus, Users, MoreHorizontal, Upload, Download, Send, CheckSquare, X, Mail, ChevronDown, ArrowUpDown, SlidersHorizontal, BookUser } from 'lucide-react';
import Screen from '../../shell/Screen';
import { FilterPills, SearchScreen, SkeletonRows, ErrorState, EmptyState, StatusPill, ProgressBar, RowGroup, SwipeRow, SWIPE_ICONS, BottomSheet, Row, Checkbox, PillButton, SelectField } from '../../ui';
import { imageUrl } from '../../images';
import { isPending } from '@/lib/guestRsvpTally';
import { countGuests, guestMatchesStat, GUEST_STAT_LABELS } from './guestCounts';
import { prefGet, prefSet } from '../../native';
import { useConsiderations } from '../../features/ConsiderationsSheet';

import { getGuestEventResponse } from '@/lib/weddingEvents';
import { initials, RSVP_LABEL, RSVP_TONE, GUEST_CATEGORY_LABEL } from '../../lib/format';

/** One label set everywhere (goal 8): the four stats, then "Not yet invited" as a list filter only. */
export const GUEST_FILTERS = [
  { key: 'all', label: 'All' },
  ...GUEST_STAT_LABELS,
  { key: 'not_invited', label: 'Not yet invited' },
];

/** The list under a filter. With an event on, the four statuses read that event's reply (guestCounts.js). */
export function applyGuestFilter(list, key, event = null) {
  switch (key) {
    case 'invited': case 'attending': case 'declined': case 'awaiting': return list.filter((g) => guestMatchesStat(g, key, event));
    case 'not_invited': return list.filter((g) => !g.invite_sent_at); // Guests.jsx: never sent, whatever they replied
    default: return list;
  }
}

/** GuestList.jsx's sortable columns. */
const SORTS = [{ value: 'added', label: 'Newest' }, { value: 'name', label: 'Name' }, { value: 'category', label: 'Category' }, { value: 'status', label: 'RSVP status' }, { value: 'table', label: 'Table' }];
function sortGuests(list, key) {
  if (key === 'added') return list;
  const acc = { name: (g) => g.name || '', category: (g) => g.category || '', status: (g) => g.rsvp_status || '', table: (g) => g.table_assignment || '' }[key];
  return [...list].sort((a, b) => acc(a).localeCompare(acc(b), 'en', { numeric: true }));
}

/** GuestList.jsx's title-case suggestion: an all-lowercase name gets one tap to fix; a decline persists per guest. */
export function suggestTitleCase(name) {
  const raw = (name || '').trim();
  if (!raw || /[A-Z]/.test(raw) || !/[a-z]/.test(raw)) return null;
  const suggested = raw.replace(/(^|[\s'-])([a-z])/g, (m, sep, ch) => sep + ch.toUpperCase());
  return suggested === raw ? null : suggested;
}
const CASE_DISMISS_KEY = 'name_case_dismissed';

const EVENT_STATUS = { yes: ['ok', 'Attending'], no: ['no', 'Declined'], pending: ['warn', 'Awaiting reply'] };

/** One guest row: initials tile, name, sub line, status pill (per event when an event filter is on). */
export function GuestRow({ guest, onClick, event, selectable, selected, onSelect, role, caseSuggestion, onRename, onDismissCase }) {
  const status = guest.invite_sent_at || !isPending(guest) ? (guest.rsvp_status || 'pending') : null;
  const sub = [role, GUEST_CATEGORY_LABEL[guest.category], guest.plus_one ? 'Plus one' : '', guest.email].filter(Boolean).join(', ');
  let pill = status ? <StatusPill tone={RSVP_TONE[status] || 'neutral'}>{RSVP_LABEL[status] || status}</StatusPill> : <StatusPill tone="neutral">Not invited</StatusPill>;
  if (event) {
    const r = getGuestEventResponse(guest, event);
    const [tone, label] = EVENT_STATUS[r.status] || EVENT_STATUS.pending;
    pill = r.invited ? <StatusPill tone={tone}>{label}</StatusPill> : <StatusPill tone="neutral">Not invited</StatusPill>;
  }
  return (
    <div className="oi-m-row">
      {selectable && <Checkbox checked={!!selected} onChange={() => onSelect?.(guest)} label={`Select ${guest.name}`} />}
      <button type="button" className="oi-m-row oi-m-row--pressable" style={{ padding: 0, minHeight: 44, flex: 1, background: 'transparent' }} onClick={selectable ? () => onSelect?.(guest) : onClick}>
        {!selectable && <span className="oi-m-row__tile" style={{ fontSize: 13, fontWeight: 600 }}>{initials(guest.name)}</span>}
        <div className="oi-m-row__body">
          <div className="oi-m-row__label">{guest.name || 'Unnamed guest'}</div>
          {sub && <div className="oi-m-row__sub">{sub}</div>}
        </div>
        {pill}
      </button>
      {caseSuggestion && !selectable && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 4 }}>
          <button type="button" className="oi-m-block__link" style={{ margin: 0, minHeight: 44 }} onClick={() => onRename?.(guest, caseSuggestion)}>{caseSuggestion}?</button>
          <button type="button" className="oi-m-iconbtn oi-m-iconbtn--ghost" aria-label="Keep the name as it is" onClick={() => onDismissCase?.(guest)}><X size={16} /></button>
        </div>
      )}
    </div>
  );
}

/**
 * The guest list: stats, status filters, an event filter, tag groupings,
 * search, select mode with the bulk actions, import, export, send.
 */
export default function GuestsScreen({ guests = [], filter = 'all', onFilter, eventFilter = 'all', onEventFilter, weddingEvents = [], onOpenGuest, onAdd, onQuickAdd, onRename, onRemove, onImport, onImportContacts, onExport, onSend, onTemplates, selected, onToggleSelect, onSelectAll, onClearSelection, onBulk, loading, error, onRetry, groupings = [], guestRoles = {}, back, onRefresh }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('added');
  const [sortOpen, setSortOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [quick, setQuick] = useState('');
  const [quickBusy, setQuickBusy] = useState(false);
  const [dismissedCase, setDismissedCase] = useState(() => new Set());
  useEffect(() => { prefGet(CASE_DISMISS_KEY).then((v) => { if (v) { try { setDismissedCase(new Set(JSON.parse(v))); } catch { /* keep none */ } } }); }, []);
  const dismissCase = (g) => setDismissedCase((prev) => { const next = new Set(prev); next.add(g.id); prefSet(CASE_DISMISS_KEY, JSON.stringify([...next])); return next; });
  const quickAdd = async () => { const name = quick.trim(); if (!name || !onQuickAdd) return; setQuickBusy(true); try { await onQuickAdd(name); setQuick(''); } finally { setQuickBusy(false); } };
  const selecting = !!selected;
  const considerations = useConsiderations('guests');

  const event = eventFilter !== 'all' ? weddingEvents.find((e) => e.event_id === eventFilter) : null;
  const filters = useMemo(() => {
    const inEvent = event ? guests.filter((g) => getGuestEventResponse(g, event).invited) : guests;
    return [...GUEST_FILTERS.map((f) => ({ ...f, count: f.key === 'all' ? inEvent.length : applyGuestFilter(inEvent, f.key, event).length })), ...groupings];
  }, [guests, groupings, event]);

  const visible = useMemo(() => {
    const grouping = groupings.find((g) => g.key === filter);
    let list = grouping ? guests.filter(grouping.test) : applyGuestFilter(guests, filter, event);
    if (event) list = list.filter((g) => getGuestEventResponse(g, event).invited);
    return sortGuests(list, sort);
  }, [guests, filter, groupings, event, sort]);

  // Guests.jsx: the search runs over the active status and event filter, not the whole list.
  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    return visible.filter((g) => [g.name, g.email, g.phone, g.plus_one_name].some((v) => (v || '').toLowerCase().includes(s)));
  }, [visible, q]);

  // The four numbers, one label set, for the event on the filter or for all events (guestCounts.js, the desktop's logic).
  const counts = useMemo(() => countGuests(guests, event), [guests, event]);
  const plusOnes = !event && counts.plusOnes ? counts.plusOnes.invited : 0;
  const statFilter = GUEST_STAT_LABELS.some((s) => s.key === filter) ? filter : null;

  const actions = selecting
    ? [{ icon: X, label: 'Done selecting', onClick: onClearSelection }]
    : [];

  return (
    <>
      <Screen
        title={selecting ? `${selected.size} selected` : 'Guests'}
        subtitle={loading ? '' : selecting ? 'Tap guests to add them' : `${guests.length} guest${guests.length === 1 ? '' : 's'}`}
        root={!back && !selecting}
        back={back}
        actions={actions}
        onRefresh={selecting ? undefined : onRefresh}
        footer={selecting ? (
          <div style={{ display: 'flex', gap: 8, padding: '12px var(--m-gutter)', background: 'var(--m-card)', borderTop: '1px solid var(--m-line)' }}>
            <PillButton variant="secondary" onClick={() => onSelectAll(visible)}>{selected.size === visible.length && visible.length ? 'Clear' : 'Select all'}</PillButton>
            <PillButton variant="primary" style={{ flex: 1 }} disabled={selected.size === 0} onClick={onBulk}>Actions for {selected.size}</PillButton>
          </div>
        ) : undefined}
      >
        {!loading && guests.length > 0 && !selecting && (
          <div className="oi-m-stack" style={{ marginBottom: 16 }}>
            <div className="oi-m-card">
              {/* One line at 390px, never wrapped: the count, the word, the plus-ones (goal 6); per event, the event's name. */}
              <div className="oi-m-section" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 12 }}>{event ? event.name : `${guests.length} guest${guests.length === 1 ? '' : 's'}${plusOnes ? ` \u00b7 ${plusOnes} plus-one${plusOnes === 1 ? '' : 's'}` : ''}`}</div>
              {/* The four stats, same labels for every event filter; tap one to filter the list to it, tap again to clear (goal 8). */}
              <div className="oi-m-stats" role="group" aria-label="Guest numbers">
                {GUEST_STAT_LABELS.map((st) => (
                  <Stat key={st.key} n={counts[st.key]} label={st.label} sub={plusOnes && counts.plusOnes[st.key] ? `${counts.guests[st.key]} guest${counts.guests[st.key] === 1 ? '' : 's'}, ${counts.plusOnes[st.key]} plus-one${counts.plusOnes[st.key] === 1 ? '' : 's'}` : ''} active={statFilter === st.key} onClick={() => onFilter(statFilter === st.key ? 'all' : st.key)} />
                ))}
              </div>
              <ProgressBar value={counts.attending + counts.declined} max={counts.invited} note={summary(counts, event)} />
              {/* The tab root keeps the bell top right, so the list's actions live here, not in the header. */}
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <PillButton variant="primary" size="sm" icon={Plus} onClick={onAdd} style={{ flex: 1 }}>Add a guest</PillButton>
                <PillButton variant="secondary" size="sm" icon={MoreHorizontal} onClick={() => setActionsOpen(true)} style={{ flex: 1 }}>More</PillButton>
              </div>
            </div>
          </div>
        )}
        {!selecting && (
          <div className="oi-m-ctrl">
            <button type="button" className="oi-m-ctrl__pill oi-m-ctrl__pill--fit" onClick={() => setSearchOpen(true)} aria-label="Search guests"><Search size={18} strokeWidth={1.75} /><span>Search</span></button>
            <button type="button" className="oi-m-ctrl__pill" onClick={() => setSortOpen(true)} aria-label={`Sort: ${SORTS.find((o) => o.value === sort)?.label}`}><ArrowUpDown size={18} strokeWidth={1.75} /><span className="oi-m-ctrl__text">{SORTS.find((o) => o.value === sort)?.label}</span><ChevronDown size={16} strokeWidth={1.75} /></button>
            <button type="button" className={`oi-m-ctrl__pill${filter !== 'all' ? ' oi-m-ctrl__pill--on' : ''}`} onClick={() => setFilterOpen(true)} aria-label={`Filter: ${filters.find((f) => f.key === filter)?.label || 'All'}`}><SlidersHorizontal size={18} strokeWidth={1.75} /><span className="oi-m-ctrl__text">{filters.find((f) => f.key === filter)?.label || 'All'}</span><ChevronDown size={16} strokeWidth={1.75} /></button>
          </div>
        )}
        {weddingEvents.length > 1 && (
          <div style={{ marginTop: 8 }}>
            <FilterPills options={[{ key: 'all', label: 'Every event' }, ...weddingEvents.map((e) => ({ key: e.event_id, label: e.name }))]} value={eventFilter} onChange={onEventFilter} />
          </div>
        )}
        <div className="oi-m-stack" style={{ marginTop: 12 }}>
          {error && !loading ? (
            <ErrorState onRetry={onRetry} />
          ) : loading ? (
            <SkeletonRows count={8} />
          ) : guests.length === 0 ? (
            <EmptyState icon={Users} image={imageUrl('emptyGuests')} text="No guests yet. Add the first one and the rest of the list follows." actionLabel="Add a guest" onAction={onAdd} />
          ) : visible.length === 0 ? (
            <EmptyState icon={Users} text="No guests match this filter." />
          ) : (
            <RowGroup>
              {visible.map((g) => (
                onRemove && !selecting ? (
                  <SwipeRow key={g.id} actions={[{ key: 'remove', icon: SWIPE_ICONS.remove, label: `Remove ${g.name}`, tone: 'no', onAction: () => onRemove(g) }]}>
                    <GuestRow guest={g} event={event} onClick={() => onOpenGuest(g)} role={guestRoles[g.id]} caseSuggestion={!dismissedCase.has(g.id) ? suggestTitleCase(g.name) : null} onRename={onRename} onDismissCase={dismissCase} />
                  </SwipeRow>
                ) : <GuestRow key={g.id} guest={g} event={event} onClick={() => onOpenGuest(g)} selectable={selecting} selected={selected?.has(g.id)} onSelect={onToggleSelect} role={guestRoles[g.id]} />
              ))}
            </RowGroup>
          )}
          {!loading && !error && !selecting && onQuickAdd && (
            <div className="oi-m-card" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input className="oi-m-input" value={quick} onChange={(e) => setQuick(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') quickAdd(); }} placeholder="Quick add a name" autoCapitalize="words" aria-label="Quick add a guest by name" style={{ flex: 1 }} />
              <PillButton variant="primary" size="sm" icon={Plus} onClick={quickAdd} disabled={!quick.trim() || quickBusy}>Add</PillButton>
            </div>
          )}
          {!loading && !error && !selecting && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="oi-m-pill oi-m-pill--secondary oi-m-pill--sm" style={{ flex: 1, minWidth: 0, padding: '0 12px' }} onClick={onAdd}>Add with every detail</button>
              {onImportContacts && <button type="button" className="oi-m-pill oi-m-pill--secondary oi-m-pill--sm" style={{ flex: 1, minWidth: 0, padding: '0 12px' }} onClick={onImportContacts}><BookUser size={18} strokeWidth={1.75} /> From contacts</button>}
            </div>
          )}
          {!loading && !error && !selecting && considerations.row}
        </div>
      </Screen>
      <BottomSheet open={sortOpen} onClose={() => setSortOpen(false)} title="Sort by">
        <RowGroup>{SORTS.map((o) => <Row key={o.value} label={o.label} value={o.value === sort ? 'Chosen' : ''} onClick={() => { setSort(o.value); setSortOpen(false); }} chevron={false} />)}</RowGroup>
      </BottomSheet>
      <BottomSheet open={filterOpen} onClose={() => setFilterOpen(false)} title="Show">
        <RowGroup>{filters.map((f) => <Row key={f.key} label={f.label} sub={typeof f.count === 'number' ? `${f.count} guest${f.count === 1 ? '' : 's'}` : undefined} value={f.key === filter ? 'Chosen' : ''} onClick={() => { onFilter(f.key); setFilterOpen(false); }} chevron={false} />)}</RowGroup>
      </BottomSheet>
      {considerations.sheet}
      <SearchScreen open={searchOpen} onClose={() => { setSearchOpen(false); setQ(''); }} value={q} onChange={setQ} placeholder="Search by name, email or phone">
        {q.trim() === '' ? (
          <p className="oi-m-meta" style={{ padding: 16 }}>Start typing to search your guests.</p>
        ) : results.length === 0 ? (
          <p className="oi-m-meta" style={{ padding: 16 }}>No guests match that.</p>
        ) : (
          <div className="oi-m-stack"><RowGroup>
            {results.map((g) => <GuestRow key={g.id} guest={g} onClick={() => { setSearchOpen(false); setQ(''); onOpenGuest(g); }} />)}
          </RowGroup></div>
        )}
      </SearchScreen>
      <BottomSheet open={actionsOpen} onClose={() => setActionsOpen(false)} title="Guest list">
        <RowGroup>
          <Row icon={Plus} tile="primary" label="Add a guest" onClick={() => { setActionsOpen(false); onAdd(); }} />
          {onImportContacts && <Row icon={BookUser} tile="neutral" label="From contacts" sub="Pick people from your phone's contacts" onClick={() => { setActionsOpen(false); onImportContacts(); }} />}
          <Row icon={CheckSquare} tile="neutral" label="Select guests" sub="Set events, tags, category or dietary for several at once" onClick={() => { setActionsOpen(false); onSelectAll([]); }} />
          <Row icon={Send} tile="neutral" label="Send invites" sub="Save the date, invitation, reminder, update, thank you" onClick={() => { setActionsOpen(false); onSend(); }} />
          {onTemplates && <Row icon={Mail} tile="neutral" label="Email templates" sub="See each email and send it" onClick={() => { setActionsOpen(false); onTemplates(); }} />}
          <Row icon={Upload} tile="neutral" label="Import from a file" sub="CSV or Excel" onClick={() => { setActionsOpen(false); onImport(); }} />
          <Row icon={Download} tile="neutral" label="Export as CSV" onClick={() => { setActionsOpen(false); onExport(); }} />
        </RowGroup>
      </BottomSheet>
    </>
  );
}

function Stat({ n, label, sub, active, onClick }) {
  return (
    <button type="button" className={`oi-m-stat-btn${active ? ' oi-m-stat-btn--on' : ''}`} onClick={onClick} aria-pressed={active}>
      <span className="oi-m-num" style={{ fontSize: 28, lineHeight: '34px' }}>{n}</span>
      <span className="oi-m-meta oi-m-stat-btn__label">{label}</span>
      {sub && <span className="oi-m-meta oi-m-stat-btn__sub">{sub}</span>}
    </button>
  );
}

function summary(counts, event) {
  if (!counts.invited) return event ? 'No one is invited to this event yet.' : 'No invitations sent yet.';
  return counts.awaiting ? `${counts.awaiting} of ${counts.invited} invited still to reply.` : 'Everyone invited has replied.';
}
