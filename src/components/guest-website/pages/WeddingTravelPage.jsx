import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Car, Train, Bus, Plane, Ship, Navigation2, ExternalLink } from 'lucide-react';

const TRANSPORT_ICONS = {
  Flight: Plane,
  Train: Train,
  Bus: Bus,
  Rideshare: Car,
  Car: Car,
  Ferry: Ship,
  Other: Navigation2,
};

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6, delay },
});

export default function WeddingTravelPage({ weddingDetails, theme, typography }) {
  const content = weddingDetails.travelContent || {};
  const mainCeremony = weddingDetails.mainCeremony || {};
  const reception = weddingDetails.reception || {};

  const venueName = mainCeremony.venueName || reception.venueName || '';
  const venueAddress = mainCeremony.address || reception.address || '';

  // Derive a booking-search city from the venue address
  const bookingCity = venueAddress
    ? (venueAddress.split(',').slice(1).join(',').trim() || venueAddress)
    : venueName;

  const transportOptions = content.transportOptions || [];
  const accommodations = (content.accommodations || []).filter(h => h.name);

  // ── Shared styles ─────────────────────────────────────────────
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
          Travel &amp; getting here
        </motion.h1>

        {/* ── Getting here ──────────────────────────────────────── */}
        <motion.div {...fadeUp(0.08)} style={card}>
          <h2 style={sectionTitle}>Getting here</h2>

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

          {content.gettingThereNotes ? (
            <p style={{ ...body, whiteSpace: 'pre-wrap', marginBottom: 0 }}>{content.gettingThereNotes}</p>
          ) : (
            <p style={{ ...body, marginBottom: 0, fontStyle: 'italic' }}>
              Directions and arrival notes will be added by the couple.
            </p>
          )}
        </motion.div>

        {/* ── Rideshare ─────────────────────────────────────────── */}
        <motion.div {...fadeUp(0.14)} style={card}>
          <h2 style={sectionTitle}>Rideshare</h2>
          <p style={body}>Uber and Lyft are available in most areas — book a ride directly:</p>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: content.rideshareNotes ? 16 : 0 }}>
            <a href="https://www.uber.com" target="_blank" rel="noopener noreferrer" style={link}>
              Get a ride on Uber <ExternalLink size={12} />
            </a>
            <a href="https://www.lyft.com" target="_blank" rel="noopener noreferrer" style={link}>
              Get a ride on Lyft <ExternalLink size={12} />
            </a>
          </div>
          {content.rideshareNotes && (
            <p style={{ ...body, marginTop: 12, marginBottom: 0, paddingTop: 14, borderTop: divider }}>
              {content.rideshareNotes}
            </p>
          )}
        </motion.div>

        {/* ── Public transport ──────────────────────────────────── */}
        {content.transportInfo && (
          <motion.div {...fadeUp(0.2)} style={card}>
            <h2 style={sectionTitle}>Public transport</h2>
            <p style={{ ...body, whiteSpace: 'pre-wrap', marginBottom: 0 }}>{content.transportInfo}</p>
          </motion.div>
        )}

        {/* ── Parking ───────────────────────────────────────────── */}
        {content.parkingInfo ? (
          <motion.div {...fadeUp(0.25)} style={card}>
            <h2 style={sectionTitle}>Parking</h2>
            <p style={{ ...body, whiteSpace: 'pre-wrap', marginBottom: 0 }}>{content.parkingInfo}</p>
          </motion.div>
        ) : (
          <motion.div {...fadeUp(0.25)} style={card}>
            <h2 style={sectionTitle}>Parking</h2>
            <p style={{ ...body, marginBottom: 0, fontStyle: 'italic' }}>
              Parking details will be added by the couple.
            </p>
          </motion.div>
        )}

        {/* ── Accommodation nearby ──────────────────────────────── */}
        <motion.div {...fadeUp(0.3)} style={card}>
          <h2 style={sectionTitle}>Accommodation nearby</h2>
          <p style={body}>Browse hotels and guesthouses near the venue:</p>

          <a
            href={
              bookingCity
                ? `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(bookingCity)}`
                : 'https://www.booking.com'
            }
            target="_blank"
            rel="noopener noreferrer"
            style={{ ...link, marginBottom: accommodations.length > 0 ? 20 : 0 }}
          >
            {bookingCity
              ? `Search accommodation near ${bookingCity.split(',')[0].trim()} on Booking.com`
              : 'Search accommodation on Booking.com'}
            <ExternalLink size={12} />
          </a>

          {accommodations.length > 0 && (
            <div style={{ display: 'grid', gap: 14, marginTop: 4 }}>
              {accommodations.map((hotel, i) => (
                <div key={i} style={{ paddingTop: 14, borderTop: divider }}>
                  {hotel.url ? (
                    <a href={hotel.url} target="_blank" rel="noopener noreferrer" style={{ ...link, fontSize: '1rem', fontWeight: 600 }}>
                      {hotel.name} <ExternalLink size={12} />
                    </a>
                  ) : (
                    <p style={{ ...body, fontSize: '1rem', fontWeight: 600, opacity: 1, margin: 0 }}>{hotel.name}</p>
                  )}
                  {hotel.address && (
                    <p style={{ ...body, margin: '4px 0 0', fontSize: '0.875rem' }}>{hotel.address}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* ── Custom transport options ───────────────────────────── */}
        {transportOptions.length > 0 && (
          <motion.div {...fadeUp(0.35)}>
            <h2
              style={{
                fontFamily: typography.headingFont,
                fontSize: 'clamp(1.25rem, 3vw, 1.75rem)',
                fontWeight: typography.headingWeight,
                color: theme.lightText,
                margin: '20px 0 20px',
              }}
            >
              Other ways to get here
            </h2>
            <div style={{ display: 'grid', gap: 16 }}>
              {transportOptions.map((opt, i) => {
                const Icon = TRANSPORT_ICONS[opt.type] || Navigation2;
                return (
                  <motion.div key={opt.id || i} {...fadeUp(0.35 + i * 0.07)} style={card}>
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
                    <h3 style={{ ...sectionTitle, fontSize: '1.125rem', marginBottom: 8 }}>{opt.title}</h3>
                    {opt.description && (
                      <p style={{ ...body, marginBottom: opt.link ? 12 : 0 }}>{opt.description}</p>
                    )}
                    {opt.link && (
                      <a href={opt.link} target="_blank" rel="noopener noreferrer" style={link}>
                        {opt.link} <ExternalLink size={12} />
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
