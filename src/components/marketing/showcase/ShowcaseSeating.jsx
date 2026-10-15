/**
 * src/components/marketing/showcase/ShowcaseSeating.jsx
 *
 * CONCEPT 3, "Sort the seats on Sunday. Forget them by Saturday." The third of
 * the three that take over the long white block on /features (goals/2026-10-
 * 15-consumer-launch-website.md, item 1): the confetti dance floor (054) edge
 * to edge, the site's own dark scrim from the left behind the copy, and the
 * seating plan on the right.
 *
 * The concept wrote "Mum"; US English makes her "Mom". The handwritten note
 * becomes a plain red line in the site's one typeface. Sample names are sample.
 */
import React from "react";
import { ShowcasePanel, ShowcaseCopy, showcasePhoto } from "./ShowcasePanel";

const PHOTO = showcasePhoto("confetti", [800, 1200, 1600]);

export const SEATING_HEADING = "Sort the seats on Sunday. Forget them by Saturday.";
export const SEATING_BODY = "Drag guests to tables and everything follows: meals to the caterer, names to the place cards, the plan to every phone on the day.";

const PILLS = ["Seating", "Meals", "Place cards", "Run of show"];
const SEATS = [
  ["Nan", 184, 22], ["Uncle Ray", 300, 70], ["Mia", 318, 140], ["Dad", 296, 212],
  ["Mom", 182, 258], ["Leo", 62, 212], ["Ana", 46, 140],
];

const CSS = `
  .sc-seat__photo { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: 50% 35%; display: block; }
  .sc-seat__scrim { position: absolute; inset: 0; background: linear-gradient(90deg, rgba(10,10,10,0.88) 0%, rgba(10,10,10,0.55) 40%, rgba(10,10,10,0.05) 75%); pointer-events: none; }
  .sc-seat__copy { position: relative; z-index: 2; }
  .sc-seat__pills { display: flex; flex-wrap: wrap; gap: 10px; position: relative; z-index: 2; list-style: none; margin: 0; padding: 0; }
  .sc-seat__pill { padding: 10px 16px; border-radius: 999px; background: rgba(255,255,255,0.14); box-shadow: inset 0 0 0 1px rgba(255,255,255,0.2); font-size: 14px; line-height: 20px; color: #FFFFFF; }
  .sc-seat__plan { width: 470px; padding: 24px; display: flex; flex-direction: column; gap: 18px; transform: rotate(-2deg); z-index: 2; }
  .sc-seat__head { display: flex; justify-content: space-between; align-items: center; font-size: 16px; line-height: 22px; }
  .sc-seat__count { font-size: 12px; line-height: 16px; }
  .sc-seat__room { position: relative; height: 330px; background: #F5F5F5; }
  .sc-seat__table { position: absolute; left: 115px; top: 55px; width: 190px; height: 190px; border-radius: 999px; background: #FFFFFF; display: flex; flex-direction: column; align-items: center; justify-content: center; }
  .sc-seat__table-no { font-size: 12px; line-height: 16px; }
  .sc-seat__table-name { font-size: 22px; line-height: 28px; font-weight: 800; }
  .sc-seat__seat { position: absolute; padding: 6px 12px; background: #FFFFFF; border: 1px solid rgba(10,10,10,0.12); font-size: 12px; line-height: 16px; font-weight: 600; }
  .sc-seat__seat--moving { left: 20px; top: 44px; background: #E03553; border-color: #E03553; color: #FFFFFF; transform: rotate(-8deg); }
  .sc-seat__why { position: absolute; left: 24px; top: 296px; font-size: 13px; line-height: 18px; font-weight: 600; color: #E03553; }
  .sc-seat__stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
  .sc-seat__stat { background: #F5F5F5; padding: 10px; font-size: 12px; line-height: 16px; }
  .sc-seat__stat b { display: block; font-size: 18px; line-height: 24px; font-weight: 800; }
  @media (min-width: 1024px) {
    .sc-seat__copy { position: absolute; left: 5.56vw; top: 170px; width: min(560px, 40vw); }
    .sc-seat__pills { position: absolute; left: 5.56vw; bottom: 96px; }
    .sc-seat__plan { position: absolute; left: 61%; top: 150px; }
  }
  @media (max-width: 1023px) {
    .sc-seat__scrim { background: linear-gradient(180deg, rgba(10,10,10,0.88) 0%, rgba(10,10,10,0.6) 55%, rgba(10,10,10,0.35) 100%); }
    .sc-seat__copy { padding: 72px 20px 0; }
    .sc-seat__pills { padding: 28px 20px 0; }
    .sc-seat__stage { position: relative; height: 512px; margin-top: 40px; }
    .sc-seat__plan { position: absolute; left: 50%; top: 0; margin-left: -175px; width: 350px; padding: 16px; gap: 12px; transform: rotate(-2deg) scale(1); }
    .sc-seat__room { height: 330px; margin: 0 -10px; transform: scale(0.82); transform-origin: 50% 0; margin-bottom: -59px; }
    .sc-seat { padding-bottom: 72px; }
  }
`;

export default function ShowcaseSeating() {
  return (
    <ShowcasePanel ground="photo" name="seating" label="The seating plan" className="sc-seat">
      <style>{CSS}</style>
      <img className="sc-seat__photo" src={PHOTO.src} srcSet={PHOTO.srcSet} sizes="100vw" alt="A packed dance floor under a burst of confetti" loading="lazy" />
      <div className="sc-seat__scrim" aria-hidden="true" />
      <ShowcaseCopy className="sc-seat__copy" heading={<>Sort the seats on Sunday.<br />Forget them by Saturday.</>} body={SEATING_BODY} />
      <ul className="sc-seat__pills" aria-label="What the seating plan feeds">
        {PILLS.map((p) => <li key={p} className="sc-seat__pill">{p}</li>)}
      </ul>
      <div className="sc-seat__stage">
        <div className="showcase__card sc-seat__plan" aria-hidden="true">
          <div className="sc-seat__head"><b>Seating plan</b><span className="sc-seat__count showcase__muted">112 of 120 seated</span></div>
          <div className="sc-seat__room">
            <div className="sc-seat__table"><span className="sc-seat__table-no showcase__muted">Table 1</span><span className="sc-seat__table-name">Family</span></div>
            {SEATS.map(([n, x, y]) => <span key={n} className="sc-seat__seat" style={{ left: x, top: y }}>{n}</span>)}
            <span className="sc-seat__seat sc-seat__seat--moving">Priya</span>
            <span className="sc-seat__why">Vegetarian, next to Nan</span>
          </div>
          <div className="sc-seat__stats">
            <div className="sc-seat__stat"><span className="showcase__muted">Tables</span><b>12</b></div>
            <div className="sc-seat__stat"><span className="showcase__muted">Vegetarian</span><b>14</b></div>
            <div className="sc-seat__stat"><span className="showcase__muted">Still to seat</span><b>8</b></div>
          </div>
        </div>
      </div>
    </ShowcasePanel>
  );
}
