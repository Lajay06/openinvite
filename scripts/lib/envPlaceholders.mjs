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
 * ── AND NOTHING IS SENT, BECAUSE RESEND IS FAKED FOR THE WHOLE RUN ─────────
 *
 * Owner ruling, 2026-10-11, after the provider-call assertion caught a POST to
 * api.resend.com on its first use: api/rsvp-submit.js sends an RSVP
 * confirmation, and anonymous-endpoints.mjs and plus-one-identity.mjs both
 * drive that handler, so every live run WITH A REAL KEY has been attempting
 * real sends since 1fb24857 on 2026-10-08.
 *
 * A placeholder only helps when the real key is absent. So this installs the
 * same Resend fake the lane's own resend guards use, for the WHOLE RUN rather
 * than the import phase: a request to api.resend.com never leaves the process,
 * it is counted and answered with a fake 200. The key in the environment stops
 * mattering.
 *
 * THE COUNTER STAYS AS THE BACKSTOP. It now counts only what reaches the real
 * fetch, so a provider call appearing there means something slipped past the
 * fake: a guard that replaced globalThis.fetch and then called through, or a
 * host the fake does not cover. The runner asserts it is zero.
 *
 * STRIPE IS OBSERVED, NOT FAKED. The ruling names Resend, and no live guard
 * drives a handler that reaches a charge: endpoint-auth drives
 * create-portal-session expecting a 401 before Stripe is touched. A fake there
 * would be inventing a response nobody asked for, so it stays counted, and the
 * assertion is what would catch it.
 *
 * THE BODY IS NEVER RECORDED. The guards' own fakes keep payloads because they
 * assert on them; this one counts. An address is not a diagnostic and this
 * module has no use for one.
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
const faked = [];
const realFetch = globalThis.fetch;
if (typeof realFetch === 'function') {
  globalThis.fetch = async (input, init) => {
    let host = '';
    try {
      const href = typeof input === 'string' ? input : (input?.url || '');
      host = href ? new URL(href).hostname : '';
    } catch {
      // An unparseable input is not a provider call and is not this wrapper's
      // business; never let it change what fetch does.
    }

    // THE FAKE. A send never leaves the process, whatever key is set.
    if (host === 'api.resend.com') {
      faked.push(`${(init?.method || 'GET').toUpperCase()} ${host}`);
      return new Response(JSON.stringify({ id: `faked-${faked.length}` }), {
        status: 200, headers: { 'content-type': 'application/json' },
      });
    }

    if (PROVIDER_HOSTS.has(host)) attempts.push(`${(init?.method || 'GET').toUpperCase()} ${host}`);
    return realFetch(input, init);
  };
}

/** Provider calls that reached the real fetch. Must be empty. */
export function providerAttempts() {
  return [...attempts];
}

/** Sends the fake answered, which is how many real emails did NOT go out. */
export function fakedSends() {
  return [...faked];
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
