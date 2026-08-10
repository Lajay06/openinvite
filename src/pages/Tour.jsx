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

// `bg` is the scene's theme and is the ONLY thing that decides its ink. It is
// declared per scene rather than derived from array position, which is what the
// arc did — and that derivation is exactly how `SCENES.slice(4)` silently
// re-themed the back half when its index restarted at 0. Stating the theme on
// the data makes that class of bug unrepresentable rather than merely fixed.
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

// ── PER-SECTION THEMES ────────────────────────────────────────────
// Each scene owns a theme (WHITE / OFFWHITE / DARK, the pre-#382 rhythm) and
// the change between them CROSS-FADES rather than hard-cutting. This replaces
// the scroll-linked arc, which interpolated the background continuously and
// therefore had to pass through a mid-grey where neither ink reached AA. There
// is no continuous interpolation here and no mid-grey dwell: the background
// holds one of three exact values and only moves between them for
// THEME_MS on a boundary.
//
// Mechanism: ONE fixed full-viewport layer carries the color and a CSS
// transition on background-color does the dissolve; sections are transparent
// and simply declare which theme is theirs. Per-section backgrounds cannot
// cross-fade — a color change that travels through SPACE as you scroll is a
// hard edge scrolling past, which is what we had before. A dissolve has to
// happen in TIME on a shared surface.
//
// The trigger is the viewport midline (IntersectionObserver, -50%/-50%), so a
// scene takes the theme as it passes the middle of the screen. That places the
// change on the 160px padding gap between sections rather than across a block
// of text wherever possible.
const THEME_MS = 400;

// Solid ink only. No alpha: alpha is what put the old scene number at 3.77:1.
// Keyed off the scene's own theme, not its index.
const ink = (bg) =>
  bg === DARK
    ? { heading: "#FFFFFF", number: "#FFFFFF", meta: "rgba(255,255,255,0.72)" }
    : { heading: "#0A0A0A", number: "#0A0A0A", meta: "rgba(10,10,10,0.72)" };

// Both rings together: the light one carries on dark backgrounds, the dark one
// on light backgrounds, and mid-dissolve both are partly visible. A single
// border in either color disappears against one of the three themes.
//
// Alphas solved, not guessed, against the 3:1 non-text minimum (WCAG 1.4.11).
// These were derived for the arc's worst frame, which was a mid-grey around
// #8A7F82 — a background this page no longer produces. That makes the pair
// strictly more conservative than it now needs to be, so it is kept as-is:
// re-solving could only loosen it, and it already passes on all three themes.
//   light 0.50 / dark 0.32  ->  1.99:1   (first attempt, FAILED)
//   light 0.60 / dark 0.60  ->  2.71:1   fails
//   light 0.60 / dark 0.80  ->  3.16:1   passes
//   light 0.70 / dark 0.80  ->  3.38:1   passes  <- used
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

