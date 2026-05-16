import React, { useState } from 'react';
import { motion } from 'framer-motion';

export default function WeddingRSVPPage({ weddingDetails, theme, typography }) {
  const content = weddingDetails.rsvpContent || {};
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    rsvpStatus: '',
    mealChoice: '',
    dietaryRestrictions: '',
    message: ''
  });

  const handleSubmit = () => {
    console.log('RSVP submitted:', formData);
    // TODO: Save to database
  };

  return (
    <div style={{ backgroundColor: theme.lightBg, color: theme.lightText, minHeight: '100vh', padding: '60px 24px' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          style={{
            fontFamily: typography.headingFont,
            fontSize: 'clamp(2rem, 5vw, 3rem)',
            fontWeight: typography.headingWeight,
            marginBottom: '12px',
            textAlign: 'center'
          }}
        >
          RSVP
        </motion.h1>

        {content.rsvpDeadline && (
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            style={{
              textAlign: 'center',
              fontSize: '0.875rem',
              color: theme.accent,
              marginBottom: '40px'
            }}
          >
            Please respond by {new Date(content.rsvpDeadline).toLocaleDateString()}
          </motion.p>
        )}

        <motion.form
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          style={{
            backgroundColor: theme.darkBg,
            color: theme.darkText,
            padding: '40px',
            borderRadius: '4px'
          }}
          onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}
        >
          {/* Name */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: theme.accent, display: 'block', marginBottom: '8px' }}>
              NAME *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              style={{
                width: '100%',
                backgroundColor: 'transparent',
                border: 'none',
                borderBottom: `1px solid ${theme.accent}40`,
                padding: '8px 0',
                color: theme.darkText,
                fontSize: '1rem',
                fontFamily: typography.bodyFont,
                outline: 'none'
              }}
            />
          </div>

          {/* Email */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: theme.accent, display: 'block', marginBottom: '8px' }}>
              EMAIL *
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              style={{
                width: '100%',
                backgroundColor: 'transparent',
                border: 'none',
                borderBottom: `1px solid ${theme.accent}40`,
                padding: '8px 0',
                color: theme.darkText,
                fontSize: '1rem',
                fontFamily: typography.bodyFont,
                outline: 'none'
              }}
            />
          </div>

          {/* RSVP Status */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: theme.accent, display: 'block', marginBottom: '12px' }}>
              WILL YOU BE JOINING US? *
            </label>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {['attending', 'declined', 'maybe'].map(status => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setFormData({ ...formData, rsvpStatus: status })}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: formData.rsvpStatus === status ? theme.accent : 'transparent',
                    color: formData.rsvpStatus === status ? theme.darkBg : theme.darkText,
                    border: `1px solid ${formData.rsvpStatus === status ? theme.accent : theme.accent}40`,
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    textTransform: 'capitalize',
                    transition: 'all 0.2s'
                  }}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Meal choice */}
          {content.mealOptions && content.mealOptions.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: theme.accent, display: 'block', marginBottom: '12px' }}>
                MEAL PREFERENCE
              </label>
              <select
                value={formData.mealChoice}
                onChange={(e) => setFormData({ ...formData, mealChoice: e.target.value })}
                style={{
                  width: '100%',
                  backgroundColor: 'transparent',
                  border: `1px solid ${theme.accent}40`,
                  padding: '8px',
                  color: theme.darkText,
                  fontSize: '1rem',
                  fontFamily: typography.bodyFont,
                  borderRadius: '2px'
                }}
              >
                <option value="">Select an option</option>
                {content.mealOptions.map(option => (
                  <option key={option} value={option} style={{ backgroundColor: theme.darkBg }}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Dietary restrictions */}
          {content.enableDietaryField && (
            <div style={{ marginBottom: '24px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: theme.accent, display: 'block', marginBottom: '8px' }}>
                DIETARY RESTRICTIONS
              </label>
              <input
                type="text"
                value={formData.dietaryRestrictions}
                onChange={(e) => setFormData({ ...formData, dietaryRestrictions: e.target.value })}
                style={{
                  width: '100%',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderBottom: `1px solid ${theme.accent}40`,
                  padding: '8px 0',
                  color: theme.darkText,
                  fontSize: '1rem',
                  fontFamily: typography.bodyFont,
                  outline: 'none'
                }}
              />
            </div>
          )}

          {/* Message */}
          {content.enableMessage && (
            <div style={{ marginBottom: '24px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: theme.accent, display: 'block', marginBottom: '8px' }}>
                MESSAGE FOR US
              </label>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                style={{
                  width: '100%',
                  backgroundColor: 'transparent',
                  border: `1px solid ${theme.accent}40`,
                  padding: '8px',
                  color: theme.darkText,
                  fontSize: '1rem',
                  fontFamily: typography.bodyFont,
                  borderRadius: '2px',
                  minHeight: '100px',
                  outline: 'none'
                }}
              />
            </div>
          )}

          <button
            type="submit"
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: theme.accent,
              color: theme.darkBg,
              border: 'none',
              borderRadius: '4px',
              fontSize: '0.875rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              cursor: 'pointer',
              marginTop: '12px'
            }}
          >
            Submit RSVP
          </button>
        </motion.form>

        {content.closingMessage && (
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            style={{
              textAlign: 'center',
              marginTop: '40px',
              fontSize: '0.875rem',
              color: theme.lightText,
              opacity: 0.8
            }}
          >
            {content.closingMessage}
          </motion.p>
        )}
      </div>
    </div>
  );
}