import React from 'react';
import { motion } from 'framer-motion';
import { Hotel, Home, Tent, ExternalLink, Tag, MapPin } from 'lucide-react';

const TYPE_ICONS = {
  Hotel: Hotel,
  Airbnb: Home,
  Motel: Hotel,
  Camping: Tent,
  'B&B': Home,
  Other: MapPin,
};

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6, delay },
});

export default function WeddingAccommodationPage({ weddingDetails, theme, typography }) {
  const content = weddingDetails.accommodationContent || {};
  const mainCeremony = weddingDetails.mainCeremony || {};
  const reception = weddingDetails.reception || {};

  const venueName = mainCeremony.venueName || reception.venueName || '';
  const venueAddress = mainCeremony.address || reception.address || '';

  // Derive city for external links
  const venueCity = venueAddress
    ? (venueAddress.split(',').slice(1).join(',').trim() || venueAddress)
    : venueName;
  const cityLabel = venueCity ? venueCity.split(',')[0].trim() : null;

  const bookingUrl = venueCity
    ? `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(venueCity)}`
    : 'https://www.booking.com';
  const airbnbUrl = venueCity
    ? `https://www.airbnb.com/s/${encodeURIComponent(venueCity)}`
    : 'https://www.airbnb.com';

  const roomBlocks = (content.roomBlocks || []).filter(b => b.hotelName);
  const customOptions = (content.customOptions || []).filter(o => o.name);
  const hasAlternative = !!(content.showAlternative && content.alternativeNotes);

  // ── Shared styles (theme-aware) ────────────────────────────
  const card = {
    backgroundColor: theme.darkBg,
    color: theme.darkText,
    padding: '28px 32px',
    marginBottom: '20px',
    borderRadius: '4px',
  };

  const sectionTitle = {
    fontFamily: typography.headingFont,
    fontSize: '1.25rem',
    fontWeight: typography.headingWeight,
    color: theme.darkText,
    margin: '0 0 12px',
  };

  const body = {
    fontFamily: typography.bodyFont,
    fontSize: '0.9375rem',
    lineHeight: 1.7,
    color: theme.darkText,
    opacity: 0.75,
    margin: '0 0 12px',
  };

  const link = {
    color: theme.accent,
    textDecoration: 'underline',
    fontSize: '0.9375rem',
    fontFamily: typography.bodyFont,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
  };

  const divider = `1px solid ${theme.accent}20`;

  return (
    <div style={{ backgroundColor: theme.lightBg, color: theme.lightText, minHeight: '100vh', padding: '60px 24px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>

        {/* Page title */}
        <motion.h1
          {...fadeUp()}
          style={{
            fontFamily: typography.headingFont,
            fontSize: 'clamp(2rem, 5vw, 3rem)',
            fontWeight: typography.headingWeight,
            marginBottom: '60px',
            textAlign: 'center',
            color: theme.lightText,
          }}
        >
          Accommodation
        </motion.h1>

        {/* ── Recommended hotels ────────────────────────────────── */}
        <motion.div {...fadeUp(0.08)} style={card}>
          <h2 style={sectionTitle}>Recommended hotels</h2>

          {(venueName || venueAddress) && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 16, paddingBottom: 16, borderBottom: divider }}>
              <MapPin size={15} style={{ color: theme.accent, flexShrink: 0, marginTop: 3 }} />
              <div>
                {venueName && (
                  <p style={{ ...body, margin: '0 0 2px', fontWeight: 600, opacity: 1 }}>{venueName}</p>
                )}
                {venueAddress && (
                  <p style={{ ...body, margin: 0, fontSize: '0.875rem' }}>{venueAddress}</p>
                )}
              </div>
            </div>
          )}

          <p style={body}>
            {content.hotelNotes || (cityLabel
              ? `Browse hotels near ${cityLabel} to find the best option for your stay.`
              : 'Browse nearby hotels to find the best option for your stay.')}
          </p>

          <a href={bookingUrl} target="_blank" rel="noopener noreferrer" style={link}>
            {cityLabel ? `View options near ${cityLabel} on Booking.com` : 'View options on Booking.com'}
            <ExternalLink size={12} />
          </a>
        </motion.div>

        {/* ── Nearby Airbnb ─────────────────────────────────────── */}
        <motion.div {...fadeUp(0.14)} style={card}>
          <h2 style={sectionTitle}>Nearby Airbnb</h2>
          <p style={body}>
            {content.airbnbNotes || 'Short-term rentals are a great option for guests who prefer a home-like stay or are travelling in groups.'}
          </p>
          <a href={airbnbUrl} target="_blank" rel="noopener noreferrer" style={link}>
            {cityLabel ? `Search Airbnb near ${cityLabel}` : 'Search on Airbnb'}
            <ExternalLink size={12} />
          </a>
        </motion.div>

        {/* ── Room blocks ────────────────────────────────────────── */}
        {roomBlocks.length > 0 && (
          <motion.div {...fadeUp(0.2)} style={card}>
            <h2 style={sectionTitle}>Room blocks</h2>
            <p style={body}>
              We've negotiated a group rate at the following hotel{roomBlocks.length > 1 ? 's' : ''} — book before the deadline to secure the discounted rate.
            </p>
            <div style={{ display: 'grid', gap: 16 }}>
              {roomBlocks.map((block, i) => (
                <div key={block.id || i} style={{ paddingTop: i > 0 ? 16 : 0, borderTop: i > 0 ? divider : 'none' }}>
                  <p style={{ ...body, fontWeight: 600, opacity: 1, margin: '0 0 4px', fontSize: '1rem' }}>{block.hotelName}</p>
                  {block.address && (
                    <p style={{ ...body, margin: '0 0 10px', fontSize: '0.875rem' }}>{block.address}</p>
                  )}
                  {block.discountCode && (
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: 8,
                      background: `${theme.accent}12`, padding: '6px 12px',
                      marginBottom: 10,
                    }}>
                      <Tag size={12} style={{ color: theme.accent, flexShrink: 0 }} />
                      <span style={{ fontFamily: 'monospace', fontSize: '0.875rem', fontWeight: 700, color: theme.darkText, letterSpacing: '0.04em' }}>
                        {block.discountCode}
                      </span>
                    </div>
                  )}
                  {block.deadline && (
                    <p style={{ ...body, fontSize: '0.8125rem', margin: '0 0 10px' }}>
                      Book by {new Date(block.deadline).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  )}
                  {block.bookingLink && (
                    <a href={block.bookingLink} target="_blank" rel="noopener noreferrer" style={link}>
                      Book at group rate <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Camping / alternative stays ───────────────────────── */}
        {hasAlternative && (
          <motion.div {...fadeUp(0.26)} style={card}>
            <h2 style={sectionTitle}>Camping &amp; alternative stays</h2>
            <p style={{ ...body, whiteSpace: 'pre-wrap', marginBottom: 0 }}>{content.alternativeNotes}</p>
          </motion.div>
        )}

        {/* ── Custom options ─────────────────────────────────────── */}
        {customOptions.length > 0 && (
          <motion.div {...fadeUp(0.32)}>
            <h2
              style={{
                fontFamily: typography.headingFont,
                fontSize: 'clamp(1.25rem, 3vw, 1.75rem)',
                fontWeight: typography.headingWeight,
                color: theme.lightText,
                margin: '20px 0 20px',
              }}
            >
              More options
            </h2>
            <div style={{ display: 'grid', gap: 16 }}>
              {customOptions.map((opt, i) => {
                const Icon = TYPE_ICONS[opt.type] || Hotel;
                return (
                  <motion.div key={opt.id || i} {...fadeUp(0.32 + i * 0.07)} style={card}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <Icon size={14} style={{ color: theme.accent, flexShrink: 0 }} />
                      <span
                        style={{
                          fontSize: '0.6875rem',
                          color: theme.accent,
                          fontWeight: 700,
                          letterSpacing: '0.06em',
                          textTransform: 'uppercase',
                          fontFamily: typography.bodyFont,
                        }}
                      >
                        {opt.type}
                      </span>
                    </div>
                    <h3 style={{ ...sectionTitle, fontSize: '1.125rem', marginBottom: 8 }}>{opt.name}</h3>
                    {opt.description && (
                      <p style={{ ...body, marginBottom: opt.priceRange || opt.bookingLink ? 8 : 0 }}>
                        {opt.description}
                      </p>
                    )}
                    {opt.priceRange && (
                      <p style={{ ...body, fontSize: '0.875rem', marginBottom: opt.bookingLink ? 8 : 0 }}>
                        {opt.priceRange}
                      </p>
                    )}
                    {opt.bookingLink && (
                      <a href={opt.bookingLink} target="_blank" rel="noopener noreferrer" style={link}>
                        Book now <ExternalLink size={12} />
                      </a>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

      </div>
    </div>
  );
}
