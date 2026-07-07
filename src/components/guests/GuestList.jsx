import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Edit2, Trash2, Mail, Phone, Users, ChevronDown, ChevronRight, CalendarPlus, Pencil } from "lucide-react";
import { getGuestEventResponse } from "@/lib/weddingEvents";

const PJS = "'Plus Jakarta Sans', sans-serif";

const CATEGORY_STYLES = {
  family:           { background: 'transparent', color: '#E03553',         border: '1px solid #E03553' },
  friends:          { background: 'transparent', color: '#803D81',         border: '1px solid #803D81' },
  colleagues:       { background: 'transparent', color: '#0A1930',         border: '1px solid #0A1930' },
  partners_family:  { background: 'transparent', color: '#444444',         border: '1px solid rgba(10,10,10,0.25)' },
  partners_friends: { background: 'transparent', color: '#803D81',         border: '1px solid #803D81' },
};

const CATEGORY_OPTIONS = [
  { value: '',                label: '— none —' },
  { value: 'family',          label: 'Family' },
  { value: 'friends',         label: 'Friends' },
  { value: 'colleagues',      label: 'Colleagues' },
  { value: 'partners_family', label: "Partner's family" },
  { value: 'partners_friends',label: "Partner's friends" },
];

const pillBase = {
  display: 'inline-block',
  fontFamily: PJS,
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.08em',
  padding: '3px 9px',
  borderRadius: 999,
  whiteSpace: 'nowrap',
};

const BadgePill = ({ style, children }) => (
  <span style={{ ...pillBase, ...style }}>{children}</span>
);

/* ── Per-event status chip — DESIGN_SPEC badge colours ───────────────────── */
const CHIP_BASE = {
  display: 'inline-flex', alignItems: 'center',
  fontFamily: PJS, fontSize: 10, fontWeight: 600, letterSpacing: '0.02em',
  padding: '2px 8px', borderRadius: 999, whiteSpace: 'nowrap',
};

function EventChip({ event, response }) {
  if (!response.invited) {
    return (
      <span style={{ ...CHIP_BASE, background: 'transparent', border: '1px solid rgba(10,10,10,0.15)', color: 'rgba(10,10,10,0.35)' }}>
        {event.name} — not invited
      </span>
    );
  }
  if (response.status === 'yes') {
    return <span style={{ ...CHIP_BASE, background: '#dcfce7', color: '#166534' }}>{event.name} · yes</span>;
  }
  if (response.status === 'no') {
    return <span style={{ ...CHIP_BASE, background: '#fee2e2', color: '#991b1b' }}>{event.name} · no</span>;
  }
  return <span style={{ ...CHIP_BASE, background: '#fef9c3', color: '#854d0e' }}>{event.name} · awaiting</span>;
}

function NotYetInvitedChip() {
  return (
    <span style={{ ...CHIP_BASE, background: 'transparent', border: '1px dashed rgba(10,10,10,0.25)', color: 'rgba(10,10,10,0.4)' }}>
      Not yet invited
    </span>
  );
}

/* ── Per-guest status chips + "Set events & send" for uninvited guests ──── */
function GuestStatusCell({ guest, weddingEvents, onSetEventsAndSend, onEditEvents }) {
  const hasResponses = Array.isArray(guest.event_responses) && guest.event_responses.length > 0;

  if (!hasResponses) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <NotYetInvitedChip />
        {weddingEvents.length > 0 && (
          <button
            type="button"
            onClick={() => onSetEventsAndSend(guest)}
            title="Choose which events to invite this guest to, then send"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              background: 'none', border: '1px solid rgba(10,10,10,0.15)', borderRadius: 999,
              padding: '2px 8px', fontSize: 10, fontWeight: 600, color: '#E03553',
              cursor: 'pointer', fontFamily: PJS,
            }}
          >
            <CalendarPlus size={11} />
            Set events &amp; send
          </button>
        )}
      </div>
    );
  }

  if (weddingEvents.length === 0) {
    return <span style={{ fontSize: 12, color: 'rgba(10,10,10,0.25)', fontFamily: PJS }}>—</span>;
  }

  // The whole chip row is clickable — reopens the same event-checkbox
  // control used by "Set events & send", pre-checked with current state,
  // so invites stay editable at any time, not just before the first send.
  return (
    <button
      type="button"
      onClick={() => onEditEvents?.(guest)}
      title="Edit which events this guest is invited to"
      style={{
        display: 'flex', flexWrap: 'wrap', gap: 5, maxWidth: 320,
        background: 'none', border: 'none', padding: 0, margin: 0, cursor: 'pointer', textAlign: 'left',
      }}
    >
      {weddingEvents.map(event => (
        <EventChip key={event.event_id} event={event} response={getGuestEventResponse(guest, event)} />
      ))}
    </button>
  );
}

