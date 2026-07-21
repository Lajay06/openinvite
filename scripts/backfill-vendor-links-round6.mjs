/**
 * scripts/backfill-vendor-links-round6.mjs
 *
 * One-time follow-up to the dashboard-round6 vendor-consolidation PR.
 * VendorContactSection reads a section's vendor from a `vendorId` field
 * pointing at a real Vendor record — sections that previously stored a
 * free-text name (Beauty's hairArtist/makeupArtist, Styling's decorator,
 * FoodBeverage's catering, all seeded pre-round-6) now show "No vendor
 * added yet" until that link exists, even though the free-text data is
 * still sitting in the record. This backfills real Vendor records (or
 * links to ones that already exist) and sets each section's vendorId, so
 * the demo doesn't regress to an empty-looking state.
 *
 * - decorations.vendorId → the existing "Sydney Bloom Florals" Vendor
 *   (decorator === florist here, same business, matching contact details).
 * - foodBeverage.vendorId → the existing "Capella Sydney Catering" Vendor.
 * - beauty.hairArtistVendorId / makeupArtistVendorId → two NEW Vendor
 *   records created from the free-text name/contact already stored
 *   (no beauty-category vendor existed yet).
 *
 * Idempotent: skips a link that's already set, skips creating a vendor
 * whose name already exists in the target category.
 *
 * Usage: node scripts/backfill-vendor-links-round6.mjs
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = dirname(fileURLToPath(import.meta.url));
try {
  const raw = readFileSync(resolve(__dir, '..', '.env.local'), 'utf8');
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = val;
  }
} catch {
  // rely on shell env vars
}

const BASE44_API = 'https://base44.app/api';
const APP_ID = process.env.VITE_BASE44_APP_ID || '68731d183f075e406eda2236';
const EMAIL = process.env.BASE44_TEST_EMAIL;
const PASSWORD = process.env.BASE44_TEST_PASSWORD;
if (!EMAIL || !PASSWORD) {
  console.error('✗ BASE44_TEST_EMAIL and BASE44_TEST_PASSWORD must be set in .env.local');
  process.exit(1);
}
let TOKEN = null;

const WEDDING_ID = '6a1f90fa5b4e0702b5a051aa';
const OWNER_ID = '6a1c32fa7d681c950e26d2cd';

function unwrapList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}
async function login() {
  const res = await fetch(`${BASE44_API}/apps/${APP_ID}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(`Login failed: ${JSON.stringify(data)}`);
  return data.access_token;
}
async function apiFetch(path) {
  const res = await fetch(`${BASE44_API}${path}`, { headers: { Authorization: `Bearer ${TOKEN}` } });
  if (!res.ok) throw new Error(`GET ${path} failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
  return unwrapList(await res.json());
}
async function apiCreate(entity, body) {
  const res = await fetch(`${BASE44_API}/apps/${APP_ID}/entities/${entity}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${entity} failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
  return res.json();
}
async function apiUpdate(entity, id, body) {
  const res = await fetch(`${BASE44_API}/apps/${APP_ID}/entities/${entity}/${id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PUT ${entity}/${id} failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
  return res.json();
}
const ownerQuery = () => encodeURIComponent(JSON.stringify({ created_by_id: OWNER_ID }));

async function main() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  Vendor-link backfill — John & Suzanne wedding');
  console.log('═══════════════════════════════════════════════════════\n');

  TOKEN = await login();
  console.log('✓ Logged in as the wedding owner (jaygalaxy23@gmail.com)\n');

  const wdRes = await fetch(`${BASE44_API}/apps/${APP_ID}/entities/WeddingDetails/${WEDDING_ID}`, { headers: { Authorization: `Bearer ${TOKEN}` } });
  const wd = await wdRes.json();
  const vendors = await apiFetch(`/apps/${APP_ID}/entities/Vendor?q=${ownerQuery()}`);
  const findVendor = (name) => vendors.find(v => v.name === name);

  // ── decorations.vendorId → Sydney Bloom Florals ─────────────────────────
  if (wd.decorations?.vendorId) {
    console.log('✓ decorations.vendorId already set, skipping');
  } else {
    const florist = findVendor('Sydney Bloom Florals');
    if (florist) {
      await apiUpdate('WeddingDetails', WEDDING_ID, { decorations: { ...wd.decorations, vendorId: florist.id } });
      console.log(`✓ decorations.vendorId → ${florist.name} (${florist.id})`);
    } else {
      console.log('✗ No "Sydney Bloom Florals" vendor found — skipped decorations link');
    }
  }

  // ── foodBeverage.vendorId → Capella Sydney Catering ─────────────────────
  if (wd.foodBeverage?.vendorId) {
    console.log('✓ foodBeverage.vendorId already set, skipping');
  } else {
    const caterer = findVendor('Capella Sydney Catering');
    if (caterer) {
      await apiUpdate('WeddingDetails', WEDDING_ID, { foodBeverage: { ...(wd.foodBeverage || {}), vendorId: caterer.id } });
      console.log(`✓ foodBeverage.vendorId → ${caterer.name} (${caterer.id})`);
    } else {
      console.log('✗ No "Capella Sydney Catering" vendor found — skipped foodBeverage link');
    }
  }

  // ── beauty.hairArtistVendorId / makeupArtistVendorId ────────────────────
  const beautyPatch = {};
  const b = wd.beauty || {};

  if (b.hairArtistVendorId) {
    console.log('✓ beauty.hairArtistVendorId already set, skipping');
  } else if (b.hairArtist) {
    let hairVendor = findVendor(b.hairArtist);
    if (!hairVendor) {
      hairVendor = await apiCreate('Vendor', {
        created_by_id: OWNER_ID,
        name: b.hairArtist,
        category: 'beauty',
        status: 'booked',
        contact_person: b.hairArtistContact || '',
        phone: b.hairArtistPhone || '',
        email: b.hairArtistEmail || '',
      });
      vendors.push(hairVendor);
      console.log(`✓ Created vendor "${hairVendor.name}" (${hairVendor.id})`);
    }
    beautyPatch.hairArtistVendorId = hairVendor.id;
  }

  if (b.makeupArtistVendorId) {
    console.log('✓ beauty.makeupArtistVendorId already set, skipping');
  } else if (b.makeupArtist) {
    let makeupVendor = findVendor(b.makeupArtist);
    if (!makeupVendor) {
      makeupVendor = await apiCreate('Vendor', {
        created_by_id: OWNER_ID,
        name: b.makeupArtist,
        category: 'beauty',
        status: 'booked',
        contact_person: b.makeupArtistContact || '',
        phone: b.makeupArtistPhone || '',
        email: b.makeupArtistEmail || '',
      });
      vendors.push(makeupVendor);
      console.log(`✓ Created vendor "${makeupVendor.name}" (${makeupVendor.id})`);
    }
    beautyPatch.makeupArtistVendorId = makeupVendor.id;
  }

  if (Object.keys(beautyPatch).length > 0) {
    await apiUpdate('WeddingDetails', WEDDING_ID, { beauty: { ...b, ...beautyPatch } });
    console.log(`✓ beauty vendorId fields updated: ${JSON.stringify(beautyPatch)}`);
  }

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  Done');
  console.log('═══════════════════════════════════════════════════════');
}

main().catch(err => {
  console.error('\n✗ FAILED:', err.message);
  process.exit(1);
});
