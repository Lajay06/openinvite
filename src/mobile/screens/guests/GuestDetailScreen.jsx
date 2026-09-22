import React from 'react';
import { Mail, Phone, Pencil, Link2, Send, CalendarCheck, Gift } from 'lucide-react';
import Screen from '../../shell/Screen';
import { Row, RowGroup, StatusPill, PillButton, ErrorState, Skeleton } from '../../ui';
import { openExternal } from '../../native';
import { initials, RSVP_LABEL, RSVP_TONE, GUEST_CATEGORY_LABEL, dateShort, money } from '../../lib/format';
import { getGuestEventResponse, mealOptionLabel, effectiveMealChoice } from '@/lib/weddingEvents';
import { hasPlusOne, plusOneRsvpStatus, plusOneDisplayName } from '@/lib/plusOne';

const CHANNEL_LABELS = { email: 'Email', whatsapp: 'WhatsApp', 'email+whatsapp': 'Email and WhatsApp', 'whatsapp+email': 'Email and WhatsApp' };
const EVENT_STATUS = { yes: ['ok', 'Attending'], no: ['no', 'Declined'], pending: ['warn', 'Awaiting reply'] };
const fmtWhen = (iso) => { if (!iso) return ''; const d = new Date(iso); return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }); };

/**
 * A guest's profile: everything the desktop record holds, per event. Owner
 * fix 2. Reply per wedding event (ceremony, reception and every custom
 * event) with meal, plus-one and responded date from event_responses[],
 * the plus-one's own per-event answers, contact rows that open the
 * dialer, mail and WhatsApp, group, tags, table, meal, dietary, plus-one
 * details, address, notes, the invitation history (sent, channel,
 * reminder), the RSVP note and song request, and gifts from this guest.
 * Edit opens the full sheet; Edit events the per-event invite sheet.
 */
