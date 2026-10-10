/**
 * src/components/marketing/AppPhones.jsx
 *
 * THE APP, SHOWN: the title banner, then the phone moment with the five lines,
 * the desktop sentence and the store line beside the phone. Items 2 and 4 of
 * goals/2026-10-10-app-on-the-marketing-site.md, redone in site fixes batch 2;
 * the Features page and /app render the same block (/app larger), so the copy
 * lives once.
 *
 * Copy is the owner's, verbatim, with the 2026-10-10 seating ruling: the line
 * reads "The seating chart, wherever you are." (the seating canvas has no
 * touch dragging and tells a phone to use a larger screen).
 *
 * The phone is the site's own (AppPhoneMoment.jsx), playing the real daily
 * update at 1320 by 2868; batch 1's three stills are gone from these pages.
 *
 * NO BADGE AND NO STORE LINK until the owner supplies the links: the store
 * line is text.
 */
import TitleBanner from "@/components/marketing/TitleBanner";
import AppPhoneMoment from "@/components/marketing/AppPhoneMoment";

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


/**
 * @param {{ headingLevel?: 'h1' | 'h2', showStoreLine?: boolean }} props  h1 on
 *   /app, where this is the page; h2 on Features, where it is one section of
 *   many. /app places the store line itself, after "Do my guests need it?".
 */
export default function AppPhones({ headingLevel = "h2", showStoreLine = true, size = "md" }) {
  return (
    <>
    {/* The heading is the banner (batch 2, item 2): the Ava section's
        structure, a gradient band with one line, then the section. */}
    <TitleBanner as={headingLevel}>{APP_HEADING}</TitleBanner>
    {/* The phone moment (batch 2, item 1): the site's own phone playing the
        real daily update over POOL_PARTY, the five lines beside it. */}
    <AppPhoneMoment size={size} marker="data-app-phones">
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 0 }}>
        {APP_LINES.map((line) => (
          <li key={line} data-app-line style={{
            fontSize: 18, lineHeight: "30px", color: "#FFFFFF", fontFamily: PJS,
            padding: "14px 0", borderTop: "1px solid rgba(255,255,255,0.08)",
          }}>
            {line}
          </li>
        ))}
      </ul>
      <p data-app-desktop-line style={{ fontSize: 16, lineHeight: "26px", color: "rgba(255,255,255,0.72)", fontFamily: PJS, margin: "24px 0 0" }}>
        {APP_DESKTOP_LINE}
      </p>
      {showStoreLine && (
        <p data-app-store-line style={{ fontSize: 14, lineHeight: "22px", color: "rgba(255,255,255,0.5)", fontFamily: PJS, margin: "20px 0 0" }}>
          {APP_STORE_LINE}
        </p>
      )}
    </AppPhoneMoment>
    </>
  );
}
