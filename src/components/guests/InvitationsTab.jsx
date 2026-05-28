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

function InviteStatusBadge({ guest }) {
  if (guest.invite_sent_at) {
    return <span style={{ fontSize: 11, fontWeight: 700, color: '#16A34A', background: '#DCFCE7', padding: '3px 8px', borderRadius: 999, ...F }}>Sent</span>;
  }
  return <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(10,10,10,0.4)', background: 'rgba(10,10,10,0.06)', padding: '3px 8px', borderRadius: 999, ...F }}>Not sent</span>;
}

function RSVPStatusBadge({ status }) {
  if (status === 'attending') return <span style={{ fontSize: 11, fontWeight: 700, color: '#16A34A', background: '#DCFCE7', padding: '3px 8px', borderRadius: 999, ...F }}>Attending</span>;
  if (status === 'declined') return <span style={{ fontSize: 11, fontWeight: 700, color: '#DC2626', background: '#FEE2E2', padding: '3px 8px', borderRadius: 999, ...F }}>Declined</span>;
  return <span style={{ fontSize: 11, fontWeight: 700, color: '#F59E0B', background: '#FEF3C7', padding: '3px 8px', borderRadius: 999, ...F }}>Pending</span>;
}

function ChannelBadge({ channel }) {
  if (!channel) return null;
  const label = channel === 'email+whatsapp' || channel === 'whatsapp+email' ? 'Both'
    : channel === 'whatsapp' ? 'WhatsApp'
    : 'Email';
  return <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(10,10,10,0.55)', background: 'rgba(10,10,10,0.06)', padding: '3px 8px', borderRadius: 999, ...F }}>{label}</span>;
}

function GuestAvatar({ name, size = 30 }) {
  const COLORS = ['#FDE8EC', '#E8F4FD', '#E8FDE8', '#FDF4E8', '#F4E8FD'];
  const i = name ? name.charCodeAt(0) % COLORS.length : 0;
  const initials = name
    ? name.trim().split(/\s+/).filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: COLORS[i], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.36, fontWeight: 700, color: '#0A0A0A', flexShrink: 0, ...F }}>
      {initials}
    </div>
  );
}

function fmt(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

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
  const [showDrawer, setShowDrawer] = useState(false);
  const [drawerFilter, setDrawerFilter] = useState('not_invited');
  const [drawerIsReminder, setDrawerIsReminder] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  const stats = useMemo(() => {
    const total = guests.length;
    const sent = guests.filter(g => g.invite_sent_at).length;
    const awaiting = guests.filter(g => g.invite_sent_at && (!g.rsvp_status || g.rsvp_status === 'pending')).length;
    const attending = guests.filter(g => g.rsvp_status === 'attending').length;
    const declined = guests.filter(g => g.rsvp_status === 'declined').length;
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

  const statLabel = { fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)', margin: '0 0 8px', ...F };
  const statValue = { fontSize: 'clamp(20px,2.5vw,30px)', fontWeight: 700, color: '#0A0A0A', lineHeight: 1, margin: 0, ...F };
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
          <div
            key={s.label}
            style={{
              flex: '1 1 18%', minWidth: 100,
              padding: '16px 20px',
              borderRight: i < STATS.length - 1 ? '1px solid rgba(10,10,10,0.08)' : 'none',
            }}
          >
            <p style={statLabel}>{s.label.toUpperCase()}</p>
            {loading
              ? <div style={{ width: 40, height: 24, background: 'rgba(10,10,10,0.06)' }} />
              : <p style={statValue}>{s.value}</p>
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
        display: 'flex', gap: 0,
        borderBottom: '1px solid rgba(10,10,10,0.08)', marginBottom: 20,
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

      {/* Table */}
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
        <>
          {/* Header row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 110px 100px 100px 90px 80px', gap: 8, padding: '8px 12px', background: 'rgba(10,10,10,0.02)', borderBottom: '1px solid rgba(10,10,10,0.06)', marginBottom: 2 }}>
            {['Guest', 'Invite', 'Sent', 'RSVP', 'RSVPd on', 'Channel', ''].map((h, i) => (
              <span key={i} style={{ fontSize: 10, fontWeight: 700, color: 'rgba(10,10,10,0.4)', letterSpacing: '0.08em', ...F }}>{h}</span>
            ))}
          </div>

          {/* Data rows */}
          {filteredGuests.map(g => (
            <div
              key={g.id}
              style={{
                display: 'grid', gridTemplateColumns: '1fr 100px 110px 100px 100px 90px 80px',
                gap: 8, padding: '10px 12px', borderBottom: '1px solid rgba(10,10,10,0.04)',
                alignItems: 'center', transition: 'background 0.1s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#FAFAFA'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <GuestAvatar name={g.name} />
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#0A0A0A', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', ...F }}>{g.name}</p>
                  <p style={{ fontSize: 11, color: 'rgba(10,10,10,0.4)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', ...F }}>{g.email || '—'}</p>
                </div>
              </div>

              <InviteStatusBadge guest={g} />
              <span style={{ fontSize: 12, color: 'rgba(10,10,10,0.55)', ...F }}>{fmt(g.invite_sent_at)}</span>
              <RSVPStatusBadge status={g.rsvp_status} />
              <span style={{ fontSize: 12, color: 'rgba(10,10,10,0.55)', ...F }}>{fmt(g.rsvp_date)}</span>
              <ChannelBadge channel={g.invite_channel} />

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
        </>
      )}

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
