import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { X, Mail, MessageCircle, Link, Check, Loader2, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';

const RSVP_BASE = `${window.location.origin}/rsvp/`;

function ensureToken(guest) {
  return guest.rsvp_link_id || crypto.randomUUID();
}

function buildRsvpUrl(token) {
  return RSVP_BASE + token;
}

function buildWhatsAppUrl(guest, coupleName, weddingDate, token) {
  const name = guest.name ? guest.name.split(' ')[0] : 'there';
  const rsvpUrl = buildRsvpUrl(token);
  const dateStr = weddingDate
    ? new Date(weddingDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';
  const msg = `Hi ${name}! 💌 You're invited to ${coupleName ? `${coupleName}'s wedding` : 'our wedding'}${dateStr ? ` on ${dateStr}` : ''}. Please RSVP here: ${rsvpUrl}`;
  const phone = guest.phone ? guest.phone.replace(/\D/g, '') : '';
  return phone
    ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
    : `https://wa.me/?text=${encodeURIComponent(msg)}`;
}

export default function SendInvitesModal({ guests, onClose, onSent }) {
  const [wedding, setWedding] = useState(null);
  const [channel, setChannel] = useState('email');
  const [filter, setFilter] = useState('not_invited');
  const [selected, setSelected] = useState(new Set());
  const [sending, setSending] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [isReminder, setIsReminder] = useState(false);

  useEffect(() => {
    base44.entities.WeddingDetails.list().then(d => setWedding(d[0] || null)).catch(() => {});
  }, []);

  const coupleName = wedding?.coupleName || wedding?.couple_name || '';
  const weddingDate = wedding?.weddingDate || wedding?.wedding_date || '';
  const venue = wedding?.venueName || wedding?.venue_name || '';

  const filteredGuests = useMemo(() => {
    if (filter === 'not_invited') return guests.filter(g => !g.invite_sent_at);
    if (filter === 'pending') return guests.filter(g => g.rsvp_status === 'pending' || !g.rsvp_status);
    if (filter === 'no_email') return guests.filter(g => !g.email);
    return guests;
  }, [guests, filter]);

  const emailGuests = filteredGuests.filter(g => g.email);
  const noEmailGuests = filteredGuests.filter(g => !g.email);

  useEffect(() => {
    const ids = new Set(filteredGuests.map(g => g.id));
    setSelected(ids);
  }, [filteredGuests]);

  const toggleAll = () => {
    if (selected.size === filteredGuests.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredGuests.map(g => g.id)));
    }
  };

  const toggleOne = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectedGuests = filteredGuests.filter(g => selected.has(g.id));

  const handleSendEmail = async () => {
    const toSend = selectedGuests.filter(g => g.email);
    if (toSend.length === 0) {
      toast.error('No selected guests have email addresses');
      return;
    }

    setSending(true);
    const tid = toast.loading(`Sending ${isReminder ? 'reminders' : 'invitations'}…`);

    try {
      // Ensure tokens exist — update guests without one
      const updates = [];
      const guestsWithTokens = toSend.map(g => {
        if (!g.rsvp_link_id) {
          const token = crypto.randomUUID();
          updates.push(base44.entities.Guest.update(g.id, { rsvp_link_id: token }));
          return { ...g, rsvp_link_id: token };
        }
        return g;
      });
      if (updates.length > 0) await Promise.all(updates);

      const payload = {
        type: isReminder ? 'reminder' : 'invite',
        guests: guestsWithTokens.map(g => ({
          email: g.email,
          name: g.name,
          rsvpUrl: buildRsvpUrl(g.rsvp_link_id),
        })),
        wedding: { coupleName, weddingDate, venue },
      };

      const res = await fetch('/api/send-invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Send failed');

      // Mark guests as invited
      const sentAt = new Date().toISOString();
      await Promise.all(
        guestsWithTokens.map(g =>
          base44.entities.Guest.update(g.id, isReminder
            ? { reminder_sent_at: sentAt }
            : { invite_sent_at: sentAt, invite_channel: 'email' }
          )
        )
      );

      toast.success(`${isReminder ? 'Reminders' : 'Invitations'} sent to ${data.sent} guest${data.sent !== 1 ? 's' : ''}`, { id: tid });
      onSent?.();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to send', { id: tid });
    }
    setSending(false);
  };

  const handleWhatsApp = async () => {
    if (selectedGuests.length === 0) return;
    setSending(true);

    try {
      // Ensure tokens
      const updates = [];
      const guestsWithTokens = selectedGuests.map(g => {
        if (!g.rsvp_link_id) {
          const token = crypto.randomUUID();
          updates.push(base44.entities.Guest.update(g.id, { rsvp_link_id: token }));
          return { ...g, rsvp_link_id: token };
        }
        return g;
      });
      if (updates.length > 0) await Promise.all(updates);

      const sentAt = new Date().toISOString();
      const markUpdates = guestsWithTokens.map(g =>
        base44.entities.Guest.update(g.id, isReminder
          ? { reminder_sent_at: sentAt }
          : { invite_sent_at: sentAt, invite_channel: 'whatsapp' }
        )
      );
      await Promise.all(markUpdates);

      // Open WhatsApp links
      guestsWithTokens.forEach(g => {
        const url = buildWhatsAppUrl(g, coupleName, weddingDate, g.rsvp_link_id);
        window.open(url, '_blank');
      });

      toast.success(`Opened ${guestsWithTokens.length} WhatsApp conversation${guestsWithTokens.length !== 1 ? 's' : ''}`);
      onSent?.();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed');
    }
    setSending(false);
  };

  const handleCopyLink = async (guest) => {
    let token = guest.rsvp_link_id;
    if (!token) {
      token = crypto.randomUUID();
      await base44.entities.Guest.update(guest.id, { rsvp_link_id: token });
    }
    const url = buildRsvpUrl(token);
    await navigator.clipboard.writeText(url);
    setCopiedId(guest.id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success('Link copied');
  };

  const FILTER_OPTIONS = [
    { value: 'not_invited', label: 'Not yet invited' },
    { value: 'pending', label: 'Pending RSVP' },
    { value: 'all', label: 'All guests' },
  ];

  const CHANNELS = [
    { value: 'email', label: 'Email', icon: Mail, desc: `Send to ${selectedGuests.filter(g => g.email).length} guests with email` },
    { value: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, desc: `Open ${selectedGuests.length} WhatsApp conversation${selectedGuests.length !== 1 ? 's' : ''}` },
    { value: 'link', label: 'Copy link', icon: Link, desc: 'Copy individual RSVP links' },
  ];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(10,10,10,0.5)',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: '#FFFFFF', width: '100%', maxWidth: 600, maxHeight: '90vh',
        display: 'flex', flexDirection: 'column',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        borderRadius: 0,
      }}>
        {/* Header */}
        <div style={{ padding: '24px 28px', borderBottom: '1px solid rgba(10,10,10,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0A0A0A', margin: 0 }}>Send invitations</h2>
            <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.45)', margin: '2px 0 0' }}>Choose who to contact and how</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.4)', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ overflow: 'auto', flex: 1, padding: '24px 28px' }}>

          {/* Type toggle */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {[{ val: false, label: 'Send invites' }, { val: true, label: 'Send reminders' }].map(opt => (
              <button
                key={String(opt.val)}
                onClick={() => setIsReminder(opt.val)}
                style={{
                  padding: '7px 16px', border: '1px solid',
                  borderColor: isReminder === opt.val ? '#E03553' : 'rgba(10,10,10,0.12)',
                  background: isReminder === opt.val ? '#FFF0F3' : '#FFFFFF',
                  color: isReminder === opt.val ? '#E03553' : 'rgba(10,10,10,0.6)',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer', borderRadius: 999,
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Guest filter */}
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'rgba(10,10,10,0.4)', letterSpacing: '0.08em', marginBottom: 8 }}>SHOW GUESTS</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {FILTER_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setFilter(opt.value)}
                  style={{
                    padding: '6px 14px', border: '1px solid',
                    borderColor: filter === opt.value ? '#0A0A0A' : 'rgba(10,10,10,0.12)',
                    background: filter === opt.value ? '#0A0A0A' : '#FFFFFF',
                    color: filter === opt.value ? '#FFFFFF' : 'rgba(10,10,10,0.6)',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer', borderRadius: 999,
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Guest list */}
          <div style={{ marginBottom: 24 }}>
            {filteredGuests.length === 0 ? (
              <p style={{ fontSize: 14, color: 'rgba(10,10,10,0.45)', padding: '16px 0' }}>
                No guests match this filter.
              </p>
            ) : (
              <>
                {/* Select all */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 10, borderBottom: '1px solid rgba(10,10,10,0.06)', marginBottom: 4 }}>
                  <input
                    type="checkbox"
                    checked={selected.size === filteredGuests.length && filteredGuests.length > 0}
                    onChange={toggleAll}
                    style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#E03553' }}
                  />
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(10,10,10,0.45)', letterSpacing: '0.06em' }}>
                    {selected.size === filteredGuests.length ? 'Deselect all' : 'Select all'} ({filteredGuests.length})
                  </span>
                </div>

                <div style={{ maxHeight: 240, overflow: 'auto' }}>
                  {filteredGuests.map(g => (
                    <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid rgba(10,10,10,0.04)' }}>
                      {channel !== 'link' && (
                        <input
                          type="checkbox"
                          checked={selected.has(g.id)}
                          onChange={() => toggleOne(g.id)}
                          style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#E03553', flexShrink: 0 }}
                        />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 14, fontWeight: 600, color: '#0A0A0A', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name}</p>
                        <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.4)', margin: 0 }}>
                          {g.email || <span style={{ color: '#E03553' }}>No email</span>}
                          {g.invite_sent_at && <span style={{ marginLeft: 6, color: '#22C55E' }}>✓ Invited</span>}
                        </p>
                      </div>
                      {channel === 'link' && (
                        <button
                          onClick={() => handleCopyLink(g)}
                          style={{
                            padding: '5px 12px', border: '1px solid rgba(10,10,10,0.12)',
                            background: copiedId === g.id ? '#F0FDF4' : '#FFFFFF',
                            color: copiedId === g.id ? '#22C55E' : 'rgba(10,10,10,0.6)',
                            fontSize: 12, fontWeight: 600, cursor: 'pointer', borderRadius: 999,
                            fontFamily: "'Plus Jakarta Sans', sans-serif", display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
                          }}
                        >
                          {copiedId === g.id ? <Check size={12} /> : <Link size={12} />}
                          {copiedId === g.id ? 'Copied' : 'Copy link'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {noEmailGuests.length > 0 && channel === 'email' && (
                  <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.4)', marginTop: 8 }}>
                    {noEmailGuests.length} guest{noEmailGuests.length !== 1 ? 's' : ''} without email will be skipped.
                  </p>
                )}
              </>
            )}
          </div>

          {/* Channel selector */}
          {channel !== 'link' && (
            <div style={{ marginBottom: 24 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'rgba(10,10,10,0.4)', letterSpacing: '0.08em', marginBottom: 10 }}>SEND VIA</p>
              <div style={{ display: 'flex', gap: 10 }}>
                {CHANNELS.filter(c => c.value !== 'link').map(ch => {
                  const Icon = ch.icon;
                  return (
                    <button
                      key={ch.value}
                      onClick={() => setChannel(ch.value)}
                      style={{
                        flex: 1, padding: '12px 14px', border: '1px solid',
                        borderColor: channel === ch.value ? '#0A0A0A' : 'rgba(10,10,10,0.12)',
                        background: channel === ch.value ? '#0A0A0A' : '#FFFFFF',
                        color: channel === ch.value ? '#FFFFFF' : '#0A0A0A',
                        fontSize: 13, fontWeight: 600, cursor: 'pointer', borderRadius: 8,
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                      }}
                    >
                      <Icon size={16} />
                      {ch.label}
                    </button>
                  );
                })}
                <button
                  onClick={() => setChannel('link')}
                  style={{
                    flex: 1, padding: '12px 14px', border: '1px solid rgba(10,10,10,0.12)',
                    background: '#FFFFFF', color: '#0A0A0A',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer', borderRadius: 8,
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                  }}
                >
                  <Link size={16} />
                  Copy links
                </button>
              </div>
            </div>
          )}

          {channel === 'link' && (
            <div style={{ marginBottom: 24 }}>
              <button
                onClick={() => setChannel('email')}
                style={{ fontSize: 13, color: '#E03553', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600, padding: 0 }}
              >
                ← Back to email / WhatsApp
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {channel !== 'link' && (
          <div style={{ padding: '16px 28px', borderTop: '1px solid rgba(10,10,10,0.08)', display: 'flex', gap: 10, flexShrink: 0 }}>
            <button
              onClick={channel === 'email' ? handleSendEmail : handleWhatsApp}
              disabled={sending || selectedGuests.length === 0 || (channel === 'email' && selectedGuests.filter(g => g.email).length === 0)}
              style={{
                flex: 1, padding: '12px 20px', background: '#E03553', color: '#FFFFFF',
                border: 'none', borderRadius: 999, fontSize: 14, fontWeight: 700, cursor: 'pointer',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                opacity: (sending || selectedGuests.length === 0 || (channel === 'email' && selectedGuests.filter(g => g.email).length === 0)) ? 0.5 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {sending && <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} />}
              {channel === 'email'
                ? `Send ${isReminder ? 'reminder' : 'invite'} to ${selectedGuests.filter(g => g.email).length} guest${selectedGuests.filter(g => g.email).length !== 1 ? 's' : ''}`
                : `Open ${selectedGuests.length} WhatsApp conversation${selectedGuests.length !== 1 ? 's' : ''}`
              }
            </button>
            <button
              onClick={onClose}
              style={{
                padding: '12px 20px', background: '#FFFFFF', color: '#0A0A0A',
                border: '1px solid rgba(10,10,10,0.15)', borderRadius: 999, fontSize: 14, fontWeight: 600,
                cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
            >
              Cancel
            </button>
          </div>
        )}
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}
