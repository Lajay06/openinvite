import React from 'react';

export default function StatsOverview({ stats }) {
  const items = [
    { label: 'Total Guests', value: stats.totalGuests, sub: `${stats.attending} attending` },
    { label: 'RSVP Rate', value: `${Math.round(stats.responseRate)}%`, sub: `${stats.responded} of ${stats.totalGuests}` },
    { label: 'Budget Used', value: `${Math.round(stats.budgetPercentage)}%`, sub: `$${stats.totalSpent.toLocaleString()} spent` },
    { label: 'Remaining', value: `$${Math.abs(stats.remainingBudget).toLocaleString()}`, sub: stats.remainingBudget >= 0 ? 'in budget' : 'over budget' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 border border-[#E0E0DC]">
      {items.map(({ label, value, sub }) => (
        <div key={label} className="bg-white px-6 py-6 border-r border-[#E0E0DC] last:border-r-0">
          <p className="label-caps text-[#888888] mb-2">{label}</p>
          <p className="font-sans-ui font-bold text-[#0A0A0A] text-4xl mb-1">{value}</p>
          {sub && <p className="text-[12px] text-[#888888] font-sans-ui">{sub}</p>}
        </div>
      ))}
    </div>
  );
}