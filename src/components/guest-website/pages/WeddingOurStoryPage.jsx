import React from 'react';
import SectionReveal from '../SectionReveal';
import { isMotionEnabled } from '@/lib/universeStyling';

export default function WeddingOurStoryPage({ weddingDetails, theme, typography, universeConfig }) {
  const content = weddingDetails.ourStoryContent || {};
  const storyText = content.storyText || '';
  const photos = content.photos || [];
  const milestones = content.milestones || [];

  return (
    <div style={{ backgroundColor: theme.lightBg, color: theme.lightText, minHeight: '100vh', padding: '60px 24px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Story text */}
        {storyText && (
          <SectionReveal
            universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}
            style={{
              fontFamily: typography.bodyFont,
              fontSize: 'clamp(1rem, 2vw, 1.125rem)',
              lineHeight: 1.8,
              marginBottom: '60px',
              whiteSpace: 'pre-wrap'
            }}
          >
            {storyText}
          </SectionReveal>
        )}

        {/* Photo gallery */}
        {photos.length > 0 && (
          <div style={{ marginBottom: '60px' }}>
            <h2
              style={{
                fontFamily: typography.headingFont,
                fontSize: 'clamp(1.5rem, 4vw, 2.25rem)',
                fontWeight: typography.headingWeight,
                marginBottom: '40px',
                textAlign: 'center'
              }}
            >
              Moments
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px' }}>
              {photos.map((photo, i) => (
                <SectionReveal key={i} universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
                  <img
                    src={photo}
                    alt="Wedding moment"
                    style={{ width: '100%', height: '300px', objectFit: 'cover', borderRadius: '4px' }}
                  />
                </SectionReveal>
              ))}
            </div>
          </div>
        )}

        {/* Timeline */}
        {milestones.length > 0 && (
          <div>
            <h2
              style={{
                fontFamily: typography.headingFont,
                fontSize: 'clamp(1.5rem, 4vw, 2.25rem)',
                fontWeight: typography.headingWeight,
                marginBottom: '40px',
                textAlign: 'center'
              }}
            >
              Our Journey
            </h2>
            <div style={{ maxWidth: '500px', margin: '0 auto' }}>
              {milestones.map((milestone, i) => (
                <SectionReveal
                  key={i}
                  universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}
                  style={{
                    display: 'flex',
                    gap: '24px',
                    marginBottom: '32px',
                    position: 'relative',
                    paddingLeft: '40px'
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      width: '12px',
                      height: '12px',
                      backgroundColor: theme.accent,
                      borderRadius: '50%',
                      marginTop: '4px'
                    }}
                  />
                  <div>
                    <div
                      style={{
                        fontFamily: typography.headingFont,
                        fontSize: '0.875rem',
                        fontWeight: typography.headingWeight,
                        color: theme.accent,
                        marginBottom: '4px'
                      }}
                    >
                      {milestone.date}
                    </div>
                    <div
                      style={{
                        fontFamily: typography.bodyFont,
                        fontSize: '1rem',
                        fontWeight: typography.bodyWeight,
                        lineHeight: 1.6
                      }}
                    >
                      {milestone.text}
                    </div>
                  </div>
                </SectionReveal>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}