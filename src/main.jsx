import '@/lib/sentry.js'   // must be first — initialises Sentry before any other code
import React from 'react'
import ReactDOM from 'react-dom/client'
import { Sentry } from '@/lib/sentry'
import App from '@/App.jsx'
import '@/index.css'
import '@/lib/analytics.js' // initialises PostHog on app load

function ErrorFallback() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-6 text-center">
      <p className="text-[11px] font-semibold tracking-widest text-[rgba(10,10,10,0.4)] mb-3">
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
  <Sentry.ErrorBoundary fallback={<ErrorFallback />}>
    <App />
  </Sentry.ErrorBoundary>
)