/* ── Last sent — invite_sent_at + invite_channel ─────────────────────────── */
function fmtDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

const CHANNEL_LABELS = { email: 'Email', whatsapp: 'WhatsApp', 'email+whatsapp': 'Email + WhatsApp', 'whatsapp+email': 'Email + WhatsApp' };

function LastSentCell({ guest }) {
  if (!guest.invite_sent_at) {
    return <span style={{ fontSize: 12, color: 'rgba(10,10,10,0.3)', fontFamily: PJS }}>Not sent</span>;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <span style={{ fontSize: 12, color: '#444444', fontFamily: PJS }}>{fmtDate(guest.invite_sent_at)}</span>
      <span style={{ fontSize: 11, color: 'rgba(10,10,10,0.4)', fontFamily: PJS }}>
        {CHANNEL_LABELS[guest.invite_channel] || 'Sent'}
      </span>
    </div>
  );
}

/* ── Dietary pill colours ─────────────────────────────────────────────────── */
const DIETARY_COLOURS = {
  'Vegetarian':       { background: '#D1FAE5', color: '#065F46' },
  'Vegan':            { background: '#A7F3D0', color: '#064E3B' },
  'Gluten free':      { background: '#FEF3C7', color: '#92400E' },
  'Dairy free':       { background: '#DBEAFE', color: '#1E40AF' },
  'Halal':            { background: '#EDE9FE', color: '#5B21B6' },
  'Kosher':           { background: '#EDE9FE', color: '#5B21B6' },
  'Nut allergy':      { background: '#FFEDD5', color: '#9A3412' },
  'Shellfish allergy':{ background: '#FFEDD5', color: '#9A3412' },
  'Other':            { background: 'rgba(10,10,10,0.06)', color: '#444444' },
};

const dietaryPillStyle = {
  display: 'inline-block',
  fontFamily: PJS,
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: '0.06em',
  padding: '2px 7px',
  borderRadius: 999,
  whiteSpace: 'nowrap',
  lineHeight: 1.4,
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
  if (items.length === 0) return <span style={{ fontSize: 13, color: 'rgba(10,10,10,0.25)', fontFamily: PJS }}>—</span>;
  const first = items[0];
  const rest  = items.length - 1;
  const colours = DIETARY_COLOURS[first] || DIETARY_COLOURS['Other'];
  const tooltip = items.join(', ');
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }} title={tooltip}>
      <span style={{ ...dietaryPillStyle, ...colours }}>{first}</span>
      {rest > 0 && (
        <span style={{ ...dietaryPillStyle, background: 'rgba(10,10,10,0.06)', color: '#444444' }}>+{rest}</span>
      )}
    </span>
  );
}

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
      <span style={{ fontSize: 11, fontWeight: 700, color: '#FFFFFF', fontFamily: PJS, lineHeight: 1 }}>
        {getInitials(name)}
      </span>
    </div>
  );
}

const hoverCell = {
  cursor: 'text',
  borderRadius: 3,
  padding: '2px 4px',
  margin: '-2px -4px',
  transition: 'background 0.1s',
};

const hoverCellPointer = { ...hoverCell, cursor: 'pointer' };

const inputStyle = {
  width: '100%',
  border: 'none',
  borderBottom: '1.5px solid #E03553',
  background: 'transparent',
  fontSize: 13,
  fontFamily: PJS,
  color: '#0A0A0A',
  outline: 'none',
  padding: '2px 0',
  boxSizing: 'border-box',
};

