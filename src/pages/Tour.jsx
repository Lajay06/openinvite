/**
 * Tour — the product tour at /tour.
 *
 * PRIVATE PREVIEW. This route is deliberately not linked from PublicNav, not
 * in scripts/marketingRoutes.mjs (so it is neither prerendered nor in
 * sitemap.xml), and carries robots noindex. It ships this way until the real
 * dashboard captures land in T3, at which point adding it to
 * marketingRoutes.mjs and dropping the noindex is the whole reversal.
 *
 * SCENES is the single place to edit. Swapping a placeholder for a real
 * capture at T3 is one line per scene: set imageSrc to the Cloudinary URL and
 * the placeholder stops rendering. Nothing else needs to change.
 */
import React, { useEffect, useRef, useState } from "react";
import PublicNav from "@/components/public/PublicNav";
import PublicFooter from "@/components/public/PublicFooter";
import MarketingEndCap from "@/components/marketing/MarketingEndCap";

const PJS = "'Plus Jakarta Sans', sans-serif";
const EASE = "cubic-bezier(0.16,1,0.3,1)";

// 16:10 is the dashboard capture aspect. Kept as a single constant so the
// placeholder and the real capture can never disagree about it.
const FRAME_ASPECT = "16 / 10";

const SCENES = [
  {
    num: "01",
    label: "Daily update",
    copy: "Open it. It already knows what today needs.",
    imageSrc: null,
    align: "left",
  },
  {
    num: "02",
    label: "Ava",
    copy: "Ask a question. Get an answer that fits your budget.",
    imageSrc: null,
    align: "right",
  },
  {
    num: "03",
    label: "Guest list",
    copy: "Every yes, no, and maybe. One list, always current.",
    imageSrc: null,
    align: "left",
  },
  {
    num: "04",
    label: "Seating",
    copy: "Drag a name. The table updates. Nobody gets forgotten.",
    imageSrc: null,
    align: "right",
  },
  {
    num: "05",
    label: "Budget",
    copy: "What you planned. What you spent. No surprises in month nine.",
    imageSrc: null,
    align: "left",
  },
  {
    num: "06",
    label: "Schedule",
    copy: "Every hour of the day, sorted before the day arrives.",
    imageSrc: null,
    align: "right",
  },
  {
    num: "07",
    label: "Universes",
    copy: "Twenty worlds. Pick one, make it yours.",
    imageSrc: null,
    align: "left",
  },
  {
    num: "08",
    label: "Your site",
    copy: "Guests see this. They will remember it.",
    imageSrc: null,
    align: "right",
  },
];

const prefersReduced = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Scroll reveal, matching the pattern already used on About and Features
 * (IntersectionObserver, opacity plus a small translateY, disconnect once
 * seen, no-op under prefers-reduced-motion). Defined here rather than
 * imported because there is no shared helper to import — those pages each
 * carry their own copy, and unifying them is a separate job.
 */
function useReveal(threshold = 0.25) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(prefersReduced());

  useEffect(() => {
    if (prefersReduced()) return;
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return [ref, visible];
}

/** Labeled grey box at the exact capture aspect, shown while imageSrc is null. */
function PlaceholderFrame({ num, label }) {
  return (
    <div
      style={{
        width: "100%",
        aspectRatio: FRAME_ASPECT,
        background: "#161616",
        border: "1px solid rgba(255,255,255,0.1)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        padding: 24,
        boxSizing: "border-box",
        textAlign: "center",
      }}
    >
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.08em",
          color: "rgba(255,255,255,0.3)",
          fontFamily: PJS,
        }}
      >
        {num}
      </span>
      <span
        style={{
          fontSize: "clamp(14px, 1.6vw, 18px)",
          fontWeight: 600,
          color: "rgba(255,255,255,0.55)",
          fontFamily: PJS,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 12,
          color: "rgba(255,255,255,0.3)",
          fontFamily: PJS,
        }}
      >
        Dashboard capture 16:10
      </span>
    </div>
  );
}

