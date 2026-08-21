/**
 * Plus Jakarta Sans, self-hosted (L1a).
 *
 * Previously loaded from fonts.googleapis.com in index.html, which meant every
 * visitor's IP reached Google on every page load -- including guests on a
 * couple's wedding site who never signed up for anything. Self-hosting removes
 * Google as a processor for the app's own typeface.
 *
 * These are @fontsource packages, which ship Google's OWN subset files with the
 * same unicode-range boundaries (cyrillic-ext / latin / latin-ext / vietnamese),
 * so the browser still downloads only the ranges a page actually needs. Nothing
 * is hand-trimmed and no glyph coverage changes.
 *
 * The twelve faces below are exactly what index.html requested:
 * weights 300-800, normal and italic. Listed explicitly rather than globbed --
 * a missing weight would silently fall back to a synthesised one.
 *
 * Licence: Plus Jakarta Sans is OFL, so self-hosting is licence-clean.
 */
import '@fontsource/plus-jakarta-sans/300.css';
import '@fontsource/plus-jakarta-sans/400.css';
import '@fontsource/plus-jakarta-sans/500.css';
import '@fontsource/plus-jakarta-sans/600.css';
import '@fontsource/plus-jakarta-sans/700.css';
import '@fontsource/plus-jakarta-sans/800.css';
import '@fontsource/plus-jakarta-sans/300-italic.css';
import '@fontsource/plus-jakarta-sans/400-italic.css';
import '@fontsource/plus-jakarta-sans/500-italic.css';
import '@fontsource/plus-jakarta-sans/600-italic.css';
import '@fontsource/plus-jakarta-sans/700-italic.css';
import '@fontsource/plus-jakarta-sans/800-italic.css';
import '@/lib/sentry.js'   // must be first — initialises Sentry before any other code
import React from 'react'
import ReactDOM from 'react-dom/client'
import { Sentry } from '@/lib/sentry'
import App from '@/App.jsx'
import '@/index.css'
import '@/lib/analytics.js' // initialises PostHog on app load
import { reloadOnceForChunkError } from '@/lib/chunkReloadGuard.js'

// Stale-build-after-deploy fix (see chunkReloadGuard.js) — Vite's built
// __vitePreload wrapper dispatches this on window (a plain Event with the
// original error on .payload — confirmed against node_modules/vite/dist,
// not a CustomEvent/.detail) whenever a route's dynamic import fails,
// including the real import call itself, not just its modulepreload
// optimization. Deliberately never calls event.preventDefault(): Vite's own
// handler re-throws unless defaultPrevented is set, and that rethrow is
// exactly what lazyWithReload.js's own .catch() needs to see too — this
// listener is a side-channel, not a replacement for that rejection path.
window.addEventListener('vite:preloadError', (event) => {
  reloadOnceForChunkError(event.payload);
});

/**
 * DIAGNOSTIC (temporary, additive) — Vercel server logs show no systematic
 * dashboard error, so a crash reaching this boundary is a client-side React
 * render error. Beacons the real error + component stack out to a minimal
 * logging-only endpoint so it's visible in Vercel's logs regardless of
 * whether Sentry itself is reachable/configured. Fire-and-forget: never
 * awaited, every failure mode swallowed, so the beacon itself can never be
 * the reason the fallback UI fails to render.
 *
 * layoutVariant reports which layout the crash happened under, at Tailwind's
 * lg breakpoint (1024px — no override in tailwind.config.js), matching the
 * media query in index.css that drives .page-content.
 *
 * UPDATED 2026-08-18 (Phase 0): this comment used to say Layout.jsx "renders
 * BOTH the desktop and mobile page-content trees at all times", making
 * layoutVariant a proxy rather than a fact, and named that double-mount as the
 * leading suspect for the crashes this beacon exists to catch. It no longer
 * does — Layout.jsx renders {children} once and the breakpoint lives in CSS,
 * so there is exactly one mounted tree and this signal is now precise rather
 * than best-effort. If a crash still reaches this boundary, the double-mount
 * is no longer a candidate explanation.
 */
function beaconClientError(error, componentStack) {
  try {
    const isDesktop = typeof window.matchMedia === 'function' && window.matchMedia('(min-width: 1024px)').matches;
    const payload = {
      errorName: error?.name ?? null,
      errorMessage: error?.message ?? (error != null ? String(error) : null),
      errorStack: error?.stack ?? null,
      componentStack: componentStack ?? null,
      pathname: window.location.pathname,
      userAgent: navigator.userAgent,
      viewportWidth: window.innerWidth,
      layoutVariant: isDesktop ? 'desktop' : 'mobile',
    };
    const body = JSON.stringify(payload);
    if (typeof navigator.sendBeacon === 'function') {
      navigator.sendBeacon('/api/client-error-beacon', new Blob([body], { type: 'application/json' }));
    } else {
      fetch('/api/client-error-beacon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    // Never let the beacon itself break the error fallback UI.
  }
}

function ErrorFallback() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-6 text-center">
      <p className="text-[11px] font-semibold tracking-widest text-[rgba(10,10,10,0.6)] mb-3">
        Openinvite
      </p>
      <h1 className="text-2xl font-bold text-[#0A0A0A] tracking-tight mb-3">
        Something went wrong.
      </h1>
      <p className="text-sm text-[rgba(10,10,10,0.6)] leading-relaxed mb-8 max-w-xs">
        An unexpected error occurred. Please refresh the page to continue.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="bg-[#0A0A0A] text-white text-sm font-semibold px-7 py-3 rounded-full cursor-pointer border-none"
      >
        Refresh page
      </button>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <Sentry.ErrorBoundary fallback={<ErrorFallback />} onError={beaconClientError}>
    <App />
  </Sentry.ErrorBoundary>
)