export default function GuestDetailScreen({ guest, role = '', weddingEvents = [], mealOptions = [], gifts = [], symbol = '$', back, onEdit, onEditEvents, onDelete, onCopyLink, onSendInvite, loading, error, onRetry }) {
  if (loading) return <Screen title="Guest" back={back}><div className="oi-m-stack oi-m-stack--24"><Skeleton kind="block" /><Skeleton kind="block" /></div></Screen>;
  if (error) return <Screen title="Guest" back={back}><div className="oi-m-stack"><ErrorState what="this guest" onRetry={onRetry} /></div></Screen>;
  if (!guest) return <Screen title="Guest" back={back}><div className="oi-m-stack"><p className="oi-m-body">This guest is not on your list any more.</p></div></Screen>;
  const status = guest.rsvp_status || 'pending';
  const invited = !!guest.invite_sent_at;
  const po = hasPlusOne(guest);
  const poStatus = po ? plusOneRsvpStatus(guest) : null;
  const mealLabel = (id) => (id ? mealOptionLabel(id, mealOptions) || id : '');
  const myGifts = gifts.filter((g) => g.giver_guest_id === guest.id || (g.giver_name && guest.name && g.giver_name.trim().toLowerCase() === guest.name.trim().toLowerCase()));
  const kv = (k, v) => (v ? <div className="oi-m-kv" key={k}><div className="oi-m-kv__k">{k}</div><div className="oi-m-kv__v">{v}</div></div> : null);

  return (
    <Screen title={guest.name || 'Guest'} back={back} actions={[{ icon: Pencil, label: 'Edit guest', onClick: onEdit }]}>
      <div className="oi-m-stack oi-m-stack--24">
        <div className="oi-m-card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span className="oi-m-row__tile" style={{ width: 56, height: 56, fontSize: 17, fontWeight: 600, flexShrink: 0 }}>{initials(guest.name)}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="oi-m-item__title" style={{ whiteSpace: 'normal' }}>{guest.name}</div>
            <div className="oi-m-meta">{[role, invited ? `Invited ${fmtWhen(guest.invite_sent_at)}` : 'Not invited yet', guest.category ? (GUEST_CATEGORY_LABEL[guest.category] || guest.category) : ''].filter(Boolean).join(', ')}</div>
          </div>
          <StatusPill tone={invited || status !== 'pending' ? RSVP_TONE[status] || 'neutral' : 'neutral'}>{invited || status !== 'pending' ? RSVP_LABEL[status] || status : 'Not invited'}</StatusPill>
        </div>

        <section>
          <div className="oi-m-section-head">
            <h2 className="oi-m-section">Reply by event</h2>
            {weddingEvents.length > 0 && <button type="button" className="oi-m-block__link" onClick={onEditEvents}>Edit events</button>}
          </div>
          {weddingEvents.length === 0 ? <div className="oi-m-card"><p className="oi-m-meta">No events set up for this wedding yet.</p></div> : (
            <div className="oi-m-card oi-m-card--flush">
              {weddingEvents.map((ev) => {
                const r = getGuestEventResponse(guest, ev);
                const [tone, label] = EVENT_STATUS[r.status] || EVENT_STATUS.pending;
                const poNames = (r.plus_one_names || []).filter(Boolean).join(', ') || (r.plus_ones > 0 ? `${r.plus_ones} guest${r.plus_ones > 1 ? 's' : ''}` : '');
                const poOwn = (guest.plus_one_event_responses || []).find((x) => x.event_id === ev.event_id);
                const poMeal = poOwn?.meal_choice ? mealLabel(poOwn.meal_choice) : '';
                return (
                  <div className="oi-m-reply" key={ev.event_id}>
                    <div className="oi-m-reply__body">
                      <div className="oi-m-row__label oi-m-row__label--wrap">{ev.name}</div>
                      {r.invited ? (
                        <div className="oi-m-row__sub" style={{ whiteSpace: "normal" }}>{[r.meal_choice ? `Meal: ${mealLabel(r.meal_choice)}` : '', poNames ? `Plus one: ${poNames}${poMeal ? ` (${poMeal})` : ''}` : '', r.responded_at ? `Replied ${fmtWhen(r.responded_at)}` : ''].filter(Boolean).join(', ') || 'No reply yet'}</div>
                      ) : <div className="oi-m-row__sub">Not invited to this one</div>}
                    </div>
                    {r.invited ? <StatusPill tone={tone}>{label}</StatusPill> : <StatusPill tone="neutral">Not invited</StatusPill>}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section>
          <h2 className="oi-m-section" style={{ marginBottom: 12 }}>Contact</h2>
          {guest.email || guest.phone ? (
            <RowGroup>
              {/* Contact details are shown, not dialed into email or WhatsApp: guests are reached through Send invites (owner decision, goal 6). A call stays. */}
              {guest.email && <Row icon={Mail} tile="neutral" label={guest.email} sub="Email" chevron={false} />}
              {guest.phone && <Row icon={Phone} tile="neutral" label={guest.phone} sub="Call" onClick={() => openExternal(`tel:${guest.phone}`)} chevron={false} />}
            </RowGroup>
          ) : <div className="oi-m-card"><p className="oi-m-meta">No email or phone yet. Add one to send an invitation.</p></div>}
        </section>

        <section>
          <h2 className="oi-m-section" style={{ marginBottom: 12 }}>Details</h2>
          <div className="oi-m-card oi-m-card--flush">
            {kv('Group', GUEST_CATEGORY_LABEL[guest.category] || guest.category)}
            {kv('Tags', (guest.tags || []).join(', '))}
            {kv('Table', guest.table_assignment)}
            {kv('Meal', mealLabel(effectiveMealChoice(guest.event_responses, guest.meal_choice)))}
            {kv('Dietary', guest.dietary_restrictions)}
            {kv('Postal address', guest.mailing_address)}
            {kv('Notes', guest.notes)}
            {kv('Special requests', guest.special_requests)}
            {!guest.category && !(guest.tags || []).length && !guest.table_assignment && !guest.dietary_restrictions && !guest.mailing_address && !guest.notes && <div className="oi-m-kv"><div className="oi-m-kv__v" style={{ color: 'var(--m-text-2)' }}>Nothing else recorded yet. Edit to add a group, a table, dietary needs or an address.</div></div>}
          </div>
        </section>

        <section>
          <h2 className="oi-m-section" style={{ marginBottom: 12 }}>Plus one</h2>
          <div className="oi-m-card oi-m-card--flush">
            {guest.plus_one ? (
              <>
                <div className="oi-m-kv"><div className="oi-m-kv__k">Who</div><div className="oi-m-kv__v" style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><span>{po ? plusOneDisplayName(guest) : guest.plus_one_name || 'Not named yet'}</span>{poStatus && <StatusPill tone={RSVP_TONE[poStatus] || 'neutral'}>{RSVP_LABEL[poStatus] || poStatus}</StatusPill>}</div></div>
                {kv('Email', guest.plus_one_email)}
                {kv('Meal', mealLabel(effectiveMealChoice(guest.plus_one_event_responses, guest.plus_one_meal_choice)))}
                {kv('Dietary', guest.plus_one_dietary_restrictions)}
              </>
            ) : <div className="oi-m-kv"><div className="oi-m-kv__v" style={{ color: 'var(--m-text-2)' }}>No plus one.</div></div>}
          </div>
        </section>

        <section>
          <h2 className="oi-m-section" style={{ marginBottom: 12 }}>Invitations and messages</h2>
          <div className="oi-m-card oi-m-card--flush">
            {kv('Invitation sent', invited ? `${fmtWhen(guest.invite_sent_at)}${guest.invite_channel ? ` by ${CHANNEL_LABELS[guest.invite_channel] || guest.invite_channel}` : ''}` : '')}
            {kv('Reminder sent', guest.reminder_sent_at ? fmtWhen(guest.reminder_sent_at) : '')}
            {kv('Replied', guest.rsvp_date ? fmtWhen(guest.rsvp_date) : '')}
            {kv('Their note', guest.rsvp_note)}
            {kv('Song request', guest.song_request)}
            {!invited && !guest.rsvp_note && !guest.song_request && <div className="oi-m-kv"><div className="oi-m-kv__v" style={{ color: 'var(--m-text-2)' }}>Nothing sent yet.</div></div>}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            {onSendInvite && <PillButton variant="secondary" size="sm" icon={Send} onClick={onSendInvite}>{invited ? 'Send again' : (guest.event_responses || []).length ? 'Send invitation' : 'Set events and send'}</PillButton>}
            {onCopyLink && <PillButton variant="secondary" size="sm" icon={Link2} onClick={onCopyLink}>Copy RSVP link</PillButton>}
            {onEditEvents && <PillButton variant="secondary" size="sm" icon={CalendarCheck} onClick={onEditEvents}>Edit events</PillButton>}
          </div>
        </section>

        <section>
          <h2 className="oi-m-section" style={{ marginBottom: 12 }}>Gifts</h2>
          {myGifts.length === 0 ? <div className="oi-m-card"><p className="oi-m-meta">No gift recorded from {guest.name ? guest.name.split(' ')[0] : 'this guest'} yet.</p></div> : (
            <RowGroup>
              {myGifts.map((g) => <Row key={g.id} icon={Gift} tile="tint" label={g.item_name || 'Gift'} sub={[g.received_date ? `Received ${dateShort(g.received_date)}` : g.delivery_status === 'expected' ? 'Expected' : '', g.thank_you_sent ? 'Thanked' : 'Thank you to send'].filter(Boolean).join(', ')} value={g.estimated_value ? money(g.estimated_value, symbol) : ''} chevron={false} />)}
            </RowGroup>
          )}
        </section>

        <PillButton variant="secondary" block icon={Pencil} onClick={onEdit}>Edit guest</PillButton>
        {onDelete && <button type="button" className="oi-m-pill oi-m-pill--ghost oi-m-pill--block" style={{ color: 'var(--m-primary)' }} onClick={onDelete}>Remove this guest</button>}
      </div>
    </Screen>
  );
}
