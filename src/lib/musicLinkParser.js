/**
 * parseMusicLink — turns a pasted Spotify, Apple Music, or YouTube/YouTube
 * Music URL into { source, embed_url }, or null if unrecognised. Entirely
 * client-side and key-free: all three platforms serve a public, no-auth
 * iframe embed for a single track, so this never calls any API.
 *
 * Spotify links get the same treatment (open.spotify.com/embed/track/<id>)
 * rather than being resolved to real metadata/preview_url — that would
 * require server-side Spotify API credentials to look up an arbitrary
 * track by ID, which is exactly the key requirement this link-paste path
 * is meant to avoid. Search remains the only way to get a real preview_url
 * for a Spotify track.
 */
export function parseMusicLink(rawUrl) {
  const url = (rawUrl || '').trim();
  if (!url) return null;

  const spotifyMatch =
    url.match(/spotify\.com\/(?:intl-[a-z]{2}\/)?track\/([a-zA-Z0-9]+)/i) ||
    url.match(/spotify:track:([a-zA-Z0-9]+)/i);
  if (spotifyMatch) {
    return { source: 'spotify', embed_url: `https://open.spotify.com/embed/track/${spotifyMatch[1]}` };
  }

  if (/music\.apple\.com/i.test(url)) {
    try {
      const u = new URL(url);
      u.hostname = 'embed.music.apple.com';
      return { source: 'apple', embed_url: u.toString() };
    } catch {
      return null;
    }
  }

  const youtubePatterns = [
    /(?:music\.)?youtube\.com\/watch\?(?:[^#]*&)?v=([a-zA-Z0-9_-]{11})/i,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/i,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/i,
  ];
  for (const pattern of youtubePatterns) {
    const m = url.match(pattern);
    if (m) return { source: 'youtube', embed_url: `https://www.youtube.com/embed/${m[1]}` };
  }

  return null;
}

/**
 * parsePlaylistLink — the PLAYLIST counterpart to parseMusicLink.
 *
 * parseMusicLink matches /track/<id>; a playlist URL is /playlist/<id> and does
 * not match it, so the music rebuild (2026-08-18) needed its own parser rather
 * than a looser regex on the existing one — widening that would have made a
 * track link parse as a playlist and embed the wrong thing.
 *
 * Returns { source, sourceLabel, embed_url } or null. sourceLabel is for
 * display; it is DERIVED here on every call and never stored, which is the
 * whole reason WeddingDetails.music.playlists[].playlistUrl holds the raw URL
 * and no source field (advisor ruling, 2026-08-18).
 */
export function parsePlaylistLink(rawUrl) {
  const url = (rawUrl || '').trim();
  if (!url) return null;

  const spotify = url.match(/spotify\.com\/(?:intl-[a-z]{2}\/)?playlist\/([a-zA-Z0-9]+)/i)
    || url.match(/spotify:playlist:([a-zA-Z0-9]+)/i);
  if (spotify) {
    return { source: 'spotify', sourceLabel: 'Spotify', embed_url: `https://open.spotify.com/embed/playlist/${spotify[1]}` };
  }

  if (/music\.apple\.com/i.test(url) && /\/playlist\//i.test(url)) {
    try {
      const u = new URL(url);
      u.hostname = 'embed.music.apple.com';
      return { source: 'apple', sourceLabel: 'Apple Music', embed_url: u.toString() };
    } catch {
      return null;
    }
  }

  const yt = url.match(/(?:music\.)?youtube\.com\/playlist\?(?:[^#]*&)?list=([a-zA-Z0-9_-]+)/i)
    || url.match(/(?:music\.)?youtube\.com\/watch\?(?:[^#]*&)?list=([a-zA-Z0-9_-]+)/i);
  if (yt) {
    return { source: 'youtube', sourceLabel: 'YouTube', embed_url: `https://www.youtube.com/embed/videoseries?list=${yt[1]}` };
  }

  return null;
}
