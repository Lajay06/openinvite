/**
 * /tour-preview — DISPOSABLE PROTOTYPE, not linked from anywhere.
 *
 * A split-screen scroll adventure the owner wants to feel on real content
 * before deciding whether it replaces /tour. It is deliberately additive:
 * Tour.jsx is untouched, and this route is noindex + nofollow, absent from
 * PublicNav, absent from scripts/marketingRoutes.mjs, so it is not prerendered
 * and not in the sitemap.
 *
 * The copy is lifted verbatim from Tour.jsx's SCENES so the owner is judging
 * the effect rather than new writing. It is duplicated rather than imported
 * because Tour.jsx does not export it and must not be modified.
 *
 * Four defects in the supplied reference are fixed here:
 *   1. Touch. The reference bound wheel + keydown only, so a phone was frozen
 *      on page one with no way out. Pointer/touch swipe is handled below.
 *   2. Exit. The reference capped currentPage at the last page inside an
 *      h-screen overflow-hidden box, which made the end cap, its CTA and the
 *      footer unreachable. Here the last page hands off to normal document
 *      scroll (see `released`).
 *   3. Reduced motion. The reference always hijacked. Under
 *      prefers-reduced-motion this renders plain stacked sections with no
 *      hijack and no slide.
 *   4. Listener scope. The reference bound wheel to window and re-registered
 *      on every currentPage change. Here it is bound to the section element,
 *      registered once, and reads the current page from a ref.
 */
import React, { useState, useRef, useEffect, useCallback } from "react";
import PublicNav from "@/components/public/PublicNav";
import PublicFooter from "@/components/public/PublicFooter";
import MarketingEndCap from "@/components/marketing/MarketingEndCap";

const PJS = "'Plus Jakarta Sans', sans-serif";
const DARK = "#0A0A0A";
const WHITE = "#FFFFFF";
const OFFWHITE = "#F5F5F3";
const SLIDE_MS = 1000;
const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";
const SWIPE_PX = 50;

const img = (id) =>
  `https://res.cloudinary.com/dsr84xknv/image/upload/f_auto,q_auto,w_1600,c_limit/${id}.jpg`;

/* Copy verbatim from Tour.jsx SCENES. `align` keeps the same alternation:
   "left" puts the photo on the left half, "right" puts it on the right. */
const PAGES = [
  { num: "01", label: "Daily update", copy: "Your wedding, today's priorities, and what's coming next, all waiting for you.", align: "left", bg: WHITE, photo: img("DTS_BEHIND_THE_SCENES_Shauna_Summers_Photos_ID8234_esice8") },
  { num: "02", label: "Ava", copy: "Like having a wedding planner in your pocket, only faster, smarter, and available 24/7.", align: "right", bg: OFFWHITE, photo: img("DTS_CURATIVE_Chris_Abatzis_Photos_ID7678_dlsgrm") },
  { num: "03", label: "Guest list", copy: "Track every RSVP, meal preference, and plus one without the spreadsheets.", align: "left", bg: DARK, photo: img("DTS_DECADENT_Debora_Spanhol_Photos_ID12475_viqbsz") },
  { num: "04", label: "Seating", copy: "Design your floor plan visually, drag guests into place, and let every table come together effortlessly.", align: "right", bg: WHITE, photo: img("DTS_Fine_Dining_Patrick_Chin_Photos_ID955_uoaegj") },
  { num: "05", label: "Budget", copy: "What you planned. What you spent. No surprises in month nine.", align: "left", bg: OFFWHITE, photo: img("DTS_Early_Honey_Moon_Tino_Renato_Photos_ID3565_ys7asa") },
  { num: "06", label: "Schedule", copy: "Build your entire wedding day with confidence, knowing every detail has its perfect place.", align: "right", bg: DARK, photo: img("DTS_Grand_Design_Daniel_Far%C3%B2_Photos_ID4152_auimyj") },
  { num: "07", label: "Universes", copy: "Choose your Universe and every touchpoint follows. One cohesive aesthetic from your first invitation to your final thank you.", align: "left", bg: WHITE, photo: img("DTS_Caldo_Daniel_Far%C3%B2_Photos_ID3960_av5mnb") },
  { num: "08", label: "Your site", copy: "Guests see this. They will remember it.", align: "right", bg: OFFWHITE, photo: img("DTS_BANDITS_PALI_MENDEZ_Photos_ID14229_mhwb5h") },
];
const LAST = PAGES.length - 1;

