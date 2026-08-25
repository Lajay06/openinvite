/**
 * src/lib/surfaceTint.js
 *
 * Solid form surfaces drawn from the couple's universe palette.
 *
 * F-D. Every input, select, textarea, pill and event card on the RSVP was
 * either hard-coded #FFFFFF — a white box pasted onto a universe that may be
 * warm bone, deep plum or espresso — or an alpha-suffixed accent
 * (`${theme.accent}1A`), which is genuinely translucent: the universe's
 * texture overlay shows through the control and it reads as cheap.
 *
 * Both are replaced by SOLID colors mixed from the palette itself. Mixing
 * rather than adding alpha is the whole point: an alpha fill composites over
 * whatever happens to be behind it — texture, photograph, gradient — so its
 * final color is unknowable and its contrast unprovable. A mixed color is
 * one flat value we can measure, and tests/persistence/rsvp-surfaces.mjs
 * measures it against all twenty palettes.
 *
 * No new palette entries: a universe is defined by its own colors, and this
 * derives from them rather than inventing a surface token per universe.
 */

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

/** @returns {{r:number,g:number,b:number}|null} */
export function toRgb(hex) {
  if (typeof hex !== 'string' || !HEX.test(hex.trim())) return null;
  let h = hex.trim().slice(1);
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
}

const toHex = ({ r, g, b }) =>
  '#' + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');

/**
 * Mix two hex colors into a SOLID hex. Returns `base` unchanged if either
 * input is not a hex color, so a palette that ever carries a non-hex value
 * degrades to the existing look rather than rendering `#NaNNaNNaN`.
 */
export function mixHex(base, overlay, amount) {
  const a = toRgb(base), b = toRgb(overlay);
  if (!a || !b) return base;
  const t = Math.max(0, Math.min(1, amount));
  return toHex({ r: a.r + (b.r - a.r) * t, g: a.g + (b.g - a.g) * t, b: a.b + (b.b - a.b) * t });
}

/** WCAG 2.1 relative luminance. */
export function luminance(hex) {
  const c = toRgb(hex);
  if (!c) return null;
  const f = (v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
}

/** WCAG contrast ratio between two solid colors, or null if either is not hex. */
export function contrastRatio(fg, bg) {
  const a = luminance(fg), b = luminance(bg);
  if (a === null || b === null) return null;
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * The palette's form surfaces. `lightBg` is the page ground the RSVP sits on;
 * a control has to separate from it without becoming a white rectangle, so it
 * is nudged toward the palette's own text color by a few percent.
 */
export function formSurfaces(theme = {}) {
  const ground = theme.lightBg || '#FFFFFF';
  const ink = theme.lightText || '#0A0A0A';
  const accent = theme.accent || ink;
  return {
    /** inputs, selects, textareas, event cards, unselected pills */
    surface: mixHex(ground, ink, 0.05),
    /** the selected state of a choice control */
    surfaceSelected: mixHex(ground, accent, 0.16),
    /** hairline that reads on the surface without becoming a box outline */
    border: mixHex(ground, ink, 0.22),
    /** border of a selected control */
    borderSelected: accent,
  };
}

/**
 * The accent, darkened just enough to be readable as TEXT on the page ground.
 *
 * P2c. `theme.accent` is a decorative hue chosen for the universe, and on 15
 * of the 20 palettes it fails 4.5:1 against that universe's own `lightBg` —
 * london 2.27, shanghai 2.13, amalfi 2.15. It is used for section labels and
 * small meta text throughout the guest pages, so those were failing on most
 * weddings.
 *
 * This walks the accent toward the palette's own text color in 5% steps until
 * it clears the floor, and returns it UNCHANGED where it already passes (kyoto,
 * paris, aspen, mykonos, edinburgh). The hue is preserved — it is the same
 * accent, darkened — rather than substituting a neutral, so the label still
 * reads as the universe's color.
 *
 * Non-text accent use (icons, rules, fills) is unaffected: WCAG 1.4.11 asks
 * 3:1 of those, and they are not this function's business.
 */
export function accentText(theme = {}) {
  const accent = theme.accent, ground = theme.lightBg, ink = theme.lightText;
  if (!toRgb(accent) || !toRgb(ground) || !toRgb(ink)) return accent;
  let out = accent;
  for (let t = 0; t <= 1.0001; t += 0.05) {
    out = mixHex(accent, ink, t);
    if (contrastRatio(out, ground) >= 4.5) return out;
  }
  return ink;                                   // last resort: the text color
}

/**
 * A filled chip in the accent hue, deep enough for the palette's light text to
 * be readable on it — returns `{ background, color }`.
 *
 * Choosing a FOREGROUND is not sufficient: on 9 of the 20 palettes the accent
 * is mid-tone and NEITHER of the palette's text colors clears 4.5:1 against
 * it (amalfi bottoms out at 3.26). Hard-coded `#FFF` was worse still — 2.67:1
 * on london.
 *
 * So the FILL moves instead. The accent is deepened toward black in 5% steps
 * until the light text passes, which keeps the chip unmistakably the
 * universe's color rather than swapping it for a neutral. Accents that
 * already pass are returned untouched.
 */
export function accentChip(theme = {}) {
  const accent = theme.accent;
  const light = theme.darkText || '#FFFFFF';
  if (!toRgb(accent)) return { background: accent, color: light };
  let bg = accent;
  for (let t = 0; t <= 1.0001; t += 0.05) {
    bg = mixHex(accent, '#000000', t);
    if ((contrastRatio(light, bg) ?? 0) >= 4.5) break;
  }
  return { background: bg, color: light };
}
