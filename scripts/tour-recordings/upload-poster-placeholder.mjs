/**
 * ONE PLACEHOLDER POSTER, SO THE LAYOUT IS REAL BEFORE THE FOOTAGE IS.
 *
 * Owner instruction for the UI PR: "ship the UI with poster frames from
 * Cloudinary placeholders so the layout is real before the footage is."
 *
 * Deliberately ONE shared asset rather than nine identical grey rectangles at
 * nine paths. Nine would be nine things to find and delete later, and they
 * would carry no more information than one. The recording PR gives each
 * chapter its own studio-tour/<chapter>/<width> path, and the only change on
 * this side is the URL in src/lib/studioTour.js.
 *
 * 16 by 9 at 1280 by 720, the aspect the real recordings will have, so the
 * chapter panel reserves the right box from the first commit.
 *
 * Credential: CLOUDINARY_URL from .env.local, read the same way
 * scripts/seed-demo-data.mjs reads it. Nothing about it is printed.
 *
 * Usage: node scripts/tour-recordings/upload-poster-placeholder.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import zlib from 'node:zlib';

function readCloudinaryUrl() {
  if (process.env.CLOUDINARY_URL) return process.env.CLOUDINARY_URL;
  for (const f of ['.env.local', '.env']) {
    if (!existsSync(f)) continue;
    for (const line of readFileSync(f, 'utf8').split('\n')) {
      if (line.startsWith('CLOUDINARY_URL=')) return line.slice('CLOUDINARY_URL='.length).trim();
    }
  }
  return '';
}

/** A solid RGB PNG, built by hand so this script needs no image library. */
function solidPng(width, height, [r, g, b]) {
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crcTable = [];
    for (let n = 0; n < 256; n += 1) {
      let c = n;
      for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c >>> 0;
    }
    let crc = 0xffffffff;
    for (const byte of body) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
    const crcBuf = Buffer.alloc(4); crcBuf.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
    return Buffer.concat([len, body, crcBuf]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8-bit, truecolour
  const row = Buffer.concat([Buffer.from([0]), Buffer.concat(Array.from({ length: width }, () => Buffer.from([r, g, b])))]);
  const raw = Buffer.concat(Array.from({ length: height }, () => row));
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const url = readCloudinaryUrl();
const m = /^cloudinary:\/\/(\d+):([^@]+)@(.+)$/.exec(url);
if (!m) { console.error('CLOUDINARY_URL missing or malformed. Nothing uploaded.'); process.exit(1); }
const [, key, secret, cloud] = m;

const PUBLIC_ID = 'poster-placeholder';
const FOLDER = 'studio-tour/_placeholder';
// rgba(10,10,10,0.04) over white, flattened: the quiet grey the product already
// uses for a resting surface.
const png = solidPng(1280, 720, [245, 245, 245]);

const timestamp = Math.floor(Date.now() / 1000);
const params = { folder: FOLDER, overwrite: 'true', public_id: PUBLIC_ID, timestamp };
const signature = createHash('sha1')
  .update(Object.keys(params).sort().map((k) => `${k}=${params[k]}`).join('&') + secret)
  .digest('hex');

const fd = new FormData();
for (const [k, v] of Object.entries(params)) fd.append(k, String(v));
fd.append('api_key', key);
fd.append('signature', signature);
fd.append('file', new Blob([png]), 'poster-placeholder.png');

const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, { method: 'POST', body: fd });
const body = await res.json().catch(() => ({}));
if (!res.ok) { console.error(`Upload failed ${res.status}: ${body.error?.message}`); process.exit(1); }
console.log('uploaded:', body.secure_url);
console.log(`  ${body.width} by ${body.height}, ${body.bytes} bytes, ${body.format}`);
