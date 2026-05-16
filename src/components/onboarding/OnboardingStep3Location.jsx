import React, { useState } from 'react';
import { motion } from 'framer-motion';
import LocationPicker from '@/components/shared/LocationPicker';

export default function OnboardingStep3Location({ onNext, data }) {
  const [venue, setVenue] = useState(data?.venue || '');
  const [location, setLocation] = useState(data?.location || '');

  const handleSubmit = () => {
    onNext({ venue, location });
  };

  const canContinue = venue.trim() || location.trim();

  return (
    <div className="w-full max-w-2xl text-center">
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="font-bold text-white mb-3"
        style={{ fontSize: 'clamp(28px, 4vw, 48px)' }}
      >
        Where are you celebrating?
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-[#666666] text-sm mb-12"
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
          dark
          types={['establishment']}
        />
        <LocationPicker
          value={location}
          onChange={setLocation}
          placeholder="City or location (e.g. Sydney, Australia)"
          dark
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
            className="px-8 py-3 rounded-full text-white text-sm font-medium uppercase tracking-widest bg-gradient-to-r from-[#E03553] to-[#803D81] hover:brightness-110 transition-all"
          >
            Continue →
          </button>
        )}
        <button
          onClick={() => onNext({ venue: '', location: '' })}
          className="block mx-auto text-[#666666] hover:text-white text-sm transition-colors"
        >
          Not sure yet →
        </button>
      </motion.div>
    </div>
  );
}