import React from 'react';
import { motion } from 'framer-motion';

const PJS = "'Plus Jakarta Sans', sans-serif";

// Cards no longer invert to a solid black background on hover — that made
// the whole card (including its bullet list) hard to read mid-transition
// and gave no dedicated click target. Each card is a static white panel
// (border darkens on hover as the only hover affordance) with a real
// "Select" button at the bottom, styled like every other primary CTA in
// the flow (px-8 py-3 rounded-full bg-[#E03553] hover:bg-black
// active:bg-neutral-900 text-white text-sm font-medium) — both paths are
// equally valid choices, so both get the same button treatment rather than
// a primary/secondary pair.
// border lives in the className (not this style object) so the
// hover:border-* Tailwind class can actually win — an inline `border`
// property always beats a stylesheet rule, hover pseudo-class or not.
const cardStyle = {
  textAlign: 'left',
  padding: 32,
  background: '#FFFFFF',
  display: 'flex',
  flexDirection: 'column',
};

const textDark = '#0A0A0A';
const textMid = '#555555';
const textFaint = 'rgba(10,10,10,0.35)';
const textMuted = 'rgba(10,10,10,0.5)';
const accentColor = '#E03553';

export default function OnboardingStep8Fork({ onPathA, onPathB, data }) {
  return (
    <div
      className="w-full max-w-5xl text-center"
      style={{ background: 'transparent' }}
    >
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          fontSize: 'clamp(28px, 4vw, 48px)',
          fontWeight: 800,
          color: '#0A0A0A',
          fontFamily: PJS,
          marginBottom: 12,
        }}
      >
        One last thing.
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={{ color: '#555555', fontSize: 16, marginBottom: 64, fontFamily: PJS }}
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
        <motion.div
          className="border border-[rgba(10,10,10,0.12)] hover:border-[#0A0A0A] transition-colors duration-150"
          style={cardStyle}
        >
          <h3 style={{ color: textDark, fontSize: 18, fontWeight: 700, marginBottom: 12, fontFamily: PJS }}>Tell us more</h3>
          <p style={{ color: textMid, fontSize: 14, marginBottom: 24, lineHeight: 1.6, fontFamily: PJS }}>
            Upload your guest list, add vendors, set your budget, and give Ava everything Ava needs to hit the ground running.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
            {['Upload guest list (CSV or manual)', 'Add cultural/religious details', 'Set your budget', 'Add known vendors', 'Upload inspiration photos'].map(item => (
              <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, color: textMuted, fontSize: 14, fontFamily: PJS }}>
                <span style={{ color: accentColor, fontWeight: 700, fontSize: 14, lineHeight: 1 }}>—</span> {item}
              </div>
            ))}
          </div>
          <button
            onClick={onPathA}
            style={{ marginTop: 'auto', alignSelf: 'flex-start' }}
            className="px-8 py-3 rounded-full text-white text-sm font-medium bg-[#E03553] hover:bg-black active:bg-neutral-900 transition-colors duration-150 border-none cursor-pointer"
          >
            Select
          </button>
        </motion.div>

        {/* Card B — Get started now */}
        <motion.div
          className="border border-[rgba(10,10,10,0.12)] hover:border-[#0A0A0A] transition-colors duration-150"
          style={cardStyle}
        >
          <h3 style={{ color: textDark, fontSize: 18, fontWeight: 700, marginBottom: 12, fontFamily: PJS }}>Get started now</h3>
          <p style={{ color: textMid, fontSize: 14, marginBottom: 24, lineHeight: 1.6, fontFamily: PJS }}>
            Jump straight into your dashboard. Ava will guide you through the key details as you go — no overwhelm.
          </p>
          <p style={{ color: textFaint, fontSize: 13, marginBottom: 24, fontFamily: PJS }}>
            You can always add more later.
          </p>
          <button
            onClick={onPathB}
            style={{ marginTop: 'auto', alignSelf: 'flex-start' }}
            className="px-8 py-3 rounded-full text-white text-sm font-medium bg-[#E03553] hover:bg-black active:bg-neutral-900 transition-colors duration-150 border-none cursor-pointer"
          >
            Select
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}
