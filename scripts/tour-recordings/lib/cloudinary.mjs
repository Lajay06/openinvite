/**
 * scripts/tour-recordings/lib/cloudinary.mjs
 *
 * ONE UPLOAD PER RECORDING, AND THREE URLS OUT OF IT.
 *
 * The plan was set when the media map was written (src/lib/studioTour.js):
 * webm is what we upload, and the mp4 and the poster are DELIVERY DERIVATIVES
 * of that same asset. This checkout has no general-purpose encoder, only the
 * stripped ffmpeg Playwright ships, which writes VP8 in webm and nothing else.
 * Cloudinary does the rest on the way out.
 *
 * Credential: CLOUDINARY_URL from .env.local, read exactly the way
 * scripts/seed-demo-data.mjs and the placeholder-poster script read it.
 * Nothing about it is printed, logged or passed anywhere else.
 */
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

export function cloudinaryConfig() {
  let url = process.env.CLOUDINARY_URL || '';
  if (!url) {
    for (const f of ['.env.local', '.env']) {
      if (!existsSync(f)) continue;
      for (const line of readFileSync(f, 'utf8').split('\n')) {
        if (line.startsWith('CLOUDINARY_URL=')) { url = line.slice('CLOUDINARY_URL='.length).trim(); break; }
      }
      if (url) break;
    }
  }
  const m = /^cloudinary:\/\/(\d+):([^@]+)@(.+)$/.exec(url);
  if (!m) return null;
  return { key: m[1], secret: m[2], cloud: m[3] };
}

/**
 * Upload one webm as studio-tour/<chapter>/<width>-<take>, a path of its own.
 *
 * A LIVE PATH IS NEVER OVERWRITTEN (owner ruling, 2026-10-09). Cloudinary
 * serves an asset by its path and ignores the version in the URL, so
 * uploading over studio-tour/publish/1440 changed what the live site played
 * before any PR merged, and once put a phone take where the desktop one
 * belonged. Each take now gets a new public_id stamped with the upload time,
 * overwrite is off, and the site switches to it only when src/lib/studioTour.js
 * does, in a reviewed PR.
 */
export async function uploadRecording({ file, chapterKey, widthLabel, config }) {
  const folder = `studio-tour/${chapterKey}`;
  const timestamp = Math.floor(Date.now() / 1000);
  const take = new Date(timestamp * 1000).toISOString().replace(/[-:T]/g, '').slice(0, 14);
  const params = { folder, overwrite: 'false', public_id: `${widthLabel}-${take}`, timestamp };
  const signature = createHash('sha1')
    .update(Object.keys(params).sort().map((k) => `${k}=${params[k]}`).join('&') + config.secret)
    .digest('hex');

  const fd = new FormData();
  for (const [k, v] of Object.entries(params)) fd.append(k, String(v));
  fd.append('api_key', config.key);
  fd.append('signature', signature);
  fd.append('file', new Blob([readFileSync(file)]), `${widthLabel}.webm`);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${config.cloud}/video/upload`, { method: 'POST', body: fd });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Cloudinary ${res.status}: ${body.error?.message || 'upload failed'}`);
  return body;
}

/**
 * The three URLs the media map holds, built from one uploaded asset.
 *
 * THE MP4 CARRIES AN EXPLICIT TRANSFORMATION, not q_auto alone, because the
 * size guard measures DELIVERED bytes and an unbounded transcode is a number
 * nobody chose. The poster is the frame at 1.0 s, as the brief asks, capped at
 * a width that suits the shape it was recorded in rather than forced to 16 by
 * 9: cropping a 390 by 844 phone recording to a landscape box would throw away
 * most of the screen it exists to show.
 */
export function deliveryUrls({ cloud, publicId, version, widthLabel }) {
  const base = `https://res.cloudinary.com/${cloud}/video/upload`;
  const v = `v${version}`;
  const posterWidth = widthLabel === '390' ? 780 : 1280;
  return {
    webm: `${base}/${v}/${publicId}.webm`,
    mp4: `${base}/vc_h264,q_auto:good,br_900k/${v}/${publicId}.mp4`,
    poster: `${base}/so_1.0,w_${posterWidth},q_auto:good/${v}/${publicId}.jpg`,
  };
}
