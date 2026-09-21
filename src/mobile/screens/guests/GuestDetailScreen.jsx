import React from 'react';
import { Pencil, Mail, Phone, Users, Utensils, Armchair, UserPlus } from 'lucide-react';
import Screen from '../../shell/Screen';
import { Row, RowGroup, StatusPill, PillButton } from '../../ui';
import { initials } from '../../lib/format';
import { isPending } from '@/lib/guestRsvpTally';
import { RSVP_LABEL, RSVP_TONE, GUEST_CATEGORY_LABEL } from '../../lib/format';
import { openExternal } from '../../native';

/** One guest. props: guest, onEdit, onDelete, back */
export default function GuestDetailScreen({ guest, onEdit, onDelete, back }) {
  if (!guest) {
    return (
      <Screen title="Guest" back={back}>
        <div className="oi-m-stack"><p className="oi-m-meta">This guest could not be found.</p></div>
      </Screen>
    );
  }
  const status = guest.rsvp_status || 'pending';
  const invited = !!guest.invite_sent_at || !isPending(guest);
  return (
    <Screen title={guest.name || 'Guest'} back={back} actions={[{ icon: Pencil, label: 'Edit guest', onClick: onEdit }]}>
      <div className="oi-m-stack oi-m-stack--24">
        <div className="oi-m-card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span className="oi-m-row__tile oi-m-row__tile--tint" style={{ width: 56, height: 56, fontSize: 17 }}>{initials(guest.name)}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="oi-m-body oi-m-strong">{guest.name}</div>
            <div className="oi-m-meta">{invited ? 'Invited' : 'Not yet invited'}</div>
          </div>
          {invited ? <StatusPill tone={RSVP_TONE[status]}>{RSVP_LABEL[status]}</StatusPill> : <StatusPill tone="neutral">Not invited</StatusPill>}
        </div>

        <RowGroup>
          {guest.email && <Row icon={Mail} label={guest.email} sub="Email" onClick={() => openExternal(`mailto:${guest.email}`)} chevron={false} />}
          {guest.phone && <Row icon={Phone} label={guest.phone} sub="Phone" onClick={() => openExternal(`tel:${guest.phone}`)} chevron={false} />}
          {guest.category && <Row icon={Users} label={GUEST_CATEGORY_LABEL[guest.category] || guest.category} sub="Group" />}
          {guest.plus_one && <Row icon={UserPlus} label={guest.plus_one_name || 'Plus one'} sub="Plus one" />}
          {guest.dietary_requirements && <Row icon={Utensils} label={guest.dietary_requirements} sub="Dietary" />}
          {guest.table_assignment && <Row icon={Armchair} label={guest.table_assignment} sub="Table" />}
          {!guest.email && !guest.phone && !guest.category && !guest.plus_one && !guest.dietary_requirements && !guest.table_assignment && (
            <div style={{ padding: 16 }}><p className="oi-m-meta">Nothing else on file yet. Add an email so they can be invited.</p></div>
          )}
        </RowGroup>

        <PillButton variant="secondary" block icon={Pencil} onClick={onEdit}>Edit guest</PillButton>
        {onDelete && (
          <button type="button" className="oi-m-pill oi-m-pill--ghost oi-m-pill--block" style={{ color: 'var(--m-primary)' }} onClick={onDelete}>
            Remove this guest
          </button>
        )}
      </div>
    </Screen>
  );
}
