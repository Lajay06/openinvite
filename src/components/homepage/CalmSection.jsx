/**
 * Section 5 — calm, and why it stays calm.
 *
 * Build note: state it once, calmly. This section must never become a lecture
 * and must never run longer than what is written here.
 *
 * The broker quotation is quoted verbatim and attributed as the industry's own
 * words, which is the whole point of including it: we are not characterising
 * them, we are repeating them.
 */
import React from "react";
import { PJS, INK, MUTED_ON_LIGHT, PRIMARY, RULE_ON_LIGHT, SECTION_PAD, MEASURE, MEASURE_WIDE, H2, BODY } from "./_shared";

export default function CalmSection() {
  return (
    <section style={{ background: "#FFFFFF", padding: SECTION_PAD }}>
      <div style={{ maxWidth: MEASURE_WIDE }}>
        <h2 style={{ ...H2, color: INK, marginBottom: "clamp(32px, 3.6vw, 52px)" }}>
          Nothing in here is trying to sell you anything.
        </h2>

        <p style={{ ...BODY, color: MUTED_ON_LIGHT, maxWidth: MEASURE, margin: "0 0 24px" }}>
          No vendor ads. No sponsored suggestions. No shop of ours quietly winning every
          recommendation. Nobody pays us to appear in front of you, because you already
          paid us, once, and that is the entire business model.
        </p>
        <p style={{ ...BODY, color: MUTED_ON_LIGHT, maxWidth: MEASURE, margin: "0 0 24px" }}>
          Your guest list is yours. We will never sell it, rent it, or hand it to vendors.
          Your guests never make an account: they tap a link and reply. And your wedding
          site is not a public page: we ask every crawler, including the AI ones, to stay
          out, and we tell them twice. We ask for as little as we can, we protect what we
          hold, and if you leave you take everything with you.
        </p>

        <blockquote
          style={{
            margin: "clamp(32px, 3.6vw, 48px) 0",
            padding: "0 0 0 clamp(20px, 2.4vw, 32px)",
            borderLeft: `2px solid ${RULE_ON_LIGHT}`,
            maxWidth: MEASURE,
          }}
        >
          <p style={{ ...BODY, color: MUTED_ON_LIGHT, margin: 0 }}>
            There is a whole industry that buys and sells the contact details of engaged
            couples. One list broker names its sources as, in its own words, &ldquo;bridal
            &amp; wedding websites, wedding surveys, bridal magazine subscriptions,
            honeymoon travel information requests, engagement registries, wedding planning
            resource sites.&rdquo;
          </p>
        </blockquote>

        <p
          style={{
            fontFamily: PJS,
            fontSize: "clamp(17px, 1.5vw, 21px)",
            fontWeight: 600,
            lineHeight: 1.55,
            letterSpacing: "-0.01em",
            color: INK,
            maxWidth: MEASURE,
            margin: "0 0 clamp(28px, 3vw, 40px)",
          }}
        >
          That is why people make a second email address before they start planning.
          You should not have to.
        </p>

        {/* TODO: point this at the TRUST PAGE once it clears solicitor review.
            The trust page is the eventual home for "exactly what we collect";
            the privacy policy is the honest stand-in until it exists, because
            it is the document that actually answers the question today. */}
        <a
          href="/privacy-policy"
          style={{
            fontFamily: PJS, fontSize: 15, fontWeight: 600, color: PRIMARY,
            textDecoration: "none", borderBottom: `1px solid ${PRIMARY}`, paddingBottom: 2,
          }}
        >
          Read exactly what we collect
        </a>
      </div>
    </section>
  );
}
