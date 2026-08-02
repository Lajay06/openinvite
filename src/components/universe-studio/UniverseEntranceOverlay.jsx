/**
 * UniverseEntranceOverlay — the full-screen takeover that plays when a
 * universe tile is pressed, calibrated to that universe's own real
 * motion.duration/ease (UNIVERSE_CONFIGS) AND its transitionStyle (one of
 * the 10 treatments in src/lib/universeTransitions.js, PR B1). Reduced
 * motion is non-negotiable: prefersReducedMotion swaps the whole sequence
 * for a near-instant, static equivalent (no wash, no travelling text,
 * no decorative layer) — never a diluted version of the same animation.
 *
 * Double-mount safety: this only fires from enterUniverse()'s onClick
 * handler in UniverseStudio.jsx — component-local `phase` state, not a
 * shared/URL-driven trigger. Layout.jsx mounts every page twice (desktop +
 * mobile trees, CSS-toggled), but only the visible, clickable tree can ever
 * receive the click, so only one overlay instance ever activates. If this
 * ever gets a second trigger path driven by shared state (a route change, a
 * global context value) instead of a click, that path needs the same
 * module-scope singleton guard Dashboard.jsx uses for TipsModal — otherwise
 * both hidden and visible trees fire their own portal simultaneously.
 */
import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { loadUniverseFont } from '@/lib/lazyUniverseFonts';
import { getTransitionStyle } from '@/lib/universeTransitions';
import { getTexture } from '@/lib/textures';

export default function UniverseEntranceOverlay({ universe, active, muted, prefersReducedMotion }) {
  // The entrance is the very first paint of this universe's real display
  // font (before the world view itself mounts) — load it the instant the
  // overlay activates, not after the wash finishes.
  useEffect(() => {
    if (active && universe) loadUniverseFont(universe);
  }, [active, universe]);

  if (!universe) return null;

  const style = getTransitionStyle(universe.transitionStyle);
  const baseDuration = universe.motion?.duration || 0.7;
  const cappedDuration = style.fastCapSeconds ? Math.min(baseDuration, style.fastCapSeconds) : baseDuration;
  const duration = prefersReducedMotion ? 0.08 : cappedDuration;

  // Portal straight to <body>, escaping .page-content entirely. Root cause
  // of the centring bug: .page-content's own pageFadeIn animation
  // (opacity-only, deliberately never transform — see the fix/modal-
  // viewport-centering comment in index.css) still establishes a *stacking
  // context* for .page-content itself the moment any animation with
  // animation-fill-mode:forwards is applied to it, even though it does NOT
  // establish a new *containing block* (that part of the earlier fix holds
  // — this overlay's own position:fixed math was always correct, measured
  // at exactly 0,0 / full viewport). But being trapped inside that
  // stacking context meant this overlay's zIndex:2000 was only ever
  // compared against .page-content's own descendants — never directly
  // against TopBar (zIndex:50), a sibling OUTSIDE .page-content, which won
  // the outer comparison and visually painted over the overlay's top ~48px
  // (84px with an active trial banner). The name itself was always
  // mathematically centred on the true viewport; what was actually
  // off-centre was the *visible* dark canvas beneath the topbar sliver,
  // making the text read as sitting too high. Confirmed via a real
  // browser measurement harness: before this fix, elementFromPoint at the
  // top strip returned the topbar; after portalling, it returns the
  // overlay itself, and the measured name-centre-to-viewport-centre delta
  // is 0,0 in every case tested (desktop, mobile, reduced motion).
  const mutedFilter = muted ? 'saturate(0.35) brightness(0.7)' : '';
  const nameNode = (isReduced) => isReduced ? (
    // Reduced motion still needs the name to appear — just with no wash,
    // no travel, fully visible immediately — never silently skipped, which
    // would leave a bare colour flash with no name.
    <p style={nameStyle(universe)}>{universe.name}</p>
  ) : (
    <motion.p
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration, delay: duration * 0.4, ease: 'easeOut' }}
      style={{ ...nameStyle(universe), position: 'relative', zIndex: 1 }}
    >
      {universe.name}
    </motion.p>
  );

  return createPortal(
    <AnimatePresence>
      {active && (
        prefersReducedMotion ? (
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
            {nameNode(true)}
          </motion.div>
        ) : style.panels ? (
          // curtain-draw — two panels slide in from the outer edges and meet
          // at centre, transform-only (x), no clip-path/filter cost.
          <div style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'grid', placeItems: 'center', filter: mutedFilter || 'none' }}>
            <motion.div
              initial={{ x: '-100%' }} animate={{ x: '0%' }} exit={{ x: '-100%' }}
              transition={{ duration, ease: style.ease }}
              style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '50%', background: universe.colors.darkBg }}
            />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: '0%' }} exit={{ x: '100%' }}
              transition={{ duration, ease: style.ease }}
              style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: '50%', background: universe.colors.darkBg }}
            />
            {nameNode(false)}
          </div>
        ) : (
          <motion.div
            initial={{
              opacity: 0,
              ...(style.scale && { scale: style.scale[0] }),
              ...(style.clipPath && { clipPath: style.clipPath[0] }),
              ...(style.filterBlur && { filter: `blur(${style.filterBlur[0]}) ${mutedFilter}`.trim() }),
            }}
            animate={{
              opacity: 1,
              ...(style.scale && { scale: style.scale }),
              ...(style.clipPath && { clipPath: style.clipPath }),
              ...(style.filterBlur && { filter: style.filterBlur.map(b => `blur(${b}) ${mutedFilter}`.trim()) }),
            }}
            exit={{ opacity: 0 }}
            transition={{ duration, ease: style.ease, ...(style.times && { times: style.times }) }}
            style={{
              position: 'fixed', inset: 0, zIndex: 2000,
              background: universe.colors.darkBg,
              filter: !style.filterBlur ? (mutedFilter || 'none') : undefined,
              display: 'grid', placeItems: 'center', overflow: 'hidden',
            }}
          >
            <TransitionOverlayLayer style={style} universe={universe} duration={duration} />
            {nameNode(false)}
          </motion.div>
        )
      )}
    </AnimatePresence>,
    document.body
  );
}

