import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import PublicNav from '@/components/public/PublicNav';
import PublicFooter from '@/components/public/PublicFooter';

const Universes = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
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

  const comingSoon = [
    { name: 'TULUM', tagline: 'Desert Bloom', description: 'Sun-bleached romance. Warm earth tones and organic texture.' },
    { name: 'KYOTO', tagline: 'Zen and Ceremony', description: 'Ancient ritual meets modern refinement. Stillness as a design principle.' },
    { name: 'CAPRI', tagline: 'Italian Coast', description: 'La dolce vita. Deep blues, warm stone and effortless elegance.' },
    { name: 'MARRAKECH', tagline: 'Spice and Gold', description: 'Rich pattern, warm light and cultural depth.' },
    { name: 'BROOKLYN', tagline: 'Industrial Edge', description: 'Raw and considered. Dark type, exposed texture, confident simplicity.' },
    { name: 'BALI', tagline: 'Sacred Garden', description: 'Lush, spiritual and unhurried. Nature as the backdrop.' },
    { name: 'PARIS', tagline: 'Haussmann Romance', description: 'Grand and timeless. The language of French elegance.' },
    { name: 'CAPE TOWN', tagline: 'Wild and Open', description: 'Mountain meets ocean. Bold, alive and beautifully untamed.' },
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
      <section style={{
        minHeight: '100vh',
        background: '#0A0A0A',
        backgroundImage: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(128,61,129,0.12) 0%, transparent 65%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '120px 40px',
        marginTop: 64,
        position: 'relative',
      }}>
        <div style={{ textAlign: 'center', maxWidth: 700 }}>
          <p style={{
            fontSize: 10,
            fontWeight: 600,
            color: 'rgba(255,255,255,0.4)',
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            marginBottom: 24,
            fontFamily: 'Plus Jakarta Sans',
          }}>
            Guest Suite · 9 Universes · 10 Pieces Each
          </p>
          <h1 style={{
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            fontWeight: 700,
            fontSize: 'clamp(48px, 8vw, 96px)',
            color: '#FFFFFF',
            letterSpacing: '-0.02em',
            lineHeight: 1.05,
            margin: '0 0 24px',
          }}>
            Your Universe.
          </h1>
          <p style={{
            fontSize: 'clamp(16px,2vw,22px)',
            fontWeight: 400,
            color: 'rgba(255,255,255,0.6)',
            maxWidth: 560,
            margin: '0 auto 40px',
            lineHeight: 1.6,
            textAlign: 'center',
            fontFamily: 'Plus Jakarta Sans',
          }}>
            Every invitation, menu, seating chart and digital asset — designed around a single aesthetic vision. Choose your universe and everything follows.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => navigate('/studio')} style={{
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
              Explore universes →
            </button>
            <button onClick={scrollToAssets} style={{
              padding: '14px 40px',
              background: 'transparent',
              color: '#FFFFFF',
              border: '1px solid rgba(255,255,255,0.3)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'Plus Jakarta Sans',
              letterSpacing: '0.02em',
            }}>
              See the assets
            </button>
          </div>
        </div>

        {/* Scroll indicator */}
        <div style={{
          position: 'absolute',
          bottom: 40,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 1,
          height: 40,
          background: 'rgba(255,255,255,0.2)',
          animation: 'scrollCue 2s ease-in-out infinite',
        }} />
      </section>

      {/* SECTION 2: WHAT IS A UNIVERSE */}
      <section id="concept-section" data-animate style={{
        background: '#F5F5F3',
        padding: '120px 80px',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 60,
        alignItems: 'center',
      }} className={animationClass('concept-section')}>
        <div style={{ className: animationClass('concept-left') }}>
          <p style={{
            fontSize: 10,
            fontWeight: 600,
            color: '#555555',
            textTransform: 'uppercase',
            letterSpacing: '0.2em',
            marginBottom: 20,
            fontFamily: 'Plus Jakarta Sans',
          }}>
            THE CONCEPT
          </p>
          <h2 style={{
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            fontWeight: 700,
            fontSize: 'clamp(32px, 5vw, 56px)',
            color: '#0A0A0A',
            letterSpacing: '-0.01em',
            lineHeight: 1.15,
            marginBottom: 24,
          }}>
            One aesthetic. Every piece.
          </h2>
          <p style={{
            fontSize: 14,
            fontWeight: 400,
            color: '#444444',
            lineHeight: 1.7,
            marginBottom: 20,
            fontFamily: 'Plus Jakarta Sans',
          }}>
            A Universe is a complete visual system for your wedding. The moment you choose one, it defines the typography, colour palette, layout logic and mood across all 10 pieces in your Guest Suite — from your Save the Date to your Thank You Notes.
          </p>
          <p style={{
            fontSize: 14,
            fontWeight: 400,
            color: '#444444',
            lineHeight: 1.7,
            marginBottom: 32,
            fontFamily: 'Plus Jakarta Sans',
          }}>
            Each universe is designed around a place, a feeling, a way of seeing. Not a template. A perspective.
          </p>
          <div style={{ width: 48, height: 1, background: '#E03553' }} />
        </div>

        <div style={{
          background: '#0A0A0A',
          padding: 48,
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'url(https://static.wixstatic.com/media/d2df22_8e79926ce6c74e55aa7ee84c8a8be77c~mv2.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.2,
            pointerEvents: 'none',
          }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <p style={{
              fontSize: 10,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.35)',
              letterSpacing: '0.25em',
              marginBottom: 24,
              textTransform: 'uppercase',
              fontFamily: 'Plus Jakarta Sans',
            }}>
              01 / AMAN
            </p>
            <h3 style={{
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontWeight: 600,
              fontSize: 'clamp(24px, 3vw, 40px)',
              color: '#FFFFFF',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              margin: 0,
              lineHeight: 1,
              marginBottom: 12,
            }}>
              AMAN
            </h3>
            <p style={{
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontWeight: 400,
              fontStyle: 'italic',
              fontSize: 18,
              color: 'rgba(255,255,255,0.5)',
              margin: '0 0 24px',
            }}>
              Quiet Luxury
            </p>
            <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
              {['#0A0A0A', '#F8F7F5', '#C4956A', '#FFFFFF'].map((color, i) => (
                <div key={i} style={{ width: 32, height: 32, background: color, border: `1px solid ${color === '#FFFFFF' ? '#444' : 'transparent'}` }} />
              ))}
            </div>
            <p style={{
              fontSize: 11,
              color: 'rgba(255,255,255,0.3)',
              margin: 0,
              fontFamily: 'Plus Jakarta Sans',
            }}>
              Cormorant Garamond · Plus Jakarta Sans
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 3: THE 10 ASSETS */}
      <section id="assets-section" data-animate style={{
        background: '#0A0A0A',
        padding: '100px 80px',
        className: animationClass('assets-section'),
      }}>
        <p style={{
          fontSize: 10,
          fontWeight: 600,
          color: 'rgba(255,255,255,0.4)',
          letterSpacing: '0.25em',
          textTransform: 'uppercase',
          marginBottom: 16,
          fontFamily: 'Plus Jakarta Sans',
        }}>
          YOUR GUEST SUITE
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

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
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

      {/* SECTION 4: AMAN UNIVERSE */}
      <section data-animate style={{
        background: '#0A0A0A',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        minHeight: '100vh',
        className: animationClass('aman-section'),
      }}>
        <div style={{
          backgroundImage: 'url(https://static.wixstatic.com/media/d2df22_8e79926ce6c74e55aa7ee84c8a8be77c~mv2.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }} />

        <div style={{
          padding: '80px 60px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}>
          <p style={{
            fontSize: 10,
            fontWeight: 600,
            color: 'rgba(255,255,255,0.3)',
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            marginBottom: 20,
            fontFamily: 'Plus Jakarta Sans',
            margin: 0,
          }}>
            NO. 01
          </p>
          <h2 style={{
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            fontWeight: 700,
            fontSize: 'clamp(40px, 6vw, 72px)',
            color: '#FFFFFF',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            lineHeight: 1,
            margin: '12px 0 0',
            marginBottom: 12,
          }}>
            AMAN
          </h2>
          <p style={{
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            fontWeight: 400,
            fontStyle: 'italic',
            fontSize: 18,
            color: 'rgba(255,255,255,0.5)',
            margin: '0 0 24px',
          }}>
            Quiet Luxury
          </p>
          <div style={{ width: 48, height: 1, background: 'rgba(255,255,255,0.15)', margin: '24px 0' }} />
          <p style={{
            fontSize: 14,
            fontWeight: 400,
            color: 'rgba(255,255,255,0.65)',
            lineHeight: 1.7,
            marginBottom: 32,
            fontFamily: 'Plus Jakarta Sans',
          }}>
            Inspired by the world's most considered resort collection. Every element stripped back to what matters. The AMAN universe speaks quietly — and says more for it.
          </p>

          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
              {[
                { color: '#0A0A0A', label: 'Obsidian' },
                { color: '#F8F7F5', label: 'Linen' },
                { color: '#C4956A', label: 'Sand' },
                { color: '#FFFFFF', label: 'Pure' },
              ].map((swatch, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{
                    width: 56,
                    height: 56,
                    background: swatch.color,
                    border: swatch.color === '#FFFFFF' ? '1px solid #444' : 'none',
                    marginBottom: 8,
                  }} />
                  <p style={{
                    fontSize: 10,
                    color: 'rgba(255,255,255,0.5)',
                    fontFamily: 'Plus Jakarta Sans',
                    margin: 0,
                  }}>
                    {swatch.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div style={{
            border: '1px solid rgba(255,255,255,0.2)',
            padding: '4px 14px',
            fontSize: 10,
            color: 'rgba(255,255,255,0.5)',
            textTransform: 'uppercase',
            letterSpacing: '0.2em',
            display: 'inline-block',
            marginBottom: 24,
            fontFamily: 'Plus Jakarta Sans',
          }}>
            Available now
          </div>

          <button onClick={() => navigate('/studio/universe/aman')} style={{
            padding: '14px 40px',
            background: 'transparent',
            color: '#FFFFFF',
            border: '1px solid rgba(255,255,255,0.3)',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'Plus Jakarta Sans',
            letterSpacing: '0.02em',
            alignSelf: 'flex-start',
          }}>
            Explore AMAN →
          </button>
        </div>
      </section>

      {/* SECTION 5: COMING SOON */}
      <section id="coming-soon-section" data-animate style={{
        background: '#F5F5F3',
        padding: '100px 80px',
        className: animationClass('coming-soon-section'),
      }}>
        <p style={{
          fontSize: 10,
          fontWeight: 600,
          color: '#555555',
          textTransform: 'uppercase',
          letterSpacing: '0.2em',
          marginBottom: 16,
          fontFamily: 'Plus Jakarta Sans',
        }}>
          COMING SOON
        </p>
        <h2 style={{
          fontFamily: 'Plus Jakarta Sans, sans-serif',
          fontWeight: 700,
          fontSize: 'clamp(32px, 5vw, 56px)',
          color: '#0A0A0A',
          letterSpacing: '-0.01em',
          margin: '0 0 12px',
        }}>
          Eight more worlds to explore.
        </h2>
        <p style={{
          fontSize: 14,
          fontWeight: 400,
          color: '#444444',
          marginBottom: 60,
          maxWidth: 600,
          fontFamily: 'Plus Jakarta Sans',
        }}>
          Each universe is a new aesthetic lens. A different way of seeing your wedding. New universes arrive every season.
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 20,
          marginBottom: 60,
        }}>
          {comingSoon.map((universe, i) => (
            <div key={i} style={{
              border: '1px solid #E8E8E5',
              padding: 32,
              background: '#FFFFFF',
              position: 'relative',
              overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute',
                top: 20,
                right: 20,
                fontSize: 9,
                fontWeight: 600,
                color: '#AAAAAA',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                border: '1px solid #E8E8E5',
                padding: '3px 8px',
                fontFamily: 'Plus Jakarta Sans',
              }}>
                Soon
              </div>

              <h3 style={{
                fontFamily: 'Plus Jakarta Sans, sans-serif',
                fontWeight: 600,
                fontSize: 28,
                color: '#0A0A0A',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                margin: '0 0 6px',
                lineHeight: 1,
              }}>
                {universe.name}
              </h3>
              <p style={{
                fontFamily: 'Plus Jakarta Sans, sans-serif',
                fontStyle: 'italic',
                fontWeight: 400,
                fontSize: 15,
                color: '#555555',
                margin: '0 0 20px',
              }}>
                {universe.tagline}
              </p>
              <p style={{
                fontSize: 14,
                color: '#444444',
                lineHeight: 1.6,
                margin: 0,
                fontFamily: 'Plus Jakarta Sans',
              }}>
                {universe.description}
              </p>
            </div>
          ))}
        </div>

        {/* Email capture */}
        <div style={{ textAlign: 'center', marginTop: 64 }}>
          <p style={{
            fontSize: 14,
            color: '#444444',
            marginBottom: 20,
            fontFamily: 'Plus Jakarta Sans',
          }}>
            Get notified when new universes arrive.
          </p>
          <div style={{ display: 'flex', gap: 0, maxWidth: 400, margin: '0 auto' }}>
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{
                flex: 1,
                padding: '14px 20px',
                border: '1px solid #DDDDDD',
                borderRight: 'none',
                fontSize: 14,
                outline: 'none',
                fontFamily: 'Plus Jakarta Sans',
                background: '#FFFFFF',
              }}
            />
            <button style={{
              padding: '14px 24px',
              background: '#0A0A0A',
              color: '#FFFFFF',
              border: '1px solid #0A0A0A',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'Plus Jakarta Sans',
            }}>
              Notify me
            </button>
          </div>
        </div>
      </section>

      {/* SECTION 6: EDITOR EXPERIENCE */}
      <section data-animate style={{
        background: '#0A0A0A',
        padding: '100px 80px',
        className: animationClass('editor-section'),
      }}>
        <p style={{
          fontSize: 10,
          fontWeight: 600,
          color: 'rgba(255,255,255,0.4)',
          letterSpacing: '0.25em',
          textTransform: 'uppercase',
          marginBottom: 16,
          fontFamily: 'Plus Jakarta Sans',
        }}>
          THE EDITOR
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
        className: animationClass('ava-section'),
      }}>
        <div>
          <p style={{
            fontSize: 10,
            fontWeight: 600,
            color: '#555555',
            textTransform: 'uppercase',
            letterSpacing: '0.2em',
            marginBottom: 20,
            fontFamily: 'Plus Jakarta Sans',
          }}>
            AVA'S STUDIO
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
            textTransform: 'uppercase',
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