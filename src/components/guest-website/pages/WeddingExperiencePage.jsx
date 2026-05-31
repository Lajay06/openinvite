import React from 'react';
import { motion } from 'framer-motion';
import { Star, MapPin, ExternalLink, Heart } from 'lucide-react';

const CATEGORIES = [
  { key: 'mustEat',        label: 'Must eat' },
  { key: 'coffee',         label: 'Coffee & bakeries' },
  { key: 'hiddenGems',     label: 'Hidden gems' },
  { key: 'luxuryDining',   label: 'Luxury dining' },
  { key: 'nature',         label: 'Beaches & nature' },
  { key: 'nightlife',      label: 'Nightlife' },
  { key: 'thingsToDo',     label: 'Things to do' },
  { key: 'wellness',       label: 'Recovery & wellness' },
  { key: 'dayTrips',       label: 'Day trips' },
  { key: 'shopping',       label: 'Shopping' },
  { key: 'weddingWeekend', label: 'Wedding weekend essentials' },
];

function photoUrl(ref) {
  if (!ref) return null;
  return `/api/places-photo?ref=${encodeURIComponent(ref)}&maxwidth=600`;
}

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6, delay },
});

export default function WeddingExperiencePage({ weddingDetails, theme, typography }) {
  const guide = weddingDetails.experienceGuide || {};
  const cats = guide.categories || {};
  const couplePicks = guide.couplePicks || [];
  const destination = guide.destination || weddingDetails.mainCeremony?.address?.split(',').slice(-3).join(', ') || '';

  const enabledCats = CATEGORIES.filter(c => cats[c.key]?.enabled && (cats[c.key]?.places || []).length > 0);

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

  const label = {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.1em',
    color: theme.accent,
    fontFamily: typography.bodyFont,
  };

  const card = {
    backgroundColor: theme.darkBg,
    borderRadius: 4,
    overflow: 'hidden',
  };

  return (
    <div style={{ backgroundColor: theme.lightBg, minHeight: '100vh', padding: '60px 24px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        <motion.h1 {...fadeUp()} style={{ ...heading, fontSize: 'clamp(2rem,5vw,3.5rem)', textAlign: 'center', marginBottom: 16 }}>
          {destination ? `Your guide to ${destination.split(',')[0].trim()}` : 'Experience guide'}
        </motion.h1>

        {guide.editorialIntro ? (
          <motion.p {...fadeUp(0.06)} style={{ ...body, textAlign: 'center', maxWidth: 620, margin: '0 auto 48px' }}>
            {guide.editorialIntro}
          </motion.p>
        ) : (
          <motion.p {...fadeUp(0.06)} style={{ ...body, textAlign: 'center', maxWidth: 620, margin: '0 auto 48px' }}>
            We've hand-picked our favourite spots so you can make the most of your time here.
          </motion.p>
        )}

        {/* Couple picks strip */}
        {couplePicks.length > 0 && (
          <motion.div {...fadeUp(0.1)} style={{ marginBottom: 56 }}>
            <p style={{ ...label, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Heart size={11} fill={theme.accent} color={theme.accent} /> Our favourites
            </p>
            <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 8, scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}>
              {couplePicks.map((place, i) => {
                const photo = place.photo_ref ? photoUrl(place.photo_ref) : null;
                return (
                  <div key={place.place_id || i} style={{ flexShrink: 0, width: 240, scrollSnapAlign: 'start', ...card }}>
                    <div style={{ height: 150, background: `${theme.darkBg}cc`, position: 'relative', overflow: 'hidden' }}>
                      {photo ? (
                        <img src={photo} alt={place.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none'; }} />
                      ) : (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.15 }}>
                          <MapPin size={28} color={theme.darkText} />
                        </div>
                      )}
                      {place.category && (
                        <span style={{ position: 'absolute', bottom: 8, left: 10, fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 999, background: theme.accent, color: '#FFF', fontFamily: typography.bodyFont, letterSpacing: '0.06em' }}>
                          {place.category}
                        </span>
                      )}
                    </div>
                    <div style={{ padding: '14px 16px' }}>
                      <p style={{ fontFamily: typography.headingFont, fontWeight: typography.headingWeight, fontSize: '0.9375rem', color: theme.darkText, margin: '0 0 4px', lineHeight: 1.3 }}>
                        {place.name}
                      </p>
                      {place.rating && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: theme.accent, fontFamily: typography.bodyFont }}>
                          <Star size={10} fill={theme.accent} color={theme.accent} /> {place.rating}
                        </span>
                      )}
                      {place.note && (
                        <p style={{ fontSize: 12, color: theme.darkText, opacity: 0.65, fontFamily: typography.bodyFont, margin: '6px 0 8px', fontStyle: 'italic', lineHeight: 1.5 }}>
                          "{place.note}"
                        </p>
                      )}
                      {place.maps_url && (
                        <a href={place.maps_url} target="_blank" rel="noopener noreferrer"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: theme.accent, fontFamily: typography.bodyFont, textDecoration: 'none' }}>
                          Maps <ExternalLink size={10} />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Enabled categories */}
        {enabledCats.map((cat, ci) => {
          const places = cats[cat.key]?.places || [];
          return (
            <motion.div key={cat.key} {...fadeUp(0.1 + ci * 0.05)} style={{ marginBottom: 48 }}>
              <p style={{ ...label, marginBottom: 20 }}>{cat.label}</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
                {places.map((place, i) => {
                  const photo = place.photo_ref ? photoUrl(place.photo_ref) : null;
                  return (
                    <div key={place.place_id || i} style={card}>
                      <div style={{ height: 150, background: `${theme.darkBg}cc`, position: 'relative', overflow: 'hidden' }}>
                        {photo ? (
                          <img src={photo} alt={place.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none'; }} />
                        ) : (
                          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.15 }}>
                            <MapPin size={28} color={theme.darkText} />
                          </div>
                        )}
                        {place.is_couple_pick && (
                          <span style={{ position: 'absolute', top: 10, left: 10 }}>
                            <Heart size={14} fill={theme.accent} color={theme.accent} />
                          </span>
                        )}
                      </div>
                      <div style={{ padding: '14px 16px 16px' }}>
                        <p style={{ fontFamily: typography.headingFont, fontWeight: typography.headingWeight, fontSize: '0.9375rem', color: theme.darkText, margin: '0 0 6px', lineHeight: 1.3 }}>
                          {place.name}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                          {place.rating && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 12, color: theme.accent, fontFamily: typography.bodyFont }}>
                              <Star size={10} fill={theme.accent} color={theme.accent} /> {place.rating}
                            </span>
                          )}
                          {place.price_level > 0 && (
                            <span style={{ fontSize: 12, color: theme.darkText, opacity: 0.45, fontFamily: typography.bodyFont }}>
                              {'$'.repeat(place.price_level)}
                            </span>
                          )}
                        </div>
                        {place.address && (
                          <p style={{ fontSize: 11, color: theme.darkText, opacity: 0.5, fontFamily: typography.bodyFont, margin: '0 0 6px', lineHeight: 1.4 }}>
                            {place.address}
                          </p>
                        )}
                        {place.note && (
                          <p style={{ fontSize: 12, color: theme.darkText, opacity: 0.7, fontFamily: typography.bodyFont, margin: '0 0 8px', fontStyle: 'italic', lineHeight: 1.5 }}>
                            "{place.note}"
                          </p>
                        )}
                        {place.maps_url && (
                          <a href={place.maps_url} target="_blank" rel="noopener noreferrer"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: theme.accent, fontFamily: typography.bodyFont, textDecoration: 'none' }}>
                            View on maps <ExternalLink size={10} />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          );
        })}

        {/* Empty state */}
        {enabledCats.length === 0 && couplePicks.length === 0 && (
          <motion.div {...fadeUp(0.1)} style={{ textAlign: 'center', padding: '60px 24px' }}>
            <p style={{ ...body, opacity: 0.4, fontStyle: 'italic' }}>
              The experience guide will be added here by the couple.
            </p>
          </motion.div>
        )}

      </div>
    </div>
  );
}
