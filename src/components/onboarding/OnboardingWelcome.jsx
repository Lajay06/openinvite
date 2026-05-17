import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

const PJS = "'Plus Jakarta Sans', sans-serif";

export default function OnboardingWelcome({ onNext, theme }) {
  const isDark = theme !== 'light';

  return (
    <div style={{ textAlign: 'center', maxWidth: 560, width: '100%', padding: '0 24px' }}>

      {/* Sparkle */}
      <motion.div
        animate={{ scale: [1, 1.15, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
        style={{ marginBottom: 28, display: 'inline-block' }}
      >
        <Sparkles size={28} color="#ec4899" />
      </motion.div>

      {/* Headline */}
      <h1 style={{
        fontSize: 52, fontWeight: 800,
        letterSpacing: '-0.03em', lineHeight: 1.1,
        color: isDark ? '#FFFFFF' : '#0A0A0A',
        fontFamily: PJS, margin: '0 0 24px',
      }}>
        Let's plan the wedding of your dreams.
      </h1>

      {/* Subheadline */}
      <p style={{
        fontSize: 17, lineHeight: 1.65,
        color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.5)',
        fontFamily: PJS, margin: 0,
      }}>
        We'll set everything up in a few minutes. No overwhelm, no jargon — just your perfect day.
      </p>

      {/* CTA button */}
      <div style={{ marginTop: 40 }}>
        <button
          onClick={() => onNext({})}
          style={{
            background: 'linear-gradient(135deg, #ec4899, #9333ea)',
            color: '#FFFFFF', borderRadius: 999,
            padding: '14px 36px', fontSize: 15, fontWeight: 600,
            border: 'none', cursor: 'pointer', fontFamily: PJS,
          }}
        >
          Let's get started →
        </button>
      </div>

      {/* Takes about text */}
      <p style={{
        fontSize: 11, marginTop: 16,
        color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
        fontFamily: PJS,
      }}>
        Takes about 3 minutes
      </p>
    </div>
  );
}
