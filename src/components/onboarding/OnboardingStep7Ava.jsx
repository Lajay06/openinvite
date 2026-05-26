import React from 'react';
import { motion } from 'framer-motion';

const PJS = "'Plus Jakarta Sans', sans-serif";

export default function OnboardingStep7Ava({ onNext, data, theme }) {
  const weddingTypeStr = data.weddingStyle?.length > 0 ? data.weddingStyle[0] : 'beautiful';
  const guestCountStr = data.guestCount ? `${data.guestCount} guests` : 'your guests';
  const locationStr = data.location || 'your chosen location';
  const isDark = theme !== 'light';
  const textPrimary = isDark ? '#FFFFFF' : '#0A0A0A';
  const textMuted = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.45)';

  return (
    <div className="w-full max-w-3xl text-center">
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        style={{ color: textMuted, fontSize: 13, fontFamily: PJS, marginBottom: 8 }}
      >
        Your AI assistant
      </motion.p>

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        style={{ fontSize: 'clamp(40px, 6vw, 72px)', fontWeight: 700, color: textPrimary, fontFamily: PJS, marginBottom: 32 }}
      >
        Meet Ava.
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        style={{ color: textMuted, fontSize: 16, lineHeight: 1.7, maxWidth: 480, margin: '0 auto 48px', fontFamily: PJS }}
      >
        Ava knows you're planning a {weddingTypeStr} wedding for {guestCountStr} in {locationStr}. She'll help you stay organised, suggest vendors, and keep everything on track.
      </motion.p>

      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        onClick={() => onNext({})}
        className="px-8 py-3 rounded-full text-white text-sm font-medium bg-gradient-to-r from-[#E03553] to-[#803D81] hover:bg-none hover:bg-black hover:text-white active:bg-neutral-900 transition-colors duration-150"
      >
        Got it, let's go →
      </motion.button>
    </div>
  );
}
