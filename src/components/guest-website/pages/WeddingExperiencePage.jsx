import React from 'react';
import { Star, MapPin, ExternalLink, Heart, CalendarDays } from 'lucide-react';
import SectionReveal from '../SectionReveal';
import { isMotionEnabled } from '@/lib/universeStyling';

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

/** The itinerary's three parts of a day, in the order a day happens. */
const BLOCKS = [
  { key: 'morning', label: 'Morning' },
  { key: 'afternoon', label: 'Afternoon' },
  { key: 'evening', label: 'Evening' },
];

function photoUrl(ref) {
  if (!ref) return null;
  return `/api/places-photo?ref=${encodeURIComponent(ref)}&maxwidth=600`;
}

export default function WeddingExperiencePage({ weddingDetails, theme, typography, universeConfig }) {
  const guide = weddingDetails.experienceGuide || {};
  const cats = guide.categories || {};
  const couplePicks = guide.couplePicks || [];
  const destination = guide.destination || weddingDetails.mainCeremony?.address?.split(',').slice(-3).join(', ') || '';

  const enabledCats = CATEGORIES.filter(c => cats[c.key]?.enabled && (cats[c.key]?.places || []).length > 0);

  // Defensive on every level: a day with no blocks, a block that is not an
  // array, an activity with no photo. The couple's builder can leave any of
  // these empty and a guest page must not care.
  const itineraryDays = Array.isArray(guide.itinerary?.schedule)
    ? guide.itinerary.schedule.filter(d => d && d.blocks && BLOCKS.some(b => (d.blocks[b.key] || []).length > 0))
    : [];

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

        <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
          <h1 style={{ ...heading, fontSize: 'clamp(2rem,5vw,3.5rem)', textAlign: 'center', marginBottom: 16 }}>
            {destination ? `Experiences in ${destination.split(',')[0].trim()}` : 'Experiences'}
          </h1>
        </SectionReveal>

        {guide.editorialIntro ? (
          <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)} style={{ ...body, textAlign: 'center', maxWidth: 620, margin: '0 auto 48px' }}>
            {guide.editorialIntro}
          </SectionReveal>
        ) : (
          <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)} style={{ ...body, textAlign: 'center', maxWidth: 620, margin: '0 auto 48px' }}>
            We've hand-picked our favorite spots so you can make the most of your time here.
          </SectionReveal>
        )}

        {/* Couple picks strip */}
        {couplePicks.length > 0 && (
          <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)} style={{ marginBottom: 56 }}>
            <p style={{ ...label, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Heart size={11} fill={theme.accent} color={theme.accent} /> Our favorites
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
                      <h2 style={{ fontFamily: typography.headingFont, fontWeight: typography.headingWeight, fontSize: '0.9375rem', color: theme.darkText, margin: '0 0 4px', lineHeight: 1.3 }}>
                        {place.name}
                      </h2>
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
          </SectionReveal>
        )}

        {/* Enabled categories */}
        {enabledCats.map((cat) => {
          const places = cats[cat.key]?.places || [];
          return (
            <SectionReveal key={cat.key} universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)} style={{ marginBottom: 48 }}>
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
                        <h2 style={{ fontFamily: typography.headingFont, fontWeight: typography.headingWeight, fontSize: '0.9375rem', color: theme.darkText, margin: '0 0 6px', lineHeight: 1.3 }}>
                          {place.name}
                        </h2>
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
            </SectionReveal>
          );
        })}

        {/* ── The itinerary (D-1a) ──────────────────────────────────────────
            The couple builds a day-by-day plan in Experience guide → Itinerary
            — days, morning/afternoon/evening blocks, each activity with a
            photo, time, duration, category and a written description. It
            arrives in the guest-safe payload in full and, before this, NOTHING
            READ IT: the page rendered `categories` and `couplePicks` only, so
            the richest thing a couple builds here never reached a guest.
            Same publish-parity class as fontOverride, one layer further along
            — that one is stopped at the API allowlist; this one cleared the
            allowlist and was discarded at the render. */}
        {itineraryDays.length > 0 && (
          <div style={{ marginBottom: 56 }}>
            <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
              <p style={{ ...label, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 6 }}>
                <CalendarDays size={11} color={theme.accent} /> Day by day
              </p>
            </SectionReveal>

            {itineraryDays.map((day, di) => (
              <SectionReveal
                key={day.day ?? di}
                universeConfig={universeConfig}
                disabled={!isMotionEnabled(weddingDetails)}
                style={{ marginBottom: 40 }}
              >
                <h2 style={{ ...heading, fontSize: 'clamp(1.25rem,3vw,1.75rem)', margin: '0 0 6px' }}>
                  {day.title || `Day ${day.day ?? di + 1}`}
                </h2>
                {day.summary && (
                  <p style={{ ...body, margin: '0 0 20px', maxWidth: 640 }}>{day.summary}</p>
                )}

                {BLOCKS.map(({ key, label: blockLabel }) => {
                  const items = Array.isArray(day.blocks?.[key]) ? day.blocks[key] : [];
                  if (items.length === 0) return null;
                  return (
                    <div key={key} style={{ marginBottom: 22 }}>
                      <h3 style={{ ...label, margin: '0 0 12px' }}>{blockLabel}</h3>
                      <div style={{ display: 'grid', gap: 14 }}>
                        {items.map((item, ii) => (
                          <div
                            key={item.id || ii}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: item.photo_url ? '92px 1fr' : '1fr',
                              gap: 14,
                              alignItems: 'start',
                              borderTop: `1px solid ${theme.lightText}18`,
                              paddingTop: 14,
                            }}
                          >
                            {item.photo_url && (
                              <div style={{ width: 92, height: 92, overflow: 'hidden', background: `${theme.lightText}0D` }}>
                                <img
                                  src={item.photo_url}
                                  alt={item.place_name || ''}
                                  loading="lazy"
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                  onError={e => { e.target.style.display = 'none'; }}
                                />
                              </div>
                            )}
                            <div>
                              <h4 style={{ ...body, opacity: 1, fontWeight: 600, margin: '0 0 3px', fontSize: '0.9375rem' }}>
                                {item.place_name}
                              </h4>
                              {(item.time || item.duration || item.category) && (
                                <p style={{ ...body, fontSize: '0.75rem', opacity: 0.6, margin: '0 0 6px' }}>
                                  {[item.time, item.duration, item.category].filter(Boolean).join(' · ')}
                                </p>
                              )}
                              {item.description && (
                                <p style={{ ...body, fontSize: '0.875rem', margin: 0 }}>{item.description}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </SectionReveal>
            ))}
          </div>
        )}

        {/* Empty state */}
        {enabledCats.length === 0 && couplePicks.length === 0 && itineraryDays.length === 0 && (
          <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)} style={{ textAlign: 'center', padding: '60px 24px' }}>
            <p style={{ ...body, opacity: 0.4, fontStyle: 'italic' }}>
              The experience guide will be added here by the couple.
            </p>
          </SectionReveal>
        )}

      </div>
    </div>
  );
}
