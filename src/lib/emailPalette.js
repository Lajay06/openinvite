/**
 * src/lib/emailPalette.js
 *
 * THE FOUR WAYS AN EMAIL CAN WEAR ITS UNIVERSE — and the one reason there are
 * only four.
 *
 * Owner rejection of the first attempt, 2026-09-07: the email editor offered
 * four COLOUR BUTTONS. A color button lets a couple leave their universe,
 * which is the one thing a universe exists to prevent — and it made the
 * editor a paint program rather than a design control. What a couple actually
 * wants to say is "lighter", "darker", "the other way round"; each of those is
 * a rearrangement of colors the universe ALREADY owns.
 *
 * So a variant never introduces a color. It picks which of the universe's own
 * four (`bgTint` / `cardBg` / `textColor` + the dark half) plays page, card and
 * ink. Every universe therefore has all four variants, none can be ugly in a
 * way the universe itself is not, and a new universe gets them for free.
 *
 * ── WHY THE MUTED INKS ARE MIXED, NOT rgba ──────────────────────────────────
 *
 * The template used to write `rgba(0,0,0,0.55)` for its secondary lines. That
 * is black at 55% — invisible on a dark card, which is exactly what `dark` and
 * `inverted` produce. Mixing the ink toward its OWN ground instead gives a
 * solid hex that is legible on every variant, and it is what makes the dark
 * halves usable at all rather than decorative.
 *
 * Pure JS, no DOM — imported from api/ (Node) as well as src/ (browser), the
 * same constraint emailTemplate.js works under.
 */
import { mixHex, readableOn, contrastRatio } from './surfaceTint.js';

