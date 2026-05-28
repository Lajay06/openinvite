import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Crown, Mail, Copy, RefreshCw, Check, Loader2, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import SendInvitesModal from '@/components/guests/SendInvitesModal';

const F = { fontFamily: "'Plus Jakarta Sans', sans-serif" };
const RSVP_BASE = `${window.location.origin}/rsvp/`;

function buildRsvpUrl(token) { return RSVP_BASE + token; }

// ── Status badge helpers ──────────────────────────────────────────────────────
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

function Avatar({ name, size = 32 }) {
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

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Ultra gate ────────────────────────────────────────────────────────────────
function UltraGate() {
  const navigate = useNavigate();
  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF', position: 'relative', overflow: 'hidden' }}>
      <DashboardPageHeader title="Invites" subtitle="Send and manage your wedding invitations" />

      {/* Blurred demo background */}
      <div style={{ filter: 'blur(5px)', opacity: 0.3, pointerEvents: 'none', userSelect: 'none', padding: '0 32px' }}>
        {/* Fake stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', borderBottom: '1px solid rgba(10,10,10,0.08)', borderTop: '1px solid rgba(10,10,10,0.08)', marginTop: 0 }}>
          {['Total invited', 'RSVPd yes', 'RSVPd no', 'Awaiting'].map((l, i) => (
            <div key={i} style={{ padding: '20px 24px', borderRight: i < 3 ? '1px solid rgba(10,10,10,0.08)' : 'none' }}>
              <div style={{ width: 40, height: 32, background: 'rgba(10,10,10,0.08)', borderRadius: 4, marginBottom: 8 }} />
              <div style={{ width: 60, height: 10, background: 'rgba(10,10,10,0.08)', borderRadius: 2 }} />
            </div>
          ))}
        </div>
        {/* Fake table */}
        <div style={{ marginTop: 24 }}>
          {[1,2,3,4,5].map(i => (
            <div key={i} style={{ display: 'flex', gap: 16, padding: '12px 0', borderBottom: '1px solid rgba(10,10,10,0.06)', alignItems: 'center' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(10,10,10,0.08)', flexShrink: 0 }} />
              <div style={{ flex: 1 }}><div style={{ width: `${60 + i * 15}px`, height: 12, background: 'rgba(10,10,10,0.08)', borderRadius: 2 }} /></div>
              <div style={{ width: 50, height: 20, background: 'rgba(10,10,10,0.06)', borderRadius: 999 }} />
              <div style={{ width: 70, height: 12, background: 'rgba(10,10,10,0.06)', borderRadius: 2 }} />
              <div style={{ width: 60, height: 20, background: 'rgba(10,10,10,0.06)', borderRadius: 999 }} />
            </div>
          ))}
        </div>
      </div>

      {/* Upgrade overlay */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 24px' }}>
        <div style={{
          background: '#FFFFFF', border: '1px solid rgba(10,10,10,0.1)',
          padding: '48px 40px', maxWidth: 460, width: '100%', textAlign: 'center',
          boxShadow: '0 20px 60px rgba(10,10,10,0.12)',
        }}>
          {/* Crown icon with gold gradient bg */}
          <div style={{
            width: 60, height: 60, borderRadius: '50%',
            background: 'linear-gradient(135deg, #FBBF24, #F59E0B)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            <Crown size={28} color="#FFFFFF" strokeWidth={1.8} />
          </div>

          <p style={{ fontSize: 11, fontWeight: 800, color: '#F59E0B', letterSpacing: '0.12em', margin: '0 0 10px', ...F }}>ULTRA FEATURE</p>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: '#0A0A0A', margin: '0 0 12px', letterSpacing: '-0.02em', lineHeight: 1.2, ...F }}>
            Invites is an Ultra feature
          </h2>
          <p style={{ fontSize: 14, color: 'rgba(10,10,10,0.55)', lineHeight: 1.7, margin: '0 0 32px', ...F }}>
            Send beautiful personalised invitations via email and WhatsApp, track opens, and manage RSVPs — all in one place.
          </p>

          <button
            onClick={() => navigate('/account')}
            style={{
              width: '100%', padding: '14px 24px', border: 'none', borderRadius: 999,
              background: 'linear-gradient(135deg, #FBBF24, #F59E0B)',
              color: '#FFFFFF', fontSize: 15, fontWeight: 800, cursor: 'pointer', ...F,
              letterSpacing: '0.01em', marginBottom: 16,
            }}
          >
            Upgrade to Ultra
          </button>

          <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.35)', margin: 0, ...F }}>
            Already on Ultra? Make sure you're signed in with the right account.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Main Invites page ─────────────────────────────────────────────────────────
const FILTER_TABS = [
  { val: 'all',          label: 'All' },
  { val: 'not_sent',     label: 'Not sent' },
  { val: 'sent',         label: 'Sent' },
  { val: 'awaiting',     label: 'Awaiting RSVP' },
  { val: 'rsvpd',        label: 'RSVPd' },
];

export default function Invites() {
  const { user } = useAuth();
  const plan = user?.plan || 'free';
  const isUltra = plan === 'ultra';

  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [showDrawer, setShowDrawer] = useState(false);
  const [drawerFilter, setDrawerFilter] = useState('not_invited');
  const [drawerIsReminder, setDrawerIsReminder] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    if (!isUltra) return;
    loadGuests();
  }, [isUltra]);

  const loadGuests = async () => {
    try {
      const data = await base44.entities.Guest.list('-created_date');
      setGuests(data);
    } catch {
      toast.error('Failed to load guests');
    }
    setLoading(false);
  };

  const stats = useMemo(() => {
    const invited = guests.filter(g => g.invite_sent_at).length;
    const attending = guests.filter(g => g.rsvp_status === 'attending').length;
    const declined = guests.filter(g => g.rsvp_status === 'declined').length;
    const awaiting = guests.filter(g => g.invite_sent_at && (!g.rsvp_status || g.rsvp_status === 'pending')).length;
    return { invited, attending, declined, awaiting };
  }, [guests]);

  const filteredGuests = useMemo(() => {
    if (activeTab === 'not_sent') return guests.filter(g => !g.invite_sent_at);
    if (activeTab === 'sent') return guests.filter(g => g.invite_sent_at);
    if (activeTab === 'awaiting') return guests.filter(g => g.invite_sent_at && (!g.rsvp_status || g.rsvp_status === 'pending'));
    if (activeTab === 'rsvpd') return guests.filter(g => g.rsvp_status === 'attending' || g.rsvp_status === 'declined');
    return guests;
  }, [guests, activeTab]);

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

  if (!isUltra) return <UltraGate />;

  const statLabelStyle = { fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)', margin: 0, marginBottom: 8, ...F };
  const statValueStyle = { fontSize: 'clamp(22px,2.5vw,32px)', fontWeight: 700, color: '#0A0A0A', lineHeight: 1, margin: 0, ...F };

  const STATS = [
    { label: 'Total invited',   value: stats.invited },
    { label: 'RSVPd yes',       value: stats.attending },
    { label: 'RSVPd no',        value: stats.declined },
    { label: 'Awaiting reply',  value: stats.awaiting },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF' }}>
      <DashboardPageHeader
        title="Invites"
        subtitle="Send and manage your wedding invitations"
        actions={
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => openSend('pending', true)} className="btn-editorial-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <RefreshCw size={13} />
              Send reminders
            </button>
            <button onClick={() => openSend('not_invited', false)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Send size={13} />
              Send invitations
            </button>
          </div>
        }
      />

      {/* Stats bar */}
      <div className="flex flex-wrap w-full" style={{ borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
        {STATS.map((s, i) => (
          <div key={s.label} className="grow shrink basis-1/2 min-w-0 lg:flex-1" style={{ padding: '20px 28px', borderRight: i < STATS.length - 1 ? '1px solid rgba(10,10,10,0.08)' : 'none' }}>
            <p style={statLabelStyle}>{s.label.toUpperCase()}</p>
            {loading
              ? <div style={{ width: 48, height: 28, background: 'rgba(10,10,10,0.06)' }} />
              : <p style={statValueStyle}>{s.value}</p>
            }
          </div>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: '24px 32px 48px' }}>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid rgba(10,10,10,0.08)', marginBottom: 20 }}>
          {FILTER_TABS.map(tab => (
            <button
              key={tab.val}
              onClick={() => setActiveTab(tab.val)}
              style={{
                padding: '8px 16px', border: 'none', background: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: activeTab === tab.val ? 700 : 500,
                color: activeTab === tab.val ? '#0A0A0A' : 'rgba(10,10,10,0.45)',
                borderBottom: `2px solid ${activeTab === tab.val ? '#E03553' : 'transparent'}`,
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
            <Loader2 size={24} style={{ animation: 'spin 0.8s linear infinite', color: 'rgba(10,10,10,0.3)' }} />
          </div>
        ) : filteredGuests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 0' }}>
            <div style={{ width: 48, height: 48, background: 'rgba(10,10,10,0.05)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Mail size={22} color="rgba(10,10,10,0.3)" strokeWidth={1.5} />
            </div>
            <p style={{ fontSize: 15, fontWeight: 600, color: '#0A0A0A', margin: '0 0 6px', ...F }}>No guests here</p>
            <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.45)', margin: '0 0 20px', ...F }}>
              {activeTab === 'not_sent' ? 'All guests have been sent invitations.' : 'No guests match this filter.'}
            </p>
            {activeTab === 'not_sent' || activeTab === 'all' ? null : (
              <button onClick={() => setActiveTab('all')} style={{ fontSize: 13, color: '#E03553', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, ...F }}>View all guests</button>
            )}
          </div>
        ) : (
          <>
            {/* Table header */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 110px 100px 100px 90px 80px', gap: 8, padding: '8px 12px', background: 'rgba(10,10,10,0.02)', borderBottom: '1px solid rgba(10,10,10,0.06)', marginBottom: 2 }}>
              {['Guest', 'Invite', 'Sent', 'RSVP', 'RSVPd on', 'Channel', ''].map((h, i) => (
                <span key={i} style={{ fontSize: 10, fontWeight: 700, color: 'rgba(10,10,10,0.4)', letterSpacing: '0.08em', ...F }}>{h}</span>
              ))}
            </div>

            {/* Table rows */}
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
                {/* Name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <Avatar name={g.name} size={30} />
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#0A0A0A', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', ...F }}>{g.name}</p>
                    <p style={{ fontSize: 11, color: 'rgba(10,10,10,0.4)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', ...F }}>{g.email || '—'}</p>
                  </div>
                </div>

                {/* Invite status */}
                <InviteStatusBadge guest={g} />

                {/* Sent date */}
                <span style={{ fontSize: 12, color: 'rgba(10,10,10,0.55)', ...F }}>{formatDate(g.invite_sent_at)}</span>

                {/* RSVP status */}
                <RSVPStatusBadge status={g.rsvp_status} />

                {/* RSVP date */}
                <span style={{ fontSize: 12, color: 'rgba(10,10,10,0.55)', ...F }}>{formatDate(g.rsvp_date)}</span>

                {/* Channel */}
                <ChannelBadge channel={g.invite_channel} />

                {/* Actions */}
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    onClick={() => {
                      // Open drawer with this guest's filter implied
                      openSend('all', !!g.invite_sent_at);
                    }}
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

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
