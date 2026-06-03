import React, { useState } from 'react';
import { motion } from 'framer-motion';

const PJS = "'Plus Jakarta Sans', sans-serif";

const CARDS = [
  { id: 'intimate',     label: 'Intimate',     range: 'Under 50' },
  { id: 'celebration',  label: 'Celebration',  range: '50 – 150' },
  { id: 'grand',        label: 'Grand',        range: '150+' },
];

export default function OnboardingStep4GuestCount({ onNext, data, theme }) {
  const [selected, setSelected] = useState('');
  const [hoveredCard, setHoveredCard] = useState('');
  const [customCount, setCustomCount] = useState('');
  const isDark = theme !== 'light';
  const textPrimary = isDark ? '#FFFFFF' : '#0A0A0A';
  const textMuted = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.45)';
  const inputBorder = isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)';
  const cardBg = isDark ? '#111111' : '#FFFFFF';
  const cardBorder = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)';

  const handleSubmit = () => {
    const count = customCount ? parseInt(customCount) : (
      selected === 'intimate' ? 50 :
      selected === 'celebration' ? 100 : 200
    );
    onNext({ guestCount: count });
  };

  const isReady = selected || customCount;

  return (
    <div className="w-full max-w-3xl text-center">
      <style>{`.s4-input::placeholder { color: ${isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}; }`}</style>
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 700, color: textPrimary, fontFamily: PJS, marginBottom: 24 }}
      >
        How many guests are you expecting?
      </motion.h1>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-3 gap-4 mb-12"
      >
        {CARDS.map((card, i) => {
          const isSelected = selected === card.id;
          const isHovered = hoveredCard === card.id;
          const isActive = isSelected || isHovered;
          return (
            <motion.button
              key={card.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.1 }}
              onClick={() => setSelected(card.id)}
              onMouseEnter={() => setHoveredCard(card.id)}
              onMouseLeave={() => setHoveredCard('')}
              style={{
                padding: '28px 24px',
                border: isActive ? '2px solid #0A0A0A' : `2px solid ${cardBorder}`,
                background: isActive ? '#0A0A0A' : cardBg,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ fontWeight: 700, color: isActive ? '#FFFFFF' : textPrimary, fontFamily: PJS, fontSize: 16, marginBottom: 6 }}>
                {card.label}
              </div>
              <div style={{ fontSize: 13, color: isActive ? 'rgba(255,255,255,0.7)' : textMuted, fontFamily: PJS }}>
                {card.range}
              </div>
            </motion.button>
          );
        })}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="mb-12"
      >
        <p style={{ color: textMuted, fontSize: 14, marginBottom: 16, fontFamily: PJS }}>Or enter a number:</p>
        <div className="flex justify-center gap-3">
          <input
            type="number"
            value={customCount}
            onChange={e => setCustomCount(e.target.value)}
            placeholder="Enter count"
            className="s4-input"
            style={{
              background: 'transparent',
              border: `1px solid ${inputBorder}`,
              borderRadius: 0,
              padding: '8px 16px',
              color: textPrimary,
              textAlign: 'center',
              width: 128,
              fontFamily: PJS,
              fontSize: 14,
              outline: 'none',
            }}
          />
        </div>
      </motion.div>

      {isReady && (
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={handleSubmit}
          className="px-8 py-3 rounded-full text-white text-sm font-medium bg-[#E03553] hover:bg-black active:bg-neutral-900 transition-colors duration-150"
        >
          Continue →
        </motion.button>
      )}
    </div>
  );
}
