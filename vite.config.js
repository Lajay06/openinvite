import base44 from "@base44/vite-plugin"
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { sentryVitePlugin } from '@sentry/vite-plugin'

// https://vite.dev/config/
/**
 * Strips the legacy .woff fallback from every @fontsource stylesheet.
 *
 * @fontsource ships each face as `url(x.woff2) format('woff2'), url(x.woff)
 * format('woff')`. The .woff half was 54% of the font weight on disk (23.4 MB
 * at L1b) and is dead payload: woff2 has been supported by every browser this
 * app targets since 2016, so the fallback can never be selected by a client we
 * serve. Removing the reference also stops the files being emitted at all,
 * because nothing points at them any more.
 *
 * Applied at transform time rather than by hand-editing node_modules, so it
 * survives reinstalls and covers every family automatically.
 */
function dropLegacyWoff() {
  return {
    name: 'openinvite:drop-legacy-woff',
    enforce: 'pre',
    transform(code, id) {
      if (!id.includes('@fontsource') || !id.split('?')[0].endsWith('.css')) return null;
      const out = code.replace(/,\s*url\([^)]*\.woff\)\s*format\(['"]woff['"]\)/g, '');
      return out === code ? null : { code: out, map: null };
    },
  };
}

export default defineConfig({
  logLevel: 'error', // Suppress warnings, only show errors
  plugins: [
    dropLegacyWoff(),
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
    // Never inline font files. Vite's default assetsInlineLimit (4 KB) was
    // base64-ing the smaller subset faces (cyrillic-ext) straight into the
    // render-blocking CSS. That defeats the whole point of unicode-range
    // slicing -- an inlined subset is downloaded by every visitor whether
    // their page contains a single Cyrillic character or not -- and it cannot
    // be cached separately from the CSS. Fonts ship as static assets.
    assetsInlineLimit: (filePath) => !/\.(woff2?|ttf|otf|eot)$/i.test(filePath),

    // Source maps are required for Sentry to map minified errors back to source
    sourcemap: true,
    rollupOptions: {
      output: {
        // AUDIT_2026-07.md B1: react/react-dom/react-router are needed by
        // every single route, so they go in one shared vendor chunk the
        // browser caches once across navigations, rather than being
        // duplicated into (or re-fetched with) every lazy-loaded route
        // chunk. Everything else's per-route splitting is automatic once
        // a page is behind React.lazy() — no manual list needed for those.
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
});