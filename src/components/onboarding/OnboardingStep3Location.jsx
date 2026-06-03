import React, { useState } from 'react';
import { motion } from 'framer-motion';
import VenueSearchPanel from '@/components/shared/VenueSearchPanel';

const PJS = "'Plus Jakarta Sans', sans-serif";

export default function OnboardingStep3Location({ onNext, data, theme }) {
  // venue: null | { name, address, placeId, mapsUrl, photoUrl }
  // Normalise from legacy string or object saved by a previous session
  const initialVenue = (() => {
    if (!data?.venue) return null;
    if (typeof data.venue === 'object' && data.venue.name) return data.venue;
    if (typeof data.venue === 'string' && data.venue.trim()) {
      return { name: data.venue.trim(), address: data.location || '', placeId: null, mapsUrl: null, photoUrl: null };
    }
    return null;
  })();

  const [venue, setVenue] = useState(initialVenue);
  const [location, setLocation] = useState(data?.location || '');
  const isDark = theme !== 'light';
  const textPrimary = isDark ? '#FFFFFF' : '#0A0A0A';
  const textMuted = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.45)';
  const skipColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)';
  const inputBorder = isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)';

  const handleSubmit = () => {
    onNext({ venue, location });
  };

  // Can continue if a venue was picked/typed, OR a city was entered
  const canContinue = venue?.name || location.trim();

  const labelStyle = {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.06em',
    color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)',
    fontFamily: PJS,
    display: 'block',
    marginBottom: 8,
  };

  return (
    <div className="w-full max-w-2xl text-center">
      <style>{`
        .s3-input::placeholder { color: ${isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}; }
        .s3-input:focus { border-bottom-color: #E03553 !important; border-bottom-width: 2px !important; }
      `}</style>

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
        className="space-y-6 mb-12 max-w-md mx-auto text-left"
      >
        {/* Venue name — Places-powered search */}
        <VenueSearchPanel
          venue={venue}
          onChange={setVenue}
          locationBias={location}
          label="Venue name"
        />

        {/* City or location — free text, always available */}
        <div>
          <label style={labelStyle}>City or location</label>
          <input
            type="text"
            value={location}
            onChange={e => setLocation(e.target.value)}
            placeholder="e.g. Sydney, Australia"
            className="s3-input"
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              borderBottom: `1px solid ${inputBorder}`,
              padding: '6px 0',
              fontSize: 15,
              color: textPrimary,
              fontFamily: PJS,
              outline: 'none',
            }}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="space-y-6"
      >
        {canContinue && (
          <button
            onClick={handleSubmit}
            className="px-8 py-3 rounded-full text-white text-sm font-medium bg-[#E03553] hover:bg-black active:bg-neutral-900 transition-colors duration-150"
          >
            Continue →
          </button>
        )}
        <button
          onClick={() => onNext({ venue: null, location: '' })}
          style={{ display: 'block', margin: '0 auto', color: skipColor, fontSize: 14, background: 'none', border: 'none', cursor: 'pointer', fontFamily: PJS }}
        >
          Not sure yet →
        </button>
      </motion.div>
    </div>
  );
}
