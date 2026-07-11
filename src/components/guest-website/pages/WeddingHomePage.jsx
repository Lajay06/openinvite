import React, { useState, useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { detectHeroVideoType, youtubeEmbedUrl, vimeoEmbedUrl } from '@/lib/heroVideo';

// Fullscreen-"cover" CSS trick for 16:9 iframe embeds (YouTube/Vimeo) —
// these players don't support object-fit, so the iframe is deliberately
// oversized and centred to always fill the hero regardless of its own
// aspect ratio, then clipped by the parent's overflow:hidden.
const IFRAME_COVER_STYLE = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  width: '177.78vh',   // 16:9 aspect, sized off viewport height
  height: '100vh',
  minWidth: '100%',
  minHeight: '56.25vw', // 16:9 aspect, sized off viewport width
  transform: 'translate(-50%, -50%)',
  border: 'none',
  pointerEvents: 'none',
};

/**
 * Renders the hero's background media: a real video (direct file or
 * YouTube/Vimeo embed) when the couple has set one, falling back to the
 * existing static cover-photo image otherwise — or if the video fails to
 * load, or the visitor has data-saver/prefers-reduced-motion enabled, in
 * which case autoplaying video is skipped entirely in favour of the image
 * (never a broken player).
 */
function HeroBackground({ coverPhoto, heroVideoUrl, prefersReduced }) {
  const [videoFailed, setVideoFailed] = useState(false);
  const video = useMemo(() => detectHeroVideoType(heroVideoUrl), [heroVideoUrl]);

  // Network Information API — not supported everywhere; absence just means
  // this signal is skipped, not that data-saver mode is assumed off.
  const saveData = typeof navigator !== 'undefined' && navigator.connection?.saveData === true;

  const showVideo = !!video && !videoFailed && !prefersReduced && !saveData;

  const imageFallback = (
    <div
      style={{
        position: 'absolute', inset: 0,
        backgroundImage: coverPhoto ? `url(${coverPhoto})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    />
  );

  if (!showVideo) return imageFallback;

  if (video.type === 'file') {
    return (
      <>
        {/* Poster shows immediately; swapped for the playing video once it
            can play, and shown again permanently if the video errors. */}
        {imageFallback}
        <video
          autoPlay
          muted
          loop
          playsInline
          poster={coverPhoto || undefined}
          onError={() => setVideoFailed(true)}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        >
          <source src={video.url} />
        </video>
      </>
    );
  }

  // YouTube / Vimeo — privacy-friendly embed, no controls, autoplay muted
  // loop. No reliable onError signal for cross-origin iframes, so a
  // malformed embed just renders an empty/black frame over the image
  // fallback rather than crashing.
  const embedUrl = video.type === 'youtube' ? youtubeEmbedUrl(video.id) : vimeoEmbedUrl(video.id);
  return (
    <>
      {imageFallback}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
        <iframe
          src={embedUrl}
          title="Wedding hero video"
          allow="autoplay; encrypted-media"
          style={IFRAME_COVER_STYLE}
        />
      </div>
    </>
  );
}

export default function WeddingHomePage({ weddingDetails, theme, typography, universeConfig }) {
  const tagline = weddingDetails.homeContent?.tagline || weddingDetails.welcomeMessage || 'We are overjoyed to celebrate with you.';
  const prefersReduced = useReducedMotion();

  return (
    <div style={{ backgroundColor: theme.darkBg, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Hero */}
      <div
        style={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <HeroBackground
          coverPhoto={weddingDetails.coverPhoto}
          heroVideoUrl={weddingDetails.heroVideoUrl}
          prefersReduced={prefersReduced}
        />

        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: `${theme.darkBg}40`
          }}
        />

        {/* Texture now renders once, site-wide, at the root in
            MultiPageWeddingWebsite.jsx — no longer duplicated here. */}

        <motion.div
          initial={{ opacity: 0, y: prefersReduced ? 0 : 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: prefersReduced ? 0 : (universeConfig?.motion?.duration ?? 0.8) }}
          style={{
            position: 'relative',
            zIndex: 10,
            textAlign: 'center',
            color: theme.lightBg
          }}
        >
          <h1
            style={{
              fontFamily: typography.headingFont,
              fontSize: 'clamp(2rem, 8vw, 4.5rem)',
              fontWeight: typography.headingWeight,
              fontStyle: typography.headingStyle || 'normal',
              letterSpacing: '-0.02em',
              marginBottom: '12px',
              lineHeight: 1.1
            }}
          >
            {weddingDetails.coupleNames}
          </h1>

          <p
            style={{
              fontFamily: typography.bodyFont,
              fontSize: 'clamp(0.875rem, 2vw, 1.25rem)',
              fontWeight: typography.bodyWeight,
              marginBottom: '24px',
              opacity: 0.9
            }}
          >
            {new Date(weddingDetails.weddingDate).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric'
            })}
          </p>

          <motion.div
            initial={{ opacity: 0, y: prefersReduced ? 0 : 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: prefersReduced ? 0 : 0.3, duration: prefersReduced ? 0 : (universeConfig?.motion?.duration ?? 0.8) }}
            style={{
              fontFamily: typography.bodyFont,
              fontSize: 'clamp(0.875rem, 1.5vw, 1rem)',
              fontWeight: typography.bodyWeight,
              maxWidth: '600px',
              margin: '0 auto',
              letterSpacing: '0.05em',
              opacity: 0.85
            }}
          >
            {tagline}
          </motion.div>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        style={{
          position: 'absolute',
          bottom: '40px',
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: '24px',
          opacity: 0.6,
          zIndex: 20
        }}
      >
        ↓
      </motion.div>
    </div>
  );
}
