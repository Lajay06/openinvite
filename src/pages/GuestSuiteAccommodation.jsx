import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Loader2, Hotel, MapPin, Phone, ExternalLink, ArrowRight, Calendar } from 'lucide-react';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';

const PJS = "'Plus Jakarta Sans', sans-serif";

const FEATURED_BADGES = {
  isMainGuestHotel: { label: 'Where most guests are staying', bg: '#0A1930', text: '#DDF762' },
  isClosestToVenue: { label: 'Closest to venue',             bg: '#E03553', text: '#FFFFFF' },
  isBestValue:      { label: 'Best value',                   bg: '#DDF762', text: '#0A1930' },
};

function fmtDate(iso) {
  if (!iso) return '';
  try { return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }); }
  catch { return iso; }
}

function PropertyCard({ property }) {
  const featured = Object.entries(FEATURED_BADGES).filter(([k]) => property[k]);

  return (
    <div style={{ border: '1px solid rgba(10,10,10,0.08)', overflow: 'hidden' }}>
      {/* Photo */}
      {property.photoUrl && (
        <img
          src={property.photoUrl}
          alt={property.name}
          style={{ width: '100%', height: 180, objectFit: 'cover', display: 'block' }}
          onError={e => { e.target.style.display = 'none'; }}
        />
      )}

      <div style={{ padding: '16px 20px 20px' }}>
        {/* Featured badges */}
        {featured.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
            {featured.map(([k, badge]) => (
              <span key={k} style={{
                fontSize: 9, fontWeight: 700, letterSpacing: '0.08em',
                padding: '2px 8px', borderRadius: 999,
                background: badge.bg, color: badge.text, fontFamily: PJS,
              }}>
                {badge.label}
              </span>
            ))}
          </div>
        )}

        {/* Name */}
        <p style={{ fontSize: 16, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS, margin: '0 0 6px', lineHeight: 1.3 }}>
          {property.name}
        </p>

        {/* Address */}
        {property.address && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 5, marginBottom: 8, fontSize: 13, color: 'rgba(10,10,10,0.55)', fontFamily: PJS }}>
            <MapPin size={12} strokeWidth={1.8} style={{ marginTop: 2, flexShrink: 0 }} />
            {property.address}
          </div>
        )}

        {/* Tags */}
        {property.tags?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
            {property.tags.map(tag => (
              <span key={tag} style={{
                fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
                padding: '2px 8px', borderRadius: 999,
                background: 'rgba(10,10,10,0.06)', color: '#444444', fontFamily: PJS,
              }}>
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Description */}
        {property.description && (
          <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, margin: '0 0 12px', lineHeight: 1.6 }}>
            {property.description}
          </p>
        )}

        {/* Booking code */}
        {property.bookingCode && (
          <div style={{ padding: '8px 12px', background: 'rgba(10,10,10,0.03)', border: '1px solid rgba(10,10,10,0.07)', marginBottom: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: 'rgba(10,10,10,0.4)', fontFamily: PJS }}>
              Group booking code
            </span>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS, margin: '2px 0 0', letterSpacing: '0.05em' }}>
              {property.bookingCode}
            </p>
          </div>
        )}

        {/* Actions row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          {property.phone && (
            <a
              href={`tel:${property.phone}`}
              style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'rgba(10,10,10,0.55)', fontFamily: PJS, textDecoration: 'none' }}
            >
              <Phone size={12} strokeWidth={1.8} />
              {property.phone}
            </a>
          )}
          {property.website && (
            <a
              href={property.website}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                fontSize: 12, fontWeight: 700, color: '#FFFFFF',
                background: '#0A0A0A', borderRadius: 999,
                padding: '7px 16px', textDecoration: 'none', fontFamily: PJS,
              }}
            >
              Book now <ExternalLink size={11} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export default function GuestSuiteAccommodation() {
  const navigate = useNavigate();
  const [accom, setAccom] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.WeddingDetails.list()
      .then(rows => { setAccom(rows[0]?.accommodation || null); })
      .catch(e => console.error('GuestSuiteAccommodation load error', e))
      .finally(() => setLoading(false));
  }, []);

  const properties = accom?.manualProperties || [];
  const hasAnyContent = properties.length > 0 || accom?.coupleNote || accom?.checkInDate;

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF' }}>
      <DashboardPageHeader
        title="Accommodation"
        subtitle="Places to stay near the wedding venue"
      />

      {/* Connected banner */}
      <div style={{
        padding: '10px 32px', background: 'rgba(224,53,83,0.04)',
        borderBottom: '1px solid rgba(224,53,83,0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: 12, color: '#E03553', fontFamily: PJS, fontWeight: 600 }}>
          ✨ This is pulled from your Accommodation planning page and is visible to guests
        </span>
        <button
          onClick={() => navigate('/accommodation')}
          style={{ fontSize: 12, fontWeight: 700, color: '#E03553', background: 'none', border: 'none', cursor: 'pointer', fontFamily: PJS, display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}
        >
          Edit in Accommodation <ArrowRight size={11} />
        </button>
      </div>

      <div style={{ padding: '32px 32px 80px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
            <Loader2 size={20} className="animate-spin" style={{ color: 'rgba(10,10,10,0.3)' }} />
          </div>
        ) : !hasAnyContent ? (
          /* Empty state */
          <div style={{ textAlign: 'center', padding: '80px 24px' }}>
            <div style={{ width: 48, height: 48, background: 'rgba(10,10,10,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Hotel size={22} style={{ color: 'rgba(10,10,10,0.25)' }} />
            </div>
            <p style={{ fontSize: 15, fontWeight: 600, color: '#0A0A0A', fontFamily: PJS, margin: '0 0 8px' }}>
              No accommodation added yet
            </p>
            <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.5)', fontFamily: PJS, margin: '0 0 24px', lineHeight: 1.6 }}>
              Add hotels and venues in Day of → Accommodation and they'll appear here for guests.
            </p>
            <button
              onClick={() => navigate('/accommodation')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#E03553', background: 'none', border: '1px solid rgba(224,53,83,0.3)', borderRadius: 999, padding: '8px 18px', cursor: 'pointer', fontFamily: PJS }}
            >
              Add in Accommodation planning page <ArrowRight size={12} />
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

            {/* Couple's note + dates */}
            {(accom?.coupleNote || accom?.checkInDate || accom?.checkOutDate) && (
              <div style={{ padding: '20px 24px', background: 'rgba(10,10,10,0.02)', border: '1px solid rgba(10,10,10,0.07)' }}>
                {accom.coupleNote && (
                  <p style={{ fontSize: 14, color: '#0A0A0A', fontFamily: PJS, margin: '0 0 12px', lineHeight: 1.7 }}>
                    {accom.coupleNote}
                  </p>
                )}
                {(accom.checkInDate || accom.checkOutDate) && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                    {accom.checkInDate && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'rgba(10,10,10,0.6)', fontFamily: PJS }}>
                        <Calendar size={13} strokeWidth={1.8} />
                        <span><strong style={{ color: '#0A0A0A' }}>Check in:</strong> {fmtDate(accom.checkInDate)}</span>
                      </div>
                    )}
                    {accom.checkOutDate && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'rgba(10,10,10,0.6)', fontFamily: PJS }}>
                        <Calendar size={13} strokeWidth={1.8} />
                        <span><strong style={{ color: '#0A0A0A' }}>Check out:</strong> {fmtDate(accom.checkOutDate)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Property cards */}
            {properties.length > 0 && (
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)', fontFamily: PJS, margin: '0 0 16px' }}>
                  {properties.length} {properties.length === 1 ? 'recommendation' : 'recommendations'}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
                  {/* Pinned first, then rest */}
                  {[...properties]
                    .sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0))
                    .map(p => <PropertyCard key={p.id} property={p} />)
                  }
                </div>
              </div>
            )}

            {/* Additional notes */}
            {accom?.additionalNotes && (
              <div style={{ padding: '16px 20px', border: '1px solid rgba(10,10,10,0.07)' }}>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)', fontFamily: PJS, margin: '0 0 8px' }}>Notes</p>
                <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.65)', fontFamily: PJS, margin: 0, lineHeight: 1.7 }}>{accom.additionalNotes}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
