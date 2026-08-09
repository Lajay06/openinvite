import React, { useRef, useEffect, useState } from "react";
import PublicNav from "@/components/public/PublicNav";
import PublicFooter from "@/components/public/PublicFooter";
import ScrollProgress from "@/components/motion/ScrollProgress";
import MarketingHero from "@/components/marketing/MarketingHero";
import MarketingEndCap from "@/components/marketing/MarketingEndCap";
import { useMarketingSeo } from "@/hooks/useMarketingSeo";

const EASE = "cubic-bezier(0.16,1,0.3,1)";
const prefersReduced = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const BELIEFS = [
  {
    title: "Design first.",
    body: "Beautiful planning tools shouldn't be a luxury. We obsess over every detail so the experience feels as special as the occasion itself.",
    color: "#E03553",
  },
  {
    title: "Everything connected.",
    body: "Your guest list talks to your seating plan. Your budget talks to your vendors. One platform means zero chaos and total clarity.",
    color: "#DDF762",
  },
  {
    title: "For every couple.",
    body: "Love is love. Openinvite is designed for every kind of couple, every cultural tradition, every size of celebration.",
    color: "#6B2CAE",
  },
];

function useScrollReveal(threshold = 0.2) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(prefersReduced());
  useEffect(() => {
    if (prefersReduced()) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setVisible(true);
        obs.disconnect();
      }
    }, { threshold });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
}

export default function About() {
  useMarketingSeo();

  return (
    <div className="min-h-screen bg-white font-sans" style={{ scrollBehavior: "smooth" }}>
      <PublicNav />
      <ScrollProgress />

      {/* ── S1: HERO ─────────────────────────────────────── */}
      {/* c_crop re-frames the photo rather than nudging imagePosition, because
          at these viewport sizes the CSS lever is nearly dead: the source is
          1600x1065 and object-fit cover already shows y 0-1065 at 390 (zero
          vertical slack) and y 32-1032 at 1440 (32px of slack).

          Two separate faults, both fixed by the crop:
          1. The couple sits left of center-frame — heads span x 520-670, image
             center is x 800 — so a centered crop on a narrow viewport framed
             torsos and hay instead of faces. The crop is centered on x 595.
          2. PublicNav is fixed, 65px tall and 95% opaque, and the hero starts
             at y 0, so it covers the top 65px of the photo. Head clearance is
             an absolute pixel distance, so shortening the delivered image
             raises the cover scale and pushes the heads below the nav. The
             bottom ~40% of the source was empty hay, so this costs nothing.

          Measured head-top screen y (nav occupies 0-65):
            390x844   47 -> 76      1440x900   52 -> 82
            1280x900  49 -> 82      1920x1080  40 -> 98
          h_640 keeps both pairs of feet in frame (lowest foot is y 615). */}
      <MarketingHero
        image="https://res.cloudinary.com/dsr84xknv/image/upload/c_crop,x_0,y_0,w_1190,h_640/f_auto,q_auto/DTS_Tradition_Chris_Abatzis_Photos_ID9181_erzsi2.jpg"
        title="Planning a wedding should feel like the beginning of something incredible."
        maxWidth={900}
        cta={{ label: "Get started", href: "/signup" }}
      />

      {/* ── S2: EDITORIAL INTRO ──────────────────────────── */}
      <EditorialIntro />

      {/* ── S3: FULL BLEED PHOTO ─────────────────────────── */}
      <section id="story" style={{ width: "100%", height: "85vh", minHeight: 600, position: "relative", overflow: "hidden" }}>
        <img src="https://res.cloudinary.com/dsr84xknv/image/upload/f_auto,q_auto/DTS_Young_Latin_Martin_Pisotti_Photos_ID6999_p6ixxt.jpg" alt="A young couple sharing a joyful moment together" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }} />
      </section>

      {/* ── S4: WHAT WE BELIEVE ─────────────────────────── */}
      <TwoColumnSection id="beliefs" number="01" title="What we believe" headline="Simple beliefs. Big impact." background="#F5F5F3" beliefs={BELIEFS} />

      {/* ── S5: PHOTO PAIR ────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
        <img src="https://res.cloudinary.com/dsr84xknv/image/upload/f_auto,q_auto/v1784100478/DTS_LEAP_Shauna_Summers_Photos_ID7601_k27hx3.jpg" alt="A woman leaping joyfully against a blue backdrop" style={{ width: "100%", height: "70vh", objectFit: "cover" }} />
        <img src="https://res.cloudinary.com/dsr84xknv/image/upload/f_auto,q_auto/v1784100474/DTS_Like_a_Movie_Foster___Asher_Photos_ID1041_mudxwa.jpg" alt="A man carrying his partner outdoors, both laughing" style={{ width: "100%", height: "70vh", objectFit: "cover" }} />
      </div>

      {/* ── S6: END CAP ──────────────────────────────────── */}
      <MarketingEndCap
        image="https://res.cloudinary.com/dsr84xknv/image/upload/f_auto,q_auto/DTS_NU_NUPTIALS_Shauna_Summers_Photos_ID10282_hxzktx.jpg"
        alt="A couple on their wedding day"
      />

      <PublicFooter />
    </div>
  );
}

