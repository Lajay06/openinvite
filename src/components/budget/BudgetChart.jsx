import React from 'react';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
} from 'recharts';
import { DollarSign, TrendingUp } from "lucide-react";

// Brand palette — cycle through these for chart segments
const BRAND_COLORS = [
  '#E03553', '#803D81', '#0A1930', '#DDF762',
  '#C02040', '#5C2B5C', '#3D5A7A', '#a8bc00',
  '#7B0F2A', '#2E1B4A', '#0A0A0A', '#1a7a4a',
];

const labelStyle = {
  fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
};

const sectionTitleStyle = {
  fontSize: 13, fontWeight: 700, color: '#0A0A0A',
  fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0, marginBottom: 4,
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#FFFFFF', border: '1px solid rgba(10,10,10,0.1)', padding: '10px 14px', boxShadow: '0 4px 16px rgba(0,0,0,0.08)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {label && <p style={{ fontSize: 12, fontWeight: 700, color: '#0A0A0A', margin: '0 0 6px' }}>{label}</p>}
      {payload.map((entry, i) => (
        <p key={i} style={{ fontSize: 12, color: entry.color || '#0A0A0A', margin: '2px 0', fontWeight: 600 }}>
          {entry.name === 'budgeted' ? 'Budgeted' : entry.name === 'spent' ? 'Spent' : entry.name}: ${Number(entry.value).toLocaleString()}
        </p>
      ))}
    </div>
  );
};

const PieTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#FFFFFF', border: '1px solid rgba(10,10,10,0.1)', padding: '10px 14px', boxShadow: '0 4px 16px rgba(0,0,0,0.08)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: '#0A0A0A', margin: '0 0 4px' }}>{payload[0].name}</p>
      <p style={{ fontSize: 12, fontWeight: 600, color: payload[0].payload.color, margin: 0 }}>
        Spent: ${Number(payload[0].value).toLocaleString()}
      </p>
    </div>
  );
};

export default function BudgetChart({ budgetItems }) {
  const categoryData = React.useMemo(() => {
    const cats = {};
    budgetItems.forEach(item => {
      const cat = item.category || 'other';
      if (!cats[cat]) cats[cat] = { budgeted: 0, spent: 0 };
      cats[cat].budgeted += item.budgeted_amount || 0;
      cats[cat].spent += item.actual_amount || 0;
    });
    return Object.entries(cats)
      .map(([cat, data], i) => ({
        category: cat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        budgeted: data.budgeted,
        spent: data.spent,
        color: BRAND_COLORS[i % BRAND_COLORS.length],
      }))
      .sort((a, b) => b.budgeted - a.budgeted);
  }, [budgetItems]);

  const pieData = categoryData
    .filter(d => d.spent > 0)
    .map(d => ({ name: d.category, value: d.spent, color: d.color }));

  const totalSpent = pieData.reduce((s, d) => s + d.value, 0);

  if (budgetItems.length === 0) {
    return (
      <div style={{ border: '1px solid rgba(10,10,10,0.08)', padding: '64px 32px', textAlign: 'center' }}>
        <DollarSign size={28} style={{ color: 'rgba(10,10,10,0.2)', margin: '0 auto 12px', display: 'block' }} />
        <p style={{ fontSize: 13, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0 }}>
          Add expenses to see your spending breakdown.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

      {/* Spending by category — donut */}
      <div style={{ border: '1px solid rgba(10,10,10,0.08)', padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <DollarSign size={15} style={{ color: '#E03553' }} />
          <p style={sectionTitleStyle}>Spending by category</p>
        </div>

        {pieData.length === 0 ? (
          <p style={{ fontSize: 13, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", padding: '40px 0', textAlign: 'center' }}>
            No actual spend recorded yet.
          </p>
        ) : (
          <>
            <div style={{ height: 220, position: 'relative' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%" cy="50%"
                    innerRadius={65} outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    isAnimationActive={true}
                    animationBegin={0}
                    animationDuration={900}
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} strokeWidth={0} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              {/* Centre label */}
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none' }}>
                <p style={{ fontSize: 'clamp(16px,2vw,20px)', fontWeight: 700, color: '#0A0A0A', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1 }}>
                  ${totalSpent.toLocaleString()}
                </p>
                <p style={{ ...labelStyle, marginTop: 4 }}>spent</p>
              </div>
            </div>

            {/* Legend */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px', marginTop: 16 }}>
              {pieData.slice(0, 8).map((entry, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: entry.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {entry.name}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Budget vs actual — bar chart */}
      <div style={{ border: '1px solid rgba(10,10,10,0.08)', padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <TrendingUp size={15} style={{ color: '#E03553' }} />
          <p style={sectionTitleStyle}>Budget vs actual</p>
        </div>

        <div style={{ height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={categoryData.slice(0, 7)}
              margin={{ top: 4, right: 8, left: 0, bottom: 40 }}
              barCategoryGap="30%"
            >
              <XAxis
                dataKey="category"
                tick={{ fontSize: 10, fill: 'rgba(10,10,10,0.45)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                angle={-35}
                textAnchor="end"
                height={60}
                tickLine={false}
                axisLine={{ stroke: 'rgba(10,10,10,0.08)' }}
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'rgba(10,10,10,0.45)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
                tickLine={false}
                axisLine={false}
                width={44}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 11, fontFamily: "'Plus Jakarta Sans', sans-serif", paddingTop: 8 }}
                formatter={(value) => value === 'budgeted' ? 'Budgeted' : 'Spent'}
              />
              <Bar
                dataKey="budgeted"
                name="budgeted"
                fill="rgba(10,10,10,0.1)"
                radius={[0, 0, 0, 0]}
                isAnimationActive={true}
                animationBegin={0}
                animationDuration={900}
              />
              <Bar
                dataKey="spent"
                name="spent"
                fill="#E03553"
                radius={[0, 0, 0, 0]}
                isAnimationActive={true}
                animationBegin={200}
                animationDuration={900}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
