/**
 * scripts/lib/base44Read.mjs
 *
 * A read helper for scripts and verification tooling that REFUSES to use the
 * admin key against an entity whose read RLS is owner-scoped.
 *
 * ── Why this exists ─────────────────────────────────────────────────────────
 * Canonical gotcha #1: `BASE44_ADMIN_KEY` is not a superuser bypass. Against
 * an entity with `read: {created_by_id: "{{user.id}}"}` it returns **200 with
 * an empty array** — no error, no warning, no clue. Every consumer then reads
 * "empty" as "there is nothing there".
 *
 * That failure mode bit this project's own verification three separate times
 * in one session, always identically:
 *
 *   1. Proposing a `WeddingDetails.read` flip on the reasoning that admin-key
 *      endpoints were unaffected — they are precisely what breaks.
 *   2. A Spotify-teardown check that scanned Music/WeddingDetails with the
 *      admin key.
 *   3. Verifying the song-request `add` action: `Music.read` is owner-scoped,
 *      so the admin-key query returned zero rows and reported
 *      "exactly ONE Music row created — FAIL, count=0" for code that was
 *      working correctly.
 *
 * Each time the code under test was fine and the CHECK was wrong, which is the
 * worst shape of wrong: it manufactures false failures, and — far more
 * dangerous — it would just as happily manufacture a false PASS for any
 * assertion of the form "no rows match" / "nothing leaked" / "it's clean".
 *
 * Remembering gotcha #1 has demonstrably not been enough. This makes it
 * structurally impossible instead.
 *
 * ── Usage ───────────────────────────────────────────────────────────────────
 *   import { adminRead, assertAdminCanRead } from './lib/base44Read.mjs';
 *
 *   const rows = await adminRead('WeddingDetails');            // fine: read is null
 *   const rows = await adminRead('Music');                     // THROWS
 *   const rows = await adminRead('Music', { token });          // fine: caller token
 *
 * ── Where the rules come from, and why this fails CLOSED ────────────────────
 * Base44 exposes RLS only through the workspace MCP; there is no runtime
 * endpoint an admin-key script can call (probed 2026-08-17: /schema,
 * /entities, /entity-schemas all 404 or 401). So the guard reads
 * base44/entities/*.jsonc, the repo's own mirror.
 *
 * A mirror can drift, and drift in one direction is dangerous: if the mirror
 * says a read is open while live has it owner-scoped, a naive guard would
 * wave the read through and we are back to silent empties. So this guard
 * treats every uncertainty as owner-scoped:
 *
 *   - entity missing from the mirror        -> REFUSE
 *   - mirror unparseable                    -> REFUSE
 *   - rls block absent                       -> REFUSE
 *   - read rule present and non-empty        -> REFUSE
 *   - read rule explicitly null              -> allow
 *
 * Only an explicit `"read": null` in the mirror permits an admin-key read.
 * Being wrong then costs a thrown error and one line of code; being wrong the
 * other way costs a check that passes when it should fail.
 */

import fs from 'fs';
import path from 'path';

const BASE44_API = 'https://base44.app/api';
const APP_ID = process.env.VITE_BASE44_APP_ID || '68731d183f075e406eda2236';
const MIRROR_DIR = path.resolve(new URL('../../base44/entities/', import.meta.url).pathname);

/** entityName -> { rule, source } */
const readRuleCache = new Map();

function requireAdminKey() {
  const key = process.env.BASE44_ADMIN_KEY;
  if (!key) throw new Error('BASE44_ADMIN_KEY is not set');
  return key;
}

/**
 * The entity's read rule per the repo mirror. Returns the sentinel string
 * 'UNKNOWN' when it cannot be established — callers must treat that exactly
 * as they treat an owner-scoped rule.
 */
export function getReadRule(entityName) {
  if (readRuleCache.has(entityName)) return readRuleCache.get(entityName);

  const file = path.join(MIRROR_DIR, `${entityName}.jsonc`);
  let rule = 'UNKNOWN';
  try {
    if (fs.existsSync(file)) {
      const raw = fs.readFileSync(file, 'utf8').replace(/^\s*\/\/.*$/gm, '');
      const parsed = JSON.parse(raw);
      // An absent rls block is NOT "open" — it is unknown.
      if (parsed && Object.prototype.hasOwnProperty.call(parsed, 'rls')) {
        rule = Object.prototype.hasOwnProperty.call(parsed.rls ?? {}, 'read')
          ? parsed.rls.read
          : 'UNKNOWN';
      }
    }
  } catch {
    rule = 'UNKNOWN';
  }
  readRuleCache.set(entityName, rule);
  return rule;
}

/**
 * True when an admin-key read must NOT be trusted — either the rule scopes
 * rows to a user, or we could not establish the rule at all. Only an explicit
 * null read rule returns false.
 */
export function isOwnerScoped(readRule) {
  if (readRule === null) return false;            // explicitly open
  if (readRule === 'UNKNOWN') return true;        // fail closed
  return typeof readRule === 'object' && Object.keys(readRule).length > 0;
}

/**
 * Throws — loudly, naming the entity and the rule — if the admin key would be
 * silently filtered reading this entity.
 */
export function assertAdminCanRead(entityName) {
  const rule = getReadRule(entityName);
  if (isOwnerScoped(rule)) {
    const why = rule === 'UNKNOWN'
      ? 'its read rule could not be established from base44/entities/ (missing, unparseable, or no rls block) — this guard fails CLOSED'
      : `its read RLS is ${JSON.stringify(rule)} — owner-scoped`;
    throw new Error(
      `base44Read: REFUSING an admin-key read of ${entityName}.\n` +
      `  ${why}.\n` +
      '  The admin key has no session identity, so this would return 200 with an\n' +
      '  EMPTY result and no error (canonical gotcha #1). An empty result would\n' +
      '  then be indistinguishable from "there is nothing there", which silently\n' +
      '  turns a broken check into a passing one.\n' +
      `  Fix: pass the owning user's token — adminRead('${entityName}', { token }).`,
    );
  }
}

/**
 * Read an entity's rows. Uses the admin key only when the entity's live read
 * rule actually permits it; otherwise requires a caller token.
 *
 * @param {string} entityName
 * @param {{ token?: string, query?: object, limit?: number }} [opts]
 * @returns {Promise<object[]>}
 */
export async function adminRead(entityName, opts = {}) {
  const { token, query, limit } = opts;

  // A caller token is always allowed — the guard only polices the admin key.
  if (!token) assertAdminCanRead(entityName);

  const params = [];
  if (query) params.push(`q=${encodeURIComponent(JSON.stringify(query))}`);
  if (limit) params.push(`limit=${limit}`);
  const qs = params.length ? `?${params.join('&')}` : '';

  const res = await fetch(`${BASE44_API}/apps/${APP_ID}/entities/${entityName}${qs}`, {
    headers: { Authorization: `Bearer ${token || requireAdminKey()}` },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`base44Read: GET ${entityName} failed (${res.status}): ${body.slice(0, 200)}`);
  }
  const payload = await res.json();
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}
