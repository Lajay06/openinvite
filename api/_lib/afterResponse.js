/**
 * api/_lib/afterResponse.js
 *
 * WORK THAT RUNS AFTER THE ANSWER HAS GONE. Owner ruling 2026-10-14: the v2
 * gift webhook took 31.7s and Stripe gave up waiting; it now answers Stripe as
 * soon as the gift is recorded and sends the two emails afterwards.
 *
 * Vercel keeps a function alive for promises handed to the request context's
 * waitUntil (what @vercel/functions' waitUntil reads; used directly so no new
 * dependency is added). Where there is no such context (a test, a local
 * server), the work is awaited instead, which is exactly the old behavior.
 * A failure inside the work is logged, never thrown to a response that has
 * already gone.
 *
 * @param {Promise<unknown>} work
 * @param {{ tag?: string }} [opts]
 * @returns {Promise<void>} resolves at once under waitUntil, after the work otherwise
 */
export async function afterResponse(work, { tag = '[after-response]' } = {}) {
  const guarded = Promise.resolve(work).catch((err) => { console.error(`${tag} work after the response failed:`, err?.message || err); });
  const ctx = globalThis[Symbol.for('@vercel/request-context')]?.get?.();
  if (typeof ctx?.waitUntil === 'function') { ctx.waitUntil(guarded); return; }
  await guarded;
}
