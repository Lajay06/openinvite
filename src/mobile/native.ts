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
export async function configureStatusBar(): Promise<void> {
  const mod = await load('status-bar');
  if (!mod) return;
  try {
    await mod.StatusBar.setStyle({ style: mod.Style.Light });
    if (platform() === 'android') {
      await mod.StatusBar.setBackgroundColor({ color: '#F5F5F4' });
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
      const handled = onBack();
      if (handled) return;
      if (canGoBack) window.history.back();
      else mod.App.exitApp();
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

/** Runs the native setup once when the shell mounts. No-op on the web. */
export async function bootNative(): Promise<void> {
  if (!isNative()) return;
  await Promise.all([configureStatusBar(), configureKeyboard()]);
  await hideSplash();
}
