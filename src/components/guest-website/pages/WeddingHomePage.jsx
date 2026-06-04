import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import GrainOverlay from '../GrainOverlay';

export default function WeddingHomePage({ weddingDetails, theme, typography, universeConfig }) {
  const tagline = weddingDetails.homeContent?.tagline || weddingDetails.welcomeMessage || 'We are overjoyed to celebrate with you.';
  const prefersReduced = useReducedMotion();

  return (
    <div style={{ backgroundColor: theme.darkBg, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Hero */}
      <div
        style={{
          height: '100vh',
          backgroundImage: weddingDetails.heroVideoFile ? `url(${weddingDetails.heroVideoFile})` : `url(${weddingDetails.coverPhoto})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative'
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: `${theme.darkBg}40`
          }}
        />

        {/* Grain — after dark overlay so it renders above it; text stays at zIndex:10 above both */}
        {universeConfig?.texture && (
          <GrainOverlay opacity={universeConfig.texture.opacity} />
        )}

        <motion.div
          initial={{ opacity: 0, y: prefersReduced ? 0 : 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: prefersReduced ? 0 : (universeConfig?.motion?.duration ?? 0.8) }}
          style={{
            position: 'relative',
            zIndex: 10,
            textAlign: 'center',
            color: theme.lightBg
          }}
        >
          <h1
            style={{
              fontFamily: typography.headingFont,
              fontSize: 'clamp(2rem, 8vw, 4.5rem)',
              fontWeight: typography.headingWeight,
              fontStyle: typography.headingStyle || 'normal',
              letterSpacing: '-0.02em',
              marginBottom: '12px',
              lineHeight: 1.1
            }}
          >
            {weddingDetails.coupleNames}
          </h1>

          <p
            style={{
              fontFamily: typography.bodyFont,
              fontSize: 'clamp(0.875rem, 2vw, 1.25rem)',
              fontWeight: typography.bodyWeight,
              marginBottom: '24px',
              opacity: 0.9
            }}
          >
            {new Date(weddingDetails.weddingDate).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric'
            })}
          </p>

          <motion.div
            initial={{ opacity: 0, y: prefersReduced ? 0 : 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: prefersReduced ? 0 : 0.3, duration: prefersReduced ? 0 : (universeConfig?.motion?.duration ?? 0.8) }}
            style={{
              fontFamily: typography.bodyFont,
              fontSize: 'clamp(0.875rem, 1.5vw, 1rem)',
              fontWeight: typography.bodyWeight,
              maxWidth: '600px',
              margin: '0 auto',
              letterSpacing: '0.05em',
              opacity: 0.85
            }}
          >
            {tagline}
          </motion.div>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        style={{
          position: 'absolute',
          bottom: '40px',
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: '24px',
          opacity: 0.6,
          zIndex: 20
        }}
      >
        ↓
      </motion.div>
    </div>
  );
}