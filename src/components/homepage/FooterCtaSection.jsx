/**
 * Section 9 — footer CTA.
 *
 * Build note: a SINGLE CTA. No newsletter capture competing with it, no second
 * button. The page-level notes are explicit that nothing may compete here, so
 * anything added below this line is a regression against the brief.
 */
import React from "react";
import { PJS, MUTED_ON_DARK, SECTION_PAD, MEASURE, MEASURE_WIDE, H2 } from "./_shared";

export default function FooterCtaSection({ onStart }) {
  return (
    <section style={{ background: "#0A0A0A", padding: SECTION_PAD }}>
      <div style={{ maxWidth: MEASURE_WIDE }}>
        <h2 style={{ ...H2, color: "#FFFFFF", marginBottom: "clamp(20px, 2.2vw, 30px)" }}>
          Start with tomorrow morning.
        </h2>
        <p
          style={{
            fontFamily: PJS,
            fontSize: "clamp(17px, 1.5vw, 21px)",
            lineHeight: 1.55,
            color: MUTED_ON_DARK,
            maxWidth: MEASURE,
            margin: "0 0 clamp(28px, 3vw, 40px)",
          }}
        >
          Open Openinvite, tell it your date, and see what it says you need to do next.
          One payment, US$49, 24 months of access.
        </p>
        <button onClick={onStart} className="btn-primary" style={{ padding: "14px 34px", fontSize: 14 }}>
          Start planning
        </button>
      </div>
    </section>
  );
}
