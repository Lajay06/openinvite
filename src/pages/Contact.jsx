import React, { useState, useEffect } from "react";
import PublicNav from "@/components/public/PublicNav";
import PublicFooter from "@/components/public/PublicFooter";
import { Instagram, Facebook, ChevronDown } from "lucide-react";
import ApplePillButton from "@/components/motion/ApplePillButton";

const EASE = "cubic-bezier(0.16,1,0.3,1)";
const prefersReduced = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    topic: "",
    message: "",
  });

  const [submitted, setSubmitted] = useState(false);
  const [formPhase, setFormPhase] = useState(prefersReduced() ? 4 : 0);

  useEffect(() => {
    if (prefersReduced()) return;
    const delays = [0, 150, 300, 450];
    const timeouts = delays.map((delay, i) => setTimeout(() => setFormPhase(i + 1), delay));
    return () => timeouts.forEach(clearTimeout);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setFormData({ name: "", email: "", topic: "", message: "" });
      setSubmitted(false);
    }, 3000);
  };

  const topics = ["Guest management", "Budget tracking", "Universes", "Ava", "Pricing", "Something else"];

  const labelStyle = { display: "block", fontSize: 11, fontWeight: 600, color: "rgba(10,10,10,0.6)", letterSpacing: "0.15em", marginBottom: 10 };
  const fieldStyle = {
    width: "100%",
    background: "none",
    border: "none",
    borderBottom: "2px solid #CCCCCC",
    color: "#0A0A0A",
    fontSize: 16,
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    padding: "8px 0",
    outline: "none",
    transition: "border-color 0.2s ease",
  };
  const focusField = (e) => (e.target.style.borderBottomColor = "#E03553");
  const blurField = (e) => (e.target.style.borderBottomColor = "#CCCCCC");

  return (
    <div className="min-h-screen bg-white font-sans">
      <PublicNav />

      {/* No banner — the tagline lives directly above the form so the
          whole page (tagline + form) sits above the fold, zero scrolling
          required to start filling it in. */}
      <div style={{ paddingTop: 64, height: "100vh", boxSizing: "border-box", display: "grid", gridTemplateColumns: "1fr 1fr" }}>
        {/* LEFT: TAGLINE + FORM */}
        <div style={{ padding: "40px clamp(32px, 6vw, 80px)", display: "flex", flexDirection: "column", justifyContent: "center", borderRight: "1px solid #E0E0DC" }}>
          <h1 style={{ fontSize: "clamp(30px, 3.6vw, 42px)", fontWeight: 700, color: "#0A0A0A", lineHeight: 1.15, letterSpacing: "-0.02em", margin: "0 0 32px", maxWidth: 440 }}>
            Let's plan something beautiful.
          </h1>
          {!submitted ? (
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 28, opacity: formPhase >= 1 ? 1 : 0, transform: formPhase >= 1 ? "translateY(0)" : "translateY(20px)", transition: `opacity 0.6s ${EASE}, transform 0.6s ${EASE}` }}>
                <div>
                  <label htmlFor="contact-name" style={labelStyle}>Name</label>
                  <input
                    id="contact-name"
                    type="text"
                    required
                    autoComplete="name"
                    placeholder="Your name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    style={fieldStyle}
                    onFocus={focusField}
                    onBlur={blurField}
                  />
                </div>

                <div>
                  <label htmlFor="contact-email" style={labelStyle}>Email</label>
                  <input
                    id="contact-email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    style={fieldStyle}
                    onFocus={focusField}
                    onBlur={blurField}
                  />
                </div>

                <div>
                  <label htmlFor="contact-topic" style={labelStyle}>Topic</label>
                  <div style={{ position: "relative" }}>
                    <select
                      id="contact-topic"
                      required
                      value={formData.topic}
                      onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                      style={{ ...fieldStyle, appearance: "none", cursor: "pointer", paddingRight: 28 }}
                      onFocus={focusField}
                      onBlur={blurField}
                    >
                      <option value="" disabled>Choose a topic</option>
                      {topics.map((item) => (
                        <option key={item} value={item}>{item}</option>
                      ))}
                    </select>
                    <ChevronDown size={16} strokeWidth={1.75} style={{ position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)", color: "rgba(10,10,10,0.45)", pointerEvents: "none" }} />
                  </div>
                </div>

                <div>
                  <label htmlFor="contact-message" style={labelStyle}>Message</label>
                  <textarea
                    id="contact-message"
                    placeholder="Tell us what's on your mind"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    style={{ ...fieldStyle, minHeight: 100, resize: "vertical" }}
                    onFocus={focusField}
                    onBlur={blurField}
                  />
                </div>

                <div style={{ marginTop: 8 }}>
                  <ApplePillButton light={false} onClick={handleSubmit}>Send message →</ApplePillButton>
                </div>
            </form>
          ) : (
            <div style={{ textAlign: "center", opacity: 1 }}>
              <p style={{ fontSize: 32, fontWeight: 700, color: "#0A0A0A", marginBottom: 16 }}>Wow, so nice of you ✦</p>
              <p style={{ fontSize: 16, color: "rgba(10,10,10,0.6)" }}>We'll be in touch shortly.</p>
            </div>
          )}
        </div>

        {/* RIGHT: FULL-HEIGHT IMAGE — email/social overlaid at the base
            with a scrim, so contact details survive the panel becoming
            a photo instead of a card. */}
        <div
          style={{
            position: "relative",
            overflow: "hidden",
            opacity: formPhase >= 1 ? 1 : 0,
            transform: formPhase >= 1 ? "translateX(0)" : "translateX(80px)",
            transition: `opacity 0.8s ${EASE} 0.1s, transform 0.8s ${EASE} 0.1s`,
          }}
        >
          <img
            src="https://res.cloudinary.com/dsr84xknv/image/upload/f_auto,q_auto/DTS_Weirdly_Ever_After_Agust%C3%ADn_Far%C3%ADas_Photos_ID8960_nspx4l.jpg"
            alt="A couple sharing a warm, unposed moment together"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }}
          />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(10,10,10,0.75) 0%, rgba(10,10,10,0.1) 45%, rgba(10,10,10,0) 70%)" }} />

          <div style={{ position: "relative", zIndex: 2, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "40px clamp(32px, 6vw, 80px)" }}>
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.7)", letterSpacing: "0.15em", marginBottom: 6 }}>Email</p>
              <p style={{ fontSize: 16, color: "#FFFFFF", fontWeight: 500 }}>hello@openinvite.com.au</p>
            </div>

            {/* Social */}
            <div style={{ display: "flex", gap: 16 }}>
              <a href="#" style={{ color: "rgba(255,255,255,0.75)", transition: "color 0.2s ease" }} onMouseEnter={(e) => (e.target.style.color = "#FFFFFF")} onMouseLeave={(e) => (e.target.style.color = "rgba(255,255,255,0.75)")}>
                <Instagram size={20} strokeWidth={1.5} />
              </a>
              <a href="#" style={{ color: "rgba(255,255,255,0.75)", transition: "color 0.2s ease" }} onMouseEnter={(e) => (e.target.style.color = "#FFFFFF")} onMouseLeave={(e) => (e.target.style.color = "rgba(255,255,255,0.75)")}>
                <Facebook size={20} strokeWidth={1.5} />
              </a>
            </div>
          </div>
        </div>
      </div>

      <PublicFooter />
    </div>
  );
}