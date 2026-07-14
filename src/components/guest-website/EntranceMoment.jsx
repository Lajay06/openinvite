/**
 * EntranceMoment.jsx — feat/entrance-moment
 *
 * A first-visit reveal that plays OVER an already-loading published wedding
 * site: a ~2.5s, four-beat overlay (warm-dark screen + a small light ->
 * kicker/hairline fade in -> couple's names move on-character -> curtain
 * lifts to the real, already-rendering page beneath). One entrance SYSTEM,
 * per-universe CONFIG (entranceConfig.js) — see that file for which
 * universes got bespoke treatment vs the shared default.
 *
 * Deliberately non-blocking: this renders as a fixed-position sibling
 * OVER whatever page content the caller already mounted — it never wraps,
 * delays, or conditionally defers that content. The "photo fades up into
 * focus" / "video comes into focus" effect for requirement (3) is achieved
 * by animating THIS overlay's own opacity + backdrop-filter blur down to
 * nothing, revealing whatever the real page (with its own already-correct
 * photo/video/solid hero rendering) looks like underneath — no hero-type
 * branching needed here, no duplicate hero rendering, single source of
 * truth stays with WeddingHomePage.jsx's existing HeroBackground.
 *
 * GPU-cheap by construction: every animated property here is opacity,
 * transform, or backdrop-filter — never a layout-triggering property.
 */
import React, { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { detectHeroVideoType } from '@/lib/heroVideo';
import { normalizeUniverseKey } from '@/lib/websiteThemes';
import { getEntranceConfig, MAX_HOLD_MS } from '@/lib/entranceConfig';
import HairlineRule from './layouts/HairlineRule';

const SKIP_REVEAL_MS = 300;
const CUE_VISIBLE_MS = 1800;
const CURTAIN_BLUR_PX = 14;

function formatEntranceKicker(universeConfig) {
  return universeConfig?.copy?.heroKicker || "You're invited";
}

function nameVariants(nameMotion, ease) {
  switch (nameMotion) {
    case 'dissolve':
      return { hidden: { opacity: 0 }, shown: { opacity: 1, transition: { duration: 1.1, ease } } };
    case 'unfold':
      return { hidden: { opacity: 0, scale: 0.92 }, shown: { opacity: 1, scale: 1, transition: { duration: 0.85, ease } } };
    case 'snap':
      return { hidden: { opacity: 0, scale: 0.9, y: -6 }, shown: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.35, ease } } };
    case 'drift':
      return { hidden: { opacity: 0, y: 18, x: -8 }, shown: { opacity: 1, y: 0, x: 0, transition: { duration: 0.95, ease } } };
    case 'stillness':
      return { hidden: { opacity: 0 }, shown: { opacity: 1, transition: { duration: 1.3, ease } } };
    case 'rise':
    default:
      return { hidden: { opacity: 0, y: 26 }, shown: { opacity: 1, y: 0, transition: { duration: 0.75, ease } } };
  }
}

const ACTIVE_PHASES = new Set(['scrim', 'kicker', 'names', 'holding']);

