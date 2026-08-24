/**
 * Section 4 — the anti-generic promise.
 *
 * Build note: the last line is a REAL commitment. "Do not ship it unless there
 * is somewhere for that feedback to land." It lands on /contact, which is a
 * live marketing route with a working form, so the sentence is honest. If that
 * route ever goes away, this line has to go with it.
 */
import React from "react";
import { PJS, MUTED_ON_DARK, SECTION_PAD, MEASURE, MEASURE_WIDE, H2, BODY } from "./_shared";

export default function AntiGenericSection() {
  return (
    <section style={{ background: "#0A0A0A", padding: SECTION_PAD }}>
      <div style={{ maxWidth: MEASURE_WIDE }}>
        <h2 style={{ ...H2, color: "#FFFFFF", marginBottom: "clamp(32px, 3.6vw, 52px)" }}>
          Advice about your wedding, not the average one.
        </h2>

        <p style={{ ...BODY, color: MUTED_ON_DARK, maxWidth: MEASURE, margin: "0 0 24px" }}>
          Every planning tool ships a checklist. Most of them are written for a wedding
          nobody is actually having, which is why couples say the dates are off and the
          suggestions are noise.
        </p>
        <p style={{ ...BODY, color: MUTED_ON_DARK, maxWidth: MEASURE, margin: "0 0 24px" }}>
          Openinvite reads your real wedding. Your date. Your guest count. Your
          outstanding vendors. Your budget as it actually stands this week.
        </p>
        <p
          style={{
            fontFamily: PJS,
            fontSize: "clamp(17px, 1.5vw, 21px)",
            fontWeight: 600,
            lineHeight: 1.55,
            letterSpacing: "-0.01em",
            color: "#FFFFFF",
            maxWidth: MEASURE,
            margin: 0,
          }}
        >
          If it ever tells you something that is not true for you, that is a bug, and
          we want to hear about it.
        </p>
      </div>
    </section>
  );
}
