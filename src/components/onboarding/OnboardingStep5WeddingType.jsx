import React, { useState } from 'react';
import { motion } from 'framer-motion';

const PJS = "'Plus Jakarta Sans', sans-serif";

const GROUPS = [
  {
    key: 'style',
    label: 'Style',
    pills: ['Traditional', 'Modern', 'Minimalist', 'Maximalist', 'Bohemian', 'Luxury'],
  },
  {
    key: 'ceremony',
    label: 'Ceremony type',
    pills: ['Christian', 'Catholic', 'Jewish', 'Muslim', 'Hindu', 'Sikh', 'Buddhist', 'Civil', 'Cultural Fusion', 'Non-religious'],
  },
  {
    key: 'vibe',
    label: 'Vibe',
    pills: ['Intimate & romantic', 'Party & dancing', 'Outdoor & nature', 'Destination', 'Multi-day event', 'Elopement'],
  },
];

export default function OnboardingStep5WeddingType({ onNext, data, theme }) {
  const [selected, setSelected] = useState([]);
  const [otherText, setOtherText] = useState({ style: '', ceremony: '', vibe: '' });
  const isDark = theme !== 'light';
  const textPrimary = isDark ? '#FFFFFF' : '#0A0A0A';
  const textMuted = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.45)';
  const headerColor = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)';
  const pillBorder = isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.15)';
  const otherInputBorder = isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)';

  const otherKey = key => `__other_${key}`;

  const toggle = pill =>
    setSelected(prev => prev.includes(pill) ? prev.filter(p => p !== pill) : [...prev, pill]);

  const handleSubmit = () => {
    const extras = GROUPS
      .filter(g => selected.includes(otherKey(g.key)) && otherText[g.key].trim())
      .map(g => otherText[g.key].trim());
    onNext({ weddingStyle: [...selected.filter(s => !s.startsWith('__other_')), ...extras] });
  };

  const hasSelection = selected.length > 0 || GROUPS.some(g => otherText[g.key].trim());

  return (
    <div className="w-full max-w-4xl text-center">
      <style>{`
        .s5-other::placeholder { color: ${isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'}; }
        .s5-pill:not(.s5-active):hover {
          background: #0A0A0A !important;
          color: #FFFFFF !important;
          border-color: #0A0A0A !important;
        }
        .s5-pill:not(.s5-active):active { background: #111111 !important; }
      `}</style>

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
        className="mb-12"
        style={{ textAlign: 'left' }}
      >
        {GROUPS.map((group, gi) => {
          const isOtherSelected = selected.includes(otherKey(group.key));
          return (
            <div key={group.key}>
              {/* Group header */}
              <p style={{
                fontSize: 10, fontWeight: 600,
                letterSpacing: '0.08em',
                color: headerColor,
                fontFamily: PJS,
                margin: gi === 0 ? '0 0 12px' : '32px 0 12px',
              }}>
                {group.label}
              </p>

              {/* Pills */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {group.pills.map((pill, pi) => {
                  const isActive = selected.includes(pill);
                  return (
                    <motion.button
                      key={pill}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.25 + gi * 0.1 + pi * 0.02 }}
                      onClick={() => toggle(pill)}
                      className={`s5-pill${isActive ? ' s5-active' : ''}`}
                      style={{
                        padding: '8px 16px',
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 500,
                        fontFamily: PJS,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        background: isActive ? '#0A0A0A' : 'transparent',
                        color: isActive ? '#FFFFFF' : textMuted,
                        border: `1px solid ${isActive ? '#0A0A0A' : pillBorder}`,
                      }}
                    >
                      {pill}
                    </motion.button>
                  );
                })}

                {/* Other pill */}
                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.25 + gi * 0.1 + group.pills.length * 0.02 }}
                  onClick={() => toggle(otherKey(group.key))}
                  className={`s5-pill${isOtherSelected ? ' s5-active' : ''}`}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 500,
                    fontFamily: PJS,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    background: isOtherSelected ? '#0A0A0A' : 'transparent',
                    color: isOtherSelected ? '#FFFFFF' : textMuted,
                    border: `1px solid ${isOtherSelected ? '#0A0A0A' : pillBorder}`,
                  }}
                >
                  Other
                </motion.button>
              </div>

              {/* Other free-text input */}
              {isOtherSelected && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  style={{ marginTop: 12 }}
                >
                  <input
                    type="text"
                    className="s5-other"
                    value={otherText[group.key]}
                    onChange={e => setOtherText(prev => ({ ...prev, [group.key]: e.target.value }))}
                    placeholder={`Describe your ${group.label.toLowerCase()}…`}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      borderBottom: `1px solid ${otherInputBorder}`,
                      color: textPrimary,
                      fontFamily: PJS,
                      fontSize: 13,
                      padding: '6px 2px',
                      width: 280,
                      outline: 'none',
                    }}
                  />
                </motion.div>
              )}
            </div>
          );
        })}
      </motion.div>

      {hasSelection && (
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={handleSubmit}
          className="px-8 py-3 rounded-full text-white text-sm font-medium bg-gradient-to-r from-[#E03553] to-[#803D81] hover:bg-none hover:bg-black hover:text-white active:bg-neutral-900 transition-colors duration-150"
        >
          Continue →
        </motion.button>
      )}
    </div>
  );
}
