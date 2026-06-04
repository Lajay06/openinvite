import React from 'react';
import SectionReveal from '../SectionReveal';
import GrainOverlay from '../GrainOverlay';

export default function WeddingCelebrationPage({ weddingDetails, theme, typography, universeConfig }) {
  const ceremony = weddingDetails.mainCeremony || {};
  const reception = weddingDetails.reception || {};
  const daySchedule = weddingDetails.celebrationContent?.daySchedule || [];

  // Dark block: scroll-revealed, with optional grain for Aman universe.
  // universeConfig null → SectionReveal falls back to default fade (unchanged for non-Aman).
  const EventBlock = ({ title, data }) => (
    <SectionReveal universeConfig={universeConfig}>
      <div
        style={{
          position: 'relative',
          backgroundColor: theme.darkBg,
          color: theme.darkText,
          padding: '40px',
          borderRadius: '4px',
          marginBottom: '40px',
        }}
      >
        {universeConfig?.texture && (
          <GrainOverlay opacity={universeConfig.texture.opacity} />
        )}
      <h2
        style={{
          fontFamily: typography.headingFont,
          fontSize: 'clamp(1.5rem, 4vw, 2rem)',
          fontWeight: typography.headingWeight,
          marginBottom: '24px'
        }}
      >
        {title}
      </h2>

      {data.startTime && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '0.875rem', color: theme.accent, fontWeight: 600 }}>TIME</div>
          <div style={{ fontFamily: typography.bodyFont, fontSize: '1.125rem', marginTop: '4px' }}>
            {data.startTime} {data.endTime ? `- ${data.endTime}` : ''}
          </div>
        </div>
      )}

      {data.venueName && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '0.875rem', color: theme.accent, fontWeight: 600 }}>VENUE</div>
          <div style={{ fontFamily: typography.bodyFont, fontSize: '1.125rem', marginTop: '4px' }}>
            {data.venueName}
          </div>
        </div>
      )}

      {data.address && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '0.875rem', color: theme.accent, fontWeight: 600 }}>ADDRESS</div>
          <div style={{ fontFamily: typography.bodyFont, fontSize: '1rem', marginTop: '4px', opacity: 0.8 }}>
            {data.address}
          </div>
        </div>
      )}

      {data.dressCode && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '0.875rem', color: theme.accent, fontWeight: 600 }}>DRESS CODE</div>
          <div style={{ fontFamily: typography.bodyFont, fontSize: '1rem', marginTop: '4px' }}>
            {data.dressCode}
          </div>
        </div>
      )}

      {data.notes && (
        <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: `1px solid ${theme.accent}20` }}>
          <div style={{ fontFamily: typography.bodyFont, fontSize: '1rem', lineHeight: 1.6 }}>
            {data.notes}
          </div>
        </div>
      )}
      </div>
    </SectionReveal>
  );

  return (
    <div style={{ backgroundColor: theme.lightBg, color: theme.lightText, minHeight: '100vh', padding: '60px 24px' }}>
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>
        <SectionReveal universeConfig={universeConfig}>
          <h1
            style={{
              fontFamily: typography.headingFont,
              fontSize: 'clamp(2rem, 5vw, 3rem)',
              fontWeight: typography.headingWeight,
              marginBottom: '60px',
              textAlign: 'center'
            }}
          >
            The Celebration
          </h1>
        </SectionReveal>

        {Object.keys(ceremony).length > 0 && (
          <EventBlock title="Ceremony" data={ceremony} />
        )}

        {Object.keys(reception).length > 0 && (
          <EventBlock title="Reception" data={reception} />
        )}

        {daySchedule.length > 0 && (
          <SectionReveal universeConfig={universeConfig}>
            <div
              style={{
                position: 'relative',
                backgroundColor: theme.darkBg,
                color: theme.darkText,
                padding: '40px',
                borderRadius: '4px',
              }}
            >
              {universeConfig?.texture && (
                <GrainOverlay opacity={universeConfig.texture.opacity} />
              )}
              <h2
                style={{
                  fontFamily: typography.headingFont,
                  fontSize: 'clamp(1.5rem, 4vw, 2rem)',
                  fontWeight: typography.headingWeight,
                  marginBottom: '32px'
                }}
              >
                Day Schedule
              </h2>

              <div style={{ space: '24px' }}>
                {daySchedule.map((event, i) => (
                  <div key={i} style={{ marginBottom: '24px', paddingBottom: '24px', borderBottom: `1px solid ${theme.accent}20` }}>
                    <div style={{ fontSize: '0.875rem', color: theme.accent, fontWeight: 600, marginBottom: '4px' }}>
                      {event.time}
                    </div>
                    <div style={{ fontFamily: typography.bodyFont, fontSize: '1.125rem', fontWeight: typography.bodyWeight }}>
                      {event.description}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </SectionReveal>
        )}
      </div>
    </div>
  );
}