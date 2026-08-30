/**
 * src/lib/lazyWithReload.js
 *
 * Drop-in replacement for React's own `lazy()` — every route-level
 * `lazy(() => import('./pages/X'))` call site (App.jsx, pages.config.js)
 * uses this instead. Wraps the import in the same reload-once guard as
 * the global 'vite:preloadError' listener (src/main.jsx), covering the
 * other failure path: a direct failed dynamic import at click/navigation
 * time, which 'vite:preloadError' (modulepreload only) doesn't catch.
 *
 * WHAT HAPPENS WHEN THE GUARD DECIDES TO RELOAD. This used to re-throw
 * unconditionally, including when a full reload was already committing. That
 * re-throw reached the root ErrorBoundary, which rendered "Something went
 * wrong." and beaconed it — for a failure the app was in the middle of
 * recovering from, milliseconds before the document was replaced. Guests saw
 * our branding and our error on the couple's own wedding site, for a stale
 * asset we were already fixing.
 *
 * So the branch is now on what the guard actually did:
 *
 *   reloaded      -> return a promise that never settles. Suspense holds its
 *                    loading state until the new document takes over. Nothing
 *                    is thrown, so nothing renders the error screen.
 *   guard held    -> re-throw, exactly as before. This is a genuinely broken
 *                    chunk (a second failure inside the 10s window) or a
 *                    browser where the loop guard can't be trusted, and the
 *                    ErrorBoundary fallback with its manual refresh button is
 *                    the right outcome.
 *
 * The beacon still fires in the second case and still records WHY via
 * chunkReloadOutcome, so suppressing the flash costs no visibility — the
 * instrument reads the same either way. (Standing rule: never hold a fix to
 * protect a measurement the fix does not affect.)
 *
 * THE HANG GUARD. A promise that never settles is only safe while a navigation
 * really is on its way. If the reload were somehow prevented, the guest would
 * sit on a spinner forever — a worse failure than the error screen this
 * removes. So the never-settling promise is bounded: if the document has not
 * been replaced within RELOAD_GRACE_MS, it rejects with the original error and
 * the normal fallback appears after all.
 */

import { lazy } from 'react';
import { reloadOnceForChunkError } from './chunkReloadGuard.js';

// Long enough that a committing navigation always wins the race; short enough
// that a guest is never stranded on a spinner if one somehow doesn't.
const RELOAD_GRACE_MS = 10_000;

export function lazyWithReload(importFn) {
  return lazy(() =>
    importFn().catch((err) => {
      const reloading = reloadOnceForChunkError(err);
      if (!reloading) throw err;

      // A reload is committing. Hold Suspense rather than flashing an error
      // for a failure that is already being fixed.
      return new Promise((_resolve, reject) => {
        setTimeout(() => reject(err), RELOAD_GRACE_MS);
      });
    })
  );
}
