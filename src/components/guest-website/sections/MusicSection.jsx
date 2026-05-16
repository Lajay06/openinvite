import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

export default function MusicSection({ wedding }) {
  const [formData, setFormData] = useState({
    songTitle: '',
    artist: '',
    name: '',
  });

  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await base44.entities.Music.create({
        song_title: formData.songTitle,
        artist: formData.artist,
        category: 'general',
        guest_suggestion: true,
        approved: false,
        added_by: formData.name,
      });

      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setFormData({ songTitle: '', artist: '', name: '' });
      }, 3000);
    } catch (err) {
      console.error('Error submitting song request:', err);
      alert('Error submitting song request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const Input = ({ label, placeholder, value, onChange, required = false }) => (
    <div style={{ marginBottom: '24px' }}>
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        style={{
          width: '100%',
          background: 'transparent',
          border: 'none',
          borderBottom: '1px solid #CCCCCC',
          padding: '8px 0',
          fontSize: '16px',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          color: '#0A0A0A',
          outline: 'none',
          transition: 'border-color 0.2s ease',
          boxSizing: 'border-box',
        }}
        onFocus={(e) => e.target.style.borderBottomColor = '#0A0A0A'}
        onBlur={(e) => e.target.style.borderBottomColor = '#CCCCCC'}
      />
    </div>
  );

  if (submitted) {
    return (
      <section
        ref={sectionRef}
        style={{
          background: '#F8F7F5',
          padding: '80px 80px',
          textAlign: 'center',
          animation: 'fadeInUp 0.8s ease-out',
        }}
      >
        <p style={{
          fontSize: '16px',
          color: '#0A0A0A',
        }}>
          Thanks for your song suggestion! We'll check it out.
        </p>
      </section>
    );
  }

  return (
    <section
      ref={sectionRef}
      style={{
        background: '#F8F7F5',
        padding: '80px 80px',
        minHeight: 'auto',
      }}
    >
      <div style={{ maxWidth: '480px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
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
            THE SOUNDTRACK
          </p>

          <h2 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 'clamp(28px, 4vw, 36px)',
            fontWeight: 300,
            color: '#0A0A0A',
            margin: '16px 0 0',
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(16px)',
            transition: 'all 1.2s cubic-bezier(0.25, 0.1, 0.25, 1)',
            transitionDelay: '0.2s',
          }}>
            Request a song
          </h2>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <Input
            placeholder="Song title"
            value={formData.songTitle}
            onChange={(e) => setFormData({ ...formData, songTitle: e.target.value })}
            required
          />

          <Input
            placeholder="Artist"
            value={formData.artist}
            onChange={(e) => setFormData({ ...formData, artist: e.target.value })}
            required
          />

          <Input
            placeholder="Your name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              background: loading ? '#888888' : '#0A0A0A',
              color: '#FFFFFF',
              border: 'none',
              fontSize: '12px',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 600,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: '16px',
              transition: 'background 0.2s ease',
            }}
            onMouseEnter={(e) => !loading && (e.target.style.background = '#1a1a1a')}
            onMouseLeave={(e) => !loading && (e.target.style.background = '#0A0A0A')}
          >
            {loading ? 'Submitting...' : 'Submit Request'}
          </button>
        </form>
      </div>
    </section>
  );
}