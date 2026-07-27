/**
 * FeatureSectionHeading — the gradient accent line + <h2> pair every
 * feature section on Features.jsx uses above its heading text. Previously
 * hand-rolled per section, which let it silently drift missing on some
 * sections (FeatureTimeline/FeatureGuests/FeatureBudget) while present on
 * others (QuickStartSection/DashboardSection/SeatingSection/BudgetSection).
 * Routing every section through this one component means the line can't
 * be forgotten again — it's structurally part of the heading, not a
 * separate element a future edit can drop.
 */
import React from "react";

const FeatureSectionHeading = React.forwardRef(function FeatureSectionHeading(
  { children, color = "#0A0A0A", style, lineStyle },
  ref
) {
  return (
    <>
      <div
        style={{
          width: 40,
          height: 2,
          background: "linear-gradient(90deg,#E03553,#803D81)",
          marginBottom: 24,
          ...lineStyle,
        }}
      />
      <h2
        ref={ref}
        style={{
          fontSize: "clamp(32px, 4vw, 56px)",
          fontWeight: 700,
          letterSpacing: "-0.02em",
          lineHeight: 1.1,
          color,
          marginBottom: 24,
          overflow: "visible",
          whiteSpace: "normal",
          wordBreak: "normal",
          hyphens: "none",
          fontFamily: "'Plus Jakarta Sans',sans-serif",
          ...style,
        }}
      >
        {children}
      </h2>
    </>
  );
});

export default FeatureSectionHeading;