/** The four, in the order the panel lists them. `default` is what has always shipped. */
export const PALETTE_VARIANTS = [
  { id: 'default', label: 'Universe' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
  { id: 'inverted', label: 'Inverted' },
];

export const PALETTE_VARIANT_IDS = PALETTE_VARIANTS.map((v) => v.id);

/** Solid fill or a hairline outline. Nothing else — a button has one job. */
export const BUTTON_STYLES = [
  { id: 'solid', label: 'Solid' },
  { id: 'outline', label: 'Outline' },
];

export const BUTTON_STYLE_IDS = BUTTON_STYLES.map((b) => b.id);

/**
 * The universe's colors, arranged for one variant.
 *
 * @param {object} style   a getUniverseEmailStyle() result
 * @param {string} variant one of PALETTE_VARIANT_IDS; anything else is `default`
 * @returns {{pageBg:string, cardBg:string, ink:string, inkMuted:string, inkFaint:string,
 *           accent:string, hairline:string, onAccent:string, isDarkCard:boolean}}
 */
export function emailPalette(style, variant) {
  const s = style || {};
  const tint = s.bgTint || '#FAFAFA';
  const paper = s.cardBg || '#FFFFFF';
  const ink = s.textColor || '#1A1A1A';
  const accent = s.accent || '#0A0A0A';
  // The dark half. Every universe declares both halves, so this is a lookup
  // rather than a computation — a darkened tint would be our color, not
  // theirs.
  const darkGround = s.darkBg || ink;
  const darkInk = s.darkText || paper;

  let pageBg, cardBg, cardInk, borderless = false;
  switch (variant) {
    case 'light':
      // The paper version: no tint and NO CARD EDGE, so the email reads as one
      // continuous sheet with the photograph at the top of it.
      //
      // The edge is not decoration here, it is what makes `light` a different
      // email from `default`. Six universes declare `#FFFFFF` as their own
      // light ground (mykonos and monaco among them), so on those the two
      // variants would otherwise be the same picture twice — a choice the
      // panel offered and could not deliver.
      pageBg = paper; cardBg = paper; cardInk = ink; borderless = true; break;
    case 'dark':
      // The universe's dark half throughout.
      pageBg = darkGround; cardBg = darkGround; cardInk = darkInk; break;
    case 'inverted':
      // A dark card floating on the universe's own tint — the two halves at
      // once, which is the arrangement most universes look best in.
      pageBg = tint; cardBg = darkGround; cardInk = darkInk; break;
    default:
      pageBg = tint; cardBg = paper; cardInk = ink; break;
  }

  const isDarkCard = variant === 'dark' || variant === 'inverted';
  // THE ACCENT IS LIFTED ONLY WHERE THE VARIANT PUT IT SOMEWHERE NEW.
  //
  // On `default` and `light` the card is the ground this universe's accent was
  // chosen against, and the accent is passed through untouched — a wedding
  // that never opens the Emails section must render byte-identically to what
  // it sends today, and quietly restyling every already-sent invitation is not
  // this ruling's business. (Several universes' accents are below 3:1 on white
  // for the kicker line. That is true on main as well; it is a ticket, not a
  // side effect of this work.)
  //
  // On `dark` and `inverted` the accent has been moved onto a ground nobody
  // chose it against, so there it is lifted until it separates.
  const finalAccent = isDarkCard ? readableAccentOn(accent, cardBg, cardInk) : accent;

  return {
    pageBg,
    cardBg,
    ink: cardInk,
    // Secondary and tertiary lines, mixed toward the card they sit on — and
    // never past the point where they stop being readable.
    inkMuted: readableMix(cardInk, cardBg, 0.32),
    inkFaint: readableMix(cardInk, cardBg, 0.62),
    hairline: borderless ? cardBg : mixHex(cardInk, cardBg, 0.88),
    accent: finalAccent,
    // FROM THE BUTTON THE EMAIL ACTUALLY PAINTS, not from the palette's raw
    // accent. When the lift above moves the accent, a label chosen against the
    // old value can land below the threshold on the new one — which it did,
    // at 4.4:1, on london.
    onAccent: readableOn(finalAccent, { darkBg: s.darkBg, lightBg: s.bgTint, darkText: s.darkText, lightText: s.textColor }),
    isDarkCard,
  };
}

/**
 * A MUTED INK THAT IS STILL AN INK.
 *
 * `mixHex(ink, ground, 0.32)` is the right look on a palette with a strong
 * ink, and it is illegible on one without. Amalfi's is #1B5E6B — a teal that
 * clears 4.5:1 on white by a small margin, and lightening it by a third put
 * the secondary lines at 3.9:1. Every one of those lines is text a guest has
 * to read: the venue, the time, the unsubscribe.
 *
 * So the mix is an INTENTION rather than an instruction. It backs off toward
 * the full ink until the result clears AA, and a palette whose ink barely
 * clears it simply gets secondary lines that look like its primary ones —
 * which is the correct outcome, not a compromise.
 */
function readableMix(ink, ground, amount) {
  for (let a = amount; a > 0; a -= 0.08) {
    const mixed = mixHex(ink, ground, a);
    if ((contrastRatio(mixed, ground) || 0) >= 4.5) return mixed;
  }
  return ink;
}

/**
 * THE ACCENT HAS TO SURVIVE THE VARIANT IT LANDS ON.
 *
 * London's accent is #C4956A on cream — fine. On London's own dark half it is
 * still fine. Paris's accent is #1A1816, near-black: legible on white and
 * invisible on Paris's #1A1A2E dark ground, where the kicker and the divider
 * would simply disappear. Rather than drop the accent (which would cost the
 * universe its signal color) it is lifted toward the ink of the card until it
 * separates — the same color, made visible, on the two variants that need it.
 */
function readableAccentOn(accent, cardBg, cardInk) {
  const ratio = contrastRatio(accent, cardBg);
  if (ratio === null || ratio >= 3) return accent;
  for (const amount of [0.35, 0.55, 0.75, 1]) {
    const lifted = mixHex(accent, cardInk, amount);
    if ((contrastRatio(lifted, cardBg) || 0) >= 3) return lifted;
  }
  return cardInk;
}

/** The variant id, normalized — anything unrecognized is the universe's own. */
export function normalizeVariant(v) {
  return PALETTE_VARIANT_IDS.includes(v) ? v : 'default';
}

/** The button style id, normalized. */
export function normalizeButtonStyle(v) {
  return BUTTON_STYLE_IDS.includes(v) ? v : 'solid';
}
