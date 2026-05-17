import React from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, TrendingUp, Users, Clock } from "lucide-react";

const GRID_FEATURES = [
  {
    icon: Sparkles,
    iconColor: "#ec4899",
    title: "Smart suggestions",
    body: "Personalised recommendations based on your style and budget",
  },
  {
    icon: TrendingUp,
    iconColor: "#9333ea",
    title: "Budget intelligence",
    body: "Real-time tips to keep spending on track without compromise",
  },
  {
    icon: Users,
    iconColor: "#ec4899",
    title: "Guest insights",
    body: "Dietary, seating, and RSVP patterns analysed automatically",
  },
  {
    icon: Clock,
    iconColor: "#9333ea",
    title: "Timeline optimisation",
    body: "Day-of schedule refined to perfection",
  },
];

const PJS = "'Plus Jakarta Sans', sans-serif";

export default function AvaSpotlightSection() {
  const navigate = useNavigate();

  return (
    <section style={{ background: "#FFFFFF", padding: "100px 24px" }}>
      <div style={{ maxWidth: 680, margin: "0 auto", textAlign: "center" }}>

        {/* Subheadline */}
        <p style={{
          fontSize: 18, fontWeight: 400,
          color: "rgba(10,10,10,0.55)", lineHeight: 1.65,
          maxWidth: 520, margin: "20px auto 0", fontFamily: PJS,
        }}>
          Ava learns your style, your budget, and your vision — then helps you make smarter decisions at every step. From vendor suggestions to seating optimisation, she's always one step ahead.
        </p>

        {/* 2×2 feature grid */}
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr",
          maxWidth: 560, margin: "48px auto 0",
          gap: 1, background: "rgba(10,10,10,0.06)",
        }}>
          {GRID_FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <div key={i} style={{ background: "#FFFFFF", padding: "28px 24px", textAlign: "left" }}>
                <Icon size={20} color={f.iconColor} style={{ marginBottom: 12, display: "block" }} />
                <p style={{ fontSize: 14, fontWeight: 600, color: "#0A0A0A", margin: "0 0 6px", fontFamily: PJS }}>
                  {f.title}
                </p>
                <p style={{ fontSize: 13, color: "rgba(10,10,10,0.4)", margin: 0, lineHeight: 1.55, fontFamily: PJS }}>
                  {f.body}
                </p>
              </div>
            );
          })}
        </div>

        {/* CTA button */}
        <div style={{ display: "flex", justifyContent: "center", marginTop: 48 }}>
          <button
            onClick={() => navigate('/ava')}
            style={{
              background: "#E03553",
              color: "#FFFFFF", borderRadius: 999,
              padding: "12px 28px", fontSize: 14, fontWeight: 600,
              border: "none", cursor: "pointer", fontFamily: PJS,
            }}
          >
            Meet Ava
          </button>
        </div>

      </div>
    </section>
  );
}
