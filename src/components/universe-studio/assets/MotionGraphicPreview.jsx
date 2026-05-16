import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function MotionGraphicPreview({ universe, weddingDetails }) {
  const names = weddingDetails?.coupleNames || 'Sarah & James';
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
      width: '100%', height: '100%', background: '#0A0A0A',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 8, position: 'relative', overflow: 'hidden'
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300&display=swap');`}</style>

      {/* Names */}
      <div style={{ display: 'flex', minHeight: 28, alignItems: 'center', justifyContent: 'center' }}>
        {chars.map((char, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: phase >= 1 ? 1 : 0 }}
            transition={{ delay: i * 0.08, duration: 0.3 }}
            style={{
              fontFamily: 'Cormorant Garamond, Georgia, serif',
              fontWeight: 300, fontSize: 18, color: '#FFFFFF',
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
        style={{ fontSize: 8, color: '#FFFFFF', letterSpacing: '0.25em', textAlign: 'center' }}
      >
        {date}
      </motion.p>

      {/* Line */}
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: phase >= 2 ? '60%' : 0 }}
        transition={{ duration: 0.8, ease: 'easeInOut' }}
        style={{ height: '1px', background: 'rgba(255,255,255,0.4)' }}
      />

      {/* Tagline */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: phase >= 3 ? 0.5 : 0 }}
        transition={{ duration: 0.6 }}
        style={{
          fontSize: 7, color: '#FFFFFF', letterSpacing: '0.5em',
          textTransform: 'uppercase', textAlign: 'center'
        }}
      >
        WE ARE GETTING MARRIED
      </motion.p>
    </div>
  );
}