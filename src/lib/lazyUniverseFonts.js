/**
 * lazyUniverseFonts.js (feat/universes-expansion-10)
 *
 * The Design Studio's banner wall shows every universe at once, each in its
 * own display face — and its world page/entrance moment can open any
 * universe, not just the couple's own active one. Before this file, none of
 * that ever actually loaded a font: UniverseBanner/UniverseWorldView/
 * UniverseEntranceOverlay only ever set `fontFamily` in an inline style, so
 * every universe except whichever one the browser happened to already have
 * loaded (via the couple's real wedding site, MultiPageWeddingWebsite.jsx)
 * silently rendered in a fallback system font. With 10 more universes
 * (several pulling in large families, including two CJK faces) that gap
 * matters a lot more, so this makes loading explicit and lazy instead of
 * leaving it to coincidence.
 *
 * loadUniverseFont(universe) injects a <link rel="stylesheet"> for that
 * universe's typography.googleFonts, exactly once per family set (a
 * module-level cache — re-entering a world or re-scrolling a banner back
 * into view never re-requests it). font-display=swap is already baked into
 * googleFontsHref, so text always renders immediately in its fallback stack
 * and swaps in-place once the real face arrives — never a blocked/invisible
 * paint.
 *
 * CJK faces (Noto Sans KR/SC, used by Seoul/Shanghai) need no special
 * handling here: Google's css2 endpoint itself splits a requested family
 * into many small @font-face blocks, each scoped to a unicode-range, so the
 * browser only ever fetches the glyph ranges actually present in the
 * rendered text — the same mechanism that makes requesting a huge CJK
 * family safe for a Latin-only page in the first place.
 */
import { googleFontsHref } from './universeStyling';

const loadedHrefs = new Set();

export function loadUniverseFont(universe) {
  const href = googleFontsHref(universe?.typography);
  if (!href || loadedHrefs.has(href) || typeof document === 'undefined') return;
  loadedHrefs.add(href);

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}

/**
 * Attaches an IntersectionObserver to `el` that loads `universe`'s font the
 * first time the element enters the viewport, then disconnects — a banner
 * scrolled past thousands of times still only ever triggers one font
 * request. Returns a cleanup function; safe to call with a null/undefined
 * el (no-ops).
 */
export function observeUniverseFont(el, universe) {
  if (!el || typeof IntersectionObserver === 'undefined') {
    loadUniverseFont(universe);
    return () => {};
  }
  const observer = new IntersectionObserver(
    (entries) => {
      if (entries[0]?.isIntersecting) {
        loadUniverseFont(universe);
        observer.disconnect();
      }
    },
    { rootMargin: '200px' }
  );
  observer.observe(el);
  return () => observer.disconnect();
}
