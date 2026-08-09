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
import { responsivePhoto } from "@/lib/marketingImage";

const PJS = "'Plus Jakarta Sans', sans-serif";

// Both masters are web exports, not print originals: 1600x1065 and 1280x960.
// Even delivered whole they only cover 0.42x and 0.34x of the device pixels
// their boxes need at dpr 2. Responsive delivery recovers everything the URLs
// were throwing away; closing the rest needs larger uploads, not new URLs.
const HERO = responsivePhoto("DTS_Tradition_Chris_Abatzis_Photos_ID9181_erzsi2", 1600, {
  transform: "c_crop,x_0,y_0,w_1600,h_640",
  croppedWidth: 1600,
});
const END_CAP = responsivePhoto("DTS_BANDITS_PALI_MENDEZ_Photos_ID14229_mhwb5h", 1280);
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

const SCENES = [
  { num: "01", label: "Daily update", copy: "Your wedding, today's priorities, and what's coming next, all waiting for you.",              imageSrc: null, align: "left" },
  { num: "02", label: "Ava",          copy: "Like having a wedding planner in your pocket, only faster, smarter, and available 24/7.",      imageSrc: null, align: "right" },
  { num: "03", label: "Guest list",   copy: "Track every RSVP, meal preference, and plus one without the spreadsheets.",       imageSrc: null, align: "left" },
  { num: "04", label: "Seating",      copy: "Design your floor plan visually, drag guests into place, and let every table come together effortlessly.",    imageSrc: null, align: "right" },
  { num: "05", label: "Budget",       copy: "What you planned. What you spent. No surprises in month nine.", imageSrc: null, align: "left" },
  { num: "06", label: "Schedule",     copy: "Build your entire wedding day with confidence, knowing every detail has its perfect place.",     imageSrc: null, align: "right" },
  { num: "07", label: "Universes",    copy: "Choose your Universe and every touchpoint follows. One cohesive aesthetic from your first invitation to your final thank you.",                   imageSrc: null, align: "left" },
  { num: "08", label: "Your site",    copy: "Guests see this. They will remember it.",                   imageSrc: null, align: "right" },
];

// ── BACKGROUND ARC ────────────────────────────────────────────────
// One continuous journey: light at the top, dark at the bottom, ending dark
// into the end cap. This REPLACES the old scene-to-scene ping-pong
// (#0A0A0A / #FFFFFF / #F5F5F3), which is gone.
//
// The 50% stop is the crossover, where the background passes through mid-grey
// and NEITHER ink color reaches AA. It is deliberately parked on the photo
// pair between scenes 04 and 05, which carries no text — that placement is the
// only reason this passes. IF THE PHOTO PAIR MOVES, THESE STOPS MOVE WITH IT.
//
// Measured contrast across the scroll (#324 method), best ink at each frame:
//   t     bg        best ink   ratio   (all arc text is LARGE, AA 3:1)
//   0.00  #FFFFFF   dark       19.80
//   0.20  #F9F9F8   dark       18.84
//   0.40  #D1CDCD   dark       12.64
//   0.50  #8A7F82   dark        5.13  <- WORST FRAME (the crossover)
//   0.60  #4A4647   light       9.26
//   0.80  #1C1C1C   light      16.99
//   1.00  #0A0A0A   light      19.80
// WORST FRAME 5.13:1 at t=0.50, against 3:1 for large text.
//
// Two deliberate choices in these stops:
//   - The mid is #8A7F82, a warm grey off the #E03553 primary, NOT neutral
//     #8A8A88. Neutral read as an unstyled page rather than a designed step;
//     the tint also drops luminance slightly, which lifted the worst frame
//     from 4.49:1 to 5.13:1.
//   - The middle is compressed (0.35/0.50/0.65, not 0.25/0.50/0.75) so the
//     page spends 9% of its scroll in the mid-tone band instead of 16%.
//
// This only holds because every element on the arc is large text: the scene
// number is now 20px/700 SOLID. The old 11px rgba(255,255,255,0.4) measured
// 3.77:1 and already failed AA on the dark scenes before the arc existed.
// Text inside the placeholder frames sits on the frame's own solid background
// (#161616 / #E8E8E6), not the arc, so it is unaffected: 20px label 18.10:1
// and 16.14:1, 14px meta 9.71:1 and 7.44:1.
const ARC = [
  [0.00, "#FFFFFF"],
  [0.35, "#F5F5F3"],
  [0.50, "#8A7F82"],
  [0.65, "#2A2A2A"],
  [1.00, "#0A0A0A"],
];

const mix = (a, b, t) => {
  const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [ar, ag, ab] = p(a), [br, bg2, bb] = p(b);
  const c = (x, y) => Math.round(x + (y - x) * t).toString(16).padStart(2, "0");
  return `#${c(ar, br)}${c(ag, bg2)}${c(ab, bb)}`;
};

