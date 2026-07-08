import React, { useState, useEffect } from "react";
import PublicNav from "@/components/public/PublicNav";
import PublicFooter from "@/components/public/PublicFooter";
import { Instagram, Facebook } from "lucide-react";
import ApplePillButton from "@/components/motion/ApplePillButton";

const EASE = "cubic-bezier(0.16,1,0.3,1)";
const prefersReduced = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    guests: "",
    date: "",
    email: "",
    phone: "",
    interests: [],
    message: "",
  });

  const [submitted, setSubmitted] = useState(false);
  const [formPhase, setFormPhase] = useState(prefersReduced() ? 6 : 0);

  useEffect(() => {
    if (prefersReduced()) return;
    const delays = [0, 150, 300, 450, 600, 750];
    const timeouts = delays.map((delay, i) => setTimeout(() => setFormPhase(i + 1), delay));
    return () => timeouts.forEach(clearTimeout);
  }, []);

  const handleCheckbox = (item) => {
    setFormData((p) => ({
      ...p,
      interests: p.interests.includes(item) ? p.interests.filter((i) => i !== item) : [...p.interests, item],
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setFormData({ name: "", guests: "", date: "", email: "", phone: "", interests: [], message: "" });
      setSubmitted(false);
    }, 3000);
  };

  const interests = ["Guest Management", "Budget Tracking", "Digital Invitations", "Seating Planner", "AI Assistant", "Pricing"];

  const formLines = [
    { text: "Hi, my name is ", input: "name", inputText: "(your name)" },
    { text: "and I'm planning a wedding for ", input: "guests", inputText: "(guest count)" },
    { text: " guests on ", input: "date", inputText: "(date)", type: "date" },
    { text: ". You can reach me at ", input: "email", inputText: "(email)", type: "email" },
    { text: " or call me on ", input: "phone", inputText: "(phone)", optional: true },
    { text: ". I'd love to know more about:" },
  ];

  return (
    <div className="min-h-screen bg-white font-sans">
      <PublicNav />

      {/* BANNER */}
      <section style={{ position: "relative", overflow: "hidden", padding: "80px clamp(32px, 6vw, 80px)", textAlign: "center", borderBottom: "1px solid #E0E0DC" }}>
        <img src="https://static.wixstatic.com/media/d2df22_5f864fb8dc374942930cb254fc220681~mv2.jpg" alt="Contact banner" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }} />
        <div style={{ position: "absolute", inset: 0, background: "rgba(245,245,243,0.88)" }} />
        <p style={{ fontSize: 11, fontWeight: 600, color: "#E03553", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 16, position: "relative", zIndex: 2 }}>Get in touch</p>
        <h1 style={{ fontSize: 48, fontWeight: 700, color: "#0A0A0A", lineHeight: 1.1, hyphens: "none", maxWidth: 600, margin: "0 auto", position: "relative", zIndex: 2 }}>
          Let's plan something beautiful.
        </h1>
      </section>


      <div style={{ minHeight: "100vh", display: "grid", gridTemplateColumns: "1fr 1fr" }}>
        {/* LEFT: FORM */}
        <div style={{ padding: "80px clamp(32px, 6vw, 80px)", display: "flex", flexDirection: "column", justifyContent: "center", borderRight: "1px solid #E0E0DC" }}>
          {!submitted ? (
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 24, opacity: formPhase >= 1 ? 1 : 0, transform: formPhase >= 1 ? "translateY(0)" : "translateY(20px)", transition: `opacity 0.6s ${EASE}, transform 0.6s ${EASE}` }}>
                {formLines.map((line, i) => (
                  <div
                    key={i}
                    style={{
                      opacity: formPhase > i ? 1 : 0,
                      transform: formPhase > i ? "translateY(0)" : "translateY(20px)",
                      transition: `opacity 0.6s ${EASE} ${i * 0.08}s, transform 0.6s ${EASE} ${i * 0.08}s`,
                    }}
                  >
                    {i < 5 ? (
                      <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ color: "#0A0A0A", fontSize: 20, fontWeight: 400 }}>{line.text}</span>
                        <input
                          type={line.type || "text"}
                          required={!line.optional}
                          placeholder={line.inputText}
                          value={formData[line.input]}
                          onChange={(e) => setFormData({ ...formData, [line.input]: e.target.value })}
                          style={{
                            background: "none",
                            border: "none",
                            borderBottom: "2px solid #CCCCCC",
                            color: "#0A0A0A",
                            fontSize: 20,
                            fontFamily: "'Plus Jakarta Sans', sans-serif",
                            padding: "4px 8px",
                            outline: "none",
                            minWidth: 120,
                            transition: "border-color 0.2s ease",
                          }}
                          onFocus={(e) => (e.target.style.borderBottomColor = "#E03553")}
                          onBlur={(e) => (e.target.style.borderBottomColor = "#CCCCCC")}
                        />
                        <span style={{ color: "#0A0A0A", fontSize: 20 }}>{line.inputText.includes("date") ? "" : line.inputText.includes("guest") ? " guests" : line.inputText.includes("phone") ? "." : ""}</span>
                      </div>
                    ) : (
                      <p style={{ color: "#0A0A0A", fontSize: 20, marginBottom: 16 }}>{line.text}</p>
                    )}
                  </div>
                ))}

                {/* Checkboxes */}
                <div style={{ opacity: formPhase >= 6 ? 1 : 0, transform: formPhase >= 6 ? "translateY(0)" : "translateY(20px)", transition: `opacity 0.6s ${EASE} 0.4s, transform 0.6s ${EASE} 0.4s`, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 24 }}>
                  {interests.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => handleCheckbox(item)}
                      style={{
                        padding: "10px 16px",
                        border: `1px solid ${formData.interests.includes(item) ? "#E03553" : "#CCCCCC"}`,
                        borderRadius: "100px",
                        background: formData.interests.includes(item) ? "linear-gradient(135deg, #E03553 0%, #803D81 100%)" : "transparent",
                        color: formData.interests.includes(item) ? "#FFFFFF" : "#0A0A0A",
                        fontSize: 12,
                        fontWeight: 500,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        transform: formData.interests.includes(item) ? "scale(1.05)" : "scale(1)",
                      }}
                    >
                      {item}
                    </button>
                  ))}
                </div>

                {/* Textarea */}
                <div style={{ opacity: formPhase >= 6 ? 1 : 0, transform: formPhase >= 6 ? "translateY(0)" : "translateY(20px)", transition: `opacity 0.6s ${EASE} 0.45s, transform 0.6s ${EASE} 0.45s` }}>
                  <p style={{ color: "#0A0A0A", fontSize: 20, marginBottom: 12 }}>Anything else I should know?</p>
                  <textarea
                    placeholder="(optional)"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    style={{
                      width: "100%",
                      background: "none",
                      border: "none",
                      borderBottom: "2px solid #CCCCCC",
                      color: "#0A0A0A",
                      fontSize: 16,
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      padding: "12px 8px",
                      outline: "none",
                      minHeight: 60,
                      resize: "none",
                      transition: "border-color 0.2s ease",
                    }}
                    onFocus={(e) => (e.target.style.borderBottomColor = "#E03553")}
                    onBlur={(e) => (e.target.style.borderBottomColor = "#CCCCCC")}
                  />
                </div>

                {/* Submit button */}
                <div style={{
                  marginTop: 24,
                  opacity: formPhase >= 6 ? 1 : 0,
                  transform: formPhase >= 6 ? "translateY(0)" : "translateY(20px)",
                  transition: `opacity 0.6s ${EASE} 0.5s, transform 0.6s ${EASE} 0.5s`,
                }}>
                  <ApplePillButton light={false} onClick={handleSubmit}>Send it →</ApplePillButton>
                </div>
            </form>
          ) : (
            <div style={{ textAlign: "center", opacity: 1 }}>
              <p style={{ fontSize: 32, fontWeight: 700, color: "#0A0A0A", marginBottom: 16 }}>Wow, so nice of you ✦</p>
              <p style={{ fontSize: 16, color: "#888888" }}>We'll be in touch shortly.</p>
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

            {[
              { label: "EMAIL", value: "hello@openinvite.com.au" },
              { label: "SUPPORT", value: "customercare@openinvite.com.au" },
              { label: "RESPONSE TIME", value: "Within 24 hours" },
            ].map((item, i) => (
              <div key={i} style={{ marginBottom: 24 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: "#888888", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 6 }}>{item.label}</p>
                <p style={{ fontSize: 16, color: "#0A0A0A", fontWeight: 500 }}>{item.value}</p>
              </div>
            ))}

            <div style={{ borderBottom: "1px solid #E0E0DC", marginBottom: 32 }} />

            {/* Social */}
            <div style={{ display: "flex", gap: 16 }}>
              <a href="#" style={{ color: "#AAAAAA", transition: "color 0.2s ease" }} onMouseEnter={(e) => (e.target.style.color = "#E03553")} onMouseLeave={(e) => (e.target.style.color = "#AAAAAA")}>
                <Instagram size={20} strokeWidth={1.5} />
              </a>
              <a href="#" style={{ color: "#AAAAAA", transition: "color 0.2s ease" }} onMouseEnter={(e) => (e.target.style.color = "#E03553")} onMouseLeave={(e) => (e.target.style.color = "#AAAAAA")}>
                <Facebook size={20} strokeWidth={1.5} />
              </a>
            </div>
          </div>

          {/* Background decoration */}
          <div style={{ position: "absolute", bottom: 40, right: 40, fontSize: 200, color: "#EEEEEE", lineHeight: 1, zIndex: 0 }}>✦</div>
        </div>
      </div>
    </div>
  );
}