/**
 * tests/persistence/_registry.mjs
 *
 * WHICH GUARDS EXIST, AND WHICH RUNNER RUNS THEM — read off the directory
 * rather than hand-written twice.
 *
 * ── WHY ────────────────────────────────────────────────────────────────────
 *
 * Registering a guard used to mean two hand-written lines in
 * scripts/test-ci.mjs: an import at the top and a `runModule` call in the body.
 * That has cost twice over, in two different ways, and both are recorded:
 *
 *   R35, 2026-09-06. `sample-content-never-published.mjs` was imported by
 *   NOTHING. Four PRs of work, 249 checks, cited in three PR bodies as the
 *   property that made sample content safe to have at all — and CI had never
 *   run it once. An unimported module prints nothing, and silence reads
 *   exactly like a clean pass.
 *
 *   The conflict class, same day. Every PR that adds a guard adds the same two
 *   lines in the same two places, so every guard PR in flight conflicts with
 *   the one that lands before it. It happened twice in one session and cost
 *   two reissued merge authorizations for work that had not changed.
 *
 * Enumeration fixes both at once. A guard runs BECAUSE IT EXISTS, not because
 * someone remembered to import it, and adding one touches no shared file.
 *
 * ── THE SPLIT IS AN EXPLICIT ALLOWLIST, NOT A FILENAME CONVENTION ──────────
 *
 * Stated because the choice matters. A convention (`*.live.mjs`, say) would be
 * self-maintaining, and it would require renaming fifteen existing files — a
 * churn of moves through a directory whose history is the only record of why
 * several of these guards exist. So: two named Sets below, each with the
 * reason it is a Set rather than a rule.
 *
 * THE DEFAULT IS THE SAFE ONE. A file in neither Set runs in CI. A new guard
 * that nobody classified therefore RUNS rather than silently not running,
 * which is the exact failure R35 was written about. The cost of the wrong
 * default is a CI failure naming the file; the cost of the other default is
 * another guard nobody notices for four PRs.
 */
import { readdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pathToFileURL } from 'node:url';

const DIR = resolve(dirname(fileURLToPath(import.meta.url)));

/**
 * Guards that need a live Base44 login or BASE44_ADMIN_KEY. They run from
 * scripts/test-persistence.mjs, the mandatory local pre-merge step, and never
 * in CI — GitHub Actions holds no production credential, and every PR run
 * writing to the live database would collide with whatever a local run is
 * doing at the same time. That reasoning is scripts/test-ci.mjs's own header
 * and it has not changed; only the place the list lives has.
 */
export const LIVE_CREDENTIAL_GUARDS = new Set([
  'anonymous-endpoints.mjs',
  'collaborator-invite.mjs',
  'endpoint-auth.mjs',
  'guest.mjs',
  'guestlist-editable.mjs',
  'notifications.mjs',
  'onboarding.mjs',
  'ownership.mjs',
  'plus-one-identity.mjs',
  'rsvp.mjs',
  'seating-polish.mjs',
  'table-guest-sync.mjs',
  'todo-list-schema.mjs',
  'unfurl-og-image.mjs',
  'wedding-details.mjs',
]);

/**
 * Guards with their own `npm run` entry and their own `run-*.mjs` wrapper,
 * because they need a running preview server rather than a credential. Both
 * are in `npm run verify` and in ci.yml's browser lane; running them a second
 * time inside test-ci would double their cost and their output.
 */
export const STANDALONE_GUARDS = new Set([
  'guest-read-boundary.mjs',
  'nav-rsvp-visible.mjs',
]);

/**
 * Not guards: the shared helpers, and the wrapper for a STANDALONE guard.
 *
 * R35 AGAIN, 2026-09-07, AND IT COST THE SAME WAY. This predicate used to read
 * `f.startsWith('run-')`, meaning "a run-*.mjs file is a wrapper". It is not a
 * rule about wrappers, it is a rule about a PREFIX, and `run-sheet-view.mjs` —
 * 26 checks, the whole proof that the run sheet is a filter and not a second
 * store — matched it. CI enumerated the directory, skipped the file, printed
 * nothing, and 2198/2198 read exactly like 2224/2224. The guard the owner's
 * rejection was answered with had never run once.
 *
 * A wrapper is now identified by what it wraps: `run-x.mjs` is a wrapper only
 * when `x.mjs` is a STANDALONE guard that exists. Anything else called
 * `run-*.mjs` is a guard and RUNS — the safe default this file already argues
 * for two paragraphs above, finally applied to its own exclusion list.
 */
