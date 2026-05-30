import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { Mail, Copy, RefreshCw, Check, Loader2, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import SendInvitesModal from './SendInvitesModal';

const F = { fontFamily: "'Plus Jakarta Sans', sans-serif" };
const RSVP_BASE = `${window.location.origin}/rsvp/`;
function buildRsvpUrl(token) { return RSVP_BASE + token; }

// ── WhatsApp SVG icon ────────────────────────────────────────────────────────
function WhatsAppIcon({ size = 14, color = '#25D366' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

// ── Status badges ─────────────────────────────────────────────────────────────
const BADGE_BASE = {
  fontSize: 10, fontWeight: 700, borderRadius: 999,
  padding: '3px 9px', letterSpacing: '0.08em',
  display: 'inline-block', whiteSpace: 'nowrap', ...F,
};

function InviteStatusBadge({ guest }) {
  if (guest.invite_sent_at) {
    return <span style={{ ...BADGE_BASE, color: '#16A34A', background: '#DCFCE7' }}>Sent</span>;
  }
  return <span style={{ ...BADGE_BASE, color: 'rgba(10,10,10,0.4)', background: 'rgba(10,10,10,0.06)' }}>Not sent</span>;
}

// RSVP pill colours match GuestList exactly
const RSVP_STYLES = {
  attending: { background: '#DDF762', color: '#0A1930' },
  declined:  { background: '#E03553', color: '#FFFFFF' },
  pending:   { background: 'rgba(10,10,10,0.07)', color: '#444444' },
  maybe:     { background: '#803D81', color: '#FFFFFF' },
};

function RSVPStatusBadge({ status }) {
  const style = RSVP_STYLES[status] || RSVP_STYLES.pending;
  return <span style={{ ...BADGE_BASE, ...style }}>{status || 'pending'}</span>;
}

// ── Channel icon pair ─────────────────────────────────────────────────────────
function EmailChannelIcon({ channel }) {
  const sent = channel === 'email' || channel === 'email+whatsapp' || channel === 'whatsapp+email';
  return (
    <div title={sent ? 'Sent via email' : 'Not sent via email'}
         style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Mail size={14} color={sent ? '#E03553' : 'rgba(10,10,10,0.2)'} strokeWidth={sent ? 2 : 1.5} />
    </div>
  );
}

function WAChannelIcon({ channel }) {
  const sent = channel === 'whatsapp' || channel === 'email+whatsapp' || channel === 'whatsapp+email';
  return (
    <div title={sent ? 'Sent via WhatsApp' : 'Not sent via WhatsApp'}
         style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <WhatsAppIcon size={14} color={sent ? '#25D366' : 'rgba(10,10,10,0.2)'} />
    </div>
  );
}

// ── Dietary pill badges (matches GuestList) ───────────────────────────────────
const DIETARY_COLOURS = {
  'Vegetarian':        { background: '#D1FAE5', color: '#065F46' },
  'Vegan':             { background: '#A7F3D0', color: '#064E3B' },
  'Gluten free':       { background: '#FEF3C7', color: '#92400E' },
  'Dairy free':        { background: '#DBEAFE', color: '#1E40AF' },
  'Halal':             { background: '#EDE9FE', color: '#5B21B6' },
  'Kosher':            { background: '#EDE9FE', color: '#5B21B6' },
  'Nut allergy':       { background: '#FFEDD5', color: '#9A3412' },
  'Shellfish allergy': { background: '#FFEDD5', color: '#9A3412' },
  'Other':             { background: 'rgba(10,10,10,0.06)', color: '#444444' },
};

const dietaryPillStyle = {
  display: 'inline-block', fontFamily: "'Plus Jakarta Sans', sans-serif",
  fontSize: 9, fontWeight: 700, letterSpacing: '0.06em',
  padding: '2px 7px', borderRadius: 999, whiteSpace: 'nowrap', lineHeight: 1.4,
};

function parseDietaryList(str) {
  if (!str || !str.trim()) return [];
  return str.split(',').map(s => {
    const t = s.trim();
    return t.startsWith('Other: ') ? 'Other' : t;
  }).filter(t => t && t !== 'None');
}

function DietaryCell({ value }) {
  const items = parseDietaryList(value);
  if (items.length === 0) return <span style={{ fontSize: 13, color: 'rgba(10,10,10,0.25)', ...F }}>—</span>;
  const first = items[0];
  const rest = items.length - 1;
  const colours = DIETARY_COLOURS[first] || DIETARY_COLOURS['Other'];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }} title={items.join(', ')}>
      <span style={{ ...dietaryPillStyle, ...colours }}>{first}</span>
      {rest > 0 && <span style={{ ...dietaryPillStyle, background: 'rgba(10,10,10,0.06)', color: '#444444' }}>+{rest}</span>}
    </span>
  );
}

