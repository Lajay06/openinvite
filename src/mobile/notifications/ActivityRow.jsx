import React from 'react';
import { typeIcon } from './icons';
import { relativeTime } from './feed';

/**
 * One activity row, shared by Home's "Latest" and the notification center
 * (goal 4, phase 5): a 36px circular tile in a soft tint of the type color
 * (or the person's initials when a guest is involved), the title at 15/20,
 * one line of detail at 13/18, the relative time right aligned, and a small
 * red dot for unread. Rows are at least 64px tall; the hairline between
 * them starts past the tile.
 */
export default function ActivityRow({ item, now = Date.now(), onOpen }) {
  const { icon: Icon, tile } = typeIcon(item.type);
  const name = personName(item);
  return (
    <button type="button" className={`oi-m-act oi-m-press${item.unread ? ' oi-m-act--unread' : ''}`} onClick={() => onOpen?.(item)}>
      {name
        ? <span className="oi-m-act__tile oi-m-act__tile--person" aria-hidden="true">{initials(name)}</span>
        : <span className={`oi-m-act__tile oi-m-act__tile--${tile}`} aria-hidden="true"><Icon size={16} strokeWidth={1.75} /></span>}
      <span className="oi-m-act__body">
        <span className="oi-m-act__title">{item.title}</span>
        {item.body && <span className="oi-m-act__detail">{item.body}</span>}
      </span>
      <span className="oi-m-act__side">
        <span className="oi-m-act__time">{relativeTime(item.ts, now)}</span>
        {item.unread && <span className="oi-m-act__dot" aria-label="Unread" />}
      </span>
    </button>
  );
}

/** A group heading for the center: "Today", "This week", "Earlier". */
export function ActivityGroupTitle({ children }) {
  return <h2 className="oi-m-act-group">{children}</h2>;
}

/** The guest behind an item, when there is one. */
export function personName(item) {
  const d = item.data || {};
  if (/^rsvp_/.test(item.type)) return d.name || null;
  if (item.type === 'message' || item.type === 'guestbook') return d.guest_name || null;
  if (item.type === 'gift') return d.giver_name || null;
  if (item.type === 'song_request') return d.submittedBy || null;
  return null;
}

export function initials(name) {
  return String(name).trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() || '').join('');
}
