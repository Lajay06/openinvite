import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Loader2, Globe, Mail, CheckSquare, Printer, Eye, MapPin, Calendar, Clock, ArrowRight } from 'lucide-react';
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
    base44.entities.WeddingDetails.list()
      .then(rows => { setWedding(rows[0] || null); })
      .catch(e => console.error('GuestSuite: failed to load wedding details', e))
      .finally(() => setLoading(false));
  }, []);

  const couple1 = wedding?.couple1Name || '';
  const couple2 = wedding?.couple2Name || '';
  const coupleName = couple1 && couple2 ? `${couple1} & ${couple2}` : couple1 || couple2 || '';
  const weddingDate = wedding?.weddingDate || '';
  const venueName = wedding?.mainCeremony?.venueName || '';
  const venueAddress = wedding?.mainCeremony?.address || '';
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

      {/* Wedding-at-a-glance strip */}
      {loading ? (
        <div style={{ padding: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Loader2 size={20} style={{ color: 'rgba(10,10,10,0.3)' }} className="animate-spin" />
        </div>
      ) : hasDetails ? (
        <div className="flex flex-wrap w-full" style={{ borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
          {/* Couple names */}
          <div className="grow shrink basis-1/2 min-w-0 lg:flex-1" style={{ padding: '20px 32px', borderRight: '1px solid rgba(10,10,10,0.08)' }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)', fontFamily: PJS, margin: '0 0 6px' }}>Couple</p>
            <p style={{ fontSize: 20, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {coupleName || <span style={{ color: 'rgba(10,10,10,0.3)' }}>—</span>}
            </p>
          </div>

          {/* Date */}
          <div className="grow shrink basis-1/2 min-w-0 lg:flex-1" style={{ padding: '20px 32px', borderRight: '1px solid rgba(10,10,10,0.08)' }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)', fontFamily: PJS, margin: '0 0 6px' }}>Date</p>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#0A0A0A', fontFamily: PJS, margin: 0 }}>
              {fmt(weddingDate) || <span style={{ color: 'rgba(10,10,10,0.3)' }}>—</span>}
            </p>
          </div>

          {/* Venue */}
          <div className="grow shrink basis-1/2 min-w-0 lg:flex-1" style={{ padding: '20px 32px', borderRight: '1px solid rgba(10,10,10,0.08)' }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)', fontFamily: PJS, margin: '0 0 6px' }}>Venue</p>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#0A0A0A', fontFamily: PJS, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {venueName || <span style={{ color: 'rgba(10,10,10,0.3)' }}>—</span>}
            </p>
            {venueAddress && (
              <p style={{ fontSize: 11, color: 'rgba(10,10,10,0.45)', fontFamily: PJS, margin: '2px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {venueAddress}
              </p>
            )}
          </div>

          {/* Countdown */}
          <div className="grow shrink basis-1/2 min-w-0 lg:flex-1" style={{ padding: '20px 32px' }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)', fontFamily: PJS, margin: '0 0 6px' }}>Countdown</p>
            {days !== null ? (
              days > 0 ? (
                <p style={{ fontSize: 20, fontWeight: 700, color: '#E03553', fontFamily: PJS, margin: 0 }}>
                  {days} <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(10,10,10,0.5)' }}>days to go</span>
                </p>
              ) : days === 0 ? (
                <p style={{ fontSize: 14, fontWeight: 700, color: '#E03553', fontFamily: PJS, margin: 0 }}>Today! 🎉</p>
              ) : (
                <p style={{ fontSize: 13, fontWeight: 600, color: 'rgba(10,10,10,0.4)', fontFamily: PJS, margin: 0 }}>
                  {Math.abs(days)} days ago
                </p>
              )
            ) : (
              <span style={{ color: 'rgba(10,10,10,0.3)', fontFamily: PJS }}>—</span>
            )}
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
    </div>
  );
}