// ── Guest avatar (matches GuestList) ─────────────────────────────────────────
const AVATAR_COLOURS = [
  '#E8B4B8', '#B4C8E8', '#B4E8C8', '#D4B4E8',
  '#E8D4B4', '#B4E8E8', '#E8C8B4', '#C8E8B4',
];

function nameColour(name) {
  const str = name || '';
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return AVATAR_COLOURS[h % AVATAR_COLOURS.length];
}

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function GuestAvatar({ name }) {
  return (
    <div style={{
      width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
      background: nameColour(name),
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: '#FFFFFF', fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1 }}>
        {getInitials(name)}
      </span>
    </div>
  );
}

function fmt(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Grid layout ───────────────────────────────────────────────────────────────
// Guest | Invite | Sent | RSVP | RSVPd on | ✉ | WA | Diet | Actions
const GRID = 'minmax(200px,1fr) 82px 100px 88px 100px 32px 32px 110px 80px';

const FILTER_TABS = [
  { val: 'all',       label: 'All' },
  { val: 'not_sent',  label: 'Not sent' },
  { val: 'sent',      label: 'Sent' },
  { val: 'awaiting',  label: 'Awaiting RSVP' },
  { val: 'rsvpd',     label: 'RSVPd' },
];

export default function InvitationsTab({ guests, loadGuests, loading }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const plan = user?.plan || 'free';
  const isPro = plan === 'pro';

  const [activeFilter, setActiveFilter] = useState('all');
  const [showDrawer, setShowDrawer]       = useState(false);
  const [drawerFilter, setDrawerFilter]   = useState('not_invited');
  const [drawerIsReminder, setDrawerIsReminder] = useState(false);
  const [copiedId, setCopiedId]           = useState(null);

  const stats = useMemo(() => {
    const total    = guests.length;
    const sent     = guests.filter(g => g.invite_sent_at).length;
    const awaiting = guests.filter(g => g.invite_sent_at && (!g.rsvp_status || g.rsvp_status === 'pending')).length;
    const attending = guests.filter(g => g.rsvp_status === 'attending').length;
    const declined  = guests.filter(g => g.rsvp_status === 'declined').length;
    return { total, sent, awaiting, attending, declined };
  }, [guests]);

  const filteredGuests = useMemo(() => {
    if (activeFilter === 'not_sent') return guests.filter(g => !g.invite_sent_at);
    if (activeFilter === 'sent')     return guests.filter(g => g.invite_sent_at);
    if (activeFilter === 'awaiting') return guests.filter(g => g.invite_sent_at && (!g.rsvp_status || g.rsvp_status === 'pending'));
    if (activeFilter === 'rsvpd')    return guests.filter(g => g.rsvp_status === 'attending' || g.rsvp_status === 'declined');
    return guests;
  }, [guests, activeFilter]);

  const handleCopyLink = async (guest) => {
    let token = guest.rsvp_link_id;
    if (!token) {
      token = crypto.randomUUID();
      await base44.entities.Guest.update(guest.id, { rsvp_link_id: token });
    }
    await navigator.clipboard.writeText(buildRsvpUrl(token));
    setCopiedId(guest.id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success('RSVP link copied');
  };

  const openSend = (filter = 'not_invited', reminder = false) => {
    setDrawerFilter(filter);
    setDrawerIsReminder(reminder);
    setShowDrawer(true);
  };

  const STATS = [
    { label: 'Total invited',  value: stats.total },
    { label: 'Sent',           value: stats.sent },
    { label: 'Awaiting RSVP',  value: stats.awaiting },
    { label: 'RSVPd yes',      value: stats.attending },
    { label: 'RSVPd no',       value: stats.declined },
  ];

  const statLbl = { fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)', margin: '0 0 8px', ...F };
  const statVal = { fontSize: 'clamp(20px,2.5vw,30px)', fontWeight: 700, color: '#0A0A0A', lineHeight: 1, margin: 0, ...F };
  const upgradeTooltip = 'Upgrade to Ultra to send invitations';

  return (
    <div>
      {/* Pro upgrade banner */}
      {isPro && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
          background: '#FFFBEB', border: '1px solid rgba(245,158,11,0.25)',
          padding: '10px 16px', marginBottom: 20, borderRadius: 2,
        }}>
          <p style={{ fontSize: 13, color: '#92400E', margin: 0, lineHeight: 1.5, ...F }}>
            ✨ Invites is an Ultra feature — upgrade to send beautiful digital invitations via email and WhatsApp
          </p>
          <button
            onClick={() => navigate('/account')}
            style={{
              fontSize: 12, fontWeight: 700, color: '#FFFFFF', flexShrink: 0,
              background: 'linear-gradient(135deg, #FBBF24, #F59E0B)',
              border: 'none', borderRadius: 999, padding: '6px 16px',
              cursor: 'pointer', ...F,
            }}
          >
            Upgrade
          </button>
        </div>
      )}

      {/* Stats strip */}
      <div style={{ display: 'flex', flexWrap: 'wrap', border: '1px solid rgba(10,10,10,0.08)', marginBottom: 24 }}>
        {STATS.map((s, i) => (
          <div key={s.label} style={{ flex: '1 1 18%', minWidth: 100, padding: '16px 20px', borderRight: i < STATS.length - 1 ? '1px solid rgba(10,10,10,0.08)' : 'none' }}>
            <p style={statLbl}>{s.label.toUpperCase()}</p>
            {loading
              ? <div style={{ width: 40, height: 24, background: 'rgba(10,10,10,0.06)' }} />
              : <p style={statVal}>{s.value}</p>
            }
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginBottom: 20 }}>
        <span title={isPro ? upgradeTooltip : undefined} style={isPro ? { cursor: 'not-allowed', display: 'inline-flex' } : {}}>
          <button
            onClick={isPro ? undefined : () => openSend('pending', true)}
            disabled={isPro}
            className="btn-editorial-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: 6, ...(isPro ? { opacity: 0.4, pointerEvents: 'none' } : {}) }}
          >
            <RefreshCw size={13} />
            Send reminders
          </button>
        </span>
        <span title={isPro ? upgradeTooltip : undefined} style={isPro ? { cursor: 'not-allowed', display: 'inline-flex' } : {}}>
          <button
            onClick={isPro ? undefined : () => openSend('not_invited', false)}
            disabled={isPro}
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: 6, ...(isPro ? { opacity: 0.4, pointerEvents: 'none' } : {}) }}
          >
            <Send size={13} />
            Send invitations
          </button>
        </span>
      </div>

      {/* Filter tabs */}
      <div style={{
        display: 'flex', gap: 0, borderBottom: '1px solid rgba(10,10,10,0.08)', marginBottom: 20,
        opacity: isPro ? 0.4 : 1, pointerEvents: isPro ? 'none' : undefined,
      }}>
        {FILTER_TABS.map(tab => (
          <button
            key={tab.val}
            onClick={() => setActiveFilter(tab.val)}
            style={{
              padding: '8px 16px', border: 'none', background: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: activeFilter === tab.val ? 700 : 500,
              color: activeFilter === tab.val ? '#0A0A0A' : 'rgba(10,10,10,0.45)',
              borderBottom: `2px solid ${activeFilter === tab.val ? '#E03553' : 'transparent'}`,
              marginBottom: -1, ...F,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table — horizontally scrollable on small screens */}
      <div style={{ overflowX: 'auto' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
            <Loader2 size={24} style={{ animation: 'inv-spin 0.8s linear infinite', color: 'rgba(10,10,10,0.3)' }} />
          </div>
        ) : filteredGuests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '56px 0' }}>
            <div style={{ width: 44, height: 44, background: 'rgba(10,10,10,0.05)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <Mail size={20} color="rgba(10,10,10,0.3)" strokeWidth={1.5} />
            </div>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#0A0A0A', margin: '0 0 6px', ...F }}>No guests here</p>
            <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.45)', margin: '0 0 16px', ...F }}>
              {activeFilter === 'not_sent' ? 'All guests have been sent invitations.' : 'No guests match this filter.'}
            </p>
            {activeFilter !== 'not_sent' && activeFilter !== 'all' && (
              <button onClick={() => setActiveFilter('all')} style={{ fontSize: 13, color: '#E03553', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, ...F }}>
                View all guests
              </button>
            )}
          </div>
        ) : (
          <div style={{ minWidth: 760 }}>
            {/* Header row */}
            <div style={{ display: 'grid', gridTemplateColumns: GRID, gap: 8, padding: '8px 12px', background: 'rgba(10,10,10,0.02)', borderBottom: '1px solid rgba(10,10,10,0.06)', marginBottom: 2, alignItems: 'center' }}>
              {['Guest', 'Invite', 'Sent', 'RSVP', 'RSVPd on', '✉', 'WA', 'Diet', ''].map((h, i) => (
                <span key={i} style={{ fontSize: 10, fontWeight: 700, color: 'rgba(10,10,10,0.4)', letterSpacing: '0.08em', textAlign: i >= 5 && i <= 7 ? 'center' : 'left', ...F }}>{h}</span>
              ))}
            </div>

            {/* Data rows */}
            {filteredGuests.map(g => (
              <div
                key={g.id}
                style={{
                  display: 'grid', gridTemplateColumns: GRID,
                  gap: 8, padding: '12px 12px', borderBottom: '1px solid rgba(10,10,10,0.04)',
                  alignItems: 'center', transition: 'background 0.1s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#FAFAFA'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                {/* Guest: name bold, email + phone on second line */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <GuestAvatar name={g.name} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', ...F }}>
                      {g.name}
                    </p>
                    {(g.email || g.phone) && (
                      <p style={{ fontSize: 11, color: 'rgba(10,10,10,0.45)', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', ...F }}>
                        {[g.email, g.phone].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                </div>

                {/* Invite status */}
                <div><InviteStatusBadge guest={g} /></div>

                {/* Sent date */}
                <span style={{ fontSize: 12, color: 'rgba(10,10,10,0.55)', ...F }}>{fmt(g.invite_sent_at)}</span>

                {/* RSVP status */}
                <div><RSVPStatusBadge status={g.rsvp_status} /></div>

                {/* RSVP date */}
                <span style={{ fontSize: 12, color: 'rgba(10,10,10,0.55)', ...F }}>{fmt(g.rsvp_date)}</span>

                {/* Email channel icon */}
                <EmailChannelIcon channel={g.invite_channel} />

                {/* WhatsApp channel icon */}
                <WAChannelIcon channel={g.invite_channel} />

                {/* Dietary */}
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <DietaryCell value={g.dietary_restrictions} />
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 4, opacity: isPro ? 0.3 : 1, pointerEvents: isPro ? 'none' : undefined }}>
                  <button
                    onClick={() => openSend('all', !!g.invite_sent_at)}
                    title={g.invite_sent_at ? 'Resend' : 'Send invite'}
                    style={{ padding: '5px 7px', background: 'none', border: '1px solid rgba(10,10,10,0.12)', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                  >
                    <RefreshCw size={12} color="rgba(10,10,10,0.5)" />
                  </button>
                  <button
                    onClick={() => handleCopyLink(g)}
                    title="Copy RSVP link"
                    style={{
                      padding: '5px 7px', border: '1px solid rgba(10,10,10,0.12)', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center',
                      background: copiedId === g.id ? '#F0FDF4' : 'none',
                    }}
                  >
                    {copiedId === g.id ? <Check size={12} color="#22C55E" /> : <Copy size={12} color="rgba(10,10,10,0.5)" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showDrawer && (
        <SendInvitesModal
          guests={guests}
          defaultFilter={drawerFilter}
          defaultIsReminder={drawerIsReminder}
          onClose={() => setShowDrawer(false)}
          onSent={loadGuests}
        />
      )}

      <style>{`@keyframes inv-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
