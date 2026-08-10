import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Check, X as XIcon, Clock } from 'lucide-react';
import GuestAvatar from '@/components/shared/GuestAvatar';
import { interactiveDivProps } from '@/lib/a11y';
import { isAttending, isDeclined } from '@/lib/guestRsvpTally';

const SEAT = 20;
const PJS = "'Plus Jakarta Sans', sans-serif";

// Table geometry lives here as module constants rather than inline in the
// component, because seatSpacingCanvasPx() below has to derive the exact
// same numbers. Two copies would drift and the label degradation would then
// be computed against a spacing the seats don't actually use.
const TABLE_W_ROUND = 100, TABLE_H_ROUND = 100;
const TABLE_W_RECT  = 130, TABLE_H_RECT  = 60;
const SEAT_ORBIT_GAP = 30;

/**
 * Center-to-center distance between two adjacent seats, in unscaled canvas
 * px. Mirrors getSeatPositions() exactly — round seats sit on an orbit and
 * divide its circumference; rectangle seats divide the table's width across
 * the top and bottom edges independently.
 */
export function seatSpacingCanvasPx(shape, capacity) {
  const cap = Math.max(1, capacity || 1);
  if (shape !== 'rectangle') {
    return (2 * Math.PI * (TABLE_W_ROUND / 2 + SEAT_ORBIT_GAP)) / cap;
  }
  return TABLE_W_RECT / (Math.ceil(cap / 2) + 1);
}

/**
 * Seat labels degrade by how much room a name actually has ON SCREEN, not
 * by zoom level and not by seat count. Those two are only proxies: a round
 * eight-top at 60% has far more room per seat than a rectangle eight-top at
 * 200%, because the rectangle crams four seats across 130px of table edge
 * while the round table spreads eight around a 503px orbit.
 *
 * Why degrade at all rather than hard-gate on zoom: a couple wants full
 * names when zoomed in on one table, and density when zoomed out looking at
 * the whole room. Degrading matches how the feature is used, so it is the
 * intended behavior rather than a fallback. The hover tooltip always
 * carries the complete name, at every form.
 *
 * Ordered widest to narrowest, which is NOT the order it looks like it
 * should be. "Alexandra F." measures 59.2px at this type size and
 * "Alexandra" measures 48.4px — first-name-plus-last-initial is WIDER than
 * first-name-alone, so it has to sit above it in the ladder, not below.
 * Ordering them the intuitive way round put a wider string in the narrower
 * slot and rectangle tables overlapped their own labels at 200%.
 */
const LABEL_FONT = '600 10px "Plus Jakarta Sans", sans-serif';
let _measureCtx = null;
function measureLabelPx(text) {
  if (!_measureCtx) _measureCtx = document.createElement('canvas').getContext('2d');
  _measureCtx.font = LABEL_FONT;
  return _measureCtx.measureText(text).width;
}

export const LABEL_FORMS = [
  { key: 'full',    label: 'full names',
    format: (n) => n },
  { key: 'initial', label: 'shortened names',
    format: (n) => { const p = n.trim().split(/\s+/); return p.length > 1 ? `${p[0]} ${p[p.length - 1][0]}.` : p[0]; } },
  { key: 'first',   label: 'first names',
    format: (n) => n.trim().split(/\s+/)[0] },
  { key: 'none',    label: 'initials',
    format: () => '' },
];

/**
 * Room on screen for one seat's label: the center-to-center gap to the next
 * seat. Labels are centered under their seat, so two adjacent ones touch at
 * exactly this width — measuring against it is what keeps them apart.
 */
export function availableLabelPx(shape, capacity, renderScale) {
  return seatSpacingCanvasPx(shape, capacity) * (renderScale || 1);
}

/**
 * The widest form of THIS name that fits the space THIS seat has. Measured
 * per name, not compared against fixed px thresholds — a threshold is a
 * guess about how wide a name is, and the guess was wrong by 15px on the
 * first name it was tested against.
 */
export function labelForName(name, availablePx) {
  const clean = (name || '').trim();
  for (const form of LABEL_FORMS) {
    const text = form.format(clean);
    if (!text) return { form, text: '' };
    if (measureLabelPx(text) <= availablePx) return { form, text };
  }
  return { form: LABEL_FORMS[LABEL_FORMS.length - 1], text: '' };
}

/* Custom hover tooltip — the browser's native `title` attribute is slow to
   appear and can't be styled, which left a seat's occupant effectively
   guessable only from their avatar initials at a glance. Shows the full
   name + tags immediately on hover instead.
   Portal'd to document.body and positioned via getBoundingClientRect,
   rather than an absolutely-positioned child of the seat — two nearby
   tables are separate sibling stacking contexts (each table's own
   position:absolute wrapper in Seating.jsx), so a z-index set only inside
   one table's subtree can still be painted over by a later-in-DOM sibling
   table. Rendering at the document root sidesteps that entirely instead of
   chasing z-index numbers across stacking contexts. */
