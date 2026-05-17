import React from 'react';
import { motion } from 'framer-motion';
import { Clipboard, Zap } from 'lucide-react';

const PJS = "'Plus Jakarta Sans', sans-serif";

export default function OnboardingStep8Fork({ onPathA, onPathB, data, theme }) {
  const isDark = theme !== 'light';
  const textPrimary = isDark ? '#FFFFFF' : '#0A0A0A';
  const textMuted = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.45)';
  const textFaint = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.3)';
  const cardBg = isDark ? '#111111' : '#FFFFFF';
  const cardBorder = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  const checkColor = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.5)';

  return (
    <div className="w-full max-w-5xl text-center">
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 700, color: textPrimary, fontFamily: PJS, marginBottom: 12 }}
      >
        One last thing.
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={{ color: textMuted, fontSize: 16, marginBottom: 64, fontFamily: PJS }}
      >
        Would you like to add more details now or jump straight in?
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-8"
      >
        {/* Card A — Tell us more */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          onClick={onPathA}
          style={{
            textAlign: 'left',
            padding: 32,
            background: cardBg,
            border: `1px solid ${cardBorder}`,
            cursor: 'pointer',
            transition: 'border-color 0.2s ease',
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = '#E03553'}
          onMouseLeave={e => e.currentTarget.style.borderColor = cardBorder}
        >
          <Clipboard style={{ width: 32, height: 32, color: '#DDF762', marginBottom: 16, display: 'block' }} />
          <h3 style={{ color: textPrimary, fontSize: 18, fontWeight: 700, marginBottom: 12, fontFamily: PJS }}>Tell us more</h3>
          <p style={{ color: textMuted, fontSize: 14, marginBottom: 24, lineHeight: 1.6, fontFamily: PJS }}>
            Upload your guest list, add vendors, set your budget, and give Ava everything she needs to hit the ground running.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
            {['Upload guest list (CSV or manual)', 'Add cultural/religious details', 'Set your budget', 'Add known vendors', 'Upload inspiration photos'].map(item => (
              <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, color: checkColor, fontSize: 14, fontFamily: PJS }}>
                <span>✓</span> {item}
              </div>
            ))}
          </div>
          <div className="px-6 py-3 rounded-full text-white text-sm font-medium bg-gradient-to-r from-[#E03553] to-[#803D81] inline-block">
            Let's do it →
          </div>
        </motion.button>

        {/* Card B — Get started now */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          onClick={onPathB}
          style={{
            textAlign: 'left',
            padding: 32,
            background: cardBg,
            border: `1px solid ${cardBorder}`,
            cursor: 'pointer',
            transition: 'border-color 0.2s ease',
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = '#E03553'}
          onMouseLeave={e => e.currentTarget.style.borderColor = cardBorder}
        >
          <Zap style={{ width: 32, height: 32, color: '#E03553', marginBottom: 16, display: 'block' }} />
          <h3 style={{ color: textPrimary, fontSize: 18, fontWeight: 700, marginBottom: 12, fontFamily: PJS }}>Get started now</h3>
          <p style={{ color: textMuted, fontSize: 14, marginBottom: 24, lineHeight: 1.6, fontFamily: PJS }}>
            Jump straight into your dashboard. Ava will guide you through the key details as you go — no overwhelm.
          </p>
          <p style={{ color: textFaint, fontSize: 13, marginBottom: 24, fontFamily: PJS }}>
            You can always add more later.
          </p>
          <div className="px-6 py-3 rounded-full text-sm font-medium inline-block"
            style={{ background: isDark ? '#FFFFFF' : '#0A0A0A', color: isDark ? '#0A0A0A' : '#FFFFFF' }}>
            Let's go →
          </div>
        </motion.button>
      </motion.div>
    </div>
  );
}
