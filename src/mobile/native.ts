/**
 * src/mobile/native.ts
 *
 * The one place the mobile shell touches Capacitor. Every export is a no-op
 * on the web, so the same components run in the browser, in /m/preview, and
 * inside the iOS and Android shells without a conditional at the call site.
 *
 * Plugins are loaded lazily and only when running natively. If a plugin is
 * missing (not installed, or the native project has not been synced) the
 * wrapper swallows the error rather than breaking the screen: a tap without
 * haptic feedback is a smaller failure than a screen that will not render.
 */

type Plugin = Record<string, any>;

declare global {
  interface Window {
    Capacitor?: {
      isNativePlatform?: () => boolean;
      getPlatform?: () => string;
    };
  }
}

/** Production origin: where the API lives when the page is not served by Vercel. */
export const PROD_ORIGIN = 'https://openinvite.com.au';
/**
 * The host the shell's API calls go to (goal 8). The apex redirects to www
 * with a 307, and a CORS preflight may not follow a redirect, so every call
 * the apex received from the shell failed before it reached an endpoint.
 * Links the couple shares keep the apex (PROD_ORIGIN); the site redirects
 * them itself.
 */
export const API_ORIGIN = 'https://www.openinvite.com.au';

/** True only inside the Capacitor iOS or Android shell. */
export function isNative(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.Capacitor?.isNativePlatform?.() === true;
  } catch {
    return false;
  }
}

/** 'ios' | 'android' | 'web' */
export function platform(): string {
  if (typeof window === 'undefined') return 'web';
  try {
    return window.Capacitor?.getPlatform?.() || 'web';
  } catch {
    return 'web';
  }
}

// Literal specifiers, so Vite can resolve each plugin into its own lazy
// chunk. The chunk is only ever requested when isNative() is true, so the
// web bundle's initial load never pays for them.
const LOADERS: Record<string, () => Promise<Plugin>> = {
  'status-bar': () => import('@capacitor/status-bar'),
  keyboard: () => import('@capacitor/keyboard'),
  'splash-screen': () => import('@capacitor/splash-screen'),
  haptics: () => import('@capacitor/haptics'),
  share: () => import('@capacitor/share'),
  browser: () => import('@capacitor/browser'),
  preferences: () => import('@capacitor/preferences'),
  app: () => import('@capacitor/app'),
  network: () => import('@capacitor/network'),
  'local-notifications': () => import('@capacitor/local-notifications'),
};

async function load(name: string): Promise<Plugin | null> {
  if (!isNative()) return null;
  const loader = LOADERS[name];
  if (!loader) return null;
  try {
    return await loader();
  } catch {
    return null;
  }
}

/** Light status bar text on the light page background. */
/** Light status bar content over an ink or photo surface (the launch sequence), dark content over the page. */
export async function setStatusBarDark(darkSurface: boolean): Promise<void> {
  const mod = await load('status-bar');
  if (!mod) return;
  try { await mod.StatusBar.setStyle({ style: darkSurface ? mod.Style.Dark : mod.Style.Light }); } catch { /* no-op */ }
}

export async function configureStatusBar(): Promise<void> {
  const mod = await load('status-bar');
  if (!mod) return;
  try {
    await mod.StatusBar.setStyle({ style: mod.Style.Light });
    if (platform() === 'android') {
      await mod.StatusBar.setBackgroundColor({ color: '#F7F7F7' });
      await mod.StatusBar.setOverlaysWebView({ overlay: false });
    }
  } catch {
    /* no-op */
  }
}

/** The keyboard pushes the webview up so a focused input is never covered. */
export async function configureKeyboard(): Promise<void> {
  const mod = await load('keyboard');
  if (!mod) return;
  try {
    await mod.Keyboard.setResizeMode({ mode: mod.KeyboardResize.Native });
    await mod.Keyboard.setScroll({ isDisabled: false });
  } catch {
    /* no-op */
  }
}

export async function hideSplash(): Promise<void> {
  const mod = await load('splash-screen');
  if (!mod) return;
  try {
    await mod.SplashScreen.hide();
  } catch {
    /* no-op */
  }
}

