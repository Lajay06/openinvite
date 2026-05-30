import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Loader2, Car, Bus, Truck, MapPin, Clock, Users, Phone, ArrowRight } from 'lucide-react';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';

const PJS = "'Plus Jakarta Sans', sans-serif";

const MODE_LABELS = {
  rideshare: 'Rideshare / taxi',
  drive:     'Drive & park',
  public:    'Public transport',
  shuttle:   "Couple's shuttle",
  walk:      'Walk',
  hire:      'Car hire',
};

const ROUTE_LABELS = {
  train:  'Train',
  bus:    'Bus',
  tram:   'Tram',
  metro:  'Metro',
  ferry:  'Ferry',
};

const SHUTTLE_TYPE_LABELS = {
  coach:    'Coach',
  shuttle:  'Shuttle bus',
  minibus:  'Minibus',
  transfer: 'Transfer',
  limo:     'Limousine',
};

function SectionHeading({ icon: Icon, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
      <Icon size={15} strokeWidth={1.8} style={{ color: '#0A0A0A', flexShrink: 0 }} />
      <span style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS, letterSpacing: '-0.01em' }}>
        {label}
      </span>
    </div>
  );
}

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', gap: 12, padding: '6px 0', borderBottom: '1px solid rgba(10,10,10,0.05)' }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(10,10,10,0.4)', fontFamily: PJS, minWidth: 120, flexShrink: 0 }}>
        {label}
      </span>
      <span style={{ fontSize: 13, color: '#0A0A0A', fontFamily: PJS, flex: 1, lineHeight: 1.5 }}>
        {value}
      </span>
    </div>
  );
}

