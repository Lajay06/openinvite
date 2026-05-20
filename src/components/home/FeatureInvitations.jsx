import React, { useState, useEffect, useRef } from 'react';
import ApplePillButton from '@/components/motion/ApplePillButton';

const PJS = "'Plus Jakarta Sans', sans-serif";

const IMAGE_SRC =
  'https://res.cloudinary.com/dsr84xknv/image/upload/v1779185605/DTS_AURA_Fanette_Guilloud_Photos_ID12974_tfs9wg.jpg';

const FEATURES = [
  {
    heading: 'Entire wedding identities',
    description:
      'Not just invitations, complete visual ecosystems. Every Universe includes matching save the dates, seating charts, menus, guest experiences, thank you cards, and more.',
  },
  {
    heading: 'Designed as one seamless system',
    description:
      'Every detail works together beautifully. Fonts, colours, layouts, motion, and styling are carried across every touchpoint for a fully cohesive wedding experience.',
  },
  {
    heading: 'Built for modern weddings',
    description:
      'Digital-first designs made to feel immersive on any device. Elegant mobile invitations, animated interactions, live updates, and guest experiences designed for the way people celebrate today.',
  },
  {
    heading: 'A universe for every style',
    description:
      'From modern minimal to culturally inspired celebrations. Choose from curated Universes influenced by aesthetics, destinations, traditions, and luxury design worlds from around the globe.',
  },
];

function lerp01(val, min, max) {
  return Math.max(0, Math.min(1, (val - min) / (max - min)));
}

export default function FeatureInvitations({ onCTA }) {
  const scrollContainerRef = useRef(null);
  const featuresOuterRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);

  // Scroll progress for the image section
  useEffect(() => {
    let rafId = null;
    const handleScroll = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        const el = scrollContainerRef.current;
        if (el) {
          const rect = el.getBoundingClientRect();
          const scrollRange = el.offsetHeight - window.innerHeight;
          const scrolled = -rect.top;
          setProgress(Math.max(0, Math.min(1, scrolled / scrollRange)));
        }
        const fo = featuresOuterRef.current;
        if (fo) {
          const rect = fo.getBoundingClientRect();
          const p = Math.max(0, -rect.top / (rect.height - window.innerHeight));
          setActiveIndex(Math.min(3, Math.floor(p * 4)));
        }
      });
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  // Derived values
  const overlayOpacity = lerp01(progress, 0.7, 1.0);
  const textOpacity    = 1 - lerp01(progress, 0.6, 0.85);

  return (
    <section style={{ position: 'relative', background: '#0A0A0A' }}>

      {/* ── 300vh scroll driver ── */}
      <div ref={scrollContainerRef} style={{ position: 'relative', height: '250vh' }}>

        {/* Sticky viewport */}
        <div style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'hidden' }}>

          {/* 1. Background image — fills viewport from start */}
          <img
            src={IMAGE_SRC}
            alt="Wedding universe"
            style={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%',
              objectFit: 'cover', display: 'block',
              zIndex: 1,
            }}
          />

          {/* 2. Permanent gradient overlay — keeps text readable */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.6))',
            zIndex: 2,
          }} />

          {/* 3. Black fade overlay — fades in 0–60% of scroll */}
          <div style={{
            position: 'absolute', inset: 0,
            background: '#0A0A0A',
            opacity: overlayOpacity,
            zIndex: 3,
          }} />

          {/* 4. Hero text — fades out in first 40% of scroll */}
          <div style={{
            position: 'absolute',
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            width: '100%',
            padding: '0 40px',
            opacity: textOpacity,
            pointerEvents: textOpacity < 0.05 ? 'none' : 'auto',
            zIndex: 10,
          }}>
            <h2 style={{
              fontSize: 'clamp(80px, 12vw, 160px)',
              fontWeight: 700,
              letterSpacing: '-0.03em',
              fontFamily: PJS,
              margin: '0 0 24px',
              background: 'linear-gradient(135deg, #E03553, #803D81)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              Universes
            </h2>
            <p style={{
              color: '#FFFFFF',
              fontSize: 'clamp(16px, 2vw, 20px)',
              fontWeight: 400,
              fontFamily: PJS,
              maxWidth: 600,
              margin: '0 auto',
              lineHeight: 1.6,
            }}>
              Choose your aesthetic universe. Every invitation, asset and piece of design follows a single visual vision — from your Save the Date to your Thank You Notes. 9 universes, 10 pieces each.
            </p>
          </div>

        </div>
      </div>

      {/* ── Features — scroll-driven sticky highlight ── */}
      <div ref={featuresOuterRef} style={{ height: 'calc(4 * 200px + 100vh)', background: '#0A0A0A' }}>
        <div style={{ position: 'sticky', top: 0, height: '100vh', display: 'flex', alignItems: 'center' }}>
          <div style={{ width: '100%', padding: '0 clamp(24px, 6vw, 80px)' }}>
            {FEATURES.map((f, i) => {
              const active = i === activeIndex;
              return (
                <div
                  key={i}
                  style={{
                    borderTop: '1px solid rgba(255,255,255,0.08)',
                    padding: '40px 0',
                    display: 'grid',
                    gridTemplateColumns: '40% 60%',
                    gap: 40,
                    alignItems: 'start',
                  }}
                >
                  <h3 style={{
                    fontSize: 'clamp(24px, 3vw, 36px)',
                    fontWeight: 600,
                    color: active ? '#FFFFFF' : 'rgba(255,255,255,0.12)',
                    fontFamily: PJS,
                    margin: 0,
                    lineHeight: 1.2,
                    transition: 'color 0.5s ease',
                  }}>
                    {f.heading}
                  </h3>
                  <p style={{
                    fontSize: 16,
                    color: active ? '#AAAAAA' : 'rgba(255,255,255,0.08)',
                    lineHeight: 1.8,
                    fontFamily: PJS,
                    margin: 0,
                    transition: 'color 0.5s ease',
                  }}>
                    {f.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── CTA after sticky unpins ── */}
      <div style={{ background: '#0A0A0A', padding: '80px clamp(24px, 6vw, 80px)', display: 'flex', justifyContent: 'center' }}>
        <ApplePillButton onClick={onCTA}>Get started</ApplePillButton>
      </div>

    </section>
  );
}
