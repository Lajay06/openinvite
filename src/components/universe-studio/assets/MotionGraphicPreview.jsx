import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

import { coupleDisplayName } from '@/lib/coupleNames';
// universe: the full config object (colors/typography), not just its id —
// see UniverseWorldView.jsx's Chapter 6 comment for why.
export default function MotionGraphicPreview({ universe, weddingDetails }) {
  const bg = universe?.colors?.darkBg || '#0A0A0A';
  const text = universe?.colors?.darkText || '#FFFFFF';
  const accent = universe?.colors?.accent || '#E03553';
  const headingFont = universe?.typography?.headingFont || 'Georgia, serif';
  const names = coupleDisplayName(weddingDetails, 'Sarah & James');
  const date = weddingDetails?.weddingDate
    ? new Date(weddingDetails.weddingDate).toLocaleDateString('en-GB')
    : '15.03.2026';
  const [phase, setPhase] = useState(0);

  // phase: 0 = blank, 1 = names, 2 = line, 3 = tagline, 4 = pause, loop
  useEffect(() => {
    const timings = [500, 1500, 2200, 3000, 5000];
    const timers = timings.map((t, i) => setTimeout(() => setPhase(i + 1), t));
    const loop = setTimeout(() => setPhase(0), 5500);
    const restart = setTimeout(() => setPhase(1), 6000);
    return () => { timers.forEach(clearTimeout); clearTimeout(loop); clearTimeout(restart); };
  }, []);

  const chars = names.split('');

  return (
    <div style={{
      width: '100%', height: '100%', background: bg,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 8, position: 'relative', overflow: 'hidden'
    }}>
      {/* Names */}
      <div style={{ display: 'flex', minHeight: 28, alignItems: 'center', justifyContent: 'center' }}>
        {chars.map((char, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: phase >= 1 ? 1 : 0 }}
            transition={{ delay: i * 0.08, duration: 0.3 }}
            style={{
              fontFamily: headingFont,
              fontWeight: 300, fontSize: 18, color: text,
              letterSpacing: char === ' ' ? '0.3em' : '0.15em',
            }}
          >
            {char}
          </motion.span>
        ))}
      </div>

      {/* Date */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: phase >= 1 ? 0.6 : 0 }}
        transition={{ delay: chars.length * 0.08 + 0.2 }}
        style={{ fontSize: 8, color: `${text}99`, letterSpacing: '0.25em', textAlign: 'center' }}
      >
        {date}
      </motion.p>

      {/* Line — the universe's own accent, not a neutral divider */}
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: phase >= 2 ? '60%' : 0 }}
        transition={{ duration: 0.8, ease: 'easeInOut' }}
        style={{ height: '1px', background: accent }}
      />

      {/* Tagline */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: phase >= 3 ? 1 : 0 }}
        transition={{ duration: 0.6 }}
        style={{
          fontSize: 7, color: accent, letterSpacing: '0.5em',
          textTransform: 'uppercase', textAlign: 'center'
        }}
      >
        WE ARE GETTING MARRIED
      </motion.p>
    </div>
  );
}