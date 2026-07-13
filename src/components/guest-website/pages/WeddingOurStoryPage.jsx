import React from 'react';
import SectionReveal from '../SectionReveal';
import { isMotionEnabled } from '@/lib/universeStyling';
import EditorialSectionKicker from '../layouts/EditorialSectionKicker';
import MinimalSectionMark from '../layouts/MinimalSectionMark';

export default function WeddingOurStoryPage({ weddingDetails, theme, typography, universeConfig }) {
  const content = weddingDetails.ourStoryContent || {};
  const storyText = content.storyText || '';
  const photos = content.photos || [];
  const milestones = content.milestones || [];
  const isEditorial = universeConfig?.layout === 'editorial-masthead';
  const isMinimal = universeConfig?.layout === 'aman-minimal';
  const copy = universeConfig?.copy || {};

  const containerMaxWidth = isMinimal ? '620px' : isEditorial ? '900px' : '800px';
  const containerMargin = isEditorial ? '0 0 0 auto' : '0 auto';
  const containerPadding = isMinimal ? '110px 40px' : isEditorial ? '90px 40px' : '60px 24px';

  return (
    <div style={{ backgroundColor: theme.lightBg, color: theme.lightText, minHeight: '100vh', padding: containerPadding }}>
      <div style={{ maxWidth: containerMaxWidth, margin: containerMargin }}>
        {isMinimal && (
          <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
            <MinimalSectionMark kicker={copy.storyKicker} theme={theme} typography={typography} />
          </SectionReveal>
        )}
        {isEditorial && (
          <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
            <EditorialSectionKicker kicker={copy.storyKicker} theme={theme} typography={typography} />
          </SectionReveal>
        )}

        {/* Story text */}
        {storyText && (
          <SectionReveal
            universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}
            style={{
              fontFamily: isMinimal ? typography.headingFont : isEditorial ? typography.headingFont : typography.bodyFont,
              fontSize: isMinimal ? 'clamp(1.15rem, 2.2vw, 1.5rem)' : isEditorial ? 'clamp(1.25rem, 2.6vw, 1.75rem)' : 'clamp(1rem, 2vw, 1.125rem)',
              fontStyle: isEditorial ? 'italic' : 'normal',
              lineHeight: isMinimal ? 1.75 : isEditorial ? 1.55 : 1.8,
              textAlign: isMinimal ? 'center' : 'left',
              marginBottom: isMinimal ? '88px' : '60px',
              whiteSpace: 'pre-wrap'
            }}
          >
            {storyText}
          </SectionReveal>
        )}

        {/* Photo gallery */}
        {photos.length > 0 && (
          <div style={{ marginBottom: isMinimal ? '88px' : '60px' }}>
            {isMinimal ? (
              <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
                <h2 style={{ fontFamily: typography.headingFont, fontWeight: typography.headingWeight, fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)', marginBottom: 48, textAlign: 'center' }}>
                  Moments
                </h2>
              </SectionReveal>
            ) : isEditorial ? (
              <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
                <h2 style={{ fontFamily: typography.headingFont, fontWeight: typography.headingWeight, fontSize: 'clamp(2rem, 5vw, 3.25rem)', marginBottom: 40, textAlign: 'left' }}>
                  Moments
                </h2>
              </SectionReveal>
            ) : (
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
            )}
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
            {isMinimal ? (
              <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
                <h2 style={{ fontFamily: typography.headingFont, fontWeight: typography.headingWeight, fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)', marginBottom: 48, textAlign: 'center' }}>
                  Our journey
                </h2>
              </SectionReveal>
            ) : isEditorial ? (
              <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
                <h2 style={{ fontFamily: typography.headingFont, fontWeight: typography.headingWeight, fontSize: 'clamp(2rem, 5vw, 3.25rem)', marginBottom: 40, textAlign: 'left' }}>
                  Our journey
                </h2>
              </SectionReveal>
            ) : (
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
            )}
            <div style={{ maxWidth: '500px', margin: isEditorial ? '0' : '0 auto' }}>
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
