import React, { useState } from 'react';
import { motion } from 'framer-motion';

const STYLE_PILLS = [
  'Traditional', 'Modern', 'Minimalist', 'Maximalist', 'Bohemian', 'Luxury'
];

const CULTURAL_PILLS = [
  'Christian', 'Catholic', 'Jewish', 'Muslim', 'Hindu', 'Sikh', 'Buddhist', 'Civil', 'Cultural Fusion', 'Non-religious'
];

const VIBE_PILLS = [
  'Intimate & romantic', 'Party & dancing', 'Outdoor & nature', 'Destination', 'Multi-day event', 'Elopement'
];

export default function OnboardingStep5WeddingType({ onNext, data }) {
  const [selected, setSelected] = useState([]);

  const allPills = [
    { group: 'Style', pills: STYLE_PILLS },
    { group: 'Cultural/Religious', pills: CULTURAL_PILLS },
    { group: 'Vibe', pills: VIBE_PILLS }
  ];

  const toggle = (pill) => {
    setSelected(prev =>
      prev.includes(pill) ? prev.filter(p => p !== pill) : [...prev, pill]
    );
  };

  const handleSubmit = () => {
    onNext({ weddingStyle: selected });
  };

  return (
    <div className="w-full max-w-4xl text-center">
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="font-bold text-white mb-3"
        style={{ fontSize: 'clamp(28px, 4vw, 48px)' }}
      >
        Tell us about your celebration.
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-[#666666] text-sm mb-12"
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
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.4)', marginBottom: 16, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{group.group}</p>
            <div className="flex flex-wrap gap-2">
              {group.pills.map((pill, pi) => (
                <motion.button
                  key={pill}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.25 + gi * 0.1 + pi * 0.02 }}
                  onClick={() => toggle(pill)}
                  className={`px-4 py-2 rounded-full text-xs font-medium transition-all ${
                    selected.includes(pill)
                      ? 'bg-gradient-to-r from-[#E03553] to-[#803D81] text-white'
                      : 'border border-[#333] text-[#888888] hover:border-[#555]'
                  }`}
                >
                  {pill}
                </motion.button>
              ))}
            </div>
          </div>
        ))}
      </motion.div>

      {selected.length > 0 && (
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={handleSubmit}
          className="px-8 py-3 rounded-full text-white text-sm font-medium uppercase tracking-widest bg-gradient-to-r from-[#E03553] to-[#803D81] hover:brightness-110 transition-all"
        >
          Continue →
        </motion.button>
      )}
    </div>
  );
}