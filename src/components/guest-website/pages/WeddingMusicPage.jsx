import React, { useState, useRef } from 'react';
import { Turnstile } from '@marsidev/react-turnstile';
import SectionReveal from '../SectionReveal';
import GuestPageHeading from '../GuestPageHeading';
import { isMotionEnabled } from '@/lib/universeStyling';
import { parsePlaylistLink } from '@/lib/musicLinkParser';
import { getCachedWeddingPassword } from '@/lib/guestSitePassword';
import { formSurfaces, accentChip, accentText } from '@/lib/surfaceTint';
import { DEFAULT_MUSIC_REQUEST_MESSAGE } from '@/lib/musicCopy';

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;

/**
 * Music rebuild, 2026-08-18. Merged into the shell, 2026-09-05.
 *
 * THE PAGE USED TO BE TWO PAGES. The playlist lived here; the request FORM
 * lived on a standalone route (pages/GuestMusic.jsx) that App.jsx listed BEFORE
 * the catch-all, so /w/:slug/music never reached this component at all. A guest
 * therefore met a black page in Spotify green whatever universe the couple had
 * chosen, and the couple's builder preview showed them this page — playlist and
 * a link — which no guest was ever served. Two defects with one cause.
 *
 * The form is now here, on the same endpoint with the same payload and the same
 * Turnstile gate, and the override is gone. GuestMusic.jsx stays in the tree,
 * unrouted, until the next release confirms nothing else reaches for it.
 *
 * COLOR. The imported form carried 66 hard-coded stops across 20 distinct
 * values — #0A0A0A ground, #FFFFFF text, 25 rgba(255,255,255,x) overlays and
 * Spotify's #1DB954 as the action color. None of them are a universe's. Every
 * one is now derived from the couple's palette through surfaceTint, which is
 * the same helper the RSVP form uses and the one tests/persistence/
 * rsvp-surfaces.mjs measures against all twenty palettes:
 *
 *   ground / ink      theme.lightBg, theme.lightText   the page, as before
 *   controls          formSurfaces(theme)              solid, mixed, measurable
 *   the action        accentChip(theme)                fill deepened until the
 *                                                      palette's light text passes
 *   meta text         accentText(theme)                accent darkened to 4.5:1
 *   the closed state  theme.darkBg / theme.darkText    the palette's own dark pair
 *
 * Mixed, never alpha: an alpha fill composites over whatever texture the
 * universe paints behind it, so its final color is unknowable and its contrast
 * unprovable. See surfaceTint.js.
 *
 * It also reads music.playlists[0].playlistUrl through parsePlaylistLink rather
 * than the old musicContent.spotifyPlaylistUrl with its Spotify-only regex, so
 * Spotify, Apple Music and YouTube all embed from the one stored field.
 */
