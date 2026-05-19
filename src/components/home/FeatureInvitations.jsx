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
  const [progress, setProgress] = useState(0);
  const [vp, setVp] = useState({ w: 1440, h: 900 });

  // Track viewport size
  useEffect(() => {
    const update = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener('resize', update, { passive: true });
    return () => window.removeEventListener('resize', update);
  }, []);

  // Track scroll progress through the 300vh scroll container
  useEffect(() => {
    let rafId = null;

    const handleScroll = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        const el = scrollContainerRef.current;
        if (!el) return;
        const sectionTop = el.offsetTop;
        // Effective scroll range = container height - viewport height = 300vh - 100vh = 200vh
        const scrollRange = el.offsetHeight - window.innerHeight;
        const scrolled = window.scrollY - sectionTop;
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

  // Animation values
  const expandProg  = lerp01(progress, 0, 0.4);    // 0–40%: expand & text fade
  const textOpacity = 1 - lerp01(progress, 0, 0.4); // text fades as image expands
  const imgOpacity  = 1 - lerp01(progress, 0.7, 1); // 70–100%: image fades out

  const imgW      = 320 + (vp.w - 320) * expandProg;
  const imgH      = 200 + (vp.h - 200) * expandProg;
  const imgRadius = 24 * (1 - expandProg);

  return (
    <section style={{ position: 'relative', background: '#0A0A0A', overflow: 'hidden' }}>

      {/* ── 300vh scroll driver ── */}
      <div ref={scrollContainerRef} style={{ position: 'relative', height: '300vh' }}>

        {/* Sticky viewport — pins for the 200vh scroll range */}
        <div style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'hidden' }}>

          {/* Hero text */}
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
              color: '#AAAAAA',
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

          {/* Expanding image */}
          <div style={{
            position: 'absolute',
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: imgW,
            height: imgH,
            borderRadius: imgRadius,
            overflow: 'hidden',
            opacity: imgOpacity,
            zIndex: 5,
          }}>
            <img
              src={IMAGE_SRC}
              alt="Wedding universe"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.7))',
            }} />
          </div>

        </div>
      </div>

      {/* ── Features — revealed after sticky section unpins ── */}
      <div style={{ background: '#0A0A0A', padding: '120px clamp(24px, 6vw, 80px)' }}>
        {FEATURES.map((f, i) => (
          <div key={i} style={{
            borderTop: '1px solid rgba(255,255,255,0.1)',
            padding: '48px 0',
            display: 'grid',
            gridTemplateColumns: '40% 60%',
            gap: 40,
            alignItems: 'start',
          }}>
            <h3 style={{
              fontSize: 'clamp(24px, 3vw, 36px)',
              fontWeight: 600,
              color: '#FFFFFF',
              fontFamily: PJS,
              margin: 0,
              lineHeight: 1.2,
            }}>
              {f.heading}
            </h3>
            <p style={{
              fontSize: 16,
              color: '#AAAAAA',
              lineHeight: 1.8,
              fontFamily: PJS,
              margin: 0,
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
