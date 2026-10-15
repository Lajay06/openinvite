/**
 * src/components/marketing/FeaturesAppSection.jsx
 *
 * THE APP ON THE FEATURES PAGE, AS ONE ROW OF THE FEATURE ROWS. Batch 3
 * amendment B (goals/2026-10-11-site-fixes-batch-3.md): the owner rejected
 * the phone mockup, so this is a row like Quick start and Dashboard above it,
 * on their height rule (min-height 100vh at lg) and their gutters, and it
 * keeps the page's alternation: Dashboard has its picture on the right, so
 * this row has its picture on the left. On a phone the picture comes first,
 * as it does in the rows around it, at 4:5.
 *
 * THE PHOTOGRAPH is Death to Stock's STAYCATION set (ID 3369), licensed to
 * the owner and in the Openinvite Cloudinary account, served like the other
 * marketing photographs: f_auto and q_auto at 800, 1200 and 1600 wide, framed
 * with object-position, not a Cloudinary gravity crop. No radius, as the rows
 * around it have none.
 *
 * /app renders the same row as its hero (batch 3, owner ruling 2026-10-11),
 * with the heading as the page's h1.
 *
 * Copy is the owner's, verbatim, each line checked against the product before
 * it shipped. One line is held back: "Replies land on your phone as guests
 * tap them." The app has no push yet (MOBILE_APP.md, "What real push needs"),
 * and in the app a reply appears within a minute only while it is open, so
 * the line could not be stood behind. It returns when push does.
 */
import FeatureSectionHeading, { featureBodyTextStyle } from "@/components/home/FeatureSectionHeading";

const CLOUD = "https://res.cloudinary.com/dsr84xknv/image/upload";
export const FEATURES_APP_PHOTO_ID = "DTS_STAYCATION_Mathew_Addington_Photos_ID3369_l8e9dm";
const photoUrl = (w) => `${CLOUD}/f_auto,q_auto,w_${w},c_limit/${FEATURES_APP_PHOTO_ID}.jpg`;
export const FEATURES_APP_SRCSET = [1600, 1200, 800].map((w) => `${photoUrl(w)} ${w}w`).join(", ");
export const FEATURES_APP_ALT = "A woman lies on her bed, phone in both hands, reading.";

export const APP_STORE_LINE = "Coming to the App Store and Google Play at launch.";
export const APP_DESKTOP_LINE = "You design your Guest Suite on a desktop, where the space is; everything else is yours wherever you are.";
export const FEATURES_APP_HEADING = "Everything, on your phone";
export const FEATURES_APP_LINES = [
  "Add a guest from the car park; it is on your computer before you are back inside.",
  "Check the budget in the queue, not at the desk.",
  "The seating chart in your hand at the venue walk-through.",
];

const PANEL = "#F6F2EC";
const INK = "#1C1916";

/** @param {{ headingLevel?: 'h1' | 'h2' }} props  h1 on /app, where the row is the page's hero. */
export default function FeaturesAppSection({ headingLevel = "h2" }) {
  return (
    <section data-app-phones data-feature-row="picture-left" style={{ background: PANEL, minHeight: "100vh", display: "flex", overflow: "hidden" }} className="flex-col lg:flex-row">
      <div data-feature-row-picture className="w-full lg:w-1/2 order-1" style={{ position: "relative", minHeight: 320, overflow: "hidden", flexShrink: 0 }}>
        <img
          src={photoUrl(1600)}
          srcSet={FEATURES_APP_SRCSET}
          sizes="(min-width: 1024px) 50vw, 100vw"
          alt={FEATURES_APP_ALT}
          loading="lazy"
          data-features-app-photo
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "55% 40%", display: "block" }}
        />
        {/* 4:5 on a phone, where the rows around it stack picture first. */}
        <div className="lg:hidden" style={{ paddingBottom: "125%", position: "relative" }} />
      </div>
      <div data-feature-row-text className="w-full lg:w-1/2 order-2 flex items-center" style={{ padding: "80px clamp(32px, 5vw, 64px)", background: PANEL }}>
        <div style={{ maxWidth: 552 }}>
          <FeatureSectionHeading as={headingLevel} color={INK}>{FEATURES_APP_HEADING}</FeatureSectionHeading>
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {FEATURES_APP_LINES.map((line, i) => (
              <li key={line} data-app-line style={{ padding: "11px 0", borderBottom: i < FEATURES_APP_LINES.length - 1 ? "1px solid rgba(28,25,22,0.12)" : "none", color: INK, fontSize: 14, lineHeight: 1.5 }}>
                {line}
              </li>
            ))}
          </ul>
          <p data-app-desktop-line style={{ ...featureBodyTextStyle, color: INK, margin: "32px 0 0" }}>{APP_DESKTOP_LINE}</p>
        </div>
      </div>
    </section>
  );
}
