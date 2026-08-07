import '@/lib/sentry.js'   // must be first — initialises Sentry before any other code
import React from 'react'
import ReactDOM from 'react-dom/client'
import { Sentry } from '@/lib/sentry'
import App from '@/App.jsx'
import '@/index.css'
import '@/lib/analytics.js' // initialises PostHog on app load

/**
 * DIAGNOSTIC (temporary, additive) — Vercel server logs show no systematic
 * dashboard error, so a crash reaching this boundary is a client-side React
 * render error. Beacons the real error + component stack out to a minimal
 * logging-only endpoint so it's visible in Vercel's logs regardless of
 * whether Sentry itself is reachable/configured. Fire-and-forget: never
 * awaited, every failure mode swallowed, so the beacon itself can never be
 * the reason the fallback UI fails to render.
 *
 * layoutVariant is a best-effort signal, not a precise one: Layout.jsx
 * renders BOTH the desktop and mobile page-content trees at all times
 * (`hidden lg:block` / `lg:hidden` — CSS visibility, not a JS conditional
 * mount), so there's no true "which one is mounting" boolean to read. This
 * reports which variant is the *visible* one at the moment of the crash
 * (Tailwind's default lg breakpoint, 1024px — no custom override in
 * tailwind.config.js) as the closest available proxy — the leading
 * suspect is that double-mount, so this is still the most useful signal
 * available without changing Layout.jsx itself (out of scope for this PR).
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
      <p className="text-sm text-[rgba(10,10,10,0.5)] leading-relaxed mb-8 max-w-xs">
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
