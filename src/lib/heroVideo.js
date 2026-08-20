/**
 * src/lib/heroVideo.js
 *
 * Pure URL-detection/embed-building logic for the hero video feature
 * (BUILDER_UNIVERSE_AUDIT.md item 4) — no DOM, no React, so it's directly
 * testable from the plain-Node persistence harness and shared between
 * WeddingHomePage.jsx (published site) and any future preview surface.
 */

const YOUTUBE_RE = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{6,})/i;
const VIMEO_RE = /vimeo\.com\/(?:video\/)?(\d+)/i;

/**
 * Detects what kind of hero video a URL points to.
 * @param {string} url
 * @returns {{ type: 'youtube'|'vimeo', id: string } | { type: 'file', url: string } | null}
 *   null if the input is empty/not a string — "no video set."
 */
export function detectHeroVideoType(url) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  const youtubeMatch = trimmed.match(YOUTUBE_RE);
  if (youtubeMatch) return { type: 'youtube', id: youtubeMatch[1] };

  const vimeoMatch = trimmed.match(VIMEO_RE);
  if (vimeoMatch) return { type: 'vimeo', id: vimeoMatch[1] };

  // Anything else (a direct .mp4/.webm/.mov file, or a signed CDN URL with
  // no visible extension) is treated as a direct file — the <video>
  // element itself fails gracefully (onError) if it isn't playable media.
  return { type: 'file', url: trimmed };
}

/**
 * youtube-nocookie.com — privacy-friendly embed domain (no cookies set
 * until the visitor actually interacts with the player). autoplay/mute/
 * loop/controls=0/playsinline for a clean, unobtrusive hero background.
 */
export function youtubeEmbedUrl(id) {
  return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=1&loop=1&playlist=${id}&controls=0&showinfo=0&modestbranding=1&playsinline=1&rel=0`;
}

/**
 * dnt=1 (do not track) + background=1 (Vimeo's own minimal-chrome
 * background-video mode: no controls, built-in autoplay/mute/loop).
 */
export function vimeoEmbedUrl(id) {
  return `https://player.vimeo.com/video/${id}?autoplay=1&muted=1&loop=1&background=1&dnt=1`;
}

/**
 * INLINE variants, for a body video block — content a guest chooses to play,
 * not wallpaper. Deliberately the opposite of the background builders above:
 * controls on, no autoplay, no mute, no loop.
 *
 * The bug these fix: VideoBlock reused the background builders, so every
 * embed link a couple pasted into a body block rendered silent, looping and
 * uncontrollable for every guest, permanently. The type === 'file' branch
 * beside it was always correct, which is why it went unnoticed.
 *
 * nocookie is right here. The #493/#494 finding was PLAYLIST-specific —
 * youtube-nocookie.com does not serve playlist embeds. These are
 * single-video embeds, which it serves normally.
 */
export function youtubeInlineEmbedUrl(id) {
  return `https://www.youtube-nocookie.com/embed/${id}?controls=1&modestbranding=1&playsinline=1&rel=0`;
}

/** dnt=1 only. NO background=1: that is Vimeo's chrome-less mode, which
 *  strips controls and forces mute and loop — the exact bug being fixed. */
export function vimeoInlineEmbedUrl(id) {
  return `https://player.vimeo.com/video/${id}?dnt=1`;
}
