import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Star, ExternalLink, Hotel } from 'lucide-react';

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6, delay },
});

export default function WeddingStayPage({ weddingDetails, theme, typography }) {
  const places = weddingDetails.guestSuiteAccommodation?.places || [];
  // Also show legacy manual properties if no curated places
  const legacy = weddingDetails.accommodation?.manualProperties || [];
  const accom  = weddingDetails.accommodation || {};

  const heading = {
    fontFamily: typography.headingFont,
    fontWeight: typography.headingWeight,
    fontStyle: typography.headingStyle || 'normal',
    color: theme.lightText,
  };

  const body = {
    fontFamily: typography.bodyFont,
    fontSize: '0.9375rem',
    lineHeight: 1.7,
    color: theme.lightText,
    opacity: 0.8,
  };

  const card = {
    backgroundColor: theme.darkBg,
    borderRadius: 4,
    overflow: 'hidden',
  };

  const label = {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.1em',
    color: theme.accent,
    fontFamily: typography.bodyFont,
  };

  return (
    <div style={{ backgroundColor: theme.lightBg, minHeight: '100vh', padding: '60px 24px' }}>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>

        {/* Page title */}
        <motion.h1 {...fadeUp()} style={{ ...heading, fontSize: 'clamp(2rem,5vw,3.5rem)', textAlign: 'center', marginBottom: 16 }}>
          Where to stay
        </motion.h1>

        {accom.coupleNote && (
          <motion.p {...fadeUp(0.06)} style={{ ...body, textAlign: 'center', maxWidth: 560, margin: '0 auto 48px' }}>
            {accom.coupleNote}
          </motion.p>
        )}

        {!accom.coupleNote && (
          <motion.p {...fadeUp(0.06)} style={{ ...body, textAlign: 'center', maxWidth: 560, margin: '0 auto 48px' }}>
            We've curated a few great places to stay so you can find something that suits your style and budget.
          </motion.p>
        )}

        {/* Check-in / check-out dates */}
        {(accom.checkInDate || accom.checkOutDate) && (
          <motion.div {...fadeUp(0.1)} style={{ display: 'flex', justifyContent: 'center', gap: 32, marginBottom: 48 }}>
            {accom.checkInDate && (
              <div style={{ textAlign: 'center' }}>
                <p style={{ ...label, marginBottom: 4 }}>Check in</p>
                <p style={{ ...heading, fontSize: '1.25rem', margin: 0 }}>
                  {new Date(accom.checkInDate + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}
                </p>
              </div>
            )}
            {accom.checkOutDate && (
              <div style={{ textAlign: 'center' }}>
                <p style={{ ...label, marginBottom: 4 }}>Check out</p>
                <p style={{ ...heading, fontSize: '1.25rem', margin: 0 }}>
                  {new Date(accom.checkOutDate + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}
                </p>
              </div>
            )}
          </motion.div>
        )}

        {/* Curated places */}
        {places.length > 0 && (
          <div>
            <motion.p {...fadeUp(0.08)} style={{ ...label, marginBottom: 24 }}>
              Our recommendations
            </motion.p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
              {places.map((place, i) => (
                <motion.div key={place.id || place.place_id || i} {...fadeUp(0.08 + i * 0.04)} style={card}>
                  {/* Photo */}
                  <div style={{ height: 190, background: `${theme.darkBg}cc`, position: 'relative', overflow: 'hidden' }}>
                    {place.photo_url ? (
                      <img src={place.photo_url} alt={place.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none'; }} />
                    ) : (
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.2 }}>
                        <Hotel size={40} color={theme.darkText} />
                      </div>
                    )}
                    {place.badge && (
                      <span style={{ position: 'absolute', top: 12, left: 12, fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: theme.accent, color: '#FFFFFF', fontFamily: typography.bodyFont, letterSpacing: '0.06em' }}>
                        {place.badge}
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ padding: '18px 20px 20px' }}>
                    <p style={{ fontFamily: typography.headingFont, fontWeight: typography.headingWeight, fontSize: '1.0625rem', color: theme.darkText, margin: '0 0 8px', lineHeight: 1.3 }}>
                      {place.name}
                    </p>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                      {place.rating && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: theme.accent, fontFamily: typography.bodyFont }}>
                          <Star size={11} fill={theme.accent} color={theme.accent} /> {place.rating}
                        </span>
                      )}
                      {place.price_level > 0 && (
                        <span style={{ fontSize: 12, color: theme.darkText, opacity: 0.5, fontFamily: typography.bodyFont }}>
                          {'$'.repeat(place.price_level)}
                        </span>
                      )}
                    </div>

                    {place.address && (
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 5, marginBottom: 10 }}>
                        <MapPin size={11} color={theme.accent} style={{ flexShrink: 0, marginTop: 3 }} />
                        <p style={{ fontSize: 12, color: theme.darkText, opacity: 0.6, fontFamily: typography.bodyFont, margin: 0, lineHeight: 1.5 }}>
                          {place.address}
                        </p>
                      </div>
                    )}

                    {place.note && (
                      <p style={{ fontSize: 13, color: theme.darkText, opacity: 0.7, fontFamily: typography.bodyFont, margin: '0 0 12px', fontStyle: 'italic', lineHeight: 1.5, paddingTop: 10, borderTop: `1px solid ${theme.accent}20` }}>
                        "{place.note}"
                      </p>
                    )}

                    {place.maps_url && (
                      <a href={place.maps_url} target="_blank" rel="noopener noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: theme.accent, fontFamily: typography.bodyFont, textDecoration: 'none', letterSpacing: '0.04em' }}>
                        View on maps <ExternalLink size={11} />
                      </a>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Legacy manual properties fallback */}
        {places.length === 0 && legacy.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
            {legacy.map((p, i) => (
              <motion.div key={p.id || i} {...fadeUp(0.08 + i * 0.04)} style={card}>
                {p.photoUrl && <img src={p.photoUrl} alt={p.name} style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }} />}
                <div style={{ padding: '16px 20px' }}>
                  <p style={{ fontFamily: typography.headingFont, fontWeight: typography.headingWeight, fontSize: '1rem', color: theme.darkText, margin: '0 0 6px' }}>{p.name}</p>
                  {p.address && <p style={{ fontSize: 12, color: theme.darkText, opacity: 0.6, fontFamily: typography.bodyFont, margin: '0 0 8px' }}>{p.address}</p>}
                  {p.description && <p style={{ fontSize: 13, color: theme.darkText, opacity: 0.7, fontFamily: typography.bodyFont, margin: 0, lineHeight: 1.5 }}>{p.description}</p>}
                  {p.website && (
                    <a href={p.website} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700, color: theme.accent, fontFamily: typography.bodyFont, textDecoration: 'none', marginTop: 10 }}>
                      Book now <ExternalLink size={10} />
                    </a>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {places.length === 0 && legacy.length === 0 && (
          <motion.div {...fadeUp(0.1)} style={{ textAlign: 'center', padding: '60px 24px' }}>
            <p style={{ ...body, opacity: 0.4, fontStyle: 'italic' }}>
              Accommodation recommendations will be added here by the couple.
            </p>
          </motion.div>
        )}

        {/* Additional notes */}
        {accom.additionalNotes && (
          <motion.div {...fadeUp(0.15)} style={{ marginTop: 40, padding: '24px 28px', border: `1px solid ${theme.accent}30`, borderRadius: 4 }}>
            <p style={{ ...body, margin: 0, whiteSpace: 'pre-wrap' }}>{accom.additionalNotes}</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
