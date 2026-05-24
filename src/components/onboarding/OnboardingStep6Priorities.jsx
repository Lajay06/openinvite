import React, { useState } from 'react';
import { motion } from 'framer-motion';
const FEATURES = [
  { id: 'guests', label: 'Guest management', desc: 'Track RSVPs and seating' },
  { id: 'budget', label: 'Budget tracking', desc: 'Stay on top of spending' },
  { id: 'invites', label: 'Invitations', desc: 'Design and send invites' },
  { id: 'music', label: 'Music', desc: 'Curate your soundtrack' },
  { id: 'vendors', label: 'Vendors', desc: 'Manage suppliers' },
  { id: 'all', label: 'All of it', desc: 'I want the full experience' },
];

export default function OnboardingStep6Priorities({ onNext, data }) {
  const [selected, setSelected] = useState([]);

  const toggle = (featureId) => {
    if (featureId === 'all') {
      setSelected(prev => prev.length === FEATURES.length ? [] : FEATURES.map(f => f.id));
    } else {
      setSelected(prev => {
        const updated = prev.includes(featureId)
          ? prev.filter(id => id !== featureId)
          : [...prev, featureId];
        if (updated.includes('all')) {
          return updated.filter(id => id !== 'all');
        }
        return updated;
      });
    }
  };

  const handleSubmit = () => {
    const priorities = selected.filter(id => id !== 'all');
    onNext({ priorities: priorities.length === 0 ? selected : priorities });
  };

  return (
    <div className="w-full max-w-4xl text-center">
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="font-bold text-white mb-3"
        style={{ fontSize: 'clamp(28px, 4vw, 48px)' }}
      >
        What's most important to you?
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-[#666666] text-sm mb-12"
      >
        We'll personalise your dashboard around this.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-12"
      >
        {FEATURES.map((feature, i) => {
          const isSelected = selected.includes(feature.id);
          return (
            <motion.button
              key={feature.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 + i * 0.05 }}
              onClick={() => toggle(feature.id)}
              style={{
                padding: 24,
                border: `1px solid ${isSelected ? 'rgba(224,53,83,0.5)' : 'rgba(255,255,255,0.08)'}`,
                background: isSelected ? 'rgba(224,53,83,0.08)' : 'rgba(255,255,255,0.02)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                textAlign: 'left',
                borderRadius: 0,
              }}
            >
              <p style={{ fontSize: 14, fontWeight: 700, color: isSelected ? '#FFFFFF' : 'rgba(255,255,255,0.7)', margin: '0 0 4px', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                {feature.label}
              </p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontFamily: 'Plus Jakarta Sans, sans-serif', lineHeight: 1.5, margin: 0 }}>
                {feature.desc}
              </p>
            </motion.button>
          );
        })}
      </motion.div>

      {selected.length > 0 && (
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={handleSubmit}
          className="px-8 py-3 rounded-full text-white text-sm font-medium tracking-widest bg-gradient-to-r from-[#E03553] to-[#803D81] hover:brightness-110 transition-all"
        >
          Continue →
        </motion.button>
      )}
    </div>
  );
}