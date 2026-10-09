/**
 * tests/persistence/tour-recordings-live.mjs
 *
 * WHAT CLOUDINARY ACTUALLY SERVES, AND HOW BIG IT IS.
 *
 * The size ceiling in the goal is 1.5 MB per recording, and the only number
 * that can be held to it is the DELIVERED one. The webm is what we uploaded,
 * so its size is ours; the mp4 is a transcode Cloudinary performs on request
 * and the poster is a frame it extracts, and neither exists until something
 * asks for it. A guard that measured the local file would be measuring the one
 * artifact nobody downloads.
 *
 * LOCAL, NOT CI, and deliberately so. hero-masters-live.mjs is in the same set
 * for the same reason: this repository does not ask Cloudinary questions from
 * GitHub Actions. The offline half of this pair, tour-recordings.mjs, runs in
 * CI on every PR and checks everything a URL can be checked for without
 * fetching it.
 *
 * HEAD FIRST, AND ONE BYTE WHEN HEAD WILL NOT SAY. A GET of sixteen videos is
 * the test loop that produced a 38.5 GB month
 * (scripts/lib/blockRemoteImages.mjs), so nothing here downloads a body. HEAD
 * answers for the webm and the poster, which are stored objects.
 *
 * IT DOES NOT ANSWER FOR THE MP4. Cloudinary streams a transcoded derivative
 * chunked, with no Content-Length on HEAD at all, and the first version of this
 * guard read that absence as a failure and reported sixteen oversized files
 * that were nothing of the kind. A one-byte ranged GET is what settles it: the
 * 206 comes back with `Content-Range: bytes 0-0/286074`, which is the real
 * delivered size for one byte of traffic. Measure what is served, never what a
 * header omits.
 *
 * The first request for a derivative is what builds it, so a cold run is slower
 * than a warm one and that is not a failure.
 */
import { readFileSync, existsSync } from 'node:fs';
import { CHAPTERS, MEDIA, TOUR_PAGE_MEDIA } from '../../src/lib/studioTour.js';
import { pass, fail } from './_shared.mjs';

/** The goal's ceiling, in bytes. */
const MAX_BYTES = 1.5 * 1024 * 1024;

async function head(url) {
  try {
    const res = await fetch(url, { method: 'HEAD', redirect: 'follow' });
    const out = {
      status: res.status,
      type: res.headers.get('content-type') || '',
      bytes: Number(res.headers.get('content-length') || 0),
      measuredBy: 'HEAD',
    };
    if (out.status === 200 && !out.bytes) {
      // A COLD DERIVATIVE HAS NO SIZE YET, WHICH IS NOT THE SAME AS BEING
      // OVERSIZED. The first request for a transcode is what builds it, and
      // while it builds, Cloudinary answers 200 with neither a Content-Length
      // nor a Content-Range. That is a state that has not begun, not a
      // measurement, and reading it as a failure is how this guard reported
      // ava @ 1440 as unbounded thirty seconds before the same URL returned
      // 273,490 bytes. So it waits and asks again rather than failing on a
      // number that does not exist yet.
      for (const waitMs of [0, 4000, 8000]) {
        if (waitMs) await new Promise((r) => setTimeout(r, waitMs));
        const total = await rangedSize(url);
        if (total) { out.bytes = total; out.measuredBy = waitMs ? `range after ${waitMs / 1000}s` : 'range'; break; }
        const retry = await fetch(url, { method: 'HEAD', redirect: 'follow' }).catch(() => null);
        const len = Number(retry?.headers.get('content-length') || 0);
        if (len) { out.bytes = len; out.measuredBy = waitMs ? `HEAD after ${waitMs / 1000}s` : 'HEAD'; break; }
      }
    }
    return out;
  } catch (e) {
    return { status: 0, type: '', bytes: 0, error: String(e.message || e).slice(0, 80) };
  }
}

