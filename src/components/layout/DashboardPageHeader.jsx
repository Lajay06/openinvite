import React from 'react';

const PJS = "'Plus Jakarta Sans', sans-serif";

export default function DashboardPageHeader({ title, subtitle, actions }) {
  return (
    <div
      className="flex items-center justify-between gap-4 px-4 md:px-8"
      style={{
        background: '#FFFFFF',
        borderBottom: '1px solid rgba(10,10,10,0.08)',
        paddingTop: 10,
        paddingBottom: 10,
      }}
    >
      <div className="flex items-baseline gap-3 min-w-0">
        <h1 style={{ fontSize: 18, fontWeight: 600, color: '#0A0A0A', margin: 0, fontFamily: PJS, letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
          {title}
        </h1>
        {subtitle && (
          <span style={{ fontSize: 12, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, flexShrink: 0 }}>
            {subtitle}
          </span>
        )}
      </div>
      {actions && (
        <div style={{ flexShrink: 0 }}>
          {actions}
        </div>
      )}
    </div>
  );
}
