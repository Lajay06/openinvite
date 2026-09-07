import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

const PJS = "'Plus Jakarta Sans', sans-serif";
const BTN = {
  border: '1px solid rgba(10,10,10,0.45)', background: 'transparent', color: '#0A0A0A',
  borderRadius: 999, padding: '7px 16px', fontFamily: PJS, fontSize: 12, fontWeight: 600,
  cursor: 'pointer', textDecoration: 'none', display: 'inline-flex', alignItems: 'center',
};

/**
 * SUBSCRIBE, NOT EXPORT.
 *
 * The .ics button beside this downloads a file: a copy of the schedule as it
 * stood the moment it was pressed, which never changes again. A subscription
 * is a URL Google re-reads, so an event moved here reaches the couple's phone
 * without them doing anything. Both are offered, and the download now says
 * which one it is.
 *
 * THE SENTENCE IS NOT A DISCLAIMER, IT IS THE TRUTH ABOUT THE THING. Google
 * re-reads a subscribed calendar every few hours, not immediately. A couple
 * who moves the ceremony and watches their phone for a minute needs to know
 * that before they conclude it is broken.
 *
 * The URL is fetched, never built here: the token is an HMAC under a
 * server-only secret, and a browser that could construct the link would be a
 * browser holding the secret.
 */
export default function SubscribeCalendar() {
  const [url, setUrl] = useState(null);
  const [state, setState] = useState('loading');

  useEffect(() => {
    let stopped = false;
    (async () => {
      try {
        const res = await fetch('/api/schedule-feed-url', {
          headers: { Authorization: `Bearer ${localStorage.getItem('base44_access_token')}` },
        });
        if (!res.ok) throw new Error(String(res.status));
        const { url: u } = await res.json();
        if (stopped) return;
        setUrl(u || null);
        setState(u ? 'ready' : 'unavailable');
      } catch {
        if (!stopped) setState('unavailable');
      }
    })();
    return () => { stopped = true; };
  }, []);

  if (state === 'loading') return null;
  if (state === 'unavailable') {
    // HONEST, not hidden. A button that is missing reads as a feature that
    // does not exist; a sentence reads as one that is not switched on.
    return (
      <p style={{ fontFamily: PJS, fontSize: 12, color: 'rgba(10,10,10,0.6)', margin: 0 }}>
        Calendar subscribing is not switched on for this wedding yet.
      </p>
    );
  }

  // webcal:// is what a calendar client expects; Google's cid parameter takes
  // the encoded feed URL.
  const webcal = url.replace(/^https?:/, 'webcal:');
  const googleUrl = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      <a href={googleUrl} target="_blank" rel="noopener noreferrer" style={BTN}>
        Subscribe in Google Calendar
      </a>
      <button
        type="button"
        style={BTN}
        onClick={() => {
          navigator.clipboard?.writeText(url)
            .then(() => toast.success('Subscribe link copied'))
            .catch(() => toast.error('Could not copy the link'));
        }}
      >
        Copy subscribe link
      </button>
      <span style={{ fontFamily: PJS, fontSize: 12, color: 'rgba(10,10,10,0.6)' }}>
        Google refreshes subscribed calendars every few hours.
      </span>
    </div>
  );
}