export default function EntranceMoment({ weddingSlug, weddingDetails, theme, typography, universeConfig, forcePlay = false, onDone }) {
  const prefersReducedOS = useReducedMotion();
  const universeKey = normalizeUniverseKey(weddingDetails?.activeUniverse) || 'aman';
  const config = getEntranceConfig(universeKey);
  const storageKey = `oi_entrance_${weddingSlug || 'default'}`;

  const [phase, setPhase] = useState(() => {
    if (typeof window === 'undefined') return 'gone';
    if (!forcePlay) {
      if (prefersReducedOS) return 'gone';
      try { if (window.localStorage.getItem(storageKey)) return 'gone'; } catch { /* storage unavailable — treat as first visit */ }
    }
    return 'scrim';
  });

  const mountTimeRef = useRef(Date.now());
  const timerIdsRef = useRef([]);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  // Snapshot of "are we actually playing" from the very first render —
  // deliberately NOT the live `phase` state. The beat-scheduling effect
  // below must run exactly once at mount and clean up exactly once at
  // unmount; keying it to `phase` would re-fire its cleanup (clearing the
  // still-pending beat timers) the instant phase advances away from
  // 'scrim', which is precisely what the first timer's own setPhase call
  // triggers — silently cancelling every beat after the first.
  const shouldPlayRef = useRef(phase === 'scrim');

  const coverPhoto = weddingDetails?.coverPhoto;
  const hasVideo = !!detectHeroVideoType(weddingDetails?.heroVideoUrl);
  const mustWaitForPhoto = !hasVideo && !!coverPhoto;
  const [photoReady, setPhotoReady] = useState(!mustWaitForPhoto);

  // Independently preloads the same cover photo URL the real hero is
  // already loading (browser cache/dedup means this costs nothing extra)
  // so this component can know when it's safe to reveal without needing
  // any plumbing into WeddingHomePage.jsx's own hero rendering.
  useEffect(() => {
    if (!mustWaitForPhoto) return;
    let cancelled = false;
    const img = new Image();
    img.onload = () => { if (!cancelled) setPhotoReady(true); };
    img.onerror = () => { if (!cancelled) setPhotoReady(true); }; // never hold forever on a broken image
    img.src = coverPhoto;
    return () => { cancelled = true; };
  }, [mustWaitForPhoto, coverPhoto]);

  // Shared tail for both the scripted reveal and a manual skip: mark seen,
  // notify the caller, then hold on 'revealing' for `revealMs` before the
  // scroll cue appears and finally unmounting.
  const revealThenGone = (revealMs) => {
    if (!forcePlay) {
      try { window.localStorage.setItem(storageKey, '1'); } catch { /* best-effort only */ }
    }
    onDoneRef.current?.();
    setPhase('revealing');
    const t1 = setTimeout(() => {
      setPhase('cue');
      const t2 = setTimeout(() => setPhase('gone'), CUE_VISIBLE_MS);
      timerIdsRef.current.push(t2);
    }, revealMs);
    timerIdsRef.current.push(t1);
  };

  const beginReveal = () => revealThenGone(Math.max(400, config.totalDuration - config.beats.settle));

  // Beat 1->2->3->4 (holding): scripted timeline, ms offsets from mount.
  // Functional setPhase guards (only advance if still at the expected
  // prior phase) are a second line of defence alongside clearing these
  // timers on skip — belt and suspenders against a stale timer firing
  // after the visitor has already skipped ahead.
  useEffect(() => {
    if (!shouldPlayRef.current) return;
    const ids = [
      setTimeout(() => setPhase(p => (p === 'scrim' ? 'kicker' : p)), config.beats.kicker),
      setTimeout(() => setPhase(p => (p === 'kicker' ? 'names' : p)), config.beats.names),
      setTimeout(() => setPhase(p => (p === 'names' ? 'holding' : p)), config.beats.settle),
    ];
    timerIdsRef.current.push(...ids);
    return () => ids.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deliberately mount-once: config/shouldPlayRef are stable for the component's lifetime, and re-running this on every phase change would clear the very timers advancing that phase
  }, []);

  // Holding -> reveal: gated on hero-media readiness, capped at MAX_HOLD_MS
  // total so a slow photo (or a broken URL) never holds the guest on a
  // static screen forever — it settles into the real page regardless.
  useEffect(() => {
    if (phase !== 'holding') return;
    if (photoReady) { beginReveal(); return; }
    const remainingToCap = Math.max(0, MAX_HOLD_MS - (Date.now() - mountTimeRef.current));
    const t = setTimeout(beginReveal, remainingToCap);
    timerIdsRef.current.push(t);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, photoReady]);

  const skip = () => {
    if (!ACTIVE_PHASES.has(phase)) return;
    timerIdsRef.current.forEach(clearTimeout);
    timerIdsRef.current = [];
    revealThenGone(SKIP_REVEAL_MS);
  };

  if (phase === 'gone') return null;

  const showContent = phase !== 'revealing' && phase !== 'cue';
  // Curtain starts lifting the MOMENT 'revealing' begins (not at 'cue') —
  // it needs the full revealDuration to fade out, and 'cue' is reached only
  // once that fade has already finished.
  const showCurtain = phase !== 'revealing' && phase !== 'cue';
  const showKicker = phase === 'kicker' || phase === 'names' || phase === 'holding';
  const showNames = phase === 'names' || phase === 'holding';
  const showCue = phase === 'cue';

  const variants = nameVariants(config.nameMotion, config.ease);
  const kicker = formatEntranceKicker(universeConfig);

  return (
    <div
      onClick={skip}
      onTouchStart={skip}
      role="button"
      aria-label="Skip entrance animation"
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        pointerEvents: ACTIVE_PHASES.has(phase) ? 'auto' : 'none',
        cursor: ACTIVE_PHASES.has(phase) ? 'pointer' : 'default',
      }}
    >
      {/* Curtain: warm-dark scrim + backdrop blur. Fading BOTH down together
          over the reveal duration is what makes the real hero underneath
          "fade up into focus" — same mechanism regardless of whether that
          hero is a photo, a video, or a flat colour. */}
      <motion.div
        aria-hidden="true"
        initial={false}
        animate={{ opacity: showCurtain ? 1 : 0 }}
        transition={{ duration: showCurtain ? 0 : Math.max(0.4, (config.totalDuration - config.beats.settle) / 1000) }}
        style={{
          position: 'absolute', inset: 0,
          backgroundColor: theme?.darkBg || '#0A0A0A',
          backdropFilter: showCurtain ? `blur(${CURTAIN_BLUR_PX}px)` : 'blur(0px)',
          WebkitBackdropFilter: showCurtain ? `blur(${CURTAIN_BLUR_PX}px)` : 'blur(0px)',
          transition: `backdrop-filter ${Math.max(0.4, (config.totalDuration - config.beats.settle) / 1000)}s ease`,
        }}
      />

      {/* Content: the small light, kicker/hairline, couple's names — fades
          out faster than the curtain so the names dissolve first, then the
          hero finishes revealing (a layered exit, not everything at once). */}
      <motion.div
        aria-hidden="true"
        initial={false}
        animate={{ opacity: showContent ? 1 : 0 }}
        transition={{ duration: showContent ? 0 : 0.35, ease: 'easeOut' }}
        style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, padding: '0 32px', textAlign: 'center' }}
      >
        {/* Beat 1 — a small light */}
        <motion.div
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{
            position: 'absolute', top: -40, width: 110, height: 110, borderRadius: '50%',
            background: `radial-gradient(circle, ${theme?.accent || '#C4956A'}55 0%, transparent 70%)`,
            filter: 'blur(6px)', pointerEvents: 'none',
          }}
        />

        {/* Optional warm glow pulse behind the names (Marrakech: lantern warmth) */}
        {config.glow && showNames && (
          <motion.div
            aria-hidden="true"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: [0, 0.55, 0.25], scale: [0.5, 1.25, 1.1] }}
            transition={{ duration: 1.1, ease: 'easeOut' }}
            style={{
              position: 'absolute', width: 260, height: 260, borderRadius: '50%',
              background: `radial-gradient(circle, ${theme?.accent || '#B5654A'}66 0%, transparent 72%)`,
              filter: 'blur(10px)', pointerEvents: 'none',
            }}
          />
        )}

        {/* Beat 2 — kicker + hairline */}
        <motion.div
          initial="hidden"
          animate={showKicker ? 'shown' : 'hidden'}
          variants={{ hidden: { opacity: 0, y: 8 }, shown: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } } }}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}
        >
          <p style={{ margin: 0, fontFamily: typography?.bodyFont, fontSize: 12, letterSpacing: '0.22em', textTransform: 'uppercase', color: theme?.lightBg || '#FFFFFF', opacity: 0.75 }}>
            {kicker}
          </p>
          <HairlineRule color={theme?.lightBg || '#FFFFFF'} opacity={0.3} width={40} />
        </motion.div>

        {/* Beat 3 — the couple's names, on-character per universe */}
        <motion.h1
          initial="hidden"
          animate={showNames ? 'shown' : 'hidden'}
          variants={variants}
          style={{
            margin: 0,
            fontFamily: typography?.headingFont,
            fontWeight: typography?.headingWeight || 400,
            fontStyle: typography?.headingStyle || 'normal',
            fontSize: 'clamp(2rem, 7vw, 3.75rem)',
            color: theme?.lightBg || '#FFFFFF',
            lineHeight: 1.15,
          }}
        >
          {weddingDetails?.coupleNames || 'Our wedding'}
        </motion.h1>
      </motion.div>

      {/* Beat 4 — gentle scroll cue, appears only once the reveal is done */}
      <motion.div
        aria-hidden="true"
        initial={{ opacity: 0 }}
        animate={{ opacity: showCue ? [0, 1, 1, 0] : 0 }}
        transition={{ duration: showCue ? CUE_VISIBLE_MS / 1000 : 0.3, times: showCue ? [0, 0.15, 0.75, 1] : undefined, ease: 'easeInOut' }}
        style={{
          position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
          width: 1, height: 28, backgroundColor: theme?.lightBg || '#FFFFFF', opacity: 0.35,
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}
