import base44 from "@base44/vite-plugin"
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { sentryVitePlugin } from '@sentry/vite-plugin'

// https://vite.dev/config/
export default defineConfig({
  logLevel: 'error', // Suppress warnings, only show errors
  plugins: [
    base44({
      // Support for legacy code that imports the base44 SDK with @/integrations, @/entities, etc.
      // can be removed if the code has been updated to use the new SDK imports from @base44/sdk
      legacySDKImports: process.env.BASE44_LEGACY_SDK_IMPORTS === 'true',
      hmrNotifier: true
    }),
    react(),
    // Sentry: uploads source maps after each production build so errors
    // show real file/line numbers instead of minified stack traces.
    // Disabled automatically when SENTRY_AUTH_TOKEN is not set.
    sentryVitePlugin({
      org: 'openinvite',
      project: 'openinvite',
      authToken: process.env.SENTRY_AUTH_TOKEN,
      disable: !process.env.SENTRY_AUTH_TOKEN,
      telemetry: false,
    }),
  ],
  build: {
    // Source maps are required for Sentry to map minified errors back to source
    sourcemap: true,
  },
});