export default function WeddingMusicPage({ weddingDetails, theme, typography, universeConfig }) {
  const content = weddingDetails.musicContent || {};
  const music = weddingDetails.music || {};
  const slug = weddingDetails.slug;

  const S = formSurfaces(theme);
  const chip = accentChip(theme);
  const meta = accentText(theme);
  const reveal = { universeConfig, disabled: !isMotionEnabled(weddingDetails) };

  const playlistEmbed = parsePlaylistLink((music.playlists || [])[0]?.playlistUrl || '');
  const requestsEnabled = !!music.guestRequestsEnabled;
  const isOpen = !music.requestsClosedDate || new Date(music.requestsClosedDate) > new Date();

  // The couple's own dashboard enforces these server-side regardless (see
  // api/song-request-submit.js) — asking for email up front just avoids a guest
  // filling out the whole form before hitting a 400 for a gate this page could
  // have told them about immediately.
  const emailRequired = !!(music.onlyForConfirmedGuests || music.limitOnePerGuest);

  const [songTitle, setSongTitle] = useState('');
  const [songArtist, setSongArtist] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestNote, setGuestNote] = useState('');
  const [submitted, setSubmitted] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const turnstileRef = useRef(null);
  const tsTokenRef = useRef('');

  const emailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail.trim());
  const canSubmit = !!songTitle.trim() && !!songArtist.trim() && !!guestName.trim()
    && (!emailRequired || emailLooksValid) && !submitting;

  // Same endpoint, same payload shape, same Turnstile token as the standalone
  // route sent — including spotifyTrackId: null, which is what the free-text
  // path has always stored since search was removed in the rebuild.
  const submitRequest = async () => {
    if (!canSubmit) return;
    if (!tsTokenRef.current) { setSubmitError('Security check still loading — please try again in a moment.'); return; }
    setSubmitError('');
    setSubmitting(true);
    const title = songTitle.trim();
    const artist = songArtist.trim();
    try {
      const res = await fetch('/api/song-request-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weddingSlug: slug,
          spotifyTrackId: null,
          title,
          artist,
          album: '',
          albumArt: '',
          duration: 0,
          explicit: false,
          spotifyUrl: '',
          submittedBy: guestName,
          password: getCachedWeddingPassword(slug),
          guestEmail: guestEmail.trim(),
          guestNote,
          turnstileToken: tsTokenRef.current,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSubmitError(data.error || 'Something went wrong. Please try again.');
        tsTokenRef.current = '';
        turnstileRef.current?.reset();
        return;
      }
      setSubmitted({ title, artist });
    } catch {
      setSubmitError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const requestAnother = () => {
    setSubmitted(null);
    setSongTitle(''); setSongArtist(''); setGuestNote(''); setGuestEmail('');
  };

  const fieldStyle = {
    width: '100%',
    padding: '14px 16px',
    backgroundColor: S.surface,
    border: `1px solid ${S.border}`,
    borderRadius: 0,
    color: theme.lightText,
    fontFamily: typography.bodyFont,
    fontSize: '1rem',
    outline: 'none',
    boxSizing: 'border-box',
    marginBottom: 10,
  };

  const labelStyle = {
    display: 'block',
    fontFamily: typography.bodyFont,
    fontSize: '0.6875rem',
    fontWeight: 600,
    letterSpacing: '0.16em',
    color: meta,
    marginBottom: 10,
  };

  return (
    <div style={{ backgroundColor: theme.lightBg, color: theme.lightText, minHeight: '100vh', padding: '60px 24px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <SectionReveal {...reveal}>
          <GuestPageHeading title={"Our Music"} theme={theme} typography={typography} universeConfig={universeConfig} />
        </SectionReveal>

        {content.customMessage && (
          <SectionReveal
            {...reveal}
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

        {playlistEmbed && (
          <SectionReveal {...reveal} style={{ marginBottom: '40px' }}>
            <iframe
              title="Wedding playlist"
              src={playlistEmbed.embed_url}
              width="100%"
              height="380"
              frameBorder="0"
              allowFullScreen
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              style={{ borderRadius: '4px', border: `1px solid ${S.border}`, display: 'block' }}
            ></iframe>
          </SectionReveal>
        )}

        {/* Requests closed by the couple's own date. The palette's designed dark
            pair, so a closed page still reads as a deliberate end rather than a
            missing section. */}
        {requestsEnabled && !isOpen && (
          <SectionReveal
            {...reveal}
            style={{
              backgroundColor: theme.darkBg, color: theme.darkText,
              padding: '40px', textAlign: 'center',
              fontFamily: typography.bodyFont, fontSize: '1rem', lineHeight: 1.8,
            }}
          >
            Song requests have closed. Thank you for your suggestions.
          </SectionReveal>
        )}

        {requestsEnabled && isOpen && submitted && (
          <SectionReveal {...reveal} style={{ textAlign: 'center', padding: '32px 0' }}>
            <div aria-hidden="true" style={{
              width: 56, height: 56, borderRadius: '50%',
              backgroundColor: chip.background, color: chip.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 style={{
              fontFamily: typography.headingFont, fontWeight: typography.headingWeight,
              fontSize: 'clamp(1.5rem, 4vw, 2rem)', margin: '0 0 12px',
            }}>
              Request received
            </h2>
            <p style={{ fontFamily: typography.bodyFont, fontSize: '0.9375rem', lineHeight: 1.8, margin: '0 0 28px' }}>
              &ldquo;{submitted.title}&rdquo; by {submitted.artist} has been sent to the couple.
            </p>
            <button
              type="button"
              onClick={requestAnother}
              style={{
                padding: '12px 28px', backgroundColor: 'transparent',
                border: `1px solid ${S.border}`, borderRadius: 0, color: theme.lightText,
                fontFamily: typography.bodyFont, fontSize: '0.8125rem', fontWeight: 600,
                letterSpacing: '0.08em', cursor: 'pointer',
              }}
            >
              Request another song
            </button>
          </SectionReveal>
        )}

        {requestsEnabled && isOpen && !submitted && (
          <SectionReveal {...reveal}>
            <p style={{ ...labelStyle, textAlign: 'center', marginBottom: 16 }}>
              Request a song
            </p>
            <p style={{
              fontFamily: typography.bodyFont, fontSize: '1rem', lineHeight: 1.8,
              textAlign: 'center', margin: '0 0 8px',
            }}>
              {music.requestMessage ?? DEFAULT_MUSIC_REQUEST_MESSAGE}
            </p>
            {music.requestsClosedDate && (
              <p style={{
                fontFamily: typography.bodyFont, fontSize: '0.8125rem',
                textAlign: 'center', color: meta, margin: '0 0 32px',
              }}>
                Requests close {new Date(music.requestsClosedDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'long' })}
              </p>
            )}

            <div style={{ maxWidth: 460, margin: '0 auto' }}>
              <label style={labelStyle} htmlFor="song-title">Your song</label>
              <input
                id="song-title"
                value={songTitle}
                onChange={e => setSongTitle(e.target.value)}
                placeholder="Song title"
                style={fieldStyle}
              />
              <input
                value={songArtist}
                onChange={e => setSongArtist(e.target.value)}
                placeholder="Artist"
                aria-label="Artist"
                style={{ ...fieldStyle, marginBottom: 24 }}
              />

              <label style={labelStyle} htmlFor="guest-name">Who is asking</label>
              <input
                id="guest-name"
                value={guestName}
                onChange={e => setGuestName(e.target.value)}
                placeholder="Your name"
                style={fieldStyle}
              />
              <input
                type="email"
                value={guestEmail}
                onChange={e => setGuestEmail(e.target.value)}
                placeholder={emailRequired ? 'Your email' : 'Your email (optional)'}
                aria-label={emailRequired ? 'Your email' : 'Your email, optional'}
                style={fieldStyle}
              />
              <textarea
                value={guestNote}
                onChange={e => setGuestNote(e.target.value)}
                placeholder="Add a note (optional)"
                aria-label="Add a note, optional"
                rows={3}
                style={{ ...fieldStyle, resize: 'none', marginBottom: 20 }}
              />

              {submitError && (
                <p style={{ fontFamily: typography.bodyFont, fontSize: '0.8125rem', color: '#E03553', marginBottom: 16 }}>
                  {submitError}
                </p>
              )}

              {/* Invisible Turnstile — execution="render" auto-generates a token on mount */}
              <Turnstile
                ref={turnstileRef}
                siteKey={TURNSTILE_SITE_KEY}
                onSuccess={(token) => { tsTokenRef.current = token; }}
                onExpire={() => { tsTokenRef.current = ''; }}
                options={{ appearance: 'execute', execution: 'render' }}
              />

              <button
                type="button"
                onClick={submitRequest}
                disabled={!canSubmit}
                style={{
                  width: '100%', padding: '18px', minHeight: 60,
                  backgroundColor: chip.background, color: chip.color,
                  border: 'none', borderRadius: 0,
                  fontFamily: typography.bodyFont, fontSize: '0.875rem', fontWeight: 700,
                  letterSpacing: '0.08em',
                  cursor: canSubmit ? 'pointer' : 'not-allowed',
                  opacity: canSubmit ? 1 : 0.5,
                }}
              >
                {submitting ? 'Submitting…' : 'Submit song request'}
              </button>
            </div>
          </SectionReveal>
        )}
      </div>
    </div>
  );
}
