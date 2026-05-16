import React from 'react';
import { Music, Users, Heart, CheckCircle } from 'lucide-react';

const labelStyle = {
  fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
};

export default function PlaylistStats({ stats }) {
  const mostPopularCategory = Object.keys(stats.categoryCounts || {}).length > 0
    ? Object.entries(stats.categoryCounts).reduce((a, b) => stats.categoryCounts[a[0]] > stats.categoryCounts[b[0]] ? a : b)[0].replace(/_/g, ' ')
    : 'N/A';

  const items = [
    { label: 'Total songs', value: stats.totalSongs, icon: Music },
    { label: 'Approved songs', value: stats.approvedSongs, icon: CheckCircle },
    { label: 'Guest suggestions', value: stats.guestSuggestions, icon: Users },
    { label: 'Top category', value: mostPopularCategory, icon: Heart },
  ];

  return (
    <div style={{ display: 'flex', borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
      {items.map((s, i) => (
        <div key={i} style={{ flex: 1, padding: '20px 24px', borderRight: i < items.length - 1 ? '1px solid rgba(10,10,10,0.08)' : 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <s.icon size={12} style={{ color: '#E03553' }} />
            <span style={labelStyle}>{s.label}</span>
          </div>
          <p style={{ fontSize: 28, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0 }}>{s.value}</p>
        </div>
      ))}
    </div>
  );
}
