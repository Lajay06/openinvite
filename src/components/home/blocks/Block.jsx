/**
 * Block.jsx — the single building block of the redesigned Home page below
 * the hero. Four flavours: photo (full-bleed Cloudinary image + overlay),
 * black (#0A0A0A), white (#FFFFFF), red (#E03553, used at most once page-wide).
 *
 * Exactly two motion effects live here, nothing else:
 *   1. Fade-up reveal on the block's content as it enters the viewport
 *      (opacity 0→1, translateY 16px→0, ~500ms ease-out), staggered per
 *      block via a small index-based delay.
 *   2. Parallax on the photo block's background image only — a small,
 *      transform-based vertical displacement tied to scroll position via
 *      requestAnimationFrame (no layout thrashing). Off on touch devices
 *      (no meaningful scroll-linked pointer to react to, and it's the
 *      leading cause of scroll jank on mobile) and whenever
 *      prefers-reduced-motion is set.
 */
import React, { useEffect, useRef, useState } from 'react';

const PJS = "'Plus Jakarta Sans', sans-serif";
const EASE = 'cubic-bezier(0.16,1,0.3,1)';

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function isTouchDevice() {
  return typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
}

const PALETTE = {
  black: { bg: '#0A0A0A', text: '#FFFFFF', muted: 'rgba(255,255,255,0.7)', hairline: 'rgba(255,255,255,0.12)' },
  white: { bg: '#FFFFFF', text: '#0A0A0A', muted: 'rgba(10,10,10,0.6)', hairline: 'rgba(10,10,10,0.1)' },
  red:   { bg: '#E03553', text: '#FFFFFF', muted: 'rgba(255,255,255,0.85)', hairline: 'rgba(255,255,255,0.25)' },
  photo: { bg: '#0A0A0A', text: '#FFFFFF', muted: 'rgba(255,255,255,0.8)', hairline: 'rgba(255,255,255,0.2)' },
};

/**
 * @param {object} props
 * @param {'photo'|'black'|'white'|'red'} props.type
 * @param {string} [props.image] — Cloudinary base URL (no transform params), required for type="photo"
 * @param {string} [props.imageAlt]
 * @param {string} [props.kicker] — small label above the headline
 * @param {string} [props.headline] — frozen copy, rendered byte-identical (omit when children carries the block's only heading, e.g. a feature-row grid)
 * @param {string} [props.copy] — frozen supporting copy
 * @param {'left'|'center'} [props.align='left']
 * @param {number} [props.staggerIndex=0] — reveal delay multiplier
 * @param {React.ReactNode} [props.children] — extra content (bullets, grids, CTAs)
 */
export default function Block({
  type, image, imageAlt = '', kicker, headline, copy, align = 'left', staggerIndex = 0, children,
}) {
  const sectionRef = useRef(null);
  const imgRef = useRef(null);
  const [visible, setVisible] = useState(false);
  const reduced = prefersReducedMotion();
  const touch = isTouchDevice();
  const palette = PALETTE[type] || PALETTE.white;

  // Effect 1: fade-up reveal, staggered
  useEffect(() => {
    if (reduced) { setVisible(true); return; }
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [reduced]);

  // Effect 2: parallax on the photo background only
  useEffect(() => {
    if (type !== 'photo' || reduced || touch) return;
    const section = sectionRef.current;
    const img = imgRef.current;
    if (!section || !img) return;
    let rafId = null;
    const update = () => {
      rafId = null;
      const rect = section.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      // Progress -1 (above viewport) → 1 (below viewport), 0 when centred
      const progress = Math.max(-1, Math.min(1, (rect.top + rect.height / 2 - vh / 2) / vh));
      const shift = progress * 24; // small displacement — max 24px, no scroll-jank
      img.style.transform = `translate3d(0, ${shift}px, 0) scale(1.08)`;
    };
    const onScroll = () => { if (!rafId) rafId = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [type, reduced, touch]);

  const revealStyle = (extraDelayMs = 0) => ({
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : 'translateY(16px)',
    transition: reduced ? 'none' : `opacity 0.5s ${EASE} ${staggerIndex * 60 + extraDelayMs}ms, transform 0.5s ${EASE} ${staggerIndex * 60 + extraDelayMs}ms`,
  });

  return (
    <section
      ref={sectionRef}
      style={{
        position: 'relative',
        background: palette.bg,
        overflow: 'hidden',
        padding: type === 'photo'
          ? 'clamp(96px, 16vw, 220px) clamp(24px, 6vw, 80px)'
          : 'clamp(64px, 12vw, 140px) clamp(24px, 6vw, 80px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: align === 'center' ? 'center' : 'flex-start',
        minHeight: type === 'photo' ? '70vh' : undefined,
      }}
    >
      {type === 'photo' && image && (
        <>
          <img
            ref={imgRef}
            src={image}
            alt={imageAlt}
            style={{
              position: 'absolute', inset: '-30px', width: 'calc(100% + 60px)', height: 'calc(100% + 60px)',
              objectFit: 'cover', display: 'block', zIndex: 0,
              willChange: reduced || touch ? 'auto' : 'transform',
            }}
          />
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,10,10,0.5)', zIndex: 1 }} />
        </>
      )}

      <div style={{
        position: 'relative', zIndex: 2, maxWidth: 860, width: '100%',
        textAlign: align === 'center' ? 'center' : 'left',
        margin: align === 'center' ? '0 auto' : undefined,
      }}>
        {kicker && (
          <p style={{
            ...revealStyle(0),
            fontFamily: PJS, fontSize: 13, fontWeight: 700, letterSpacing: '0.14em',
            textTransform: 'uppercase', color: type === 'photo' ? '#FFFFFF' : palette.text,
            opacity: visible ? (type === 'red' ? 0.9 : 0.6) : 0,
            margin: '0 0 16px',
          }}>
            {kicker}
          </p>
        )}
        {headline && (
          <h2 style={{
            ...revealStyle(60),
            fontFamily: PJS, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1,
            fontSize: 'clamp(28px, 5vw, 56px)', color: palette.text,
            margin: copy || children ? '0 0 20px' : 0,
          }}>
            {headline}
          </h2>
        )}
        {copy && (
          <p style={{
            ...revealStyle(120),
            fontFamily: PJS, fontSize: 'clamp(16px, 1.6vw, 18px)', fontWeight: 600,
            lineHeight: 1.7, color: palette.muted, maxWidth: 640,
            margin: children ? '0 0 32px' : 0,
          }}>
            {copy}
          </p>
        )}
        {children && (
          <div style={revealStyle(180)}>
            {children}
          </div>
        )}
      </div>
    </section>
  );
}

export { PALETTE };
