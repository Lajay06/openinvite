import '@/lib/sentry.js'   // must be first — initialises Sentry before any other code
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import '@/lib/analytics.js' // initialises PostHog on app load

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
