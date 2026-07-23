import React, { useEffect, useState } from 'react';

export default function SaveTheDatePreview({ universe, weddingDetails }) {
  const names = weddingDetails?.coupleNames || 'Sarah & James';
  const date = weddingDetails?.weddingDate
    ? new Date(weddingDetails.weddingDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, ' · ')
    : '15 · 03 · 2026';
  const location = weddingDetails?.mainCeremony?.address || 'Sydney, Australia';

  const [visibleChars, setVisibleChars] = useState(0);
  const chars = names.split('');

  useEffect(() => {
    setVisibleChars(0);
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setVisibleChars(i);
      if (i >= chars.length) clearInterval(interval);
    }, 50);
    return () => clearInterval(interval);
  }, [names]);

  return (
    <div style={{
      width: '100%', height: '100%', background: '#0A0A0A',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
      fontFamily: 'Cormorant Garamond, Georgia, serif',
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400&display=swap');`}</style>

      {/* Placeholder couple photo (Launch folder, "Bandits" shoot — same
          consistent set across every universe) — real save-the-dates are
          almost always photo-led; replaced automatically once the couple
          picks their own photo for this asset. */}
      <img
        src="https://res.cloudinary.com/dsr84xknv/image/upload/f_auto,q_auto/DTS_BANDITS_PALI_MENDEZ_Photos_ID14262_nd4v2e.jpg"
        alt=""
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.55 }}
      />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(10,10,10,0.35) 0%, rgba(10,10,10,0.75) 100%)' }} />

      {/* Foreground — its own stacking context so it always paints above
          the photo + scrim regardless of DOM order. */}
      <div style={{ position: 'relative', zIndex: 1, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        {/* Top rule */}
        <div style={{ position: 'absolute', top: 28, left: 0, right: 0, height: '1px', background: 'rgba(255,255,255,0.2)' }} />

        {/* Names — animated */}
        <p style={{
          fontWeight: 300, fontSize: 22, color: '#FFFFFF',
          letterSpacing: '0.2em', textTransform: 'uppercase', textAlign: 'center',
          margin: 0, minHeight: 32, lineHeight: 1.2
        }}>
          {chars.map((char, i) => (
            <span key={i} style={{ opacity: i < visibleChars ? 1 : 0, transition: 'opacity 0.1s ease' }}>{char}</span>
          ))}
        </p>

        {/* Center rule */}
        <div style={{ width: 40, height: '1px', background: 'rgba(255,255,255,0.3)', margin: '10px 0' }} />

        {/* Date */}
        <p style={{ fontSize: 9, color: '#FFFFFF', letterSpacing: '0.4em', textTransform: 'uppercase', textAlign: 'center', margin: 0 }}>
          {date}
        </p>
        <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.2em', marginTop: 4, textAlign: 'center' }}>
          {location}
        </p>

        {/* Bottom rule */}
        <div style={{ position: 'absolute', bottom: 28, left: 0, right: 0, height: '1px', background: 'rgba(255,255,255,0.2)' }} />

        {/* Bottom label */}
        <p style={{
          position: 'absolute', bottom: 12,
          fontSize: 7, color: 'rgba(255,255,255,0.4)',
          letterSpacing: '0.5em', textTransform: 'uppercase', textAlign: 'center'
        }}>
          SAVE THE DATE
        </p>
      </div>
    </div>
  );
}