/** A light tap, for tab changes and completing a task. */
export async function hapticLight(): Promise<void> {
  const mod = await load('haptics');
  if (!mod) return;
  try {
    await mod.Haptics.impact({ style: mod.ImpactStyle.Light });
  } catch {
    /* no-op */
  }
}

/**
 * Native share sheet when available; the browser's Web Share API when it is
 * offered (mobile Safari and Chrome); otherwise the clipboard. Returns which
 * path was taken so the caller can say "Link copied" only when that is true.
 */
export async function shareLink(opts: { title?: string; text?: string; url: string }): Promise<'native' | 'web' | 'copied' | 'failed'> {
  const mod = await load('share');
  if (mod) {
    try {
      await mod.Share.share({ title: opts.title, text: opts.text, url: opts.url, dialogTitle: opts.title });
      return 'native';
    } catch {
      /* fall through: the user may have dismissed the sheet */
    }
  }
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title: opts.title, text: opts.text, url: opts.url });
      return 'web';
    } catch {
      /* dismissed or unsupported payload */
    }
  }
  try {
    await navigator.clipboard.writeText(opts.url);
    return 'copied';
  } catch {
    return 'failed';
  }
}

/**
 * Hand a generated file (a CSV, an .ics, a text) to the couple. Natively the
 * share sheet carries the content as text (no Filesystem plugin is added on
 * this branch, and Mail, Notes and Files all accept text). On the web the
 * Web Share API takes a File where it is offered; otherwise the file
 * downloads, as the desktop's export buttons do.
 */
export async function exportText(filename: string, mime: string, content: string): Promise<'native' | 'web' | 'download' | 'failed'> {
  const mod = await load('share');
  if (mod) {
    try {
      await mod.Share.share({ title: filename, text: content, dialogTitle: filename });
      return 'native';
    } catch {
      /* dismissed */
    }
  }
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function' && typeof File !== 'undefined') {
    try {
      const file = new File([content], filename, { type: mime });
      if (typeof navigator.canShare !== 'function' || navigator.canShare({ files: [file] })) {
        await navigator.share({ title: filename, files: [file] });
        return 'web';
      }
    } catch {
      /* dismissed or unsupported */
    }
  }
  try {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return 'download';
  } catch {
    return 'failed';
  }
}

/** External links open in the system browser natively, a new tab on the web. */
export async function openExternal(url: string): Promise<void> {
  const mod = await load('browser');
  if (mod) {
    try {
      await mod.Browser.open({ url });
      return;
    } catch {
      /* fall through */
    }
  }
  if (typeof window !== 'undefined') window.open(url, '_blank', 'noopener,noreferrer');
}

/** Small durable values (last tab, dismissed hints). localStorage on the web. */
export async function prefGet(key: string): Promise<string | null> {
  const mod = await load('preferences');
  if (mod) {
    try {
      const { value } = await mod.Preferences.get({ key });
      return value ?? null;
    } catch {
      /* fall through */
    }
  }
  try {
    return localStorage.getItem(`oi_mobile_${key}`);
  } catch {
    return null;
  }
}

export async function prefSet(key: string, value: string): Promise<void> {
  const mod = await load('preferences');
  if (mod) {
    try {
      await mod.Preferences.set({ key, value });
      return;
    } catch {
      /* fall through */
    }
  }
  try {
    localStorage.setItem(`oi_mobile_${key}`, value);
  } catch {
    /* private mode */
  }
}

/**
 * Android hardware back: step back through history, and when there is
 * nothing left to go back to, let the OS background the app. Returns a
 * disposer. On iOS and the web this registers nothing.
 */
export async function registerBackButton(onBack: () => boolean): Promise<() => void> {
  const mod = await load('app');
  if (!mod || platform() !== 'android') return () => {};
  try {
    const handle = await mod.App.addListener('backButton', ({ canGoBack }: { canGoBack: boolean }) => {
      // Sheets first (the caller closes one and returns true), then history,
      // then a confirm before leaving the app from a root screen.
      const handled = onBack();
      if (handled) return;
      const atRoot = /^\/m\/?(guests|plan|site|account)?\/?$/.test(window.location.pathname);
      if (canGoBack && !atRoot) { window.history.back(); return; }
      if (window.confirm('Leave Openinvite?')) mod.App.exitApp();
    });
    return () => {
      try {
        handle.remove();
      } catch {
        /* no-op */
      }
    };
  } catch {
    return () => {};
  }
}

