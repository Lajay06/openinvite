import React from 'react';

const labelStyle = {
  fontSize: 11, fontWeight: 700,
  letterSpacing: '0.08em', color: 'rgba(10,10,10,0.6)',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
};

const valueStyle = {
  fontSize: 24, fontWeight: 800, color: '#0A0A0A',
  fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.03em',
};

export default function BudgetSummary({ budget, stats }) {
  const categoryTotals = React.useMemo(() => {
    const totals = {};
    budget.forEach(item => {
      if (!totals[item.category]) totals[item.category] = { budgeted: 0, spent: 0 };
      totals[item.category].budgeted += item.budgeted_amount || 0;
      totals[item.category].spent += item.actual_amount || 0;
    });
    return Object.entries(totals)
      .map(([cat, d]) => ({ cat: cat.replace(/_/g, ' '), ...d, pct: d.budgeted > 0 ? (d.spent / d.budgeted) * 100 : 0 }))
      .sort((a, b) => b.budgeted - a.budgeted)
      .slice(0, 6);
  }, [budget]);

  return (
    <div style={{ border: '1px solid rgba(10,10,10,0.08)', background: '#fff' }}>
      <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
        <p style={labelStyle}>Budget overview</p>
        <p style={{ ...valueStyle, marginTop: 4 }}>${stats.totalBudget.toLocaleString()}</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
        {[
          { label: 'Total', val: `$${stats.totalBudget.toLocaleString()}` },
          { label: 'Spent', val: `$${stats.totalSpent.toLocaleString()}` },
          { label: 'Remaining', val: `$${Math.abs(stats.remainingBudget).toLocaleString()}` },
        ].map((s, i) => (
          <div key={s.label} style={{ padding: '16px 24px', borderRight: i < 2 ? '1px solid rgba(10,10,10,0.08)' : 'none' }}>
            <p style={labelStyle}>{s.label}</p>
            <p style={{ ...valueStyle, fontSize: 20, marginTop: 2 }}>{s.val}</p>
          </div>
        ))}
      </div>
      <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {categoryTotals.map(({ cat, budgeted, spent, pct }) => (
          <div key={cat}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <p style={labelStyle}>{cat}</p>
              <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.6)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>${spent.toLocaleString()} / ${budgeted.toLocaleString()}</p>
            </div>
            <div style={{ height: 3, background: 'rgba(10,10,10,0.06)', width: '100%' }}>
              <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: pct > 100 ? '#E03553' : 'linear-gradient(90deg,#E03553,#803D81)', transition: 'width 0.6s ease' }} />
            </div>
          </div>
        ))}
        {categoryTotals.length === 0 && (
          <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.6)', fontFamily: "'Plus Jakarta Sans', sans-serif", padding: '16px 0' }}>No budget items yet.</p>
        )}
      </div>
    </div>
  );
}
