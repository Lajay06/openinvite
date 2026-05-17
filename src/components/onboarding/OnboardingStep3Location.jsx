import React, { useState } from 'react';
import { motion } from 'framer-motion';
import LocationPicker from '@/components/shared/LocationPicker';

const PJS = "'Plus Jakarta Sans', sans-serif";

export default function OnboardingStep3Location({ onNext, data, theme }) {
  const [venue, setVenue] = useState(data?.venue || '');
  const [location, setLocation] = useState(data?.location || '');
  const isDark = theme !== 'light';
  const textPrimary = isDark ? '#FFFFFF' : '#0A0A0A';
  const textMuted = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.45)';
  const skipColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)';

  const handleSubmit = () => {
    onNext({ venue, location });
  };

  const canContinue = venue.trim() || location.trim();

  return (
    <div className="w-full max-w-2xl text-center">
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 700, color: textPrimary, fontFamily: PJS, marginBottom: 12 }}
      >
        Where are you celebrating?
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={{ color: textMuted, fontSize: 14, marginBottom: 48, fontFamily: PJS }}
      >
        Even a city or country works for now.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-4 mb-12 max-w-md mx-auto text-left"
      >
        <LocationPicker
          value={venue}
          onChange={setVenue}
          placeholder="Venue name (e.g. The Grand Ballroom)"
          dark={isDark}
          types={['establishment']}
        />
        <LocationPicker
          value={location}
          onChange={setLocation}
          placeholder="City or location (e.g. Sydney, Australia)"
          dark={isDark}
          types={['geocode']}
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="space-y-4"
      >
        {canContinue && (
          <button
            onClick={handleSubmit}
            className="px-8 py-3 rounded-full text-white text-sm font-medium bg-gradient-to-r from-[#E03553] to-[#803D81] hover:brightness-110 transition-all"
          >
            Continue →
          </button>
        )}
        <button
          onClick={() => onNext({ venue: '', location: '' })}
          style={{ display: 'block', margin: '0 auto', color: skipColor, fontSize: 14, background: 'none', border: 'none', cursor: 'pointer', fontFamily: PJS }}
        >
          Not sure yet →
        </button>
      </motion.div>
    </div>
  );
}
