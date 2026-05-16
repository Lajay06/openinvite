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

  const getVideoEmbed = () => {
    const url = wedding.heroVideoUrl || wedding.heroVideoFile;
    if (!url) return null;

    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const videoId = url.split('v=')[1] || url.split('/').pop();
      return (
        <iframe
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&controls=0&modestbranding=1`}
          allow="autoplay; muted"
          frameBorder="0"
        />
      );
    }

    if (url.includes('vimeo.com')) {
      const videoId = url.split('/').pop();
      return (
        <iframe
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
          src={`https://player.vimeo.com/video/${videoId}?autoplay=1&muted=1&loop=1&title=0&byline=0&portrait=0`}
          allow="autoplay; muted"
          frameBorder="0"
        />
      );
    }

    // Direct mp4 file
    return (
      <video
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        autoPlay
        muted
        loop
        playsInline
      >
        <source src={url} type="video/mp4" />
      </video>
    );
  };

  return (
    <div style={{
      position: 'relative',
      height: '100vh',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      {/* Background video/image */}
      {getVideoEmbed() || (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundImage: wedding.coverPhoto ? `url(${wedding.coverPhoto})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          background: !wedding.coverPhoto ? '#0A0A0A' : undefined,
        }} />
      )}

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
          textAlign: 'center',
          zIndex: 10,
          animation: 'fadeInUp 1s cubic-bezier(0.25, 0.1, 0.25, 1) forwards',
        }}>
          <p style={{
            fontSize: '10px',
            fontWeight: 600,
            letterSpacing: '0.3em',
            color: 'rgba(255, 255, 255, 0.5)',
            textTransform: 'uppercase',
            margin: '0 0 12px',
          }}>
            SCROLL
          </p>
          <div style={{
            width: '1px',
            height: '24px',
            background: 'rgba(255, 255, 255, 0.5)',
            margin: '0 auto',
            animation: 'scrollCue 2s ease-in-out infinite',
          }} />
        </div>
      )}
    </div>
  );
}