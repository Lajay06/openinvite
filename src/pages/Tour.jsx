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
import MarketingHero from "@/components/marketing/MarketingHero";
import MarketingPhotoPair from "@/components/marketing/MarketingPhotoPair";
import ProductMediaFrame from "@/components/shared/ProductMediaFrame";

const PJS = "'Plus Jakarta Sans', sans-serif";
const EASE = "cubic-bezier(0.16,1,0.3,1)";

// 16:10 is the dashboard capture aspect, and the same value Features.jsx
// passes to ProductMediaFrame. Kept as one constant so the placeholder and
// the real capture can never disagree about it.
const FRAME_ASPECT = "16/10";

// Background tokens, surveyed from the pages that already use them rather
// than invented here: #0A0A0A and #FFFFFF are Features.jsx's QuickStart and
// Budget sections, #F5F5F3 its Dashboard and Seating sections. About.jsx
// uses the same #F5F5F3 for its beliefs block. No new values.
const DARK = "#0A0A0A";
const WHITE = "#FFFFFF";
const OFFWHITE = "#F5F5F3";

// How much larger than the frame the image renders, so there is something to
// travel, and how far it travels.
//
// The translate is a percentage of the ELEMENT's height, not the frame's, so
// the two interact: at 118% overscan the overhang is 9% of the frame per side
// while the travel is 7% of a 118%-tall element — which measured out at only
// ~2.7px of spare cover at 1440 and ~1.5px at 390. That is not a letterbox,
// but it is close enough that a rounding difference or an unusual viewport
// could open one. 124% keeps the same parallax strength with roughly 13px of
// margin at desktop and 7px at mobile instead.
const OVERSCAN = 124;
const PARALLAX_PCT = 7;

// Tour hero. Print-resolution original (6720x4480, 30 MP) — 2.3MB even with
// f_auto,q_auto and no width cap, so a width is always pinned. c_limit never
// upscales. Delivered UNCROPPED: measured at 1440 the cover crop is
// width-driven and shows source x 0..6720, y 140..4340, which already contains
// both her head (x 420-1036) and his raised hand with the glass (x 5208-5684,
// top y 532). A crop could only lose one of them.
const HERO_ID = "DTS_Modern_Home_Rob_Christain_Crosby_Photos_ID3654_h6b8gy";
const heroUrl = (w) =>
  `https://res.cloudinary.com/dsr84xknv/image/upload/f_auto,q_auto,w_${w},c_limit/${HERO_ID}.jpg`;
const HERO_SRC = heroUrl(1440);
const HERO_SRCSET = [640, 960, 1280, 1440, 1920, 2560]
  .map((w) => `${heroUrl(w)} ${w}w`)
  .join(", ");

const SCENES = [
  { num: "01", label: "Daily update", copy: "Your wedding, today's priorities, and what's coming next, all waiting for you.",              imageSrc: null, align: "left",  bg: WHITE },
  { num: "02", label: "Ava",          copy: "Like having a wedding planner in your pocket, only faster, smarter, and available 24/7.",      imageSrc: null, align: "right", bg: OFFWHITE },
  { num: "03", label: "Guest list",   copy: "Track every RSVP, meal preference, and plus one without the spreadsheets.",       imageSrc: null, align: "left",  bg: DARK },
  { num: "04", label: "Seating",      copy: "Design your floor plan visually, drag guests into place, and let every table come together effortlessly.",    imageSrc: null, align: "right", bg: WHITE },
  { num: "05", label: "Budget",       copy: "What you planned. What you spent. No surprises in month nine.", imageSrc: null, align: "left",  bg: OFFWHITE },
  { num: "06", label: "Schedule",     copy: "Build your entire wedding day with confidence, knowing every detail has its perfect place.",     imageSrc: null, align: "right", bg: DARK },
  { num: "07", label: "Universes",    copy: "Choose your Universe and every touchpoint follows. One cohesive aesthetic from your first invitation to your final thank you.",                   imageSrc: null, align: "left",  bg: WHITE },
  { num: "08", label: "Your site",    copy: "Guests see this. They will remember it.",                   imageSrc: null, align: "right", bg: OFFWHITE },
];

