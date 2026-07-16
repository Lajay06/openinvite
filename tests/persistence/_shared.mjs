/**
 * tests/persistence/_shared.mjs
 *
 * Env loading, HTTP helper, and assertion helpers shared by every domain
 * file under tests/persistence/. Split out of the former monolithic
 * scripts/test-persistence.mjs so each domain file can import just what it
 * needs without re-implementing auth/env plumbing.
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// ── Load .env.local ───────────────────────────────────────────────────────────

const __dir = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dir, '..', '..', '.env.local');

try {
  const raw = readFileSync(envPath, 'utf8');
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
  // .env.local missing — rely on shell env vars
}

export const APP_ID = process.env.VITE_BASE44_APP_ID || '68731d183f075e406eda2236';
export const EMAIL  = process.env.BASE44_TEST_EMAIL;
export const PASS   = process.env.BASE44_TEST_PASSWORD;
export const BASE   = 'https://base44.app/api';

export const SENTINEL = '__PERSISTENCE_TEST__';

// ── HTTP helper ───────────────────────────────────────────────────────────────

export async function api(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${method} ${path} → HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export async function login() {
  const auth = await api('POST', `/apps/${APP_ID}/auth/login`, { email: EMAIL, password: PASS });
  const token = auth.access_token;
  if (!token) throw new Error('No access_token in response');
  return token;
}

// ── Assertion helpers ─────────────────────────────────────────────────────────

export function pass(field, note = '') {
  console.log(`  ✅ PASS  ${field}${note ? '  (' + note + ')' : ''}`);
  return true;
}

export function fail(field, written, readBack) {
  console.log(`  ❌ FAIL  ${field}`);
  console.log(`           wrote:    ${JSON.stringify(written)}`);
  console.log(`           read back: ${JSON.stringify(readBack)}`);
  return false;
}

export function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Checks that every key in `written` exists in `readBack` with an equal value.
 * Extra keys in `readBack` (Base44 backfills schema-defined sub-fields with null)
 * are ignored — they aren't schema-drop failures.
 */
export function writtenSubsetMatches(written, readBack) {
  if (written === null || written === undefined) return readBack === written;
  if (typeof written !== 'object' || Array.isArray(written)) return deepEqual(written, readBack);
  if (typeof readBack !== 'object' || readBack === null) return false;
  for (const [k, v] of Object.entries(written)) {
    if (!(k in readBack)) return false;
    if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
      if (!writtenSubsetMatches(v, readBack[k])) return false;
    } else if (!deepEqual(v, readBack[k])) {
      return false;
    }
  }
  return true;
}

/**
 * Deletes one sentinel record. Unlike the old ad hoc silently-swallowing
 * try/catch duplicated across every domain file, always reports a failed
 * delete loudly (record id + error) instead of hiding it. A leaked,
 * unmarked test record is exactly how the production seating-page leak
 * happened — a failed cleanup with no is_test stamp and no visible failure.
 * Every domain file should call this (or cleanupWeddingDetails for the
 * shared WeddingDetails sentinel) rather than writing its own try/catch
 * around a DELETE.
 */
export async function cleanupEntity(token, entityType, id) {
  if (!id) return;
  try {
    await api('DELETE', `/apps/${APP_ID}/entities/${entityType}/${id}`, undefined, token);
  } catch (err) {
    console.error(`  ⚠️  CLEANUP FAILED — ${entityType} record ${id} may still exist. Delete it manually in the Base44 dashboard. Error: ${err.message}`);
  }
}

export async function cleanupWeddingDetails(token, id) {
  if (!id) return;
  process.stdout.write('  Deleting sentinel record… ');
  try {
    await api('DELETE', `/apps/${APP_ID}/entities/WeddingDetails/${id}`, undefined, token);
    console.log('✓ cleaned up\n');
  } catch (err) {
    console.error(`\n  ⚠️  CLEANUP FAILED — sentinel record ${id} may still exist.`);
    console.error(`  Delete it manually in the Base44 dashboard.`);
    console.error(`  Error: ${err.message}\n`);
  }
}
