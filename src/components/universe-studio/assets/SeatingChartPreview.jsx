import React, { useState } from 'react';

export default function SeatingChartPreview({ universe, weddingDetails, guests }) {
  const names = weddingDetails?.coupleNames || 'Sarah & James';
  const date = weddingDetails?.weddingDate
    ? new Date(weddingDetails.weddingDate).toLocaleDateString('en-GB')
    : '15 March 2026';
  const venue = weddingDetails?.mainCeremony?.venueName || '';
  const [search, setSearch] = useState('');

  const displayGuests = (guests || [])
    .filter(g => !search || g.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 12);

  return (
    <div style={{
      width: '100%', height: '100%', background: '#0A0A0A',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center',
      padding: '12px 14px',
      fontFamily: 'Cormorant Garamond, Georgia, serif',
      overflow: 'hidden'
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300&display=swap');`}</style>

      {/* Search */}
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search guests..."
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.15)',
          color: '#FFFFFF', fontSize: 9,
          padding: '4px 8px', marginBottom: 8,
          outline: 'none', letterSpacing: '0.05em'
        }}
      />

      {/* Header */}
      <p style={{ fontSize: 7, fontWeight: 300, letterSpacing: '0.35em', textTransform: 'uppercase', color: '#FFFFFF', textAlign: 'center', marginBottom: 3 }}>
        PLEASE FIND YOUR SEAT
      </p>
      <p style={{ fontWeight: 300, fontSize: 14, color: '#FFFFFF', textAlign: 'center', marginBottom: 8, letterSpacing: '0.05em' }}>
        {names}
      </p>

      {/* Guest list */}
      <div style={{ width: '100%', flex: 1, overflow: 'hidden' }}>
        {displayGuests.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 8 }}>No guests yet</p>
        ) : (
          displayGuests.map((g, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              padding: '3px 0'
            }}>
              <p style={{ color: '#FFFFFF', fontSize: 8, fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 400 }}>
                {g.name}
              </p>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 7, letterSpacing: '0.05em' }}>
                {g.table_assignment ? `Table ${g.table_assignment}` : '—'}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <p style={{ fontSize: 6, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.15em', marginTop: 6, textAlign: 'center' }}>
        {date}{venue ? ` · ${venue}` : ''}
      </p>
    </div>
  );
}