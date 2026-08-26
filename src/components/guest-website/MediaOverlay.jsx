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
  // DEFAULT 14, MEASURED ON ALL TWENTY LAYOUTS AGAINST THE FINISHED HERO.
  //
  // Every hero centres the couple's names, so 50% lands ON their own
  // typography. The arrangements differ in where their text starts: measured
  // at 390, from 396px (marrakech, the tightest) to 692px (brooklyn).
  //
  // These numbers were taken AFTER the date/RSVP strip left the hero, and that
  // removal moved everything — each hero re-centred and its text dropped by
  // roughly 140px, which changed WHICH layout is tightest (it was amalfi at
  // 254px before). An earlier default chosen against the old hero would have
  // been tuned to a layout that is no longer the constraint.
  //
  // AND IT HOLDS ACROSS THE SIZE DIAL, not just at its starting value: the
  // couple can turn that control, and a default verified only at its own
  // default is not verified. Measured at 30/60/90% width — minimum clearance
  // 187/152/117px, zero collisions on all twenty at every size.
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