/** Sample the arc at 0..1. Used for the reduced-motion static colors. */
const arcAt = (t) => {
  for (let i = 1; i < ARC.length; i++) {
    if (t <= ARC[i][0]) {
      const [t0, c0] = ARC[i - 1], [t1, c1] = ARC[i];
      return mix(c0, c1, (t - t0) / (t1 - t0));
    }
  }
  return ARC[ARC.length - 1][1];
};

/** Scene i sits at i/7 along the arc, so 00-03 land light and 04-07 land dark,
 *  with the crossover falling between them — i.e. on the photo pair. */
const sceneT = (i) => i / (SCENES.length - 1);
const sceneIsDark = (i) => sceneT(i) > 0.5;

// Solid ink only. No alpha: alpha is what put the old scene number at 3.77:1.
const ink = (dark) =>
  dark
    ? { heading: "#FFFFFF", number: "#FFFFFF", meta: "rgba(255,255,255,0.72)" }
    : { heading: "#0A0A0A", number: "#0A0A0A", meta: "rgba(10,10,10,0.72)" };

// Both rings together: the light one carries on dark backgrounds, the dark one
// on light backgrounds, and at the crossover both are partly visible. A single
// border in either color disappears at one end of the arc.
//
// Alphas solved, not guessed. Worst-of-arc for max(light, dark) against the
// 3:1 non-text minimum (WCAG 1.4.11):
//   light 0.50 / dark 0.32  ->  1.99:1   (first attempt, FAILED)
//   light 0.60 / dark 0.60  ->  2.71:1   fails
//   light 0.60 / dark 0.80  ->  3.16:1   passes
//   light 0.70 / dark 0.80  ->  3.38:1   passes  <- used
// Worst frame sits at t=0.57, just past the crossover. Re-solve if the stops
// change.
const FRAME_RING = {
  border: "1px solid rgba(255,255,255,0.7)",
  boxShadow: "0 0 0 1px rgba(10,10,10,0.8)",
};

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
function PlaceholderFill({ num, label, dark }) {
  const c = ink(dark);
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: dark ? "#161616" : "#E8E8E6",
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
      {/* 20px/700 — large text at AA 3:1. Was 11px with rgba(...,0.4), which
          measured 3.77:1 on the dark scenes and failed AA before the arc. */}
      <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: "0.06em", color: c.number, fontFamily: PJS }}>{num}</span>
      <span style={{ fontSize: "clamp(16px, 1.8vw, 20px)", fontWeight: 700, color: c.heading, fontFamily: PJS }}>{label}</span>
      <span style={{ fontSize: 14, color: c.meta, fontFamily: PJS }}>Dashboard capture 16:10</span>
    </div>
  );
}

