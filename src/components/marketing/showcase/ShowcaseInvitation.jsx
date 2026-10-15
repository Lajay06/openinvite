/**
 * src/components/marketing/showcase/ShowcaseInvitation.jsx
 *
 * CONCEPT 1, "They see the invitation. You see everything." Replaces the
 * Customizable Dashboard section on /features (goals/2026-10-15-consumer-
 * launch-website.md, item 1), on a WHITE ground so the page still runs black,
 * white, black: quick start, this, the app.
 *
 * The sparkler send-off (074) fills the right half; over it, the couple's
 * planner card and the printed invitation their guests see. The sample couple
 * and every number are sample.
 */
import React from "react";
import { ShowcasePanel, ShowcaseCopy, showcasePhoto } from "./ShowcasePanel";

const PHOTO = showcasePhoto("sparklers");

export const INVITATION_HEADING = "They see the invitation. You see everything.";
export const INVITATION_BODY = "Behind every Openinvite is the whole wedding: who's coming, where they're sitting, what's left to pay and how many sleeps to go.";

const CSS = `
  .sc-inv__copy { position: relative; z-index: 2; }
  .sc-inv__stage { position: relative; }
  .sc-inv__photo { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: 50% 40%; display: block; }
  .sc-inv__planner { position: absolute; width: 380px; padding: 22px; display: flex; flex-direction: column; gap: 14px; transform: rotate(3deg); z-index: 2; }
  .sc-inv__row { display: flex; justify-content: space-between; align-items: center; }
  .sc-inv__couple { font-size: 15px; line-height: 20px; font-weight: 700; }
  .sc-inv__live { display: flex; align-items: center; gap: 7px; font-size: 12px; line-height: 16px; }
  .sc-inv__dot { width: 8px; height: 8px; border-radius: 999px; background: #22A06B; }
  .sc-inv__tiles { display: grid; grid-template-columns: minmax(0,1fr) minmax(0,1fr); gap: 10px; }
  .sc-inv__tile { background: #F5F5F5; padding: 14px; display: flex; flex-direction: column; gap: 6px; }
  .sc-inv__label { font-size: 12px; line-height: 16px; }
  .sc-inv__big { font-size: 40px; line-height: 44px; font-weight: 800; letter-spacing: -0.04em; }
  .sc-inv__mid { font-size: 28px; line-height: 32px; font-weight: 800; letter-spacing: -0.03em; }
  .sc-inv__of { font-size: 13px; font-weight: 500; letter-spacing: 0; }
  .sc-inv__bar { height: 6px; background: #E4E4E4; }
  .sc-inv__fill { width: 57%; height: 6px; background: #E03553; }
  .sc-inv__line { background: #F5F5F5; padding: 10px 12px; font-size: 13px; line-height: 18px; }
  .sc-inv__card { position: absolute; width: 360px; height: 250px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; text-align: center; transform: rotate(-4deg); z-index: 3; animation: sc-inv-rise 1.2s cubic-bezier(0.23,1,0.32,1) both; }
  .sc-inv__card::before { content: ""; position: absolute; inset: 12px; border: 1px solid rgba(10,10,10,0.12); }
  .sc-inv__together { font-size: 12px; line-height: 16px; letter-spacing: 0.08em; }
  .sc-inv__names { font-size: 42px; line-height: 46px; font-weight: 300; letter-spacing: -0.02em; }
  .sc-inv__hair { width: 36px; height: 1px; background: #E03553; }
  .sc-inv__when { font-size: 13px; line-height: 18px; color: #3A3A3A; }
  @keyframes sc-inv-rise { from { transform: translateY(40px) rotate(-4deg); opacity: 0; } to { transform: translateY(0) rotate(-4deg); opacity: 1; } }
  @media (min-width: 1024px) {
    .sc-inv__copy { position: absolute; left: 5.56vw; top: 170px; width: min(560px, 40vw); }
    .sc-inv__stage { position: absolute; left: 50%; top: 0; right: 0; bottom: 0; }
    .sc-inv__planner { left: 13%; top: 110px; }
    .sc-inv__card { left: 4%; top: 520px; }
  }
  @media (max-width: 1023px) {
    .sc-inv__copy { padding: 72px 20px 48px; }
    .sc-inv__stage { height: 600px; }
    .sc-inv__planner { width: 300px; right: 16px; top: 28px; padding: 16px; gap: 10px; }
    .sc-inv__big { font-size: 32px; line-height: 36px; }
    .sc-inv__mid { font-size: 22px; line-height: 26px; }
    .sc-inv__card { width: 280px; height: 200px; left: 16px; bottom: 32px; }
    .sc-inv__names { font-size: 32px; line-height: 36px; }
  }
`;

export default function ShowcaseInvitation() {
  return (
    <ShowcasePanel ground="white" name="invitation" label="The invitation and the planner behind it">
      <style>{CSS}</style>
      <ShowcaseCopy
        className="sc-inv__copy"
        heading={<>They see the invitation.<br />You see everything.</>}
        body={INVITATION_BODY}
        cta={{ label: "Start free trial", href: "/signup" }}
      />
      <div className="sc-inv__stage">
        <img
          className="sc-inv__photo"
          src={PHOTO.src}
          srcSet={PHOTO.srcSet}
          sizes="(min-width: 1024px) 50vw, 100vw"
          alt="A couple running through a tunnel of sparklers at night"
          loading="lazy"
        />
        <div className="showcase__card sc-inv__planner" aria-hidden="true">
          <div className="sc-inv__row">
            <span className="sc-inv__couple">Alex &amp; Sam</span>
            <span className="sc-inv__live showcase__muted"><span className="sc-inv__dot" />Live</span>
          </div>
          <div className="sc-inv__tiles">
            <div className="sc-inv__tile">
              <span className="sc-inv__label showcase__muted">Sleeps to go</span>
              <span className="sc-inv__big">142</span>
            </div>
            <div className="sc-inv__tile">
              <span className="sc-inv__label showcase__muted">Coming</span>
              <span className="sc-inv__mid">68<span className="sc-inv__of showcase__muted"> of 120</span></span>
              <span className="sc-inv__bar"><span className="sc-inv__fill" style={{ display: "block" }} /></span>
            </div>
          </div>
          <div className="sc-inv__row sc-inv__line">
            <span>Seating plan</span>
            <span className="showcase__muted">9 tables set</span>
          </div>
        </div>
        <div className="showcase__card sc-inv__card" data-motion aria-hidden="true">
          <span className="sc-inv__together showcase__muted">Together with their families</span>
          <span className="sc-inv__names">Alex &amp; Sam</span>
          <span className="sc-inv__hair" />
          <span className="sc-inv__when">Saturday, March 6 at 4pm</span>
        </div>
      </div>
    </ShowcasePanel>
  );
}
