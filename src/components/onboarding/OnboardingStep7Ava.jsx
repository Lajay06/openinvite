import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

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
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="mb-12"
      >
        <div className="w-24 h-24 mx-auto mb-8 relative">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="absolute inset-0 rounded-full bg-gradient-to-r from-[#E03553] to-[#803D81] opacity-20 blur-2xl"
          />
          <div className="absolute inset-0 rounded-full flex items-center justify-center">
            <Sparkles className="w-10 h-10 text-[#E03553]" />
          </div>
        </div>
      </motion.div>

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
        className="px-8 py-3 rounded-full text-white text-sm font-medium bg-gradient-to-r from-[#E03553] to-[#803D81] hover:brightness-110 transition-all"
      >
        Got it, let's go →
      </motion.button>
    </div>
  );
}