function nameStyle(universe) {
  return {
    fontFamily: universe.typography.headingFont, fontSize: 'clamp(1.8rem, 4.5vw, 3.4rem)',
    color: universe.colors.lightBg, margin: 0, textAlign: 'center', maxWidth: '90vw', padding: '0 24px',
  };
}

/** The decorative layer for the 4 styles that use one — grain textures reuse
 * src/lib/textures.js's procedural SVG (no new asset), gradients are plain
 * CSS. Always a child of the already-clipped/scaled wash div, so it inherits
 * that shape for free. */
function TransitionOverlayLayer({ style, universe, duration }) {
  switch (style.overlayLayer) {
    case 'radial-warm':
      return (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: [0, 0.6, 0] }} transition={{ duration, ease: 'easeInOut' }}
          style={{
            position: 'absolute', inset: -50, borderRadius: '50%', filter: 'blur(40px)',
            background: `radial-gradient(circle at 50% 50%, ${universe.colors.accent}55, transparent 60%)`,
          }}
        />
      );
    case 'grain-drift':
    case 'grain-static': {
      const tex = getTexture('grain');
      const drifting = style.overlayLayer === 'grain-drift';
      return (
        <motion.div
          initial={{ backgroundPosition: '0% 0%' }}
          animate={drifting ? { backgroundPosition: '40% 20%' } : {}}
          transition={{ duration, ease: 'linear' }}
          style={{
            position: 'absolute', inset: 0, opacity: 0.08,
            backgroundImage: tex.backgroundImage, backgroundSize: tex.backgroundSize,
          }}
        />
      );
    }
    case 'light-sweep':
      return (
        <motion.div
          initial={{ x: '-60%' }} animate={{ x: '60%' }} transition={{ duration, ease: 'easeInOut' }}
          style={{
            position: 'absolute', top: '-20%', bottom: '-20%', left: '-60%', right: '-60%',
            background: `linear-gradient(115deg, transparent 40%, ${universe.colors.lightBg}77 50%, transparent 60%)`,
          }}
        />
      );
    default:
      return null;
  }
}
