import React from 'react';

const getInitials = (name) => {
  if (!name) return '';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

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

export default function VisualTable({ table, guests, onSeatClick, selected }) {
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
      {/* Table body */}
      <div style={{
        position: 'absolute',
        left: cx - tableW / 2,
        top: cy - tableH / 2,
        width: tableW,
        height: tableH,
        borderRadius: isRound ? '50%' : 0,
        background: selected ? 'rgba(224,53,83,0.06)' : '#FFFFFF',
        border: selected ? '2px solid #E03553' : '2px solid rgba(10,10,10,0.15)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'border-color 0.15s, background 0.15s',
        zIndex: 2,
      }}>
        <span style={{
          color: selected ? '#E03553' : '#0A0A0A',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          textAlign: 'center', lineHeight: 1.3, padding: '0 8px', maxWidth: '100%',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {table.name}
        </span>
        <span style={{
          fontSize: 9, color: isFull ? '#6b7700' : 'rgba(10,10,10,0.4)',
          fontFamily: "'Plus Jakarta Sans', sans-serif", marginTop: 2, fontWeight: 600,
        }}>
          {assignedCount}/{table.capacity}
        </span>
      </div>

      {/* Seats */}
      {seatPositions.map((pos, i) => {
        const guest = findGuest(i);
        return (
          <div
            key={i}
            onClick={(e) => { e.stopPropagation(); onSeatClick && onSeatClick(table.id, i, guest?.id); }}
            title={guest ? guest.name : 'Empty seat'}
            style={{
              position: 'absolute',
              left: Math.round(pos.left),
              top: Math.round(pos.top),
              width: SEAT,
              height: SEAT,
              borderRadius: '50%',
              background: guest ? '#0A1930' : 'transparent',
              border: guest ? 'none' : '1.5px dashed rgba(10,10,10,0.22)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.12s',
              zIndex: 3,
            }}
          >
            {guest && (
              <span style={{
                fontSize: 6, fontWeight: 700, color: '#FFFFFF',
                fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1,
              }}>
                {getInitials(guest.name)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
