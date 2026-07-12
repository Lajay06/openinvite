import React from 'react';

const MEAL_SYMBOL = { beef: '◆', fish: '○', vegetarian: '☆', vegan: '☆', chicken: '△', default: '' };

export default function PlaceCardsPreview({ universe, weddingDetails, guests }) {
  // fix/asset-system: previously fell back to 6 hardcoded fake names
  // (Elizabeth Hartley, James Morrison, ...) whenever there were no real
  // guests yet — indistinguishable from real data at a glance. An honest
  // empty state is shown instead; never fabricated names.
  const cards = (guests || []).slice(0, 6);

  if (cards.length === 0) {
    return (
      <div style={{
        width: '100%', height: '100%', background: '#111111',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: 12, gap: 6, textAlign: 'center',
      }}>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 8, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>No guests yet</p>
        <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 6, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Add guests to your Guest List first.</p>
      </div>
    );
  }

  return (
    <div style={{
      width: '100%', height: '100%', background: '#111111',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: 12, gap: 6
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@1,300&display=swap');`}</style>

      <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 7, fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 4 }}>
        Place Cards
      </p>

      {/* Card grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 5, width: '100%' }}>
        {cards.slice(0, 6).map((g, i) => (
          <div key={i} style={{
            background: '#F8F7F5', padding: '6px 5px',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', position: 'relative'
          }}>
            <p style={{
              fontFamily: 'Cormorant Garamond, Georgia, serif',
              fontStyle: 'italic', fontWeight: 300, fontSize: 7,
              color: '#0A0A0A', textAlign: 'center', marginBottom: 2,
              lineHeight: 1.2
            }}>
              {g.name?.split(' ')[0] || 'Guest'}
            </p>
            <div style={{ width: '80%', height: '1px', background: '#DDDDDD', marginBottom: 2 }} />
            <p style={{ fontSize: 5, color: '#888888', letterSpacing: '0.15em', textTransform: 'uppercase', textAlign: 'center' }}>
              {g.table_assignment ? `T${g.table_assignment}` : '—'}
              {g.meal_choice ? ` ${MEAL_SYMBOL[g.meal_choice] || ''}` : ''}
            </p>
          </div>
        ))}
      </div>

      <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 6, fontFamily: "'Plus Jakarta Sans', sans-serif", marginTop: 4 }}>
        {guests.length} guest{guests.length === 1 ? '' : 's'}
      </p>
    </div>
  );
}