/**
 * THE API HAS NO SAME-ORIGIN IN THE SHELL. Every data call in the codebase is
 * relative: `fetch('/api/my-guests')`, and the Base44 client's `serverUrl: ''`
 * sends `/api/apps/...` through Vercel's rewrite. Inside Capacitor the page
 * origin is capacitor://localhost (iOS) or http://localhost (Android), so
 * those paths resolve to the app bundle and fail.
 *
 * This installs, natively only, a rewrite of any same-origin `/api/` request
 * to API_ORIGIN (the www host: the apex answers a preflight with a redirect,
 * which no browser follows), for both fetch (the /api/*.js endpoints) and
 * XMLHttpRequest (the SDK's axios). It runs at module load, which App.jsx's
 * static import puts before AuthProvider's first `auth.me()`.
 *
 * The demo build's network guard (src/mobile/demo.ts) patches the same two
 * functions and is installed by demo.ts itself at module load; App.jsx's
 * `import { isDemoBuild } from './mobile/demo'` is what evaluates it, on the
 * line after this module's own import. So the guard wraps the rewrite and
 * sees the relative path, which `allowed()` refuses on its own origin; it
 * refuses the rewritten absolute URL too, so neither order leaks a request
 * out of a demo. Nothing here imports demo.ts, and nothing should: two
 * import sites would install the guard twice.
 *
 * What it does NOT do: make the server accept the request. api/_lib/security.js
 * reflects Access-Control-Allow-Origin only for the production hostnames, so
 * the shell's origin must be added there before the app's own /api/*
 * endpoints answer natively (CORS_PROPOSAL.md). The SDK's own calls
 * (/api/apps/*, sign-in included) ride Vercel's proxy to base44.app, which
 * answers every origin with a wildcard and reflects the requested headers,
 * so those work from the shell today (probed 2026-09-22, MOBILE_APP.md).
 */
export function installNativeApiBase(origin: string = API_ORIGIN): void {
  if (typeof window === 'undefined' || !isNative()) return;
  const w = window as any;
  if (w.__oiNativeApiBase) return;
  w.__oiNativeApiBase = origin;

  const rewrite = (url: unknown): unknown => {
    if (typeof url === 'string' && url.startsWith('/api/')) return origin + url;
    if (typeof url === 'string' && url.startsWith(`${window.location.origin}/api/`)) return origin + url.slice(window.location.origin.length);
    return url;
  };

  const nativeFetch = window.fetch.bind(window);
  window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    if (typeof input === 'string') return nativeFetch(rewrite(input) as string, init);
    if (input instanceof URL) return nativeFetch(rewrite(input.toString()) as string, init);
    if (input instanceof Request) {
      const next = rewrite(input.url) as string;
      if (next !== input.url) return nativeFetch(new Request(next, input), init);
    }
    return nativeFetch(input, init);
  }) as typeof window.fetch;

  const open = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (this: XMLHttpRequest, method: string, url: string | URL, ...rest: any[]) {
    const next = rewrite(typeof url === 'string' ? url : url.toString()) as string;
    return (open as any).call(this, method, next, ...rest);
  } as typeof XMLHttpRequest.prototype.open;
}

// Installed as early as this module is evaluated. A no-op on the web.
installNativeApiBase();

/** Runs the native setup once when the shell mounts. No-op on the web. */
export async function bootNative(): Promise<void> {
  if (!isNative()) return;
  await Promise.all([configureStatusBar(), configureKeyboard()]);
}

/* ── Goal 3: deep links, biometric lock, camera, network ───────────────── */

/** The custom scheme the native projects register. Universal links on openinvite.com.au are the later upgrade. */
export const APP_SCHEME = 'openinvite';

/**
 * Turns an incoming openinvite:// URL into an in-app path under /m.
 *   openinvite://auth?access_token=...   -> stores the token, returns '/m'
 *   openinvite://m/plan/budget           -> '/m/plan/budget'
 *   openinvite://plan/budget             -> '/m/plan/budget'
 *   https://openinvite.com.au/m/...      -> '/m/...' (universal link, later)
 * Returns null for anything it does not understand.
 *
 * Auth mirrors src/lib/app-params.js: the web callback lands on
 * from_url?access_token=..., app-params stores it as base44_access_token
 * and strips it from the URL. The scheme does the same and then goes Home.
 */
