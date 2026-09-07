import React, { useState, useEffect } from 'react';

export default function ScrollCue({ delay = 2000 }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 40,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        zIndex: 20,
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.8s ease',
        pointerEvents: 'none',
      }}
    >
      <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 9, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.4)' }}>Scroll</span>
      <div style={{ width: 1, height: 40, background: '#333', overflow: 'hidden' }}>
        <div style={{
          width: '100%',
          height: '50%',
          background: 'linear-gradient(to bottom, #E03553, #803D81)',
          animation: 'scrollCueBar 1.6s cubic-bezier(0.16,1,0.3,1) infinite',
        }} />
      </div>
      <style>{`@keyframes scrollCueBar { 0%{transform:translateY(-100%)} 100%{transform:translateY(220%)} }`}</style>
    </div>
  );
}
