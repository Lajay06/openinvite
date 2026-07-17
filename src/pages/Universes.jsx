import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import PublicNav from '@/components/public/PublicNav';
import PublicFooter from '@/components/public/PublicFooter';
import ScrollCue from '@/components/motion/ScrollCue';
import { UNIVERSE_CATALOG } from '@/lib/universeCatalog';

// Aman is the one universe with no dedicated /universes/*.jpg photography
// yet (UNIVERSE_CONFIGS' aman.imageUrl is null — quiet-luxury identity, no
// real photography shot for it as of this overhaul). Falls back to a
// Cloudinary photo whose own mood ("Quiet Glamour") matches the universe's
// actual tone, rather than leaving a tile with no image at all.
const FALLBACK_IMAGE = {
  aman: 'https://res.cloudinary.com/dsr84xknv/image/upload/f_auto,q_auto/v1784100474/DTS_Quiet_Glamour_DTS_Studio_Photos_ID8355_zhr0xb.jpg',
};

const PJS = 'Plus Jakarta Sans, sans-serif';

function UniverseTile({ universe, index, onExplore }) {
  const [hovered, setHovered] = useState(false);
  const image = universe.imageUrl || FALLBACK_IMAGE[universe.id];
  const swatches = [
    { color: universe.colors.darkBg, label: 'Ground' },
    { color: universe.colors.lightBg, label: 'Paper' },
    { color: universe.colors.accent, label: 'Accent' },
    { color: universe.colors.accentSecondary, label: 'Secondary' },
  ].filter(s => !!s.color);

  return (
    <article
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative', aspectRatio: '3 / 4', overflow: 'hidden', cursor: 'pointer',
      }}
    >
      <img
        src={image}
        alt={`The ${universe.name} universe: ${universe.tagline || 'a full wedding aesthetic'}`}
        loading={index < 4 ? 'eager' : 'lazy'}
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
          transform: hovered ? 'scale(1.04)' : 'scale(1)', transition: 'transform 0.6s cubic-bezier(0.16,1,0.3,1)',
        }}
      />
      <div style={{
        position: 'absolute', inset: 0,
        background: hovered
          ? 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.55) 55%, rgba(0,0,0,0.15) 100%)'
          : 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.15) 60%, rgba(0,0,0,0) 100%)',
        transition: 'background 0.4s ease',
      }} />

      {universe.isUltra && (
        <span style={{
          position: 'absolute', top: 20, right: 20, zIndex: 2,
          fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#0A0A0A',
          background: '#DDF762', borderRadius: 999, padding: '4px 10px', fontFamily: PJS,
        }}>
          Ultra
        </span>
      )}

      <div style={{ position: 'absolute', inset: 0, zIndex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: 24 }}>
        <p style={{ fontSize: 11, fontStyle: 'italic', color: 'rgba(255,255,255,0.6)', margin: '0 0 6px', fontFamily: PJS }}>
          {universe.tagline}
        </p>
        <h3 style={{ fontSize: 'clamp(24px, 2.4vw, 32px)', fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.01em', margin: '0 0 10px', lineHeight: 1.05 }}>
          {universe.name}
        </h3>

        <p style={{
          fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.55, margin: '0 0 16px', maxWidth: 320,
          maxHeight: hovered ? 120 : 0, opacity: hovered ? 1 : 0, overflow: 'hidden',
          transition: 'max-height 0.35s ease, opacity 0.3s ease',
        }}>
          {universe.worldStory}
        </p>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {swatches.map((s, i) => (
              <span key={i} title={s.label} style={{ width: 16, height: 16, background: s.color, border: s.color === '#FFFFFF' ? '1px solid rgba(255,255,255,0.3)' : 'none', flexShrink: 0 }} />
            ))}
          </div>
          <button
            type="button"
            onClick={onExplore}
            style={{
              background: 'none', border: 'none', padding: 0, color: '#FFFFFF', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', fontFamily: PJS, letterSpacing: '0.02em',
              opacity: hovered ? 1 : 0.7, transition: 'opacity 0.2s ease',
            }}
          >
            Explore &rarr;
          </button>
        </div>
      </div>
    </article>
  );
}