function EditorialIntro() {
  const [ref, visible] = useScrollReveal(0.2);

  return (
    <section ref={ref} style={{ background: "#FFFFFF", padding: "120px 80px", borderBottom: "1px solid #E0E0DC", maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(40px)", transition: "opacity 0.8s ease 0.2s, transform 0.8s ease 0.2s" }}>
        <h2 style={{ fontSize: "clamp(32px, 4vw, 52px)", fontWeight: 700, color: "#0A0A0A", lineHeight: 1.1, marginBottom: 32, hyphens: "none" }}>
          Built for the way people actually plan.
        </h2>
        {/* Owner-supplied copy, used verbatim. This supersedes the two
            paragraphs V5 restored from 2d6a4d9 (M4, #274) — the overlap that
            restoration knowingly accepted is resolved here, because this
            version tells the origin story once rather than twice. */}
        <p style={{ fontSize: 17, color: "#555555", lineHeight: 1.7, marginBottom: 24 }}>
          Openinvite was born from a simple frustration: wedding planning tools were outdated, overwhelming, and, frankly, ugly. We believed one of the most exciting chapters of your life deserved a platform that matched that energy. So we built one.
        </p>
        <p style={{ fontSize: 17, color: "#555555", lineHeight: 1.7, marginBottom: 24 }}>
          Couples were juggling spreadsheets, endless group chats, and disconnected tools that were either too complicated or too limited. We saw an opportunity to create something different, a platform that was as beautiful as it was powerful, bringing planning, invitations, guests, and every detail together in one seamless experience.
        </p>
        <p style={{ fontSize: 17, color: "#555555", lineHeight: 1.7, marginBottom: 0 }}>
          From day one, we made one promise: every feature had to earn its place. Thoughtfully designed, beautifully built, and created to make planning feel less like a chore and more like part of the celebration.
        </p>
      </div>
    </section>
  );
}

function TwoColumnSection({ id, number, title, headline, body, background, beliefs }) {
  const [ref, visible] = useScrollReveal(0.2);

  return (
    <section ref={ref} id={id} style={{ background: background || "#FFFFFF", padding: "120px 80px", maxWidth: 1100, margin: "0 auto", borderBottom: "1px solid #E0E0DC" }}>
      {/* Content */}
      <div style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(40px)", transition: "opacity 0.8s ease 0.2s, transform 0.8s ease 0.2s" }}>
        <h2 style={{ fontSize: "clamp(28px, 3vw, 42px)", fontWeight: 700, color: "#0A0A0A", marginBottom: 32, hyphens: "none" }}>
          {headline}
        </h2>

        {body ? (
          <>
            {body.map((para, i) => (
              <p key={i} style={{ fontSize: 17, color: "#555555", lineHeight: 1.7, marginBottom: 24 }}>
                {para}
              </p>
            ))}
          </>
        ) : null}

        {beliefs ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
            {beliefs.map((belief, i) => (
              <div key={i}>
                <div style={{ width: 3, height: 24, background: belief.color, marginBottom: 16 }} />
                <h3 style={{ fontSize: 18, fontWeight: 600, color: "#0A0A0A", marginBottom: 12 }}>{belief.title}</h3>
                <p style={{ fontSize: 16, color: "#555555", lineHeight: 1.6 }}>{belief.body}</p>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

// The old CTASection ("Ready to start planning?" on flat black) is gone.
// About now closes on the shared MarketingEndCap, the same as Home, Features,
// Ava and Pricing. The side-by-side photo pair above it is unchanged and now
// sits directly on top of the end cap.