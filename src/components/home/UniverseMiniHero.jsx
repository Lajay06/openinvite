/**
 * UniverseMiniHero — a full-viewport, cinematic photo moment between the
 * features carousel and UniverseTeaserSection. Entrance is staged rather
 * than a single fade: the photo scales down and settles into place first,
 * then the statement line lands.
 */
import { useRef, useState, useEffect } from "react";
import { responsivePhoto, HERO_SIZES } from "@/lib/marketingImage";

// This slot previously pointed at media.base44.com, put there by a
// base44-builder "Visual edits" commit (c534419) that replaced the Cloudinary
// URL with a Base44-hosted one. Three things came with that:
//   1. It shipped the 6720x4480 PRINT master as a raw 7.76 MB JPEG — no
//      resize, no format negotiation, no srcset — into a 100vh section. The
//      single heaviest asset on the site, in the exact shape the width cap
//      exists to prevent.
//   2. It duplicated the About hero photograph (ID3654) onto Home, against
//      IMAGE_MANIFEST.md's rule that no photo appears twice on the site.
//   3. Being off Cloudinary, it was invisible to every check we have.
// Restoring the original photograph (ID3960) from its own print master fixes
// all three. Verified the same frame before swapping, not assumed: the web
// export and the print master correlate 0.9986 with a mean pixel difference of
// 0.75/255 at matched size, and share an identical 1.5015 aspect.
const PHOTO = responsivePhoto("DTS_Caldo_Daniel_Far%C3%B2_Photos_ID3960_Print_iii9ub", 6529);

const EASE = "cubic-bezier(0.16,1,0.3,1)";
const prefersReduced = () =>
typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function UniverseMiniHero() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(prefersReduced());

  useEffect(() => {
    if (prefersReduced()) return;
    const obs = new IntersectionObserver(([e]) => {if (e.isIntersecting) {setVisible(true);obs.disconnect();}}, { threshold: 0.2 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      style={{
        position: "relative", width: "100%", height: "100vh", overflow: "hidden",
        display: "flex", alignItems: "center", justifyContent: "center"
      }}>
      
      <img src={PHOTO.src}
      srcSet={PHOTO.srcSet}
      sizes={HERO_SIZES}
      alt=""
      loading="lazy"
      style={{
        position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center",
        opacity: visible ? 1 : 0, transform: visible ? "scale(1)" : "scale(1.12)",
        transition: `opacity 1.6s ${EASE}, transform 2.2s ${EASE}`
      }} />
      

      <div style={{
        position: "relative", zIndex: 2, textAlign: "center", padding: "0 clamp(24px, 6vw, 80px)", maxWidth: 1100
      }}>
        <h2 style={{
          fontSize: "clamp(36px, 6vw, 72px)", fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.06,
          color: "#FFFFFF", margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif",
          // No dark overlay behind this photo anymore — a text-shadow (not
          // a full-bleed tint) keeps the headline legible against the
          // photo's lighter areas without dimming the image itself.
          textShadow: "0 2px 24px rgba(0,0,0,0.45)",
          opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(30px)",
          transition: `opacity 1s ${EASE} 0.7s, transform 1s ${EASE} 0.7s`
        }}>
          It's more than an invite. It's a whole universe.
        </h2>
      </div>
    </section>);

}