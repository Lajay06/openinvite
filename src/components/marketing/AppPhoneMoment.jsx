/**
 * src/components/marketing/AppPhoneMoment.jsx
 *
 * THE APP, ON A PHONE OF OUR OWN. Site fixes batch 2, item 1 (owner rulings
 * 2026-10-10).
 *
 * A generic phone drawn here in CSS: an even, thin, matte near-black bezel on
 * all four sides, corners rounded to match, and nothing else. No notch, no
 * island, no buttons, no camera, no logo, and no maker's proportions: no
 * manufacturer's frame is used, because Apple's Design Resources licence (2A
 * and 2B) excludes website use and software that is not Apple-only, and
 * Samsung's developer terms are personal and non-commercial. When the app runs
 * on a phone, the owner's own photograph of a real iPhone running it, per
 * Apple's marketing guidelines, replaces this frame.
 *
 * THE SCREEN IS THE REAL RECORDING AT ITS OWN SHAPE. The daily update was
 * recorded at a 440 by 956 viewport at 3x, a 1320 by 2868 video
 * (TOUR_PAGE_MEDIA['app-phone'] in src/lib/studioTour.js), and the screen
 * opening is an exact fraction of that, so the picture fills it with nothing
 * cropped or stretched: a quarter on / and /features, a third on /app, a sixth
 * on a phone. The poster still is a frame of the same recording, shown before
 * the video loads and under prefers-reduced-motion (ProductVideo).
 *
 * BEHIND IT, POOL_PARTY #15749, full bleed, with film grain on the photograph
 * only: the grain layer sits between the photo and everything above it. The
 * phone stands over the quiet blue on the left of the frame; the copy sits
 * beside it on a solid panel, never on the phone or the photo.
 */
import ProductVideo from "@/components/shared/ProductVideo";
import { TOUR_PAGE_MEDIA } from "@/lib/studioTour";
import { responsivePhoto } from "@/lib/marketingImage";

const PHOTO = responsivePhoto("DTS_POOL_PARTY_JELLY_LUISE_Photos_ID15749_om64j0", 1280);

/** Screen sizes, CSS px: each an exact fraction of the 1320 by 2868 recording. */
export const SCREENS = {
  md: { width: 330, height: 717, bezel: 12 },   // 1/4
  lg: { width: 440, height: 956, bezel: 12 },   // 1/3
  sm: { width: 220, height: 478, bezel: 8 },    // 1/6
};

// Film grain, as an SVG turbulence tile. On the photograph only.
const GRAIN = `url("data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 0.5 0 0 0 0 0.5 0 0 0 0 0.5 0 0 0 0.55 0"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>'
)}")`;

const radius = ({ width, bezel }) => Math.round(width * 0.16) + bezel;
const frameCss = (cls, sc) => `.${cls} { width: ${sc.width + sc.bezel * 2}px; height: ${sc.height + sc.bezel * 2}px; padding: ${sc.bezel}px; border-radius: ${radius(sc)}px; }
  .${cls} > [data-app-phone-screen] { width: ${sc.width}px; height: ${sc.height}px; border-radius: ${radius(sc) - sc.bezel}px; }`;

/** One phone; its size comes from the classes below, by breakpoint. */
function Phone({ size }) {
  const take = TOUR_PAGE_MEDIA["app-phone"];
  return (
    <div data-app-phone-frame className={`app-phone app-phone--${size}`} style={{ background: "#141414", boxSizing: "border-box", flexShrink: 0 }}>
      <div data-app-phone-screen style={{ overflow: "hidden", background: "#FFFFFF" }}>
        {take && (
          <ProductVideo
            mp4={take.mp4}
            webm={take.webm}
            poster={take.poster}
            alt="The daily update in the Openinvite app on a phone"
          />
        )}
      </div>
    </div>
  );
}

/**
 * @param {{ size?: 'md' | 'lg', marker?: string, children: React.ReactNode }}
 *   props  `lg` on /app, which runs the phone larger; `marker` is a data
 *   attribute the page's guard finds the section by; the copy is whatever the
 *   page sets beside the phone.
 */
export default function AppPhoneMoment({ size = "md", marker, children }) {
  return (
    <section data-app-moment {...(marker ? { [marker]: "" } : {})} style={{ position: "relative", overflow: "hidden", background: "#0A0A0A" }}>
      <img
        src={PHOTO.src}
        srcSet={PHOTO.srcSet}
        sizes="100vw"
        alt=""
        aria-hidden="true"
        loading="lazy"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "0% 96%" }}
      />
      <div aria-hidden="true" style={{ position: "absolute", inset: 0, backgroundImage: GRAIN, opacity: 0.35, mixBlendMode: "overlay", pointerEvents: "none" }} />
      <div className={`app-moment-grid app-moment-grid--${size}`} style={{ position: "relative", maxWidth: 1200, margin: "0 auto" }}>
        <Phone size={size} />
        <div className="app-moment-copy" style={{ background: "#0A0A0A" }}>
          {children}
        </div>
      </div>
      <style>{`
        .app-moment-grid { display: grid; grid-template-columns: 1fr; padding: 80px 24px; gap: 40px; justify-items: center; }
        ${frameCss('app-phone', SCREENS.sm)}
        .app-moment-copy { padding: 32px 24px; width: 100%; box-sizing: border-box; }
        @media (min-width: 900px) {
          .app-moment-grid { grid-template-columns: auto minmax(0, 1fr); align-items: center; gap: 96px; padding: 120px clamp(32px, 6vw, 80px); justify-items: start; }
          .app-moment-grid--md { padding-left: clamp(48px, 9vw, 140px); }
          .app-moment-grid--lg { padding-left: clamp(48px, 7vw, 120px); }
          ${frameCss('app-phone--md', SCREENS.md)}
          ${frameCss('app-phone--lg', SCREENS.lg)}
          .app-moment-copy { padding: 48px; max-width: 560px; }
        }
      `}</style>
    </section>
  );
}
