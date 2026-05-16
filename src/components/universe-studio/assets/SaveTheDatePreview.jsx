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
      position: 'relative',
      fontFamily: 'Cormorant Garamond, Georgia, serif',
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400&display=swap');`}</style>

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
  );
}