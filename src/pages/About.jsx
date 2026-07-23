import React, { useRef, useEffect, useState } from "react";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import PublicNav from "@/components/public/PublicNav";
import PublicFooter from "@/components/public/PublicFooter";
import ScrollProgress from "@/components/motion/ScrollProgress";
import ApplePillButton from "@/components/motion/ApplePillButton";
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
  "Photo & memory management",
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

function CountUp({ target, display }) {
  const [ref, visible] = useScrollReveal(0.3);
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!visible || target === null || prefersReduced()) return;
    const duration = 1400;
    const start = Date.now();
    const tick = () => {
      const p = Math.min(1, (Date.now() - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setCount(Math.round(eased * target));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [visible, target]);

  const formatted =
    target === null
      ? display
      : display.startsWith("$")
      ? `$${count.toLocaleString()}`
      : display.endsWith("+")
      ? `${count.toLocaleString()}+`
      : count.toLocaleString();

  return <span ref={ref}>{visible || prefersReduced() ? formatted : "0"}</span>;
}

export default function About() {
  useMarketingSeo();
  const handleCTA = () => {
    base44.auth.redirectToLogin(window.location.origin + createPageUrl("Dashboard"));
  };

  return (
    <div className="min-h-screen bg-white font-sans" style={{ scrollBehavior: "smooth" }}>
      <PublicNav />
      <ScrollProgress />

      {/* ── S1: HERO ─────────────────────────────────────── */}
<section
  style={{
    background: "#F5F5F3",
    padding: "120px 80px",
    borderBottom: "1px solid #E0E0DC",
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
  }}
>
  <div
    style={{
      maxWidth: 800,
      width: "100%",
      textAlign: "center",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: "20px",
      padding: "0 24px",
      boxSizing: "border-box"
    }}
  >
    <h1
      style={{
        fontSize: "clamp(36px, 5vw, 64px)",
        fontWeight: 700,
        letterSpacing: "-0.02em",
        lineHeight: 1.1,
        color: "#0A0A0A",
        margin: 0,
        maxWidth: "100%",
        overflowWrap: "break-word"
      }}
    >
      Planning a wedding should feel like the beginning of something incredible.
    </h1>

    <p
      style={{
        fontSize: 16,
        fontWeight: 400,
        color: "#555555",
        maxWidth: 560,
        margin: 0,
        lineHeight: 1.7
      }}
    >
      We built Openinvite because modern couples deserve a planning experience
      that matches the occasion.
    </p>
  </div>
</section>

      {/* ── S2: EDITORIAL INTRO ──────────────────────────── */}
      <EditorialIntro />

      {/* ── S3: OFFSET PHOTO PAIR ────────────────────────── */}
      <section id="story" style={{ width: "100vw", height: "85vh", minHeight: 600, position: "relative", overflow: "hidden" }}>
        <img src="https://res.cloudinary.com/dsr84xknv/image/upload/f_auto,q_auto/DTS_Young_Latin_Martin_Pisotti_Photos_ID6999_p6ixxt.jpg" alt="A young couple sharing a joyful moment together" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }} />
        <img src="https://res.cloudinary.com/dsr84xknv/image/upload/f_auto,q_auto/DTS_Grand_Design_Daniel_Far%C3%B2_Photos_ID4152_auimyj.jpg" alt="An elegantly designed wedding venue" style={{
          position: "absolute", right: "clamp(24px, 6vw, 80px)", bottom: "clamp(24px, 6vw, 80px)",
          width: "clamp(220px, 28vw, 380px)", height: "clamp(280px, 36vh, 460px)",
          objectFit: "cover", border: "6px solid #FFFFFF",
        }} />
        <p style={{ position: "absolute", bottom: 40, left: 40, fontSize: 12, color: "rgba(255,255,255,0.85)", fontStyle: "italic", maxWidth: 320, textShadow: "0 1px 4px rgba(0,0,0,0.4)" }}>
          Built for every kind of love, every kind of celebration.
        </p>
      </section>

      {/* ── S4: OUR STORY ──────────────────────────────── */}
      <TwoColumnSection id="story" number="01" title="Our story" headline="Built for the way people actually plan." body={["Openinvite was born from a real problem. Couples were drowning in spreadsheets, group chats, and tools that were either too complex or too basic. We saw an opportunity to build something that was genuinely beautiful and genuinely powerful: a platform that respected your time and matched the energy of the occasion.", "From day one, we made a commitment: no feature would ship unless it was designed as carefully as it was engineered. Every screen, every interaction, every detail had to earn its place. The result is a platform that feels as considered as the weddings it helps plan."]} />

      {/* ── S5: PHOTO PAIR ────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
        <img src="https://res.cloudinary.com/dsr84xknv/image/upload/f_auto,q_auto/v1784100478/DTS_LEAP_Shauna_Summers_Photos_ID7601_k27hx3.jpg" alt="A woman leaping joyfully against a blue backdrop" style={{ width: "100%", height: "70vh", objectFit: "cover" }} />
        <img src="https://res.cloudinary.com/dsr84xknv/image/upload/f_auto,q_auto/v1784100474/DTS_Like_a_Movie_Foster___Asher_Photos_ID1041_mudxwa.jpg" alt="A man carrying his partner outdoors, both laughing" style={{ width: "100%", height: "70vh", objectFit: "cover" }} />
      </div>

      {/* ── S6: WHAT WE BELIEVE ─────────────────────────── */}
      <TwoColumnSection id="beliefs" number="02" title="What we believe" headline="Simple beliefs. Big impact." background="#F5F5F3" beliefs={BELIEFS} />

      {/* ── S7: FULL BLEED PHOTO ─────────────────────────── */}
      <section style={{ width: "100vw", height: "90vh", minHeight: 600, position: "relative", overflow: "hidden" }}>
        <img src="https://res.cloudinary.com/dsr84xknv/image/upload/f_auto,q_auto/v1784100482/DTS_la_calma_Parole_Dure_Photos_ID5853_haflhv.jpg" alt="An aerial view of a turquoise cove" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </section>

      {/* ── S8: THE NUMBERS ──────────────────────────────── */}
      <StatsSection />

      {/* ── S9: CTA ──────────────────────────────────────── */}
      <CTASection onCTA={handleCTA} />

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
          Wedding planning, reimagined for the way modern couples actually live.
        </h2>
        <p style={{ fontSize: 17, color: "#555555", lineHeight: 1.7, marginBottom: 32 }}>
          Openinvite was built out of a simple frustration: wedding planning tools were outdated, overwhelming, and frankly ugly. We believed that one of the most exciting moments of your life deserved a platform that matched that energy. So we built one.
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

function StatsSection() {
  const [ref, visible] = useScrollReveal(0.2);
  const stats = [
    { display: "10,000+", label: "Couples planning", num: 10000 },
    { display: "40", label: "Planning tools", num: 40 },
    { display: "$79", label: "One-time forever", num: 79 },
    { display: "∞", label: "Memories made", num: null },
  ];

  return (
    <section ref={ref} style={{ background: "#0A0A0A", padding: "80px clamp(32px, 6vw, 80px)", color: "#FFFFFF", opacity: visible ? 1 : 0, transition: "opacity 0.8s ease" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0, borderTop: "1px solid #222", borderLeft: "1px solid #222" }}>
        {stats.map((stat, i) => (
          <div key={i} style={{ padding: "40px", borderRight: "1px solid #222", borderBottom: "1px solid #222" }}>
            <div style={{ fontSize: 72, fontWeight: 700, lineHeight: 1, marginBottom: 12, letterSpacing: "-0.02em" }}>
              <CountUp target={stat.num} display={stat.display} />
            </div>
            <p style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.5)", letterSpacing: "0.15em" }}>{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function CTASection({ onCTA }) {
  const [ref, visible] = useScrollReveal(0.2);

  return (
    <section ref={ref} id="cta" style={{ background: "#0A0A0A", padding: "160px clamp(32px, 6vw, 80px)", opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(32px)", transition: "opacity 0.8s ease, transform 0.8s ease" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", textAlign: "center" }}>
        <h2 style={{ fontSize: "clamp(40px, 6vw, 80px)", fontWeight: 700, color: "#FFFFFF", marginBottom: 16, hyphens: "none" }}>
          Ready to start planning?
        </h2>
        <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
          <ApplePillButton onClick={onCTA}>Start for free +</ApplePillButton>
          <Link to="/Pricing" style={{ textDecoration: "none" }}>
            <ApplePillButton>See pricing +</ApplePillButton>
          </Link>
        </div>
      </div>
    </section>
  );
}