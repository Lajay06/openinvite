/**
 * UniverseEntranceOverlay — the full-screen takeover that plays when a
 * universe tile is pressed, calibrated to that universe's own real
 * motion.duration/ease (UNIVERSE_CONFIGS). Reduced motion is
 * non-negotiable: prefersReducedMotion swaps the whole sequence for a
 * near-instant, static equivalent (no wash, no travelling text) — never a
 * diluted version of the same animation.
 */
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function UniverseEntranceOverlay({ universe, active, muted, prefersReducedMotion }) {
  if (!universe) return null;
  const duration = prefersReducedMotion ? 0.08 : (universe.motion?.duration || 0.7);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration, ease: 'easeInOut' }}
          style={{
            position: 'fixed', inset: 0, zIndex: 2000,
            background: universe.colors.darkBg,
            filter: muted ? 'saturate(0.35) brightness(0.7)' : 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {!prefersReducedMotion && (
            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration, delay: 0.1, ease: 'easeOut' }}
              style={{ fontFamily: universe.typography.headingFont, fontSize: 'clamp(1.8rem, 4.5vw, 3.4rem)', color: universe.colors.lightBg, margin: 0 }}
            >
              {universe.name}
            </motion.p>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