export function routeForDeepLink(url: string): string | null {
  let u: URL;
  try { u = new URL(url); } catch { return null; }
  const isScheme = u.protocol === `${APP_SCHEME}:`;
  const isSite = /openinvite\.com\.au$/i.test(u.hostname);
  if (!isScheme && !isSite) return null;
  const token = u.searchParams.get('access_token');
  if (token) {
    try { localStorage.setItem('base44_access_token', token); localStorage.setItem('oi_auth', '1'); } catch { /* private mode */ }
    const next = u.searchParams.get('next');
    return next && next.startsWith('/m') ? next : '/m';
  }
  // Scheme URLs: the host is the first path segment ("m", "plan", "guests").
  const segs = isScheme ? [u.hostname, ...u.pathname.split('/').filter(Boolean)] : u.pathname.split('/').filter(Boolean);
  const path = segs.filter(Boolean);
  if (path[0] !== 'm') path.unshift('m');
  return `/${path.join('/')}${u.search && !token ? u.search : ''}`;
}

// On iOS, App.getLaunchUrl() returns the last URL the app was ever opened
// with, cold or warm, and never clears it (ApplicationDelegateProxy.lastURL).
// So every mount that registers below would replay it. Found on the first
// simulator run: a link to a guarded route while signed out bounced to
// /m/welcome, which remounted, replayed the link, bounced again, and WebKit
// threw after 100 replaceState calls. The auth callback had the same shape
// through its reload. The URL already handled is kept in sessionStorage,
// which survives that reload inside the webview.
const HANDLED_URL_KEY = 'oi_deeplink_handled';
let handledUrlFallback: string | null = null;
function handledUrl(): string | null {
  try { return window.sessionStorage.getItem(HANDLED_URL_KEY) ?? handledUrlFallback; } catch { return handledUrlFallback; }
}
function markHandled(url: string): void {
  handledUrlFallback = url;
  try { window.sessionStorage.setItem(HANDLED_URL_KEY, url); } catch { /* private mode */ }
}

/** Listens for openinvite:// and universal links and hands the route to the caller. Disposer returned. */
export async function registerDeepLinks(onRoute: (path: string, raw: string) => void): Promise<() => void> {
  const mod = await load('app');
  if (!mod) return () => {};
  try {
    const handle = await mod.App.addListener('appUrlOpen', ({ url }: { url: string }) => {
      markHandled(url);
      const path = routeForDeepLink(url);
      if (path) onRoute(path, url);
    });
    // A cold start from a link: the URL that launched the app, once.
    try {
      const launch = await mod.App.getLaunchUrl();
      if (launch?.url && launch.url !== handledUrl()) {
        markHandled(launch.url);
        const path = routeForDeepLink(launch.url);
        if (path) onRoute(path, launch.url);
      }
    } catch { /* no launch url */ }
    return () => { try { handle.remove(); } catch { /* no-op */ } };
  } catch {
    return () => {};
  }
}

/** Fires when the app returns to the foreground; used by the app lock. */
export async function onAppStateChange(cb: (active: boolean) => void): Promise<() => void> {
  const mod = await load('app');
  if (!mod) return () => {};
  try {
    const handle = await mod.App.addListener('appStateChange', ({ isActive }: { isActive: boolean }) => cb(isActive));
    return () => { try { handle.remove(); } catch { /* no-op */ } };
  } catch { return () => {}; }
}

const BIOMETRIC_LOADER = () => import('@aparajita/capacitor-biometric-auth');

/** Whether the device offers biometrics (Face ID, Touch ID, fingerprint). Web: false. */
export async function biometricsAvailable(): Promise<{ available: boolean; kind: string }> {
  if (!isNative()) return { available: false, kind: '' };
  try {
    const mod: Plugin = await BIOMETRIC_LOADER();
    const r = await mod.BiometricAuth.checkBiometry();
    const kind = r.biometryType === mod.BiometryType.faceId ? 'Face ID' : r.biometryType === mod.BiometryType.touchId ? 'Touch ID' : r.biometryType === mod.BiometryType.fingerprintAuthentication ? 'Fingerprint' : r.biometryType === mod.BiometryType.faceAuthentication ? 'Face unlock' : 'Biometrics';
    return { available: !!r.isAvailable, kind };
  } catch { return { available: false, kind: '' }; }
}

