import React, { useState, useMemo } from 'react';
import { X, CalendarCheck } from 'lucide-react';
import { getGuestEventResponse, toggleEventInvite } from '@/lib/weddingEvents';

const F = { fontFamily: "'Plus Jakarta Sans', sans-serif" };

/**
 * Bulk per-event invite setter — shared by the selection bar's "Set events"
 * action (multiple guests) and a single guest's "Set events & send" row
 * action (one guest). Mirrors GuestList's EventsInvitedCell toggle logic,
 * just applied to a whole set of guests at once.
 */
export default function SetEventsModal({ guests, weddingEvents, onUpdate, onClose, onSaved }) {
  // Seed each event's checkbox as checked only if every guest in the set is
  // already invited to it — otherwise unchecked (mixed state reads as "off").
  const [invitedByEvent, setInvitedByEvent] = useState(() => {
    const map = {};
    for (const event of weddingEvents) {
      map[event.event_id] = guests.length > 0 && guests.every(g => getGuestEventResponse(g, event).invited);
    }
    return map;
  });
  const [saving, setSaving] = useState(false);

  const guestNames = useMemo(() => guests.map(g => g.name).filter(Boolean), [guests]);

  const toggle = (eventId) => {
    setInvitedByEvent(prev => ({ ...prev, [eventId]: !prev[eventId] }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all(guests.map(guest => {
        let responses = guest.event_responses || [];
        for (const event of weddingEvents) {
          responses = toggleEventInvite({ event_responses: responses }, event, invitedByEvent[event.event_id]);
        }
        return onUpdate(guest.id, { event_responses: responses });
      }));
      onSaved?.();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(10,10,10,0.55)' }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        zIndex: 1000, width: 'min(90vw, 420px)', background: '#FFFFFF',
        border: '1px solid rgba(10,10,10,0.08)', ...F,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '20px 20px 0' }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0A0A0A', margin: '0 0 2px', letterSpacing: '-0.01em' }}>
              Set events
            </h2>
            <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.45)', margin: 0 }}>
              {guests.length === 1 ? guestNames[0] : `${guests.length} guests selected`}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.4)', padding: 4 }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: '16px 20px' }}>
          {weddingEvents.length === 0 ? (
            <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.45)', margin: 0 }}>No events set up for this wedding yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {weddingEvents.map(event => (
                <label
                  key={event.event_id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '9px 4px',
                    cursor: 'pointer', borderBottom: '1px solid rgba(10,10,10,0.05)',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={!!invitedByEvent[event.event_id]}
                    onChange={() => toggle(event.event_id)}
                    style={{ width: 15, height: 15, accentColor: '#E03553' }}
                  />
                  <CalendarCheck size={13} color="rgba(10,10,10,0.4)" />
                  <span style={{ fontSize: 13, color: '#0A0A0A' }}>{event.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '0 20px 20px' }}>
          <button onClick={onClose} className="btn-editorial-secondary">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving || weddingEvents.length === 0}
            className="btn-primary"
            style={{ opacity: saving || weddingEvents.length === 0 ? 0.5 : 1 }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </>
  );
}
