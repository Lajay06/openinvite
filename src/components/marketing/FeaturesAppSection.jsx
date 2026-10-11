/**
 * src/components/marketing/FeaturesAppSection.jsx
 *
 * THE APP ON THE FEATURES PAGE. Site fixes batch 3, item 2
 * (goals/2026-10-11-site-fixes-batch-3.md): no title banner, the red
 * section's shape and height rule (AppTwinSection.jsx), and the dark box the
 * section had, now carrying the heading, the lines and the desktop sentence.
 *
 * Copy is the owner's, verbatim, each line checked against the product before
 * it shipped. One line was held back: "Replies land on your phone as guests
 * tap them." The app has no push yet (MOBILE_APP.md, "What real push needs"),
 * and in the app a reply appears within a minute only while it is open, so
 * the line could not be stood behind. It returns when push does.
 *
 * NO BADGE AND NO STORE LINK: the store line is text.
 */
import AppTwinSection from "@/components/marketing/AppTwinSection";
import { APP_DESKTOP_LINE, APP_STORE_LINE } from "@/components/marketing/AppPhones";

export const FEATURES_APP_HEADING = "Everything, on your phone";
export const FEATURES_APP_LINES = [
  "Add a guest from the car park; it is on your computer before you are back inside.",
  "Check the budget in the queue, not at the desk.",
  "The seating chart in your hand at the venue walk-through.",
];

export default function FeaturesAppSection() {
  return (
    <AppTwinSection heading={FEATURES_APP_HEADING} marker="data-app-phones" variant="box">
      <ul className="app-twin__lines">
        {FEATURES_APP_LINES.map((line) => (
          <li key={line} data-app-line className="app-twin__line">{line}</li>
        ))}
      </ul>
      <p data-app-desktop-line className="app-twin__copy app-twin__desktop">{APP_DESKTOP_LINE}</p>
      <p data-app-store-line className="app-twin__small">{APP_STORE_LINE}</p>
    </AppTwinSection>
  );
}
