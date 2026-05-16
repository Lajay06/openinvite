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
  body: "Collaborate with your partner, planner, or anyone else — in real time, beautifully."
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

  return null;












































































}