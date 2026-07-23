import React, { useState } from 'react';

const STORY_TYPES = [
  { id: 'save-date', label: 'Save the Date' },
  { id: 'countdown', label: 'Countdown' },
  { id: 'rsvp', label: 'RSVP Reminder' },
  { id: 'day-of', label: 'Day Of' },
  { id: 'thank-you', label: 'Thank You' },
];

function StoryFrame({ type, weddingDetails }) {
  const names = weddingDetails?.coupleNames || 'Sarah & James';
  const date = weddingDetails?.weddingDate ? new Date(weddingDetails.weddingDate) : new Date('2026-03-15');
  const daysLeft = Math.max(0, Math.ceil((date - new Date()) / (1000 * 60 * 60 * 24)));
  const venue = weddingDetails?.mainCeremony?.venueName || 'The Grand Hall';

  const shared = {
    fontFamily: 'Cormorant Garamond, Georgia, serif',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    height: '100%', padding: '10px 8px', position: 'relative'
  };

  if (type === 'save-date') return (
    <div style={{ ...shared, background: '#0A0A0A', padding: 0, overflow: 'hidden' }}>
      {/* Placeholder couple photo (Launch folder, "Bandits" shoot) — real
          save-the-date / day-of story templates are almost always
          photo-backed; replaced once the couple picks their own. */}
      <img
        src="https://res.cloudinary.com/dsr84xknv/image/upload/f_auto,q_auto/DTS_BANDITS_PALI_MENDEZ_Photos_ID14263_su2ltz.jpg"
        alt=""
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }}
      />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(10,10,10,0.3) 0%, rgba(10,10,10,0.7) 100%)' }} />
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '10px 8px' }}>
        <div style={{ position: 'absolute', top: 10, left: 8, right: 8, height: '1px', background: 'rgba(255,255,255,0.2)' }} />
        <p style={{ color: '#FFFFFF', fontSize: 11, fontWeight: 300, letterSpacing: '0.15em', textTransform: 'uppercase', textAlign: 'center' }}>{names}</p>
        <div style={{ width: 20, height: '1px', background: 'rgba(255,255,255,0.3)', margin: '5px 0' }} />
        <p style={{ fontSize: 7, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.3em' }}>SAVE THE DATE</p>
        <div style={{ position: 'absolute', bottom: 10, left: 8, right: 8, height: '1px', background: 'rgba(255,255,255,0.2)' }} />
      </div>
    </div>
  );

  if (type === 'countdown') return (
    <div style={{ ...shared, background: '#0A0A0A' }}>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 6, letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: 4 }}>DAYS TO GO</p>
      <p style={{ color: '#FFFFFF', fontSize: 36, fontWeight: 300, lineHeight: 1, letterSpacing: '-0.02em' }}>{daysLeft}</p>
      <div style={{ width: 20, height: '1px', background: 'rgba(255,255,255,0.3)', margin: '6px 0' }} />
      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 7, letterSpacing: '0.15em', textTransform: 'uppercase' }}>{names}</p>
    </div>
  );

  if (type === 'rsvp') return (
    <div style={{ ...shared, background: '#F8F7F5' }}>
      <p style={{ color: '#888888', fontSize: 6, letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: 6 }}>DON'T FORGET</p>
      <p style={{ color: '#0A0A0A', fontSize: 12, fontWeight: 300, letterSpacing: '0.1em', textAlign: 'center', marginBottom: 4 }}>Please RSVP</p>
      <div style={{ width: 20, height: '1px', background: '#CCCCCC', margin: '4px 0' }} />
      <p style={{ color: '#888888', fontSize: 6, letterSpacing: '0.15em', textTransform: 'uppercase' }}>{names}</p>
    </div>
  );

  if (type === 'day-of') return (
    <div style={{ ...shared, background: '#0A0A0A', padding: 0, overflow: 'hidden' }}>
      <img
        src="https://res.cloudinary.com/dsr84xknv/image/upload/f_auto,q_auto/DTS_BANDITS_PALI_MENDEZ_Photos_ID14276_n3xobb.jpg"
        alt=""
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }}
      />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(10,10,10,0.3) 0%, rgba(10,10,10,0.7) 100%)' }} />
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '10px 8px' }}>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 5, letterSpacing: '0.4em', textTransform: 'uppercase', marginBottom: 4 }}>TODAY IS THE DAY</p>
        <p style={{ color: '#FFFFFF', fontSize: 13, fontWeight: 300, letterSpacing: '0.15em', textTransform: 'uppercase', textAlign: 'center' }}>{names}</p>
        <div style={{ width: 20, height: '1px', background: 'rgba(255,255,255,0.3)', margin: '5px 0' }} />
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 6, letterSpacing: '0.2em' }}>{venue}</p>
      </div>
    </div>
  );

  return (
    <div style={{ ...shared, background: '#F8F7F5' }}>
      <p style={{ color: '#888888', fontSize: 6, letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: 4 }}>THANK YOU</p>
      <p style={{ color: '#0A0A0A', fontSize: 11, fontWeight: 300, letterSpacing: '0.1em', textAlign: 'center' }}>For celebrating with us.</p>
      <div style={{ width: 20, height: '1px', background: '#CCCCCC', margin: '5px 0' }} />
      <p style={{ color: '#888888', fontSize: 7, letterSpacing: '0.1em', fontStyle: 'italic' }}>{names}</p>
    </div>
  );
}

export default function InstagramKitPreview({ universe, weddingDetails }) {
  const [activeStory, setActiveStory] = useState(0);

  return (
    <div style={{ width: '100%', height: '100%', background: '#111111', display: 'flex', flexDirection: 'column' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;1,300&display=swap');`}</style>
      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}>
        {STORY_TYPES.map((s, i) => (
          <button
            key={s.id}
            onClick={() => setActiveStory(i)}
            style={{
              flex: 1, padding: '5px 0', fontSize: 6, fontFamily: "'Plus Jakarta Sans', sans-serif",
              color: activeStory === i ? '#FFFFFF' : 'rgba(255,255,255,0.35)',
              background: 'transparent', border: 'none', cursor: 'pointer',
              borderBottom: activeStory === i ? '1px solid #E03553' : '1px solid transparent',
              letterSpacing: '0.05em', fontWeight: 600
            }}
          >
            {i + 1}
          </button>
        ))}
      </div>
      {/* Frame */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }}>
        <div style={{ width: 80, height: 140, border: '1px solid rgba(255,255,255,0.15)', overflow: 'hidden' }}>
          <StoryFrame type={STORY_TYPES[activeStory].id} weddingDetails={weddingDetails} />
        </div>
      </div>
      <p style={{ textAlign: 'center', fontSize: 7, color: 'rgba(255,255,255,0.3)', padding: '0 0 8px', fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '0.1em' }}>
        {STORY_TYPES[activeStory].label}
      </p>
    </div>
  );
}