import React, { useMemo, useState } from 'react';
import { Search, Plus, Users } from 'lucide-react';
import Screen from '../../shell/Screen';
import { FilterPills, SearchScreen, SkeletonRows, ErrorState, EmptyState, StatusPill } from '../../ui';
import { isAttending, isDeclined, isPending, isAwaitingPrimary } from '@/lib/guestRsvpTally';
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

/** One guest row: initials tile, name, sub line, status pill. */
export function GuestRow({ guest, onClick }) {
  const status = guest.invite_sent_at || !isPending(guest) ? (guest.rsvp_status || 'pending') : null;
  const sub = [GUEST_CATEGORY_LABEL[guest.category], guest.plus_one ? 'Plus one' : '', guest.email].filter(Boolean).join(' · ');
  return (
    <button type="button" className="oi-m-row oi-m-row--pressable" onClick={onClick}>
      <span className="oi-m-row__tile" style={{ fontSize: 14, fontWeight: 600 }}>{initials(guest.name)}</span>
      <div className="oi-m-row__body">
        <div className="oi-m-row__label">{guest.name || 'Unnamed guest'}</div>
        {sub && <div className="oi-m-row__sub">{sub}</div>}
      </div>
      {status ? (
        <StatusPill tone={RSVP_TONE[status] || 'neutral'}>{RSVP_LABEL[status] || status}</StatusPill>
      ) : (
        <StatusPill tone="neutral">Not invited</StatusPill>
      )}
    </button>
  );
}

/**
 * The guest list. props: guests, filter, onFilter, onOpenGuest, onAdd,
 * loading, error, onRetry, groupings (extra filter pills from tags).
 */
export default function GuestsScreen({ guests = [], filter = 'all', onFilter, onOpenGuest, onAdd, loading, error, onRetry, groupings = [] }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState('');

  const filters = useMemo(() => {
    const counts = {
      all: guests.length,
      attending: applyGuestFilter(guests, 'attending').length,
      awaiting: applyGuestFilter(guests, 'awaiting').length,
      declined: applyGuestFilter(guests, 'declined').length,
      not_invited: applyGuestFilter(guests, 'not_invited').length,
    };
    return [...GUEST_FILTERS.map((f) => ({ ...f, count: counts[f.key] })), ...groupings];
  }, [guests, groupings]);

  const visible = useMemo(() => {
    const grouping = groupings.find((g) => g.key === filter);
    return grouping ? guests.filter(grouping.test) : applyGuestFilter(guests, filter);
  }, [guests, filter, groupings]);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    return guests.filter((g) => [g.name, g.email, g.phone, g.plus_one_name].some((v) => (v || '').toLowerCase().includes(s)));
  }, [guests, q]);

  return (
    <>
      <Screen
        title="Guests"
        subtitle={loading ? '' : `${guests.length} guest${guests.length === 1 ? '' : 's'}`}
        actions={[
          { icon: Search, label: 'Search guests', onClick: () => setSearchOpen(true) },
          { icon: Plus, label: 'Add a guest', onClick: onAdd },
        ]}
      >
        <FilterPills options={filters} value={filter} onChange={onFilter} />
        <div className="oi-m-stack" style={{ marginTop: 8 }}>
          {error && !loading ? (
            <ErrorState onRetry={onRetry} />
          ) : loading ? (
            <SkeletonRows count={8} />
          ) : guests.length === 0 ? (
            <EmptyState icon={Users} text="No guests yet. Add the first one and the rest of the list follows." actionLabel="Add a guest" onAction={onAdd} />
          ) : visible.length === 0 ? (
            <EmptyState icon={Users} text="No guests match this filter." />
          ) : (
            <div className="oi-m-block oi-m-block--flush">
              {visible.map((g) => <GuestRow key={g.id} guest={g} onClick={() => onOpenGuest(g)} />)}
            </div>
          )}
        </div>
      </Screen>
      <SearchScreen open={searchOpen} onClose={() => { setSearchOpen(false); setQ(''); }} value={q} onChange={setQ} placeholder="Search by name, email or phone">
        {q.trim() === '' ? (
          <p className="oi-m-meta" style={{ padding: 16 }}>Start typing to search your guests.</p>
        ) : results.length === 0 ? (
          <p className="oi-m-meta" style={{ padding: 16 }}>No guests match that.</p>
        ) : (
          <div className="oi-m-block oi-m-block--flush">
            {results.map((g) => <GuestRow key={g.id} guest={g} onClick={() => { setSearchOpen(false); setQ(''); onOpenGuest(g); }} />)}
          </div>
        )}
      </SearchScreen>
    </>
  );
}
