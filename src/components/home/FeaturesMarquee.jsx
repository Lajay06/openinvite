import React, { useRef, useState } from "react";
import { Users, Wallet, Calendar, Music, Mail, Armchair, Gift, Camera, Sparkles, Building, BarChart3, Link2 } from "lucide-react";

const FEATURES = [
  { icon: Users, label: "GUEST MANAGEMENT" },
  { icon: Wallet, label: "BUDGET TRACKING" },
  { icon: Calendar, label: "TIMELINE PLANNER" },
  { icon: Music, label: "SPOTIFY PLAYLISTS" },
  { icon: Mail, label: "DIGITAL INVITATIONS" },
  { icon: Armchair, label: "SEATING CHARTS" },
  { icon: Gift, label: "GIFT REGISTRY" },
  { icon: Camera, label: "PHOTO MANAGEMENT" },
  { icon: Sparkles, label: "AI ASSISTANT AVA" },
  { icon: Building, label: "VENDOR MANAGEMENT" },
  { icon: BarChart3, label: "EXPENSE ANALYTICS" },
  { icon: Link2, label: "RSVP TRACKING" },
];

export default function FeaturesMarquee() {
  const trackRef = useRef(null);

  return (
    <section style={{ background: "#F5F5F3", padding: "48px 0", overflow: "hidden", position: "relative" }}>
      <style>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .marquee-track {
          animation: marquee 30s linear infinite;
        }
        .marquee-track:hover {
          animation-play-state: paused;
        }
      `}</style>

      <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'Plus Jakarta Sans', sans-serif", color: "rgba(10,10,10,0.4)", textAlign: "center", paddingBottom: 32 }}>
        Everything you need
      </p>

      <div style={{ overflow: "hidden" }}>
        <div
          ref={trackRef}
          className="marquee-track"
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            width: "max-content",
          }}
        >
          {/* First set */}
          {FEATURES.map((feature, i) => (
            <FeatureItem key={i} feature={feature} />
          ))}

          {/* Second set (duplicate for seamless loop) */}
          {FEATURES.map((feature, i) => (
            <FeatureItem key={`dup-${i}`} feature={feature} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureItem({ feature }) {
  const Icon = feature.icon;
  const [hovered, setHovered] = React.useState(false);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "0 48px",
        borderRight: "1px solid rgba(10,10,10,0.08)",
        cursor: "default",
        background: hovered ? "rgba(224, 53, 83, 0.05)" : "transparent",
        transition: "background 0.3s ease",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Icon
        size={18}
        strokeWidth={1.5}
        style={{
          stroke: "#E03553",
          fill: "none",
          flexShrink: 0,
        }}
      />
      <span
        style={{
          fontSize: 14,
          fontWeight: 500,
          color: "#0A0A0A",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          whiteSpace: "nowrap",
        }}
      >
        {feature.label}
      </span>
    </div>
  );
}