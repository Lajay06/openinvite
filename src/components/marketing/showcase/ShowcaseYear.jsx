/**
 * src/components/marketing/showcase/ShowcaseYear.jsx
 *
 * CONCEPT 4, "From yes to the send-off, one calm line." Replaces the Timeline
 * and schedule deep dive on /features (goals/2026-10-15-consumer-launch-
 * website.md, item 1), first of the three that take over the long white block,
 * on BLACK.
 *
 * Six moments along one line, each an owned photograph with what Openinvite
 * hands the couple at that point. The third is "now": lit, raised, and the one
 * with an action. Below 1024px the six sit two by three and the line goes.
 */
import React from "react";
import { ShowcasePanel, ShowcaseCopy, showcasePhoto } from "./ShowcasePanel";

export const YEAR_HEADING = "From yes to the send-off, one calm line.";
export const YEAR_BODY = "Openinvite knows what comes next, so the right tool is waiting at the right moment.";

const STOPS = [
  { photo: "chips", when: "12 months", lead: "Date set.", rest: "Universe chosen.", alt: "A newly engaged couple sharing chips under a tartan blanket" },
  { photo: "airport", when: "9 months", lead: "Save the dates sent.", rest: "Flights get booked.", alt: "A couple walking through an airport with their suitcases" },
  { photo: "phone", when: "6 months", lead: "Guest Suite live.", rest: "68 of 120 replied.", alt: "A woman smiling at her phone", now: true },
  { photo: "courtyard", when: "3 months", lead: "Seating plan.", rest: "Drag guests to tables.", alt: "A candlelit courtyard party at night" },
  { photo: "gettingReady", when: "The morning", lead: "Run of show", rest: "on every phone.", alt: "A bridal party laughing while getting ready" },
  { photo: "sparklers", when: "The send-off", lead: "Thank you notes", rest: "to every guest.", alt: "A sparkler send-off at night" },
].map((s) => ({ ...s, img: showcasePhoto(s.photo, [480, 800]) }));

const CSS = `
  .sc-year { padding: 88px 5.56vw 0; }
  .sc-year__top { display: flex; justify-content: space-between; align-items: flex-end; gap: 40px; }
  .sc-year__top .showcase__heading { max-width: 1100px; }
  .sc-year__top .showcase__body { max-width: 640px; }
  .sc-year__nowrap { white-space: nowrap; }
  .sc-year__track { position: relative; margin-top: 48px; }
  .sc-year__stops { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 16px; align-items: end; list-style: none; margin: 0; padding: 0; }
  .sc-year__stop { display: flex; flex-direction: column; gap: 14px; }
  .sc-year__stop--later { opacity: 0.55; }
  .sc-year__frame { position: relative; height: 300px; overflow: hidden; }
  .sc-year__stop--now .sc-year__frame { height: 350px; outline: 2px solid #E03553; outline-offset: 0; }
  .sc-year__frame img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .sc-year__chip { position: absolute; left: 10px; right: 10px; bottom: 10px; padding: 10px 12px; font-size: 12px; line-height: 17px; }
  .sc-year__nudge { display: inline-block; margin-top: 8px; padding: 6px 10px; border-radius: 999px; background: #E03553; color: #FFFFFF; font-weight: 600; }
  .sc-year__dot { width: 12px; height: 12px; border-radius: 999px; background: #E03553; position: relative; z-index: 1; }
  .sc-year__stop--now .sc-year__dot { background: #FFFFFF; box-shadow: 0 0 0 6px rgba(224,53,83,0.3); animation: sc-year-glow 2.6s ease-in-out infinite; }
  .sc-year__stop--later .sc-year__dot { background: #0A0A0A; box-shadow: inset 0 0 0 2px rgba(255,255,255,0.5); }
  .sc-year__when { font-size: 13px; line-height: 18px; color: rgba(255,255,255,0.6); }
  .sc-year__stop--now .sc-year__when { color: #FFFFFF; font-weight: 600; }
  .sc-year__line, .sc-year__done { position: absolute; left: 0; height: 2px; bottom: 37px; }
  .sc-year__line { right: 0; background: rgba(255,255,255,0.14); }
  .sc-year__done { width: calc(41.6667% - 1px); background: #E03553; }
  @keyframes sc-year-glow { 0%, 100% { box-shadow: 0 0 0 6px rgba(224,53,83,0.3); } 50% { box-shadow: 0 0 0 14px rgba(224,53,83,0.08); } }
  @media (max-width: 1023px) {
    .sc-year { padding: 72px 20px 72px; }
    .sc-year__top { flex-direction: column; align-items: flex-start; gap: 0; }
    .sc-year__track { margin-top: 40px; }
    .sc-year__stops { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px 12px; align-items: start; }
    .sc-year__frame, .sc-year__stop--now .sc-year__frame { height: 220px; }
    .sc-year__line, .sc-year__done { display: none; }
    .sc-year__stop--later { opacity: 1; }
  }
`;

export default function ShowcaseYear() {
  return (
    <ShowcasePanel ground="black" name="year" label="The wedding year, one step at a time" className="sc-year">
      <style>{CSS}</style>
      <div className="sc-year__top">
        <ShowcaseCopy heading={<>From yes to the <span className="sc-year__nowrap">send-off</span>, one calm line.</>} body={YEAR_BODY} />
      </div>
      <div className="sc-year__track">
      <span aria-hidden="true" className="sc-year__line" />
      <span aria-hidden="true" className="sc-year__done" />
      <ol className="sc-year__stops">
        {STOPS.map((s, i) => (
          <li key={s.when} className={`sc-year__stop${s.now ? " sc-year__stop--now" : ""}${i > 2 ? " sc-year__stop--later" : ""}`}>
            <div className="sc-year__frame">
              <img src={s.img.src} srcSet={s.img.srcSet} sizes="(min-width: 1024px) 15vw, 50vw" alt={s.alt} loading="lazy" />
              <div className="showcase__card sc-year__chip">
                <b>{s.lead}</b> {s.rest}
                {s.now ? <span className="sc-year__nudge" aria-hidden="true">Nudge the rest</span> : null}
              </div>
            </div>
            <span aria-hidden="true" className="sc-year__dot" data-motion={s.now ? "" : undefined} />
            <span className="sc-year__when">{s.when}</span>
          </li>
        ))}
      </ol>
      </div>
    </ShowcasePanel>
  );
}
