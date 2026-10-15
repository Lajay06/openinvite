/**
 * src/components/marketing/showcase/ShowcaseReplies.jsx
 *
 * CONCEPT 2, "The best part of planning is the replies." Replaces the Advanced
 * guest management deep dive on /features (goals/2026-10-15-consumer-launch-
 * website.md, item 1), on WHITE, between the black timeline and the confetti
 * photograph.
 *
 * A guest on her phone (038) on the left, three replies on their way across,
 * and the planner's own list of today's replies on the right. The concept set
 * the notes in a handwriting face; the marketing site carries one typeface, so
 * they are Plus Jakarta Sans here. The sample guests are sample.
 */
import React from "react";
import { ShowcasePanel, ShowcaseCopy, showcasePhoto } from "./ShowcasePanel";

const PHOTO = showcasePhoto("phone");

export const REPLIES_HEADING = "The best part of planning is the replies.";
export const REPLIES_BODY = "Every guest gets their own link. They answer in seconds, add a note, a song and what they eat, and it all lands in your planner, sorted by household.";

const NOTES = [
  { who: "The Nguyens", status: "Coming, 3", text: "Count us in. The kids have been practicing.", cls: "sc-rep__note--a" },
  { who: "Tom", status: "Coming", text: "Song request: anything by ABBA. Non-negotiable.", cls: "sc-rep__note--b" },
  { who: "Nan", status: "Coming", text: "I'll be the one crying in the front row.", cls: "sc-rep__note--c" },
];

const TODAY = [
  ["The Nguyens", "3 coming"],
  ["Tom", "Coming, song added"],
  ["Nan", "Coming"],
];

const CSS = `
  .sc-rep__photo { display: block; width: 100%; height: 100%; object-fit: cover; object-position: 50% 20%; }
  .sc-rep__note { position: absolute; width: 240px; padding: 16px 20px; animation: sc-rep-drift 8s ease-in-out infinite; }
  .sc-rep__note--b { animation-delay: 1.2s; }
  .sc-rep__note--c { animation-delay: 2.4s; background: #0A0A0A; color: #FFFFFF; border-color: #0A0A0A !important; }
  .sc-rep__meta { display: flex; justify-content: space-between; font-size: 12px; line-height: 16px; margin-bottom: 6px; color: rgba(10,10,10,0.6); }
  .sc-rep__note--c .sc-rep__meta { color: rgba(255,255,255,0.6); }
  .sc-rep__yes { color: #1B7F55; font-weight: 600; }
  .sc-rep__note--c .sc-rep__yes { color: #FF8FA3; }
  .sc-rep__said { font-size: 17px; line-height: 24px; font-weight: 500; }
  .sc-rep__today { padding: 18px 20px; display: flex; flex-direction: column; gap: 12px; }
  .sc-rep__today-row { display: flex; justify-content: space-between; gap: 12px; font-size: 14px; line-height: 20px; }
  .sc-rep__today-head { font-size: 13px; line-height: 18px; }
  @keyframes sc-rep-drift { 0%, 100% { translate: 0 0; } 50% { translate: 0 -10px; } }
  @media (min-width: 1024px) {
    .sc-rep__media { position: absolute; left: 0; top: 0; width: 44.4%; height: 900px; }
    .sc-rep__trail { position: absolute; left: 23%; top: 180px; width: 700px; height: 600px; }
    .sc-rep__note--a { left: 73%; top: 130px; rotate: -4deg; }
    .sc-rep__note--b { left: 100%; top: 330px; rotate: 3deg; }
    .sc-rep__note--c { left: 84%; top: 560px; rotate: -2deg; }
    .sc-rep__side { position: absolute; left: 63%; top: 150px; width: min(470px, 32vw); }
    .sc-rep__today { margin-top: 48px; }
  }
  @media (max-width: 1023px) {
    .sc-rep__side { padding: 72px 20px 0; }
    .sc-rep__today { margin-top: 32px; }
    .sc-rep__media { position: relative; height: 600px; margin: 40px 0 0; }
    .sc-rep__trail { display: none; }
    .sc-rep__note { width: 230px; }
    .sc-rep__note--a { right: 16px; top: 32px; rotate: -3deg; }
    .sc-rep__note--b { left: 16px; top: 220px; rotate: 2deg; }
    .sc-rep__note--c { right: 16px; top: 410px; rotate: -2deg; }
  }
`;

export default function ShowcaseReplies() {
  return (
    <ShowcasePanel ground="white" name="replies" label="Guest replies arriving in the planner">
      <style>{CSS}</style>
      <div className="sc-rep__side">
        <ShowcaseCopy heading={REPLIES_HEADING} body={REPLIES_BODY} />
        <div className="showcase__card sc-rep__today" aria-hidden="true">
          <div className="sc-rep__today-row sc-rep__today-head"><b>Replies today</b><span className="showcase__muted">Guest list</span></div>
          {TODAY.map(([who, what]) => (
            <div key={who} className="sc-rep__today-row"><span>{who}</span><span className="sc-rep__yes">{what}</span></div>
          ))}
        </div>
      </div>
      <div className="sc-rep__media">
        <img className="sc-rep__photo" src={PHOTO.src} srcSet={PHOTO.srcSet} sizes="(min-width: 1024px) 45vw, 100vw" alt="A woman in a white slip dress smiling at her phone" loading="lazy" />
        <svg className="sc-rep__trail" viewBox="0 0 700 600" aria-hidden="true">
          <path d="M10 450 C 160 380, 260 160, 520 120" stroke="#E03553" strokeWidth="1.5" strokeDasharray="3 7" fill="none" strokeLinecap="round" />
          <path d="M10 450 C 200 470, 330 420, 560 360" stroke="#E03553" strokeWidth="1.5" strokeDasharray="3 7" fill="none" strokeLinecap="round" />
        </svg>
        {NOTES.map((n) => (
          <div key={n.who} className={`showcase__card sc-rep__note ${n.cls}`} data-motion aria-hidden="true">
            <div className="sc-rep__meta"><span>{n.who}</span><span className="sc-rep__yes">{n.status}</span></div>
            <div className="sc-rep__said">{n.text}</div>
          </div>
        ))}
      </div>
    </ShowcasePanel>
  );
}
