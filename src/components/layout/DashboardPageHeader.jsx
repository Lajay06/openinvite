import React from 'react';
import WhatsHereControl from '@/components/guidance/WhatsHereControl';

const PJS = "'Plus Jakarta Sans', sans-serif";

export default function DashboardPageHeader({ title, subtitle, actions }) {
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
        <WhatsHereControl />
      </div>
    </div>
  );
}
