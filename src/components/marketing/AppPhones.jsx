/**
 * src/components/marketing/AppPhones.jsx
 *
 * THE APP, SHOWN: three phones, five lines, the desktop sentence and the store
 * line. Items 2 and 4 of goals/2026-10-10-app-on-the-marketing-site.md; the
 * Features page and /app render the same block, so the copy lives once.
 *
 * Copy is the owner's, verbatim, with two owner rulings of 2026-10-10: the
 * seating line reads "The seating chart, wherever you are." (the seating
 * canvas has no touch dragging and tells a phone to use a larger screen), and
 * the three phones are the daily update, the guest list and the budget, the
 * budget standing in for seating for the same reason.
 *
 * The phones are real product from the rich recording fixture at 390
 * (STILLS in src/lib/studioTour.js), with no drawn cursor. The guest list
 * still shows a reply that came in today: the top household's reply details
 * with the guest's name and today's Responded date, the table cropped to its
 * Event and Responded columns (owner ruling 2026-10-10), because the product
 * has no "new reply" marker and that date is how it shows one.
 *
 * NO BADGE AND NO STORE LINK until the owner supplies the links: the store
 * line is text.
 */
import ProductMediaFrame from "@/components/shared/ProductMediaFrame";
import { STILLS } from "@/lib/studioTour";

const PJS = "'Plus Jakarta Sans', sans-serif";

export const APP_STORE_LINE = "Coming to the App Store and Google Play at launch.";
export const APP_HEADING = "Everything, on your phone";
export const APP_LINES = [
  "The morning page that tells you what today needs.",
  "The guest list, with replies arriving as they happen.",
  "The seating chart, wherever you are.",
  "The budget, with every vendor payment and what is still owed.",
  "Ava on every page, at any hour.",
];
export const APP_DESKTOP_LINE = "You design your guest suite on a desktop, where the space is; everything else is yours wherever you are.";

const PHONES = [
  { key: "daily-update", alt: "The daily update in the Openinvite app on a phone" },
  { key: "guests-reply", alt: "A guest's reply, received today, in the Openinvite app on a phone" },
  { key: "budget", alt: "The budget in the Openinvite app on a phone" },
];

/**
 * @param {{ headingLevel?: 'h1' | 'h2', showStoreLine?: boolean }} props  h1 on
 *   /app, where this is the page; h2 on Features, where it is one section of
 *   many. /app places the store line itself, after "Do my guests need it?".
 */
export default function AppPhones({ headingLevel = "h2", showStoreLine = true }) {
  const Heading = headingLevel;
  return (
    <section data-app-phones style={{ background: "#0A0A0A", padding: "120px clamp(24px, 6vw, 80px)" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <Heading style={{
          fontSize: "clamp(32px, 3.33vw, 48px)", fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.125,
          color: "#FFFFFF", margin: "0 0 64px", fontFamily: PJS, textAlign: "center",
        }}>
          {APP_HEADING}
        </Heading>
        <div className="app-phones-row">
          {PHONES.map((p) => (
            <div key={p.key} className="app-phones-phone">
              {/* 240 by 520: the 390:844 shape held to whole pixels, so the
                  page below never lands on a half pixel. */}
              <ProductMediaFrame aspectRatio="240/520" maxWidth={240} dark style={{ border: "1px solid rgba(255,255,255,0.12)" }}>
                <img
                  src={STILLS[p.key]}
                  alt={p.alt}
                  loading="lazy"
                  width={390}
                  height={844}
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
              </ProductMediaFrame>
            </div>
          ))}
        </div>
        <ul style={{ listStyle: "none", padding: 0, margin: "64px auto 0", maxWidth: 640, display: "flex", flexDirection: "column", gap: 0 }}>
          {APP_LINES.map((line) => (
            <li key={line} data-app-line style={{
              fontSize: 18, lineHeight: "30px", color: "#FFFFFF", fontFamily: PJS,
              padding: "16px 0", borderTop: "1px solid rgba(255,255,255,0.08)",
            }}>
              {line}
            </li>
          ))}
        </ul>
        <p data-app-desktop-line style={{ fontSize: 18, lineHeight: "30px", color: "rgba(255,255,255,0.72)", fontFamily: PJS, margin: "32px auto 0", maxWidth: 640 }}>
          {APP_DESKTOP_LINE}
        </p>
        {showStoreLine && (
          <p data-app-store-line style={{ fontSize: 14, lineHeight: "22px", color: "rgba(255,255,255,0.5)", fontFamily: PJS, margin: "24px auto 0", maxWidth: 640 }}>
            {APP_STORE_LINE}
          </p>
        )}
      </div>
      <style>{`
        .app-phones-row { display: grid; grid-template-columns: 1fr; gap: 40px; justify-items: center; }
        .app-phones-phone { width: 100%; max-width: 240px; }
        @media (min-width: 900px) {
          .app-phones-row { grid-template-columns: repeat(3, minmax(0, 240px)); justify-content: center; gap: 56px; }
        }
      `}</style>
    </section>
  );
}