function SeatTooltip({ guest, rect }) {
  if (!rect) return null;
  return createPortal(
    <div style={{
      position: 'fixed', left: rect.left + rect.width / 2, top: rect.top - 8,
      transform: 'translate(-50%, -100%)',
      background: '#FFFFFF', color: '#0A0A0A', padding: '6px 10px', borderRadius: 6,
      fontSize: 11, fontFamily: PJS, whiteSpace: 'nowrap', pointerEvents: 'none',
      zIndex: 9999, boxShadow: '0 4px 16px rgba(10,10,10,0.18)', border: '1px solid rgba(10,10,10,0.08)',
    }}>
      <div style={{ fontWeight: 700 }}>{guest ? guest.name : 'Empty seat'}</div>
      {guest?.tags?.length > 0 && (
        <div style={{ fontSize: 10, color: 'rgba(10,10,10,0.6)', marginTop: 1 }}>
          {guest.tags.join(', ')}
        </div>
      )}
      <div style={{
        position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
        width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent',
        borderTop: '5px solid #FFFFFF',
      }} />
    </div>,
    document.body
  );
}

// Small RSVP-state badge in the seat's corner — attending/declined/awaiting,
// read straight off the guest's existing rsvp_status (same three-state
// grouping guestRsvpTally.js already uses elsewhere), not a new field.
const STATUS_BADGE = {
  attending: { bg: '#22C55E', Icon: Check },
  declined:  { bg: '#EF4444', Icon: XIcon },
  awaiting:  { bg: '#F59E0B', Icon: Clock },
};

function RsvpStatusBadge({ guest }) {
  const key = isAttending(guest) ? 'attending' : isDeclined(guest) ? 'declined' : 'awaiting';
  const { bg, Icon } = STATUS_BADGE[key];
  return (
    <div style={{
      position: 'absolute', bottom: -2, right: -2,
      width: 10, height: 10, borderRadius: '50%',
      background: bg, border: '1.5px solid #FFFFFF',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 4, pointerEvents: 'none',
    }}>
      <Icon size={7} color="#FFFFFF" strokeWidth={3} />
    </div>
  );
}

function getSeatPositions(shape, tableW, tableH, capacity, cx, cy) {
  const positions = [];
  if (shape === 'round') {
    const orbit = tableW / 2 + 30;
    for (let i = 0; i < capacity; i++) {
      const angle = (i / capacity) * 2 * Math.PI - Math.PI / 2;
      positions.push({
        left: cx + orbit * Math.cos(angle) - SEAT / 2,
        top: cy + orbit * Math.sin(angle) - SEAT / 2,
      });
    }
  } else {
    const seatsTop = Math.ceil(capacity / 2);
    const seatsBot = Math.floor(capacity / 2);
    const tableLeft = cx - tableW / 2;
    const tableTop = cy - tableH / 2;
    for (let i = 0; i < seatsTop; i++) {
      positions.push({
        left: tableLeft + ((i + 1) / (seatsTop + 1)) * tableW - SEAT / 2,
        top: tableTop - 30 - SEAT / 2,
      });
    }
    for (let i = 0; i < seatsBot; i++) {
      positions.push({
        left: tableLeft + ((i + 1) / (seatsBot + 1)) * tableW - SEAT / 2,
        top: tableTop + tableH + 30 - SEAT / 2,
      });
    }
  }
  return positions;
}

