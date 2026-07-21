import React from 'react';
import GuestAvatar from '@/components/shared/GuestAvatar';
import { interactiveDivProps } from '@/lib/a11y';

const SEAT = 20;

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

export default function VisualTable({ table, guests, onSeatClick, selected, selectedSeatIndex }) {
  const isRound = table.shape !== 'rectangle';
  const tableW = isRound ? 100 : 130;
  const tableH = isRound ? 100 : 60;

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
          <div
            key={i}
            className={isSeatSelected ? 'seating-seat-selected' : undefined}
            onClick={(e) => { e.stopPropagation(); onSeatClick && onSeatClick(table.id, i, guest?.id); }}
            {...interactiveDivProps(() => onSeatClick && onSeatClick(table.id, i, guest?.id), { label: guest ? guest.name : 'Empty seat' })}
            title={guest ? (guest.tags?.length ? `${guest.name} — ${guest.tags.join(', ')}` : guest.name) : 'Empty seat'}
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
          </div>
        );
      })}
    </div>
  );
}
