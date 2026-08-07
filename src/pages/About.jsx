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

const DELIVERABLES = [
  "Guest management suite",
  "Smart budget tracker",
  "Digital invitations",
  "Seating planner",
  "Collaborative playlists",
  "Registry integration",
  "AI assistant (Ava)",
  "Vendor management",
  "Timeline & schedule builder",
  "RSVP tracking",
  "Collaboration access",
];

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
      <MarketingHero
        image="https://res.cloudinary.com/dsr84xknv/image/upload/f_auto,q_auto/DTS_Tradition_Chris_Abatzis_Photos_ID9181_erzsi2.jpg"
        title="Planning a wedding should feel like the beginning of something incredible."
        maxWidth={900}
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
        <p style={{ fontSize: 17, color: "#555555", lineHeight: 1.7, marginBottom: 24 }}>
          Openinvite was built out of a simple frustration: wedding planning tools were outdated, overwhelming, and frankly ugly. We believed that one of the most exciting moments of your life deserved a platform that matched that energy. So we built one.
        </p>

        {/* The two paragraphs below are restored verbatim from the version
            2d6a4d9 (M4, #274) removed. M4 had folded About's two back-to-back
            origin-story blocks into this one and dropped this body as
            duplicative; the overlap with the paragraph above is a known and
            accepted tradeoff. */}
        <p style={{ fontSize: 17, color: "#555555", lineHeight: 1.7, marginBottom: 24 }}>
          Openinvite was born from a real problem. Couples were drowning in spreadsheets, group chats, and tools that were either too complex or too basic. We saw an opportunity to build something that was genuinely beautiful and genuinely powerful: a platform that respected your time and matched the energy of the occasion.
        </p>
        <p style={{ fontSize: 17, color: "#555555", lineHeight: 1.7, marginBottom: 32 }}>
          From day one, we made a commitment: no feature would ship unless it was designed as carefully as it was engineered. Every screen, every interaction, every detail had to earn its place. The result is a platform that feels as considered as the weddings it helps plan.
        </p>

        <div>
          {DELIVERABLES.map((item, i) => (
            <div key={i} style={{ padding: "10px 0", borderBottom: "1px solid #E8E8E8", fontSize: 14, color: "#0A0A0A", opacity: visible ? 1 : 0, animation: visible ? `fadeIn 0.6s ease ${i * 0.05}s forwards` : "none" }}>
              {item}
            </div>
          ))}
        </div>
      </div>

      <style>{`@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>
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