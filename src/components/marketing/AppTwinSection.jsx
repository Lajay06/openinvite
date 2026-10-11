/**
 * src/components/marketing/AppTwinSection.jsx
 *
 * THE APP SECTION AS A TWIN OF THE RED SECTION. Site fixes batch 3, items 1
 * to 3 (goals/2026-10-11-site-fixes-batch-3.md).
 *
 * The red section ("All the powerful tools...", ValuePropSection.jsx) is the
 * rule this copies, measured on production before the build:
 *
 *   height 100vh, overflow hidden, one photograph full bleed with cover;
 *   at 1440 the heading is clamp(26px, 4.17vw, 97px), weight 700, line height
 *   1.15, letter spacing -0.02em, white, in a box at left 5.56vw with a max
 *   width of 48.6vw, centered vertically; at 390 (768 and below) it is
 *   clamp(22px, 6vw, 40px), line height 1.2, with 24px side padding.
 *
 * So the section fits one screen at any width, with nothing to scroll: the
 * heading and copy on the left in that box, on a solid near-black field, and
 * one picture on the right, POOL_PARTY with the site's own phone inside it.
 * The photograph is busy edge to edge, so the type sits beside it rather than
 * on it; at 768 and below the text is on top and the picture fills the rest
 * of the screen under it.
 *
 * THE PHONE FITS THE HEIGHT, NEVER THE OTHER WAY. Its screen takes its height
 * from the section and its width from `aspect-ratio: 1320 / 2868`, the shape
 * of the recording (TOUR_PAGE_MEDIA['app-phone']), so the picture is reduced
 * to fit and never cropped or stretched; the delivery URLs carry no resize.
 * The frame is the generic CSS phone of batch 2 (AppPhoneMoment.jsx explains
 * why no manufacturer's frame is used): an even thin matte near-black bezel,
 * corners rounded to match, nothing else.
 *
 * NO TITLE BANNER. The Ava section keeps its own; this section opens on its
 * heading, as the red section does.
 */
import ProductVideo from "@/components/shared/ProductVideo";
import { TOUR_PAGE_MEDIA } from "@/lib/studioTour";
import { responsivePhoto } from "@/lib/marketingImage";

const PJS = "'Plus Jakarta Sans', sans-serif";
const PHOTO = responsivePhoto("DTS_POOL_PARTY_JELLY_LUISE_Photos_ID15749_om64j0", 1280);

/** The recording's own shape. The screen keeps it at every size. */
export const PHONE_ASPECT = "1320 / 2868";

// Film grain on the photograph only, as in batch 2.
const GRAIN = `url("data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 0.5 0 0 0 0 0.5 0 0 0 0 0.5 0 0 0 0.55 0"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>'
)}")`;

function Phone() {
  const take = TOUR_PAGE_MEDIA["app-phone"];
  return (
    <div data-app-phone-frame className="app-twin__frame">
      <div data-app-phone-screen className="app-twin__screen">
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
 * @param {{ heading: string, headingLevel?: 'h1' | 'h2', marker: string,
 *   children: React.ReactNode }} props  `marker` is the data attribute the
 *   page's guard finds the section by; the children are the copy under the
 *   heading.
 */
export default function AppTwinSection({ heading, headingLevel = "h2", marker, children }) {
  const H = headingLevel;
  return (
    <section data-app-twin {...{ [marker]: "" }} className="app-twin">
      <div className="app-twin__text">
        <H data-app-twin-heading className="app-twin__heading">{heading}</H>
        {children}
      </div>
      <div className="app-twin__picture">
      <img
        src={PHOTO.src}
        srcSet={PHOTO.srcSet}
        sizes="(min-width: 769px) 42vw, 100vw"
        alt=""
        aria-hidden="true"
        loading="lazy"
        className="app-twin__photo"
      />
      <div aria-hidden="true" className="app-twin__grain" style={{ backgroundImage: GRAIN }} />
      <div className="app-twin__phone"><Phone /></div>
      </div>
      <style>{`
        .app-twin { position: relative; width: 100%; height: 100vh; overflow: hidden; background: #0A0A0A; font-family: ${PJS}; box-sizing: border-box; }
        .app-twin__picture { position: absolute; overflow: hidden; }
        .app-twin__photo { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: 50% 60%; display: block; }
        .app-twin__grain { position: absolute; inset: 0; opacity: 0.35; mix-blend-mode: overlay; pointer-events: none; }
        .app-twin__phone { position: absolute; z-index: 1; }
        .app-twin__frame { position: absolute; top: 0; bottom: 0; left: 50%; transform: translateX(-50%); background: #141414; }
        .app-twin__screen { height: 100%; aspect-ratio: ${PHONE_ASPECT}; overflow: hidden; background: #FFFFFF; }
        .app-twin__text { position: absolute; z-index: 1; display: flex; flex-direction: column; }
        .app-twin__heading { margin: 0; color: #FFFFFF; font-weight: 700; letter-spacing: -0.02em; }
        .app-twin__copy { margin: 0; color: rgba(255,255,255,0.86); }
        .app-twin__small { margin: 0; color: rgba(255,255,255,0.6); }

        /* 768 and below, the red section's own breakpoint: the text on top,
           the picture with the phone filling the rest of the one screen. */
        .app-twin { display: flex; flex-direction: column; padding-top: 88px; }
        .app-twin__text { position: relative; padding: 0 24px; gap: 12px; }
        .app-twin__heading { font-size: clamp(22px, 6vw, 40px); line-height: 1.2; }
        .app-twin__copy { font-size: 15px; line-height: 24px; }
        .app-twin__small { font-size: 13px; line-height: 20px; }
        .app-twin__picture { position: relative; flex: 1 1 0; min-height: 0; margin-top: 24px; }
        .app-twin__phone { top: 24px; bottom: 24px; left: 0; right: 0; }
        .app-twin__frame { padding: 7px; border-radius: 34px; }
        .app-twin__screen { border-radius: 27px; }

        @media (min-width: 769px) {
          .app-twin { display: block; padding-top: 0; }
          /* The red section's text box: left 5.56vw, max width 48.6vw, centered. */
          .app-twin__text { position: absolute; top: 50%; left: 5.56vw; padding: 0; transform: translateY(-50%); max-width: 48.6vw; gap: 24px; }
          .app-twin__heading { font-size: clamp(26px, 4.17vw, 97px); line-height: 1.15; }
          .app-twin__copy { font-size: clamp(16px, 1.39vw, 24px); line-height: 1.6; max-width: 40vw; }
          .app-twin__small { font-size: clamp(13px, 0.97vw, 16px); line-height: 1.5; }
          /* One picture on the right, full height, the phone inside it. */
          .app-twin__picture { position: absolute; top: 0; bottom: 0; right: 0; width: 42vw; margin: 0; }
          .app-twin__phone { top: 112px; bottom: 48px; left: 0; right: 0; }
          .app-twin__frame { padding: 12px; border-radius: 56px; }
          .app-twin__screen { border-radius: 44px; }
        }
      `}</style>
    </section>
  );
}
