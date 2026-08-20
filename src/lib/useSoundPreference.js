/**
 * useSoundPreference — the guest's unmute choice, for the length of their visit.
 *
 * The bug this fixes: HeroBackground held `unmuted` in local useState, so a
 * guest who unmuted the hero landed muted again on every other page of a
 * multi-page guest site. They had to unmute once per page.
 *
 * sessionStorage, deliberately, not localStorage: the preference should last
 * the visit and then end. A guest who unmuted in March must not return in
 * May to a page that starts making noise at them.
 *
 * Keyed per wedding slug so two couples' sites never share a preference.
 * The key is derived from the path rather than threaded through props,
 * because HeroBackground is rendered from eleven call sites and none of
 * them currently pass a slug.
 *
 * Read lazily inside the state initialiser: the marketing prerender runs
 * this module in Node, where `window` does not exist. A top-level read
 * would break the build, not just this feature.
 */
import { useState, useCallback } from 'react';

const KEY_PREFIX = 'oi_sound_';

export function storageKey(pathname) {
  const path = pathname
    ?? (typeof window === 'undefined' ? null : window.location.pathname);
  if (path == null) return `${KEY_PREFIX}preview`;
  const match = path.match(/^\/w\/([^/]+)/);
  return `${KEY_PREFIX}${match ? match[1] : 'preview'}`;
}

export function useSoundPreference() {
  const [soundOn, setSoundOnState] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      // Safari private mode throws on sessionStorage access rather than
      // returning null, so this is a try/catch and not a null check.
      return window.sessionStorage.getItem(storageKey()) === '1';
    } catch {
      return false;
    }
  });

  const setSoundOn = useCallback((next) => {
    setSoundOnState((prev) => {
      const value = typeof next === 'function' ? next(prev) : next;
      try {
        window.sessionStorage.setItem(storageKey(), value ? '1' : '0');
      } catch {
        // Storage unavailable: the preference still works for this page,
        // it just does not survive navigation. Better than throwing.
      }
      return value;
    });
  }, []);

  return [soundOn, setSoundOn];
}

/**
 * iOS silences a gesture-unmuted video when the hardware ring/silent switch
 * is on, and no JS can detect that switch. The guest hears nothing, sees an
 * unmute button that claims to be on, and concludes the site is broken.
 * Naming it in the label is the cheapest prevention available.
 */
export function isIOS() {
  if (typeof navigator === 'undefined') return false;
  return /iP(hone|ad|od)/.test(navigator.userAgent)
    // iPadOS 13+ reports as a Mac; the touch points give it away.
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}
