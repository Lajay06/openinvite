/**
 * src/components/home/AppPhoneSection.jsx
 *
 * THE APP, ON THE HOME PAGE. Item 1 of goals/2026-10-10-app-on-the-marketing-site.md.
 *
 * The title banner carries the heading (batch 2, item 2); below it, the
 * site's own phone plays the real daily update over POOL_PARTY, with the
 * owner's copy beside it (batch 2, item 1, src/components/marketing/
 * AppPhoneMoment.jsx, which explains why no manufacturer's frame is used).
 *
 * NO BADGE AND NO STORE LINK. The app is not in either store yet, so where a
 * badge would go there is the plain store line, with no link. The official
 * badges arrive with the store links, in a later change.
 *
 * Sits between the Ava spotlight and pricing. Whole-pixel heights hold here
 * as everywhere above the footer: the phone's sizes are exact fractions of
 * the recording and the text lines are set in whole pixels, because a
 * fractional height moves the footer onto a half pixel and test:logo-lockup
 * reads the logo a pixel short.
 */
import TitleBanner from "@/components/marketing/TitleBanner";
import AppPhoneMoment from "@/components/marketing/AppPhoneMoment";
import { APP_STORE_LINE } from "@/components/marketing/AppPhones";

const PJS = "'Plus Jakarta Sans', sans-serif";

export default function AppPhoneSection() {
  return (
    <>
    {/* THE BANNER CARRIES THE HEADING (batch 2, item 2), as the Ava section's
        banner carries its line, so the section below opens on the phone. */}
    <TitleBanner>The whole planner, in your pocket.</TitleBanner>
    {/* THE PHONE MOMENT (batch 2, item 1): the site's own phone playing the
        real daily update over POOL_PARTY, the copy beside it. */}
    <AppPhoneMoment size="md" marker="data-home-app">
      <p style={{ fontSize: 18, lineHeight: "30px", color: "rgba(255,255,255,0.72)", margin: "0 0 24px", fontFamily: PJS }}>
        Plan on the train, on the couch, in the queue for coffee. The guest list, the budget, the seating chart and Ava are all on your phone, and a reply from a guest reaches you the moment it lands. Your guests never need the app; they open a link.
      </p>
      <p data-app-store-line style={{ fontSize: 14, lineHeight: "22px", color: "rgba(255,255,255,0.5)", margin: 0, fontFamily: PJS }}>
        {APP_STORE_LINE}
      </p>
    </AppPhoneMoment>
    </>
  );
}
