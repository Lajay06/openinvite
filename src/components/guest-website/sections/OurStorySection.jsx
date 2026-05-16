import React, { useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';

export default function OurStorySection({ wedding }) {
  const [isVisible, setIsVisible] = useState(false);
  const [photos, setPhotos] = useState([]);
  const sectionRef = useRef(null);
  const photoContainerRef = useRef(null);

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
    const fetchPhotos = async () => {
      try {
        const allPhotos = await base44.entities.Photo.list();
        setPhotos(allPhotos.slice(0, 8) || []);
      } catch (err) {
        console.error('Error fetching photos:', err);
      }
    };

    fetchPhotos();
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
      {/* Header */}
      <div style={{
        textAlign: 'center',
        marginBottom: '80px',
      }}>
        <p style={{
          fontSize: '10px',
          textTransform: 'uppercase',
          color: '#888888',
          letterSpacing: '0.2em',
          margin: 0,
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? 'translateY(0)' : 'translateY(16px)',
          transition: 'all 1.2s cubic-bezier(0.25, 0.1, 0.25, 1)',
        }}>
          OUR STORY
        </p>

        {wedding.coupleStory && (
          <p style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 'clamp(20px, 2.5vw, 22px)',
            fontWeight: 300,
            fontStyle: 'italic',
            color: '#FFFFFF',
            lineHeight: 1.8,
            maxWidth: '680px',
            margin: '40px auto 0',
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(16px)',
            transition: 'all 1.2s cubic-bezier(0.25, 0.1, 0.25, 1)',
            transitionDelay: '0.3s',
            textAlign: 'center',
          }}>
            {wedding.coupleStory}
          </p>
        )}
      </div>

      {/* Photo strip */}
      {photos.length > 0 && (
        <div
          ref={photoContainerRef}
          style={{
            display: 'flex',
            gap: '4px',
            overflowX: 'auto',
            overflowY: 'hidden',
            paddingBottom: '16px',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {photos.map((photo, idx) => (
            <div
              key={photo.id || idx}
              style={{
                flex: '0 0 280px',
                height: '380px',
                overflow: 'hidden',
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? 'translateY(0)' : 'translateY(16px)',
                transition: `all 1.2s cubic-bezier(0.25, 0.1, 0.25, 1)`,
                transitionDelay: `${0.3 + idx * 0.1}s`,
              }}
            >
              <img
                src={photo.imageUrl}
                alt={`Story moment ${idx + 1}`}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}