function Scene({ scene }) {
  const [ref, visible] = useReveal(0.2);
  const isRight = scene.align === "right";

  return (
    <section
      ref={ref}
      style={{
        padding: "clamp(64px, 9vh, 120px) clamp(24px, 6vw, 80px)",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(28px)",
        transition: prefersReduced()
          ? "none"
          : `opacity 0.8s ${EASE}, transform 0.8s ${EASE}`,
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          display: "grid",
          gap: "clamp(24px, 4vw, 56px)",
          alignItems: "center",
        }}
        // Single column below lg so the frame never squashes on a phone, two
        // columns above it. The alternation is driven by this class rather
        // than an inline `order`, because the media query below has to use
        // !important to beat inline styles, and an !important order rule
        // would then clobber the inline value at every width — which is
        // exactly what happened first time round: every scene rendered
        // frame-left and the alternation silently did nothing.
        className={`tour-scene-grid${isRight ? " tour-scene-grid--flip" : ""}`}
      >
        <div className="tour-scene-frame">
          {scene.imageSrc ? (
            <img
              src={scene.imageSrc}
              alt={`${scene.label} in the Openinvite dashboard`}
              style={{
                width: "100%",
                aspectRatio: FRAME_ASPECT,
                objectFit: "cover",
                display: "block",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            />
          ) : (
            <PlaceholderFrame num={scene.num} label={scene.label} />
          )}
        </div>

        <div className="tour-scene-copy">
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.08em",
              color: "rgba(255,255,255,0.3)",
              fontFamily: PJS,
              marginBottom: 12,
            }}
          >
            {scene.num}
          </div>
          <h2
            style={{
              fontSize: "clamp(24px, 3vw, 40px)",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              lineHeight: 1.15,
              color: "#FFFFFF",
              fontFamily: PJS,
              margin: 0,
            }}
          >
            {scene.copy}
          </h2>
        </div>
      </div>
    </section>
  );
}

export default function Tour() {
  // Not useMarketingSeo(): that hook has no noindex support and would fall
  // back to the home page's title for an unlisted path. While /tour is a
  // private preview it sets its own tags; T3 can move it onto the shared
  // hook once the page is public.
  useEffect(() => {
    document.title = "Openinvite | Tour";
    let robots = document.querySelector('meta[name="robots"]');
    if (!robots) {
      robots = document.createElement("meta");
      robots.setAttribute("name", "robots");
      document.head.appendChild(robots);
    }
    robots.setAttribute("content", "noindex, nofollow");
    return () => {
      // Leaving the tag behind would silently deindex whatever page the
      // visitor navigates to next.
      if (robots && robots.parentNode) robots.parentNode.removeChild(robots);
    };
  }, []);

  const [openRef, openVisible] = useReveal(0.1);

  return (
    <div style={{ background: "#0A0A0A", minHeight: "100vh" }}>
      <PublicNav />

      {/* Opening — text only, no image. */}
      <section
        ref={openRef}
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 clamp(24px, 6vw, 80px)",
          boxSizing: "border-box",
        }}
      >
        <h1
          style={{
            fontSize: "clamp(36px, 6vw, 84px)",
            fontWeight: 700,
            letterSpacing: "-0.03em",
            lineHeight: 1.05,
            color: "#FFFFFF",
            fontFamily: PJS,
            textAlign: "center",
            maxWidth: 1000,
            margin: 0,
            opacity: openVisible ? 1 : 0,
            transform: openVisible ? "translateY(0)" : "translateY(24px)",
            transition: prefersReduced()
              ? "none"
              : `opacity 0.9s ${EASE}, transform 0.9s ${EASE}`,
          }}
        >
          This is what planning looks like now.
        </h1>
      </section>

      {SCENES.map((scene) => (
        <Scene key={scene.num} scene={scene} />
      ))}

      <MarketingEndCap
        image="https://res.cloudinary.com/dsr84xknv/image/upload/f_auto,q_auto/DTS_CURATIVE_Chris_Abatzis_Photos_ID7678_dlsgrm.jpg"
        alt="A couple at their wedding reception"
      />

      <PublicFooter />

      <style>{`
        /* Below lg: one column, frame above copy in DOM order. No order
           rules here at all, so a phone always reads image then line. */
        .tour-scene-grid { grid-template-columns: 1fr; }

        @media (min-width: 1024px) {
          .tour-scene-grid { grid-template-columns: 1.35fr 1fr; }
          /* Flipped scenes put the copy first and the frame second, so the
             page alternates instead of reading as a list. */
          .tour-scene-grid--flip .tour-scene-copy  { order: 1; }
          .tour-scene-grid--flip .tour-scene-frame { order: 2; }
        }
      `}</style>
    </div>
  );
}