const selectStyle = {
  fontSize: 12,
  fontFamily: PJS,
  border: '1px solid #E03553',
  borderRadius: 4,
  padding: '3px 6px',
  background: '#fff',
  cursor: 'pointer',
  outline: 'none',
  color: '#0A0A0A',
};

const COLUMN_COUNT = 10;

const SkeletonRows = () => (
  <>
    {Array.from({ length: 6 }).map((_, i) => (
      <TableRow key={i}>
        <TableCell><div className="skeleton-row" style={{ width: 15, height: 15 }} /></TableCell>
        <TableCell>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="skeleton-row" style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0 }} />
            <div className="skeleton-row" style={{ width: 120, height: 14 }} />
          </div>
        </TableCell>
        <TableCell><div className="skeleton-row" style={{ width: 140, height: 12 }} /></TableCell>
        <TableCell><div className="skeleton-row" style={{ width: 70, height: 18 }} /></TableCell>
        <TableCell><div className="skeleton-row" style={{ width: 70, height: 18 }} /></TableCell>
        <TableCell><div className="skeleton-row" style={{ width: 100, height: 18 }} /></TableCell>
        <TableCell><div className="skeleton-row" style={{ width: 70, height: 18 }} /></TableCell>
        <TableCell><div className="skeleton-row" style={{ width: 50, height: 14 }} /></TableCell>
        <TableCell><div className="skeleton-row" style={{ width: 30, height: 14 }} /></TableCell>
        <TableCell />
      </TableRow>
    ))}
  </>
);

/* ─── HoverDiv ───────────────────────────────────────────────────────────── */
function HoverDiv({ onClick, pointer, children, title }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      title={title}
      style={{
        ...(pointer ? hoverCellPointer : hoverCell),
        background: hovered ? 'rgba(10,10,10,0.04)' : 'transparent',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}
    </div>
  );
}

