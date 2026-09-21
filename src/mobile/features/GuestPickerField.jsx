import React, { useMemo, useState } from 'react';
import { UserRound } from 'lucide-react';
import { BottomSheet, PillButton, Row, RowGroup, TextField } from '../ui';
import { useGuests } from '../data/wedding';
import { initials } from '../lib/format';

/**
 * Pick a person from the guest list, or type a name that is not on it, as
 * WeddingParty.jsx's GuestSearch and ReceivedGifts' giver search do. The
 * value is `{ name, guestId }` (guestId null for a typed name).
 */
export default function GuestPickerField({ label = 'Who', value, onChange, placeholder = 'Search your guest list' }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="oi-m-field">
      <span className="oi-m-field__label">{label}</span>
      {value?.name ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="oi-m-row__tile oi-m-row__tile--tint">{value.guestId ? initials(value.name) : <UserRound size={19} strokeWidth={1.75} />}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="oi-m-row__label">{value.name}</div>
            <div className="oi-m-row__sub">{value.guestId ? 'On the guest list' : 'Not on the guest list'}</div>
          </div>
          <PillButton variant="secondary" size="sm" onClick={() => setOpen(true)}>Change</PillButton>
        </div>
      ) : (
        <PillButton variant="secondary" onClick={() => setOpen(true)} style={{ alignSelf: 'flex-start' }}>Choose someone</PillButton>
      )}
      <GuestPickerSheet open={open} onClose={() => setOpen(false)} onPick={(v) => { onChange(v); setOpen(false); }} placeholder={placeholder} />
    </div>
  );
}

export function GuestPickerSheet({ open, onClose, onPick, placeholder = 'Search your guest list', exclude = [], multi = false, selected = [], title = 'Choose someone' }) {
  const guests = useGuests();
  const [q, setQ] = useState('');
  const list = useMemo(() => {
    const all = (guests.data || []).filter((g) => !exclude.includes(g.id));
    const s = q.trim().toLowerCase();
    return (s ? all.filter((g) => (g.name || '').toLowerCase().includes(s) || (g.email || '').toLowerCase().includes(s)) : all).slice(0, 40);
  }, [guests.data, q, exclude]);
  return (
    <BottomSheet open={open} onClose={onClose} title={title} full>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <TextField label="Name" value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} autoCapitalize="words" autoFocus />
        {q.trim() && !list.some((g) => (g.name || '').toLowerCase() === q.trim().toLowerCase()) && (
          <PillButton variant="secondary" onClick={() => onPick({ name: q.trim(), guestId: null })} style={{ alignSelf: 'flex-start' }}>Use "{q.trim()}" as typed</PillButton>
        )}
        {guests.loading ? <p className="oi-m-meta">Loading your guests</p> : list.length === 0 ? <p className="oi-m-meta">No one matches.</p> : (
          <RowGroup>
            {list.map((g) => <Row key={g.id} initials={initials(g.name)} label={g.name} sub={g.email || g.category || ''} onClick={() => onPick({ name: g.name, guestId: g.id, email: g.email || '' })} chevron={!multi} trailing={multi && selected.includes(g.id) ? <span className="oi-m-status oi-m-status--ok">Chosen</span> : undefined} />)}
          </RowGroup>
        )}
      </div>
    </BottomSheet>
  );
}
