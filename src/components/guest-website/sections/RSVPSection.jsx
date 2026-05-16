import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';

export default function RSVPSection({ wedding }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    attending: null,
    guestCount: 1,
    mealPreference: '',
    dietary: '',
    plusOneName: '',
    message: '',
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
      // Create Guest record
      const guestRecord = await base44.entities.Guest.create({
        name: formData.name,
        email: formData.email,
        rsvp_status: formData.attending ? 'attending' : 'declined',
        meal_choice: formData.mealPreference,
        dietary_restrictions: formData.dietary,
        plus_one_name: formData.plusOneName,
        special_requests: formData.message,
      });

      // Create GuestMessage record if there's a message
      if (formData.message) {
        await base44.entities.GuestMessage.create({
          guest_name: formData.name,
          guest_email: formData.email,
          guest_id: guestRecord.id,
          message: formData.message,
          channel: 'in_app',
        });
      }

      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 5000);
    } catch (err) {
      console.error('Error submitting RSVP:', err);
      alert('Error submitting RSVP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const Input = ({ label, type = 'text', placeholder, value, onChange, required = false }) => (
    <div style={{ marginBottom: '32px' }}>
      {label && (
        <label style={{
          display: 'block',
          fontSize: '11px',
          textTransform: 'uppercase',
          color: '#888888',
          letterSpacing: '0.1em',
          marginBottom: '8px',
        }}>
          {label}
        </label>
      )}
      <input
        type={type}
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
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '120px 80px',
        }}
      >
        <div style={{ textAlign: 'center', animation: 'fadeInUp 0.8s ease-out' }}>
          <p style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 'clamp(28px, 4vw, 32px)',
            fontWeight: 300,
            fontStyle: 'italic',
            color: '#0A0A0A',
            marginBottom: '16px',
          }}>
            Thank you, {formData.name}.
          </p>
          <p style={{
            fontSize: '16px',
            color: '#888888',
          }}>
            We can't wait to celebrate with you.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      ref={sectionRef}
      style={{
        background: '#F8F7F5',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '120px 80px',
      }}
    >
      <div style={{ maxWidth: '480px', width: '100%' }}>
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
            YOU ARE INVITED
          </p>

          <h2 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 'clamp(32px, 5vw, 64px)',
            fontWeight: 300,
            color: '#0A0A0A',
            letterSpacing: '0.05em',
            margin: '16px 0 0',
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(16px)',
            transition: 'all 1.2s cubic-bezier(0.25, 0.1, 0.25, 1)',
            transitionDelay: '0.2s',
          }}>
            Will you join us?
          </h2>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ marginTop: '48px' }}>
          <Input
            label="Full Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <Input
            label="Email Address"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />

          {/* Attendance toggle */}
          <div style={{ marginBottom: '32px' }}>
            <label style={{
              display: 'block',
              fontSize: '11px',
              textTransform: 'uppercase',
              color: '#888888',
              letterSpacing: '0.1em',
              marginBottom: '16px',
            }}>
              Attending?
            </label>
            <div style={{ display: 'flex', gap: '12px' }}>
              {['yes', 'no'].map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setFormData({ ...formData, attending: option === 'yes' })}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    border: '1px solid #CCCCCC',
                    borderRadius: '24px',
                    background: formData.attending === (option === 'yes') ? '#0A0A0A' : 'transparent',
                    color: formData.attending === (option === 'yes') ? '#FFFFFF' : '#0A0A0A',
                    fontSize: '13px',
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {option === 'yes' ? 'Joyfully accepts' : 'Regretfully declines'}
                </button>
              ))}
            </div>
          </div>

          {formData.attending && (
            <>
              <Input
                label="Number of Guests"
                type="number"
                value={formData.guestCount}
                onChange={(e) => setFormData({ ...formData, guestCount: parseInt(e.target.value) || 1 })}
              />

              <Input
                label="Meal Preference"
                value={formData.mealPreference}
                onChange={(e) => setFormData({ ...formData, mealPreference: e.target.value })}
                placeholder="Enter meal choice"
              />

              <Input
                label="Plus One Name (optional)"
                value={formData.plusOneName}
                onChange={(e) => setFormData({ ...formData, plusOneName: e.target.value })}
              />
            </>
          )}

          <Input
            label="Dietary Requirements"
            value={formData.dietary}
            onChange={(e) => setFormData({ ...formData, dietary: e.target.value })}
            placeholder="Any dietary needs?"
          />

          {/* Message textarea */}
          <div style={{ marginBottom: '32px' }}>
            <label style={{
              display: 'block',
              fontSize: '11px',
              textTransform: 'uppercase',
              color: '#888888',
              letterSpacing: '0.1em',
              marginBottom: '8px',
            }}>
              Message to {wedding.coupleNames || 'the couple'} (optional)
            </label>
            <textarea
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="Leave a message..."
              style={{
                width: '100%',
                height: '100px',
                background: 'transparent',
                border: '1px solid #CCCCCC',
                padding: '12px',
                fontSize: '14px',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                color: '#0A0A0A',
                outline: 'none',
                resize: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              background: loading ? '#888888' : '#0A0A0A',
              color: '#FFFFFF',
              border: 'none',
              fontSize: '13px',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 600,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s ease',
            }}
            onMouseEnter={(e) => !loading && (e.target.style.background = '#1a1a1a')}
            onMouseLeave={(e) => !loading && (e.target.style.background = '#0A0A0A')}
          >
            {loading ? 'Sending...' : 'Send My RSVP'}
          </button>
        </form>
      </div>
    </section>
  );
}