import React, { useState, useEffect, useMemo, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { getMyWeddingDetails } from '@/lib/resolveMyWedding';
import { X, Mail, MessageCircle, Link, Check, Loader2, Search, ArrowLeft, ArrowRight, Send, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const RSVP_BASE = `${window.location.origin}/rsvp/`;

function buildRsvpUrl(token) { return RSVP_BASE + token; }

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

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : parts[0][0].toUpperCase();
}

function replaceMergeTags(str, guestName, coupleName, dateStr) {
  const firstName = guestName ? guestName.split(' ')[0] : '[Guest name]';
  return str
    .replace(/\[Guest name\]/gi, firstName)
    .replace(/\[Wedding date\]/gi, dateStr || '[Wedding date]')
    .replace(/\[Couple names\]/gi, coupleName || '[Couple names]')
    .replace(/\[RSVP link\]/gi, '[RSVP link]');
}

const STEP_LABELS = ['Select guests', 'Compose', 'Channel', 'Review & send'];
const F = { fontFamily: "'Plus Jakarta Sans', sans-serif" };

// ── Step progress indicator ──────────────────────────────────────────────────
function StepIndicator({ current }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, padding: '20px 32px 0' }}>
      {STEP_LABELS.map((label, i) => {
        const num = i + 1;
        const done = num < current;
        const active = num === current;
        return (
          <React.Fragment key={num}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: done ? '#22C55E' : active ? '#E03553' : 'rgba(10,10,10,0.08)',
                color: done || active ? '#FFFFFF' : 'rgba(10,10,10,0.35)',
                fontSize: 12, fontWeight: 700, transition: 'all 0.2s ease',
              }}>
                {done ? <Check size={13} /> : num}
              </div>
              <span style={{
                fontSize: 10, fontWeight: active ? 700 : 500,
                color: active ? '#0A0A0A' : done ? '#22C55E' : 'rgba(10,10,10,0.35)',
                letterSpacing: '0.02em', whiteSpace: 'nowrap',
                transition: 'color 0.2s ease',
              }}>
                {label}
              </span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div style={{
                flex: 1, height: 1, background: done ? '#22C55E' : 'rgba(10,10,10,0.1)',
                margin: '0 6px', marginBottom: 20, transition: 'background 0.2s ease',
              }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ── Guest avatar ─────────────────────────────────────────────────────────────
const AVATAR_COLORS = ['#FDE8EC', '#E8F4FD', '#E8FDE8', '#FDF4E8', '#F4E8FD'];
function Avatar({ name, size = 36 }) {
  const initials = getInitials(name);
  const colorIdx = name ? name.charCodeAt(0) % AVATAR_COLORS.length : 0;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: AVATAR_COLORS[colorIdx],
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.36, fontWeight: 700, color: '#0A0A0A', flexShrink: 0,
      ...F,
    }}>
      {initials}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function SendInvitesModal({ guests, onClose, onSent, defaultFilter = 'not_invited', defaultIsReminder = false, initialSelectedIds }) {
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(1);
  const [wedding, setWedding] = useState(null);

  // Step 1
  const [filter, setFilter] = useState(defaultFilter);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(() =>
    initialSelectedIds?.length ? new Set(initialSelectedIds) : new Set()
  );
  // When guests are preloaded (e.g. from a hub's checkbox selection), skip the
  // filter-driven auto-select exactly once on mount so it doesn't clobber the
  // caller's explicit selection — subsequent user-driven filter clicks inside
  // the modal still auto-select as normal.
  const skipNextAutoSelect = useRef(!!initialSelectedIds?.length);

  // Step 2
  const [isReminder, setIsReminder] = useState(defaultIsReminder);
  const [subject, setSubject] = useState('');
  const [messageBody, setMessageBody] = useState('');

  // Step 3
  const [channel, setChannel] = useState('email');

  // Step 4
  const [sending, setSending] = useState(false);

  // Load wedding details and set default message
  useEffect(() => {
    setTimeout(() => setMounted(true), 10);
    getMyWeddingDetails().then(w => {
      setWedding(w);
      const cn = w?.coupleName || w?.couple_name || '';
      const wd = w?.weddingDate || w?.wedding_date || '';
      const ds = wd
        ? new Date(wd).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
        : '[Wedding date]';
      setSubject(`You're invited to ${cn ? `${cn}'s wedding` : 'our wedding'} 💍`);
      setMessageBody(
        `Hi [Guest name],\n\nWe'd love for you to celebrate with us on ${ds}. Click below to view your invitation and RSVP.\n\nWe can't wait to see you!\n\n— ${cn || '[Couple names]'}`
      );
    }).catch(() => {});
  }, []);

  const coupleName = wedding?.coupleName || wedding?.couple_name || '';
  const weddingDate = wedding?.weddingDate || wedding?.wedding_date || '';
  const venue = wedding?.venueName || wedding?.venue_name || '';
  const dateStr = weddingDate
    ? new Date(weddingDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  // Filtered guest list for Step 1
  const filteredGuests = useMemo(() => {
    let list = guests;
    if (filter === 'not_invited') list = guests.filter(g => !g.invite_sent_at);
    else if (filter === 'pending') list = guests.filter(g => g.rsvp_status === 'pending' || !g.rsvp_status);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(g =>
        g.name?.toLowerCase().includes(q) ||
        g.email?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [guests, filter, search]);

  // Auto-select when filter changes
  useEffect(() => {
    if (skipNextAutoSelect.current) { skipNextAutoSelect.current = false; return; }
    setSelected(new Set(filteredGuests.map(g => g.id)));
  }, [filter]);

  // Derive the working selected list from ALL guests (persists across filter changes)
  const selectedGuests = useMemo(() => guests.filter(g => selected.has(g.id)), [guests, selected]);
  const selectedWithEmail = selectedGuests.filter(g => g.email);
  const selectedWithPhone = selectedGuests.filter(g => g.phone);
  const selectedNoEmail = selectedGuests.filter(g => !g.email);
  const selectedNoPhone = selectedGuests.filter(g => !g.phone);

  const allFilteredSelected = filteredGuests.length > 0 && filteredGuests.every(g => selected.has(g.id));

  const toggleAll = () => {
    setSelected(prev => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filteredGuests.forEach(g => next.delete(g.id));
      } else {
        filteredGuests.forEach(g => next.add(g.id));
      }
      return next;
    });
  };

  const toggleOne = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleClose = () => {
    setMounted(false);
    setTimeout(onClose, 280);
  };

  // Live preview (Step 2)
  const previewSubject = replaceMergeTags(subject, selectedGuests[0]?.name, coupleName, dateStr);
  const previewBody = replaceMergeTags(messageBody, selectedGuests[0]?.name, coupleName, dateStr);

  // Ensure tokens and return guest list with tokens
  const ensureTokens = async (list) => {
    const updates = [];
    const result = list.map(g => {
      if (!g.rsvp_link_id) {
        const token = crypto.randomUUID();
        updates.push(base44.entities.Guest.update(g.id, { rsvp_link_id: token }));
        return { ...g, rsvp_link_id: token };
      }
      return g;
    });
    if (updates.length > 0) await Promise.all(updates);
    return result;
  };

  const handleSend = async () => {
    setSending(true);
    const tid = toast.loading('Sending invitations…');
    try {
      const withTokens = await ensureTokens(selectedGuests);
      const sentAt = new Date().toISOString();
      const sendEmail = channel === 'email' || channel === 'both';
      const sendWhatsApp = channel === 'whatsapp' || channel === 'both';

      if (sendEmail) {
        const emailList = withTokens.filter(g => g.email);
        if (emailList.length > 0) {
          const payload = {
            type: isReminder ? 'reminder' : 'invite',
            guests: emailList.map(g => ({ email: g.email, name: g.name, rsvpUrl: buildRsvpUrl(g.rsvp_link_id) })),
            wedding: { coupleName, weddingDate, venue },
            customSubject: subject,
            customBody: messageBody,
          };
          const res = await fetch('/api/send-invites', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Send failed');
        }
      }

      if (sendWhatsApp) {
        withTokens.forEach(g => {
          window.open(buildWhatsAppUrl(g, coupleName, weddingDate, g.rsvp_link_id), '_blank');
        });
      }

      const channelStr = [sendEmail && 'email', sendWhatsApp && 'whatsapp'].filter(Boolean).join('+');
      await Promise.all(
        withTokens.map(g =>
          base44.entities.Guest.update(g.id, isReminder
            ? { reminder_sent_at: sentAt }
            : { invite_sent_at: sentAt, invite_channel: channelStr }
          )
        )
      );

      let msg = '';
      if (channel === 'both') msg = `Sent to ${selectedWithEmail.length} by email, WhatsApp opened for ${selectedGuests.length}`;
      else if (channel === 'email') msg = `Invitations sent to ${selectedWithEmail.length} guest${selectedWithEmail.length !== 1 ? 's' : ''}`;
      else msg = `WhatsApp opened for ${selectedGuests.length} guest${selectedGuests.length !== 1 ? 's' : ''}`;

      toast.success(msg, { id: tid });
      onSent?.();
      handleClose();
    } catch (err) {
      toast.error(err.message || 'Failed to send', { id: tid });
      setSending(false);
    }
  };

  const canProceedStep1 = selected.size > 0;
  const canProceedStep2 = subject.trim().length > 0;
  const canProceedStep3 = true;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Overlay */}
      <div
        onClick={handleClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 999,
          background: 'rgba(10,10,10,0.55)',
          opacity: mounted ? 1 : 0,
          transition: 'opacity 0.28s ease',
        }}
      />

      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 1000,
        width: 'min(67vw, 860px)',
        background: '#FFFFFF',
        display: 'flex', flexDirection: 'column',
        transform: mounted ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
        overflowX: 'hidden',
        ...F,
      }}>

        {/* Top bar */}
        <div style={{
          padding: '20px 32px 0',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0A0A0A', margin: '0 0 2px', letterSpacing: '-0.02em' }}>
              {isReminder ? 'Send reminders' : 'Send invitations'}
            </h2>
            <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.45)', margin: 0 }}>
              Step {step} of {STEP_LABELS.length} — {STEP_LABELS[step - 1]}
            </p>
          </div>
          <button onClick={handleClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.4)', padding: 4, marginTop: -4 }}>
            <X size={20} />
          </button>
        </div>

        {/* Step indicator */}
        <StepIndicator current={step} />

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(10,10,10,0.08)', margin: '16px 0 0', flexShrink: 0 }} />

        {/* Step content (scrollable) */}
        <div style={{ flex: 1, overflow: 'auto', padding: '28px 32px' }}>

          {/* ── STEP 1: Select guests ──────────────────────────────────── */}
          {step === 1 && (
            <div>
              <h3 style={{ fontSize: 22, fontWeight: 800, color: '#0A0A0A', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
                Who are you inviting?
              </h3>
              <p style={{ fontSize: 14, color: 'rgba(10,10,10,0.5)', margin: '0 0 24px' }}>
                Select the guests you'd like to contact.
              </p>

              {/* Invite type toggle */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                {[{ val: false, label: 'Send invites' }, { val: true, label: 'Send reminders' }].map(opt => (
                  <button key={String(opt.val)} onClick={() => setIsReminder(opt.val)} style={{
                    padding: '7px 16px', border: '1px solid',
                    borderColor: isReminder === opt.val ? '#E03553' : 'rgba(10,10,10,0.12)',
                    background: isReminder === opt.val ? '#FFF0F3' : '#FFFFFF',
                    color: isReminder === opt.val ? '#E03553' : 'rgba(10,10,10,0.55)',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer', borderRadius: 999, ...F,
                  }}>
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Filter tabs */}
              <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid rgba(10,10,10,0.08)', marginBottom: 16 }}>
                {[
                  { val: 'not_invited', label: 'Not yet invited' },
                  { val: 'pending', label: 'Pending RSVP' },
                  { val: 'all', label: 'All guests' },
                ].map(opt => (
                  <button key={opt.val} onClick={() => setFilter(opt.val)} style={{
                    padding: '8px 16px', border: 'none', background: 'none', cursor: 'pointer',
                    fontSize: 13, fontWeight: filter === opt.val ? 700 : 500,
                    color: filter === opt.val ? '#0A0A0A' : 'rgba(10,10,10,0.45)',
                    borderBottom: `2px solid ${filter === opt.val ? '#E03553' : 'transparent'}`,
                    marginBottom: -1, ...F,
                  }}>
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Search */}
              <div style={{ position: 'relative', marginBottom: 12 }}>
                <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(10,10,10,0.3)', pointerEvents: 'none' }} />
                <input
                  type="text"
                  placeholder="Search by name or email…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{
                    width: '100%', padding: '9px 12px 9px 34px', border: '1px solid rgba(10,10,10,0.12)',
                    borderRadius: 8, fontSize: 13, color: '#0A0A0A', background: '#FAFAFA',
                    outline: 'none', boxSizing: 'border-box', ...F,
                  }}
                />
              </div>

              {/* Select all row */}
              {filteredGuests.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid rgba(10,10,10,0.06)', marginBottom: 4 }}>
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={toggleAll}
                    style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#E03553', flexShrink: 0 }}
                  />
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(10,10,10,0.45)', letterSpacing: '0.06em' }}>
                    {allFilteredSelected ? 'Deselect all' : 'Select all'} ({filteredGuests.length})
                  </span>
                </div>
              )}

              {/* Guest list */}
              {filteredGuests.length === 0 ? (
                <div style={{ padding: '32px 0', textAlign: 'center' }}>
                  <p style={{ fontSize: 14, color: 'rgba(10,10,10,0.4)' }}>No guests match this filter.</p>
                </div>
              ) : (
                filteredGuests.map(g => (
                  <div
                    key={g.id}
                    onClick={() => toggleOne(g.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 8px', borderBottom: '1px solid rgba(10,10,10,0.04)', cursor: 'pointer', borderRadius: 6, transition: 'background 0.1s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#FAFAFA'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(g.id)}
                      onChange={() => toggleOne(g.id)}
                      onClick={e => e.stopPropagation()}
                      style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#E03553', flexShrink: 0 }}
                    />
                    <Avatar name={g.name} size={36} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: '#0A0A0A', margin: '0 0 1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name}</p>
                      <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.4)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {g.email || <span style={{ color: '#E03553' }}>No email</span>}
                        {g.phone && <span style={{ marginLeft: 8 }}>· {g.phone}</span>}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      {g.invite_sent_at && (
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#22C55E', background: '#F0FDF4', padding: '2px 7px', borderRadius: 999 }}>Invited</span>
                      )}
                      {(g.rsvp_status === 'attending') && (
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#16A34A', background: '#DCFCE7', padding: '2px 7px', borderRadius: 999 }}>Attending</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ── STEP 2: Compose ────────────────────────────────────────── */}
          {step === 2 && (
            <div>
              <h3 style={{ fontSize: 22, fontWeight: 800, color: '#0A0A0A', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
                Compose your invitation
              </h3>
              <p style={{ fontSize: 14, color: 'rgba(10,10,10,0.5)', margin: '0 0 24px' }}>
                Personalise the message. Use merge tags to add guest-specific details.
              </p>

              {/* Merge tag hints */}
              <div style={{ background: '#F7F7F7', borderRadius: 8, padding: '10px 14px', marginBottom: 20, display: 'flex', flexWrap: 'wrap', gap: '6px 12px' }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(10,10,10,0.4)', marginRight: 4 }}>Merge tags:</span>
                {['[Guest name]', '[Wedding date]', '[Couple names]', '[RSVP link]'].map(tag => (
                  <span key={tag} style={{ fontSize: 11, fontWeight: 700, color: '#E03553', background: '#FFF0F3', padding: '2px 7px', borderRadius: 999 }}>{tag}</span>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

                {/* Left: edit fields */}
                <div>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'rgba(10,10,10,0.5)', letterSpacing: '0.08em', marginBottom: 6 }}>SUBJECT LINE</label>
                    <input
                      type="text"
                      value={subject}
                      onChange={e => setSubject(e.target.value)}
                      style={{
                        width: '100%', padding: '10px 12px', border: '1px solid rgba(10,10,10,0.15)',
                        borderRadius: 8, fontSize: 14, color: '#0A0A0A', background: '#FFFFFF',
                        ...F, outline: 'none', boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'rgba(10,10,10,0.5)', letterSpacing: '0.08em', marginBottom: 6 }}>MESSAGE BODY</label>
                    <textarea
                      value={messageBody}
                      onChange={e => setMessageBody(e.target.value)}
                      rows={10}
                      style={{
                        width: '100%', padding: '10px 12px', border: '1px solid rgba(10,10,10,0.15)',
                        borderRadius: 8, fontSize: 14, color: '#0A0A0A', background: '#FFFFFF',
                        ...F, outline: 'none', resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.6,
                      }}
                    />
                  </div>
                </div>

                {/* Right: live preview */}
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'rgba(10,10,10,0.5)', letterSpacing: '0.08em', marginBottom: 6 }}>PREVIEW</label>
                  <div style={{
                    border: '1px solid rgba(10,10,10,0.1)', borderRadius: 8, overflow: 'hidden',
                    fontSize: 12, lineHeight: 1.5,
                  }}>
                    {/* Email chrome */}
                    <div style={{ background: '#F7F7F7', padding: '8px 12px', borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
                      <p style={{ margin: 0, fontSize: 11, color: 'rgba(10,10,10,0.4)', ...F }}>
                        <strong style={{ color: '#0A0A0A' }}>Subject:</strong> {previewSubject || '—'}
                      </p>
                    </div>
                    {/* Email body */}
                    <div style={{ background: '#FAFAFA', padding: '14px 14px 10px' }}>
                      <div style={{ background: '#FFFFFF', border: '1px solid #EEEEEE', padding: '16px' }}>
                        <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 800, color: '#0A0A0A', letterSpacing: '-0.01em', ...F }}>openinvite</p>
                        <div style={{ height: 1, background: '#F0F0F0', margin: '0 0 10px' }} />
                        {coupleName && (
                          <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 800, color: '#0A0A0A', letterSpacing: '-0.02em', ...F }}>{coupleName}</p>
                        )}
                        {dateStr && <p style={{ margin: '0 0 8px', fontSize: 11, color: 'rgba(10,10,10,0.5)', ...F }}>{dateStr}</p>}
                        <p style={{ margin: '0 0 10px', fontSize: 12, color: 'rgba(10,10,10,0.65)', whiteSpace: 'pre-wrap', ...F }}>{previewBody}</p>
                        <div style={{ background: '#E03553', borderRadius: 999, display: 'inline-block', padding: '6px 14px' }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#FFFFFF', ...F }}>RSVP now</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  {selectedGuests[0] && (
                    <p style={{ fontSize: 11, color: 'rgba(10,10,10,0.35)', marginTop: 6, ...F }}>
                      Preview shown for: {selectedGuests[0].name}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 3: Choose channel ─────────────────────────────────── */}
          {step === 3 && (
            <div>
              <h3 style={{ fontSize: 22, fontWeight: 800, color: '#0A0A0A', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
                How would you like to send?
              </h3>
              <p style={{ fontSize: 14, color: 'rgba(10,10,10,0.5)', margin: '0 0 28px' }}>
                Choose one or more channels to reach your guests.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
                {[
                  {
                    val: 'email', icon: Mail, label: 'Email',
                    desc: 'Send directly to their inbox',
                    count: selectedWithEmail.length,
                    countLabel: `${selectedWithEmail.length} guest${selectedWithEmail.length !== 1 ? 's' : ''} with email`,
                    skip: selectedNoEmail.length > 0 ? `${selectedNoEmail.length} missing email` : null,
                  },
                  {
                    val: 'whatsapp', icon: MessageCircle, label: 'WhatsApp',
                    desc: 'Opens a pre-filled WhatsApp message',
                    count: selectedGuests.length,
                    countLabel: `${selectedGuests.length} guest${selectedGuests.length !== 1 ? 's' : ''}`,
                    skip: selectedNoPhone.length > 0 ? `${selectedNoPhone.length} without phone number` : null,
                  },
                  {
                    val: 'both', icon: Send, label: 'Email + WhatsApp',
                    desc: 'Send by email and open WhatsApp for all',
                    count: null,
                    countLabel: `Maximum reach`,
                    skip: null,
                    recommended: true,
                  },
                ].map(opt => {
                  const Icon = opt.icon;
                  const active = channel === opt.val;
                  return (
                    <div
                      key={opt.val}
                      onClick={() => setChannel(opt.val)}
                      style={{
                        padding: '16px 20px', border: `2px solid ${active ? '#E03553' : 'rgba(10,10,10,0.1)'}`,
                        background: active ? '#FFF8F9' : '#FFFFFF',
                        cursor: 'pointer', borderRadius: 10, transition: 'all 0.15s ease',
                        display: 'flex', alignItems: 'center', gap: 16,
                      }}
                    >
                      <div style={{
                        width: 44, height: 44, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: active ? '#E03553' : 'rgba(10,10,10,0.06)',
                        transition: 'background 0.15s ease',
                      }}>
                        <Icon size={20} color={active ? '#FFFFFF' : '#0A0A0A'} strokeWidth={1.5} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                          <p style={{ fontSize: 15, fontWeight: 700, color: '#0A0A0A', margin: 0, ...F }}>{opt.label}</p>
                          {opt.recommended && (
                            <span style={{ fontSize: 10, fontWeight: 700, color: '#E03553', background: '#FFF0F3', padding: '2px 8px', borderRadius: 999 }}>RECOMMENDED</span>
                          )}
                        </div>
                        <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.5)', margin: '0 0 4px', ...F }}>{opt.desc}</p>
                        <p style={{ fontSize: 12, fontWeight: 600, color: active ? '#E03553' : 'rgba(10,10,10,0.4)', margin: 0, ...F }}>{opt.countLabel}</p>
                      </div>
                      {opt.skip && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                          <AlertCircle size={13} color="#F59E0B" />
                          <span style={{ fontSize: 11, color: '#F59E0B', fontWeight: 600, ...F }}>{opt.skip}</span>
                        </div>
                      )}
                      <div style={{
                        width: 20, height: 20, borderRadius: '50%', border: `2px solid ${active ? '#E03553' : 'rgba(10,10,10,0.2)'}`,
                        background: active ? '#E03553' : 'transparent', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.15s ease',
                      }}>
                        {active && <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#FFFFFF' }} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── STEP 4: Review & send ──────────────────────────────────── */}
          {step === 4 && (
            <div>
              <h3 style={{ fontSize: 22, fontWeight: 800, color: '#0A0A0A', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
                Ready to send?
              </h3>
              <p style={{ fontSize: 14, color: 'rgba(10,10,10,0.5)', margin: '0 0 24px' }}>
                Review the details before sending.
              </p>

              {/* Summary card */}
              <div style={{ border: '1px solid rgba(10,10,10,0.1)', borderRadius: 10, overflow: 'hidden', marginBottom: 24 }}>
                <div style={{ padding: '16px 20px', background: '#F7F7F7', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                  {[
                    { label: 'Guests', value: `${selectedGuests.length}` },
                    { label: 'Channel', value: channel === 'both' ? 'Email + WhatsApp' : channel === 'email' ? 'Email' : 'WhatsApp' },
                    { label: 'Type', value: isReminder ? 'Reminder' : 'Invitation' },
                  ].map(s => (
                    <div key={s.label} style={{ textAlign: 'center' }}>
                      <p style={{ fontSize: 20, fontWeight: 800, color: '#0A0A0A', margin: '0 0 2px', letterSpacing: '-0.03em', ...F }}>{s.value}</p>
                      <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(10,10,10,0.4)', margin: 0, letterSpacing: '0.06em', ...F }}>{s.label.toUpperCase()}</p>
                    </div>
                  ))}
                </div>

                {/* Message preview */}
                <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(10,10,10,0.08)' }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(10,10,10,0.4)', letterSpacing: '0.08em', margin: '0 0 6px', ...F }}>MESSAGE PREVIEW</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A', margin: '0 0 4px', ...F }}>{previewSubject}</p>
                  <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.55)', margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.5, ...F }}>{previewBody}</p>
                </div>

                {/* Guest list */}
                <div style={{ padding: '12px 20px 16px', borderTop: '1px solid rgba(10,10,10,0.08)' }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(10,10,10,0.4)', letterSpacing: '0.08em', margin: '0 0 8px', ...F }}>SENDING TO</p>
                  <div style={{ maxHeight: 160, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {selectedGuests.map(g => (
                      <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar name={g.name} size={28} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A', margin: 0, ...F }}>{g.name}</p>
                          <p style={{ fontSize: 11, color: 'rgba(10,10,10,0.4)', margin: 0, ...F }}>{g.email || 'No email'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* What happens next */}
              <div style={{ background: '#F7F7F7', borderRadius: 10, padding: '16px 20px' }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'rgba(10,10,10,0.5)', letterSpacing: '0.08em', margin: '0 0 12px', ...F }}>WHAT HAPPENS NEXT</p>
                {[
                  'Each guest gets a unique personal RSVP link',
                  'RSVPs will appear in your guest list automatically',
                  'You can see who has responded at a glance',
                ].map(item => (
                  <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                    <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#22C55E', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                      <Check size={11} color="#FFFFFF" strokeWidth={2.5} />
                    </div>
                    <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.7)', margin: 0, lineHeight: 1.4, ...F }}>{item}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer navigation */}
        <div style={{
          padding: '16px 32px', borderTop: '1px solid rgba(10,10,10,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0, background: '#FFFFFF',
        }}>
          {/* Left: selected count or back button */}
          <div>
            {step === 1 ? (
              <p style={{ fontSize: 13, fontWeight: 600, color: 'rgba(10,10,10,0.5)', margin: 0, ...F }}>
                {selected.size > 0
                  ? <><strong style={{ color: '#0A0A0A' }}>{selected.size}</strong> guest{selected.size !== 1 ? 's' : ''} selected</>
                  : 'Select at least one guest'
                }
              </p>
            ) : (
              <button
                onClick={() => setStep(s => s - 1)}
                disabled={sending}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px',
                  border: '1px solid rgba(10,10,10,0.15)', background: '#FFFFFF', color: '#0A0A0A',
                  borderRadius: 999, fontSize: 14, fontWeight: 600, cursor: 'pointer', ...F,
                }}
              >
                <ArrowLeft size={14} />
                Back
              </button>
            )}
          </div>

          {/* Right: next or send button */}
          <div style={{ display: 'flex', gap: 10 }}>
            {step < 4 ? (
              <button
                onClick={() => setStep(s => s + 1)}
                disabled={
                  (step === 1 && !canProceedStep1) ||
                  (step === 2 && !canProceedStep2)
                }
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '10px 22px',
                  background: '#E03553', color: '#FFFFFF',
                  border: 'none', borderRadius: 999, fontSize: 14, fontWeight: 700, cursor: 'pointer', ...F,
                  opacity: ((step === 1 && !canProceedStep1) || (step === 2 && !canProceedStep2)) ? 0.45 : 1,
                  transition: 'opacity 0.15s ease',
                }}
              >
                Next
                <ArrowRight size={14} />
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={sending || selectedGuests.length === 0}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '12px 28px',
                  background: '#E03553', color: '#FFFFFF',
                  border: 'none', borderRadius: 999, fontSize: 15, fontWeight: 700, cursor: 'pointer', ...F,
                  opacity: (sending || selectedGuests.length === 0) ? 0.5 : 1,
                  transition: 'opacity 0.15s ease',
                }}
              >
                {sending ? <Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Send size={15} />}
                {sending ? 'Sending…' : `Send to ${selectedGuests.length} guest${selectedGuests.length !== 1 ? 's' : ''}`}
              </button>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          /* Full screen on mobile */
        }
      `}</style>
    </>
  );
}
