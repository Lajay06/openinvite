import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Globe, Sparkles, Eye, ChevronRight, Crown } from 'lucide-react';
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

  const siteUrl = wedding?.slug ? `openinvite.com.au/w/${wedding.slug}` : null;

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
      badgeIcon: isProPlan ? Crown : null,
      action: () => navigate('/studio/universe'),
    },
    {
      icon: Eye,
      kicker: 'See it live',
      title: 'Preview your site',
      subtitle: 'See your website exactly as your guests see it.',
      image: wedding?.coverPhoto || universeImage,
      badge: null,
      rightLabel: siteUrl,
      action: () => {
        if (wedding?.slug) window.open(`/w/${wedding.slug}`, '_blank');
        else navigate('/studio/guest-suite');
      },
    },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <DashboardPageHeader title="Design studio" subtitle="Everything to design, build and share your wedding" />

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '48px 24px' }}>

        {/* Cards — same rich-photo/gradient-scrim/hover-scale language as
            UniverseBanner.jsx's universe wall, so pressing into Design
            Studio already feels like the experience it leads to, not three
            flat list rows ahead of the actual excitement. Horizontal
            3-column row (not a stack) — equal-width columns filling the
            page's available width, no scrolling needed for just 3 items. */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16,
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
                  position: 'relative', height: 'clamp(320px, 34vw, 440px)',
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
                      {card.rightLabel && (
                        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', margin: '6px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {card.rightLabel}
                        </p>
                      )}
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
  );
}
