/**
 * src/components/home/AppPhoneSection.jsx
 *
 * THE APP, ON THE HOME PAGE, AS A PHOTOGRAPH. Batch 3 amendment A
 * (goals/2026-10-11-site-fixes-batch-3.md): the owner rejected the phone
 * mockup, so the section is one full-bleed photograph, one screen tall on the
 * red section's rule (100vh, overflow hidden), with a dark scrim rising from
 * the bottom and the copy in its darkest band. No banner, no panel, no phone.
 *
 * THE PHOTOGRAPH is Death to Stock's WANDER set (ID 12134), licensed to the
 * owner and in the Openinvite Cloudinary account, served like the other
 * marketing photographs: f_auto and q_auto at 800, 1200, 1600 and 2400 wide.
 * The 4K upload (ID12134-2, 4985 by 3729) replaced the 1280 wide original on
 * 2026-10-12: the same frame, compared pixel for pixel at w_400 (mean
 * difference 1.15 of 255, best alignment at no offset), so the crop and the
 * object-position below are unchanged, and the 1600 entry no longer stops at
 * the old file's 1280. The old id stays in Cloudinary. The
 * phone crop keeps her in frame with object-position, not a Cloudinary
 * gravity crop, so one file serves both widths.
 *
 * The copy block's bottom edge sits at 18% of the section height from the
 * bottom (about 160px at 900 tall), left on the red section's gutter, 5.56vw,
 * which is 80px at 1440. scripts/test-home-app-photo.mjs measures, in a
 * browser, that the block sits in the scrim's dark band and that the body
 * reads at 4.5:1 against the photograph as rendered.
 *
 * THE BODY IS 600px WIDE, NOT 560 (owner ruling 2026-10-11). At 560 its
 * three lines ran so close to the edge that Linux Chromium wrapped it to four,
 * which lifted the heading into a lighter part of the scrim, where its right
 * corners read 4.01:1. At 600 it holds three lines everywhere.
 *
 * THE HEADING SHARES THE VALUE PROP'S STYLE (owner ruling on #1092, doing the
 * 2026-10-13 request): no red line above it, and its font, size, weight and
 * line height come from HOME_STATEMENT_HEADING (./homeStatementHeading.js),
 * the style "All the powerful tools, beautifully designed..." uses too. The block keeps
 * its place in the scrim's dark band; nothing else on Home changed. At the
 * shared 4.17vw the heading's box is held to 37.5vw (540px at 1440), so it
 * breaks after "planner," on two lines and its top right corner stays in the
 * dark band: at the full 640px that corner read 3.37:1, at 37.5vw 4.82:1
 * (scripts/test-home-app-photo.mjs). vw, like the type, so the break holds at
 * every desktop width; the copy box grows to 37.5vw above 1707px so it never
 * caps the heading into a third line.
 *
 * Copy is the owner's, verbatim. NO BADGE AND NO STORE LINK: the small line
 * is text.
 */
import { homeStatementHeadingCss } from './homeStatementHeading';

const PJS = "'Plus Jakarta Sans', sans-serif";
const CLOUD = "https://res.cloudinary.com/dsr84xknv/image/upload";
export const HOME_APP_PHOTO_ID = "DTS_WANDER_Jessica_MADAVO_Photos_ID12134-2_ck50st";
const photoUrl = (w) => `${CLOUD}/f_auto,q_auto,w_${w},c_limit/${HOME_APP_PHOTO_ID}.jpg`;
export const HOME_APP_SRCSET = [2400, 1600, 1200, 800].map((w) => `${photoUrl(w)} ${w}w`).join(", ");

export const HOME_APP_HEADING = "The whole planner, in your pocket.";
export const HOME_APP_BODY = "Plan on the train, on the couch, in line for coffee. Your guest list, budget and seating chart on your phone and your computer, always the same wedding.";
export const HOME_APP_SMALL = "iPhone and Android. Coming at launch.";
export const HOME_APP_ALT = "A woman in a white outfit sits outside a vintage shop, reading her phone.";
export const HOME_APP_SCRIM = "linear-gradient(0deg, rgba(0,0,0,.78) 0%, rgba(0,0,0,.35) 45%, rgba(0,0,0,0) 75%)";

export default function AppPhoneSection() {
  return (
    <section data-home-app data-one-screen className="home-app">
      <img
        src={photoUrl(1600)}
        srcSet={HOME_APP_SRCSET}
        sizes="100vw"
        alt={HOME_APP_ALT}
        loading="lazy"
        data-home-app-photo
        className="home-app__photo"
      />
      <div aria-hidden="true" data-home-app-scrim className="home-app__scrim" style={{ background: HOME_APP_SCRIM }} />
      <div data-home-app-copy className="home-app__copy">
        <h2 data-app-heading className="home-app__heading">{HOME_APP_HEADING}</h2>
        <p data-app-body className="home-app__body">{HOME_APP_BODY}</p>
        <p data-app-store-line className="home-app__small">{HOME_APP_SMALL}</p>
      </div>
      <style>{`
        .home-app { position: relative; width: 100%; height: 100vh; overflow: hidden; background: #0A0A0A; font-family: ${PJS}; }
        .home-app__photo { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: 60% 40%; display: block; }
        .home-app__scrim { position: absolute; inset: 0; pointer-events: none; }
        .home-app__copy { position: absolute; left: 5.56vw; bottom: 18%; max-width: max(640px, 37.5vw); color: #FFFFFF; }
        .home-app__heading { margin: 0; max-width: 37.5vw; color: #FFFFFF; }
        ${homeStatementHeadingCss('.home-app__heading')}
        .home-app__body { margin: 28px 0 0; max-width: 600px; font-size: 22px; line-height: 1.45; font-weight: 400; color: #FFFFFF; }
        .home-app__small { margin: 22px 0 0; font-size: 16px; line-height: 1.4; font-weight: 500; color: #FFFFFF; opacity: 0.7; }
        @media (max-width: 768px) {
          .home-app__photo { object-position: 62% 30%; }
          .home-app__copy { left: 20px; right: 20px; bottom: 48px; }
          .home-app__heading { max-width: none; }
          .home-app__body { font-size: 17px; }
          .home-app__small { font-size: 14px; }
        }
      `}</style>
    </section>
  );
}
