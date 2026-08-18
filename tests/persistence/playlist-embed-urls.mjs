/**
 * Playlist embed URL construction.
 *
 * The YouTube branch shipped `/embed/videoseries?list=` — a form YouTube has
 * retired. It renders a BLANK FRAME for a real, public playlist and raises no
 * error, so a green build, a green suite and a rendered page all agreed the
 * feature worked while guests saw nothing. Verified on production by swapping
 * the same iframe's src to `listType=playlist`, which rendered immediately.
 *
 * The lesson these assertions encode: "the element rendered" is not "the
 * content loaded". A pin on the URL FORM is the part a test can actually hold.
 */
import { pass, fail } from './_shared.mjs';
import { parsePlaylistLink, parseMusicLink } from '../../src/lib/musicLinkParser.js';

export async function runPlaylistEmbedUrls() {
  const results = [];
  console.log('\n  Playlist embed URLs — the form must be one YouTube still serves:\n');
  const check = (n, ok, d) => results.push(ok ? pass(n, d) : fail(n, 'see name', d));

  const yt = parsePlaylistLink('https://www.youtube.com/playlist?list=PLFgquLnL59alCl_2TQvOiD5Vgm1hCaGSI');
  check('YouTube playlist parses', yt?.source === 'youtube', yt?.embed_url || 'null');
  check('  uses listType=playlist, the form YouTube still serves',
    /[?&]listType=playlist\b/.test(yt?.embed_url || ''), yt?.embed_url);
  check('  NEVER the retired /embed/videoseries form (renders blank, silently)',
    !/\/embed\/videoseries/.test(yt?.embed_url || ''), yt?.embed_url);
  check('  uses youtube-nocookie, matching heroVideo.js',
    /youtube-nocookie\.com/.test(yt?.embed_url || ''), yt?.embed_url);
  check('  carries the playlist id', /list=PLFgquLnL59alCl_2TQvOiD5Vgm1hCaGSI/.test(yt?.embed_url || ''), 'id present');

  const music = parsePlaylistLink('https://music.youtube.com/playlist?list=PLabc123');
  check('YouTube Music playlist parses to the same form',
    /listType=playlist/.test(music?.embed_url || '') && !/videoseries/.test(music?.embed_url || ''), music?.embed_url);

  const sp = parsePlaylistLink('https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M');
  check('Spotify playlist -> /embed/playlist/<id>',
    sp?.embed_url === 'https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM5M', sp?.embed_url);

  const ap = parsePlaylistLink('https://music.apple.com/gb/playlist/todays-hits/pl.f4d106fed2bd41149aaacabb233eb5eb');
  check('Apple Music playlist -> embed.music.apple.com host',
    /^https:\/\/embed\.music\.apple\.com\//.test(ap?.embed_url || ''), ap?.embed_url);

  // A track link must not be mistaken for a playlist — the reason
  // parsePlaylistLink is separate from parseMusicLink rather than a looser regex.
  const track = 'https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT';
  check('a TRACK link does not parse as a playlist', parsePlaylistLink(track) === null, 'null');
  check('  and still parses as a track', parseMusicLink(track)?.source === 'spotify', 'spotify');

  check('unrecognised links return null', parsePlaylistLink('https://example.com/nope') === null, 'null');
  check('empty input returns null', parsePlaylistLink('') === null && parsePlaylistLink(null) === null, 'null');

  return results;
}
