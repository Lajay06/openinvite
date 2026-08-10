import React, { useState } from 'react';

// universe: the full config object (colors/typography), not just its id —
// see UniverseWorldView.jsx's Chapter 6 comment for why.
export default function SeatingChartPreview({ universe, weddingDetails, guests }) {
  const bg = universe?.colors?.darkBg || '#0A0A0A';
  const text = universe?.colors?.darkText || '#FFFFFF';
  const accent = universe?.colors?.accent || '#E03553';
  const headingFont = universe?.typography?.headingFont || 'Georgia, serif';
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
      width: '100%', height: '100%', background: bg,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center',
      padding: '12px 14px',
      fontFamily: headingFont,
      overflow: 'hidden'
    }}>
      {/* Search */}
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search guests..."
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', background: `${text}14`,
          border: `1px solid ${text}26`,
          color: text, fontSize: 9,
          padding: '4px 8px', marginBottom: 8,
          outline: 'none', letterSpacing: '0.05em'
        }}
      />

      {/* Header — the universe's own accent for the label, base text for the names */}
      <p style={{ fontSize: 7, fontWeight: 300, letterSpacing: '0.35em', textTransform: 'uppercase', color: accent, textAlign: 'center', marginBottom: 3 }}>
        PLEASE FIND YOUR SEAT
      </p>
      <p style={{ fontWeight: 300, fontSize: 14, color: text, textAlign: 'center', marginBottom: 8, letterSpacing: '0.05em' }}>
        {names}
      </p>

      {/* Guest list */}
      <div style={{ width: '100%', flex: 1, overflow: 'hidden' }}>
        {displayGuests.length === 0 ? (
          <p style={{ textAlign: 'center', color: `${text}4D`, fontSize: 8 }}>No guests yet</p>
        ) : (
          displayGuests.map((g, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              borderBottom: `1px solid ${text}1A`,
              padding: '3px 0'
            }}>
              <p style={{ color: text, fontSize: 8, fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 400 }}>
                {g.name}
              </p>
              <p style={{ color: `${text}66`, fontSize: 7, letterSpacing: '0.05em' }}>
                {g.table_assignment ? `Table ${g.table_assignment}` : '—'}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <p style={{ fontSize: 6, color: `${text}4D`, letterSpacing: '0.15em', marginTop: 6, textAlign: 'center' }}>
        {date}{venue ? ` · ${venue}` : ''}
      </p>
    </div>
  );
}