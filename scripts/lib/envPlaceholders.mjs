/**
 * scripts/lib/envPlaceholders.mjs
 *
 * PLACEHOLDER PROVIDER KEYS, HELD FOR THE IMPORT PHASE ONLY.
 *
 * ── THE FAULT ──────────────────────────────────────────────────────────────
 *
 * Seventeen modules under api/ build an SDK client at module scope, and
 * new Resend(undefined) throws. scripts/test-persistence.mjs imports its
 * guards statically, and five of them reach one of those modules, so the live
 * lane died during its IMPORT PHASE with "Missing API key" and a stack trace,
 * before reaching the line that says BASE44_TEST_EMAIL is unset. Both halves
 * reached main in e9a89842 on 2026-10-08; the owner hit it on 2026-10-11.
 *
 * ── WHY THIS IS A MODULE AND NOT TWO LINES IN THE RUNNER ───────────────────
 *
 * ES module imports are evaluated before any statement in the importing file,
 * so the runner cannot set an env var "before its imports" inline. A module
 * imported FIRST has already run by the time the next import's body is
 * evaluated, and that is the only hook there is.
 *
 * ── WHAT A PLACEHOLDER IS, AND IS NOT ──────────────────────────────────────
 *
 * A string shaped like a key that no provider accepts. It exists so a
 * constructor does not throw while a module is being loaded. It is set ONLY
 * when the real variable is unset, so a run with real keys is untouched; it is
 * removed by restorePlaceholders(), which the runner calls in a finally; and
 * the runner asserts at the end that nothing this module set is still set.
 *
 * Owner ruling, 2026-10-11: one hoist here rather than five guard fixes, no
 * provider key in any lane's .env.local, and none typed on a command line.
 *
 * ── AND NOTHING MAY ACTUALLY BE SENT ───────────────────────────────────────
 *
 * A placeholder that silently let a real send through would be worse than the
 * crash. So this also watches fetch and counts any request to a provider host.
 * The runner asserts that count is zero. Guards that install their own fetch
 * fake (the resend and stripe guards do) replace this wrapper for their own
 * duration, which is correct: what they record is their own business, and this
 * counter covers everything outside them.
 */

const PLACEHOLDERS = {
  RESEND_API_KEY: 're_import_phase_placeholder',
  STRIPE_SECRET_KEY: 'sk_test_import_phase_placeholder',
};

/** Hosts that would mean a real email or a real charge. */
const PROVIDER_HOSTS = new Set(['api.resend.com', 'api.stripe.com']);

const prior = {};
const setByUs = [];
for (const [k, v] of Object.entries(PLACEHOLDERS)) {
  prior[k] = process.env[k];
  if (!process.env[k]) { process.env[k] = v; setByUs.push(k); }
}

/** Which keys this module set. Empty when the environment already had them. */
export const SET_BY_US = Object.freeze([...setByUs]);

const attempts = [];
const realFetch = globalThis.fetch;
if (typeof realFetch === 'function') {
  globalThis.fetch = async (input, init) => {
    try {
      const href = typeof input === 'string' ? input : (input?.url || '');
      const host = href ? new URL(href).hostname : '';
      if (PROVIDER_HOSTS.has(host)) attempts.push(`${(init?.method || 'GET').toUpperCase()} ${host}`);
    } catch {
      // An unparseable input is not a provider call and is not this wrapper's
      // business; never let the observer change what fetch does.
    }
    return realFetch(input, init);
  };
}

/** Every provider call seen outside a guard's own fetch fake. */
export function providerAttempts() {
  return [...attempts];
}

/**
 * Puts the environment back, so a guard that asks "is a key configured" sees
 * the truth. Safe to call more than once.
 */
export function restorePlaceholders() {
  const removed = [];
  for (const k of setByUs) {
    if (process.env[k] !== PLACEHOLDERS[k]) continue; // something else owns it now
    if (prior[k] === undefined) delete process.env[k];
    else process.env[k] = prior[k];
    removed.push(k);
  }
  return removed;
}

/** The keys this module set that are STILL set. Must be empty at the end. */
export function placeholdersStillSet() {
  return setByUs.filter((k) => process.env[k] === PLACEHOLDERS[k]);
}
