import React, { useState } from 'react';
import { motion } from 'framer-motion';

const PJS = "'Plus Jakarta Sans', sans-serif";

export default function OnboardingStep1Names({ onNext, theme }) {
  const [name1, setName1] = useState('');
  const [name2, setName2] = useState('');
  const isDark = theme !== 'light';
  const textPrimary = isDark ? '#FFFFFF' : '#0A0A0A';
  const inputBorder = isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)';
  const inputBorderFocus = isDark ? '#FFFFFF' : '#0A0A0A';

  const handleSubmit = () => {
    if (name1.trim() && name2.trim()) {
      onNext({ couple1Name: name1, couple2Name: name2 });
    }
  };

  const sentenceStyle = {
    fontSize: 32, fontWeight: 700,
    color: textPrimary, fontFamily: PJS,
    whiteSpace: 'nowrap', margin: 0,
  };

  const inputStyle = (value, focused) => ({
    background: 'transparent',
    border: 'none',
    borderBottom: `1px solid ${value || focused ? inputBorderFocus : inputBorder}`,
    width: 220,
    fontSize: 32,
    fontWeight: 700,
    color: textPrimary,
    fontFamily: PJS,
    padding: '4px 8px',
    outline: 'none',
    textAlign: 'left',
  });

  const [focus1, setFocus1] = useState(false);
  const [focus2, setFocus2] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, width: '100%', maxWidth: 700, margin: '0 auto' }}>
      <style>{`
        .s1-input::placeholder { color: ${isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}; }
      `}</style>

      {/* Line 1 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, width: '100%' }}>
        <span style={sentenceStyle}>Hi, my name is</span>
        <input
          type="text"
          value={name1}
          onChange={e => setName1(e.target.value)}
          placeholder="Your name"
          className="s1-input"
          style={inputStyle(name1, focus1)}
          onFocus={() => setFocus1(true)}
          onBlur={() => setFocus1(false)}
          onKeyDown={e => e.key === 'Enter' && name2.trim() && handleSubmit()}
        />
      </div>

      {/* Line 2 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, width: '100%' }}>
        <span style={sentenceStyle}>and my partner's name is</span>
        <input
          type="text"
          value={name2}
          onChange={e => setName2(e.target.value)}
          placeholder="Partner's name"
          className="s1-input"
          style={inputStyle(name2, focus2)}
          onFocus={() => setFocus2(true)}
          onBlur={() => setFocus2(false)}
          onKeyDown={e => e.key === 'Enter' && name1.trim() && handleSubmit()}
        />
      </div>

      {/* Continue button */}
      {name1.trim() && name2.trim() && (
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={handleSubmit}
          style={{ marginTop: 48 }}
          className="px-8 py-3 rounded-full text-white text-sm font-medium bg-gradient-to-r from-[#E03553] to-[#803D81] hover:brightness-110 transition-all"
        >
          Continue →
        </motion.button>
      )}
    </div>
  );
}
