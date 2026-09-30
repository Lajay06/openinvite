import React from 'react';
import { Link } from 'react-router-dom';

/**
 * ONE LOCKUP, TWO GROUNDS.
 *
 * The header and the footer were drawing different logos. The header used the
 * whole of /openinvite-logo.png, whose wordmark is baked in white for a dark
 * bar. The footer could not: white text on a white footer is invisible, and
 * filter:brightness(0) makes it readable by flattening the mark's gradient
 * with it. So the footer cropped the asset to the mark and set "Openinvite"
 * beside it as real text, centred on the mark.
 *
 * THE ASSET DOES NOT CENTRE ITS WORDMARK, and that is the whole of the
 * reported difference. Measured by scanning the PNG's own pixels:
 *
 *   asset      1434 x 331
 *   mark       x 0..283   y 0..281    centre y 140.5
 *   wordmark   x 328..1433 y 117..330 centre y 223.5
 *   gap        44px
 *   offset     83px lower, which is 29.4% of the mark's height
 *
 * The footer's offset was 0. That is why one wordmark sat lower than the
 * other, and it was not a rendering accident: it is what the artwork does.
 *
 * THE HEADER'S LOCKUP IS THE ONE KEPT, per the owner's ruling, and no new
 * artwork is drawn. On a dark ground this component renders the asset itself,
 * pixel for pixel as the header always did. On a light ground it rebuilds the
 * same lockup from the same file: the mark cropped out of it, and the wordmark
 * as text placed at the asset's own 29.4% offset rather than centred. Both
 * grounds now agree, because both are measured from one source.
 *
 * `size` is the MARK's rendered height, so a caller asks for the logo at a
 * height and everything else follows from the asset's proportions.
 *
 * IT LIVES IN components/public/ AND NOT IN components/shared/, which is not
 * filing but a rule. The design-system sweep bars letter-spacing anywhere in
 * the dashboard with an empty allowlist, and components/shared/ is inside that
 * scope while components/public/ is outside it. Putting a wordmark with
 * -0.02em tracking in shared/ broke that sweep the moment it was written. The
 * marketing nav and the marketing footer are the only callers, so this is
 * where it belongs; a dashboard that ever wants the logo needs its own
 * decision about tracking, not a quiet exemption.
 */

/** Measured from public/openinvite-logo.png by pixel scan, 2026-09-30. */
export const ASSET = {
  width: 1434,
  height: 331,
  mark: { x0: 0, x1: 283, y0: 0, y1: 281 },
  word: { x0: 328, x1: 1433, y0: 117, y1: 330 },
};
const MARK_W = ASSET.mark.x1 - ASSET.mark.x0 + 1;   // 284
const MARK_H = ASSET.mark.y1 - ASSET.mark.y0 + 1;   // 282
const GAP = ASSET.word.x0 - ASSET.mark.x1 - 1;      // 44
const WORD_H = ASSET.word.y1 - ASSET.word.y0 + 1;   // 214
/** How far the wordmark's centre sits below the mark's, as a fraction of the mark. */
export const WORD_OFFSET_RATIO =
  (((ASSET.word.y0 + ASSET.word.y1) / 2) - ((ASSET.mark.y0 + ASSET.mark.y1) / 2)) / MARK_H;

/**
 * THE FONT SIZE IS DERIVED, NOT CHOSEN. The wordmark's ink in the asset is
 * 214 units tall against a 282-unit mark. "Openinvite" in Plus Jakarta Sans
 * Bold spans roughly 0.95em from its ascender to its descender, so the size
 * that matches the artwork is that ink height divided by 0.95.
 */
const ASCENDER_TO_DESCENDER = 0.95;

export default function OpeninviteLogo({ size = 20, ground = 'dark', to = '/', ariaLabel = 'openinvite' }) {
  const scale = size / MARK_H;
  const markW = Math.round(MARK_W * scale);
  const gap = Math.round(GAP * scale);
  const fontSize = Math.round((WORD_H * scale) / ASCENDER_TO_DESCENDER);
  const drop = Math.round(size * WORD_OFFSET_RATIO);

  const inner = ground === 'dark' ? (
    // The asset itself, whole, exactly as the header has always drawn it.
    <img
      src="/openinvite-logo.png"
      alt={ariaLabel}
      data-logo-lockup="asset"
      style={{ height: Math.round(ASSET.height * scale), width: 'auto', display: 'block' }}
    />
  ) : (
    <span
      data-logo-lockup="rebuilt"
      style={{ display: 'inline-flex', alignItems: 'flex-start', gap }}
      aria-label={ariaLabel}
    >
      <span
        data-logo-part="mark"
        aria-hidden="true"
        style={{
          width: markW,
          height: size,
          flexShrink: 0,
          backgroundImage: 'url(/openinvite-logo.png)',
          backgroundSize: `${Math.round(ASSET.width * scale)}px ${Math.round(ASSET.height * scale)}px`,
          backgroundPosition: '0 0',
          backgroundRepeat: 'no-repeat',
        }}
      />
      <span
        data-logo-part="wordmark"
        style={{
          // The asset's own offset, not a centring. This is the line that makes
          // the two lockups the same lockup.
          marginTop: drop,
          fontSize,
          lineHeight: 1,
          fontWeight: 700,
          letterSpacing: '-0.02em',
          color: '#0A0A0A',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          whiteSpace: 'nowrap',
        }}
      >
        Openinvite
      </span>
    </span>
  );

  if (!to) return <span data-logo>{inner}</span>;
  return (
    <Link to={to} data-logo style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>
      {inner}
    </Link>
  );
}
