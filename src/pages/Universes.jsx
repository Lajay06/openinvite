import React from 'react';
import { useNavigate } from 'react-router-dom';
import PublicNav from '@/components/public/PublicNav';
import PublicFooter from '@/components/public/PublicFooter';

const UNIVERSE_DATA = [
  {
    id: 'aman',
    name: 'AMAN',
    tagline: 'Quiet Luxury',
    description: 'Inspired by the world\'s most considered resort collection. Every element stripped back to what matters. The AMAN universe speaks quietly — and says more for it.',
    palette: [{ color: '#0A0A0A', label: 'Obsidian' }, { color: '#F8F7F5', label: 'Linen' }, { color: '#C4956A', label: 'Sand' }, { color: '#FFFFFF', label: 'Pure' }],
    image: 'https://res.cloudinary.com/dsr84xknv/image/upload/v1779246464/manuel-moreno-DGa0LQ0yDPc-unsplash_nbgivs.jpg',
    available: true,
  },
  {
    id: 'tulum',
    name: 'TULUM',
    tagline: 'Desert Bloom',
    description: 'Sun-bleached romance. Warm earth tones and organic texture that feel alive under open sky.',
    palette: [{ color: '#C4956A', label: 'Terracotta' }, { color: '#F5ECD7', label: 'Sand' }, { color: '#7B6B52', label: 'Earth' }, { color: '#FFFFFF', label: 'Pure' }],
    image: 'https://res.cloudinary.com/dsr84xknv/image/upload/v1779246462/alex-bertha-Jyg7xHRmXiU-unsplash_ypu0wy.jpg',
    available: true,
  },
  {
    id: 'kyoto',
    name: 'KYOTO',
    tagline: 'Zen and Ceremony',
    description: 'Ancient ritual meets modern refinement. Stillness as a design principle.',
    palette: [{ color: '#2C2C2C', label: 'Charcoal' }, { color: '#F0EBE3', label: 'Paper' }, { color: '#8B7355', label: 'Bamboo' }, { color: '#E8D5C4', label: 'Blush' }],
    image: 'https://res.cloudinary.com/dsr84xknv/image/upload/v1779246462/anne-laure-p-PbemriYGLoQ-unsplash_rgyetw.jpg',
    available: true,
  },
  {
    id: 'capri',
    name: 'CAPRI',
    tagline: 'Italian Coast',
    description: 'La dolce vita. Deep blues, warm stone and effortless elegance.',
    palette: [{ color: '#1B3A6B', label: 'Cobalt' }, { color: '#F4E4C1', label: 'Stone' }, { color: '#7BA7C2', label: 'Sea' }, { color: '#FFFFFF', label: 'Pure' }],
    image: 'https://res.cloudinary.com/dsr84xknv/image/upload/v1779246455/nicolo-salinetti-FiGEvsSG4vU-unsplash_ai9pim.jpg',
    available: true,
  },
  {
    id: 'paris',
    name: 'PARIS',
    tagline: 'Haussmann Romance',
    description: 'Grand and timeless. The language of French elegance.',
    palette: [{ color: '#1A1A2E', label: 'Midnight' }, { color: '#F5F0E8', label: 'Cream' }, { color: '#C9A96E', label: 'Gold' }, { color: '#8B4B6B', label: 'Rose' }],
    image: 'https://res.cloudinary.com/dsr84xknv/image/upload/v1779246459/alex-boyd-HhFi1gKYosc-unsplash_prtm0n.jpg',
    available: true,
  },
];

const Universes = () => {
  const navigate = useNavigate();

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
            Your Universe
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
            Every invitation, menu, seating chart and digital asset — designed around a single aesthetic vision. Choose your universe and everything follows.
          </p>
        </div>
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
              A Universe is a complete visual system for your wedding. The moment you choose one, it defines the typography, colour palette, layout logic and mood across all 10 pieces in your Guest Suite — from your Save the Date to your Thank You Notes.
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
      <section id="assets-section" style={{
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

      {/* SECTION 4: UNIVERSE SHOWCASE */}
      {UNIVERSE_DATA.map((u) => (
        <div key={u.id} style={{ position: 'relative', minHeight: '80vh', overflow: 'hidden', display: 'flex', background: '#0A0A0A' }}>
          <img
            src={u.image}
            alt=""
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', zIndex: 1 }}
          />
          <div style={{ position: 'absolute', inset: 0, zIndex: 2, background: 'linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.75))' }} />
          <div style={{ position: 'relative', zIndex: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', width: '100%', minHeight: '80vh' }}>
            {/* Left: universe name */}
            <div style={{ padding: 80, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <h2 style={{
                fontFamily: 'Plus Jakarta Sans, sans-serif',
                fontWeight: 700,
                fontSize: 'clamp(32px, 4vw, 52px)',
                color: '#FFFFFF',
                letterSpacing: '0.05em',
                lineHeight: 1.1,
                margin: 0,
              }}>
                {u.name}
              </h2>
            </div>
            {/* Right: details */}
            <div style={{ padding: 80, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
              <p style={{ fontStyle: 'italic', fontSize: 18, color: 'rgba(255,255,255,0.5)', margin: '0 0 16px', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                {u.tagline}
              </p>
              <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.7)', lineHeight: 1.7, maxWidth: 440, margin: '0 0 32px', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                {u.description}
              </p>
              <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
                {u.palette.map((swatch, si) => (
                  <div key={si} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: 48, height: 48, background: swatch.color, border: swatch.color === '#FFFFFF' ? '1px solid #444' : 'none' }} />
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontFamily: 'Plus Jakarta Sans, sans-serif', textAlign: 'center', margin: '6px 0 0' }}>
                      {swatch.label}
                    </p>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => navigate('/studio/universe')}
                style={{
                  padding: '14px 40px', background: 'transparent',
                  color: '#FFFFFF', border: '1px solid rgba(255,255,255,0.3)',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  fontFamily: 'Plus Jakarta Sans, sans-serif', letterSpacing: '0.02em',
                  alignSelf: 'flex-start',
                }}
              >
                Explore {u.name} →
              </button>
            </div>
          </div>
        </div>
      ))}

      {/* SECTION 6: EDITOR EXPERIENCE */}
      <section style={{
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
      <section style={{
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