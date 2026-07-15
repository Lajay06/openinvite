import React, { useState, useEffect } from 'react';
import { X, MapPin, Globe, Phone, Star, ExternalLink, Bookmark, Loader2, Map as MapIcon } from 'lucide-react';

const PJS = "'Plus Jakarta Sans', sans-serif";

const TABS = ['About', 'Reviews', 'Contact'];

// Session-level cache — reopening the same vendor's profile doesn't re-hit
// place-details (rate-limited 40/min server-side, but no reason to spend it twice).
const detailsCache = new Map();

function StarRow({ rating, size = 13 }) {
  return (
    <span style={{ display: 'inline-flex', gap: 2 }}>
      {[1,2,3,4,5].map(n => (
        <Star key={n} size={size}
          style={{ color: n <= Math.round(rating) ? '#F59E0B' : 'rgba(10,10,10,0.15)',
            fill: n <= Math.round(rating) ? '#F59E0B' : 'transparent' }} />
      ))}
    </span>
  );
}

function AboutTab({ vendor, details }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {vendor.location && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <MapPin size={14} style={{ color: 'rgba(10,10,10,0.4)', marginTop: 2, flexShrink: 0 }} />
          <span style={{ fontSize: 14, color: 'rgba(10,10,10,0.7)', fontFamily: PJS, lineHeight: 1.6 }}>{vendor.location}</span>
        </div>
      )}
      {details?.types?.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)', fontFamily: PJS, marginBottom: 8 }}>Listed as</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {details.types.filter(t => !['point_of_interest', 'establishment'].includes(t)).slice(0, 6).map(t => (
              <span key={t} style={{ fontSize: 12, color: '#0A0A0A', background: 'rgba(10,10,10,0.06)', padding: '4px 10px', borderRadius: 999, fontFamily: PJS }}>{t.replace(/_/g, ' ')}</span>
            ))}
          </div>
        </div>
      )}
      <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.35)', fontFamily: PJS, lineHeight: 1.6 }}>
        Details sourced from Google Places. Reach out directly to discuss availability and pricing for your wedding.
      </p>
    </div>
  );
}

function ReviewsTab({ vendor, details }) {
  const reviews = details?.reviews || [];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <div style={{ fontSize: 40, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS, letterSpacing: '-0.03em', lineHeight: 1 }}>
          {vendor.rating != null ? vendor.rating : '—'}
        </div>
        <div>
          {vendor.rating != null && <StarRow rating={vendor.rating} size={15} />}
          <div style={{ fontSize: 12, color: 'rgba(10,10,10,0.4)', fontFamily: PJS, marginTop: 4 }}>{vendor.reviewCount || 0} Google reviews</div>
        </div>
      </div>

      {reviews.length === 0 ? (
        <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.4)', fontFamily: PJS }}>No review snippets available from Google for this listing.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {reviews.map((r, i) => (
            <div key={i} style={{ borderBottom: '1px solid rgba(10,10,10,0.06)', paddingBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS }}>{r.author_name}</div>
                  <div style={{ fontSize: 11, color: 'rgba(10,10,10,0.4)', fontFamily: PJS }}>{r.relative_time_description}</div>
                </div>
                {r.rating != null && <StarRow rating={r.rating} size={11} />}
              </div>
              <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.7)', fontFamily: PJS, lineHeight: 1.6 }}>{r.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ContactTab({ vendor, details, onSave, isSaved }) {
  const website = details?.website;
  const phone = details?.phone;
  const mapsUrl = details?.mapsUrl || vendor.mapsUrl;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {website && (
          <a href={website} target="_blank" rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#0A0A0A', fontFamily: PJS, textDecoration: 'none' }}
            onMouseEnter={e => e.currentTarget.style.color = '#E03553'}
            onMouseLeave={e => e.currentTarget.style.color = '#0A0A0A'}>
            <Globe size={14} style={{ color: 'rgba(10,10,10,0.4)' }} />
            {website}
            <ExternalLink size={11} style={{ color: 'rgba(10,10,10,0.3)' }} />
          </a>
        )}
        {phone && (
          <a href={`tel:${phone}`} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#0A0A0A', fontFamily: PJS, textDecoration: 'none' }}
            onMouseEnter={e => e.currentTarget.style.color = '#E03553'}
            onMouseLeave={e => e.currentTarget.style.color = '#0A0A0A'}>
            <Phone size={14} style={{ color: 'rgba(10,10,10,0.4)' }} />
            {phone}
          </a>
        )}
        {mapsUrl && (
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#0A0A0A', fontFamily: PJS, textDecoration: 'none' }}
            onMouseEnter={e => e.currentTarget.style.color = '#E03553'}
            onMouseLeave={e => e.currentTarget.style.color = '#0A0A0A'}>
            <MapIcon size={14} style={{ color: 'rgba(10,10,10,0.4)' }} />
            View on Google Maps
            <ExternalLink size={11} style={{ color: 'rgba(10,10,10,0.3)' }} />
          </a>
        )}
        {!website && !phone && !mapsUrl && (
          <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.4)', fontFamily: PJS }}>No contact details available from Google for this listing.</p>
        )}
      </div>

      <div style={{ borderTop: '1px solid rgba(10,10,10,0.08)', paddingTop: 20 }}>
        <button
          onClick={() => onSave(vendor)}
          disabled={isSaved}
          style={{ width: '100%', padding: '10px 0', borderRadius: 999, fontSize: 12, fontWeight: 700, fontFamily: PJS, cursor: isSaved ? 'default' : 'pointer', border: '1.5px solid rgba(10,10,10,0.15)', background: 'none', color: isSaved ? '#10B981' : '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
        >
          <Bookmark size={13} style={{ fill: isSaved ? '#10B981' : 'transparent', color: isSaved ? '#10B981' : '#0A0A0A' }} />
          {isSaved ? 'Saved to my vendors' : 'Save to my vendors'}
        </button>
      </div>
    </div>
  );
}

