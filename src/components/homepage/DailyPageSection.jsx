/**
 * Section 2 — the daily page, demonstrated.
 *
 * RULED: typeset lines, not a screenshot. The build note allows this fallback
 * ("If a screenshot cannot carry it yet, set the three lines as type"), and a
 * fabricated screenshot was rejected on the ground that a screenshot ASSERTS
 * the product produced it. Nothing here is presented as a captured screen.
 *
 * FOLLOW-UP (after the homepage ships): replace with a STAGED-REAL capture --
 * a purpose-built is_test account, not the standing fixture, populated so the
 * daily page genuinely shows 41 unreplied guests and a florist deposit due
 * Friday, then screenshot the actual rendered page. Real product, real rows,
 * curated data.
 *
 * The three lines are the product's own voice, so they are set as the product
 * sets them: one statement per line, the third line carrying the weight.
 */
import React from "react";
import { PJS, INK, MUTED_ON_LIGHT, RULE_ON_LIGHT, SECTION_PAD, MEASURE_WIDE, H2 } from "./_shared";

const LINES = [
  "Forty one guests have not replied.",
  "The florist deposit is due Friday.",
  "Nothing else needs you today.",
];

export default function DailyPageSection({ id }) {
  return (
    <section id={id} style={{ background: "#FFFFFF", padding: SECTION_PAD }}>
      <div style={{ maxWidth: MEASURE_WIDE }}>
        <h2 style={{ ...H2, color: INK, marginBottom: "clamp(40px, 5vw, 72px)" }}>
          This is the whole idea.
        </h2>

        <div style={{ borderTop: `1px solid ${RULE_ON_LIGHT}` }}>
          {LINES.map((line, i) => (
            <p
              key={line}
              style={{
                fontFamily: PJS,
                fontSize: "clamp(22px, 3vw, 40px)",
                fontWeight: i === LINES.length - 1 ? 700 : 400,
                letterSpacing: "-0.02em",
                lineHeight: 1.3,
                color: INK,
                margin: 0,
                padding: "clamp(20px, 2.4vw, 30px) 0",
                borderBottom: `1px solid ${RULE_ON_LIGHT}`,
              }}
            >
              {line}
            </p>
          ))}
        </div>

        <p
          style={{
            fontFamily: PJS,
            fontSize: "clamp(15px, 1.25vw, 18px)",
            lineHeight: 1.65,
            color: MUTED_ON_LIGHT,
            margin: "clamp(28px, 3vw, 40px) 0 0",
          }}
        >
          That last line is the one people tell us about.
        </p>
      </div>
    </section>
  );
}
