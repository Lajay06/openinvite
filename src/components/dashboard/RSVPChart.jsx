import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const RSVP_COLORS = { Attending: '#22c55e', Declined: '#E03553', Maybe: '#803D81', Pending: 'rgba(10,10,10,0.2)' };

const labelStyle = {
  fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
};

export default function RSVPChart({ guests }) {
  const rsvpData = React.useMemo(() => {
    const counts = guests.reduce((acc, g) => {
      const s = g.rsvp_status || 'pending';
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, {});
    const labels = { attending: 'Attending', declined: 'Declined', maybe: 'Maybe', pending: 'Pending' };
    return Object.entries(counts).map(([s, n]) => ({
      name: labels[s] || s,
      value: n,
      pct: guests.length > 0 ? ((n / guests.length) * 100).toFixed(0) : 0,
    }));
  }, [guests]);

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: '#0A0A0A', padding: '8px 12px' }}>
        <p style={labelStyle}>{payload[0].payload.name}</p>
        <p style={{ fontSize: 20, fontWeight: 800, color: '#fff', fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.03em' }}>{payload[0].value}</p>
      </div>
    );
  };

  return (
    <div style={{ border: '1px solid rgba(10,10,10,0.08)', background: '#fff' }}>
      <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
        <p style={labelStyle}>Guest response</p>
        <p style={{ fontSize: 24, fontWeight: 800, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.03em', marginTop: 4 }}>{guests.length} total</p>
      </div>
      <div style={{ padding: '24px' }}>
        <div style={{ height: 160, marginBottom: 24 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rsvpData} barSize={28}>
              <XAxis dataKey="name" tick={{ fontSize: 11, fontFamily: "'Plus Jakarta Sans', sans-serif", fill: 'rgba(10,10,10,0.4)', letterSpacing: '0.08em', textTransform: 'uppercase' }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F5F5F5' }} />
              <Bar dataKey="value" fill="#0A0A0A" radius={0} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ borderTop: '1px solid rgba(10,10,10,0.08)' }}>
          {rsvpData.map((d) => (
            <div key={d.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid rgba(10,10,10,0.05)' }}>
              <p style={labelStyle}>{d.name}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 80, height: 3, background: 'rgba(10,10,10,0.06)', display: 'none' }} className="sm:block">
                  <div style={{ width: `${d.pct}%`, height: '100%', background: RSVP_COLORS[d.name] || '#0A0A0A', transition: 'width 0.6s ease' }} />
                </div>
                <p style={{ fontSize: 20, fontWeight: 800, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.03em', width: 32, textAlign: 'right' }}>{d.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
