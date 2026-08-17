/**
 * tests/persistence/guest-endpoint-gate.mjs
 *
 * Pins the CLASS, not the instance.
 *
 * The website password gate is meant to make a wedding's guest-facing data
 * private. It was enforced by exactly ONE endpoint — `wedding-by-slug.js` —
 * while six siblings resolved the same wedding by slug and read or wrote its
 * data without ever consulting it. `wedding-poll-results.js` was the worst of
 * them: it returns every poll comment's TEXT, so anyone who knew a slug could
 * read a protected wedding's guest comments. A slug is printed in every
 * invitation.
 *
 * That is the same class as the `?preview=true` bypass fixed in #447. Fixing
 * one instance did not imply the others, which is precisely how a class of bug
 * survives its own fix.
 *
 * So this test does not assert "wedding-poll-results is gated". It enumerates
 * EVERY endpoint under api/ that resolves a wedding by slug, and requires each
 * one to either consult the gate or be listed here as a deliberate exemption
 * with a reason. **An endpoint number eight, written next month, fails CI
 * instead of shipping the hole again.**
 *
 * Static source analysis — no network, no credentials.
 */

import fs from 'fs';
import path from 'path';
import { pass, fail } from './_shared.mjs';

const API_DIR = path.resolve(new URL('../../api/', import.meta.url).pathname);

/**
 * Endpoints that resolve a wedding by slug but legitimately never gate.
 * Adding here is a deliberate argument, not a way to silence a failure.
 */
const EXEMPT = {
  // None today. Every slug-resolving guest endpoint is expected to gate.
  // Format when one is needed:
  //   'some-endpoint.js': 'why this endpoint must serve protected weddings',
};

/**
 * Known ungated, already scheduled to be fixed. This list must SHRINK TO
 * EMPTY; it exists so the class guard can ship with the read fix without
 * hiding the writes still outstanding.
 *
 * It is checked in BOTH directions:
 *   - an endpoint here that is NOT actually ungated fails (stale entry), so
 *     fixing one forces removing it rather than leaving a lie behind
 *   - an ungated endpoint NOT here fails (new hole)
 *
 * That is the difference between a tracked gap and a suppressed one.
 */
const PENDING_GATE = {
  'wedding-poll-comment.js': 'write — poll comment; PR (b)',
  'wedding-poll-vote.js': 'write — poll vote; PR (b)',
  'song-request-submit.js': 'write — song request; PR (b)',
  'collect-guest-contact.js': 'write — guest contact submission; PR (b)',
  'rsvp-link-request.js': 'action — sends an RSVP-link email; PR (b)',
};

/** Reads api/*.js (top level only — subdirs are crons/webhooks, not guest endpoints). */
function apiEndpoints() {
  return fs.readdirSync(API_DIR, { withFileTypes: true })
    .filter(e => e.isFile() && e.name.endsWith('.js'))
    .map(e => e.name);
}

const stripComments = (src) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/**
 * Does this file resolve a wedding from a CALLER-SUPPLIED slug?
 *
 * Both halves matter and both have real variants, so neither is matched
 * narrowly:
 *
 * - taking a slug from the caller: `weddingSlug` in most endpoints, but
 *   `wedding-by-slug.js` itself reads plain `src.slug`.
 * - resolving a wedding from it: usually `entities/WeddingDetails?q=`, but
 *   `rsvp-link-request.js` fetches all weddings and does
 *   `.find(w => w.slug === weddingSlug)` instead.
 *
 * Missing either variant silently shrinks the enumeration, which is why the
 * count assertion below exists as a backstop.
 */
function resolvesWeddingBySlug(code) {
  const takesSlug = /\b(weddingSlug|wedding_slug)\b/.test(code)
    || /\b(req\.query|req\.body|src)\??\.\s*slug\b/.test(code);
  const resolvesWedding = /entities\/WeddingDetails/.test(code)
    || /fetchAll\(\s*['"]WeddingDetails['"]\s*\)/.test(code);
  const isGuestFacing = !/verifyBase44User|collaborator/i.test(code)
    || /websiteGateIsOn|verifyWeddingPassword/.test(code);
  return takesSlug && resolvesWedding && isGuestFacing;
}

/** Does it consult the website password gate? */
function consultsGate(code) {
  return /websiteGateIsOn|verifyWeddingPassword/.test(code);
}

export async function runGuestEndpointGate() {
  const results = [];
  const ungated = [];
  const gated = [];
  let checked = 0;

  for (const file of apiEndpoints()) {
    const code = stripComments(fs.readFileSync(path.join(API_DIR, file), 'utf8'));
    if (!resolvesWeddingBySlug(code)) continue;
    checked++;
    if (consultsGate(code)) { gated.push(file); continue; }
    if (file in EXEMPT) continue;
    ungated.push(file);
  }

  // Untracked holes: ungated and not already known.
  const untracked = ungated.filter(f => !(f in PENDING_GATE));
  // Stale entries: listed as pending, but actually gated now.
  const staleP = Object.keys(PENDING_GATE).filter(f => gated.includes(f));

  // The enumeration must actually be finding endpoints. If a refactor moves
  // them or changes how a wedding is resolved, this test would silently pass
  // by checking nothing — the failure mode a guard like this must not have.
  results.push(checked >= 6
    ? pass('guest-endpoint gate — the enumeration still finds the slug-resolving endpoints', `${checked} found`)
    : fail('guest-endpoint gate — the enumeration still finds the slug-resolving endpoints',
           'at least 6', `${checked} — detection heuristic may have broken, not that endpoints vanished`));

  results.push(untracked.length === 0
    ? pass('guest-endpoint gate — no UNTRACKED ungated endpoint', `${checked} checked, ${ungated.length} known-pending`)
    : fail('guest-endpoint gate — no UNTRACKED ungated endpoint', 'none',
           `${untracked.join(', ')} — add websiteGateIsOn/verifyWeddingPassword, or justify it in EXEMPT`));

  results.push(staleP.length === 0
    ? pass('guest-endpoint gate — PENDING_GATE has no stale entries', `${Object.keys(PENDING_GATE).length} still pending`)
    : fail('guest-endpoint gate — PENDING_GATE has no stale entries', 'none',
           `${staleP.join(', ')} now gate — remove them from PENDING_GATE`));

  // The known-good instance, asserted by name so the two cannot both rot.
  const bySlug = stripComments(fs.readFileSync(path.join(API_DIR, 'wedding-by-slug.js'), 'utf8'));
  results.push(consultsGate(bySlug)
    ? pass('guest-endpoint gate — wedding-by-slug still gates', 'yes')
    : fail('guest-endpoint gate — wedding-by-slug still gates', 'yes', 'the reference implementation stopped gating'));

  return results;
}
