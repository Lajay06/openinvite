import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchWeddingBySlug } from '@/lib/weddingBySlug';
import { ChevronLeft } from 'lucide-react';

export default function GuestAccommodation() {
  const { weddingSlug } = useParams();
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [hotels, setHotels] = useState([]);
  const [loadingHotels, setLoadingHotels] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const wedding = await fetchWeddingBySlug(weddingSlug);
        if (wedding) {
          setDetails(wedding);
          // Load partner results if enabled
          if (wedding.accommodation?.partnerRecommendationsEnabled) {
            loadPartnerResults(wedding);
          }
        }
      } catch (err) {
        console.error('Failed to fetch wedding details:', err);
      }
      setLoading(false);
    };
    fetchData();
  }, [weddingSlug]);

  const loadPartnerResults = async (weddingDetails) => {
    setLoadingHotels(true);
    try {
      // Placeholder - would call Booking.com/Expedia via MCP
      setHotels([
        { id: 'h1', name: 'Sample Hotel', source: 'booking', image: '', guestRating: 8.5, reviewCount: 234, pricePerNight: '$180', distanceFromVenue: '1.2km', uberTime: '5 mins', amenities: ['WiFi', 'Parking'], freeCancellation: true, bookingUrl: '#', aiSummary: 'Great for guests who want to be close to the ceremony.' },
      ]);
    } finally {
      setLoadingHotels(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFFFFF' }}>
        <div style={{ width: 24, height: 24, border: '2px solid #EEE', borderTopColor: '#E03553', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!details) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFFFFF' }}>
        <div style={{ textAlign: 'center', padding: 40 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0A0A0A', marginBottom: 12 }}>Wedding not found</h1>
          <Link to="/" style={{ display: 'inline-block', marginTop: 24, padding: '12px 24px', background: '#0A0A0A', color: '#FFFFFF', textDecoration: 'none', fontSize: 13, fontWeight: 700, fontFamily: 'Plus Jakarta Sans' }}>← Back to Home</Link>
        </div>
      </div>
    );
  }

  const manualProperties = details.accommodation?.manualProperties || [];
  const curatedPlaces   = details.guestSuiteAccommodation?.places || [];
  const city = details.mainCeremony?.address?.split(',').slice(-3, -1).join(',').trim() || 'the area';
  const PJS = "'Plus Jakarta Sans', sans-serif";

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF', fontFamily: PJS }}>
      {/* Nav bar */}
      <div style={{ position: 'sticky', top: 0, zIndex: 100, height: 56, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #EEEEEE', display: 'flex', alignItems: 'center', padding: '0 16px' }}>
        <Link to={`/w/${weddingSlug}`} style={{ color: '#0A0A0A', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 600 }}>
          <ChevronLeft size={16} /> Back
        </Link>
        <p style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', fontSize: 14, fontWeight: 700, color: '#0A0A0A', margin: 0 }}>
          Where to Stay
        </p>
      </div>

      {/* Hero */}
      <AccommodationHero details={details} city={city} />

      {/* Curated places from Guest Suite editor */}
      {curatedPlaces.length > 0 && (
        <div style={{ padding: '40px 24px 0' }}>
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.6)', margin: '0 0 4px', fontFamily: PJS }}>
              Our picks
            </p>
            <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 'clamp(20px, 4vw, 26px)', color: '#0A0A0A', margin: 0 }}>
              Recommended places to stay
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
            {curatedPlaces.map((place, i) => (
              <div key={place.id || place.place_id || i} style={{ border: '1px solid rgba(10,10,10,0.08)', overflow: 'hidden', background: '#FFFFFF' }}>
                <div style={{ height: 170, background: '#F5F5F5', position: 'relative', overflow: 'hidden' }}>
                  {place.photo_url ? (
                    <img src={place.photo_url} alt={place.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onError={e => { e.target.style.display = 'none'; }} />
                  ) : (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 28, opacity: 0.15 }}>🏨</span>
                    </div>
                  )}
                  {place.badge && (
                    <span style={{ position: 'absolute', top: 10, left: 10, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: '#E03553', color: '#FFF', fontFamily: PJS }}>
                      {place.badge}
                    </span>
                  )}
                </div>
                <div style={{ padding: '12px 14px' }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#0A0A0A', margin: '0 0 4px', fontFamily: PJS, lineHeight: 1.3 }}>{place.name}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                    {place.rating && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: '#0A0A0A', fontFamily: PJS }}>
                        ⭐ {place.rating}
                      </span>
                    )}
                    {place.price_level > 0 && (
                      <span style={{ fontSize: 11, color: 'rgba(10,10,10,0.6)', fontFamily: PJS }}>{'$'.repeat(place.price_level)}</span>
                    )}
                    {place.address && (
                      <span style={{ fontSize: 11, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>{place.address}</span>
                    )}
                  </div>
                  {place.note && (
                    <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.55)', margin: '0 0 8px', fontFamily: PJS, fontStyle: 'italic', lineHeight: 1.5 }}>"{place.note}"</p>
                  )}
                  {place.maps_url && (
                    <a href={place.maps_url} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS, textDecoration: 'none' }}>
                      View on maps →
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <AccommodationFilters filter={filter} onChange={setFilter} />

      {/* Couple's Picks from planning page */}
      {manualProperties.length > 0 && (
        <CouplePicksSection properties={manualProperties} details={details} />
      )}

      {/* Partner Results */}
      {details.accommodation?.partnerRecommendationsEnabled && (
        <div style={{ padding: '48px 24px 0' }}>
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.6)', margin: '0 0 6px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Partner Hotels
            </p>
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 300, fontSize: 'clamp(24px, 5vw, 36px)', color: '#0A0A0A', margin: 0 }}>
              More Places to Stay
            </h2>
          </div>

          {loadingHotels ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[1, 2, 3].map(i => <SkeletonAccommodationCard key={i} />)}
            </div>
          ) : hotels.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {hotels.map(hotel => (
                <AccommodationCard key={hotel.id} hotel={hotel} venue={details.mainCeremony?.address} />
              ))}
            </div>
          ) : (
            <AccommodationFallback details={details} />
          )}
        </div>
      )}

      {/* Footer */}
      <div style={{ padding: '60px 24px', background: '#F8F7F5', textAlign: 'center', borderTop: '1px solid #EEEEEE' }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: '#0A0A0A', margin: '0 0 16px', letterSpacing: '0.08em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          {details.couple1Name} & {details.couple2Name}
        </p>
        <Link to={`/w/${weddingSlug}`} style={{ display: 'inline-block', padding: '12px 24px', border: '1px solid #DDD', color: '#555', textDecoration: 'none', fontSize: 12, fontWeight: 700, fontFamily: 'Plus Jakarta Sans', letterSpacing: '0.1em' }}>
          Back to Wedding Site
        </Link>
      </div>
    </div>
  );
}

