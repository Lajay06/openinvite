import React from 'react';
import { motion } from 'framer-motion';

const PJS = "'Plus Jakarta Sans', sans-serif";

export default function OnboardingStep7Ava({ onNext, data }) {
  const weddingTypeStr = data.weddingStyle?.length > 0 ? data.weddingStyle[0] : 'beautiful';
  const guestCountStr = data.guestCount ? `${data.guestCount} guests` : 'your guests';
  const venueStr = typeof data.venue === 'object' ? data.venue?.name || '' : data.venue || '';
  const cityStr = data.location || '';
  const locationPart = venueStr && cityStr
    ? `at ${venueStr} in ${cityStr}`
    : venueStr
      ? `at ${venueStr}`
      : cityStr
        ? `in ${cityStr}`
        : 'in your chosen location';
  const textPrimary = '#0A0A0A';
  const textMuted = 'rgba(10,10,10,0.6)';

  return (
    <div className="w-full max-w-3xl">
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
        style={{ color: textMuted, fontSize: 16, lineHeight: 1.7, maxWidth: 480, marginBottom: 48, fontFamily: PJS }}
      >
        Ava knows you're planning a {weddingTypeStr} wedding for {guestCountStr} {locationPart}. Ava will help you stay organized, suggest vendors, and keep everything on track.
      </motion.p>

      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        onClick={() => onNext({})}
        className="px-8 py-3 rounded-full text-white text-sm font-medium bg-[#E03553] hover:bg-black active:bg-neutral-900 transition-colors duration-150"
      >
        Got it, let's go →
      </motion.button>
    </div>
  );
}