/** The total size out of a one-byte range request, for a chunked derivative. */
async function rangedSize(url) {
  try {
    const res = await fetch(url, { headers: { Range: 'bytes=0-0' }, redirect: 'follow' });
    const m = /\/(\d+)$/.exec(res.headers.get('content-range') || '');
    return m ? Number(m[1]) : 0;
  } catch {
    return 0;
  }
}

export async function runTourRecordingsLive() {
  // An array of booleans, because scripts/test-persistence.mjs spreads it.
  const r = [];
  const check = (name, ok, detail) => r.push(ok ? pass(name, detail) : fail(name, 'see name', detail));

  console.log('\n  Tour recordings, as Cloudinary actually serves them:\n');

  // THE /tour CLIPS RIDE THE SAME LOOP. They are the same kind of asset under
  // the same ceiling, keyed tour-page/<clip> so a failure names which map.
  const maps = { ...MEDIA };
  for (const [k, v] of Object.entries(TOUR_PAGE_MEDIA)) if (v) maps[`tour-page/${k}`] = v;
  const recorded = [...CHAPTERS.map((c) => c.key).filter((k) => MEDIA[k]),
    ...Object.keys(maps).filter((k) => k.startsWith('tour-page/'))];
  if (!recorded.length) {
    console.log('  no chapter has footage yet, nothing to deliver');
    return r;
  }

  const kb = (n) => `${(n / 1024).toFixed(0)} KB`;

  for (const key of recorded) {
    for (const [label, side] of [['1440', maps[key]], ['390', maps[key].phone]]) {
      if (!side) continue;
      for (const [field, wantType, capped] of [
        ['webm', 'video/webm', true],
        ['mp4', 'video/mp4', true],
        ['poster', 'image/', false],
      ]) {
        const res = await head(side[field]);
        const at = `${key} @ ${label} ${field}`;
        check(`${at} is served`, res.status === 200, res.error || `HTTP ${res.status}`);
        if (res.status !== 200) continue;
        check(`${at} is ${wantType}`, res.type.startsWith(wantType), res.type || 'no content type');
        if (capped) {
          check(`${at} is at or under 1.5 MB`, res.bytes > 0 && res.bytes <= MAX_BYTES,
            res.bytes ? `${kb(res.bytes)}, by ${res.measuredBy}` : 'no size from HEAD or a ranged GET');
        } else {
          console.log(`        ${at}: ${kb(res.bytes)}`);
        }
      }
    }
  }

  // ── AND EVERY RECORDING THE PRERENDERED /tour PAGE NAMES ──────────────
  // A URL on the page that is in neither map would never be HEADed above, so
  // the page is read for its own: every Cloudinary video URL in the served
  // HTML, checked the same way. Posters are what the HTML carries before the
  // video mounts.
  const page = 'prerendered/tour/index.html';
  if (existsSync(page)) {
    const html = readFileSync(page, 'utf8');
    const urls = [...new Set([...html.matchAll(/https:\/\/res\.cloudinary\.com\/[^"' )]+\/video\/upload\/[^"' )]+\.(?:jpg|mp4|webm)/g)].map((m) => m[0]))];
    check('/tour names at least one recording', urls.length > 0, `${urls.length} URL(s)`);
    for (const url of urls) {
      const res = await head(url);
      const want = url.endsWith('.jpg') ? 'image/' : url.endsWith('.mp4') ? 'video/mp4' : 'video/webm';
      const at = `/tour ${url.split('/').slice(-3).join('/')}`;
      check(`${at} is served`, res.status === 200, res.error || `HTTP ${res.status}`);
      if (res.status !== 200) continue;
      check(`${at} is ${want}`, res.type.startsWith(want), res.type || 'no content type');
      if (!url.endsWith('.jpg')) {
        check(`${at} is at or under 1.5 MB`, res.bytes > 0 && res.bytes <= MAX_BYTES, res.bytes ? kb(res.bytes) : 'no size');
      }
    }
  } else {
    check('/tour is prerendered', false, `${page} missing`);
  }

  return r;
}
