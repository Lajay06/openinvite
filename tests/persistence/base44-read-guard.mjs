/**
 * tests/persistence/base44-read-guard.mjs
 *
 * Pins scripts/lib/base44Read.mjs — the guard that stops verification tooling
 * doing an admin-key read against an owner-scoped entity.
 *
 * Why it is worth a test: the failure this prevents is invisible. An admin-key
 * read of an owner-scoped entity returns 200 with an empty array, so a check
 * built on it does not error — it quietly reports "nothing found", which reads
 * as a pass for any "nothing leaked" assertion and as a false failure for any
 * "the row was created" assertion. Both happened in this repo before the guard
 * existed. If the guard ever silently stops refusing, nothing else would say so.
 *
 * Pure unit assertions — no network, no credentials.
 */

import { getReadRule, isOwnerScoped, assertAdminCanRead } from '../../scripts/lib/base44Read.mjs';
import { pass, fail } from './_shared.mjs';

const refuses = (entity) => {
  try { assertAdminCanRead(entity); return false; } catch { return true; }
};

export async function runBase44ReadGuard() {
  const results = [];

  // Explicitly open reads must be allowed, or the guard is useless noise.
  for (const open of ['WeddingDetails', 'SongRequest', 'Guest']) {
    const rule = getReadRule(open);
    results.push(rule === null && !refuses(open)
      ? pass(`base44Read — ${open} (read: null) is allowed for the admin key`, 'allowed')
      : fail(`base44Read — ${open} (read: null) is allowed for the admin key`, 'allowed', JSON.stringify(rule)));
  }

  // Owner-scoped reads must be refused, both the created_by_id shape and the
  // data.<field> shape.
  for (const scoped of ['Music', 'Notification']) {
    const rule = getReadRule(scoped);
    results.push(isOwnerScoped(rule) && refuses(scoped)
      ? pass(`base44Read — ${scoped} (owner-scoped read) is REFUSED for the admin key`, 'refused')
      : fail(`base44Read — ${scoped} (owner-scoped read) is REFUSED for the admin key`, 'refused', JSON.stringify(rule)));
  }

  // Fail-closed: anything the guard cannot establish is treated as scoped.
  results.push(getReadRule('EntityThatDoesNotExist') === 'UNKNOWN' && refuses('EntityThatDoesNotExist')
    ? pass('base44Read — an unknown entity is REFUSED (fails closed)', 'refused')
    : fail('base44Read — an unknown entity is REFUSED (fails closed)', 'refused', 'allowed'));

  // The sentinel must never be mistaken for "open".
  const sentinelSafe = isOwnerScoped('UNKNOWN') === true
                    && isOwnerScoped(null) === false
                    && isOwnerScoped({ created_by_id: '{{user.id}}' }) === true
                    && isOwnerScoped({}) === false;
  results.push(sentinelSafe
    ? pass('base44Read — isOwnerScoped: only an explicit null read rule counts as open', 'correct')
    : fail('base44Read — isOwnerScoped: only an explicit null read rule counts as open', 'correct', 'see base44Read.mjs'));

  return results;
}