export default function VendorProfileModal({ vendor, onClose, onSave, isSaved }) {
  const [tab, setTab] = useState('About');
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [photoFailed, setPhotoFailed] = useState(false);

  useEffect(() => {
    if (!vendor.placeId) return;
    const cached = detailsCache.get(vendor.placeId);
    if (cached) { setDetails(cached); return; }

    let cancelled = false;
    setLoading(true);
    fetch(`/api/place-details?place_id=${encodeURIComponent(vendor.placeId)}`)
      .then(res => res.json())
      .then(data => {
        if (cancelled) return;
        if (data.place) detailsCache.set(vendor.placeId, data.place);
        setDetails(data.place || null);
      })
      .catch(() => { if (!cancelled) setDetails(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [vendor.placeId]);

  const photoRef = details?.photo_reference || vendor.photoReference;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 24, overflowY: 'auto' }}>
      <div style={{ background: '#FFFFFF', width: '100%', maxWidth: 680, maxHeight: '90vh', overflowY: 'auto', fontFamily: PJS }}>
        {/* Cover */}
        <div style={{ height: 140, position: 'relative', background: photoRef && !photoFailed ? undefined : 'linear-gradient(135deg, rgba(224,53,83,0.15), rgba(147,51,234,0.12))' }}>
          {photoRef && !photoFailed && (
            <img
              src={`/api/places-photo?ref=${encodeURIComponent(photoRef)}&maxwidth=800`}
              alt={vendor.name}
              onError={() => setPhotoFailed(true)}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          )}
          <button onClick={onClose}
            style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(255,255,255,0.9)', border: 'none', cursor: 'pointer', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0A0A0A' }}>
            <X size={16} />
          </button>
        </div>

        {/* Vendor identity */}
        <div style={{ padding: '20px 28px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#0A0A0A', letterSpacing: '-0.02em' }}>{vendor.name}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#E03553', background: 'rgba(224,53,83,0.1)', padding: '2px 9px', borderRadius: 999 }}>{vendor.category}</span>
                {vendor.location && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'rgba(10,10,10,0.5)' }}>
                    <MapPin size={11} />
                    {vendor.location}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                {vendor.rating != null && (
                  <>
                    <StarRow rating={vendor.rating} size={13} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A' }}>{vendor.rating}</span>
                    <span style={{ fontSize: 12, color: 'rgba(10,10,10,0.4)' }}>({vendor.reviewCount} reviews)</span>
                  </>
                )}
                {vendor.priceRange && <span style={{ fontSize: 14, fontWeight: 700, color: '#0A0A0A', marginLeft: 4 }}>{vendor.priceRange}</span>}
              </div>
            </div>
            {loading && <Loader2 size={16} className="animate-spin" style={{ color: 'rgba(10,10,10,0.3)' }} />}
          </div>

          {/* Tab bar */}
          <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
            {TABS.map(t => (
              <button key={t} onClick={() => setTab(t)}
                style={{ padding: '10px 16px', fontSize: 13, fontWeight: tab === t ? 700 : 500, fontFamily: PJS, cursor: 'pointer', border: 'none', background: 'none', color: tab === t ? '#0A0A0A' : 'rgba(10,10,10,0.45)', borderBottom: tab === t ? '2px solid #0A0A0A' : '2px solid transparent', marginBottom: -1 }}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div style={{ padding: '24px 28px 32px' }}>
          {tab === 'About' && <AboutTab vendor={vendor} details={details} />}
          {tab === 'Reviews' && <ReviewsTab vendor={vendor} details={details} />}
          {tab === 'Contact' && <ContactTab vendor={vendor} details={details} onSave={onSave} isSaved={isSaved} />}
        </div>
      </div>
    </div>
  );
}
