import React from 'react';
import { Users, UserCheck, UserX, Clock } from "lucide-react";

const STAT_CONFIG = [
  { key: 'total',     label: 'Total guests',  icon: Users,     accent: '#803D81' },
  { key: 'attending', label: 'Attending',      icon: UserCheck, accent: '#6b7700' },
  { key: 'declined',  label: 'Declined',       icon: UserX,     accent: '#E03553' },
  { key: 'pending',   label: 'Awaiting reply', icon: Clock,     accent: '#444444' },
];

const labelStyle = {
  fontSize: 11, fontWeight: 700,
  letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)',
  fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0,
};

export default function GuestStats({ stats }) {
  return (
    <div style={{ display: 'flex', width: '100%', borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
      {STAT_CONFIG.map((s, i) => {
        const Icon = s.icon;
        const pct = s.key !== 'total' && stats.total > 0
          ? Math.round((stats[s.key] / stats.total) * 100)
          : null;
        return (
          <div
            key={s.key}
            style={{
              flex: 1, padding: '24px 32px', minHeight: 80,
              borderRight: i < STAT_CONFIG.length - 1 ? '1px solid rgba(10,10,10,0.08)' : 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <p style={labelStyle}>{s.label}</p>
              <Icon size={14} style={{ color: s.accent, flexShrink: 0 }} />
            </div>
            <p style={{ fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1, margin: 0 }}>
              {stats[s.key]}
            </p>
            {pct !== null && (
              <p style={{ fontSize: 11, color: 'rgba(10,10,10,0.4)', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: '6px 0 0' }}>
                {pct}% of total
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
