/**
 * src/lib/universeStyling.js
 *
 * Pure, framework-free resolvers for the per-universe styling system —
 * typography, texture, and motion-enabled state. One implementation used by
 * the published site (MultiPageWeddingWebsite.jsx), the builder preview
 * (StudioWebsite.jsx), and the test harness (tests/persistence/
 * universe-styling.mjs), so builder/publish parity and "no per-universe
 * forked CSS" both come from calling the same functions rather than two
 * hand-maintained copies.
 *
 * No React, no DOM — safe to import from a plain Node test script.
 */

import { UNIVERSE_CONFIGS, TYPOGRAPHY_PAIRINGS, WEBSITE_THEMES, resolveUniverseConfig } from './websiteThemes.js';

/**
 * Resolves the heading/body font pairing + Google Fonts query for a wedding.
 * A universe's own typography takes priority over the generic activeTypography
 * picker (same precedence pattern already used for pageTransition) — falls
 * back to the generic TYPOGRAPHY_PAIRINGS lookup when the universe has none
 * (or no universe is set at all), so non-universe weddings are unaffected.
 *
 * Includes headingWeight/bodyWeight/headingStyle so this drop-in replaces the
 * raw TYPOGRAPHY_PAIRINGS lookup everywhere it was used — page components and
 * WBSectionRenderer read those fields too, not just the two font-family names.
 *
 * @param {object} weddingDetails
 * @returns {{ headingFont: string, bodyFont: string, googleFonts: string, headingWeight: number, bodyWeight: number, headingStyle: string }}
 */
export function resolveTypography(weddingDetails) {
  const universeConfig = resolveUniverseConfig(weddingDetails);
  if (universeConfig?.typography) {
    return { headingWeight: 400, bodyWeight: 400, headingStyle: 'normal', ...universeConfig.typography };
  }
  const fallback = TYPOGRAPHY_PAIRINGS.find(t => t.id === weddingDetails?.activeTypography) || TYPOGRAPHY_PAIRINGS[0];
  return {
    headingFont: fallback.headingFont,
    bodyFont: fallback.bodyFont,
    googleFonts: fallback.googleFonts,
    headingWeight: fallback.headingWeight,
    bodyWeight: fallback.bodyWeight,
    headingStyle: fallback.headingStyle,
  };
}

/**
 * Resolves the colour palette for a wedding's active universe — same
 * precedence pattern as resolveTypography(): a universe's own colours take
 * priority over the legacy activeTheme/WEBSITE_THEMES lookup, falling back
 * to it only when the universe has none (or no universe is set at all), so
 * any pre-universe wedding record is unaffected.
 *
 * @param {object} weddingDetails
 * @returns {{ darkBg: string, lightBg: string, darkText: string, lightText: string, accent: string, accentSecondary: string, navBg: string }}
 */
export function resolveColors(weddingDetails) {
  const universeConfig = resolveUniverseConfig(weddingDetails);
  if (universeConfig?.colors) {
    return universeConfig.colors;
  }
  return WEBSITE_THEMES.find(t => t.id === weddingDetails?.activeTheme) || WEBSITE_THEMES[0];
}

/**
 * Builds the Google Fonts CSS2 stylesheet URL for a resolved typography
 * object, or null if it declares no Google Fonts (a system-font pairing).
 * Always includes display=swap so text is never invisible while loading.
 *
 * @param {{ googleFonts?: string }} typography
 * @returns {string|null}
 */
export function googleFontsHref(typography) {
  if (!typography?.googleFonts) return null;
  return `https://fonts.googleapis.com/css2?family=${typography.googleFonts}&display=swap`;
}

/**
 * Resolves the texture token (id + opacity) for a wedding's active universe,
 * or null if no universe is set / the universe declares no texture.
 *
 * @param {object} weddingDetails
 * @returns {{ type: string, opacity: number }|null}
 */
export function resolveTexture(weddingDetails) {
  const universeConfig = resolveUniverseConfig(weddingDetails);
  return universeConfig?.texture ?? null;
}

/**
 * Resolves the scroll-reveal motion config for a wedding's active universe,
 * or null if none is set (SectionReveal falls back to a sensible default).
 *
 * @param {object} weddingDetails
 * @returns {{ sectionReveal: string, duration: number, yOffset: number, ease: string, intensity: string }|null}
 */
export function resolveMotion(weddingDetails) {
  const universeConfig = resolveUniverseConfig(weddingDetails);
  return universeConfig?.motion ?? null;
}

/**
 * Whether scroll-reveal motion is enabled for this wedding. Builder control:
 * the existing scrollAnimation picker (WBRightPanel.jsx, options none/subtle/
 * dramatic) — 'none' disables the uniform reveal everywhere on the published
 * site; any other value (including unset, which defaults to the picker's own
 * 'subtle' default) enables it. This is the on/off switch the goal asks for,
 * reusing the control that already existed but was previously never read.
 *
 * @param {object} weddingDetails
 * @returns {boolean}
 */
export function isMotionEnabled(weddingDetails) {
  return weddingDetails?.scrollAnimation !== 'none';
}

/** Re-exported for convenience so callers only need one import site. */
export { UNIVERSE_CONFIGS, resolveUniverseConfig };