/**
 * Asks for biometrics, with the device passcode as fallback. Resolves true
 * on success, false on cancel or failure. Web: true (no lock on the web).
 * An app lock only: no password or token is stored anywhere new.
 */
export async function biometricUnlock(reason = 'Unlock Openinvite'): Promise<boolean> {
  if (!isNative()) return true;
  try {
    const mod: Plugin = await BIOMETRIC_LOADER();
    await mod.BiometricAuth.authenticate({ reason, cancelTitle: 'Cancel', allowDeviceCredential: true, iosFallbackTitle: 'Use passcode', androidTitle: 'Unlock Openinvite', androidSubtitle: reason });
    return true;
  } catch { return false; }
}

const CAMERA_LOADER = () => import('@capacitor/camera');

/**
 * Take a photo or choose one from the library and return it as a File the
 * existing upload hook (src/hooks/useFileUpload.js) accepts. Web: null, so
 * the caller falls back to <input type="file">.
 */
export async function pickPhoto(source: 'camera' | 'library'): Promise<File | null> {
  if (!isNative()) return null;
  try {
    const mod: Plugin = await CAMERA_LOADER();
    let uri: string | undefined;
    if (source === 'camera') {
      const r = await mod.Camera.takePhoto({ quality: 85, targetWidth: 2400, saveToGallery: false });
      uri = r?.webPath || r?.uri;
    } else {
      const r = await mod.Camera.chooseFromGallery({ quality: 85, targetWidth: 2400, allowMultipleSelection: false, limit: 1 });
      const first = r?.results?.[0];
      uri = first?.webPath || first?.uri;
    }
    if (!uri) return null;
    const blob = await (await fetch(uri)).blob();
    const ext = blob.type.includes('png') ? 'png' : 'jpg';
    return new File([blob], `photo-${Date.now()}.${ext}`, { type: blob.type || 'image/jpeg' });
  } catch {
    return null;
  }
}

/* ── Goal 8: the phone's contacts, for the guest list ─────────────────── */

const CONTACTS_LOADER = () => import('@capacitor-community/contacts');

export interface PhoneContact {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
}

/**
 * Read the phone's contacts as guests-to-be: one name, the primary (else
 * first) email and phone, and the primary (else first) postal address as
 * one line. Permission is asked for here and nowhere else, so the prompt
 * appears only when the couple taps "From contacts". Web: 'unavailable'.
 * A refusal is 'denied'; the caller says so and offers the file import.
 */
export async function readContacts(): Promise<{ status: 'granted' | 'denied' | 'unavailable'; contacts: PhoneContact[] }> {
  if (!isNative()) return { status: 'unavailable', contacts: [] };
  try {
    const mod: Plugin = await CONTACTS_LOADER();
    let perm = await mod.Contacts.checkPermissions();
    if (perm?.contacts !== 'granted' && perm?.contacts !== 'limited') perm = await mod.Contacts.requestPermissions();
    if (perm?.contacts !== 'granted' && perm?.contacts !== 'limited') return { status: 'denied', contacts: [] };
    const r = await mod.Contacts.getContacts({ projection: { name: true, phones: true, emails: true, postalAddresses: true } });
    const pick = <T extends { isPrimary?: boolean | null }>(list?: T[]): T | undefined => (list || []).find((x) => x?.isPrimary) || (list || [])[0];
    const contacts: PhoneContact[] = (r?.contacts || []).map((c: any) => {
      const n = c.name || {};
      const name = (n.display || [n.given, n.middle, n.family].filter(Boolean).join(' ') || '').trim();
      const email = (pick(c.emails)?.address || '').trim();
      const phone = (pick(c.phones)?.number || '').trim();
      const a = pick(c.postalAddresses);
      const address = a ? [a.street, a.neighborhood, a.city, a.region, a.postcode, a.country].filter(Boolean).join(', ') : '';
      return { id: String(c.contactId || name), name, email, phone, address };
    }).filter((c: PhoneContact) => c.name || c.email || c.phone);
    contacts.sort((x, y) => x.name.localeCompare(y.name, 'en'));
    return { status: 'granted', contacts };
  } catch {
    return { status: 'unavailable', contacts: [] };
  }
}

