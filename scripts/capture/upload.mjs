/**
 * scripts/capture/upload.mjs
 *
 * Uploads every processed still/video/poster to Cloudinary under
 * product-shots/, and writes manifest.json mapping each shot name to its
 * secure_url(s) — the file the marketing-site insertion step (and this
 * suite's own report) reads from.
 *
 * No Cloudinary SDK dependency — a signed upload is just one HMAC-SHA1
 * over the sorted params plus the api_secret (Node's built-in crypto),
 * same "don't add a dependency for something this small" convention as
 * the rest of scripts/.
 *
 * Usage: node scripts/capture/upload.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { PROCESSED_DIR, MANIFEST_FILE } from './config.mjs';

const CLOUDINARY_URL = process.env.CLOUDINARY_URL;
if (!CLOUDINARY_URL) {
  console.error('✗ CLOUDINARY_URL not set (expected cloudinary://<key>:<secret>@<cloud_name> in .env).');
  process.exit(1);
}
const m = CLOUDINARY_URL.match(/^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/);
if (!m) {
  console.error('✗ CLOUDINARY_URL is not in the expected cloudinary://key:secret@cloud_name form.');
  process.exit(1);
}
const [, API_KEY, API_SECRET, CLOUD_NAME] = m;
const FOLDER = 'product-shots';

function sign(params) {
  const toSign = Object.keys(params)
    .sort()
    .map(k => `${k}=${params[k]}`)
    .join('&');
  return crypto.createHash('sha1').update(toSign + API_SECRET).digest('hex');
}

async function uploadFile(filePath, resourceType) {
  const publicId = path.basename(filePath, path.extname(filePath));
  const timestamp = Math.floor(Date.now() / 1000);
  const paramsToSign = { folder: FOLDER, public_id: publicId, timestamp };
  const signature = sign(paramsToSign);

  const form = new FormData();
  form.append('file', new Blob([fs.readFileSync(filePath)]), path.basename(filePath));
  form.append('api_key', API_KEY);
  form.append('timestamp', String(timestamp));
  form.append('signature', signature);
  form.append('folder', FOLDER);
  form.append('public_id', publicId);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`, {
    method: 'POST',
    body: form,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `Upload failed (${res.status})`);
  return data.secure_url;
}

const files = fs.readdirSync(PROCESSED_DIR).filter(f => !f.startsWith('.') && !f.endsWith('-bar.png'));
const manifest = {};

for (const file of files) {
  const filePath = path.join(PROCESSED_DIR, file);
  const ext = path.extname(file).toLowerCase();
  const resourceType = ext === '.mp4' || ext === '.webm' ? 'video' : 'image';
  const key = path.basename(file, ext);

  console.log(`→ uploading ${file} (${resourceType})...`);
  try {
    const url = await uploadFile(filePath, resourceType);
    manifest[key] = manifest[key] || {};
    manifest[key][ext.slice(1)] = url;
    console.log(`  ✓ ${url}`);
  } catch (err) {
    console.error(`  ✗ ${file}: ${err.message}`);
    manifest[key] = manifest[key] || {};
    manifest[key].error = err.message;
  }
}

fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2));
console.log(`\n✓ Manifest written to ${MANIFEST_FILE}`);
