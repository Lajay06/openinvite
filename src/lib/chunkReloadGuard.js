/**
 * src/lib/chunkReloadGuard.js
 *
 * Shared "stale build after deploy" reload-once guard. Vite's code-split
 * chunks are content-hashed per build — a browser tab left open across a
 * deploy holds asset URLs for whatever build was live when the tab loaded.
 * Navigating to a route it hasn't lazy-loaded yet then fails. A full reload
 * pulls the fresh build's asset manifest and fixes it.
 *
 * WHAT PRODUCTION ACTUALLY RETURNS (re-measured 2026-08-30 — this comment
 * previously described a failure mode that no longer occurs). A missing hashed
 * asset returns a real 404 with `content-type: text/plain`, NOT the SPA rewrite
 * serving index.html as `200 text/html`. The MIME-type error this file used to
 * cite ("'text/html' is not a valid JavaScript MIME type") is therefore no
 * longer what the browser reports; Safari says "Importing a module script
 * failed" and Chrome "Failed to fetch dynamically imported module". The import
 * rejects either way, so the guard's behavior is unchanged — but a comment
 * describing a failure mode the system no longer produces is drift, and it sent
 * one investigation looking for the wrong signature.
 *
 * The other half worth recording, because the reload depends on it: index.html
 * is served `cache-control: public, max-age=0, must-revalidate`, so a reload
 * genuinely revalidates and picks up the new build rather than replaying the
 * stale document out of cache. This guard would not work if that changed.
 *
 * Nothing here matches on the error message, deliberately — the wording differs
 * per engine and has already changed once.
 *
 * Used by two independent failure paths that both need this same guarded
 * reload — see src/lib/lazyWithReload.js (a failed dynamic import at
 * render time) and src/main.jsx (the global 'vite:preloadError' event,
 * which covers Vite's <link rel="modulepreload"> prefetch failing before
 * the import is even attempted).
 *
 * LOOP GUARD: reloads at most once per WINDOW_MS. If a chunk error fires
 * again within that window, this is a genuinely broken/missing chunk, not
 * a stale one — falls through to the caller's normal error handling
 * (ultimately the root ErrorBoundary's "something went wrong" fallback)
 * instead of reloading forever.
 */

const STORAGE_KEY = 'oi_chunk_reload_at';
const WINDOW_MS = 10_000;

/**
 * What this guard did the last time it was asked, in this page lifetime.
 *
 * WHY THIS EXISTS. The client-error beacon fires from the root ErrorBoundary's
 * onError, and lazyWithReload.js re-throws AFTER calling this guard — so React
 * renders the fallback and beacons it whether or not a reload is already on its
 * way. Ten beacons in production could therefore have been ten guests stuck on
 * "Something went wrong", or ten guests who saw it flash and got a working page,
 * and nothing in the payload could tell the two apart.
 *
 * A signal that cannot distinguish recovery from failure cannot be used to
 * decide anything. This is the instrument, shipped before the fix, so the fix
 * can be measured.
 *
 * null once a reload lands, because module state resets on the new document.
 * @type {null | 'reloaded' | 'suppressed-recent-reload' | 'sessionstorage-unavailable'}
 */
let lastOutcome = null;

/** @returns {string|null} what this guard last did — read by the beacon. */
export function lastChunkReloadOutcome() {
  return lastOutcome;
}

/**
 * @param {unknown} error — the original chunk-load error, logged for context
 * @returns {boolean} true if a reload was triggered, false if the guard
 *   held (recent reload already happened, or sessionStorage is unavailable —
 *   in either case, NOT reloading is the safe outcome, never an unguarded
 *   reload loop).
 */
export function reloadOnceForChunkError(error) {
  let last;
  try {
    last = Number(sessionStorage.getItem(STORAGE_KEY) || 0);
  } catch {
    // sessionStorage unavailable (private browsing, disabled storage, etc.)
    // — can't guarantee the loop guard, so don't auto-reload. The
    // ErrorBoundary fallback (with its own manual refresh button) is the
    // safe outcome here, not a potentially-unguarded reload loop.
    lastOutcome = 'sessionstorage-unavailable';
    return false;
  }

  if (Date.now() - last < WINDOW_MS) {
    lastOutcome = 'suppressed-recent-reload';
    return false;
  }

  try {
    sessionStorage.setItem(STORAGE_KEY, String(Date.now()));
  } catch {
    lastOutcome = 'sessionstorage-unavailable';
    return false;
  }

  lastOutcome = 'reloaded';

  console.warn('[chunk-reload] stale build asset failed to load, reloading once:', error?.message || error);
  window.location.reload();
  return true;
}
