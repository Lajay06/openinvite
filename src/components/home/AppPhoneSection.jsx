/**
 * src/components/home/AppPhoneSection.jsx
 *
 * THE APP, ON THE HOME PAGE. Item 1 of goals/2026-10-10-app-on-the-marketing-site.md.
 *
 * A phone showing the daily update, and the owner's copy beside it. The
 * picture is a still from the studio tour's own 390 recording of the daily
 * update (MEDIA.welcome.phone.poster, the frame at 1.0s), from the rich
 * recording fixture, so it is the product and not a mockup. One still, not a
 * loop, so the block adds a single small image to the page.
 *
 * NO BADGE AND NO STORE LINK. The app is not in either store yet, so where a
 * badge would go there is the plain store line, with no link. The official
 * badges arrive with the store links, in a later change.
 *
 * Sits between the Ava spotlight and pricing, and takes the spotlight's
 * background, side padding, width and heading type, so it reads as part of
 * the same dark run rather than a new section style. No new colors: the body
 * ink is the one Tour.jsx uses on dark, the store line the spotlight's muted
 * gray.
 *
 * WHOLE-PIXEL HEIGHTS, ON PURPOSE. The phone is 300 by 650 rather than the
 * recording's exact 390:844 (649.23px at this width, a crop well under a
 * pixel), and the text lines are set in whole pixels. A fractional section
 * height moved the footer below it onto a half pixel, and test:logo-lockup,
 * which reads the footer logo's pixels at 2x, measured the wordmark a pixel
 * short and failed. The layout is what changed, so the layout is what holds
 * it, not the guard.
 */
import ProductMediaFrame from "@/components/shared/ProductMediaFrame";
import { MEDIA } from "@/lib/studioTour";

const PJS = "'Plus Jakarta Sans', sans-serif";
export const APP_STORE_LINE = "Coming to the App Store and Google Play at launch.";

export default function AppPhoneSection() {
  const still = MEDIA.welcome?.phone?.poster;
  return (
    <section
      data-home-app
      // Top padding 0: the Ava spotlight above ends on its own divider and
      // 120px of padding, so this block starts where its rows would.
      style={{ background: "#0A0A0A", padding: "0 clamp(24px, 6vw, 80px) 120px" }}
    >
      <div className="home-app-grid" style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gap: 56, alignItems: "center" }}>
        <div className="home-app-phone">
          <ProductMediaFrame aspectRatio="300/650" maxWidth={300} dark style={{ border: "1px solid rgba(255,255,255,0.12)" }}>
            {still && (
              <img
                src={still}
                alt="The daily update in the Openinvite app on a phone"
                loading="lazy"
                width={390}
                height={844}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            )}
          </ProductMediaFrame>
        </div>
        <div>
          <h2 style={{
            fontSize: "clamp(32px, 3.33vw, 48px)", fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.125,
            color: "#FFFFFF", margin: "0 0 24px", fontFamily: PJS,
          }}>
            The whole planner, in your pocket.
          </h2>
          <p style={{ fontSize: 18, lineHeight: "30px", color: "rgba(255,255,255,0.72)", margin: "0 0 24px", fontFamily: PJS, maxWidth: 560 }}>
            Plan on the train, on the couch, in the queue for coffee. The guest list, the budget, the seating chart and Ava are all on your phone, and a reply from a guest reaches you the moment it lands. Your guests never need the app; they open a link.
          </p>
          <p data-app-store-line style={{ fontSize: 14, lineHeight: "22px", color: "rgba(255,255,255,0.5)", margin: 0, fontFamily: PJS }}>
            {APP_STORE_LINE}
          </p>
        </div>
      </div>
      <style>{`
        .home-app-grid { grid-template-columns: 1fr; }
        .home-app-phone { justify-self: center; width: 100%; max-width: 300px; }
        @media (min-width: 900px) {
          .home-app-grid { grid-template-columns: minmax(0, 300px) minmax(0, 1fr); gap: 96px; }
        }
      `}</style>
    </section>
  );
}
