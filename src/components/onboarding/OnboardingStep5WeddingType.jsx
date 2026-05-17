import React, { useState } from 'react';
import { motion } from 'framer-motion';

const PJS = "'Plus Jakarta Sans', sans-serif";

const STYLE_PILLS = [
  'Traditional', 'Modern', 'Minimalist', 'Maximalist', 'Bohemian', 'Luxury',
];
const CULTURAL_PILLS = [
  'Christian', 'Catholic', 'Jewish', 'Muslim', 'Hindu', 'Sikh', 'Buddhist',
  'Civil', 'Cultural Fusion', 'Non-religious',
];
const VIBE_PILLS = [
  'Intimate & romantic', 'Party & dancing', 'Outdoor & nature',
  'Destination', 'Multi-day event', 'Elopement',
];

export default function OnboardingStep5WeddingType({ onNext, data, theme }) {
  const [selected, setSelected] = useState([]);
  const isDark = theme !== 'light';
  const textPrimary = isDark ? '#FFFFFF' : '#0A0A0A';
  const textMuted = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.45)';
  const pillBorder = isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.15)';

  const allPills = [
    { group: 'Style',             pills: STYLE_PILLS },
    { group: 'Cultural/Religious', pills: CULTURAL_PILLS },
    { group: 'Vibe',              pills: VIBE_PILLS },
  ];

  const toggle = pill =>
    setSelected(prev => prev.includes(pill) ? prev.filter(p => p !== pill) : [...prev, pill]);

  const handleSubmit = () => onNext({ weddingStyle: selected });

  return (
    <div className="w-full max-w-4xl text-center">
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 700, color: textPrimary, fontFamily: PJS, marginBottom: 12 }}
      >
        Tell us about your celebration.
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={{ color: textMuted, fontSize: 14, marginBottom: 48, fontFamily: PJS }}
      >
        Select all that apply.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-8 mb-12"
      >
        {allPills.map((group, gi) => (
          <div key={group.group} className="text-left">
            <div className="flex flex-wrap gap-2">
              {group.pills.map((pill, pi) => {
                const isActive = selected.includes(pill);
                return (
                  <motion.button
                    key={pill}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.25 + gi * 0.1 + pi * 0.02 }}
                    onClick={() => toggle(pill)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 500,
                      fontFamily: PJS,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      background: isActive ? 'linear-gradient(135deg, #E03553, #803D81)' : 'transparent',
                      color: isActive ? '#FFFFFF' : textMuted,
                      border: isActive ? 'none' : `1px solid ${pillBorder}`,
                    }}
                  >
                    {pill}
                  </motion.button>
                );
              })}
            </div>
          </div>
        ))}
      </motion.div>

      {selected.length > 0 && (
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={handleSubmit}
          className="px-8 py-3 rounded-full text-white text-sm font-medium bg-gradient-to-r from-[#E03553] to-[#803D81] hover:brightness-110 transition-all"
        >
          Continue →
        </motion.button>
      )}
    </div>
  );
}
