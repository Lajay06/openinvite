/**
 * Section 6 — pricing, where the window lives.
 *
 * Build note: no comparison table here; the full table belongs on the pricing
 * page. This section's job is the number, the window, and the completeness
 * claim.
 *
 * OWNER RULING, SUBSUME. The tier line reads "Everything in Pro, plus the guest
 * website and the full set of designs." A code audit found Ultra actually gates
 * THREE things today, not two: the guest website (StudioGuestSuite), the
 * designs (UniverseStudio), and custom guest meal options on the RSVP form
 * (FoodBeverage). Custom meal options are SUBSUMED by the guest-website gate --
 * no Pro user can reach an RSVP form to customize in the first place -- so the
 * line stands as written. The meal gate is named explicitly in the pricing
 * page's full Ultra column instead, where the detail belongs.
 *
 * "The full set of designs" is checkable: UNIVERSE_CONFIGS in
 * src/lib/websiteThemes.js holds 20 designs, 12 tagged tier: 'ultra'. Pro gets
 * 8 of 20; Ultra gets all 20.
 */
import React from "react";
import { PJS, INK, MUTED_ON_LIGHT, PRIMARY, RULE_ON_LIGHT, SECTION_PAD, MEASURE, MEASURE_WIDE, H2, BODY } from "./_shared";

function Tier({ name, price, lines }) {
  return (
    <div style={{ padding: "clamp(20px, 2.4vw, 28px) 0", borderBottom: `1px solid ${RULE_ON_LIGHT}` }}>
      <p
        style={{
          fontFamily: PJS,
          fontSize: "clamp(20px, 2.2vw, 30px)",
          fontWeight: 700,
          letterSpacing: "-0.02em",
          lineHeight: 1.3,
          color: INK,
          margin: "0 0 6px",
        }}
      >
        {name}, {price}
      </p>
      <p style={{ ...BODY, color: MUTED_ON_LIGHT, margin: 0 }}>{lines}</p>
    </div>
  );
}

export default function PricingSection() {
  return (
    <section style={{ background: "#FAF8F7", padding: SECTION_PAD }}>
      <div style={{ maxWidth: MEASURE_WIDE }}>
        <h2 style={{ ...H2, color: INK, marginBottom: "clamp(32px, 3.6vw, 52px)" }}>
          One price. Everything. Nothing else to buy.
        </h2>

        <div style={{ maxWidth: MEASURE, borderTop: `1px solid ${RULE_ON_LIGHT}`, marginBottom: "clamp(28px, 3vw, 40px)" }}>
          <Tier
            name="Pro"
            price="US$49"
            lines="One payment. 24 months of access, which is longer than almost any engagement."
          />
          <Tier
            name="Ultra"
            price="US$99"
            lines="One payment. 24 months of access. Everything in Pro, plus the guest website and the full set of designs."
          />
        </div>

        <p style={{ ...BODY, color: MUTED_ON_LIGHT, maxWidth: MEASURE, margin: "0 0 clamp(28px, 3vw, 40px)" }}>
          No subscription for a project with an end date. No premium seating chart. No
          texting upgrade. No charge to publish. Both prices are printed above, which
          should not be remarkable, and somehow is.
        </p>

        <div style={{ maxWidth: MEASURE, marginBottom: "clamp(28px, 3vw, 40px)" }}>
          <p
            style={{
              fontFamily: PJS,
              fontSize: "clamp(17px, 1.5vw, 21px)",
              fontWeight: 700,
              letterSpacing: "-0.01em",
              lineHeight: 1.5,
              color: INK,
              margin: "0 0 10px",
            }}
          >
            What happens after 24 months?
          </p>
          <p style={{ ...BODY, color: MUTED_ON_LIGHT, margin: 0 }}>
            Your wedding is over, and everything is still yours. Looking at it stays free,
            there is no archive fee, and you can export all of it whenever you want,
            including after the window closes. We built a planner for a project with an
            end date and priced it like one.
          </p>
        </div>

        <a
          href="/pricing"
          style={{
            fontFamily: PJS, fontSize: 15, fontWeight: 600, color: PRIMARY,
            textDecoration: "none", borderBottom: `1px solid ${PRIMARY}`, paddingBottom: 2,
          }}
        >
          See the full pricing page
        </a>
      </div>
    </section>
  );
}
