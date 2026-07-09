/**
 * SectionReveal — universe-config-driven scroll reveal.
 *
 * - When a universe declares motion.sectionReveal='fade', sections gently
 *   fade + rise into view. Duration, y-offset and easing come from the config.
 * - Respects prefers-reduced-motion: if the OS preference is set, animations
 *   are skipped entirely (element is always visible).
 * - If no universeConfig is provided (or universe has no motion config), falls
 *   back to a sensible default fade — so non-Aman pages are not broken.
 * - `viewport={{ once: true }}` means each section reveals once, then stays.
 * - `disabled` is the builder's on/off switch (weddingDetails.scrollAnimation
 *   === 'none', via src/lib/universeStyling.js's isMotionEnabled) — when true,
 *   the section renders immediately with no animation, same as reduced-motion.
 */
import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

export default function SectionReveal({
  children,
  universeConfig,
  disabled = false,
  style,
  className,
}) {
  const prefersReduced = useReducedMotion();
  const m = universeConfig?.motion;

  // Animate when:
  //   (a) universe declares sectionReveal — use config values, or
  //   (b) universeConfig is absent (null/undefined) — default fade, preserving
  //       existing behaviour on pages that don't yet pass a config.
  // Never animate: OS prefers-reduced-motion, the builder's motion toggle is
  // off, or config present but no motion key.
  const hasConfig = universeConfig != null;
  const shouldAnimate = !disabled && !prefersReduced && (!!m?.sectionReveal || !hasConfig);

  const yOffset  = m?.yOffset  ?? 20;
  const duration = m?.duration ?? 0.7;
  const ease     = m?.ease     ?? 'easeOut';

  return (
    <motion.div
      initial={shouldAnimate ? { opacity: 0, y: yOffset } : false}
      whileInView={shouldAnimate ? { opacity: 1, y: 0 } : undefined}
      viewport={{ once: true, margin: '-40px' }}
      transition={shouldAnimate ? { duration, ease } : undefined}
      style={style}
      className={className}
    >
      {children}
    </motion.div>
  );
}