function fmtRespondedAt(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

const STATUS_LABELS = { yes: 'Attending', no: 'Declined', pending: 'Pending' };
const STATUS_COLORS = { yes: '#166534', no: '#991b1b', pending: 'rgba(10,10,10,0.4)' };

/* ── Per-event RSVP detail sub-row — shows what a guest actually answered ── */
function RsvpDetailRow({ guest, weddingEvents, onEditEvents }) {
  const hasNote = !!(guest.rsvp_note || guest.song_request);

  return (
    <TableRow style={{ background: 'rgba(10,10,10,0.015)' }}>
      <TableCell colSpan={COLUMN_COUNT} style={{ padding: '12px 16px 16px 52px' }}>
        {weddingEvents.length === 0 ? (
          <span style={{ fontSize: 12, color: 'rgba(10,10,10,0.4)', fontFamily: PJS }}>No events set up for this wedding yet.</span>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, border: '1px solid rgba(10,10,10,0.08)', maxWidth: 720 }}>
            <div style={{
              display: 'grid', gridTemplateColumns: '1.3fr 0.8fr 0.8fr 0.7fr 1.1fr 0.9fr',
              gap: 8, padding: '8px 12px', background: 'rgba(10,10,10,0.02)',
              borderBottom: '1px solid rgba(10,10,10,0.08)', alignItems: 'center',
            }}>
              {['Event', 'Invited', 'Status', 'Meal', 'Plus-one', 'Responded'].map(h => (
                <span key={h} style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', color: 'rgba(10,10,10,0.4)', fontFamily: PJS }}>{h}</span>
              ))}
            </div>
            {weddingEvents.map((event, i) => {
              const r = getGuestEventResponse(guest, event);
              const plusOneText = r.plus_ones > 0
                ? ((r.plus_one_names || []).filter(Boolean).join(', ') || `${r.plus_ones} guest${r.plus_ones > 1 ? 's' : ''}`)
                : '—';
              return (
                <div
                  key={event.event_id}
                  style={{
                    display: 'grid', gridTemplateColumns: '1.3fr 0.8fr 0.8fr 0.7fr 1.1fr 0.9fr',
                    gap: 8, padding: '10px 12px',
                    borderBottom: i < weddingEvents.length - 1 ? '1px solid rgba(10,10,10,0.05)' : 'none',
                  }}
                >
                  <span style={{ fontSize: 13, color: '#0A0A0A', fontFamily: PJS }}>{event.name}</span>
                  <span style={{ fontSize: 12, color: r.invited ? '#0A0A0A' : 'rgba(10,10,10,0.3)', fontFamily: PJS }}>
                    {r.invited ? 'Yes' : 'No'}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: r.invited ? (STATUS_COLORS[r.status] || STATUS_COLORS.pending) : 'rgba(10,10,10,0.25)', fontFamily: PJS }}>
                    {r.invited ? (STATUS_LABELS[r.status] || 'Pending') : '—'}
                  </span>
                  <span style={{ fontSize: 12, color: '#444444', fontFamily: PJS }}>
                    {r.invited && r.meal_choice ? r.meal_choice : '—'}
                  </span>
                  <span style={{ fontSize: 12, color: '#444444', fontFamily: PJS }}>
                    {r.invited ? plusOneText : '—'}
                  </span>
                  <span style={{ fontSize: 12, color: 'rgba(10,10,10,0.4)', fontFamily: PJS }}>
                    {r.invited ? fmtRespondedAt(r.responded_at) : '—'}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {weddingEvents.length > 0 && (
          <button
            type="button"
            onClick={() => onEditEvents?.(guest)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 10,
              background: 'none', border: '1px solid rgba(10,10,10,0.15)', borderRadius: 999,
              padding: '4px 10px', fontSize: 11, fontWeight: 600, color: '#0A0A0A',
              cursor: 'pointer', fontFamily: PJS,
            }}
          >
            <Pencil size={11} />
            Edit events
          </button>
        )}

        {hasNote && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 12, maxWidth: 720 }}>
            {guest.song_request && (
              <p style={{ fontSize: 12, color: '#444444', fontFamily: PJS, margin: 0 }}>
                <span style={{ color: 'rgba(10,10,10,0.4)', fontWeight: 700 }}>Song request: </span>
                {guest.song_request}
              </p>
            )}
            {guest.rsvp_note && (
              <p style={{ fontSize: 12, color: '#444444', fontFamily: PJS, margin: 0 }}>
                <span style={{ color: 'rgba(10,10,10,0.4)', fontWeight: 700 }}>Note: </span>
                {guest.rsvp_note}
              </p>
            )}
          </div>
        )}
      </TableCell>
    </TableRow>
  );
}

