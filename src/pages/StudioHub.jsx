import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Globe, Sparkles, ChevronRight } from 'lucide-react';
import { getMyWeddingDetails } from '@/lib/resolveMyWedding';
import { getUniverse } from '@/lib/universeCatalog';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import { interactiveDivProps } from '@/lib/a11y';
import { useAuth } from '@/lib/AuthContext';

export default function StudioHub() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isProPlan = (user?.plan || 'free') === 'pro';
  const prefersReducedMotion = useReducedMotion();
  const [wedding, setWedding] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const details = await getMyWeddingDetails();
        setWedding(details || null);
      } catch (e) {
        console.error(e);
        toast.error('Failed to load — please refresh and try again.');
      }
      setLoading(false);
    };
    load();
  }, []);


  const universe = getUniverse(wedding?.activeUniverse || 'london');
  const universeImage = universe?.imageUrl || null;

  const cards = [
    {
      icon: Globe,
      kicker: 'Website & guest experience',
      title: 'Guest Suite',
      subtitle: 'Build your wedding website, invitation assets, and guest experience.',
      image: wedding?.coverPhoto || universeImage,
      badge: wedding?.websiteEnabled ? 'Live' : 'Draft',
      action: () => navigate('/studio/guest-suite'),
    },
    {
      icon: Sparkles,
      kicker: 'Style & aesthetic',
      title: 'My Universe',
      subtitle: 'Choose the aesthetic for your entire suite — invitations, website, and every design piece.',
      image: universeImage,
      badge: isProPlan ? 'Ultra' : (universe?.name || 'Choose one'),
      action: () => navigate('/studio/universe'),
    },
  ];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#FFFFFF', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <DashboardPageHeader title="Design studio" subtitle="Everything to design, build and share your wedding" />

      {/* flex:1 + centred content — the card row fills whatever vertical
          space remains below the heading (bounded by the outer div's own
          100vh) and sits centred in it, instead of stacking top-anchored
          with a large empty gap underneath. */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ maxWidth: 1200, width: '100%' }}>

          {/* Cards — same rich-photo/gradient-scrim/hover-scale language as
              UniverseBanner.jsx's universe wall, so pressing into Design
              Studio already feels like the experience it leads to, not three
              flat list rows ahead of the actual excitement. Horizontal
              3-column row (not a stack) — equal-width columns filling the
              page's available width, no scrolling needed for just 3 items. */}
          <div style={{
            /* TWO CARDS, NOT THREE. 'Preview your site' carried the same
               visual weight as Guest Suite and My Universe, so three doors read
               as three equal destinations when only two are places a couple
               goes to WORK. The live site is still one click from the builder's
               Preview (FullScreenPreview's "Visit live") and from the Guest
               Suite's Share tab — the door went only after the destination had
               another one.

               320px min rather than 240: with two cards the old minimum let
               them stretch across half the page while keeping a near-square
               height, which reads as two squares pushed apart rather than two
               rectangles. */
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16,
            opacity: loading ? 0.5 : 1, transition: 'opacity 0.3s',
          }}>
          {cards.map((card, i) => {
            const Icon = card.icon;
            const BadgeIcon = card.badgeIcon;
            return (
              <motion.div
                key={i}
                onClick={card.action}
                {...interactiveDivProps(card.action, { label: card.title })}
                whileHover={prefersReducedMotion ? undefined : { scale: 1.02 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                style={{
                  position: 'relative', height: 'clamp(240px, 24vw, 340px)',
                  overflow: 'hidden', cursor: 'pointer', borderRadius: 0,
                  background: card.image ? '#0A0A0A' : 'linear-gradient(135deg, #0A1930 0%, #1a2f4a 100%)',
                }}
              >
                {card.image && (
                  <img
                    src={card.image}
                    alt=""
                    loading="lazy"
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                )}
                {/* Scrim only where text sits — depth from the photo itself,
                    not a box-shadow (DESIGN_SPEC.md's documented exception
                    for photo-background cards, same as UniverseBanner.jsx). */}
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(180deg, rgba(10,10,10,0.1) 0%, rgba(10,10,10,0.82) 100%)',
                }} />

                <div style={{
                  position: 'relative', height: '100%', display: 'flex', flexDirection: 'column',
                  justifyContent: 'flex-end', padding: '24px', boxSizing: 'border-box',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'auto' }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.15)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <Icon size={20} color="#FFFFFF" strokeWidth={1.5} />
                    </div>
                    {card.badge && (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        fontSize: 11, fontWeight: 700, letterSpacing: '0.02em',
                        padding: '5px 12px', borderRadius: 999,
                        background: 'rgba(0,0,0,0.45)', color: '#FFFFFF',
                      }}>
                        {BadgeIcon && <BadgeIcon size={11} color="#F59E0B" />}
                        {card.badge}
                      </span>
                    )}
                  </div>

                  <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.7)', margin: '0 0 6px' }}>
                    {card.kicker}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 'clamp(20px, 1.8vw, 26px)', fontWeight: 700, color: '#FFFFFF', margin: '0 0 6px', letterSpacing: '-0.01em', lineHeight: 1.15 }}>
                        {card.title}
                      </p>
                      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', margin: 0, lineHeight: 1.4 }}>
                        {card.subtitle}
                      </p>
                    </div>
                    <ChevronRight size={20} color="rgba(255,255,255,0.6)" style={{ flexShrink: 0 }} />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
        </div>
      </div>
    </div>
  );
}
