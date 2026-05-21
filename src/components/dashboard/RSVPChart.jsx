import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Cell, LabelList, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';

const STATUS_COLORS = {
  Attending: '#E03553',
  Pending: '#DDF762',
  Declined: '#888888',
};

const labelStyle = {
  fontSize: 11, fontWeight: 700,
  letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
};

const PJS = "'Plus Jakarta Sans', sans-serif";

function getColor(name) {
  return STATUS_COLORS[name] || '#E5E5E5';
}

function getValueLabelFill(name) {
  return name === 'Pending' ? '#0A0A0A' : '#FFFFFF';
}

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#0A0A0A', padding: '8px 12px' }}>
      <p style={labelStyle}>{payload[0].payload.name}</p>
      <p style={{ fontSize: 20, fontWeight: 800, color: '#fff', fontFamily: PJS, letterSpacing: '-0.03em' }}>{payload[0].value}</p>
    </div>
  );
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

  return (
    <div style={{ border: '1px solid rgba(10,10,10,0.08)', background: '#fff' }}>
      <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
        <p style={labelStyle}>Guest response</p>
        <p style={{ fontSize: 24, fontWeight: 800, color: '#0A0A0A', fontFamily: PJS, letterSpacing: '-0.03em', marginTop: 4 }}>{guests.length} total</p>
      </div>
      <div style={{ padding: '24px' }}>
        <div style={{ height: 220, marginBottom: 24 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rsvpData} barSize={36} margin={{ top: 20, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#E5E5E5" strokeDasharray="0" />
              <XAxis
                dataKey="name"
                tick={{ fontFamily: PJS, fontSize: 11, fontWeight: 600, fill: 'rgba(10,10,10,0.5)' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontFamily: PJS, fontSize: 10, fill: 'rgba(10,10,10,0.35)' }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F5F5F5' }} />
              <Bar dataKey="value" radius={0}>
                {rsvpData.map((entry) => (
                  <Cell key={entry.name} fill={getColor(entry.name)} />
                ))}
                <LabelList
                  dataKey="value"
                  position="inside"
                  style={{ fontFamily: PJS, fontSize: 12, fontWeight: 700 }}
                  formatter={(v) => (v > 0 ? v : '')}
                  content={({ x, y, width, height, value, index }) => {
                    if (!value) return null;
                    const entry = rsvpData[index];
                    const fill = getValueLabelFill(entry?.name);
                    return (
                      <text x={x + width / 2} y={y + height / 2 + 5} textAnchor="middle" fill={fill} fontFamily={PJS} fontSize={12} fontWeight={700}>
                        {value}
                      </text>
                    );
                  }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ borderTop: '1px solid rgba(10,10,10,0.08)' }}>
          {rsvpData.map((d) => (
            <div key={d.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid rgba(10,10,10,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: getColor(d.name), flexShrink: 0 }} />
                <p style={labelStyle}>{d.name}</p>
              </div>
              <p style={{ fontSize: 20, fontWeight: 800, color: '#0A0A0A', fontFamily: PJS, letterSpacing: '-0.03em', width: 32, textAlign: 'right' }}>{d.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
