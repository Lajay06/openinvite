import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Edit2, Trash2, Mail, Phone, Users } from "lucide-react";

const PJS = "'Plus Jakarta Sans', sans-serif";

const RSVP_STYLES = {
  attending: { background: '#DDF762', color: '#0A1930', border: 'none' },
  declined:  { background: '#E03553', color: '#FFFFFF', border: 'none' },
  pending:   { background: 'rgba(10,10,10,0.07)', color: '#444444', border: 'none' },
  maybe:     { background: '#803D81', color: '#FFFFFF', border: 'none' },
};

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

const RSVP_OPTIONS = [
  { value: 'pending',   label: 'Pending' },
  { value: 'attending', label: 'Attending' },
  { value: 'declined',  label: 'Declined' },
  { value: 'maybe',     label: 'Maybe' },
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
    // Normalise "Other: ..." back to "Other"
    return t.startsWith('Other: ') ? 'Other' : t;
  }).filter(t => t && t !== 'None');
}

function DietaryPills({ value }) {
  const items = parseDietaryList(value);
  if (items.length === 0) return null;
  const first = items[0];
  const rest  = items.length - 1;
  const colours = DIETARY_COLOURS[first] || DIETARY_COLOURS['Other'];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
      <span style={{ ...dietaryPillStyle, ...colours }}>{first}</span>
      {rest > 0 && (
        <span style={{ ...dietaryPillStyle, background: 'rgba(10,10,10,0.06)', color: '#444444' }}>+{rest}</span>
      )}
    </span>
  );
}

const getProfilePicture = (guest) => {
  if (guest.profile_picture_url) return guest.profile_picture_url;
  if (guest.email) {
    const hash = btoa(guest.email.toLowerCase().trim()).replace(/[^a-zA-Z0-9]/g, '');
    return `https://www.gravatar.com/avatar/${hash}?d=identicon&s=40`;
  }
  return null;
};

const getInitials = (name) =>
  name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';

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

const SkeletonRows = () => (
  <>
    {Array.from({ length: 6 }).map((_, i) => (
      <TableRow key={i}>
        <TableCell>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="skeleton-row" style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0 }} />
            <div className="skeleton-row" style={{ width: 120, height: 14 }} />
          </div>
        </TableCell>
        <TableCell><div className="skeleton-row" style={{ width: 140, height: 12 }} /></TableCell>
        <TableCell><div className="skeleton-row" style={{ width: 70, height: 18 }} /></TableCell>
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

/* ─── Main component ─────────────────────────────────────────────────────── */
export default function GuestList({ guests, onEdit, onDelete, onUpdate, loading }) {
  const [editCell, setEditCell] = useState(null); // { id, field }
  const [editValue, setEditValue] = useState('');

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

  return (
    <div style={{ border: '1px solid rgba(10,10,10,0.08)', overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <Table>
          <TableHeader>
            <TableRow style={{ background: '#FAFAFA' }}>
              <TableHead>Guest</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>RSVP</TableHead>
              <TableHead>Table</TableHead>
              <TableHead>+1</TableHead>
              <TableHead style={{ width: 48 }} />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? <SkeletonRows /> : guests.flatMap((guest) => {
              const rows = [];

              rows.push(
                <TableRow key={guest.id}>
                  {/* ── Guest name ── */}
                  <TableCell className="align-middle">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar className="w-8 h-8" style={{ flexShrink: 0 }}>
                        <AvatarImage src={getProfilePicture(guest)} alt={guest.name} />
                        <AvatarFallback style={{ background: 'rgba(10,10,10,0.06)', color: '#0A0A0A', fontSize: 11, fontWeight: 700 }}>
                          {getInitials(guest.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {textCell(guest, 'name',
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A', fontFamily: PJS, whiteSpace: 'nowrap' }}>
                              {guest.name}
                            </span>
                            <DietaryPills value={guest.dietary_restrictions} />
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

                  {/* ── RSVP ── */}
                  <TableCell className="align-middle">
                    {selectCell(guest, 'rsvp_status', RSVP_OPTIONS,
                      <BadgePill style={RSVP_STYLES[guest.rsvp_status] || RSVP_STYLES.pending}>
                        {guest.rsvp_status || 'pending'}
                      </BadgePill>
                    )}
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
                    <TableCell style={{ paddingTop: 5, paddingBottom: 5, paddingLeft: 44 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 12, color: 'rgba(10,10,10,0.25)', userSelect: 'none', lineHeight: 1 }}>↳</span>
                        <span style={{ fontSize: 12, color: 'rgba(10,10,10,0.5)', fontFamily: PJS, fontStyle: 'italic' }}>
                          {guest.plus_one_name || 'Plus one'}
                        </span>
                      </div>
                    </TableCell>
                    {/* Remaining 6 columns empty */}
                    <TableCell colSpan={6} />
                  </TableRow>
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
