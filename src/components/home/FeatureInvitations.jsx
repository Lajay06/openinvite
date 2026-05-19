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
  const rowRefs = useRef([]);
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(FEATURES.map(() => false));

  // Scroll progress via getBoundingClientRect
  useEffect(() => {
    let rafId = null;
    const handleScroll = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        const el = scrollContainerRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const scrollRange = el.offsetHeight - window.innerHeight;
        const scrolled = -rect.top;
        setProgress(Math.max(0, Math.min(1, scrolled / scrollRange)));
      });
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  // IntersectionObserver for feature row colour reveal
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        setVisible((prev) => {
          const next = [...prev];
          entries.forEach((entry) => {
            const idx = rowRefs.current.indexOf(entry.target);
            if (idx !== -1) next[idx] = entry.isIntersecting;
          });
          return next;
        });
      },
      { threshold: 0.3 }
    );
    rowRefs.current.forEach((el) => { if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, []);

  // Derived values
  const overlayOpacity = lerp01(progress, 0, 0.6);          // black fade: 0→1 over first 60%
  const textOpacity    = 1 - lerp01(progress, 0, 0.4);      // text out: 1→0 over first 40%

  return (
    <section style={{ position: 'relative', background: '#0A0A0A' }}>

      {/* ── 300vh scroll driver ── */}
      <div ref={scrollContainerRef} style={{ position: 'relative', height: '300vh' }}>

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

      {/* ── Features — revealed after sticky unpins ── */}
      <div style={{ background: '#0A0A0A', padding: '120px clamp(24px, 6vw, 80px)' }}>
        {FEATURES.map((f, i) => (
          <div
            key={i}
            ref={(el) => { rowRefs.current[i] = el; }}
            style={{
              borderTop: '1px solid rgba(255,255,255,0.1)',
              padding: '48px 0',
              display: 'grid',
              gridTemplateColumns: '40% 60%',
              gap: 40,
              alignItems: 'start',
            }}
          >
            <h3 style={{
              fontSize: 'clamp(24px, 3vw, 36px)',
              fontWeight: 600,
              color: visible[i] ? '#FFFFFF' : 'rgba(255,255,255,0.15)',
              fontFamily: PJS,
              margin: 0,
              lineHeight: 1.2,
              transition: 'color 0.6s cubic-bezier(0.16,1,0.3,1)',
            }}>
              {f.heading}
            </h3>
            <p style={{
              fontSize: 16,
              color: visible[i] ? '#AAAAAA' : 'rgba(255,255,255,0.1)',
              lineHeight: 1.8,
              fontFamily: PJS,
              margin: 0,
              transition: 'color 0.6s cubic-bezier(0.16,1,0.3,1)',
            }}>
              {f.description}
            </p>
          </div>
        ))}

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 48 }}>
          <ApplePillButton onClick={onCTA}>Get started</ApplePillButton>
        </div>
      </div>

    </section>
  );
}
