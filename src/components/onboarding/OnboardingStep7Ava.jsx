import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

export default function OnboardingStep7Ava({ onNext, data }) {
  const weddingTypeStr = data.weddingStyle?.length > 0 ? data.weddingStyle[0] : 'beautiful';
  const guestCountStr = data.guestCount ? `${data.guestCount} guests` : 'your guests';
  const locationStr = data.location || 'your chosen location';

  return (
    <div className="w-full max-w-3xl text-center">
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="mb-12"
      >
        {/* Animated gradient orb */}
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
        style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#DDF762', marginBottom: 16, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      >
        Your AI Assistant
      </motion.p>

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="font-bold text-white mb-8"
        style={{ fontSize: 'clamp(40px, 6vw, 72px)' }}
      >
        Meet Ava.
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="text-[#AAAAAA] text-base leading-relaxed max-w-lg mx-auto mb-12"
      >
        Ava knows you're planning a {weddingTypeStr} wedding for {guestCountStr} in {locationStr}. She'll help you stay organised, suggest vendors, and keep everything on track.
      </motion.p>

      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        onClick={() => onNext({})}
        className="px-8 py-3 rounded-full text-white text-sm font-medium uppercase tracking-widest bg-gradient-to-r from-[#E03553] to-[#803D81] hover:brightness-110 transition-all"
      >
        Got it, let's go →
      </motion.button>
    </div>
  );
}