function Scene({ scene, index }) {
  const [ref, visible] = useReveal(0.2);
  const frameRef = useRef(null);
  const imageRef = useRef(null);
  useParallaxFallback(frameRef, imageRef);

  const dark = sceneIsDark(index);
  const c = ink(dark);
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
      // Transparent so the fixed arc layer shows through. Under reduced
      // motion there is no arc layer, so the section paints the color its own
      // position along the arc corresponds to — same story, nothing moving.
      style={{
        background: reduced ? arcAt(sceneT(index)) : "transparent",
        padding: "160px clamp(32px, 6vw, 80px)",
      }}
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
          <ProductMediaFrame aspectRatio={FRAME_ASPECT} maxWidth="none" dark={dark} style={FRAME_RING}>
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
                  <PlaceholderFill num={scene.num} label={scene.label} dark={dark} />
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
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "0.06em", color: c.number, fontFamily: PJS, marginBottom: 12 }}>
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


  const reducedMotion = prefersReduced();

  // Fallback for browsers without scroll-driven animations. Quantised to 24
  // steps: writing a color every frame would repaint a full-viewport layer
  // 60x a second for no visible benefit — 24 steps across the page is already
  // below the threshold where a color step is perceptible. The rAF is only
  // scheduled when the step actually changes.
  useEffect(() => {
    if (reducedMotion || supportsScrollTimeline()) return;
    const el = document.querySelector(".tour-arc");
    if (!el) return;
    const STEPS = 24;
    let last = -1, raf = 0;
    const apply = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const t = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      const step = Math.round(t * STEPS);
      if (step === last) return;
      last = step;
      el.style.backgroundColor = arcAt(step / STEPS);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(apply); };
    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [reducedMotion]);

  return (
    // Transparent, not DARK: the arc layer sits at z-index -1, so an opaque
    // background here paints straight over it and the arc never shows. The
    // dark fallback lives on the arc layer's own initial color instead.
    <div className="tour-page" style={{ minHeight: "100vh", position: "relative" }}>
      {/* The arc. ONE fixed full-viewport layer, not eight section
          backgrounds — animating eight would be eight full-width paints per
          frame. Under prefers-reduced-motion this layer is not rendered and
          each section paints its own static color instead, so the same
          light-to-dark story is told without anything animating. */}
      {!reducedMotion && <div className="tour-arc" aria-hidden="true" />}
      <PublicNav />

      {/* Opening. Was a bespoke text-only section (dark, minHeight 100vh,
          centered h1 at clamp(36px, 6vw, 84px)); it now consumes the shared
          MarketingHero so /tour matches every other marketing page. The copy
          is unchanged. No `cta` is passed — /tour stays out of the hero CTA
          rollout deliberately. maxWidth 1000 preserves the original measure;
          the type follows the shared scale, so the cap moves 84px -> 64px. */}
      {/* Swapped with About. The framing problem is Tour's own: PublicNav is
          fixed, 65px tall and opaque, and the couple sit high in the source
          (heads y 58-180 of 1065). Uncropped at 1440 the cover scale is 0.9 and
          their heads land at screen y 23 — under the nav. Shortening the image
          makes cover height-driven, which raises the scale and pushes them
          clear.

          Only the HEIGHT does that work. The previous crop was w_1190 x h_640,
          and the 1190 was pure loss: it threw away 26% of the master's width
          before delivery, leaving 1190px to cover a 3784px-wide box at dpr 2 —
          0.31x, the softest image on the site. Height is unchanged at 640, so
          the vertical framing is identical: cover is height-driven at every
          supported viewport, so the scale is boxH/640 either way and the heads
          land in exactly the same place (screen y 82 at 1440, 77 at 1892).

          Widening the crop does move the couple off-center — they sit at source
          x 595, which is 37% across 1600 rather than the middle of 1190 — so
          objectPosition carries the horizontal framing instead. That is the
          right place for it: it costs no pixels, and it adapts per viewport
          rather than baking one desktop crop into the file. Verified in frame
          at 390, 1440 and 1892. */}
      <MarketingHero
        image={HERO.src}
        srcSet={HERO.srcSet}
        imagePosition="37% center"
        title="This is what planning looks like now."
        maxWidth={1000}
      />

      {SCENES.slice(0, 4).map((scene, i) => (
        <Scene key={scene.num} scene={scene} index={i} />
      ))}

      {/* Break between scenes 04 and 05. Alternation is data-driven off each
          scene's own `align`, so inserting a block here cannot shift it —
          asserted by measured position, not by reading the array. */}
      <MarketingPhotoPair
        left={{ src: "https://res.cloudinary.com/dsr84xknv/image/upload/f_auto,q_auto/DTS_NU_NUPTIALS_Shauna_Summers_Photos_ID10310_o5dcie.jpg", alt: "A couple laughing together on their wedding day" }}
        right={{ src: "https://res.cloudinary.com/dsr84xknv/image/upload/f_auto,q_auto/DTS_Pride_Agust%C3%ADn_Far%C3%ADas_Photos_ID5510_dn4jws.jpg", alt: "Two people celebrating at a wedding party" }}
      />

      {SCENES.slice(4).map((scene, i) => (
        // +4: this slice restarts i at 0, and the index drives which side of
        // the arc crossover the scene's ink sits on. Without the offset all
        // eight scenes would take the light-background ink.
        <Scene key={scene.num} scene={scene} index={i + 4} />
      ))}

      <MarketingEndCap
        image={END_CAP.src}
        srcSet={END_CAP.srcSet}
        alt="Friends celebrating together at a wedding party"
        title="All that. And we're still just getting started."
      />

      <PublicFooter />

      <style>{`
        /* ── BACKGROUND ARC ────────────────────────────────────────────
           One fixed layer, painted once per frame by the compositor. The
           stops match ARC above; keep them in sync. */
        /* z-index 0, NOT -1. At -1 the arc paints behind the whole stacking
           context, and the app shell renders an opaque white div between this
           page and <body> which covered it completely. Lifting the arc to 0
           and every sibling to 1 keeps it local to this page — no ancestor
           background has to be touched. */
        .tour-page > * { position: relative; z-index: 1; }
        .tour-arc {
          position: fixed;
          inset: 0;
          z-index: 0 !important;
          background-color: #FFFFFF;
          pointer-events: none;
        }
        @keyframes tourArc {
          0%   { background-color: #FFFFFF; }
          35%  { background-color: #F5F5F3; }
          50%  { background-color: #8A7F82; }
          65%  { background-color: #2A2A2A; }
          100% { background-color: #0A0A0A; }
        }
        @supports (animation-timeline: scroll()) {
          .tour-arc {
            animation: tourArc linear both;
            animation-timeline: scroll(root block);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .tour-arc { display: none; }
        }

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
