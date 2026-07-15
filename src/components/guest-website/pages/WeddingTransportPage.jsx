import React from 'react';
import { MapPin, Plane, Train, Bus, Car, Ship, Navigation2, ExternalLink, FileText } from 'lucide-react';
import SectionReveal from '../SectionReveal';
import { isMotionEnabled } from '@/lib/universeStyling';

const TYPE_ICONS = {
  airport:       Plane,
  train_station: Train,
  bus_station:   Bus,
  car_rental:    Car,
  ferry:         Ship,
  other:         Navigation2,
};

const TYPE_LABELS = {
  airport:       'Airport',
  train_station: 'Train station',
  bus_station:   'Bus / coach',
  car_rental:    'Car rental',
  ferry:         'Ferry terminal',
  other:         'Transport',
};

export default function WeddingTransportPage({ weddingDetails, theme, typography, universeConfig }) {
  const places = weddingDetails.guestSuiteTransport?.places || [];
  const notes  = weddingDetails.guestSuiteTransport?.notes  || [];

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
      <div style={{ maxWidth: 860, margin: '0 auto' }}>

        <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
          <h1 style={{ ...heading, fontSize: 'clamp(2rem,5vw,3.5rem)', textAlign: 'center', marginBottom: 16 }}>
            Getting here
          </h1>
        </SectionReveal>

        <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)} style={{ ...body, textAlign: 'center', maxWidth: 560, margin: '0 auto 48px' }}>
          Here's everything you need to know to get to the venue.
        </SectionReveal>

        {/* Transport places */}
        {places.length > 0 && (
          <div style={{ marginBottom: 48 }}>
            <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)} style={{ ...label, marginBottom: 24 }}>
              Airports &amp; transit
            </SectionReveal>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
              {places.map((place, i) => {
                const Icon = TYPE_ICONS[place.type] || Navigation2;
                const typeLabel = TYPE_LABELS[place.type] || 'Transport';
                return (
                  <SectionReveal key={place.id || i} universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)} style={card}>
                    <div style={{ height: 160, background: `${theme.darkBg}cc`, position: 'relative', overflow: 'hidden' }}>
                      {place.photo_url ? (
                        <img src={place.photo_url} alt={place.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none'; }} />
                      ) : (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.2 }}>
                          <Icon size={36} color={theme.darkText} />
                        </div>
                      )}
                      <span style={{ position: 'absolute', bottom: 10, left: 12, fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: 'rgba(0,0,0,0.65)', color: '#FFF', fontFamily: typography.bodyFont, letterSpacing: '0.06em' }}>
                        {typeLabel}
                      </span>
                    </div>
                    <div style={{ padding: '16px 18px 18px' }}>
                      <p style={{ fontFamily: typography.headingFont, fontWeight: typography.headingWeight, fontSize: '1rem', color: theme.darkText, margin: '0 0 8px', lineHeight: 1.3 }}>
                        {place.name}
                      </p>
                      {place.address && (
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 5, marginBottom: 8 }}>
                          <MapPin size={11} color={theme.accent} style={{ flexShrink: 0, marginTop: 3 }} />
                          <p style={{ fontSize: 12, color: theme.darkText, opacity: 0.6, fontFamily: typography.bodyFont, margin: 0, lineHeight: 1.5 }}>
                            {place.address}
                          </p>
                        </div>
                      )}
                      {place.note && (
                        <p style={{ fontSize: 13, color: theme.darkText, opacity: 0.7, fontFamily: typography.bodyFont, margin: '8px 0 10px', fontStyle: 'italic', lineHeight: 1.5, paddingTop: 8, borderTop: `1px solid ${theme.accent}20` }}>
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
                  </SectionReveal>
                );
              })}
            </div>
          </div>
        )}

        {/* Transport notes */}
        {notes.length > 0 && (
          <div style={{ marginBottom: 48 }}>
            <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)} style={{ ...label, marginBottom: 20 }}>
              Getting around
            </SectionReveal>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {notes.map((note, i) => (
                <SectionReveal key={note.id || i} universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)} style={{ ...card, padding: '18px 22px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <FileText size={14} color={theme.accent} style={{ flexShrink: 0, marginTop: 3 }} />
                  <div>
                    {note.title && (
                      <p style={{ ...label, marginBottom: 6, color: theme.accent }}>
                        {note.title}
                      </p>
                    )}
                    <p style={{ ...body, margin: 0, opacity: 0.85, fontSize: '0.9rem' }}>{note.text}</p>
                  </div>
                </SectionReveal>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {places.length === 0 && notes.length === 0 && (
          <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)} style={{ textAlign: 'center', padding: '60px 24px' }}>
            <p style={{ ...body, opacity: 0.4, fontStyle: 'italic' }}>
              Transport information will be added here by the couple.
            </p>
          </SectionReveal>
        )}

      </div>
    </div>
  );
}
