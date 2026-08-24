/**
 * Section 3 — what is actually in it.
 *
 * Build notes: the module names are ONE line, not six cards with icons. Cards
 * would make it a feature list; the paragraph underneath is the actual
 * argument. Ava is "Ava", never "she", in anything user-facing. Ava is in Pro
 * by owner decision, so no tier caveat appears here.
 */
import React from "react";
import { PJS, INK, MUTED_ON_LIGHT, SECTION_PAD, MEASURE, MEASURE_WIDE, H2, BODY } from "./_shared";

export default function WhatsInItSection() {
  return (
    <section style={{ background: "#FAF8F7", padding: SECTION_PAD }}>
      <div style={{ maxWidth: MEASURE_WIDE }}>
        <h2 style={{ ...H2, color: INK, marginBottom: "clamp(32px, 3.6vw, 52px)" }}>
          Everything in one place, which is the only reason the daily page can be right.
        </h2>

        {/* One line. Not a grid, not cards. */}
        <p
          style={{
            fontFamily: PJS,
            fontSize: "clamp(19px, 2.1vw, 28px)",
            fontWeight: 600,
            letterSpacing: "-0.015em",
            lineHeight: 1.45,
            color: INK,
            margin: "0 0 clamp(32px, 3.6vw, 52px)",
          }}
        >
          Guest list. Budget. Seating. Vendors. Schedule. To-dos.
        </p>

        <p style={{ ...BODY, color: MUTED_ON_LIGHT, maxWidth: MEASURE, margin: "0 0 24px" }}>
          They are not six tools that happen to share a login. They are one system,
          which is why Openinvite can tell you that the florist deposit matters this
          week and the seating chart does not.
        </p>
        <p style={{ ...BODY, color: MUTED_ON_LIGHT, maxWidth: MEASURE, margin: 0 }}>
          Ava, your assistant, knows your date, your guest count and which vendors you
          have not heard back from. Ask Ava anything. The answers are about your wedding,
          not about weddings.
        </p>
      </div>
    </section>
  );
}
