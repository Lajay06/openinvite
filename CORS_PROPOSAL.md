# CORS for the mobile shell: a proposal for the product lane

Written by the mobile lane (goal 8, 2026-09-22). **Not applied.** `api/` is out of bounds for the mobile branch; this is the exact change for the product lane to review, merge and deploy. Until it is live, the native app can sign in and read entities but cannot reach any of the app's own `/api/*` endpoints.

## The change

One file, `api/_lib/security.js`, two origins added to the allow-list. No wildcard.

```diff
--- a/api/_lib/security.js
+++ b/api/_lib/security.js
@@
 const ALLOWED_ORIGINS = new Set([
   'https://openinvite.com.au',
   'https://www.openinvite.com.au',
   'https://openinvite-pearl.vercel.app',
+  // The Openinvite mobile app (Capacitor). The WebView's page origin is fixed
+  // by the platform, not by a hostname anyone can register: iOS serves the
+  // bundle from capacitor://localhost, Android from https://localhost
+  // (Capacitor's default androidScheme since v3, which the config keeps).
+  // Both are the app's own
+  // bundle and nothing else; a browser tab cannot have either origin.
+  'capacitor://localhost',
+  'https://localhost',
 ]);
```

Nothing else changes. `applyCors` keeps reflecting the request's origin only when it is in the set, keeps `Vary: Origin`, and keeps answering unlisted origins with no `Access-Control-Allow-Origin` at all.

## Why each origin

| Origin | Who sends it | Why it is needed |
|---|---|---|
| `capacitor://localhost` | The iOS app. Capacitor's WKWebView loads the bundle from its own scheme, and every request the page makes carries this as `Origin`. | Every `/api/*` call the app makes (`/api/my-guests`, `/api/my-wedding-details`, `/api/my-guest-links`, `/api/send-invites`, `/api/schedule-feed-url`, `/api/song-request-review`, Places, `/api/vow-pin`, `/api/change-address`) is a cross-origin request from the phone's point of view. Without the header the browser inside the app discards the response and the screen shows its error state. |
| `https://localhost` | The Android app. Capacitor on Android serves the bundle from `https://localhost` (its default `androidScheme` since Capacitor 3; `capacitor.config.ts` leaves it at the default). | Same reason. `http://localhost` is deliberately not added: the Android project uses the https scheme, and an http origin is the one a local dev server could also present. |

Neither origin can be presented by a web page: a browser will not load `capacitor://` at all, and `https://localhost` needs a certificate for `localhost` that the phone's WebView issues to itself. The Authorization header is still required on every endpoint, so the allow-list only decides whether the browser lets the app read a response it was already entitled to.

## What already works without this

Probed on 2026-09-22 with `OPTIONS` requests carrying `Origin: capacitor://localhost`:

- `https://www.openinvite.com.au/api/apps/<app id>/...` (Vercel's rewrite to base44.app, which the SDK uses for sign-in and every `base44.entities.*` call) answers `access-control-allow-origin: *` and reflects the requested headers, `authorization` included. **Email and password sign-in and entity reads work from the shell today.**
- `https://www.openinvite.com.au/api/my-wedding-details` answers 200 with the methods and headers but no `access-control-allow-origin`, so the browser blocks it. This is what the diff fixes.
- `https://openinvite.com.au/...` (the apex) answers every preflight with a 307 to www, which no browser follows for a preflight. The mobile shell now sends its API calls to the www host (`API_ORIGIN` in `src/mobile/native.ts`); nothing on the server needs to change for that.

## How to verify after deploy

From any terminal, no credentials needed (a preflight carries none):

```
curl -s -X OPTIONS \
  -H "Origin: capacitor://localhost" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: authorization" \
  -D - -o /dev/null https://www.openinvite.com.au/api/my-wedding-details \
  | grep -i "^HTTP\|access-control-allow-origin"
```

Before: `HTTP/2 200` and no `access-control-allow-origin` line. After: `access-control-allow-origin: capacitor://localhost`. Repeat with `-H "Origin: https://localhost"` for Android, and once with `-H "Origin: https://evil.example"` to confirm that one still gets no header.

Then on the phone: `npm run mobile:real`, run from Xcode, sign in with email and password, and the Home screen loads the couple's own guests, tasks and budget instead of its error states. The Account screen says **Live** under its title.

## What this does not do

- It does not open any endpoint to the public; every endpoint keeps its own auth.
- It does not change rate limiting, Turnstile or the trial guard.
- It does not touch Base44's own CORS, which is already permissive for the SDK's paths.
- Google and Apple sign-in in the shell still need `openinvite://auth` registered in the Base44 app's auth settings (a dashboard change, not code); email and password do not.
