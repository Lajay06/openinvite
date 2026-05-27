import React from 'react';
import ScrollCue from '@/components/motion/ScrollCue';

export default function HeroSection({ wedding }) {

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
      <ScrollCue delay={3000} />
    </div>
  );
}