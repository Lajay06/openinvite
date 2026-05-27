import React, { useState, useEffect } from 'react';

export default function HeroSection({ wedding }) {
  const [showScroll, setShowScroll] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowScroll(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const FALLBACK_IMAGE = 'https://res.cloudinary.com/dsr84xknv/image/upload/v1779185606/DTS_Weirdly_Ever_After_Agust%C3%ADn_Far%C3%ADas_Photos_ID8960_nspx4l.jpg';

  return (
    <div style={{
      position: 'relative',
      height: '100vh',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      {/* Background image */}
      <img
        src={wedding.coverPhoto || FALLBACK_IMAGE}
        alt=""
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center',
        }}
      />

      {/* Overlay gradient */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.4) 60%, rgba(0,0,0,0.7) 100%)',
        pointerEvents: 'none',
      }} />

      {/* Content */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        textAlign: 'center',
        animation: 'fadeInUp 1.5s cubic-bezier(0.25, 0.1, 0.25, 1) forwards',
        animationDelay: '0.5s',
        opacity: 0,
      }}>
        {/* Decorative line above */}
        <div style={{
          width: '60px',
          height: '1px',
          background: 'rgba(255, 255, 255, 0.4)',
          margin: '0 auto 24px',
        }} />

        {/* Couple names */}
        <h1 style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 'clamp(36px, 6vw, 72px)',
          fontWeight: 300,
          color: '#FFFFFF',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          margin: 0,
        }}>
          {wedding.coupleNames || 'The Celebration'}
        </h1>

        {/* Wedding date */}
        <p style={{
          fontSize: '16px',
          fontWeight: 300,
          color: '#FFFFFF',
          letterSpacing: '0.3em',
          textTransform: 'uppercase',
          marginTop: '16px',
          marginBottom: 0,
        }}>
          {formatDate(wedding.weddingDate)}
        </p>

        {/* Decorative line below */}
        <div style={{
          width: '60px',
          height: '1px',
          background: 'rgba(255, 255, 255, 0.4)',
          margin: '24px auto 0',
        }} />
      </div>

      {/* Scroll indicator */}
      {showScroll && (
        <div style={{
          position: 'absolute',
          bottom: '40px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
          zIndex: 10,
          pointerEvents: 'none',
        }}>
          <span style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 9,
            letterSpacing: '0.2em',
            color: 'rgba(255, 255, 255, 0.4)',
          }}>Scroll</span>
          <div style={{ width: 1, height: 40, background: '#333', overflow: 'hidden' }}>
            <div style={{
              width: '100%',
              height: '50%',
              background: 'linear-gradient(to bottom, #E03553, #803D81)',
              animation: 'scrollBar 1.6s cubic-bezier(0.16,1,0.3,1) infinite',
            }} />
          </div>
          <style>{`@keyframes scrollBar { 0%{transform:translateY(-100%)} 100%{transform:translateY(220%)} }`}</style>
        </div>
      )}
    </div>
  );
}