const isDarkBg = (bg) => bg === DARK;

// Text roles per background. Light values are the textMuted family from
// src/styles/tokens.js — rgba(10,10,10,0.6) is the WCAG AA muted token, and
// #444444 is the body color Features.jsx already uses on its light
// sections. Dark values are the existing white-alpha family from the
// previous version of this page and from Features' dark sections.
const ink = (bg) =>
  isDarkBg(bg)
    ? { heading: "#FFFFFF", number: "rgba(255,255,255,0.4)", meta: "rgba(255,255,255,0.5)" }
    : { heading: "#0A0A0A", number: "rgba(10,10,10,0.6)", meta: "#444444" };

const prefersReduced = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Reveal, matching the pattern About.jsx and Features.jsx already use:
 * IntersectionObserver, disconnect once seen, no-op under reduced motion.
 * Only drives the entry transition — the parallax below needs continuous
 * updates and so cannot share this one-shot observer.
 */
function useReveal(threshold = 0.2) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(prefersReduced());
  useEffect(() => {
    if (prefersReduced()) return;
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
}

/**
 * Scroll-linked parallax on the image inside its frame.
 *
 * Where the browser supports scroll-driven animations the whole thing is
 * declarative CSS (see the style block at the foot of the file): the
 * compositor drives it off the scroll timeline and no JS runs at all.
 *
 * The fallback path below only exists for browsers without that support. It
 * deliberately does NOT use the reveal observer above, because that one
 * disconnects after the first intersection and parallax needs updating for
 * as long as the scene is on screen. Instead a separate observer maintains a
 * live set of on-screen scenes, and a single shared rAF loop updates only
 * those — nothing is computed for off-screen scenes, and the loop stops
 * entirely when the set is empty.
 */
const supportsScrollTimeline = () =>
  typeof CSS !== "undefined" && CSS.supports && CSS.supports("animation-timeline: view()");

function useParallaxFallback(frameRef, imageRef) {
  useEffect(() => {
    if (prefersReduced()) return;
    if (supportsScrollTimeline()) return;   // CSS is handling it
    const frame = frameRef.current;
    const image = imageRef.current;
    if (!frame || !image) return;

    let onScreen = false;
    let raf = 0;

    const update = () => {
      raf = 0;
      if (!onScreen) return;
      const r = frame.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      // progress: 0 as the frame's top reaches the bottom of the viewport,
      // 1 as its bottom leaves the top. Clamped so the image never travels
      // further than the overscan can cover.
      const p = Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height)));
      const offset = (p - 0.5) * 2 * PARALLAX_PCT;
      image.style.transform = `translate3d(0, ${(-offset).toFixed(2)}%, 0)`;
      schedule();
    };
    const schedule = () => { if (!raf && onScreen) raf = requestAnimationFrame(update); };

    const obs = new IntersectionObserver(([e]) => {
      onScreen = e.isIntersecting;
      if (onScreen) schedule();
      else if (raf) { cancelAnimationFrame(raf); raf = 0; }
    }, { threshold: 0 });
    obs.observe(frame);

    return () => {
      obs.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [frameRef, imageRef]);
}

/** Grey placeholder. Fills the frame exactly as a real capture will. */
function PlaceholderFill({ num, label, bg }) {
  const c = ink(bg);
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: isDarkBg(bg) ? "#161616" : "#E8E8E6",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        textAlign: "center",
        padding: 24,
        boxSizing: "border-box",
      }}
    >
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: c.number, fontFamily: PJS }}>{num}</span>
      <span style={{ fontSize: "clamp(14px, 1.6vw, 18px)", fontWeight: 600, color: c.heading, fontFamily: PJS }}>{label}</span>
      <span style={{ fontSize: 12, color: c.meta, fontFamily: PJS }}>Dashboard capture 16:10</span>
    </div>
  );
}

