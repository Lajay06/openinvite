import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';

export default function TravelSection({ wedding }) {
  const [hotels, setHotels] = useState([]);
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

  useEffect(() => {
    const fetchHotels = async () => {
      try {
        const allHotels = await base44.entities.Hotel.list();
        setHotels(allHotels || []);
      } catch (err) {
        console.error('Error fetching hotels:', err);
      }
    };

    fetchHotels();
  }, [wedding.id]);

  return (
    <section
      ref={sectionRef}
      style={{
        background: '#0A0A0A',
        padding: '120px 80px',
        minHeight: 'auto',
      }}
    >
      <div style={{ maxWidth: '680px', margin: '0 auto' }}>
        <p style={{
          fontSize: '10px',
          textTransform: 'uppercase',
          color: '#888888',
          letterSpacing: '0.2em',
          textAlign: 'center',
          marginBottom: '60px',
          margin: 0,
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? 'translateY(0)' : 'translateY(16px)',
          transition: 'all 1.2s cubic-bezier(0.25, 0.1, 0.25, 1)',
        }}>
          GETTING THERE
        </p>

        <div style={{ marginTop: '60px', display: 'flex', flexDirection: 'column', gap: '40px' }}>
          {hotels.map((hotel, idx) => (
            <div
              key={hotel.id || idx}
              style={{
                paddingBottom: idx < hotels.length - 1 ? '40px' : '0',
                borderBottom: idx < hotels.length - 1 ? '1px solid #222222' : 'none',
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? 'translateY(0)' : 'translateY(16px)',
                transition: 'all 1.2s cubic-bezier(0.25, 0.1, 0.25, 1)',
                transitionDelay: `${idx * 0.1}s`,
              }}
            >
              <h3 style={{
                fontSize: '18px',
                fontWeight: 400,
                color: '#FFFFFF',
                margin: '0 0 12px',
              }}>
                {hotel.name}
              </h3>

              <p style={{
                fontSize: '13px',
                color: '#888888',
                margin: '0 0 12px',
              }}>
                {hotel.distance || hotel.notes || 'Details available'}
              </p>

              {hotel.website && (
                <a
                  href={hotel.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: '13px',
                    color: '#FFFFFF',
                    textDecoration: 'none',
                    borderBottom: '1px solid transparent',
                    transition: 'border-color 0.2s ease',
                  }}
                  onMouseEnter={(e) => e.target.style.borderBottomColor = '#FFFFFF'}
                  onMouseLeave={(e) => e.target.style.borderBottomColor = 'transparent'}
                >
                  View →
                </a>
              )}
            </div>
          ))}
        </div>

        {hotels.length === 0 && (
          <p style={{
            fontSize: '14px',
            color: '#888888',
            textAlign: 'center',
            marginTop: '40px',
          }}>
            Hotel recommendations coming soon
          </p>
        )}
      </div>
    </section>
  );
}