/**
 * tests/persistence/rls-comment-claims.mjs
 *
 * Comments that assert a security property must be verified like code.
 *
 * Two files — api/my-guests-rsvp.js and api/collaborator-guests.js — each
 * stated that `Guest.read` is owner-scoped. It never was: the live schema says
 * `null`, confirmed by listing 206 Guest rows from an unrelated authenticated
 * account. One of those files is the endpoint whose entire purpose is to be
 * the safe read path for Guest, so a developer deciding whether direct reads
 * were acceptable would have been actively misled by the thing that looked
 * most authoritative.
 *
 * Prose is not testable in general. This specific claim is: an entity's RLS
 * lives in base44/entities/<Entity>.jsonc, so a comment saying "<Entity>.read
 * is owner-scoped" can be checked against it mechanically.
 *
 * Deliberately narrow. It catches the exact sentence shape that misled us,
 * rather than trying to parse English — a guard that over-reaches gets
 * disabled the first time it false-positives, and then catches nothing.
 */

import fs from 'fs';
import path from 'path';
import { pass, fail } from './_shared.mjs';

const ROOT = path.resolve(new URL('../../', import.meta.url).pathname);
const ENTITY_DIR = path.join(ROOT, 'base44/entities');

/** RLS for an entity from the checked-in mirror, or null if there is no mirror. */
function rlsFor(entity) {
  const file = path.join(ENTITY_DIR, `${entity}.jsonc`);
  if (!fs.existsSync(file)) return null;
  const stripped = fs.readFileSync(file, 'utf8').replace(/^\s*\/\/.*$/gm, '');
  try { return JSON.parse(stripped).rls || null; } catch { return null; }
}

const isOwnerScoped = (rule) =>
  !!rule && typeof rule === 'object' && Object.keys(rule).length > 0;

function sourceFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) sourceFiles(full, out);
    else if (/\.(js|jsx|mjs)$/.test(e.name)) out.push(full);
  }
  return out;
}

export async function runRlsCommentClaims() {
  const results = [];
  const files = [...sourceFiles(path.join(ROOT, 'api')), ...sourceFiles(path.join(ROOT, 'src'))];

  // "<Entity>.read is now owner-scoped" / "<Entity>.read is owner-scoped as of"
  // — the present-tense assertion, not a historical note or a correction.
  const CLAIM = /\b([A-Z][A-Za-z]+)\.read\s+is\s+(?:now\s+)?owner-scoped/g;

  const wrong = [];
  let claimsChecked = 0;

  for (const f of files) {
    const src = fs.readFileSync(f, 'utf8');
    for (const m of src.matchAll(CLAIM)) {
      // A line that is explicitly correcting the record is not making the claim.
      const line = src.slice(0, m.index).split('\n').length;
      const context = src.split('\n').slice(Math.max(0, line - 4), line + 1).join(' ');
      if (/CORRECTED|NEVER TRUE|previously (said|claimed)|STALE|was never/i.test(context)) continue;

      claimsChecked++;
      const entity = m[1];
      const rls = rlsFor(entity);
      if (rls === null) continue;                       // no mirror to check against
      if (!isOwnerScoped(rls.read)) {
        wrong.push(`${path.relative(ROOT, f)}:${line} claims ${entity}.read is owner-scoped, mirror says ${JSON.stringify(rls.read)}`);
      }
    }
  }

  results.push(wrong.length === 0
    ? pass('rls comment claims — every "X.read is owner-scoped" comment matches the schema mirror', `${claimsChecked} claim(s) checked`)
    : fail('rls comment claims — every "X.read is owner-scoped" comment matches the schema mirror', 'all true',
           wrong.join(' | ')));

  // The mirror itself must still say what we believe, so this guard cannot
  // pass by silently losing its reference.
  const guestRls = rlsFor('Guest');
  results.push(guestRls && guestRls.read === null
    ? pass('rls comment claims — Guest.read is still null in the mirror (the fact these comments got wrong)', 'null')
    : fail('rls comment claims — Guest.read is still null in the mirror', 'null',
           JSON.stringify(guestRls?.read) + ' — if this changed deliberately, update the comments too'));

  return results;
}
