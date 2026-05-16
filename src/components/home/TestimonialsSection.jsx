/**
 * Testimonials — dark #0A0A0A, 3 cards
 */
import React, { useRef, useState, useEffect } from "react";

const EASE = "cubic-bezier(0.16,1,0.3,1)";
const prefersReduced = () =>
typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const TESTIMONIALS = [
{
  quote: "We planned our entire wedding in Openinvite. The guest management alone saved us hours every week.",
  name: "Sarah & James",
  detail: "Sydney, NSW · 180 guests"
},
{
  quote: "Ava suggested things we hadn't even thought of. It's like having a wedding planner in your pocket.",
  name: "Maya & Priya",
  detail: "Melbourne, VIC · 220 guests"
},
{
  quote: "The $199 price is genuinely unbelievable for what you get. We expected to pay 10x that.",
  name: "Tom & Oliver",
  detail: "Brisbane, QLD · 95 guests"
}];


export default function TestimonialsSection() {
  const sectionRef = useRef(null);
  const [visible, setVisible] = useState(prefersReduced());

  useEffect(() => {
    if (prefersReduced()) return;
    const obs = new IntersectionObserver(
      ([e]) => {if (e.isIntersecting) {setVisible(true);obs.disconnect();}},
      { threshold: 0.15 }
    );
    if (sectionRef.current) obs.observe(sectionRef.current);
    return () => obs.disconnect();
  }, []);

  return null;





















































































}