import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { getMyWeddingDetails } from '@/lib/resolveMyWedding';
import { Loader2, Globe, Mail, CheckSquare, Printer, Eye, MapPin, Calendar, Clock, ArrowRight, Image } from 'lucide-react';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import AvaButton from '@/components/shared/AvaButton';
import AvaModal from '@/components/layout/AvaModal';

const PJS = "'Plus Jakarta Sans', sans-serif";

function fmt(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function daysUntil(iso) {
  if (!iso) return null;
  return Math.ceil((new Date(iso) - new Date()) / (1000 * 60 * 60 * 24));
}

const FEATURES = [
  {
    icon: Globe,
    title: 'Wedding website',
    desc: 'Public-facing site with your story, travel details, and more.',
    action: 'View website',
    href: createPageUrl('WeddingWebsite'),
    comingSoon: false,
  },
  {
    icon: Mail,
    title: 'Digital invitations',
    desc: 'Design and send stunning digital invites that link to your website.',
    action: 'Manage invitations',
    href: createPageUrl('Guests'),
    comingSoon: false,
  },
  {
    icon: CheckSquare,
    title: 'RSVP management',
    desc: 'Collect guest responses, meal choices, and personal messages.',
    action: 'View RSVPs',
    href: createPageUrl('Guests'),
    comingSoon: false,
  },
  {
    icon: Printer,
    title: 'Print-ready designs',
    desc: 'Generate printable versions of your invitation designs.',
    action: 'Create printable',
    href: null,
    comingSoon: true,
  },
];

export default function GuestSuite() {
  const navigate = useNavigate();
  const [wedding, setWedding] = useState(null);
  const [loading, setLoading] = useState(true);
  const [avaOpen, setAvaOpen] = useState(false);

  useEffect(() => {
    getMyWeddingDetails()
      .then(w => { setWedding(w); })
      .catch(e => console.error('GuestSuite: failed to load wedding details', e))
      .finally(() => setLoading(false));
  }, []);

  const couple1 = wedding?.couple1Name || '';
  const couple2 = wedding?.couple2Name || '';
  const coupleName = couple1 && couple2 ? `${couple1} & ${couple2}` : couple1 || couple2 || '';
  const weddingDate = wedding?.weddingDate || '';
  const venueName = wedding?.mainCeremony?.venueName || '';
  const venuePhotoUrl = wedding?.mainCeremony?.photoUrl || null;
  const days = daysUntil(weddingDate);
  const hasDetails = coupleName || weddingDate || venueName;

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF' }}>
      <DashboardPageHeader
        title="Guest Suite"
        subtitle="Your wedding website and guest experience hub"
      />

      {/* Ava row */}
      <div style={{ padding: '16px 32px', borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
        <AvaButton label="Ask Ava about your guest experience" onClick={() => setAvaOpen(true)} />
      </div>

      {/* Wedding overview — split hero card */}
      {loading ? (
        <div style={{ padding: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Loader2 size={20} style={{ color: 'rgba(10,10,10,0.3)' }} className="animate-spin" />
        </div>
      ) : hasDetails ? (
        <div style={{ padding: '24px 32px', borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
          <div className="gs-hero-card">

            {/* Info panel — left on desktop, below photo on mobile */}
            <div className="gs-hero-info">
              <p style={{ fontSize: 12, fontWeight: 600, color: 'rgba(10,10,10,0.4)', fontFamily: PJS, margin: '0 0 8px', letterSpacing: '0.01em' }}>
                Your wedding
              </p>

              <p style={{ fontSize: 38, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS, margin: '0 0 20px', lineHeight: 1.05, letterSpacing: '-0.02em' }}>
                {coupleName || <span style={{ color: 'rgba(10,10,10,0.3)' }}>—</span>}
              </p>

              {weddingDate && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                  <Calendar size={14} style={{ color: 'rgba(10,10,10,0.4)', flexShrink: 0 }} />
                  <span style={{ fontSize: 15, fontWeight: 600, color: 'rgba(10,10,10,0.55)', fontFamily: PJS }}>
                    {fmt(weddingDate)}
                  </span>
                </div>
              )}

              {venueName && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: days !== null ? 16 : 0 }}>
                  <MapPin size={14} style={{ color: 'rgba(10,10,10,0.4)', flexShrink: 0 }} />
                  <span style={{ fontSize: 15, fontWeight: 600, color: 'rgba(10,10,10,0.55)', fontFamily: PJS }}>
                    {venueName}
                  </span>
                </div>
              )}

              {days !== null && (
                days > 0 ? (
                  <p style={{ fontSize: 18, fontWeight: 600, color: 'rgba(10,10,10,0.55)', fontFamily: PJS, margin: 0 }}>
                    <span style={{ fontWeight: 700, color: '#E03553' }}>{days}</span> days to go
                  </p>
                ) : days === 0 ? (
                  <p style={{ fontSize: 18, fontWeight: 700, color: '#E03553', fontFamily: PJS, margin: 0 }}>Today! 🎉</p>
                ) : (
                  <p style={{ fontSize: 18, fontWeight: 600, color: 'rgba(10,10,10,0.55)', fontFamily: PJS, margin: 0 }}>
                    {Math.abs(days)} days ago
                  </p>
                )
              )}
            </div>

            {/* Photo panel — right on desktop, top on mobile */}
            <div className="gs-hero-photo">
              {/* Fallback always in background; image covers it when loaded */}
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Image size={22} color="rgba(10,10,10,0.22)" />
                <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(10,10,10,0.3)', fontFamily: PJS }}>Venue photo</span>
              </div>
              {venuePhotoUrl && (
                <img
                  src={venuePhotoUrl}
                  alt={venueName || 'Venue'}
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  onError={e => { e.target.style.display = 'none'; }}
                />
              )}
            </div>

          </div>
        </div>
      ) : (
        /* Empty state */
        <div style={{ padding: '32px 32px', borderBottom: '1px solid rgba(10,10,10,0.08)', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#0A0A0A', fontFamily: PJS, margin: '0 0 4px' }}>
              Your wedding details will appear here
            </p>
            <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.5)', fontFamily: PJS, margin: 0 }}>
              Fill in your couple names, wedding date, and venue so they automatically appear on your guest-facing pages.
            </p>
          </div>
          <button
            onClick={() => navigate('/event-details')}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0,
              fontSize: 13, fontWeight: 700, color: '#E03553',
              background: 'none', border: '1px solid rgba(224,53,83,0.3)', borderRadius: 999,
              padding: '8px 16px', cursor: 'pointer', fontFamily: PJS,
            }}
          >
            Complete event details <ArrowRight size={13} />
          </button>
        </div>
      )}

      {/* Feature grid */}
      <div style={{ padding: '32px 32px 48px' }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)', fontFamily: PJS, margin: '0 0 20px' }}>FEATURES</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 1, border: '1px solid rgba(10,10,10,0.08)' }}>
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <div key={i} style={{
                padding: '24px 24px 20px',
                background: '#FFFFFF',
                borderRight: (i + 1) % 2 !== 0 ? '1px solid rgba(10,10,10,0.08)' : 'none',
                borderBottom: i < FEATURES.length - 2 ? '1px solid rgba(10,10,10,0.08)' : 'none',
                display: 'flex', flexDirection: 'column', gap: 12,
              }}>
                <div style={{ width: 36, height: 36, background: 'rgba(10,10,10,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={16} style={{ color: '#0A0A0A' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS, margin: '0 0 4px' }}>{f.title}</p>
                  <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.5)', fontFamily: PJS, margin: 0, lineHeight: 1.5 }}>{f.desc}</p>
                </div>
                <div>
                  {f.comingSoon ? (
                    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.35)', fontFamily: PJS, background: 'rgba(10,10,10,0.06)', padding: '3px 10px', borderRadius: 999 }}>
                      Coming soon
                    </span>
                  ) : (
                    <button
                      onClick={() => navigate(f.href)}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        fontSize: 12, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS,
                        background: 'none', border: '1px solid rgba(10,10,10,0.18)', borderRadius: 999,
                        padding: '6px 14px', cursor: 'pointer',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#E03553'; e.currentTarget.style.color = '#E03553'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(10,10,10,0.18)'; e.currentTarget.style.color = '#0A0A0A'; }}
                    >
                      {f.action} <ArrowRight size={11} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <AvaModal
        isOpen={avaOpen}
        onClose={() => setAvaOpen(false)}
        pageTitle="Guest Suite advisor"
        systemPrompt="You are Ava, a wedding guest experience advisor. Help plan the guest website, invitations, RSVP flow, and overall guest experience."
        quickActions={["What should go on my wedding website?", "How do I write a great RSVP message?", "Tips for making guests feel welcome", "What information do guests need before the wedding?"]}
      />

      <style>{`
        .gs-hero-card {
          display: flex;
          flex-direction: row;
          border: 1px solid rgba(10,10,10,0.10);
        }
        .gs-hero-info {
          flex: 1;
          padding: 40px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          min-width: 0;
        }
        .gs-hero-photo {
          flex: 0 0 248px;
          width: 248px;
          position: relative;
          overflow: hidden;
          background: #ECE7E1;
          min-height: 200px;
        }
        @media (max-width: 640px) {
          .gs-hero-card { flex-direction: column; }
          .gs-hero-photo { order: -1; flex: 0 0 180px; width: 100%; height: 180px; min-height: 0; }
          .gs-hero-info { padding: 24px 24px 32px; }
        }
      `}</style>
    </div>
  );
}