export default function VisualTable({ table, guests, onSeatClick, selected, selectedSeatIndex, labelMode = 'initials', renderScale = 1 }) {
  const isRound = table.shape !== 'rectangle';
  const tableW = isRound ? TABLE_W_ROUND : TABLE_W_RECT;
  const tableH = isRound ? TABLE_H_ROUND : TABLE_H_RECT;
  const availablePx = availableLabelPx(table.shape, table.capacity, renderScale);

  const containerW = isRound ? 220 : 240;
  const containerH = isRound ? 220 : 160;
  const cx = containerW / 2;
  const cy = containerH / 2;

  const seatPositions = getSeatPositions(table.shape, tableW, tableH, table.capacity, cx, cy);

  const findGuest = (seatIndex) => {
    const a = (table.assigned_guests || []).find(g => g.seat_index === seatIndex);
    if (!a) return null;
    return guests.find(g => g.id === a.guest_id);
  };

  const assignedCount = (table.assigned_guests || []).length;
  const isFull = assignedCount >= table.capacity;

  return (
    <div style={{ width: containerW, height: containerH, position: 'relative', userSelect: 'none' }}>
      {/* Table body — selected gets an accent ring/glow + a gentle pulse
          (fix/seating-polish: "selected table is visually obvious"), not
          just a border-colour swap that's easy to miss at a glance. */}
      <div
        className={selected ? 'seating-table-selected' : undefined}
        style={{
          position: 'absolute',
          left: cx - tableW / 2,
          top: cy - tableH / 2,
          width: tableW,
          height: tableH,
          borderRadius: isRound ? '50%' : 0,
          background: selected ? 'rgba(224,53,83,0.06)' : '#FFFFFF',
          border: selected ? '2px solid #E03553' : '2px solid rgba(10,10,10,0.15)',
          boxShadow: selected ? '0 0 0 4px rgba(224,53,83,0.16), 0 4px 16px rgba(224,53,83,0.25)' : 'none',
          transform: selected ? 'scale(1.045)' : 'scale(1)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'border-color 0.15s, background 0.15s, box-shadow 0.15s, transform 0.15s',
          zIndex: 2,
        }}
      >
        <span style={{
          color: selected ? '#E03553' : '#0A0A0A',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          textAlign: 'center', lineHeight: 1.3, padding: '0 8px', maxWidth: '100%',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {table.name}
        </span>
        <span style={{
          fontSize: 9, color: isFull ? '#6b7700' : 'rgba(10,10,10,0.6)',
          fontFamily: "'Plus Jakarta Sans', sans-serif", marginTop: 2, fontWeight: 600,
        }}>
          {assignedCount}/{table.capacity}
        </span>
      </div>

      {/* Seats */}
      {seatPositions.map((pos, i) => {
        const guest = findGuest(i);
        const isSeatSelected = selectedSeatIndex === i;
        return (
          <SeatCircle
            key={i}
            pos={pos}
            guest={guest}
            isSeatSelected={isSeatSelected}
            onClick={(e) => { e.stopPropagation(); onSeatClick && onSeatClick(table.id, i, guest?.id); }}
            onSeatClick={onSeatClick}
            tableId={table.id}
            seatIndex={i}
            nameLabel={labelMode === 'names' && guest ? labelForName(guest.name, availablePx).text : ''}
            renderScale={renderScale}
          />
        );
      })}
    </div>
  );
}

function SeatCircle({ pos, guest, isSeatSelected, onClick, onSeatClick, tableId, seatIndex, nameLabel = '', renderScale = 1 }) {
  const [hovered, setHovered] = useState(false);
  const [rect, setRect] = useState(null);
  const seatRef = useRef(null);

  const handleMouseEnter = () => {
    setHovered(true);
    if (seatRef.current) setRect(seatRef.current.getBoundingClientRect());
  };

  return (
    <div
      ref={seatRef}
      className={isSeatSelected ? 'seating-seat-selected' : undefined}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setHovered(false)}
      {...interactiveDivProps(() => onSeatClick && onSeatClick(tableId, seatIndex, guest?.id), { label: guest ? guest.name : 'Empty seat' })}
      style={{
        position: 'absolute',
        left: Math.round(pos.left),
        top: Math.round(pos.top),
        width: SEAT,
        height: SEAT,
        borderRadius: '50%',
        // Assigned seats: solid navy fill + a white ring so they read
        // as "occupied" at a glance, not just a colour swap. Empty
        // seats: dashed outline only, no fill — the two states can't
        // be confused even at a small size (fix/seating-polish).
        // Selected seat: the same accent ring/glow/pulse pattern as a
        // selected table (fix/seating-select-import-cleanup), scaled
        // down for a 20px circle — layered on top of the
        // assigned/empty look so all three states (selected, assigned,
        // empty) stay visually distinct even in combination.
        background: guest ? '#0A1930' : (isSeatSelected ? 'rgba(224,53,83,0.14)' : 'transparent'),
        border: isSeatSelected ? '2px solid #E03553' : (guest ? '2px solid #FFFFFF' : '1.5px dashed rgba(10,10,10,0.45)'),
        boxShadow: isSeatSelected
          ? '0 0 0 3px rgba(224,53,83,0.22), 0 2px 10px rgba(224,53,83,0.35)'
          : (guest ? '0 1px 4px rgba(10,10,10,0.35)' : 'none'),
        transform: isSeatSelected ? 'scale(1.2)' : 'scale(1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'all 0.12s',
        zIndex: 3,
      }}
    >
      {guest && (
        <GuestAvatar name={guest.name} email={guest.email} profilePictureUrl={guest.profile_picture_url} size={SEAT - 4} />
      )}
      {guest && <RsvpStatusBadge guest={guest} />}
      {/* Counter-scaled by 1/renderScale so the name holds a constant ~10px
          on screen at any zoom — the canvas transform would otherwise shrink
          it out of legibility exactly when the couple zooms out to read the
          room. The white halo keeps it readable over both the dot grid and
          an uploaded venue photo. */}
      {nameLabel && (
        <div style={{
          position: 'absolute', top: '100%', left: '50%',
          transform: `translateX(-50%) scale(${1 / (renderScale || 1)})`,
          transformOrigin: 'top center', marginTop: 3,
          fontSize: 10, lineHeight: 1.2, fontWeight: 600, fontFamily: PJS,
          color: '#0A0A0A', whiteSpace: 'nowrap', pointerEvents: 'none',
          textShadow: '0 0 3px #FFFFFF, 0 0 3px #FFFFFF, 0 0 3px #FFFFFF',
          zIndex: 5,
        }}>
          {nameLabel}
        </div>
      )}
      {hovered && <SeatTooltip guest={guest} rect={rect} />}
    </div>
  );
}
