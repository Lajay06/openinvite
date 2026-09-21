import React, { useMemo, useState } from 'react';
import { Search, Plus, Users, MoreHorizontal, Upload, Download, Send, CheckSquare, X } from 'lucide-react';
import Screen from '../../shell/Screen';
import { FilterPills, SearchScreen, SkeletonRows, ErrorState, EmptyState, StatusPill, ProgressBar, RowGroup, SwipeRow, SWIPE_ICONS, BottomSheet, Row, Checkbox, PillButton } from '../../ui';
import { imageUrl } from '../../images';
import { isAttending, isDeclined, isPending, isAwaitingPrimary } from '@/lib/guestRsvpTally';
import { getGuestEventResponse } from '@/lib/weddingEvents';
import { initials, RSVP_LABEL, RSVP_TONE, GUEST_CATEGORY_LABEL } from '../../lib/format';

export const GUEST_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'attending', label: 'Attending' },
  { key: 'awaiting', label: 'Awaiting' },
  { key: 'declined', label: 'Declined' },
  { key: 'not_invited', label: 'Not yet invited' },
];

export function applyGuestFilter(list, key) {
  switch (key) {
    case 'attending': return list.filter(isAttending);
    case 'declined': return list.filter(isDeclined);
    case 'awaiting': return list.filter(isAwaitingPrimary);
    case 'not_invited': return list.filter((g) => !g.invite_sent_at && isPending(g));
    default: return list;
  }
}

const EVENT_STATUS = { yes: ['ok', 'Yes'], no: ['no', 'No'], pending: ['warn', 'Awaiting'] };

/** One guest row: initials tile, name, sub line, status pill (per event when an event filter is on). */
export function GuestRow({ guest, onClick, event, selectable, selected, onSelect }) {
  const status = guest.invite_sent_at || !isPending(guest) ? (guest.rsvp_status || 'pending') : null;
  const sub = [GUEST_CATEGORY_LABEL[guest.category], guest.plus_one ? 'Plus one' : '', guest.email].filter(Boolean).join(', ');
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
    </div>
  );
}

/**
 * The guest list: stats, status filters, an event filter, tag groupings,
 * search, select mode with the bulk actions, import, export, send.
 */
export default function GuestsScreen({ guests = [], filter = 'all', onFilter, eventFilter = 'all', onEventFilter, weddingEvents = [], onOpenGuest, onAdd, onRemove, onImport, onExport, onSend, selected, onToggleSelect, onSelectAll, onClearSelection, onBulk, loading, error, onRetry, groupings = [], back, onRefresh }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [q, setQ] = useState('');
  const selecting = !!selected;

  const filters = useMemo(() => {
    const counts = { all: guests.length, attending: applyGuestFilter(guests, 'attending').length, awaiting: applyGuestFilter(guests, 'awaiting').length, declined: applyGuestFilter(guests, 'declined').length, not_invited: applyGuestFilter(guests, 'not_invited').length };
    return [...GUEST_FILTERS.map((f) => ({ ...f, count: counts[f.key] })), ...groupings];
  }, [guests, groupings]);
  const event = eventFilter !== 'all' ? weddingEvents.find((e) => e.event_id === eventFilter) : null;

  const visible = useMemo(() => {
    const grouping = groupings.find((g) => g.key === filter);
    let list = grouping ? guests.filter(grouping.test) : applyGuestFilter(guests, filter);
    if (event) list = list.filter((g) => getGuestEventResponse(g, event).invited);
    return list;
  }, [guests, filter, groupings, event]);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    return guests.filter((g) => [g.name, g.email, g.phone, g.plus_one_name].some((v) => (v || '').toLowerCase().includes(s)));
  }, [guests, q]);

  const actions = selecting
    ? [{ icon: X, label: 'Done selecting', onClick: onClearSelection }]
    : [{ icon: Search, label: 'Search guests', onClick: () => setSearchOpen(true) }];

  return (
    <>
      <Screen
        title={selecting ? `${selected.size} selected` : 'Guests'}
        subtitle={loading ? '' : selecting ? 'Tap guests to add them' : `${guests.length} guest${guests.length === 1 ? '' : 's'}`}
        bell={!back && !selecting}
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
              <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
                <Stat n={filters[1].count} label="Attending" />
                <Stat n={filters[3].count} label="Declined" />
                <Stat n={filters[2].count} label="Awaiting" />
              </div>
              <ProgressBar value={filters[1].count + filters[3].count} max={guests.filter((g) => g.invite_sent_at).length} note={summary(guests, filters)} />
              {/* The tab root keeps the bell top right, so the list's actions live here, not in the header. */}
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <PillButton variant="primary" size="sm" icon={Plus} onClick={onAdd} style={{ flex: 1 }}>Add a guest</PillButton>
                <PillButton variant="secondary" size="sm" icon={MoreHorizontal} onClick={() => setActionsOpen(true)} style={{ flex: 1 }}>More</PillButton>
              </div>
            </div>
          </div>
        )}
        <FilterPills options={filters} value={filter} onChange={onFilter} />
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
                    <GuestRow guest={g} event={event} onClick={() => onOpenGuest(g)} />
                  </SwipeRow>
                ) : <GuestRow key={g.id} guest={g} event={event} onClick={() => onOpenGuest(g)} selectable={selecting} selected={selected?.has(g.id)} onSelect={onToggleSelect} />
              ))}
            </RowGroup>
          )}
          {!loading && !error && !selecting && (
            <button type="button" className="oi-m-pill oi-m-pill--primary oi-m-pill--block" onClick={onAdd}>Add a guest</button>
          )}
        </div>
      </Screen>
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
          <Row icon={CheckSquare} tile="neutral" label="Select guests" sub="Set events, tags, category or dietary for several at once" onClick={() => { setActionsOpen(false); onSelectAll([]); }} />
          <Row icon={Send} tile="neutral" label="Send invites" sub="Save the date, invitation, reminder, update, thank you" onClick={() => { setActionsOpen(false); onSend(); }} />
          <Row icon={Upload} tile="neutral" label="Import from a file" sub="CSV or Excel" onClick={() => { setActionsOpen(false); onImport(); }} />
          <Row icon={Download} tile="neutral" label="Export as CSV" onClick={() => { setActionsOpen(false); onExport(); }} />
        </RowGroup>
      </BottomSheet>
    </>
  );
}

function Stat({ n, label }) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div className="oi-m-num" style={{ fontSize: 28, lineHeight: '34px' }}>{n}</div>
      <div className="oi-m-meta">{label}</div>
    </div>
  );
}

function summary(guests, filters) {
  const invited = guests.filter((g) => g.invite_sent_at).length;
  if (!invited) return 'No invitations sent yet.';
  const awaiting = filters[2].count;
  return awaiting ? `${awaiting} of ${invited} invited guests still to reply.` : 'Everyone you invited has replied.';
}
