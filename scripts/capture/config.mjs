/**
 * scripts/capture/config.mjs
 *
 * Shared config for the product-visual capture pipeline. Every value here
 * is read from the environment — nothing is hardcoded — so the same suite
 * can point at production, a preview URL, or a local dev server without
 * code changes.
 *
 * Required env (put these in .env.local, gitignored, never committed):
 *   CAPTURE_BASE_URL        e.g. https://openinvite.com.au (defaults to prod)
 *   CAPTURE_TEST_EMAIL      the adminopeninvite test account email
 *   CAPTURE_TEST_PASSWORD   its password
 *   CLOUDINARY_URL          cloudinary://<key>:<secret>@<cloud_name>
 *                           (already used by scripts/ — same var)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// No dotenv dependency — Node's native loadEnvFile (stable since Node 22),
// same no-new-dependency convention as scripts/test-persistence.mjs.
for (const envFile of ['.env.local', '.env']) {
  const p = path.join(__dirname, '../../', envFile);
  if (fs.existsSync(p)) {
    try { process.loadEnvFile(p); } catch { /* already loaded / not supported */ }
  }
}

export const BASE_URL = (process.env.CAPTURE_BASE_URL || 'https://openinvite.com.au').replace(/\/$/, '');
export const TEST_EMAIL = process.env.CAPTURE_TEST_EMAIL || '';
export const TEST_PASSWORD = process.env.CAPTURE_TEST_PASSWORD || '';

export const OUT_DIR = path.join(__dirname, 'output');
export const RAW_DIR = path.join(OUT_DIR, 'raw');
export const PROCESSED_DIR = path.join(OUT_DIR, 'processed');
export const STATE_FILE = path.join(OUT_DIR, 'storage-state.json');
export const MANIFEST_FILE = path.join(OUT_DIR, 'manifest.json');

for (const dir of [OUT_DIR, RAW_DIR, PROCESSED_DIR]) {
  fs.mkdirSync(dir, { recursive: true });
}

// 2x retina capture at a common desktop viewport; mobile viewport matches a
// real iPhone-class width for the one shot explicitly asked for on mobile.
export const VIEWPORT_DESKTOP = { width: 1440, height: 900 };
export const VIEWPORT_MOBILE = { width: 390, height: 844 };
export const DEVICE_SCALE_FACTOR = 2;

export function requireCredentials() {
  if (!TEST_EMAIL || !TEST_PASSWORD) {
    console.error(
      '\n✗ Missing CAPTURE_TEST_EMAIL / CAPTURE_TEST_PASSWORD.\n' +
      '  Add them to .env.local (gitignored) before running the capture suite:\n\n' +
      '    CAPTURE_TEST_EMAIL=adminopeninvite@gmail.com\n' +
      '    CAPTURE_TEST_PASSWORD=<the real password>\n'
    );
    process.exit(1);
  }
}