/** Network: current status and a listener. Web: navigator.onLine and the online/offline events. */
export async function networkStatus(): Promise<boolean> {
  const mod = await load('network');
  if (mod) { try { const s = await mod.Network.getStatus(); return !!s.connected; } catch { /* fall through */ } }
  return typeof navigator === 'undefined' ? true : navigator.onLine !== false;
}

export async function onNetworkChange(cb: (online: boolean) => void): Promise<() => void> {
  const mod = await load('network');
  if (mod) {
    try {
      const handle = await mod.Network.addListener('networkStatusChange', (s: { connected: boolean }) => cb(!!s.connected));
      return () => { try { handle.remove(); } catch { /* no-op */ } };
    } catch { /* fall through */ }
  }
  if (typeof window === 'undefined') return () => {};
  const on = () => cb(true); const off = () => cb(false);
  window.addEventListener('online', on); window.addEventListener('offline', off);
  return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
}

/* ── Goal 7: local notifications (the test notification) ─────────────── */

/**
 * Local notifications need no Apple push setup and no paid program, which
 * is why the test notification under Account uses them (goal 7). Real push
 * still needs the backend in PUSH_BACKEND_PROPOSAL.md; these wrappers are
 * the same shape it will use. Every one is a no-op on the web.
 */

export type LocalNotice = { id: number; title: string; body: string; at: Date; link: string; type: string };

/** The system prompt. 'granted' | 'denied' | 'unavailable' (the web, or no plugin). */
export async function requestNotificationPermission(): Promise<'granted' | 'denied' | 'unavailable'> {
  const mod = await load('local-notifications');
  if (!mod) return 'unavailable';
  try {
    const r = await mod.LocalNotifications.requestPermissions();
    return r.display === 'granted' ? 'granted' : 'denied';
  } catch { return 'unavailable'; }
}

/**
 * Schedules notifications for a moment each. `link` rides in `extra` so a
 * tap can open the matching screen (onNotificationOpened) the way the
 * notification center's rows do. iOS draws the app icon itself.
 */
export async function scheduleLocalNotifications(list: LocalNotice[]): Promise<boolean> {
  const mod = await load('local-notifications');
  if (!mod) return false;
  try {
    await mod.LocalNotifications.schedule({
      notifications: list.map((n) => ({ id: n.id, title: n.title, body: n.body, schedule: { at: n.at }, extra: { link: n.link, type: n.type }, sound: undefined })),
    });
    return true;
  } catch { return false; }
}

/** A notification tapped from the lock screen or the notification center: hands its link to the caller. Disposer returned. */
export async function onNotificationOpened(cb: (link: string, notice: { title: string; body: string; type: string }) => void): Promise<() => void> {
  const mod = await load('local-notifications');
  if (!mod) return () => {};
  try {
    const handle = await mod.LocalNotifications.addListener('localNotificationActionPerformed', (a: { notification: { title?: string; body?: string; extra?: { link?: string; type?: string } } }) => {
      const n = a?.notification || {};
      cb(n.extra?.link || '/m', { title: n.title || '', body: n.body || '', type: n.extra?.type || 'briefing' });
    });
    return () => { try { handle.remove(); } catch { /* no-op */ } };
  } catch { return () => {}; }
}

/** A notification delivered while the app is open (iOS shows none itself, see capacitor.config.ts): the shell draws its banner. Disposer returned. */
export async function onNotificationReceived(cb: (notice: { title: string; body: string; type: string; link: string }) => void): Promise<() => void> {
  const mod = await load('local-notifications');
  if (!mod) return () => {};
  try {
    const handle = await mod.LocalNotifications.addListener('localNotificationReceived', (n: { title?: string; body?: string; extra?: { link?: string; type?: string } }) => {
      cb({ title: n?.title || '', body: n?.body || '', type: n?.extra?.type || 'briefing', link: n?.extra?.link || '/m' });
    });
    return () => { try { handle.remove(); } catch { /* no-op */ } };
  } catch { return () => {}; }
}
