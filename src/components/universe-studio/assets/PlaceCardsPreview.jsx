import React from 'react';
import { effectiveMealChoice } from '@/lib/weddingEvents';

const MEAL_SYMBOL = { beef: '◆', fish: '○', vegetarian: '☆', vegan: '☆', chicken: '△', default: '' };

// universe: the full config object (colors/typography), not just its id —
// see UniverseWorldView.jsx's Chapter 6 comment for why.
export default function PlaceCardsPreview({ universe, weddingDetails, guests }) {
  const outerBg = universe?.colors?.darkBg || '#111111';
  const cardBg = universe?.colors?.lightBg || '#F8F7F5';
  const cardText = universe?.colors?.lightText || '#0A0A0A';
  const cardMuted = universe?.colors?.accentSecondary || '#888888';
  const headingFont = universe?.typography?.headingFont || 'Georgia, serif';
  // fix/asset-system: previously fell back to 6 hardcoded fake names
  // (Elizabeth Hartley, James Morrison, ...) whenever there were no real
  // guests yet — indistinguishable from real data at a glance. An honest
  // empty state is shown instead; never fabricated names.
  const cards = (guests || []).slice(0, 6);

  if (cards.length === 0) {
    return (
      <div style={{
        width: '100%', height: '100%', background: outerBg,
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
      width: '100%', height: '100%', background: outerBg,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: 12, gap: 6
    }}>
      <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 7, fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 4 }}>
        Place Cards
      </p>

      {/* Card grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 5, width: '100%' }}>
        {cards.slice(0, 6).map((g, i) => {
          // Meal comes from effectiveMealChoice, which ranks the per-event
          // overlay first and the flat Guest.meal_choice column last. That
          // column is NO LONGER DEAD — the guest editor writes it, so a
          // couple-entered meal shows on a place card for a guest who has
          // not RSVP'd. Never read g.meal_choice directly.
          const mealChoice = effectiveMealChoice(g.event_responses, g.meal_choice);
          return (
            <div key={i} style={{
              background: cardBg, padding: '6px 5px',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', position: 'relative'
            }}>
              <p style={{
                fontFamily: headingFont,
                fontStyle: 'italic', fontWeight: 300, fontSize: 7,
                color: cardText, textAlign: 'center', marginBottom: 2,
                lineHeight: 1.2
              }}>
                {g.name?.split(' ')[0] || 'Guest'}
              </p>
              <div style={{ width: '80%', height: '1px', background: `${cardMuted}55`, marginBottom: 2 }} />
              <p style={{ fontSize: 5, color: cardMuted, letterSpacing: '0.15em', textTransform: 'uppercase', textAlign: 'center' }}>
                {g.table_assignment ? `T${g.table_assignment}` : '—'}
                {mealChoice ? ` ${MEAL_SYMBOL[mealChoice] || ''}` : ''}
              </p>
            </div>
          );
        })}
      </div>

      <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 6, fontFamily: "'Plus Jakarta Sans', sans-serif", marginTop: 4 }}>
        {guests.length} guest{guests.length === 1 ? '' : 's'}
      </p>
    </div>
  );
}