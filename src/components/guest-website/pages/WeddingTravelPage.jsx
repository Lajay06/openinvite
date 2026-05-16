import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Phone, DollarSign } from 'lucide-react';

export default function WeddingTravelPage({ weddingDetails, theme, typography }) {
  const content = weddingDetails.travelContent || {};
  const accommodations = content.accommodations || [];
  const gettingThereNotes = content.gettingThereNotes || '';
  const parkingInfo = content.parkingInfo || '';
  const transportInfo = content.transportInfo || '';

  return (
    <div style={{ backgroundColor: theme.lightBg, color: theme.lightText, minHeight: '100vh', padding: '60px 24px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          style={{
            fontFamily: typography.headingFont,
            fontSize: 'clamp(2rem, 5vw, 3rem)',
            fontWeight: typography.headingWeight,
            marginBottom: '60px',
            textAlign: 'center'
          }}
        >
          Travel & Accommodation
        </motion.h1>

        {/* Accommodations */}
        {accommodations.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            style={{ marginBottom: '60px' }}
          >
            <h2
              style={{
                fontFamily: typography.headingFont,
                fontSize: 'clamp(1.5rem, 4vw, 2rem)',
                fontWeight: typography.headingWeight,
                marginBottom: '32px'
              }}
            >
              Recommended Hotels
            </h2>

            <div style={{ display: 'grid', gap: '24px' }}>
              {accommodations.map((hotel, i) => (
                <motion.a
                  key={i}
                  href={hotel.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: i * 0.1 }}
                  style={{
                    backgroundColor: theme.darkBg,
                    color: theme.darkText,
                    padding: '24px',
                    borderRadius: '4px',
                    display: 'block',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    textDecoration: 'none'
                  }}
                  onMouseEnter={(e) => e.target.style.transform = 'translateY(-4px)'}
                  onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
                >
                  <h3 style={{ fontFamily: typography.headingFont, fontSize: '1.25rem', marginBottom: '8px', color: theme.accent }}>
                    {hotel.name}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.875rem', opacity: 0.8 }}>
                    <MapPin size={16} style={{ marginTop: '2px', flexShrink: 0 }} />
                    <span>{hotel.address}</span>
                  </div>
                </motion.a>
              ))}
            </div>
          </motion.div>
        )}

        {/* Getting there */}
        {gettingThereNotes && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            style={{
              backgroundColor: theme.darkBg,
              color: theme.darkText,
              padding: '40px',
              borderRadius: '4px',
              marginBottom: '24px'
            }}
          >
            <h2 style={{ fontFamily: typography.headingFont, fontSize: '1.5rem', marginBottom: '16px' }}>Getting There</h2>
            <div style={{ fontFamily: typography.bodyFont, fontSize: '1rem', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
              {gettingThereNotes}
            </div>
          </motion.div>
        )}

        {/* Parking */}
        {parkingInfo && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            style={{
              backgroundColor: theme.darkBg,
              color: theme.darkText,
              padding: '40px',
              borderRadius: '4px',
              marginBottom: '24px'
            }}
          >
            <h2 style={{ fontFamily: typography.headingFont, fontSize: '1.5rem', marginBottom: '16px' }}>Parking</h2>
            <div style={{ fontFamily: typography.bodyFont, fontSize: '1rem', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
              {parkingInfo}
            </div>
          </motion.div>
        )}

        {/* Transport */}
        {transportInfo && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            style={{
              backgroundColor: theme.darkBg,
              color: theme.darkText,
              padding: '40px',
              borderRadius: '4px'
            }}
          >
            <h2 style={{ fontFamily: typography.headingFont, fontSize: '1.5rem', marginBottom: '16px' }}>Transportation</h2>
            <div style={{ fontFamily: typography.bodyFont, fontSize: '1rem', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
              {transportInfo}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}