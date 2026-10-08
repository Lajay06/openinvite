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

// ── COMMENTS OUT, AND ONLY COMMENTS ──────────────────────────────────────────

/**
 * Strip comments from source before a guard reads it, without eating code.
 *
 * Nearly every guard here reads product source and asserts on what it finds,
 * and every one of them has to drop comments first, because a guard's own
 * explanation of what it removed names the thing it removed. A hundred call
 * sites wrote that by hand, all of them as some arrangement of
 * `src.replace(/\/\*[\s\S]*?\*\//g, '')`, and that expression is wrong.
 *
 * ── WHAT IT GETS WRONG, AND WHAT IT COST ───────────────────────────────────
 *
 * `/*` is not only a comment opener. It appears mid-line in attribute values,
 * in regular expressions and in strings, and an unanchored match runs from the
 * first one to the next star-slash anywhere in the file, which is usually
 * inside a real comment dozens of lines later. Everything between is deleted.
 *
 * Measured on this repo at the time this was written, the naive form destroys
 * live code in EIGHT files of product source, the render harness and the
 * motion capture, which are the places guards read:
 *
 *     src/pages/Onboarding.jsx                        440 lines
 *     src/pages/Universes.jsx                         270 lines
 *     scripts/lib/renderHarness.mjs                   252 lines
 *     tests/motion/capture.mjs                        152 lines
 *     src/components/website-builder/WBRightPanel.jsx  46 lines
 *     src/lib/checkoutSession.js                       22 lines
 *     src/pagePreload.js                               22 lines
 *     scripts/lib/rewritePrerenderedAssets.mjs         10 lines
 *
 * tests/persistence/guard-comment-stripper.mjs recomputes that list on every
 * run rather than trusting this one, and fails if any guard reads a file on it
 * through the hand-written form.
 *
 * WBRightPanel is the one that was caught, in item 12a of
 * goals/2026-10-08-site-fixes-batch-1.md, and only because a POSITIVE check
 * failed: the guard asserted that password protection was still present and it
 * was not present in what the guard could see. Every absence assertion around
 * it had gone green against blanked-out text, which is the worst way for a
 * guard to pass. Its cause there is one attribute, `accept="audio/*"` on the
 * background-music file input.
 *
 * ── THE RULE ───────────────────────────────────────────────────────────────
 *
 * A comment must start its own line. Every real comment in this codebase does,
 * and no attribute value, regex or string literal can, because something is
 * always to its left. JSX brace-comments are taken first, since those open with
 * a brace rather than at the margin.
 *
 * This is deliberately NOT a JavaScript parser. A guard reads source as text on
 * purpose: it is checking what is written, including things a parser would
 * discard, and a tokenizer here would be a second implementation of the
 * language to keep correct. The line-start rule is a convention this repo
 * already follows everywhere, so holding it costs nothing and the failure mode
 * is visible rather than silent.
 *
 * `line` defaults to true and drops whole-line `//` comments too. Pass
 * `{ line: false }` where a guard needs to read them, and
 * `{ trailing: true }` to also cut a trailing `//` from the end of a code
 * line, which is what the handful of guards using the `l.slice(0,
 * l.indexOf('//'))` form were doing by hand.
 */
export function stripComments(src, { line = true, trailing = false } = {}) {
  let out = String(src ?? '')
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, '')
    .replace(/^[ \t]*\/\*[\s\S]*?\*\/[ \t]*$/gm, '');
  if (trailing) out = out.replace(/^([^\n]*?)\/\/.*$/gm, (l, head) => (head.trim() ? head : ''));
  else if (line) out = out.replace(/^[ \t]*\/\/.*$/gm, '');
  return out;
}

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

/**
 * Notifications Part 4: rsvp-submit.js/collaborator-accept.js/
 * questionnaire-answer-submit.js now call notify() as a real side effect —
 * unlike every other entity these tests create directly, there's no id to
 * capture up front (notify() creates it internally, server-side). Snapshot
 * the recipient's Notification ids before invoking the handler, then diff
 * after, so tests that exercise these endpoints can clean up exactly the
 * rows their own run produced without guessing by title/content matching.
 */
export async function snapshotNotificationIds(token) {
  const rows = await api('GET', `/apps/${APP_ID}/entities/Notification`, undefined, token);
  return new Set((Array.isArray(rows) ? rows : (rows?.data || rows?.results || [])).map(n => n.id));
}

export async function cleanupNewNotifications(token, beforeIds) {
  const rows = await api('GET', `/apps/${APP_ID}/entities/Notification`, undefined, token);
  const list = Array.isArray(rows) ? rows : (rows?.data || rows?.results || []);
  for (const n of list) {
    if (!beforeIds.has(n.id)) await cleanupEntity(token, 'Notification', n.id);
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
