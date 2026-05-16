import React, { useMemo } from 'react';

const labelStyle = {
  fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
};

export default function RecentActivity({ guests, budget }) {
  const activities = useMemo(() => {
    const ga = guests.filter(g => g.rsvp_date).map(g => ({
      desc: `${g.name} — ${g.rsvp_status === 'attending' ? 'attending' : g.rsvp_status === 'declined' ? 'declined' : 'responded'}`,
      date: g.rsvp_date,
      type: g.rsvp_status,
    }));
    const ba = budget.filter(b => b.payment_date).map(b => ({
      desc: `Payment: ${b.item_name}`,
      date: b.payment_date,
      type: 'payment',
    }));
    return [...ga, ...ba].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 8);
  }, [guests, budget]);

  const timeAgo = (d) => {
    const h = Math.abs(new Date() - new Date(d)) / 3600000;
    if (h < 1) return 'just now';
    if (h < 24) return `${Math.floor(h)}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  return (
    <div style={{ border: '1px solid rgba(10,10,10,0.08)', background: '#fff' }}>
      <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
        <p style={labelStyle}>Recent activity</p>
      </div>
      <div>
        {activities.length > 0 ? activities.map((a, i) => (
          <div key={i} style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(10,10,10,0.05)' }}>
            <p style={{ fontSize: 13, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{a.desc}</p>
            <p style={{ fontSize: 11, color: 'rgba(10,10,10,0.4)', fontFamily: "'Plus Jakarta Sans', sans-serif", whiteSpace: 'nowrap', marginLeft: 16 }}>{timeAgo(a.date)}</p>
          </div>
        )) : (
          <div style={{ padding: '32px 24px', textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.4)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>No activity yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