/* ─── Main component ─────────────────────────────────────────────────────── */
export default function GuestList({
  guests, onEdit, onDelete, onUpdate, guestRoles = {}, loading, weddingEvents = [],
  selectedIds, onToggleSelect, onToggleSelectAll, onSetEventsAndSend, onEditEvents,
}) {
  const [editCell, setEditCell] = useState(null); // { id, field }
  const [editValue, setEditValue] = useState('');
  const [expandedGuestIds, setExpandedGuestIds] = useState(() => new Set());

  const toggleExpanded = (guestId) => {
    setExpandedGuestIds(prev => {
      const next = new Set(prev);
      if (next.has(guestId)) next.delete(guestId);
      else next.add(guestId);
      return next;
    });
  };

  // Close edit cell on Escape at document level
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setEditCell(null); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const startEdit = (guestId, field, currentValue) => {
    setEditCell({ id: guestId, field });
    setEditValue(currentValue != null ? String(currentValue) : '');
  };

  const commitEdit = () => {
    if (!editCell) return;
    const { id, field } = editCell;
    const guest = guests.find(g => g.id === id);
    if (guest && onUpdate) {
      const prev = guest[field] != null ? String(guest[field]) : '';
      const next = editValue.trim();
      if (next !== prev) onUpdate(id, { [field]: next || null });
    }
    setEditCell(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter')  { e.preventDefault(); commitEdit(); }
    if (e.key === 'Escape') { setEditCell(null); }
  };

  const isEditing = (guestId, field) =>
    editCell?.id === guestId && editCell?.field === field;

  /* Text cell: renders an autoFocus input while editing, otherwise a hover div */
  const textCell = (guest, field, displayEl) => {
    if (isEditing(guest.id, field)) {
      return (
        <input
          autoFocus
          value={editValue}
          onChange={e => setEditValue(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={handleKeyDown}
          style={inputStyle}
        />
      );
    }
    return (
      <HoverDiv
        onClick={() => startEdit(guest.id, field, guest[field])}
        title="Click to edit"
      >
        {displayEl}
      </HoverDiv>
    );
  };

  /* Select cell: renders a native select while editing */
  const selectCell = (guest, field, options, displayEl) => {
    if (isEditing(guest.id, field)) {
      return (
        <select
          autoFocus
          value={editValue}
          onChange={e => {
            if (onUpdate) onUpdate(guest.id, { [field]: e.target.value || null });
            setEditCell(null);
          }}
          onBlur={() => setEditCell(null)}
          onKeyDown={e => { if (e.key === 'Escape') setEditCell(null); }}
          style={selectStyle}
        >
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      );
    }
    return (
      <HoverDiv
        onClick={() => startEdit(guest.id, field, guest[field] || '')}
        pointer
        title="Click to edit"
      >
        {displayEl}
      </HoverDiv>
    );
  };

  if (!loading && guests.length === 0) {
    return (
      <div style={{ border: '1px solid rgba(10,10,10,0.08)', padding: '64px 32px', textAlign: 'center' }}>
        <Users size={28} style={{ color: '#803D81', margin: '0 auto 12px' }} />
        <p style={{ fontSize: 13, color: '#444444', fontFamily: PJS, margin: 0 }}>
          No guests yet — add your first.
        </p>
      </div>
    );
  }

  const allVisibleSelected = guests.length > 0 && guests.every(g => selectedIds?.has(g.id));

  return (
    <div style={{ border: '1px solid rgba(10,10,10,0.08)', overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <Table>
          <TableHeader>
            <TableRow style={{ background: '#FAFAFA' }}>
              <TableHead style={{ width: 36 }}>
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={() => onToggleSelectAll && onToggleSelectAll(guests.map(g => g.id))}
                  style={{ width: 14, height: 14, accentColor: '#E03553' }}
                />
              </TableHead>
              <TableHead>Guest</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Dietary</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last sent</TableHead>
              <TableHead>Table</TableHead>
              <TableHead>+1</TableHead>
              <TableHead style={{ width: 48 }} />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? <SkeletonRows /> : guests.flatMap((guest) => {
              const rows = [];
              const isExpanded = expandedGuestIds.has(guest.id);

              rows.push(
                <TableRow key={guest.id}>
                  {/* ── Checkbox ── */}
                  <TableCell className="align-middle">
                    <input
                      type="checkbox"
                      checked={!!selectedIds?.has(guest.id)}
                      onChange={() => onToggleSelect && onToggleSelect(guest.id)}
                      style={{ width: 14, height: 14, accentColor: '#E03553' }}
                    />
                  </TableCell>

                  {/* ── Guest name (expand chevron + avatar + name) ── */}
                  <TableCell className="align-middle">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button
                        type="button"
                        onClick={() => toggleExpanded(guest.id)}
                        title={isExpanded ? 'Hide RSVP details' : 'Show RSVP details'}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center', color: 'rgba(10,10,10,0.4)', flexShrink: 0 }}
                      >
                        {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                      </button>
                      <GuestAvatar name={guest.name} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {textCell(guest, 'name',
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A', fontFamily: PJS, whiteSpace: 'nowrap' }}>
                              {guest.name}
                            </span>
                            {guestRoles[guest.id] && (
                              <span style={{ ...dietaryPillStyle, background: '#0A1930', color: '#DDF762' }}>
                                {guestRoles[guest.id]}
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </TableCell>

                  {/* ── Contact ── */}
                  <TableCell className="align-middle">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {textCell(guest, 'email',
                        guest.email ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#444444', fontFamily: PJS }}>
                            <Mail size={11} />{guest.email}
                          </div>
                        ) : (
                          <span style={{ fontSize: 12, color: 'rgba(10,10,10,0.25)', fontFamily: PJS }}>Add email…</span>
                        )
                      )}
                      {textCell(guest, 'phone',
                        guest.phone ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#444444', fontFamily: PJS }}>
                            <Phone size={11} />{guest.phone}
                          </div>
                        ) : (
                          <span style={{ fontSize: 12, color: 'rgba(10,10,10,0.25)', fontFamily: PJS }}>Add phone…</span>
                        )
                      )}
                    </div>
                  </TableCell>

                  {/* ── Category ── */}
                  <TableCell className="align-middle">
                    {selectCell(guest, 'category', CATEGORY_OPTIONS,
                      guest.category ? (
                        <BadgePill style={CATEGORY_STYLES[guest.category] || CATEGORY_STYLES.family}>
                          {guest.category.replace(/_/g, ' ')}
                        </BadgePill>
                      ) : (
                        <span style={{ fontSize: 12, color: 'rgba(10,10,10,0.25)', fontFamily: PJS }}>—</span>
                      )
                    )}
                  </TableCell>

                  {/* ── Dietary ── */}
                  <TableCell className="align-middle">
                    <DietaryCell value={guest.dietary_restrictions} />
                  </TableCell>

                  {/* ── Status — per-event chips (replaces RSVP + Invited to) ── */}
                  <TableCell className="align-middle">
                    <GuestStatusCell guest={guest} weddingEvents={weddingEvents} onSetEventsAndSend={onSetEventsAndSend} onEditEvents={onEditEvents} />
                  </TableCell>

                  {/* ── Last sent ── */}
                  <TableCell className="align-middle">
                    <LastSentCell guest={guest} />
                  </TableCell>

                  {/* ── Table ── */}
                  <TableCell className="align-middle">
                    {textCell(guest, 'table_assignment',
                      <span style={{ fontSize: 13, color: '#444444', fontFamily: PJS }}>
                        {guest.table_assignment || '—'}
                      </span>
                    )}
                  </TableCell>

                  {/* ── +1 toggle ── */}
                  <TableCell className="align-middle">
                    <HoverDiv
                      onClick={() => onUpdate && onUpdate(guest.id, { plus_one: !guest.plus_one })}
                      pointer
                      title="Click to toggle"
                    >
                      {guest.plus_one ? (
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', fontFamily: PJS }}>+1 ✓</span>
                      ) : (
                        <span style={{ fontSize: 12, color: 'rgba(10,10,10,0.3)', fontFamily: PJS }}>—</span>
                      )}
                    </HoverDiv>
                  </TableCell>

                  {/* ── Actions ── */}
                  <TableCell className="align-middle">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal size={15} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(guest)}>
                          <Edit2 size={13} style={{ marginRight: 8 }} />Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDelete(guest.id)} style={{ color: '#E03553' }}>
                          <Trash2 size={13} style={{ marginRight: 8 }} />Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );

              /* ── Plus one sub-row ── */
              if (guest.plus_one) {
                rows.push(
                  <TableRow key={`${guest.id}-po`} style={{ background: 'rgba(10,10,10,0.015)', borderBottom: '1px solid rgba(10,10,10,0.04)' }}>
                    <TableCell colSpan={2} style={{ paddingTop: 5, paddingBottom: 5, paddingLeft: 52 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 12, color: 'rgba(10,10,10,0.25)', userSelect: 'none', lineHeight: 1 }}>↳</span>
                        <span style={{ fontSize: 12, color: 'rgba(10,10,10,0.5)', fontFamily: PJS, fontStyle: 'italic' }}>
                          {guest.plus_one_name || 'Plus one'}
                        </span>
                      </div>
                    </TableCell>
                    {/* Remaining columns empty */}
                    <TableCell colSpan={COLUMN_COUNT - 2} />
                  </TableRow>
                );
              }

              /* ── RSVP detail sub-row (per-event answers + note/song) ── */
              if (isExpanded) {
                rows.push(
                  <RsvpDetailRow key={`${guest.id}-rsvp`} guest={guest} weddingEvents={weddingEvents} onEditEvents={onEditEvents} />
                );
              }

              return rows;
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
