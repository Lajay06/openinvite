import React from 'react';

const labelStyle = {
  fontSize: 11, fontWeight: 700,
  letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
};

export default function StatsOverview({ stats }) {
  const items = [
    { label: 'Total guests', value: stats.totalGuests, sub: `${stats.attending} attending` },
    { label: 'RSVP rate', value: `${Math.round(stats.responseRate)}%`, sub: `${stats.responded} of ${stats.totalGuests}` },
    { label: 'Budget used', value: `${Math.round(stats.budgetPercentage)}%`, sub: `$${stats.totalSpent.toLocaleString()} spent` },
    { label: 'Remaining', value: `$${Math.abs(stats.remainingBudget).toLocaleString()}`, sub: stats.remainingBudget >= 0 ? 'in budget' : 'over budget' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', border: '1px solid rgba(10,10,10,0.08)' }}>
      {items.map(({ label, value, sub }, i) => (
        <div key={label} style={{ background: '#fff', padding: '24px', borderRight: i < 3 ? '1px solid rgba(10,10,10,0.08)' : 'none' }}>
          <p style={{ ...labelStyle, marginBottom: 8 }}>{label}</p>
          <p style={{ fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.03em', marginBottom: 4 }}>{value}</p>
          {sub && <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.4)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{sub}</p>}
        </div>
      ))}
    </div>
  );
}
