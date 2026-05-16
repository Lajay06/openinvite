import React, { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ArrowUpRight } from "lucide-react";

const EASE = "cubic-bezier(0.16,1,0.3,1)";

const CARD_W = 480;
const CARD_H = 280;
const GAP = 20;

export default function HorizontalCardShelf({ cards }) {
  const scrollRef = useRef(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(true);

  const scroll = (dir) => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir * (CARD_W + GAP) * 1.5, behavior: "smooth" });
  };

  const onScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanLeft(scrollLeft > 8);
    setCanRight(scrollLeft < scrollWidth - clientWidth - 8);
  };

  return (
    <div style={{ position: "relative" }}>
      {canLeft && (
        <button
          onClick={() => scroll(-1)}
          style={{
            position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)",
            zIndex: 10, background: "rgba(0,0,0,0.6)", border: "none", borderRadius: "50%",
            width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", opacity: 0.6, transition: "opacity 0.2s ease",
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = 1}
          onMouseLeave={e => e.currentTarget.style.opacity = 0.6}
        >
          <ChevronLeft size={20} color="#fff" />
        </button>
      )}
      {canRight && (
        <button
          onClick={() => scroll(1)}
          style={{
            position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
            zIndex: 10, background: "rgba(0,0,0,0.6)", border: "none", borderRadius: "50%",
            width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", opacity: 0.6, transition: "opacity 0.2s ease",
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = 1}
          onMouseLeave={e => e.currentTarget.style.opacity = 0.6}
        >
          <ChevronRight size={20} color="#fff" />
        </button>
      )}

      <div
        ref={scrollRef}
        onScroll={onScroll}
        style={{
          display: "flex",
          flexDirection: "row",
          gap: GAP,
          overflowX: "scroll",
          overflowY: "hidden",
          scrollBehavior: "smooth",
          paddingLeft: 48,
          paddingRight: 48,
          paddingTop: 8,
          paddingBottom: 16,
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {cards.map((card, i) => (
          <ShelfCard key={i} card={card} />
        ))}
      </div>
      <style>{`
        div[data-shelf]::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}

function ShelfCard({ card }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        width: CARD_W,
        height: CARD_H,
        flexShrink: 0,
        borderRadius: 0,
        overflow: "hidden",
        cursor: "pointer",
        transform: hovered ? "scale(1.02)" : "scale(1)",
        transition: "transform 0.3s ease, box-shadow 0.3s ease",
        boxShadow: hovered ? "0 16px 48px rgba(0,0,0,0.55)" : "0 4px 20px rgba(0,0,0,0.3)",
      }}
    >
      {/* Background photo */}
      <div
        style={{
          position: "absolute", inset: 0,
          backgroundImage: `url(${card.bg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          transform: hovered ? "scale(1.05)" : "scale(1)",
          transition: `transform 0.6s ${EASE}`,
        }}
      />
      {/* Landscape gradient — dark LEFT, transparent RIGHT */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(to right, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0) 100%)",
      }} />
      {/* Text — left side, vertically centered */}
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column", justifyContent: "center",
        padding: 32, maxWidth: 260,
      }}>
        <p style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: card.accent, marginBottom: 8, fontWeight: 500 }}>
          {card.label}
        </p>
        <h3 style={{ color: "#FFF", fontWeight: 700, fontSize: 20, letterSpacing: "-0.01em", lineHeight: 1.2, marginBottom: 8 }}>
          {card.title}
        </h3>
        <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 13, lineHeight: 1.5 }}>
          {card.desc}
        </p>
      </div>
      {/* Arrow bottom-right */}
      <div style={{ position: "absolute", bottom: 20, right: 20 }}>
        <ArrowUpRight size={18} color="#fff" style={{ opacity: hovered ? 0.9 : 0.45, transition: "opacity 0.3s ease" }} />
      </div>
    </div>
  );
}