function Scene({ scene }) {
  const [ref, visible] = useReveal(0.2);
  const frameRef = useRef(null);
  const imageRef = useRef(null);
  useParallaxFallback(frameRef, imageRef);

  const dark = scene.bg === DARK;
  const c = ink(scene.bg);
  const isRight = scene.align === "right";
  const reduced = prefersReduced();

  // Frame settles first, commentary follows ~100ms later.
  const frameTransition = reduced ? "none" : `opacity 0.7s ${EASE}, transform 0.7s ${EASE}`;
  const copyTransition = reduced ? "none" : `opacity 0.7s ${EASE} 0.1s, transform 0.7s ${EASE} 0.1s`;

  return (
    <section
      ref={ref}
      // The theme layer reads this to know what to fade to as the section
      // crosses the viewport midline.
      data-tour-bg={scene.bg}
      // Section padding and container width copied from Features.jsx's
      // SeatingSection/BudgetSection, not approximated.
      // Transparent so the fixed theme layer shows through. Under reduced
      // motion there is no theme layer, so the section paints its own color
      // directly — same three-theme rhythm, nothing animating.
      style={{
        background: reduced ? scene.bg : "transparent",
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
          {/* No color transition on this ink, deliberately. A scene's theme
              never changes, so its ink never changes, so a `transition: color`
              here could never fire — it would be decoration that reads as a
              feature. What actually needs handling is the opposite case: while
              the shared layer dissolves A->B, THIS section's ink is still
              correct for its own theme but the backdrop behind it is briefly
              between two. That is a placement problem, solved by triggering on
              the midline so the change lands in the 160px padding gap, and it
              is measured rather than assumed — see the PR. */}
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

  // Drive the theme layer discretely: whichever themed section is crossing the
  // viewport midline owns the background. No scroll listener and no rAF — the
  // observer fires only at boundaries, and the dissolve itself is a CSS
  // transition the compositor runs.
  //
  // rootMargin -50%/-50% collapses the root box to a single line at the middle
  // of the viewport, so "intersecting" means "this section covers the midline"
  // and at most one section qualifies. Between sections — the photo pair, the
  // hero, the end cap — nothing fires and the last theme simply persists,
  // which is what those full-bleed blocks want anyway.
  useEffect(() => {
    if (reducedMotion) return;
    const layer = document.querySelector(".tour-theme");
    const sections = document.querySelectorAll("[data-tour-bg]");
    if (!layer || !sections.length) return;

    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) layer.style.backgroundColor = e.target.dataset.tourBg;
        }
      },
      { rootMargin: "-50% 0px -50% 0px", threshold: 0 }
    );
    sections.forEach((s) => obs.observe(s));
    return () => obs.disconnect();
  }, [reducedMotion]);

  return (
    // Transparent, not DARK: the arc layer sits at z-index -1, so an opaque
    // background here paints straight over it and the arc never shows. The
    // dark fallback lives on the arc layer's own initial color instead.
    <div className="tour-page" style={{ minHeight: "100vh", position: "relative" }}>
      {/* The theme layer. ONE fixed full-viewport surface: the dissolve has to
          happen in time on a shared surface, because a color change that
          travels through space as you scroll is just a hard edge scrolling
          past. Under prefers-reduced-motion this layer is not rendered and
          each section paints its own static color instead — same rhythm,
          nothing animating. */}
      {!reducedMotion && <div className="tour-theme" aria-hidden="true" />}
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

      {/* No index passed. Theme comes from `scene.bg`, so slicing the array
          cannot re-theme anything — see the SCENES comment. */}
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

      {/* This slice used to need an explicit `index={i + 4}`, because `i`
          restarts at 0 here and the index decided the ink — without the offset
          all eight scenes took the light-background ink. That offset is gone
          rather than kept: the theme now travels on the scene object, so the
          bug it patched can no longer be expressed. */}
      {SCENES.slice(4).map((scene) => (
        <Scene key={scene.num} scene={scene} />
      ))}

      <MarketingEndCap
        image={END_CAP.src}
        srcSet={END_CAP.srcSet}
        alt="Friends celebrating together at a wedding party"
        title="All that. And we're still just getting started."
      />

      <PublicFooter />

      <style>{`
        /* ── PER-SECTION THEME LAYER ───────────────────────────────────
           One fixed surface. The dissolve is this single transition; there
           is no keyframe track and no scroll timeline, so the background is
           only ever one of the three exact theme colors or briefly between
           two of them. */
        /* z-index 0, NOT -1. This is load-bearing and survives the arc it was
           written for: at -1 the layer paints behind the whole stacking
           context, and the app shell renders an opaque white div between this
           page and <body> that covered it completely. Lifting the layer to 0
           and every sibling to 1 keeps it local to this page — no ancestor
           background has to be touched. */
        .tour-page > * { position: relative; z-index: 1; }
        .tour-theme {
          position: fixed;
          inset: 0;
          z-index: 0 !important;
          /* Scene 01's theme, so the first paint already matches rather than
             dissolving from an arbitrary color on load. */
          background-color: #FFFFFF;
          pointer-events: none;
          transition: background-color ${THEME_MS}ms linear;
        }
        /* linear, not an ease: an eased dissolve spends its slow tail near the
           midpoint, which is precisely the frame where contrast is weakest.
           Linear crosses that region at constant speed and minimises time
           spent there. */
        @media (prefers-reduced-motion: reduce) {
          .tour-theme { display: none; }
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
