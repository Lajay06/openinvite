import React, { useState } from 'react';
import { motion } from 'framer-motion';

const PJS = "'Plus Jakarta Sans', sans-serif";

export default function OnboardingStep1Names({ onNext, theme }) {
  const [name1, setName1] = useState('');
  const [name2, setName2] = useState('');
  const isDark = theme !== 'light';
  const textPrimary = isDark ? '#FFFFFF' : '#0A0A0A';
  const inputBorder = isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)';

  const handleSubmit = () => {
    if (name1.trim() && name2.trim()) {
      onNext({ couple1Name: name1, couple2Name: name2 });
    }
  };

  const inputStyle = {
    background: 'transparent',
    border: 'none',
    borderBottom: `2px solid ${inputBorder}`,
    padding: '8px 12px',
    color: textPrimary,
    fontFamily: PJS,
    fontSize: 'clamp(24px, 3vw, 36px)',
    fontWeight: 600,
    outline: 'none',
  };

  return (
    <div className="w-full max-w-2xl">
      <style>{`.s1-input::placeholder { color: ${isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}; }`}</style>
      <div className="space-y-8 text-center">

        <div className="flex items-baseline gap-3 justify-center flex-wrap">
          <span style={{ fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 400, color: textPrimary, fontFamily: PJS }}>
            Hi, my name is
          </span>
          <div className="relative">
            <input
              type="text"
              value={name1}
              onChange={e => setName1(e.target.value)}
              placeholder="Your name"
              className="s1-input"
              style={{ ...inputStyle, borderBottomColor: name1 ? '#E03553' : inputBorder }}
              onKeyDown={e => e.key === 'Enter' && name2.trim() && handleSubmit()}
            />
            {name1 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -right-6 top-1/2 transform -translate-y-1/2 text-[#E03553] text-xl"
              >✓</motion.span>
            )}
          </div>
        </div>

        <div className="flex items-baseline gap-3 justify-center flex-wrap">
          <span style={{ fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 400, color: textPrimary, fontFamily: PJS }}>
            and my partner's name is
          </span>
          <div className="relative">
            <input
              type="text"
              value={name2}
              onChange={e => setName2(e.target.value)}
              placeholder="Partner's name"
              className="s1-input"
              style={{ ...inputStyle, borderBottomColor: name2 ? '#E03553' : inputBorder }}
              onKeyDown={e => e.key === 'Enter' && name1.trim() && handleSubmit()}
            />
            {name2 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -right-6 top-1/2 transform -translate-y-1/2 text-[#E03553] text-xl"
              >✓</motion.span>
            )}
          </div>
        </div>

        {name1.trim() && name2.trim() && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={handleSubmit}
            className="mt-12 px-8 py-3 rounded-full text-white text-sm font-medium bg-gradient-to-r from-[#E03553] to-[#803D81] hover:brightness-110 transition-all"
          >
            Continue →
          </motion.button>
        )}
      </div>
    </div>
  );
}
