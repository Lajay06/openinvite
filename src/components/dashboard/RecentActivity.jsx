import React, { useMemo } from 'react';

const PJS = "'Plus Jakarta Sans', sans-serif";

const labelStyle = {
  fontSize: 11, fontWeight: 700,
  letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)',
  fontFamily: PJS,
};

function getPill(type) {
  if (type === 'attending') return { label: 'Attending', bg: '#E03553', color: '#FFFFFF', border: 'none' };
  if (type === 'declined')  return { label: 'Declined',  bg: '#0A0A0A', color: '#FFFFFF', border: 'none' };
  if (type === 'payment')   return { label: 'Payment',   bg: '#DDF762', color: '#0A0A0A', border: 'none' };
  return { label: 'Update', bg: '#F5F4F0', color: '#0A0A0A', border: '1px solid #E5E5E5' };
}

function timeAgo(d) {
  const h = Math.abs(new Date() - new Date(d)) / 3600000;
  if (h < 1) return 'just now';
  if (h < 24) return `${Math.floor(h)}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

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

  return (
    <div>
      <div style={{ padding: '4px 0 16px', borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
        <p style={labelStyle}>Recent activity</p>
      </div>
      <div>
        {activities.length > 0 ? activities.map((a, i) => {
          const pill = getPill(a.type);
          return (
            <div key={i} style={{ padding: '12px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(10,10,10,0.05)' }}>
              <p style={{ fontSize: 13, color: '#0A0A0A', fontFamily: PJS, margin: 0 }}>{a.desc}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 16 }}>
                <span style={{
                  background: pill.bg, color: pill.color,
                  border: pill.border, borderRadius: 999,
                  fontSize: 11, fontWeight: 600, fontFamily: PJS,
                  padding: '3px 10px', whiteSpace: 'nowrap',
                }}>
                  {pill.label}
                </span>
                <span style={{ fontSize: 11, color: 'rgba(10,10,10,0.4)', fontFamily: PJS, whiteSpace: 'nowrap' }}>
                  {timeAgo(a.date)}
                </span>
              </div>
            </div>
          );
        }) : (
          <div style={{ padding: '32px 0', textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.4)', fontFamily: PJS }}>No activity yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