const NOT_A_GUARD = (f) => f === '_shared.mjs' || f === '_registry.mjs'
  || (f.startsWith('run-') && STANDALONE_GUARDS.has(f.slice(4)));

/** Every guard filename in the directory, sorted — the run order is the sort. */
export function guardFiles() {
  return readdirSync(DIR).filter((f) => f.endsWith('.mjs') && !NOT_A_GUARD(f)).sort();
}

/** Filenames for a lane. `lane` is 'ci' or 'live'. */
export function guardFilesFor(lane) {
  return guardFiles().filter((f) => {
    if (STANDALONE_GUARDS.has(f)) return false;
    return lane === 'live' ? LIVE_CREDENTIAL_GUARDS.has(f) : !LIVE_CREDENTIAL_GUARDS.has(f);
  });
}

/**
 * Load a lane's guards, resolving each module's exported runner.
 *
 * THE RUNNER IS FOUND, NOT NAMED. Every guard exports exactly one `run*`
 * function; the file no longer has to repeat that name in two other places.
 * Zero or more than one is a REGISTRY ERROR rather than a skip: a module that
 * cannot be run is the thing this whole file exists to make impossible, so it
 * is reported as a failing entry and the suite goes red.
 *
 * @returns {Promise<Array<{ file: string, name: string, run: Function|null, error: string|null }>>}
 */
export async function loadGuards(lane) {
  const out = [];
  // PLACEHOLDER SECRETS AROUND THE IMPORTS, and this is not tidiness.
  //
  // CI CAUGHT A REAL ORDERING DEPENDENCY HERE and the first version of this
  // file claimed there was none. Several api/ modules construct a Resend or
  // Stripe client AT MODULE SCOPE, which throws synchronously when the key is
  // unset — api/cron/send-onboarding-emails.js:92 is one. Two guards import
  // into that graph, and under the old hand-written order `rate-limiting.mjs`
  // got there first with its own placeholder set (rate-limiting.mjs:40-43), so
  // the module was already evaluated and cached by the time
  // `onboarding-cron-window.mjs` asked for it. Filename order reverses those
  // two, and CI went red with "Missing API key" — the guards were never
  // independent, the hand list was hiding it.
  //
  // Re-encoding the old order would preserve the bug and hide it again. The
  // placeholders are hoisted here instead, so NO guard's import depends on
  // which guard imported first. Restored afterward, so nothing downstream sees
  // a value that was not already there.
  const prior = { RESEND_API_KEY: process.env.RESEND_API_KEY, STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY };
  if (!process.env.RESEND_API_KEY) process.env.RESEND_API_KEY = 're_persistence_suite_placeholder';
  if (!process.env.STRIPE_SECRET_KEY) process.env.STRIPE_SECRET_KEY = 'sk_test_persistence_suite_placeholder';
  try {
  for (const file of guardFilesFor(lane)) {
    try {
      const mod = await import(pathToFileURL(join(DIR, file)).href);
      const runners = Object.keys(mod).filter((k) => /^run[A-Z]/.test(k) && typeof mod[k] === 'function');
      if (runners.length !== 1) {
        out.push({ file, name: file, run: null,
          error: `expected exactly one run* export, found ${runners.length}${runners.length ? ` (${runners.join(', ')})` : ''}` });
        continue;
      }
      out.push({ file, name: runners[0], run: mod[runners[0]], error: null });
    } catch (err) {
      out.push({ file, name: file, run: null, error: `import failed: ${err.message}` });
    }
  }
  } finally {
    for (const [k, v] of Object.entries(prior)) {
      if (v === undefined) delete process.env[k]; else process.env[k] = v;
    }
  }
  return out;
}
