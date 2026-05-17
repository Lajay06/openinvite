import React from 'react';

const PJS = "'Plus Jakarta Sans', sans-serif";

export default function DashboardPageHeader({ title, subtitle, actions }) {
  return (
    <div style={{
      height: 48,
      background: '#FFFFFF',
      borderBottom: '1px solid rgba(10,10,10,0.08)',
      padding: '0 32px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, minWidth: 0 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0A0A0A', margin: 0, fontFamily: PJS, letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
          {title}
        </h1>
        {subtitle && (
          <span style={{ fontSize: 13, color: 'rgba(10,10,10,0.4)', fontFamily: PJS, flexShrink: 0 }}>
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
