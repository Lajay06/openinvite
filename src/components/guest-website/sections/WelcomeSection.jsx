import React, { useEffect, useRef, useState } from 'react';

export default function WelcomeSection({ wedding }) {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  return (
    <section
      ref={sectionRef}
      style={{
        background: '#0A0A0A',
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '120px 40px',
      }}
    >
      <div style={{
        maxWidth: '560px',
        margin: '0 auto',
        textAlign: 'center',
      }}>
        {/* Date and location label */}
        <p style={{
          fontSize: '11px',
          textTransform: 'uppercase',
          color: '#888888',
          letterSpacing: '0.2em',
          marginBottom: '40px',
          margin: 0,
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? 'translateY(0)' : 'translateY(16px)',
          transition: 'all 1.2s cubic-bezier(0.25, 0.1, 0.25, 1)',
        }}>
          {formatDate(wedding.weddingDate)} · {wedding.mainCeremony?.address || 'The Celebration'}
        </p>

        {/* Welcome message */}
        <p style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 'clamp(24px, 3vw, 28px)',
          fontWeight: 300,
          fontStyle: 'italic',
          color: '#FFFFFF',
          lineHeight: 1.6,
          margin: '40px 0',
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? 'translateY(0)' : 'translateY(16px)',
          transition: 'all 1.2s cubic-bezier(0.25, 0.1, 0.25, 1)',
          transitionDelay: '0.3s',
        }}>
          {wedding.welcomeMessage || 'We are overjoyed to celebrate with you.'}
        </p>

        {/* Couple names */}
        <p style={{
          fontSize: '13px',
          textTransform: 'uppercase',
          color: '#888888',
          letterSpacing: '0.2em',
          margin: '40px 0 0',
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? 'translateY(0)' : 'translateY(16px)',
          transition: 'all 1.2s cubic-bezier(0.25, 0.1, 0.25, 1)',
          transitionDelay: '0.6s',
        }}>
          {wedding.coupleNames || 'The Couple'}
        </p>
      </div>
    </section>
  );
}