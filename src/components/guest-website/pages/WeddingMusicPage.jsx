import React from 'react';
import SectionReveal from '../SectionReveal';
import { isMotionEnabled } from '@/lib/universeStyling';

export default function WeddingMusicPage({ weddingDetails, theme, typography, universeConfig }) {
  const content = weddingDetails.musicContent || {};

  const extractSpotifyEmbedId = (url) => {
    const match = url?.match(/spotify\.com\/playlist\/([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
  };

  const spotifyId = extractSpotifyEmbedId(content.spotifyPlaylistUrl);

  return (
    <div style={{ backgroundColor: theme.lightBg, color: theme.lightText, minHeight: '100vh', padding: '60px 24px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
          <h1
            style={{
              fontFamily: typography.headingFont,
              fontSize: 'clamp(2rem, 5vw, 3rem)',
              fontWeight: typography.headingWeight,
              marginBottom: '40px',
              textAlign: 'center'
            }}
          >
            Our Music
          </h1>
        </SectionReveal>

        {content.customMessage && (
          <SectionReveal
            universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}
            style={{
              fontFamily: typography.bodyFont,
              fontSize: '1rem',
              lineHeight: 1.8,
              marginBottom: '40px',
              textAlign: 'center'
            }}
          >
            {content.customMessage}
          </SectionReveal>
        )}

        {spotifyId && (
          <SectionReveal
            universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}
            style={{ marginBottom: '40px' }}
          >
            <iframe
              src={`https://open.spotify.com/embed/playlist/${spotifyId}?utm_source=generator`}
              width="100%"
              height="380"
              frameBorder="0"
              allowFullScreen
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              style={{ borderRadius: '4px' }}
            ></iframe>
          </SectionReveal>
        )}

        {content.enableGuestRequests && (
          <SectionReveal
            universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}
            style={{
              backgroundColor: theme.darkBg,
              color: theme.darkText,
              padding: '40px',
              borderRadius: '4px',
              textAlign: 'center'
            }}
          >
            <p style={{
              fontFamily: typography.bodyFont,
              fontSize: '1rem',
              lineHeight: 1.8
            }}>
              Want to suggest a song? <strong>Add it to our playlist during RSVP!</strong>
            </p>
          </SectionReveal>
        )}
      </div>
    </div>
  );
}