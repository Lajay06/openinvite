/**
 * tests/persistence/hero-video.mjs
 *
 * Covers the feat/video-hero goal (BUILDER_UNIVERSE_AUDIT.md item 4):
 * src/lib/heroVideo.js's URL-type detection and embed-URL construction.
 *
 * Pure-function tests — no Base44 API calls, no auth needed.
 */

import { detectHeroVideoType, youtubeEmbedUrl, vimeoEmbedUrl,
         youtubeInlineEmbedUrl, vimeoInlineEmbedUrl } from '../../src/lib/heroVideo.js';
import { pass, fail } from './_shared.mjs';

export async function runHeroVideo() {
  const results = [];

  console.log('\n  Hero video — URL type detection:\n');

  results.push(detectHeroVideoType(null) === null && detectHeroVideoType('') === null && detectHeroVideoType('   ') === null
    ? pass('detectHeroVideoType — empty/null/whitespace → null (no video set)', 'null')
    : fail('detectHeroVideoType — empty/null/whitespace → null (no video set)', 'null', JSON.stringify([detectHeroVideoType(null), detectHeroVideoType(''), detectHeroVideoType('   ')])));

  {
    const cases = [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://youtu.be/dQw4w9WgXcQ',
      'https://www.youtube.com/embed/dQw4w9WgXcQ',
      'https://www.youtube.com/shorts/dQw4w9WgXcQ',
    ];
    const allMatch = cases.every(u => {
      const r = detectHeroVideoType(u);
      return r?.type === 'youtube' && r.id === 'dQw4w9WgXcQ';
    });
    results.push(allMatch
      ? pass('detectHeroVideoType — recognises every common YouTube URL shape', cases.join(', '))
      : fail('detectHeroVideoType — recognises every common YouTube URL shape', 'type:youtube, id:dQw4w9WgXcQ for all', cases.map(u => JSON.stringify(detectHeroVideoType(u))).join(' | ')));
  }

  {
    const cases = ['https://vimeo.com/123456789', 'https://vimeo.com/video/123456789'];
    const allMatch = cases.every(u => {
      const r = detectHeroVideoType(u);
      return r?.type === 'vimeo' && r.id === '123456789';
    });
    results.push(allMatch
      ? pass('detectHeroVideoType — recognises common Vimeo URL shapes', cases.join(', '))
      : fail('detectHeroVideoType — recognises common Vimeo URL shapes', 'type:vimeo, id:123456789 for all', cases.map(u => JSON.stringify(detectHeroVideoType(u))).join(' | ')));
  }

  {
    const direct = detectHeroVideoType('https://cdn.example.com/weddings/hero-abc123.mp4');
    results.push(direct?.type === 'file' && direct.url === 'https://cdn.example.com/weddings/hero-abc123.mp4'
      ? pass('detectHeroVideoType — a non-YouTube/Vimeo URL is treated as a direct file', JSON.stringify(direct))
      : fail('detectHeroVideoType — a non-YouTube/Vimeo URL is treated as a direct file', 'type:file', JSON.stringify(direct)));
  }

  {
    // A signed CDN URL with no visible file extension must still be
    // treated as a direct file (not silently dropped) — the <video>
    // element's own onError is what catches a genuinely bad URL.
    const noExtension = detectHeroVideoType('https://storage.example.com/blob/9f8e7d6c?sig=abc123');
    results.push(noExtension?.type === 'file'
      ? pass('detectHeroVideoType — a URL with no visible extension still resolves to a file, not dropped', JSON.stringify(noExtension))
      : fail('detectHeroVideoType — a URL with no visible extension still resolves to a file, not dropped', 'type:file', JSON.stringify(noExtension)));
  }

  console.log('\n  Hero video — embed URL construction:\n');

  {
    const href = youtubeEmbedUrl('dQw4w9WgXcQ');
    const valid = href.startsWith('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')
      && href.includes('autoplay=1') && href.includes('mute=1') && href.includes('loop=1') && href.includes('playsinline=1');
    results.push(valid
      ? pass('youtubeEmbedUrl — privacy-friendly (nocookie) domain, autoplay/mute/loop/playsinline', href)
      : fail('youtubeEmbedUrl — privacy-friendly (nocookie) domain, autoplay/mute/loop/playsinline', 'youtube-nocookie.com with autoplay/mute/loop/playsinline', href));
  }

  {
    const href = vimeoEmbedUrl('123456789');
    const valid = href.startsWith('https://player.vimeo.com/video/123456789')
      && href.includes('autoplay=1') && href.includes('muted=1') && href.includes('loop=1') && href.includes('dnt=1');
    results.push(valid
      ? pass('vimeoEmbedUrl — dnt=1 (do not track), autoplay/muted/loop/background mode', href)
      : fail('vimeoEmbedUrl — dnt=1 (do not track), autoplay/muted/loop/background mode', 'player.vimeo.com with autoplay/muted/loop/dnt=1', href));
  }

  // ── INLINE vs BACKGROUND ────────────────────────────────────────────────
  // The bug: VideoBlock built body-video embeds with the HERO BACKGROUND
  // builders, so a couple's pasted link played silent, looping and with no
  // controls for every guest. These four assertions pin both directions —
  // the inline variants must NOT be backgrounds, and the background
  // variants must STILL be backgrounds, so a future edit cannot quietly
  // converge them.
  {
    const yt = youtubeInlineEmbedUrl('abc123');
    const ok = yt.startsWith('https://www.youtube-nocookie.com/embed/abc123')
      && yt.includes('controls=1') && yt.includes('modestbranding=1')
      && yt.includes('playsinline=1') && yt.includes('rel=0')
      && !yt.includes('autoplay') && !yt.includes('mute') && !yt.includes('loop');
    results.push(ok
      ? pass('youtubeInlineEmbedUrl — controls on, no autoplay/mute/loop', yt)
      : fail('youtubeInlineEmbedUrl — controls on, no autoplay/mute/loop', 'controls=1 and none of autoplay/mute/loop', yt));
  }
  {
    const v = vimeoInlineEmbedUrl('123456789');
    const ok = v === 'https://player.vimeo.com/video/123456789?dnt=1'
      && !v.includes('background=1') && !v.includes('autoplay') && !v.includes('muted');
    results.push(ok
      ? pass('vimeoInlineEmbedUrl — dnt=1 only, never background=1', v)
      : fail('vimeoInlineEmbedUrl — dnt=1 only, never background=1', 'player.vimeo.com/video/<id>?dnt=1', v));
  }
  {
    // negative control: the background builders must be unchanged
    const yb = youtubeEmbedUrl('abc123');
    const ok = yb.includes('autoplay=1') && yb.includes('mute=1') && yb.includes('loop=1') && yb.includes('controls=0');
    results.push(ok
      ? pass('background YouTube builder still autoplays muted and looped', 'unchanged')
      : fail('background YouTube builder still autoplays muted and looped', 'autoplay/mute/loop/controls=0', yb));
  }
  {
    const vb = vimeoEmbedUrl('123456789');
    results.push(vb.includes('background=1')
      ? pass('background Vimeo builder still uses background=1', 'unchanged')
      : fail('background Vimeo builder still uses background=1', 'background=1', vb));
  }

  return results;
}
