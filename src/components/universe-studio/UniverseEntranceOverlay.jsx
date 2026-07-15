/**
 * UniverseEntranceOverlay — the full-screen takeover that plays when a
 * universe tile is pressed, calibrated to that universe's own real
 * motion.duration/ease (UNIVERSE_CONFIGS). Reduced motion is
 * non-negotiable: prefersReducedMotion swaps the whole sequence for a
 * near-instant, static equivalent (no wash, no travelling text) — never a
 * diluted version of the same animation.
 */
import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { loadUniverseFont } from '@/lib/lazyUniverseFonts';

export default function UniverseEntranceOverlay({ universe, active, muted, prefersReducedMotion }) {
  // The entrance is the very first paint of this universe's real display
  // font (before the world view itself mounts) — load it the instant the
  // overlay activates, not after the wash finishes.
  useEffect(() => {
    if (active && universe) loadUniverseFont(universe);
  }, [active, universe]);

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
            display: 'grid', placeItems: 'center',
          }}
        >
          {prefersReducedMotion ? (
            // Reduced motion still needs the name to appear — just with no
            // wash, no travel, fully visible immediately — never silently
            // skipped, which would leave a bare colour flash with no name.
            <p
              style={{
                fontFamily: universe.typography.headingFont, fontSize: 'clamp(1.8rem, 4.5vw, 3.4rem)',
                color: universe.colors.lightBg, margin: 0, textAlign: 'center', maxWidth: '90vw', padding: '0 24px',
              }}
            >
              {universe.name}
            </p>
          ) : (
            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration, delay: 0.1, ease: 'easeOut' }}
              style={{
                fontFamily: universe.typography.headingFont, fontSize: 'clamp(1.8rem, 4.5vw, 3.4rem)',
                color: universe.colors.lightBg, margin: 0, textAlign: 'center', maxWidth: '90vw', padding: '0 24px',
              }}
            >
              {universe.name}
            </motion.p>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
