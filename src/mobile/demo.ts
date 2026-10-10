/**
 * The demo build: `VITE_MOBILE_DEMO=1` at build time (`npm run mobile:demo`).
 *
 * A demo build ships the /m/preview routes (which a production bundle leaves
 * out), starts the native app at /m/preview instead of /m, and makes no
 * network calls: every fetch, XMLHttpRequest and sendBeacon that is not a
 * static asset of the app or an image is refused before it leaves the
 * device, so the fixtures are the only data on screen. Auth, currency,
 * analytics and error reporting all see the same "offline" failure they are
 * already written to tolerate.
 *
 * With the flag unset, nothing in this file does anything: `isDemoBuild` is
 * false at build time and the guard is never installed.
 */
export const isDemoBuild: boolean = import.meta.env.VITE_MOBILE_DEMO === '1';

/**
 * The real build (goal 8): `VITE_MOBILE_REAL=1` at build time (`npm run
 * mobile:real`). Nothing in the bundle changes but the Account screen's
 * "Live" label, the counterpart of the demo's "Demo data", so the owner
 * always knows which build is on the phone. The data path is the same as
 * any production bundle: the native rewrite in native.ts sends every /api/
 * call to the production host and the Base44 app id comes from
 * VITE_BASE44_APP_ID in the local, uncommitted .env.local (MOBILE_APP.md).
 */
export const isRealBuild: boolean = import.meta.env.VITE_MOBILE_REAL === '1' && !isDemoBuild;

/** Hosts that may still be fetched in a demo: the app's own bundle and the image CDN. */
const ALLOWED_HOSTS = ['res.cloudinary.com'];

function allowed(url: string): boolean {
  let u: URL;
  try { u = new URL(url, window.location.href); } catch { return false; }
  if (u.protocol === 'data:' || u.protocol === 'blob:') return true;
  if (u.origin === window.location.origin) return !u.pathname.startsWith('/api/');
  return ALLOWED_HOSTS.includes(u.hostname);
}

/** Refuses every non-asset request. Installed once, at module load, only in a demo build. */
export function installDemoNetworkGuard(): void {
  if (!isDemoBuild || typeof window === 'undefined') return;
  const w = window as any;
  if (w.__oiDemoGuard) return;
  w.__oiDemoGuard = true;

  const realFetch = window.fetch.bind(window);
  window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    if (allowed(url)) return realFetch(input, init);
    return Promise.reject(new TypeError('Demo build: network request refused'));
  }) as typeof window.fetch;

  const open = XMLHttpRequest.prototype.open;
  const send = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (this: XMLHttpRequest & { __oiRefused?: boolean }, method: string, url: string | URL, ...rest: any[]) {
    this.__oiRefused = !allowed(typeof url === 'string' ? url : url.toString());
    return (open as any).call(this, method, url, ...rest);
  } as typeof XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.send = function (this: XMLHttpRequest & { __oiRefused?: boolean }, body?: Document | XMLHttpRequestBodyInit | null) {
    if (this.__oiRefused) {
      // The same event a request that never reached the network would fire.
      setTimeout(() => { this.dispatchEvent(new Event('error')); this.dispatchEvent(new Event('loadend')); }, 0);
      return;
    }
    return send.call(this, body);
  } as typeof XMLHttpRequest.prototype.send;

  if (typeof navigator.sendBeacon === 'function') {
    navigator.sendBeacon = () => true;
  }
}

installDemoNetworkGuard();