const prefersReduced = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* Scrim over the photo half. The number and label are white on photos that
   vary a lot, so this is measured rather than guessed, same method as
   #324/#334/#366. Worst-case (lightest) backdrop pixel across all eight
   photos, white text, AA 3:1 for the 88px number and 4.5:1 for the 15px label:
     0.30  label 2.71:1  fails
     0.40  label 3.62:1  fails
     0.50  label 4.86:1  passes
     0.55  label 5.62:1  passes  <- used, keeps margin on the lightest photo
   0.55 is above the end cap's 0.45 because these photos are brighter and the
   label is small text at 4.5:1, not large text at 3:1. */
const PHOTO_SCRIM = 0.55;

function PhotoHalf({ page }) {
  return (
    <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", background: DARK }}>
      <img
        src={page.photo}
        alt=""
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
      />
      <div style={{ position: "absolute", inset: 0, background: `rgba(0,0,0,${PHOTO_SCRIM})` }} />
      <div
        style={{
          position: "relative", height: "100%", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 12,
          padding: "0 clamp(20px, 4vw, 56px)", textAlign: "center",
        }}
      >
        <span style={{ fontFamily: PJS, fontSize: "clamp(48px, 7vw, 88px)", fontWeight: 700, color: WHITE, letterSpacing: "-0.03em", lineHeight: 1 }}>
          {page.num}
        </span>
        <span style={{ fontFamily: PJS, fontSize: 15, fontWeight: 600, color: WHITE, letterSpacing: "0.06em" }}>
          {page.label}
        </span>
      </div>
    </div>
  );
}

function CopyHalf({ page }) {
  const dark = page.bg === DARK;
  return (
    <div
      style={{
        width: "100%", height: "100%", background: page.bg,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "0 clamp(24px, 5vw, 72px)",
      }}
    >
      <p
        style={{
          fontFamily: PJS, fontSize: "clamp(22px, 2.4vw, 34px)", fontWeight: 600,
          lineHeight: 1.3, letterSpacing: "-0.02em", textAlign: "center", maxWidth: 520,
          color: dark ? WHITE : DARK, margin: 0,
        }}
      >
        {page.copy}
      </p>
    </div>
  );
}

