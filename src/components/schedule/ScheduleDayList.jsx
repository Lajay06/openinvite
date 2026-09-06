import React from 'react';
import { MapPin, Clock } from 'lucide-react';
import { groupEventsByDay } from '@/lib/scheduleEvents';

const PJS = "'Plus Jakarta Sans', sans-serif";

/** "Saturday, 3 July 2027" from a plain YYYY-MM-DD, with no timezone shift. */
function dayLabel(key) {
  const [y, m, d] = String(key).split('-').map(Number);
  if (!y || !m || !d) return key;
  // Constructed as LOCAL midnight. `new Date('2027-07-03')` is UTC midnight,
  // which prints as the 2nd for every couple west of Greenwich — the same
  // defect the wedding countdown had.
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

/** "3:00 PM" from "15:00". */
function timeLabel(t) {
  if (!t) return '';
  const [h, m] = String(t).split(':').map(Number);
  if (Number.isNaN(h)) return t;
  return `${h % 12 || 12}:${String(m || 0).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

/**
 * THE PAGE'S FIRST ANSWER: what is happening, in order, by day.
 *
 * Every field the row can carry and nothing it cannot — time, name, location.
 * A derived event (an RSVP deadline, a vendor contract date) has no time and
 * no place, so those lines are omitted rather than printed empty.
 *
 * Only the couple's own schedule rows can be opened for editing; the rest are
 * read-outs of data that lives on another page and is edited there.
 */
export default function ScheduleDayList({ events = [], onEdit, emptyNote }) {
  const days = groupEventsByDay(events);

  if (!days.length) {
    return (
      <div style={{ padding: '48px 0', fontFamily: PJS, fontSize: 14, color: 'rgba(10,10,10,0.6)' }}>
        {emptyNote || 'Nothing on the schedule yet. Use “Add event” to put the first thing on it.'}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, fontFamily: PJS }}>
      {days.map(({ date, events: dayEvents }) => (
        <section key={date}>
          <h3 style={{
            fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'none',
            color: 'rgba(10,10,10,0.6)', margin: '0 0 10px',
          }}>
            {date ? dayLabel(date) : 'No date yet'}
            <span style={{ fontWeight: 600, marginLeft: 10, color: 'rgba(10,10,10,0.45)' }}>
              {dayEvents.length} {dayEvents.length === 1 ? 'event' : 'events'}
            </span>
          </h3>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, borderTop: '1px solid rgba(10,10,10,0.12)' }}>
            {dayEvents.map((e) => {
              const editable = e.type === 'schedule' && !!onEdit;
              return (
                <li key={e.id} style={{ borderBottom: '1px solid rgba(10,10,10,0.12)' }}>
                  <div
                    onClick={editable ? () => onEdit(e) : undefined}
                    style={{
                      display: 'flex', alignItems: 'baseline', gap: 16, padding: '13px 4px',
                      cursor: editable ? 'pointer' : 'default',
                    }}
                    {...(editable ? { role: 'button', tabIndex: 0, onKeyDown: (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); onEdit(e); } } } : {})}
                  >
                    <span style={{
                      width: 84, flexShrink: 0, fontSize: 13, fontWeight: 600,
                      color: e.time ? '#0A0A0A' : 'rgba(10,10,10,0.45)',
                    }}>
                      {e.time ? timeLabel(e.time) : 'All day'}
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#0A0A0A' }}>{e.title}</span>
                      {e.location && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginLeft: 12, fontSize: 13, color: 'rgba(10,10,10,0.6)' }}>
                          <MapPin size={12} style={{ color: 'rgba(10,10,10,0.45)' }} />{e.location}
                        </span>
                      )}
                      {e.endTime && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginLeft: 12, fontSize: 13, color: 'rgba(10,10,10,0.6)' }}>
                          <Clock size={12} style={{ color: 'rgba(10,10,10,0.45)' }} />until {timeLabel(e.endTime)}
                        </span>
                      )}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
