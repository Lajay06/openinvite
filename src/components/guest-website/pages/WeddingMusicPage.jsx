import React from 'react';
import SectionReveal from '../SectionReveal';
import GuestPageHeading from '../GuestPageHeading';
import { isMotionEnabled } from '@/lib/universeStyling';
import { parsePlaylistLink } from '@/lib/musicLinkParser';

/**
 * Music rebuild, 2026-08-18.
 *
 * This page used to read weddingDetails.musicContent.spotifyPlaylistUrl with
 * its own Spotify-only regex — a THIRD field for the playlist, alongside
 * music.playlists[] and the couple-side page's own state. It now reads the one
 * source of truth, music.playlists[0].playlistUrl, through the shared
 * parsePlaylistLink, so Spotify, Apple Music and YouTube all embed and the
 * builder preview cannot disagree with what is stored.
 *
 * The request FORM still lives on the dedicated /w/:slug/music route
 * (GuestMusic — Turnstile-protected, feature-complete). This page links to it
 * rather than duplicating it; see the PR notes for why collapsing the two into
 * one component is deferred rather than done here.
 */
export default function WeddingMusicPage({ weddingDetails, theme, typography, universeConfig }) {
  const content = weddingDetails.musicContent || {};
  const music = weddingDetails.music || {};
  const playlistUrl = (music.playlists || [])[0]?.playlistUrl || '';
  const parsed = parsePlaylistLink(playlistUrl);
  const requestsEnabled = music.guestRequestsEnabled !== false;
  const requestHref = weddingDetails.slug ? `/w/${weddingDetails.slug}/music` : null;

  return (
    <div style={{ backgroundColor: theme.lightBg, color: theme.lightText, minHeight: '100vh', padding: '60px 24px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
          <GuestPageHeading title={"Song requests"} theme={theme} typography={typography} universeConfig={universeConfig} />
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

        {parsed && (
          <SectionReveal
            universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}
            style={{ marginBottom: '40px' }}
          >
            <iframe
              title="Wedding playlist"
              src={parsed.embed_url}
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

        {requestsEnabled && requestHref && (
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
              Want to hear something on the night?{' '}
              <a href={requestHref} style={{ color: 'inherit', fontWeight: 700 }}>
                Request a song
              </a>
            </p>
          </SectionReveal>
        )}
      </div>
    </div>
  );
}