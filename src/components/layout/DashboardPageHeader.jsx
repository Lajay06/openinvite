import React from 'react';
import WhatsHereControl from '@/components/guidance/WhatsHereControl';

const PJS = "'Plus Jakarta Sans', sans-serif";

export default function DashboardPageHeader({ title, subtitle, actions, tourContext = null }) {
  return (
    <div
      className="flex items-center justify-between gap-4 px-4 md:px-8"
      style={{
        background: '#FFFFFF',
        borderBottom: '1px solid rgba(10,10,10,0.12)',
        paddingTop: 10,
        paddingBottom: 10,
      }}
    >
      {/* flex-wrap + a shrinkable subtitle: with flexShrink:0 a long subtitle
           could not shrink and ran past the viewport at 390 (measured at 436px on
           a 390 screen). Shared chrome, so every page with a long subtitle had
           it. */}
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 min-w-0">
        <h1 style={{ fontSize: 18, fontWeight: 600, color: '#0A0A0A', margin: 0, fontFamily: PJS, whiteSpace: 'nowrap' }}>
          {title}
        </h1>
        {subtitle && (
          <span style={{ fontSize: 12, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, minWidth: 0 }}>
            {subtitle}
          </span>
        )}
      </div>
      {/* THE GUIDANCE CONTROL SITS WITH THE PAGE'S OWN ACTIONS, and renders
          nothing at all until the guidance flag is on — round two, item 17.
          Here rather than on each page because every dashboard page already
          uses this header, so one change covers all of them and the control
          cannot drift a few pixels per page. */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
        {actions}
        {/* tourContext IS HOW A PAGE PERSONALISES THE TOUR WITHOUT A NEW READ.
            The tour's guests chapter has a lead that uses live numbers, and the
            goal forbids the tour from fetching anything: "It never makes a new
            read." Layout does not load the guest list, so it cannot supply
            them. The Guests page already has its list in hand, so it passes the
            counts down here and the question mark on that page shows the
            personalized lead. Every other page passes nothing and the chapter
            keeps its own words. */}
        <WhatsHereControl tourContext={tourContext} />
      </div>
    </div>
  );
}
