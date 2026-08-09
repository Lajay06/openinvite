/**
 * MarketingPhotoPair — two full-bleed photos side by side, no gutter.
 *
 * Extracted from the inline block About has used since it shipped, so a second
 * page can take the same treatment without a copy of it. The markup is
 * deliberately IDENTICAL to About's original inline version (grid, 1fr 1fr,
 * gap 0, each image 100% x 70vh, object-fit cover) — About's rendered output
 * is unchanged by the extraction, asserted against the prerendered HTML rather
 * than assumed.
 *
 * Known, inherited: `1fr 1fr` has no breakpoint, so at 390 this renders two
 * ~195x630 slivers. That is how About has always behaved and it is reproduced
 * here on purpose, because changing it would change About. It is worth fixing
 * for both pages in its own change, not smuggled into an extraction.
 */
import React from "react";

export default function MarketingPhotoPair({ left, right, height = "70vh" }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
      <img src={left.src} alt={left.alt} style={{ width: "100%", height, objectFit: "cover" }} />
      <img src={right.src} alt={right.alt} style={{ width: "100%", height, objectFit: "cover" }} />
    </div>
  );
}
