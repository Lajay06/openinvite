import React from 'react';

const PJS = "'Plus Jakarta Sans', sans-serif";

export default function DashboardPageHeader({ title, subtitle }) {
  return (
    <div style={{
      background: '#FFFFFF',
      borderBottom: '1px solid rgba(10,10,10,0.08)',
      padding: '14px 32px 12px',
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0A0A0A', margin: 0, fontFamily: PJS, letterSpacing: '-0.02em' }}>
          {title}
        </h1>
        {subtitle && (
          <span style={{ fontSize: 14, color: 'rgba(10,10,10,0.4)', fontFamily: PJS, flexShrink: 0 }}>
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
}
