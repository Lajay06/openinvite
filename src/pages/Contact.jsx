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

      {/* BANNER — full-width image, no text overlaid on it. The heading
          used to sit on top of the image behind a near-opaque white wash
          (rgba(245,245,243,0.88)), which mostly hid the photo anyway. Now
          the banner is just the photo, and the heading is normal page
          content underneath it. */}
      <section style={{ width: "100%", height: "clamp(280px, 40vh, 480px)", overflow: "hidden" }}>
        <img
          src="https://res.cloudinary.com/dsr84xknv/image/upload/f_auto,q_auto/DTS_BY_WATER_Daniel_Farò_Photos_ID7930_auruje.jpg"
          alt="A couple laughing together"
          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", display: "block" }}
        />
      </section>

      <section style={{ padding: "64px clamp(32px, 6vw, 80px) 0", textAlign: "center", borderBottom: "1px solid #E0E0DC", paddingBottom: 64 }}>
        <h1 style={{ fontSize: 48, fontWeight: 700, color: "#0A0A0A", lineHeight: 1.1, hyphens: "none", maxWidth: 600, margin: "0 auto" }}>
          Let's plan something beautiful.
        </h1>
      </section>


      <div style={{ minHeight: "100vh", display: "grid", gridTemplateColumns: "1fr 1fr" }}>
        {/* LEFT: FORM */}
        <div style={{ padding: "80px clamp(32px, 6vw, 80px)", display: "flex", flexDirection: "column", justifyContent: "center", borderRight: "1px solid #E0E0DC" }}>
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

        {/* RIGHT: INFO */}
        <div
          style={{
            background: "#F5F5F3",
            padding: "80px clamp(32px, 6vw, 80px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            opacity: formPhase >= 1 ? 1 : 0,
            transform: formPhase >= 1 ? "translateX(0)" : "translateX(80px)",
            transition: `opacity 0.8s ${EASE} 0.1s, transform 0.8s ${EASE} 0.1s`,
          }}
        >
          <div style={{ maxWidth: 400 }}>
            <img src="https://static.wixstatic.com/media/d2df22_ed803ca7c6de491a90af0df6d06a8e54~mv2.png" alt="openinvite" style={{ height: 32, marginBottom: 24 }} />
            <div style={{ borderBottom: "1px solid #E0E0DC", marginBottom: 32 }} />

            <div style={{ marginBottom: 24 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: "rgba(10,10,10,0.6)", letterSpacing: "0.15em", marginBottom: 6 }}>Email</p>
              <p style={{ fontSize: 16, color: "#0A0A0A", fontWeight: 500 }}>hello@openinvite.com.au</p>
            </div>

            <div style={{ borderBottom: "1px solid #E0E0DC", marginBottom: 32 }} />

            {/* Social */}
            <div style={{ display: "flex", gap: 16 }}>
              <a href="#" style={{ color: "rgba(10,10,10,0.45)", transition: "color 0.2s ease" }} onMouseEnter={(e) => (e.target.style.color = "#E03553")} onMouseLeave={(e) => (e.target.style.color = "rgba(10,10,10,0.45)")}>
                <Instagram size={20} strokeWidth={1.5} />
              </a>
              <a href="#" style={{ color: "rgba(10,10,10,0.45)", transition: "color 0.2s ease" }} onMouseEnter={(e) => (e.target.style.color = "#E03553")} onMouseLeave={(e) => (e.target.style.color = "rgba(10,10,10,0.45)")}>
                <Facebook size={20} strokeWidth={1.5} />
              </a>
            </div>
          </div>

          {/* Background decoration */}
          <div style={{ position: "absolute", bottom: 40, right: 40, fontSize: 200, color: "#EEEEEE", lineHeight: 1, zIndex: 0 }}>✦</div>
        </div>
      </div>

      <PublicFooter />
    </div>
  );
}