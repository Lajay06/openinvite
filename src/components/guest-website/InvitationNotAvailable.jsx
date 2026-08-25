import React from 'react';

/**
 * What a guest sees when an invitation link does not resolve.
 *
 * WHAT THIS REPLACES. MultiPageWeddingWebsite called `navigate('/')` when the
 * slug did not resolve, so a guest with a mistyped or retired link landed on
 * the MARKETING HOME PAGE — 2,273 characters of "Because planning your wedding
 * should feel exciting. Start planning". Someone trying to reach a wedding was
 * shown a sales pitch, which is the worst available answer. `/w/` and `/w//`
 * rendered a blank page instead, which is the second worst.
 *
 * DELIBERATELY UNIVERSE-NEUTRAL. There is no wedding to theme it as — that is
 * the whole condition — so it uses the product face and a warm neutral ground
 * rather than guessing at someone's palette.
 *
 * NO PRODUCT PITCH. No links into the funnel, no logo-as-CTA, no "start
 * planning". The guest's problem is a broken link and the only person who can
 * fix it is the couple, so that is what it says.
 */
const PJS = "'Plus Jakarta Sans', sans-serif";

export default function InvitationNotAvailable() {
  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#F7F5F1',
        color: '#0A0A0A',
        fontFamily: PJS,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        textAlign: 'center',
      }}
    >
      <div style={{ maxWidth: 420 }}>
        <p
          style={{
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: '0.32em',
            textTransform: 'uppercase',
            color: 'rgba(10,10,10,0.6)',
            margin: '0 0 20px',
          }}
        >
          An invitation
        </p>
        <h1
          style={{
            fontSize: 'clamp(1.5rem, 6vw, 2rem)',
            fontWeight: 600,
            letterSpacing: '-0.01em',
            lineHeight: 1.25,
            margin: '0 0 16px',
          }}
        >
          This invitation isn&rsquo;t available
        </h1>
        <p
          style={{
            fontSize: 15,
            lineHeight: 1.65,
            color: 'rgba(10,10,10,0.6)',
            margin: 0,
          }}
        >
          The link may have been mistyped, or the couple may have taken their
          site down. Check the link against the one they sent you, or ask them
          for it again.
        </p>
      </div>
    </main>
  );
}