export default function TourPreview() {
  const [reduced] = useState(prefersReduced);
  const [page, setPage] = useState(0);
  const [released, setReleased] = useState(false);
  const pageRef = useRef(0);
  const releasedRef = useRef(false);
  const animRef = useRef(false);
  const sectionRef = useRef(null);
  const liveRef = useRef(null);

  useEffect(() => {
    document.title = "Openinvite | Tour preview";
    let robots = document.querySelector('meta[name="robots"]');
    if (!robots) {
      robots = document.createElement("meta");
      robots.setAttribute("name", "robots");
      document.head.appendChild(robots);
    }
    robots.setAttribute("content", "noindex, nofollow");
    return () => robots && robots.setAttribute("content", "index, follow");
  }, []);

  const goTo = useCallback((next) => {
    if (animRef.current) return;
    animRef.current = true;
    pageRef.current = next;
    setPage(next);
    if (liveRef.current) {
      liveRef.current.textContent = `Section ${next + 1} of ${PAGES.length}: ${PAGES[next].label}`;
    }
    window.setTimeout(() => { animRef.current = false; }, SLIDE_MS);
  }, []);

  /* Returns true when the gesture was consumed (and should be prevented). */
  const handleDirection = useCallback((dir) => {
    if (releasedRef.current) return false;
    const cur = pageRef.current;
    if (dir > 0 && cur >= LAST) {
      // Defect 2: hand off to normal document scroll so the end cap and
      // footer are reachable. This is the conversion moment.
      releasedRef.current = true;
      setReleased(true);
      return false;
    }
    if (dir < 0 && cur <= 0) return false;   // let the page scroll back up
    goTo(cur + dir);
    return true;
  }, [goTo]);

  useEffect(() => {
    if (reduced) return;
    const el = sectionRef.current;
    if (!el) return;

    // Defect 4: scoped to the section, registered once, current page read
    // from a ref so this never re-registers.
    const onWheel = (e) => {
      if (Math.abs(e.deltaY) < 4) return;
      if (handleDirection(e.deltaY > 0 ? 1 : -1)) e.preventDefault();
    };

    // Defect 1: touch. Without this a phone has no wheel event and is stuck.
    let startY = null;
    const onTouchStart = (e) => { startY = e.touches[0].clientY; };
    const onTouchMove = (e) => {
      if (startY === null || releasedRef.current) return;
      // Prevent rubber-banding while the section still owns the gesture.
      if (Math.abs(e.touches[0].clientY - startY) > 8) e.preventDefault();
    };
    const onTouchEnd = (e) => {
      if (startY === null) return;
      const dy = startY - e.changedTouches[0].clientY;
      startY = null;
      if (Math.abs(dy) < SWIPE_PX) return;
      handleDirection(dy > 0 ? 1 : -1);
    };

    const onKey = (e) => {
      const down = ["ArrowDown", "PageDown", " "].includes(e.key);
      const up = ["ArrowUp", "PageUp"].includes(e.key);
      if (!down && !up) return;
      if (handleDirection(down ? 1 : -1)) e.preventDefault();
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    el.addEventListener("keydown", onKey);
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("keydown", onKey);
    };
  }, [reduced, handleDirection]);

  /* Defect 3: reduced motion gets plain stacked sections, no hijack. */
  if (reduced) {
    return (
      <div style={{ minHeight: "100vh", background: DARK, fontFamily: PJS }}>
        <PublicNav />
        {PAGES.map((p) => (
          <section key={p.num} style={{ display: "grid", gridTemplateColumns: "1fr", minHeight: "60vh" }}>
            <div style={{ minHeight: "40vh" }}><PhotoHalf page={p} /></div>
            <div style={{ minHeight: "40vh" }}><CopyHalf page={p} /></div>
          </section>
        ))}
        <MarketingEndCap
          image="https://res.cloudinary.com/dsr84xknv/image/upload/f_auto,q_auto/DTS_BANDITS_PALI_MENDEZ_Photos_ID14229_mhwb5h.jpg"
          alt="Friends celebrating together at a wedding party"
          title="All that. And we're still just getting started."
        />
        <PublicFooter />
      </div>
    );
  }

  return (
    <div style={{ background: DARK, fontFamily: PJS }}>
      <PublicNav />

      <section
        ref={sectionRef}
        tabIndex={0}
        aria-roledescription="carousel"
        aria-label="Product tour, section by section"
        style={{
          position: "relative",
          height: "100vh",
          overflow: "hidden",
          outline: "none",
          // Once released the section stops owning the gesture; the document
          // scrolls on to the end cap below.
          touchAction: released ? "auto" : "none",
        }}
      >
        {PAGES.map((p, i) => {
          // Incoming: left half rises from below, right half drops from above.
          // Outgoing continues in the same direction it was travelling.
          const state = i === page ? 0 : i < page ? -1 : 1;
          const leftY = state === 0 ? "0%" : state === -1 ? "-100%" : "100%";
          const rightY = state === 0 ? "0%" : state === -1 ? "100%" : "-100%";
          const photoLeft = p.align === "left";
          return (
            <div
              key={p.num}
              aria-hidden={i !== page}
              style={{ position: "absolute", inset: 0, display: "flex", zIndex: i === page ? 2 : 1, pointerEvents: i === page ? "auto" : "none" }}
            >
              <div className="tp-half" style={{ transform: `translateY(${leftY})`, transition: `transform ${SLIDE_MS}ms ${EASE}` }}>
                {photoLeft ? <PhotoHalf page={p} /> : <CopyHalf page={p} />}
              </div>
              <div className="tp-half" style={{ transform: `translateY(${rightY})`, transition: `transform ${SLIDE_MS}ms ${EASE}` }}>
                {photoLeft ? <CopyHalf page={p} /> : <PhotoHalf page={p} />}
              </div>
            </div>
          );
        })}

        {/* Progress, and the screen-reader announcement target. */}
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 24, display: "flex", justifyContent: "center", gap: 8, zIndex: 5, pointerEvents: "none" }}>
          {PAGES.map((p, i) => (
            <span key={p.num} style={{ width: i === page ? 22 : 6, height: 6, borderRadius: 999, background: i === page ? "#E03553" : "rgba(255,255,255,0.55)", transition: "width 0.4s ease, background 0.4s ease" }} />
          ))}
        </div>
        <div ref={liveRef} aria-live="polite" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap" }} />

        <style>{`.tp-half { width: 50%; height: 100%; will-change: transform; }`}</style>
      </section>

      <MarketingEndCap
        image="https://res.cloudinary.com/dsr84xknv/image/upload/f_auto,q_auto/DTS_BANDITS_PALI_MENDEZ_Photos_ID14229_mhwb5h.jpg"
        alt="Friends celebrating together at a wedding party"
        title="All that. And we're still just getting started."
      />
      <PublicFooter />
    </div>
  );
}
