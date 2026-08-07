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
 * Always re-throws after a guarded reload attempt (whether or not it
 * actually reloaded) so Suspense/the ErrorBoundary still see the
 * rejection — if the reload guard held (see chunkReloadGuard.js), this is
 * what lets the failure surface to the normal "something went wrong"
 * fallback instead of hanging forever on an unresolved promise.
 */

import { lazy } from 'react';
import { reloadOnceForChunkError } from './chunkReloadGuard.js';

export function lazyWithReload(importFn) {
  return lazy(() =>
    importFn().catch((err) => {
      reloadOnceForChunkError(err);
      throw err;
    })
  );
}
