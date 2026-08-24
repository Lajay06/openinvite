/**
 * Section 7 — the invitation, below the fold and beautiful.
 *
 * Build note: this is where the design budget goes. The most striking thing on
 * the page and the LEAST sold. No CTA of its own, ever -- the moment this gets
 * a button it becomes the pitch, and the whole positioning ("most couples will
 * only ever use the planner") collapses.
 *
 * "The grandma test" appears twice on this page, here and in section 8. That is
 * the stated ceiling; a third use is drift.
 */
import React from "react";
import { responsivePhoto } from "@/lib/marketingImage";
import { PJS, MUTED_ON_DARK, MEASURE, MEASURE_WIDE, BODY } from "./_shared";

// The most striking frame available: the wedding itself, which is exactly what
// "the part your guests see" means. The print masters were rejected here for
// subject (cocktail glasses on marble say nothing about guests). Also used on
// Tour.jsx, which is a nav-linked page -- a known co-use, accepted because no
// free asset carries this section as well.
const PHOTO = responsivePhoto("DTS_NU_NUPTIALS_Shauna_Summers_Photos_ID10310_o5dcie", 1280);

export default function InvitationSection() {
  return (
    <section style={{ position: "relative", background: "#0A0A0A", overflow: "hidden" }}>
      <img
        src={PHOTO.src}
        srcSet={PHOTO.srcSet}
        sizes="100vw"
        alt="A newly married couple laughing together at their reception"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
      />
      <div
        style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: "linear-gradient(to top, rgba(10,10,10,0.88) 0%, rgba(10,10,10,0.66) 40%, rgba(10,10,10,0.2) 74%, rgba(10,10,10,0.04) 100%)",
        }}
      />
      <div
        style={{
          position: "relative", zIndex: 2,
          maxWidth: MEASURE_WIDE,
          minHeight: "clamp(620px, 88vh, 940px)",
          display: "flex", flexDirection: "column", justifyContent: "flex-end",
          padding: "clamp(96px, 12vw, 180px) clamp(24px, 6vw, 96px) clamp(72px, 9vw, 128px)",
        }}
      >
        <h2
          style={{
            fontFamily: PJS,
            fontSize: "clamp(32px, 4.4vw, 60px)",
            fontWeight: 700,
            letterSpacing: "-0.03em",
            lineHeight: 1.08,
            color: "#FFFFFF",
            margin: "0 0 clamp(28px, 3vw, 40px)",
          }}
        >
          And when you are ready, the part your guests see.
        </h2>

        <p style={{ ...BODY, color: MUTED_ON_DARK, maxWidth: MEASURE, margin: "0 0 24px" }}>
          Most couples who use Openinvite will only ever use the planner. That is what we
          built it for.
        </p>
        <p style={{ ...BODY, color: MUTED_ON_DARK, maxWidth: MEASURE, margin: "0 0 24px" }}>
          But somewhere around month nine, when the guest list has settled and the budget
          has stopped being frightening, there is a good evening to be had making the thing
          that lands in everyone else&rsquo;s hands. A wedding website that looks like you
          chose it, with RSVP that passes the grandma test, song requests, your registry
          linked from wherever it already lives.
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
          It is included. It is not the point. It is very beautiful.
        </p>
      </div>
    </section>
  );
}