const Universes = () => {
  const navigate = useNavigate();
  const [scrollAnimations, setScrollAnimations] = useState({});
  const observerRef = useRef(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver((entries) => {
      const newAnimations = { ...scrollAnimations };
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          newAnimations[entry.target.id] = true;
        }
      });
      setScrollAnimations(newAnimations);
    }, { threshold: 0.2 });

    document.querySelectorAll('[data-animate]').forEach(el => {
      observerRef.current.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, []);

  // SEO — this SPA has no per-route meta tags beyond the static index.html,
  // so this is the same lightweight document.title pattern already used on
  // ScrollMorph.jsx, extended to the description meta tag too. Restores the
  // sitewide defaults on unmount so navigating away doesn't leave this
  // page's tags behind.
  useEffect(() => {
    const prevTitle = document.title;
    document.title = 'Universes: 20 aesthetic worlds for your wedding | Openinvite';
    const meta = document.querySelector('meta[name="description"]');
    const prevDescription = meta?.getAttribute('content') ?? null;
    if (meta) {
      meta.setAttribute('content', 'Explore all 20 Openinvite universes, a complete visual system for your wedding, from Aman to Shanghai. Every invitation, website and printed piece follows one aesthetic vision.');
    }
    return () => {
      document.title = prevTitle;
      if (meta && prevDescription !== null) meta.setAttribute('content', prevDescription);
    };
  }, []);

  const scrollToAssets = () => {
    document.getElementById('assets-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  const assets = [
    { name: 'Save the Date', description: 'Your first announcement. Set the tone before anything else.' },
    { name: 'Digital Invitation', description: 'The full invitation suite, linking directly to your wedding website.' },
    { name: 'RSVP Page', description: 'A styled response experience connected to your guest list.' },
    { name: 'Menu Card', description: 'Typeset dinner menus for each table or place setting.' },
    { name: 'Seating Chart', description: 'Live from your guest list. Always accurate.' },
    { name: 'Motion Graphic', description: 'An animated digital asset for screens and social.' },
    { name: 'Instagram Story Kit', description: 'Five story formats sized and ready to share.' },
    { name: 'Welcome Signage', description: 'Large format print-ready signage for your venue entrance.' },
    { name: 'Guest Tags', description: 'Name tags, six per A4 sheet. Print and cut.' },
    { name: 'Thank You Notes', description: 'Personalised post-wedding cards, ready to send.' },
  ];

  const editorFeatures = [
    {
      number: '01',
      title: 'Live preview',
      body: 'See every change as you make it. The asset editor updates in real time, so what you see is exactly what your guests receive.',
    },
    {
      number: '02',
      title: 'Your details, everywhere',
      body: 'Set your names, date and venue once in your planner. They flow through all 10 assets automatically. Change one thing, everything updates.',
    },
    {
      number: '03',
      title: 'Download and share',
      body: 'Export any asset as a print-ready PDF or high-resolution PNG. Share digitally or hand to your printer.',
    },
  ];

  const animationClass = (id) => scrollAnimations[id] ? 'anim-visible' : 'anim-fade-up';

  return (
    <div style={{ background: '#FFFFFF' }}>
      <PublicNav />

      {/* SECTION 1: HERO */}
      <section style={{ position: 'relative', height: '100vh', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <img
          src="https://res.cloudinary.com/dsr84xknv/image/upload/v1779218326/DTS_In_Focus_Daniel_Far%C3%B2_Photos_ID5015_deiknt.jpg"
          alt=""
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', zIndex: 1 }}
        />
        <div style={{ position: 'relative', zIndex: 10, textAlign: 'center', maxWidth: 800, margin: '0 auto', padding: '0 40px' }}>
          <h1 style={{
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            fontWeight: 700,
            fontSize: 'clamp(48px, 8vw, 96px)',
            color: '#FFFFFF',
            letterSpacing: '-0.02em',
            lineHeight: 1.05,
            margin: '0 0 24px',
          }}>
            Your universe
          </h1>
          <p style={{
            fontSize: 'clamp(16px,2vw,22px)',
            fontWeight: 400,
            color: 'rgba(255,255,255,0.75)',
            maxWidth: 560,
            margin: '0 auto',
            lineHeight: 1.6,
            fontFamily: 'Plus Jakarta Sans',
          }}>
            Every invitation, menu, seating chart and digital asset, designed around a single aesthetic vision. Choose your universe and everything follows.
          </p>
        </div>
        <ScrollCue />
      </section>

      {/* SECTION 2: THE CONCEPT */}
      <section style={{
        background: '#F5F5F3',
        padding: '128px clamp(24px, 8vw, 120px)',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <p style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 12,
            fontWeight: 600,
            color: 'rgba(10,10,10,0.4)',
            letterSpacing: '0.15em',
            marginBottom: 24,
          }}>
            The concept
          </p>
          <h2 style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 800,
            fontSize: 'clamp(36px, 6vw, 60px)',
            color: '#0A0A0A',
            letterSpacing: '-0.02em',
            lineHeight: 1.05,
            marginBottom: 32,
          }}>
            One aesthetic. Every piece.
          </h2>
          <div style={{ maxWidth: 672 }}>
            <p style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: 18,
              color: '#555555',
              lineHeight: 1.7,
              marginBottom: 20,
            }}>
              A universe is a complete visual system for your wedding. The moment you choose one, it defines the typography, colour palette, layout logic and mood across all 10 pieces in your Guest Suite, from your Save the Date to your Thank You Notes.
            </p>
            <p style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: 18,
              color: '#555555',
              lineHeight: 1.7,
              marginBottom: 32,
            }}>
              Each universe is designed around a place, a feeling, a way of seeing. Not a template. A perspective.
            </p>
          </div>
          <div style={{ width: 48, height: 2, background: '#E03553' }} />
        </div>
      </section>

      {/* SECTION 3: THE 10 ASSETS */}
      <section id="assets-section" data-animate style={{
        background: '#0A0A0A',
        padding: '100px 80px',
      }}>
        <p style={{
          fontSize: 10,
          fontWeight: 600,
          color: 'rgba(255,255,255,0.4)',
          letterSpacing: '0.25em',
          marginBottom: 16,
          fontFamily: 'Plus Jakarta Sans',
        }}>
          Your guest suite
        </p>
        <h2 style={{
          fontFamily: 'Plus Jakarta Sans, sans-serif',
          fontWeight: 700,
          fontSize: 'clamp(32px, 5vw, 56px)',
          color: '#FFFFFF',
          letterSpacing: '-0.01em',
          margin: '0 0 12px',
        }}>
          10 pieces. One vision.
        </h2>
        <p style={{
          fontSize: 14,
          fontWeight: 400,
          color: 'rgba(255,255,255,0.6)',
          marginBottom: 60,
          maxWidth: 600,
          fontFamily: 'Plus Jakarta Sans',
        }}>
          Every universe includes all 10 pieces, personalised with your names, date and venue. Edit each one in the asset editor or let Ava fill them for you.
        </p>

        <style>{`
          .assets-grid { grid-template-columns: repeat(2, 1fr); }
          @media (min-width: 640px) { .assets-grid { grid-template-columns: repeat(3, 1fr); } }
          @media (min-width: 900px) { .assets-grid { grid-template-columns: repeat(5, 1fr); } }
        `}</style>
        <div className="assets-grid" style={{
          display: 'grid',
          gap: '1px',
          background: 'rgba(255,255,255,0.06)',
          padding: '1px',
        }}>
          {assets.map((asset, i) => (
            <div key={i} style={{
              background: '#0A0A0A',
              padding: '32px 24px',
              position: 'relative',
              overflow: 'hidden',
              transition: 'background 0.3s ease',
              cursor: 'default',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
              onMouseLeave={e => e.currentTarget.style.background = '#0A0A0A'}
            >
              <p style={{
                fontSize: 10,
                fontWeight: 600,
                color: 'rgba(255,255,255,0.25)',
                letterSpacing: '0.2em',
                marginBottom: 16,
                margin: 0,
                fontFamily: 'Plus Jakarta Sans',
              }}>
                0{i + 1}
              </p>
              <p style={{
                fontSize: 15,
                fontWeight: 600,
                color: '#FFFFFF',
                marginBottom: 8,
                margin: '12px 0 8px',
                fontFamily: 'Plus Jakarta Sans',
              }}>
                {asset.name}
              </p>
              <p style={{
                fontSize: 13,
                color: 'rgba(255,255,255,0.45)',
                lineHeight: 1.5,
                fontFamily: 'Plus Jakarta Sans',
                margin: 0,
              }}>
                {asset.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 4: UNIVERSE SHOWCASE — all 20 worlds, one editorial grid.
          Previously a sticky-pinned crossfade built for 5 hardcoded
          universes (scaling it to 20 would mean ~2400vh of scroll just to
          reach the last one). A grid scales to any count — a 21st universe
          added to UNIVERSE_CONFIGS just adds one more tile — and every
          tile's full text renders unconditionally, so it's crawlable
          without needing JS scroll state to reveal it (the old version
          only ever put the ACTIVE universe's description in the DOM). */}
      <section style={{ background: '#0A0A0A', padding: '100px clamp(24px, 6vw, 80px) 120px' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.15em', marginBottom: 16, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            {UNIVERSE_CATALOG.length} worlds
          </p>
          <h2 style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: 'clamp(36px, 6vw, 64px)', color: '#FFFFFF', letterSpacing: '-0.02em', lineHeight: 1.05, margin: '0 0 60px', maxWidth: 800 }}>
            Every one of them, real.
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 3 }}>
            {UNIVERSE_CATALOG.map((u, i) => (
              <UniverseTile key={u.id} universe={u} index={i} onExplore={() => navigate('/studio/universe')} />
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 6: EDITOR EXPERIENCE */}
      <section data-animate style={{
        background: '#0A0A0A',
        padding: '100px 80px',
      }}>
        <p style={{
          fontSize: 10,
          fontWeight: 600,
          color: 'rgba(255,255,255,0.4)',
          letterSpacing: '0.25em',
          marginBottom: 16,
          fontFamily: 'Plus Jakarta Sans',
        }}>
          The editor
        </p>
        <h2 style={{
          fontFamily: 'Plus Jakarta Sans, sans-serif',
          fontWeight: 700,
          fontSize: 'clamp(32px, 5vw, 56px)',
          color: '#FFFFFF',
          letterSpacing: '-0.01em',
          margin: '0 0 60px',
        }}>
          Every detail in your hands.
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 60 }}>
          {editorFeatures.map((feature, i) => (
            <div key={i} style={{ flex: 1 }}>
              <p style={{
                fontSize: 11,
                fontWeight: 600,
                color: 'rgba(255,255,255,0.3)',
                letterSpacing: '0.2em',
                marginBottom: 20,
                fontFamily: 'Plus Jakarta Sans',
                margin: 0,
              }}>
                {feature.number}
              </p>
              <div style={{
                width: 32,
                height: 1,
                background: 'rgba(255,255,255,0.15)',
                marginBottom: 24,
              }} />
              <h3 style={{
                fontSize: 18,
                fontWeight: 600,
                color: '#FFFFFF',
                marginBottom: 16,
                fontFamily: 'Plus Jakarta Sans',
                margin: '0 0 16px',
              }}>
                {feature.title}
              </h3>
              <p style={{
                fontSize: 14,
                color: 'rgba(255,255,255,0.6)',
                lineHeight: 1.7,
                fontFamily: 'Plus Jakarta Sans',
                margin: 0,
              }}>
                {feature.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 7: AVA IN THE STUDIO */}
      <section data-animate style={{
        background: '#F5F5F3',
        padding: '100px 80px',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 60,
        alignItems: 'center',
      }}>
        <div>
          <p style={{
            fontSize: 10,
            fontWeight: 600,
            color: '#555555',
            letterSpacing: '0.2em',
            marginBottom: 20,
            fontFamily: 'Plus Jakarta Sans',
          }}>
            Ava's studio
          </p>
          <h2 style={{
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            fontWeight: 700,
            fontSize: 'clamp(32px, 5vw, 56px)',
            color: '#0A0A0A',
            letterSpacing: '-0.01em',
            marginBottom: 32,
          }}>
            Let Ava build it for you.
          </h2>
          <p style={{
            fontSize: 14,
            fontWeight: 400,
            color: '#444444',
            lineHeight: 1.7,
            marginBottom: 32,
            fontFamily: 'Plus Jakarta Sans',
          }}>
            Ava's Studio guides you through every asset, one at a time. Add a photo, confirm your details, and Ava fills in the rest. Each piece is ready to download in minutes.
          </p>

          <div>
            {[
              'One question at a time. No overwhelm.',
              'Ava writes descriptions and fills in your details.',
              'Live preview updates as you go.',
            ].map((item, i) => (
              <div key={i} style={{
                padding: '14px 0',
                borderBottom: '1px solid #E8E8E5',
                fontSize: 14,
                color: '#444444',
                fontFamily: 'Plus Jakarta Sans',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}>
                <span style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: '#E03553',
                  letterSpacing: '0.1em',
                  fontFamily: 'Plus Jakarta Sans',
                }}>
                  0{i + 1}
                </span>
                {item}
              </div>
            ))}
          </div>

          <button onClick={() => navigate('/ava')} style={{
            marginTop: 32,
            padding: '14px 40px',
            background: 'linear-gradient(135deg, #E03553, #803D81)',
            color: '#FFFFFF',
            border: 'none',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'Plus Jakarta Sans',
            letterSpacing: '0.02em',
          }}>
            Try Ava's Studio →
          </button>
        </div>

        <div style={{
          background: '#0A0A0A',
          padding: 40,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #E03553, #803D81)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            fontSize: 20,
            marginBottom: 16,
          }}>
            ✦
          </div>
          <p style={{
            fontSize: 14,
            fontWeight: 600,
            color: '#FFFFFF',
            margin: '0 0 4px',
            fontFamily: 'Plus Jakarta Sans',
          }}>
            Ava
          </p>
          <p style={{
            fontSize: 12,
            color: 'rgba(255,255,255,0.5)',
            margin: '0 0 20px',
            fontFamily: 'Plus Jakarta Sans',
          }}>
            Your personal wedding specialist
          </p>
          <div style={{
            background: 'rgba(255,255,255,0.07)',
            padding: 12,
            borderRadius: '12px 12px 12px 4px',
            marginBottom: 12,
          }}>
            <p style={{
              fontSize: 13,
              color: 'rgba(255,255,255,0.7)',
              fontStyle: 'italic',
              margin: 0,
              fontFamily: 'Plus Jakarta Sans',
            }}>
              Which universe have you chosen?
            </p>
          </div>
          <div style={{
            background: 'linear-gradient(135deg, #E03553, #803D81)',
            padding: 12,
            borderRadius: '12px 12px 4px 12px',
            alignSelf: 'flex-end',
            maxWidth: '80%',
          }}>
            <p style={{
              fontSize: 13,
              color: '#FFFFFF',
              margin: 0,
              fontFamily: 'Plus Jakarta Sans',
            }}>
              Let's start with your Save the Date. Add a photo of you both.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 8: FINAL CTA */}
      <section style={{
        background: '#0A0A0A',
        padding: '160px 80px',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <p style={{
            fontSize: 10,
            fontWeight: 600,
            color: 'rgba(255,255,255,0.3)',
            letterSpacing: '0.3em',
            marginBottom: 24,
            fontFamily: 'Plus Jakarta Sans',
          }}>
            Start today
          </p>
          <h2 style={{
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            fontWeight: 700,
            fontSize: 'clamp(40px, 7vw, 80px)',
            color: '#FFFFFF',
            letterSpacing: '-0.02em',
            lineHeight: 1,
            margin: '0 0 24px',
          }}>
            Choose your universe.
          </h2>
          <p style={{
            fontSize: 16,
            color: 'rgba(255,255,255,0.5)',
            marginBottom: 48,
            lineHeight: 1.6,
            fontFamily: 'Plus Jakarta Sans',
          }}>
            Your complete wedding design suite, ready in minutes.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => navigate('/login')} style={{
              padding: '16px 40px',
              background: 'linear-gradient(135deg, #E03553, #803D81)',
              color: '#FFFFFF',
              textDecoration: 'none',
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: '0.02em',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'Plus Jakarta Sans',
            }}>
              Get started
            </button>
            <button onClick={() => navigate('/Features')} style={{
              padding: '16px 40px',
              border: '1px solid rgba(255,255,255,0.25)',
              background: 'transparent',
              color: 'rgba(255,255,255,0.7)',
              textDecoration: 'none',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'Plus Jakarta Sans',
            }}>
              See all features
            </button>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
};

export default Universes;