function Scene({ scene }) {
  const [ref, visible] = useReveal(0.2);
  const frameRef = useRef(null);
  const imageRef = useRef(null);
  useParallaxFallback(frameRef, imageRef);

  const c = ink(scene.bg);
  const dark = isDarkBg(scene.bg);
  const isRight = scene.align === "right";
  const reduced = prefersReduced();

  // Frame settles first, commentary follows ~100ms later.
  const frameTransition = reduced ? "none" : `opacity 0.7s ${EASE}, transform 0.7s ${EASE}`;
  const copyTransition = reduced ? "none" : `opacity 0.7s ${EASE} 0.1s, transform 0.7s ${EASE} 0.1s`;

  return (
    <section
      ref={ref}
      // Section padding and container width copied from Features.jsx's
      // SeatingSection/BudgetSection, not approximated.
      style={{ background: scene.bg, padding: "160px clamp(32px, 6vw, 80px)" }}
    >
      <div
        className={`tour-scene-grid${isRight ? " tour-scene-grid--flip" : ""}`}
        style={{ maxWidth: 1320, margin: "0 auto" }}
      >
        <div
          className="tour-scene-frame"
          style={{
            opacity: visible ? 1 : 0,
            // Scale settle capped at 1.03, and dropped entirely under
            // reduced motion.
            transform: visible ? "translateY(0) scale(1)" : `translateY(24px) scale(${reduced ? 1 : 1.03})`,
            transition: frameTransition,
          }}
        >
          <ProductMediaFrame aspectRatio={FRAME_ASPECT} maxWidth="none" dark={dark}>
            {/* The traveling layer. Taller than the frame by OVERSCAN so the
                frame stays fully covered at both ends of the translate — no
                letterboxing, no gap, no inner padding at any point. */}
            <div
              ref={frameRef}
              style={{ position: "absolute", inset: 0, overflow: "hidden" }}
            >
              <div
                ref={imageRef}
                className={reduced ? undefined : "tour-parallax"}
                style={{
                  position: "absolute",
                  left: 0,
                  width: "100%",
                  height: `${OVERSCAN}%`,
                  top: `${-(OVERSCAN - 100) / 2}%`,
                  willChange: "transform",
                }}
              >
                {scene.imageSrc ? (
                  <img
                    src={scene.imageSrc}
                    alt={`${scene.label} in the Openinvite dashboard`}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                ) : (
                  <PlaceholderFill num={scene.num} label={scene.label} bg={scene.bg} />
                )}
              </div>
            </div>
          </ProductMediaFrame>
        </div>

        <div
          className="tour-scene-copy"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(24px)",
            transition: copyTransition,
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: c.number, fontFamily: PJS, marginBottom: 12 }}>
            {scene.num}
          </div>
          <h2
            style={{
              fontSize: "clamp(24px, 3vw, 40px)",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              lineHeight: 1.15,
              color: c.heading,
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


  return (
    <div style={{ background: DARK, minHeight: "100vh" }}>
      <PublicNav />

      {/* Opening. Was a bespoke text-only section (dark, minHeight 100vh,
          centered h1 at clamp(36px, 6vw, 84px)); it now consumes the shared
          MarketingHero so /tour matches every other marketing page. The copy
          is unchanged. No `cta` is passed — /tour stays out of the hero CTA
          rollout deliberately. maxWidth 1000 preserves the original measure;
          the type follows the shared scale, so the cap moves 84px -> 64px. */}
      <MarketingHero
        image={HERO_SRC}
        srcSet={HERO_SRCSET}
        title="This is what planning looks like now."
        maxWidth={1000}
        /* Moves the visible window UP the source so more of the top shows and
           the couple sit lower. Range here is small: the delivered 1440x960
           into a 1440x900 box leaves only 60px of vertical slack, so 50% -> 25%
           is +15px of extra top, and 0% would be the maximum at +30px. The
           larger lever, if this is not enough, is a Cloudinary bottom crop:
           c_crop,y_0,h_4200 moves the couple from 44.6% to 47.6% of frame
           height, at the cost of some pool water at the bottom. */
        imagePosition="center 25%"
      />

      {SCENES.slice(0, 4).map((scene) => (
        <Scene key={scene.num} scene={scene} />
      ))}

      {/* Break between scenes 04 and 05. Alternation is data-driven off each
          scene's own `align`, so inserting a block here cannot shift it —
          asserted by measured position, not by reading the array. */}
      <MarketingPhotoPair
        left={{ src: "https://res.cloudinary.com/dsr84xknv/image/upload/f_auto,q_auto/DTS_NU_NUPTIALS_Shauna_Summers_Photos_ID10310_o5dcie.jpg", alt: "A couple laughing together on their wedding day" }}
        right={{ src: "https://res.cloudinary.com/dsr84xknv/image/upload/f_auto,q_auto/DTS_Pride_Agust%C3%ADn_Far%C3%ADas_Photos_ID5510_dn4jws.jpg", alt: "Two people celebrating at a wedding party" }}
      />

      {SCENES.slice(4).map((scene) => (
        <Scene key={scene.num} scene={scene} />
      ))}

      <MarketingEndCap
        image="https://res.cloudinary.com/dsr84xknv/image/upload/f_auto,q_auto/DTS_BANDITS_PALI_MENDEZ_Photos_ID14229_mhwb5h.jpg"
        alt="Friends celebrating together at a wedding party"
        title="All that. And we're still just getting started."
      />

      <PublicFooter />

      <style>{`
        /* Grid copied from Features.jsx's FeatureVideoGridStyle — same
           columns, same gaps, same 900px breakpoint. Duplicated rather than
           imported because that style component is local to Features.jsx and
           not exported; the values must stay in step with it. */
        .tour-scene-grid { display: grid; grid-template-columns: 1fr; gap: 56px; align-items: center; }
        @media (min-width: 900px) {
          .tour-scene-grid { grid-template-columns: 1.15fr 1fr; gap: 72px; }
          /* Flipped scenes put the copy first and the frame second, so the
             page alternates instead of reading as a list. Driven by a class
             rather than an inline order, because an !important media-query
             order rule would clobber an inline value at every width — which
             is exactly what broke the alternation the first time. */
          .tour-scene-grid--flip .tour-scene-copy  { order: 1; }
          .tour-scene-grid--flip .tour-scene-frame { order: 2; }
        }

        /* Preferred parallax path: the compositor drives this off the scroll
           timeline, so no JS runs while scrolling. The rAF fallback in
           useParallaxFallback checks for this same support and stays idle
           when it is present, so the two never both run. */
        @keyframes tourParallax {
          from { transform: translate3d(0, ${PARALLAX_PCT}%, 0); }
          to   { transform: translate3d(0, -${PARALLAX_PCT}%, 0); }
        }
        @supports (animation-timeline: view()) {
          /* The timeline is NAMED on the frame wrapper, not taken from
             view() on the traveling layer itself. view() resolves against
             the nearest scrollport, and the traveling layer's parent is the
             overflow:hidden clip — which IS a scroll container. Anchored
             there the layer never moves relative to its scrollport, so
             progress pinned at ~50% and the parallax rendered a constant
             0px offset while still reporting itself as a running animation.
             The wrapper sits outside the clip, so its progress tracks the
             page scroll as intended. */
          .tour-scene-frame {
            view-timeline-name: --tourFrame;
            view-timeline-axis: block;
          }
          .tour-parallax {
            animation: tourParallax linear both;
            animation-timeline: --tourFrame;
            animation-range: cover 0% cover 100%;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .tour-parallax { animation: none !important; transform: none !important; }
        }
      `}</style>
    </div>
  );
}
