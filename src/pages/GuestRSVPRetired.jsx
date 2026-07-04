import React from 'react';

const F = { fontFamily: "'Plus Jakarta Sans', Helvetica, Arial, sans-serif" };

// The old email-lookup RSVP page (/GuestRSVP) has been retired in favour of
// each guest's personal /rsvp/:token link. This page exists only so that
// links already sent in old emails never 404 — it explains where to look
// instead of silently failing.
export default function GuestRSVPRetired() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAFAFA', padding: '24px', ...F }}>
      <div style={{ textAlign: 'center', maxWidth: 420 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#E03553', letterSpacing: '0.1em', marginBottom: 12 }}>
          RSVP LINK UPDATED
        </p>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0A0A0A', marginBottom: 12, letterSpacing: '-0.02em' }}>
          This RSVP link has moved
        </h1>
        <p style={{ fontSize: 15, color: 'rgba(10,10,10,0.55)', lineHeight: 1.6 }}>
          Each guest now has their own personal RSVP link. Please check the invitation
          email you received for a link that looks like <strong>openinvite.com.au/rsvp/…</strong>,
          or contact the couple directly and they can resend it to you.
        </p>
      </div>
    </div>
  );
}
