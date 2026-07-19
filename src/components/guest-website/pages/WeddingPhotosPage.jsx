import React, { useState } from 'react';
import { motion } from 'framer-motion';
import SectionReveal from '../SectionReveal';
import { isMotionEnabled } from '@/lib/universeStyling';
import { interactiveDivProps } from '@/lib/a11y';

export default function WeddingPhotosPage({ weddingDetails, theme, typography, universeConfig }) {
  const content = weddingDetails.photosContent || {};
  const gallery = content.gallery || [];
  const [selectedIndex, setSelectedIndex] = useState(null);

  return (
    <div style={{ backgroundColor: theme.lightBg, color: theme.lightText, minHeight: '100vh', padding: '60px 24px' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
          <h1
            style={{
              fontFamily: typography.headingFont,
              fontSize: 'clamp(2rem, 5vw, 3rem)',
              fontWeight: typography.headingWeight,
              marginBottom: '60px',
              textAlign: 'center'
            }}
          >
            Photos
          </h1>
        </SectionReveal>

        {gallery.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
            {gallery.map((photo, i) => (
              <SectionReveal key={i} universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
                <div
                  onClick={() => setSelectedIndex(i)}
                  {...interactiveDivProps(() => setSelectedIndex(i))}
                  style={{
                    position: 'relative',
                    cursor: 'pointer',
                    overflow: 'hidden',
                    borderRadius: '4px',
                    aspectRatio: '1 / 1'
                  }}
                >
                  <img
                    src={photo.url}
                    alt={photo.caption || `Photo ${i + 1}`}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      transition: 'transform 0.3s ease'
                    }}
                    onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
                    onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                  />
                  {photo.caption && (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundColor: `${theme.darkBg}CC`,
                        display: 'flex',
                        alignItems: 'flex-end',
                        padding: '16px',
                        opacity: 0,
                        transition: 'opacity 0.3s ease'
                      }}
                      onMouseEnter={(e) => e.parentElement.style.opacity = 1}
                      onMouseLeave={(e) => e.parentElement.style.opacity = 0}
                    >
                      <p style={{ fontFamily: typography.bodyFont, fontSize: '0.875rem', color: theme.darkText }}>
                        {photo.caption}
                      </p>
                    </div>
                  )}
                </div>
              </SectionReveal>
            ))}
          </div>
        ) : (
          <SectionReveal
            universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}
            style={{
              backgroundColor: theme.darkBg,
              color: theme.darkText,
              padding: '60px 40px',
              borderRadius: '4px',
              textAlign: 'center'
            }}
          >
            <p style={{ fontFamily: typography.bodyFont, fontSize: '1.125rem' }}>
              Photos coming soon!
            </p>
          </SectionReveal>
        )}

        {/* Lightbox */}
        {selectedIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedIndex(null)}
            {...interactiveDivProps(() => setSelectedIndex(null), { label: 'Close photo viewer' })}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: `${theme.darkBg}EE`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 50,
              backdropFilter: 'blur(8px)'
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'relative',
                maxWidth: '90vw',
                maxHeight: '90vh'
              }}
            >
              <img
                src={gallery[selectedIndex].url}
                alt=""
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  borderRadius: '4px'
                }}
              />
              {gallery[selectedIndex].caption && (
                <div
                  style={{
                    color: theme.darkText,
                    padding: '16px',
                    textAlign: 'center',
                    fontSize: '0.875rem'
                  }}
                >
                  {gallery[selectedIndex].caption}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
}