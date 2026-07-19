import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Globe, Sparkles, Eye, ChevronRight, Camera, Map } from 'lucide-react';
import { getMyWeddingDetails, getMyGuestsWithRsvp } from '@/lib/resolveMyWedding';
import { tallyGuestRsvp } from '@/lib/guestRsvpTally';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import { interactiveDivProps } from '@/lib/a11y';

export default function StudioHub() {
  const navigate = useNavigate();
  const [wedding, setWedding] = useState(null);
  const [rsvpCount, setRsvpCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [details, guests] = await Promise.all([
          getMyWeddingDetails(),
          getMyGuestsWithRsvp(),
        ]);
        setWedding(details || null);
        setRsvpCount(tallyGuestRsvp(guests).attending);
      } catch (e) {}
      setLoading(false);
    };
    load();
  }, []);

  const daysToWedding = wedding?.weddingDate
    ? Math.max(0, Math.ceil((new Date(wedding.weddingDate) - new Date()) / (1000 * 60 * 60 * 24)))
    : null;

  const siteUrl = wedding?.slug ? `openinvite.com.au/w/${wedding.slug}` : null;

  const cards = [
    {
      icon: Globe,
      title: 'Guest Suite',
      subtitle: 'Build your wedding website, invitation assets, and guest experience.',
      badge: wedding?.websiteEnabled ? 'LIVE' : 'DRAFT',
      badgeColor: wedding?.websiteEnabled ? '#22C55E' : '#888888',
      badgeBg: wedding?.websiteEnabled ? '#F0FDF4' : '#F5F5F5',
      action: () => navigate('/studio/guest-suite'),
    },
    {
      icon: Sparkles,
      title: 'My Universe',
      subtitle: 'Choose the aesthetic for your entire suite — invitations, website, and every design piece.',
      badge: wedding?.activeUniverse ? wedding.activeUniverse.toUpperCase() : 'Choose One',
      badgeColor: '#555555',
      badgeBg: '#F5F5F5',
      action: () => navigate('/studio/universe'),
    },
    {
      icon: Eye,
      title: 'Preview Your Site',
      subtitle: 'See your website as guests see it.',
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
      {/* Fixed top bar */}
      <div className="studio-hub-topbar" style={{
        position: 'fixed', top: 0, left: 220, right: 0, height: 56, zIndex: 30,
        background: '#FFFFFF', borderBottom: '1px solid #EEEEEE',
        display: 'flex', alignItems: 'center', padding: '0 24px',
      }}>
        <button
          onClick={() => navigate('/Dashboard')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888888', fontSize: 13, padding: 0 }}
        >
          ← Dashboard
        </button>
        <p style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', fontSize: 18, fontWeight: 700, color: '#0A0A0A', margin: 0 }}>
          Design Studio
        </p>
      </div>

      {/* Scrollable content */}
      <div style={{ paddingTop: 56 }}>
        <DashboardPageHeader title="Design studio" subtitle="Everything to design, build and share your wedding" />
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '48px 24px' }}>

          {/* Nav cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 48 }}>
            {cards.map((card, i) => {
              const Icon = card.icon;
              return (
                <div
                  key={i}
                  onClick={card.action}
                  {...interactiveDivProps(card.action, { label: card.title })}
                  style={{
                    height: 100, display: 'flex', alignItems: 'center',
                    padding: '0 24px', border: '1px solid #EEEEEE', background: '#FFFFFF',
                    cursor: 'pointer', transition: 'background 0.15s ease', gap: 16,
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#FAFAFA'}
                  onMouseLeave={e => e.currentTarget.style.background = '#FFFFFF'}
                >
                  <div style={{ width: 44, height: 44, background: '#F5F5F5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, borderRadius: 8 }}>
                    <Icon size={24} color="#0A0A0A" strokeWidth={1.5} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 16, fontWeight: 700, color: '#0A0A0A', margin: '0 0 3px' }}>{card.title}</p>
                    <p style={{ fontSize: 13, color: '#888888', margin: 0 }}>{card.subtitle}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                    {card.badge && (
                      <span style={{
                        fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
                        padding: '3px 8px', color: card.badgeColor,
                        background: card.badgeBg, textTransform: 'uppercase'
                      }}>{card.badge}</span>
                    )}
                    {card.rightLabel && (
                      <span style={{ fontSize: 11, color: '#AAAAAA', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {card.rightLabel}
                      </span>
                    )}
                    <ChevronRight size={16} color="#CCCCCC" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', borderTop: '1px solid #EEEEEE', borderLeft: '1px solid #EEEEEE' }}>
            {[
              { label: 'RSVPs', value: loading ? '—' : rsvpCount },
              { label: 'Days to go', value: loading ? '—' : (daysToWedding ?? '—') },
              { label: 'Website', value: loading ? '—' : (wedding?.websiteEnabled ? 'Live' : 'Draft') },
            ].map((stat, i) => (
              <div key={i} style={{ padding: '24px 16px', textAlign: 'center', borderRight: '1px solid #EEEEEE', borderBottom: '1px solid #EEEEEE' }}>
                <p style={{ fontSize: 30, fontWeight: 800, color: '#0A0A0A', letterSpacing: '-0.03em', margin: '0 0 4px' }}>{stat.value}</p>
                <p style={{ fontSize: 10, color: '#888888', textTransform: 'uppercase', letterSpacing: '0.15em', margin: 0 }}>{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .studio-hub-topbar { left: 0 !important; padding-top: 56px; }
        }
      `}</style>
    </div>
  );
}