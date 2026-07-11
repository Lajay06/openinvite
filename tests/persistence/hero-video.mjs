/**
 * tests/persistence/hero-video.mjs
 *
 * Covers the feat/video-hero goal (BUILDER_UNIVERSE_AUDIT.md item 4):
 * src/lib/heroVideo.js's URL-type detection and embed-URL construction.
 *
 * Pure-function tests — no Base44 API calls, no auth needed.
 */

import { detectHeroVideoType, youtubeEmbedUrl, vimeoEmbedUrl } from '../../src/lib/heroVideo.js';
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

  return results;
}
