/**
 * src/components/home/AppPhoneSection.jsx
 *
 * THE APP, ON THE HOME PAGE. Site fixes batch 3, item 1
 * (goals/2026-10-11-site-fixes-batch-3.md): no title banner, and the section
 * is a twin of the red section above it, one screen tall at every width,
 * the heading and copy on the left and the site's own phone on the right
 * (src/components/marketing/AppTwinSection.jsx).
 *
 * Copy is the owner's, verbatim. NO BADGE AND NO STORE LINK: the small line
 * is text.
 */
import AppTwinSection from "@/components/marketing/AppTwinSection";

export const HOME_APP_HEADING = "The whole planner, in your pocket.";
export const HOME_APP_BODY = "Plan on the train, on the couch, in the queue for coffee. Your guest list, budget and seating chart on your phone and your computer, always the same wedding.";
export const HOME_APP_SMALL = "iPhone and Android. Coming at launch.";

export default function AppPhoneSection() {
  return (
    <AppTwinSection heading={HOME_APP_HEADING} marker="data-home-app">
      <p data-app-body className="app-twin__copy">{HOME_APP_BODY}</p>
      <p data-app-store-line className="app-twin__small">{HOME_APP_SMALL}</p>
    </AppTwinSection>
  );
}
