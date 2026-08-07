/**
 * src/lib/chunkReloadGuard.js
 *
 * Shared "stale build after deploy" reload-once guard. Vite's code-split
 * chunks are content-hashed per build — a browser tab left open across a
 * deploy holds asset URLs for whatever build was live when the tab loaded.
 * Navigating to a route it hasn't lazy-loaded yet then fails: Vercel's SPA
 * rewrite serves index.html (200, text/html) for the now-gone hashed asset
 * path, which the browser reports as "'text/html' is not a valid
 * JavaScript MIME type" / "Failed to fetch dynamically imported module" —
 * exactly the errors Sentry confirmed across /universes, /Features,
 * /Schedule, /event-details, /DailyUpdate, /privacy-policy. A full reload
 * pulls the fresh build's asset manifest and fixes it.
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
    return false;
  }

  if (Date.now() - last < WINDOW_MS) {
    return false;
  }

  try {
    sessionStorage.setItem(STORAGE_KEY, String(Date.now()));
  } catch {
    return false;
  }

  console.warn('[chunk-reload] stale build asset failed to load, reloading once:', error?.message || error);
  window.location.reload();
  return true;
}
