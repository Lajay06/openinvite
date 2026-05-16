import React, { useEffect, useRef, useState } from 'react';

export default function CelebrationSection({ wedding }) {
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

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    return new Date(`2024-01-01T${timeStr}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const EventCard = ({ title, time, venue, address }) => (
    <div style={{
      flex: 1,
      padding: '40px 0',
      borderLeft: title === 'CEREMONY' ? 'none' : '1px solid #E0E0DC',
      paddingLeft: title === 'RECEPTION' ? '40px' : '0',
      opacity: isVisible ? 1 : 0,
      transform: isVisible ? 'translateY(0)' : 'translateY(16px)',
      transition: 'all 1.2s cubic-bezier(0.25, 0.1, 0.25, 1)',
      transitionDelay: title === 'CEREMONY' ? '0s' : '0.3s',
    }}>
      <p style={{
        fontSize: '10px',
        textTransform: 'uppercase',
        color: '#888888',
        letterSpacing: '0.2em',
        marginBottom: '24px',
        margin: 0,
      }}>
        {title}
      </p>

      <h3 style={{
        fontFamily: "'Cormorant Garamond', serif",
        fontSize: '32px',
        fontWeight: 300,
        color: '#0A0A0A',
        margin: 0,
        marginBottom: '8px',
      }}>
        {time || '—'}
      </h3>

      <p style={{
        fontSize: '14px',
        color: '#555555',
        margin: 0,
        marginBottom: '4px',
      }}>
        {venue || ''}
      </p>

      <p style={{
        fontSize: '13px',
        color: '#888888',
        margin: 0,
      }}>
        {address || ''}
      </p>
    </div>
  );

  return (
    <section
      ref={sectionRef}
      style={{
        background: '#F8F7F5',
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '120px 40px',
      }}
    >
      <div style={{
        maxWidth: '900px',
        margin: '0 auto',
        width: '100%',
        display: 'flex',
        gap: '40px',
      }}>
        <EventCard
          title="CEREMONY"
          time={wedding.mainCeremony?.startTime ? formatTime(wedding.mainCeremony.startTime) : ''}
          venue={wedding.mainCeremony?.venueName}
          address={wedding.mainCeremony?.address}
        />

        <EventCard
          title="RECEPTION"
          time={wedding.reception?.startTime ? formatTime(wedding.reception.startTime) : ''}
          venue={wedding.reception?.venueName}
          address={wedding.reception?.address}
        />
      </div>

      <style>{`
        @media (max-width: 768px) {
          section { flex-direction: column; }
        }
      `}</style>
    </section>
  );
}