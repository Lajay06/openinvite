import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ChevronLeft } from 'lucide-react';

export default function GuestTransport() {
  const { weddingSlug } = useParams();
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeMode, setActiveMode] = useState('shuttle');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const all = await base44.entities.WeddingDetails.filter({ slug: weddingSlug });
        if (all.length > 0) setDetails(all[0]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [weddingSlug]);

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFFFFF' }}>
      <div style={{ width: 24, height: 24, border: '2px solid #EEE', borderTopColor: '#E03553', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (!details) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFFFFF' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0A0A0A', marginBottom: 12 }}>Wedding not found</h1>
        <Link to="/" style={{ display: 'inline-block', marginTop: 24, padding: '12px 24px', background: '#0A0A0A', color: '#FFFFFF', textDecoration: 'none', fontSize: 13, fontWeight: 700 }}>← Back to Home</Link>
      </div>
    </div>
  );

  const transport = details.transport || {};
  const enabledModes = transport.enabledModes || ['shuttle', 'drive', 'rideshare'];

  const modeConfig = {
    shuttle: { label: 'Group Transport', icon: '🚌' },
    drive: { label: 'Driving', icon: '🚗' },
    park: { label: 'Parking', icon: '🅿️' },
    public: { label: 'Public Transport', icon: '🚆' },
    rideshare: { label: 'Rideshare', icon: '🚕' },
    walk: { label: 'Walking', icon: '👟' },
    hire: { label: 'Car Hire', icon: '🔑' },
  };

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Nav */}
      <div style={{ position: 'sticky', top: 0, zIndex: 100, height: 56, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #EEEEEE', display: 'flex', alignItems: 'center', padding: '0 16px' }}>
        <Link to={`/w/${weddingSlug}`} style={{ color: '#0A0A0A', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 600 }}>
          <ChevronLeft size={16} /> Back
        </Link>
        <p style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', fontSize: 14, fontWeight: 700, color: '#0A0A0A', margin: 0 }}>
          Getting Here
        </p>
      </div>

      {/* Hero */}
      <TransportHero details={details} />

      {/* AI banner */}
      {transport.aiAnalysis && (
        <div style={{ padding: '16px 24px', background: 'rgba(224,53,83,0.06)', borderBottom: '1px solid rgba(224,53,83,0.1)' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 14, color: '#E03553', flexShrink: 0 }}>✦</span>
            <p style={{ fontSize: 14, color: '#0A0A0A', lineHeight: 1.6, margin: 0, fontStyle: 'italic' }}>
              {transport.aiAnalysis.summary}
            </p>
          </div>
        </div>
      )}

      {/* Mode tabs */}
      <div style={{ position: 'sticky', top: 56, zIndex: 50, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #EEEEEE', display: 'flex', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {enabledModes.map(mode => (
          <button key={mode} onClick={() => setActiveMode(mode)} style={{
            padding: '14px 16px', background: 'transparent', border: 'none',
            borderBottom: `2px solid ${activeMode === mode ? '#0A0A0A' : 'transparent'}`,
            fontSize: 12, fontWeight: 600, color: activeMode === mode ? '#0A0A0A' : '#888',
            cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'Plus Jakarta Sans',
            minHeight: 48, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6,
          }}>
            {modeConfig[mode]?.icon} {modeConfig[mode]?.label}
            {mode === transport.recommendedMode && <span style={{ fontSize: 9, background: '#DDF762', color: '#0A0A0A', padding: '1px 6px', fontWeight: 700, borderRadius: 2 }}>Best</span>}
          </button>
        ))}
      </div>

      {/* Content */}
      <div>
        {transport.shuttles?.length > 0 && activeMode === 'shuttle' && (
          <ShuttleSection shuttles={transport.shuttles} />
        )}
        {activeMode === 'drive' && (
          <ParkingSection parking={transport.parking} />
        )}
        {activeMode === 'public' && (
          <PublicTransportSection publicTransport={transport.publicTransport} />
        )}
        {activeMode === 'rideshare' && (
          <RideshareSection transport={transport} venue={details?.mainCeremony} />
        )}
        {activeMode === 'park' && (
          <ParkingSection parking={transport.parking} />
        )}
      </div>

      {/* Additional notes */}
      {transport.freeTextNotes && (
        <div style={{ padding: '32px 24px', background: '#FAFAFA', borderTop: '1px solid #EEEEEE' }}>
          <div style={{ fontSize: 14, color: '#444', lineHeight: 1.8 }}>
            {transport.freeTextNotes.split('\n').map((line, i) => (
              <p key={i} style={{ margin: '0 0 8px' }}>{line}</p>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ padding: '60px 24px', background: '#0A0A0A', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: '#FFFFFF', margin: '0 0 16px', letterSpacing: '0.08em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          {details.couple1Name} & {details.couple2Name}
        </p>
        <Link to={`/w/${weddingSlug}`} style={{ display: 'inline-block', padding: '12px 24px', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: 12, fontWeight: 700, letterSpacing: '0.1em' }}>
          Back to Wedding Site
        </Link>
      </div>
    </div>
  );
}

function TransportHero({ details }) {
  const ceremonyAddr = details?.mainCeremony?.address;
  return (
    <div style={{ padding: '60px 24px 40px', background: '#0A0A0A' }}>
      <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 300, fontSize: 'clamp(32px, 8vw, 52px)', color: '#FFFFFF', margin: '0 0 16px', lineHeight: 1.1 }}>
        How to Get There
      </h1>
      <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, maxWidth: 520, margin: '0 0 24px' }}>
        {details?.transport?.coupleNote || "We've added the easiest ways to get around for the wedding weekend."}
      </p>

      {/* Venues */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[
          { label: 'Ceremony', name: details?.mainCeremony?.venueName, address: details?.mainCeremony?.address, time: details?.mainCeremony?.startTime },
          { label: 'Reception', name: details?.reception?.venueName, address: details?.reception?.address, time: details?.reception?.startTime },
        ].filter(l => l.name).map(loc => (
          <div key={loc.label} style={{ padding: '14px 18px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E03553" strokeWidth="2" style={{ flexShrink: 0 }}><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, color: '#FFFFFF', margin: 0, fontWeight: 600 }}>{loc.name}</p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', margin: 0 }}>{loc.address}</p>
            </div>
            <a href={`https://maps.google.com/?q=${encodeURIComponent(loc.address)}`} target="_blank" rel="noopener noreferrer" style={{ padding: '6px 12px', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}>
              Maps
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

function ShuttleSection({ shuttles }) {
  if (!shuttles?.length) return null;
  return (
    <div style={{ padding: '40px 24px', background: '#0A0A0A', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 300, fontSize: 'clamp(24px, 5vw, 36px)', color: '#FFFFFF', margin: '0 0 24px' }}>
        Group Transport
      </h2>
      {shuttles.map(shuttle => (
        <div key={shuttle.id} style={{ border: '1px solid rgba(255,255,255,0.1)', padding: '20px', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#DDF762" strokeWidth="1.8"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#FFFFFF', margin: 0 }}>{shuttle.name}</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            {[
              { label: 'Pickup', value: shuttle.pickupLocation },
              { label: 'Departs', value: shuttle.pickupTime },
              { label: 'Drop-off', value: shuttle.dropoffLocation },
              { label: 'Returns', value: shuttle.returnTime },
            ].filter(f => f.value).map(field => (
              <div key={field.label}>
                <p style={{ fontSize: 14, color: '#FFFFFF', margin: 0 }}>{field.value}</p>
              </div>
            ))}
          </div>
          {shuttle.notes && (
            <div style={{ background: 'rgba(255,255,255,0.04)', borderLeft: '2px solid #E03553', padding: '10px 14px' }}>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', fontStyle: 'italic', lineHeight: 1.6, margin: 0 }}>
                {shuttle.notes}
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ParkingSection({ parking }) {
  if (!parking) return null;
  return (
    <div style={{ padding: '40px 24px', borderBottom: '1px solid #EEEEEE' }}>
      <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 300, fontSize: 'clamp(24px, 5vw, 36px)', color: '#0A0A0A', margin: '0 0 24px' }}>Where to Park</h2>

      {/* Venue parking */}
      <div style={{ padding: '14px 18px', border: '1px solid #EEEEEE', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{ width: 32, height: 32, background: parking.venueParking ? '#DDF762' : '#F0F0F0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={parking.venueParking ? '#0A0A0A' : '#888'} strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9 17V7h4a3 3 0 0 1 0 6H9"/></svg>
        </div>
        <div>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#0A0A0A', margin: 0 }}>
            {parking.venueParking ? 'Parking available at venue' : 'No parking at venue'}
          </p>
          {parking.venueParkingNotes && <p style={{ fontSize: 13, color: '#666', margin: 0 }}>{parking.venueParkingNotes}</p>}
        </div>
      </div>

      {/* Nearby car parks */}
      {parking.nearbyCarParks?.map((cp, i) => (
        <div key={i} style={{ padding: '14px 18px', border: '1px solid #EEEEEE', marginBottom: 8 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#0A0A0A', margin: '0 0 2px' }}>{cp.name}</p>
          <p style={{ fontSize: 12, color: '#888', margin: '0 0 4px' }}>{cp.address}</p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {cp.distance && <span style={{ fontSize: 11, color: '#555' }}>{cp.distance} walk</span>}
            {cp.cost && <span style={{ fontSize: 11, color: '#555' }}>{cp.cost}</span>}
          </div>
        </div>
      ))}

      {parking.streetParking && (
        <div style={{ padding: '12px 16px', background: '#FAFAFA', border: '1px solid #EEEEEE', marginTop: 12 }}>
          <p style={{ fontSize: 13, color: '#555', margin: 0, lineHeight: 1.5 }}>{parking.streetParking}</p>
        </div>
      )}
    </div>
  );
}

function PublicTransportSection({ publicTransport }) {
  if (!publicTransport?.routes?.length) return null;
  const icons = { train: '🚆', bus: '🚌', tram: '🚃', metro: '🚇' };
  return (
    <div style={{ padding: '40px 24px', borderBottom: '1px solid #EEEEEE' }}>
      <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 300, fontSize: 'clamp(24px, 5vw, 36px)', color: '#0A0A0A', margin: '0 0 24px' }}>By Train, Bus & Tram</h2>

      {publicTransport.routes.map((route, i) => (
        <div key={i} style={{ padding: '16px 18px', border: '1px solid #EEEEEE', marginBottom: 10, display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <div style={{ width: 36, height: 36, background: '#F5F5F5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
            {icons[route.type] || '🚌'}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 14, color: '#0A0A0A', margin: '0 0 4px', lineHeight: 1.5 }}>{route.notes}</p>
            {route.totalTime && <p style={{ fontSize: 12, color: '#888', margin: 0 }}>{route.totalTime}</p>}
          </div>
        </div>
      ))}

      {publicTransport.generalNotes && (
        <div style={{ padding: '12px 16px', background: '#FAFAFA', border: '1px solid #EEEEEE', marginTop: 12 }}>
          <p style={{ fontSize: 13, color: '#555', margin: 0, lineHeight: 1.6 }}>{publicTransport.generalNotes}</p>
        </div>
      )}
    </div>
  );
}

function RideshareSection({ transport, venue }) {
  const rs = transport?.rideshare;
  const openUber = () => {
    const addr = encodeURIComponent(venue?.address || '');
    window.location.href = `https://m.uber.com/?action=setPickup&dropoff[formatted_address]=${addr}`;
  };

  return (
    <div style={{ padding: '40px 24px', borderBottom: '1px solid #EEEEEE' }}>
      <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 300, fontSize: 'clamp(24px, 5vw, 36px)', color: '#0A0A0A', margin: '0 0 24px' }}>Get an Uber</h2>

      {rs?.pickupLocation && (
        <div style={{ padding: '12px 16px', background: '#FAFAFA', border: '1px solid #EEEEEE', marginBottom: 16 }}>
          <p style={{ fontSize: 14, color: '#0A0A0A', margin: 0 }}>{rs.pickupLocation}</p>
        </div>
      )}

      {rs?.lateNightNote && (
        <div style={{ padding: '12px 16px', background: 'rgba(224,53,83,0.04)', borderLeft: '2px solid #E03553', marginBottom: 20 }}>
          <p style={{ fontSize: 13, color: '#555', fontStyle: 'italic', margin: 0, lineHeight: 1.5 }}>{rs.lateNightNote}</p>
        </div>
      )}

      <button onClick={openUber} style={{ width: '100%', padding: '16px', background: '#0A0A0A', color: '#FFFFFF', border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Plus Jakarta Sans', minHeight: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        Open Uber
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
      </button>
      <p style={{ fontSize: 11, color: '#AAAAAA', textAlign: 'center', marginTop: 8 }}>Opens the Uber app or website</p>
    </div>
  );
}