import React from 'react';

/**
 * The couple's monogram (or any mark they choose) over their hero photo or video.
 *
 * THIS IS THE COUPLE'S ARTWORK ON THEIR OWN SURFACE, not a caption and not a
 * text layer we style. Our typography opinions do not apply to it, and neither
 * does the 4.5:1 text floor — that rule governs text, and this is a graphic
 * element they have chosen for a surface that is theirs. Same surface-based
 * reasoning as the artwork exemption.
 *
 * THE SCRIM IS A DIAL THEY TURN, NOT A VALUE WE DERIVE. It defaults to OFF.
 * If a couple wants their monogram hard against a bright photo with no scrim,
 * that is a choice we render, not a mistake we correct. There is deliberately
 * no automatic contrast rescue on this surface.
 *
 * POSITION IS A PERCENTAGE OF THE CONTAINER, NEVER OF THE IMAGE — and that is
 * what makes it survive a re-crop. The hero renders its media with `cover` and
 * a centred anchor, so as the viewport narrows the CONTAINER stays fully
 * visible while the photo crops in from its edges. An overlay placed against
 * the container is therefore always on screen at every width. What cannot
 * survive a re-crop is anchoring a mark to a FEATURE of the photograph: the
 * visible region changes, so the feature moves out from under it. Drift is
 * smallest at the centre, where `cover` keeps the same pixels, and grows
 * toward the edges.
 */
export default function MediaOverlay({ overlay }) {
  const url = overlay?.url;
  if (!url) return null;

  const scale = Number.isFinite(overlay.scale) ? overlay.scale : 30;   // % of container width
  const x = Number.isFinite(overlay.x) ? overlay.x : 50;               // % of container
  // DEFAULT 14, AND THE NUMBER WAS MEASURED ON ALL TWENTY, NOT ONE.
  // Every hero layout centres the couple's names, so 50% lands ON their own
  // typography. But the arrangements differ a lot in WHERE their text starts:
  // measured at 390, the first hero text sits between 254px (amalfi-citrus,
  // the tightest) and 552px (brooklyn-offgrid, the roomiest).
  // 18% cleared all twenty — by 11px on amalfi. 14% clears by 45px, with no
  // clipping at the top, so it is the same idea with four times the margin.
  // It also raises how large a couple can scale the mark before it reaches
  // text on the tightest layout: about 49% of the width at 18%, about 76% at 14%.
  const y = Number.isFinite(overlay.y) ? overlay.y : 14;
  const scrim = Number.isFinite(overlay.scrim) ? overlay.scrim : 0;    // 0 = off, the default

  return (
    <>
      {scrim > 0 && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: `rgba(0,0,0,${Math.min(Math.max(scrim, 0), 100) / 100})`,
          }}
        />
      )}
      <img
        src={url}
        // DECORATIVE. It is the couple's mark over their own photograph, and it
        // carries no information a guest needs read aloud. An invented alt
        // ("monogram") would be our words describing their artwork.
        alt=""
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: `${x}%`,
          top: `${y}%`,
          transform: 'translate(-50%, -50%)',
          width: `${scale}%`,
          maxWidth: '100%',
          height: 'auto',
          pointerEvents: 'none',
          objectFit: 'contain',
        }}
      />
    </>
  );
}