function AccommodationHero({ details, city }) {
  return (
    <div style={{ padding: '60px 24px 40px', background: '#F8F7F5' }}>
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.6)', margin: '0 0 8px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        Where to Stay
      </p>
      <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 300, fontSize: 'clamp(32px, 8vw, 52px)', color: '#0A0A0A', margin: '0 0 16px', lineHeight: 1.1 }}>
        Staying in {city}
      </h1>
      {details?.accommodation?.coupleNote ? (
        <p style={{ fontSize: 15, color: '#555', lineHeight: 1.7, maxWidth: 560, margin: '0 0 32px', fontFamily: 'Plus Jakarta Sans' }}>
          {details.accommodation.coupleNote}
        </p>
      ) : (
        <p style={{ fontSize: 15, color: '#555', lineHeight: 1.7, maxWidth: 560, margin: '0 0 32px', fontFamily: 'Plus Jakarta Sans' }}>
          We've gathered a few nearby places to stay so you can find something that works for your weekend.
        </p>
      )}

      {details?.accommodation?.checkInDate && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 16, padding: '12px 20px', border: '1px solid #EEEEEE', background: '#FFFFFF' }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#0A0A0A', margin: 0, fontFamily: 'Plus Jakarta Sans' }}>
              {new Date(details.accommodation.checkInDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
            </p>
          </div>
          <div style={{ width: 1, height: 32, background: '#EEEEEE' }} />
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#0A0A0A', margin: 0, fontFamily: 'Plus Jakarta Sans' }}>
              {new Date(details.accommodation.checkOutDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function AccommodationFilters({ filter, onChange }) {
  const filters = [
    { key: 'all', label: 'All' },
    { key: 'closest', label: 'Closest to Venue' },
    { key: 'value', label: 'Best Value' },
    { key: 'family', label: 'Families' },
    { key: 'groups', label: 'Groups' },
    { key: 'premium', label: 'Premium' },
  ];

  return (
    <div style={{ position: 'sticky', top: 56, zIndex: 50, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #EEEEEE', overflowX: 'auto', display: 'flex', gap: 0, WebkitOverflowScrolling: 'touch' }}>
      {filters.map(f => (
        <button
          key={f.key}
          onClick={() => onChange(f.key)}
          style={{
            padding: '12px 16px', background: 'transparent', border: 'none',
            borderBottom: `2px solid ${filter === f.key ? '#0A0A0A' : 'transparent'}`,
            fontSize: 12, fontWeight: 600, color: filter === f.key ? '#0A0A0A' : '#888',
            cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'Plus Jakarta Sans', minHeight: 48, flexShrink: 0,
          }}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}

function CouplePicksSection({ properties, details }) {
  const pinned = properties.filter(p => p.isPinned || p.isMainGuestHotel);
  const rest = properties.filter(p => !p.isPinned && !p.isMainGuestHotel);

  return (
    <div style={{ padding: '48px 24px 0' }}>
      {pinned.length > 0 && (
        <>
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.6)', margin: '0 0 6px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {details?.couple1Name} & {details?.couple2Name} Recommend
            </p>
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 300, fontSize: 'clamp(24px, 5vw, 36px)', color: '#0A0A0A', margin: 0 }}>
              Where to Stay
            </h2>
          </div>

          {properties.find(p => p.isMainGuestHotel) && (
            <FeaturedPropertyCard property={properties.find(p => p.isMainGuestHotel)} />
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
            {pinned.filter(p => !p.isMainGuestHotel).map(p => <ManualPropertyGuestCard key={p.id} property={p} />)}
          </div>
        </>
      )}

      {rest.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {rest.map(p => <ManualPropertyGuestCard key={p.id} property={p} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function FeaturedPropertyCard({ property }) {
  return (
    <div style={{ border: '2px solid #E03553', overflow: 'hidden', marginBottom: 12 }}>
      {property.photoUrl && <img src={property.photoUrl} alt={property.name} style={{ width: '100%', height: 240, objectFit: 'cover' }} />}
      <div style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        </div>
        <h3 style={{ fontSize: 20, fontWeight: 700, color: '#0A0A0A', margin: '0 0 8px', fontFamily: 'Plus Jakarta Sans' }}>{property.name}</h3>
        <p style={{ fontSize: 13, color: '#888', margin: '0 0 12px', fontFamily: 'Plus Jakarta Sans' }}>{property.address}</p>
        {property.coupleNote && (
          <div style={{ background: 'rgba(224,53,83,0.04)', borderLeft: '2px solid #E03553', padding: '10px 14px', marginBottom: 14 }}>
            <p style={{ fontSize: 13, color: '#555', fontStyle: 'italic', margin: 0, lineHeight: 1.5, fontFamily: 'Plus Jakarta Sans' }}>"{property.coupleNote}"</p>
          </div>
        )}
        {property.bookingCode && (
          <div style={{ background: '#FAFAFA', border: '1px dashed #DDD', padding: '10px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#0A0A0A', margin: 0, fontFamily: 'monospace' }}>{property.bookingCode}</p>
            </div>
          </div>
        )}
        <a href={property.website || '#'} target="_blank" style={{ display: 'block', padding: '14px', background: 'linear-gradient(135deg, #E03553, #803D81)', color: '#FFFFFF', textAlign: 'center', fontSize: 13, fontWeight: 700, textDecoration: 'none', fontFamily: 'Plus Jakarta Sans' }}>
          Visit Website
        </a>
      </div>
    </div>
  );
}

function ManualPropertyGuestCard({ property }) {
  return (
    <div style={{ border: '1px solid #EEEEEE', overflow: 'hidden' }}>
      {property.photoUrl && <img src={property.photoUrl} alt={property.name} style={{ width: '100%', height: 180, objectFit: 'cover' }} />}
      <div style={{ padding: '16px 20px' }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0A0A0A', margin: '0 0 6px', fontFamily: 'Plus Jakarta Sans' }}>{property.name}</h3>
        <p style={{ fontSize: 13, color: '#888', margin: '0 0 12px', fontFamily: 'Plus Jakarta Sans' }}>{property.address}</p>
        {property.tags?.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            {property.tags.map(tag => (
              <span key={tag} style={{ padding: '3px 8px', background: '#F5F5F5', fontSize: 11, color: '#555', fontFamily: 'Plus Jakarta Sans' }}>{tag}</span>
            ))}
          </div>
        )}
        {property.coupleNote && (
          <div style={{ background: 'rgba(224,53,83,0.04)', borderLeft: '2px solid #E03553', padding: '8px 12px', marginBottom: 12 }}>
            <p style={{ fontSize: 12, color: '#555', fontStyle: 'italic', margin: 0, lineHeight: 1.5, fontFamily: 'Plus Jakarta Sans' }}>"{property.coupleNote}"</p>
          </div>
        )}
        {property.website && (
          <a href={property.website} target="_blank" style={{ display: 'block', padding: '12px', border: '1px solid #0A0A0A', color: '#0A0A0A', textAlign: 'center', fontSize: 12, fontWeight: 700, textDecoration: 'none', fontFamily: 'Plus Jakarta Sans' }}>
            Visit Website
          </a>
        )}
      </div>
    </div>
  );
}

function AccommodationCard({ hotel, venue }) {
  return (
    <div style={{ background: '#FFFFFF', border: '1px solid #EEEEEE', overflow: 'hidden' }}>
      <div style={{ position: 'relative', height: 200, background: '#F0F0F0' }}>
        {hotel.image && <img src={hotel.image} alt={hotel.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />}
        <div style={{ position: 'absolute', bottom: 12, left: 12, background: 'rgba(0,0,0,0.65)', padding: '3px 8px' }}>
          <p style={{ fontSize: 10, color: '#FFFFFF', fontWeight: 700, margin: 0, letterSpacing: '0.05em', fontFamily: 'Plus Jakarta Sans' }}>
            {hotel.source === 'booking' ? 'Booking.com' : 'Expedia'}
          </p>
        </div>
        {hotel.badge && (
          <div style={{ position: 'absolute', top: 12, left: 12, background: '#DDF762', padding: '3px 10px' }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#0A0A0A', margin: 0, fontFamily: 'Plus Jakarta Sans' }}>{hotel.badge}</p>
          </div>
        )}
      </div>

      <div style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8, gap: 8 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0A0A0A', margin: 0, fontFamily: 'Plus Jakarta Sans', lineHeight: 1.3, flex: 1 }}>{hotel.name}</h3>
          {hotel.guestRating && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
              <div style={{ background: '#0A0A0A', padding: '4px 8px' }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF', margin: 0 }}>{hotel.guestRating}</p>
              </div>
            </div>
          )}
        </div>

        {hotel.aiSummary && (
          <p style={{ fontSize: 13, color: '#555', fontStyle: 'italic', lineHeight: 1.6, margin: '0 0 12px', fontFamily: 'Plus Jakarta Sans' }}>{hotel.aiSummary}</p>
        )}

        <div style={{ display: 'flex', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
          {hotel.distanceFromVenue && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
              <p style={{ fontSize: 12, color: '#666', margin: 0, fontFamily: 'Plus Jakarta Sans' }}>{hotel.distanceFromVenue}</p>
            </div>
          )}
          {hotel.uberTime && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.8"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
              <p style={{ fontSize: 12, color: '#666', margin: 0, fontFamily: 'Plus Jakarta Sans' }}>{hotel.uberTime}</p>
            </div>
          )}
        </div>

        {hotel.amenities?.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
            {hotel.amenities.slice(0, 4).map(a => (
              <span key={a} style={{ padding: '3px 8px', background: '#F5F5F5', fontSize: 11, color: '#555', fontFamily: 'Plus Jakarta Sans' }}>{a}</span>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            {hotel.pricePerNight && (
              <p style={{ fontSize: 18, fontWeight: 700, color: '#0A0A0A', margin: 0, fontFamily: 'Plus Jakarta Sans' }}>
                {hotel.pricePerNight} <span style={{ fontSize: 12, fontWeight: 400, color: '#888' }}>/ night</span>
              </p>
            )}
            {hotel.freeCancellation && (
              <p style={{ fontSize: 11, color: '#22C55E', fontWeight: 600, margin: '2px 0 0', fontFamily: 'Plus Jakarta Sans' }}>Free cancellation</p>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <a href={hotel.bookingUrl} target="_blank" style={{ padding: '12px', background: 'linear-gradient(135deg, #E03553, #803D81)', color: '#FFFFFF', textAlign: 'center', fontSize: 12, fontWeight: 700, textDecoration: 'none', fontFamily: 'Plus Jakarta Sans', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            View Deal
          </a>
          <a href={hotel.bookingUrl} target="_blank" style={{ padding: '12px', border: '1px solid #0A0A0A', color: '#0A0A0A', textAlign: 'center', fontSize: 12, fontWeight: 700, textDecoration: 'none', fontFamily: 'Plus Jakarta Sans', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            Book Stay
          </a>
        </div>

        <p style={{ fontSize: 10, color: '#AAAAAA', marginTop: 8, lineHeight: 1.5, fontFamily: 'Plus Jakarta Sans' }}>
          Bookings are completed through our accommodation partners. Availability and pricing may change.
        </p>
      </div>
    </div>
  );
}

function SkeletonAccommodationCard() {
  return (
    <div style={{ border: '1px solid #EEEEEE', overflow: 'hidden' }}>
      <div style={{ height: 200, background: 'linear-gradient(90deg, #F5F5F5 25%, #EEEEEE 50%, #F5F5F5 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
      <style>{`@keyframes shimmer { from { background-position: -200% 0; } to { background-position: 200% 0; } }`}</style>
      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ height: 16, background: '#F0F0F0', width: '70%' }} />
        <div style={{ height: 12, background: '#F5F5F5', width: '90%' }} />
        <div style={{ height: 12, background: '#F5F5F5', width: '60%' }} />
      </div>
    </div>
  );
}

function AccommodationFallback({ details }) {
  return (
    <div style={{ padding: '40px 24px', textAlign: 'center' }}>
      <p style={{ fontSize: 14, color: '#888', lineHeight: 1.6, maxWidth: 400, margin: '0 auto 24px', fontFamily: 'Plus Jakarta Sans' }}>
        We couldn't load live accommodation results right now. Here are the places we've personally recommended:
      </p>
      {details?.accommodation?.manualProperties?.map(p => (
        <ManualPropertyGuestCard key={p.id} property={p} />
      ))}
      {!details?.accommodation?.manualProperties?.length && (
        <p style={{ fontSize: 14, color: '#AAAAAA', fontFamily: 'Plus Jakarta Sans' }}>
          Accommodation recommendations coming soon.
        </p>
      )}
    </div>
  );
}