export default function GuestSuiteTransport() {
  const navigate = useNavigate();
  const [transport, setTransport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.WeddingDetails.list()
      .then(rows => { setTransport(rows[0]?.transport || null); })
      .catch(e => console.error('GuestSuiteTransport load error', e))
      .finally(() => setLoading(false));
  }, []);

  const parking = transport?.parking || {};
  const pt = transport?.publicTransport || {};
  const rs = transport?.rideshare || {};
  const shuttles = transport?.shuttles || [];

  const hasParking = parking.venueParking || parking.streetParking || (parking.nearbyCarParks?.length > 0);
  const hasPublicTransport = pt.generalNotes || (pt.routes?.length > 0);
  const hasRideshare = rs.pickupLocation || rs.dropoffLocation || rs.lateNightNote;
  const hasShuttles = shuttles.length > 0;
  const hasAnyContent = transport?.coupleNote || transport?.recommendedMode || hasParking || hasPublicTransport || hasRideshare || hasShuttles || transport?.freeTextNotes;

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF' }}>
      <DashboardPageHeader
        title="Transport"
        subtitle="Getting to and from the wedding venue"
      />

      {/* Connected banner */}
      <div style={{
        padding: '10px 32px', background: 'rgba(224,53,83,0.04)',
        borderBottom: '1px solid rgba(224,53,83,0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: 12, color: '#E03553', fontFamily: PJS, fontWeight: 600 }}>
          ✨ This is pulled from your Transport planning page and is visible to guests
        </span>
        <button
          onClick={() => navigate('/transport')}
          style={{ fontSize: 12, fontWeight: 700, color: '#E03553', background: 'none', border: 'none', cursor: 'pointer', fontFamily: PJS, display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}
        >
          Edit in Transport <ArrowRight size={11} />
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
              <Car size={22} style={{ color: 'rgba(10,10,10,0.25)' }} />
            </div>
            <p style={{ fontSize: 15, fontWeight: 600, color: '#0A0A0A', fontFamily: PJS, margin: '0 0 8px' }}>
              No transport information added yet
            </p>
            <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.5)', fontFamily: PJS, margin: '0 0 24px', lineHeight: 1.6 }}>
              Add transport details in Day of → Transport and they'll appear here for guests.
            </p>
            <button
              onClick={() => navigate('/transport')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#E03553', background: 'none', border: '1px solid rgba(224,53,83,0.3)', borderRadius: 999, padding: '8px 18px', cursor: 'pointer', fontFamily: PJS }}
            >
              Add in Transport planning page <ArrowRight size={12} />
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

            {/* Couple's note + recommended mode */}
            {(transport?.coupleNote || transport?.recommendedMode) && (
              <div style={{ padding: '20px 24px', background: 'rgba(10,10,10,0.02)', border: '1px solid rgba(10,10,10,0.07)' }}>
                {transport.recommendedMode && (
                  <div style={{ marginBottom: transport.coupleNote ? 10 : 0 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)', fontFamily: PJS }}>Recommended</span>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS, margin: '4px 0 0' }}>
                      {MODE_LABELS[transport.recommendedMode] || transport.recommendedMode}
                    </p>
                  </div>
                )}
                {transport.coupleNote && (
                  <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.65)', fontFamily: PJS, margin: 0, lineHeight: 1.7 }}>
                    {transport.coupleNote}
                  </p>
                )}
              </div>
            )}

            {/* Shuttles */}
            {hasShuttles && (
              <div style={{ border: '1px solid rgba(10,10,10,0.07)', padding: '20px 24px' }}>
                <SectionHeading icon={Truck} label="Couple-arranged transport" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {shuttles.map((s, i) => (
                    <div key={s.id || i} style={{ padding: '14px 16px', background: 'rgba(10,10,10,0.02)', border: '1px solid rgba(10,10,10,0.06)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, gap: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS }}>
                          {s.name || `Transport ${i + 1}`}
                        </span>
                        {s.type && (
                          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', padding: '2px 8px', borderRadius: 999, background: 'rgba(10,10,10,0.07)', color: '#444444', fontFamily: PJS, flexShrink: 0 }}>
                            {SHUTTLE_TYPE_LABELS[s.type] || s.type}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <InfoRow label="Pickup location"  value={s.pickupLocation} />
                        <InfoRow label="Pickup time"      value={s.pickupTime} />
                        <InfoRow label="Drop-off location" value={s.dropoffLocation} />
                        <InfoRow label="Return time"       value={s.returnTime} />
                        <InfoRow label="Capacity"          value={s.capacity} />
                        <InfoRow label="Contact"           value={s.contact} />
                      </div>
                      {s.notes && (
                        <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, margin: '10px 0 0', lineHeight: 1.6, borderTop: '1px solid rgba(10,10,10,0.05)', paddingTop: 10 }}>
                          {s.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Parking */}
            {hasParking && (
              <div style={{ border: '1px solid rgba(10,10,10,0.07)', padding: '20px 24px' }}>
                <SectionHeading icon={Car} label="Parking" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {parking.venueParking && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', padding: '2px 8px', borderRadius: 999, background: '#D1FAE5', color: '#065F46', fontFamily: PJS }}>
                        Parking available at venue
                      </span>
                    </div>
                  )}
                  {parking.venueParkingNotes && (
                    <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.65)', fontFamily: PJS, margin: 0, lineHeight: 1.6 }}>
                      {parking.venueParkingNotes}
                    </p>
                  )}
                  {parking.streetParking && (
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: 'rgba(10,10,10,0.4)', fontFamily: PJS, margin: '0 0 4px' }}>Street parking</p>
                      <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.65)', fontFamily: PJS, margin: 0, lineHeight: 1.6 }}>{parking.streetParking}</p>
                    </div>
                  )}
                  {parking.accessibilityNotes && (
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: 'rgba(10,10,10,0.4)', fontFamily: PJS, margin: '0 0 4px' }}>Accessibility parking</p>
                      <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.65)', fontFamily: PJS, margin: 0, lineHeight: 1.6 }}>{parking.accessibilityNotes}</p>
                    </div>
                  )}
                  {parking.nearbyCarParks?.length > 0 && (
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: 'rgba(10,10,10,0.4)', fontFamily: PJS, margin: '0 0 8px' }}>Nearby car parks</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {parking.nearbyCarParks.map((cp, i) => (
                          <div key={i} style={{ padding: '10px 14px', border: '1px solid rgba(10,10,10,0.06)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                            {cp.name && <span style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A', fontFamily: PJS, gridColumn: '1/-1' }}>{cp.name}</span>}
                            {cp.address && <span style={{ fontSize: 12, color: 'rgba(10,10,10,0.55)', fontFamily: PJS }}>{cp.address}</span>}
                            <span style={{ fontSize: 12, color: 'rgba(10,10,10,0.55)', fontFamily: PJS, textAlign: 'right' }}>
                              {cp.distance && `${cp.distance}`}{cp.distance && cp.cost && ' · '}{cp.cost}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Public transport */}
            {hasPublicTransport && (
              <div style={{ border: '1px solid rgba(10,10,10,0.07)', padding: '20px 24px' }}>
                <SectionHeading icon={Bus} label="Public transport" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {pt.generalNotes && (
                    <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.65)', fontFamily: PJS, margin: 0, lineHeight: 1.7 }}>
                      {pt.generalNotes}
                    </p>
                  )}
                  {pt.routes?.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {pt.routes.map((route, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 14px', border: '1px solid rgba(10,10,10,0.06)', background: 'rgba(10,10,10,0.01)' }}>
                          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', padding: '2px 8px', borderRadius: 999, background: 'rgba(10,10,10,0.07)', color: '#444444', fontFamily: PJS, flexShrink: 0, alignSelf: 'flex-start', marginTop: 2 }}>
                            {ROUTE_LABELS[route.type] || route.type || 'Route'}
                          </span>
                          <div style={{ flex: 1 }}>
                            {route.notes && <p style={{ fontSize: 13, color: '#0A0A0A', fontFamily: PJS, margin: '0 0 2px', lineHeight: 1.5 }}>{route.notes}</p>}
                            {route.totalTime && <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.45)', fontFamily: PJS, margin: 0 }}>{route.totalTime}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Rideshare */}
            {hasRideshare && (
              <div style={{ border: '1px solid rgba(10,10,10,0.07)', padding: '20px 24px' }}>
                <SectionHeading icon={Car} label="Rideshare & taxi" />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <InfoRow label="Pickup location"  value={rs.pickupLocation} />
                  <InfoRow label="Drop-off location" value={rs.dropoffLocation} />
                  <InfoRow label="Late-night note"  value={rs.lateNightNote} />
                </div>
              </div>
            )}

            {/* Additional notes */}
            {transport?.freeTextNotes && (
              <div style={{ padding: '16px 20px', border: '1px solid rgba(10,10,10,0.07)' }}>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)', fontFamily: PJS, margin: '0 0 8px' }}>Notes</p>
                <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.65)', fontFamily: PJS, margin: 0, lineHeight: 1.7 }}>{transport.freeTextNotes}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
