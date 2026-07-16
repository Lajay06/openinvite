/**
 * How It Works — 3-step process, light #FFFFFF
 */
import React, { useRef, useState, useEffect } from "react";

const EASE = "cubic-bezier(0.16,1,0.3,1)";
const prefersReduced = () =>
typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const STEPS = [
{
  num: "01",
  title: "Create your account",
  body: "Sign up in seconds. No credit card required. Just your names, date, and vision."
},
{
  num: "02",
  title: "Set up your wedding",
  body: "Add your guests, set your budget, and let Ava guide you through the essentials."
},
{
  num: "03",
  title: "Plan everything, together",
  body: "Collaborate with your partner, planner, or anyone else, in real time, beautifully."
}];


const GradNum = ({ children }) =>
<span
  style={{
    fontSize: 48,
    fontWeight: 800,
    letterSpacing: "-0.03em",
    lineHeight: 1,
    background: "linear-gradient(135deg, #E03553, #803D81)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
    display: "block",
    marginBottom: 16
  }}>
  
    {children}
  </span>;


export default function HowItWorksSection() {
  const sectionRef = useRef(null);
  const [visible, setVisible] = useState(prefersReduced());

  useEffect(() => {
    if (prefersReduced()) return;
    const obs = new IntersectionObserver(
      ([e]) => {if (e.isIntersecting) {setVisible(true);obs.disconnect();}},
      { threshold: 0.2 }
    );
    if (sectionRef.current) obs.observe(sectionRef.current);
    return () => obs.disconnect();
  }, []);

  return (
    <section ref={sectionRef} style={{ background: "#FFFFFF", padding: "120px clamp(32px, 6vw, 80px)" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.15em", color: "#E03553", marginBottom: 16, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          How it works
        </p>
        <h2 style={{ fontSize: "clamp(32px, 4vw, 52px)", fontWeight: 700, color: "#0A0A0A", letterSpacing: "-0.02em", marginBottom: 64, maxWidth: 600 }}>
          Three steps. That's the whole learning curve.
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 48 }}>
          {STEPS.map((step, i) => (
            <div key={step.num} style={{
              opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(20px)",
              transition: `opacity 0.6s ${EASE} ${i * 0.1}s, transform 0.6s ${EASE} ${i * 0.1}s`,
            }}>
              <GradNum>{step.num}</GradNum>
              <h3 style={{ fontSize: 20, fontWeight: 700, color: "#0A0A0A", marginBottom: 10 }}>{step.title}</h3>
              <p style={{ fontSize: 15, color: "rgba(10,10,10,0.6)", lineHeight: 1.6 }}>{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );








































































}