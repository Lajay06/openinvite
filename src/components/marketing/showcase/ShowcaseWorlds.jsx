/**
 * src/components/marketing/showcase/ShowcaseWorlds.jsx
 *
 * CONCEPT 5, "One Guest Suite. Twenty worlds." Replaces "One aesthetic vision,
 * from your invitation to your RSVP." on Home (goals/2026-10-15-consumer-
 * launch-website.md, item 2), rebuilt on BLACK. Nothing else on Home changes.
 *
 * Three of the couple's Guest Suite openings side by side, the same names in
 * three universes: Kyoto under the torii (051), Capri among the lemons (080),
 * Florence in the courtyard (049). Each sets the names in its universe's own
 * heading face, read from UNIVERSE_DEFAULT_FONT_IDS, loaded through the same
 * self-hosted loader a guest site uses and set through the universe specimen's
 * escape from the global font lock (oi-universe-face--heading in index.css),
 * so this adds no font and no new escape. The pills
 * bring a universe to the front.
 *
 * The concept drew them as phones with rounded corners and shadows; the
 * marketing site keeps square frames with no shadow, so they are the screens
 * alone. The sample couple is sample.
 */
import React, { useEffect, useState } from "react";
import { ShowcasePanel, ShowcaseCopy, showcasePhoto, SHOWCASE_PJS } from "./ShowcasePanel";
import { CURATED_FONTS, UNIVERSE_DEFAULT_FONT_IDS } from "@/lib/curatedFonts";
import { loadFontFamilies } from "@/lib/selfHostedFonts";

export const WORLDS_HEADING = "One Guest Suite. Twenty worlds.";
export const WORLDS_BODY = "Same names, same details, a different feeling. Pick a universe and everything restyles at once: type, color, motion.";

const WORLDS = [
  { id: "kyoto", name: "Kyoto", photo: "torii", alt: "A couple running through red torii gates", date: "March 6" },
  { id: "capri", name: "Capri", photo: "lemons", alt: "A couple dancing under lemon trees at night", date: "Saturday, March 6" },
  { id: "florence", name: "Florence", photo: "courtyard", alt: "A candlelit courtyard party at night", date: "Saturday, March 6" },
].map((w) => {
  const font = CURATED_FONTS[UNIVERSE_DEFAULT_FONT_IDS[w.id].headingFontId];
  return { ...w, font, img: showcasePhoto(w.photo, [480, 800]) };
});

const CSS = `
  .sc-worlds__pills { display: flex; flex-wrap: wrap; gap: 6px; padding: 6px; margin: 0; list-style: none; background: rgba(255,255,255,0.08); border-radius: 999px; width: max-content; max-width: 100%; }
  .sc-worlds__pill { font: inherit; font-size: 14px; line-height: 20px; font-weight: 500; border: 0; background: transparent; color: rgba(255,255,255,0.72); padding: 10px 18px; border-radius: 999px; cursor: pointer; min-height: 44px; }
  .sc-worlds__pill[aria-pressed="true"] { background: #FFFFFF; color: #0A0A0A; font-weight: 600; }
  .sc-worlds__pill:focus-visible { outline: 2px solid #E03553; outline-offset: 2px; }
  .sc-worlds__stage { position: relative; }
  .sc-worlds__screen { position: absolute; overflow: hidden; background: #1A1A1A; transition: transform 0.6s cubic-bezier(0.16,1,0.3,1), left 0.6s cubic-bezier(0.16,1,0.3,1), top 0.6s cubic-bezier(0.16,1,0.3,1), width 0.6s cubic-bezier(0.16,1,0.3,1), height 0.6s cubic-bezier(0.16,1,0.3,1); }
  .sc-worlds__screen img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; }
  .sc-worlds__shade { position: absolute; left: 0; right: 0; bottom: 0; height: 60%; background: linear-gradient(180deg, rgba(0,0,0,0), rgba(0,0,0,0.72)); }
  .sc-worlds__names { position: absolute; left: 24px; right: 24px; bottom: 28px; color: #FFFFFF; display: flex; flex-direction: column; gap: 10px; }
  .sc-worlds__couple { font-size: 44px; line-height: 46px; }
  .sc-worlds__date { font-family: ${SHOWCASE_PJS}; font-size: 13px; line-height: 18px; letter-spacing: 0.08em; }
  .sc-worlds__reply { align-self: flex-start; margin-top: 6px; background: #FFFFFF; color: #0A0A0A; font-family: ${SHOWCASE_PJS}; font-size: 14px; line-height: 20px; font-weight: 600; padding: 10px 20px; border-radius: 999px; }
  .sc-worlds__screen[data-place="front"] { z-index: 2; }
  .sc-worlds__screen[data-place="left"] { transform: rotate(-8deg); }
  .sc-worlds__screen[data-place="right"] { transform: rotate(8deg); }
  @media (min-width: 1024px) {
    .sc-worlds__left { position: absolute; left: 5.56vw; top: 150px; width: min(520px, 36vw); z-index: 2; }
    .sc-worlds__pills { margin-top: 48px; }
    .sc-worlds__stage { position: absolute; left: 40%; right: 0; top: 0; bottom: 0; }
    .sc-worlds__screen[data-place="front"] { left: calc(50% - 155px); top: 130px; width: 310px; height: 620px; }
    .sc-worlds__screen[data-place="left"] { left: calc(50% - 385px); top: 170px; width: 270px; height: 560px; }
    .sc-worlds__screen[data-place="right"] { left: calc(50% + 115px); top: 170px; width: 270px; height: 560px; }
  }
  @media (max-width: 1023px) {
    .sc-worlds__left { padding: 72px 20px 0; }
    .sc-worlds__pills { margin-top: 32px; }
    .sc-worlds__stage { height: 520px; margin: 32px 0 0; }
    .sc-worlds__screen[data-place="front"] { left: calc(50% - 110px); top: 24px; width: 220px; height: 440px; }
    .sc-worlds__screen[data-place="left"] { left: calc(50% - 190px); top: 52px; width: 170px; height: 360px; }
    .sc-worlds__screen[data-place="right"] { left: calc(50% + 20px); top: 52px; width: 170px; height: 360px; }
    .sc-worlds__couple { font-size: 32px; line-height: 34px; }
    .sc-worlds__names { left: 16px; right: 16px; bottom: 20px; }
  }
`;

const PLACES = ["left", "front", "right"];

export default function ShowcaseWorlds() {
  const [front, setFront] = useState("capri");

  // The three faces load through the guest site's own self-hosted loader.
  useEffect(() => { loadFontFamilies(WORLDS.map((w) => w.font.label)); }, []);

  // The chosen universe takes the middle; the other two keep their order.
  const others = WORLDS.filter((w) => w.id !== front);
  const order = [others[0], WORLDS.find((w) => w.id === front), others[1]];

  return (
    <ShowcasePanel ground="black" name="worlds" label="One Guest Suite in three universes">
      <style>{CSS}</style>
      <div className="sc-worlds__left">
      <ShowcaseCopy
        className="sc-worlds__copy"
        heading={WORLDS_HEADING}
        body={WORLDS_BODY}
        cta={{ label: "Explore all 20 universes", href: "/universes" }}
      />
      <ul className="sc-worlds__pills" aria-label="Show a universe">
        {WORLDS.map((w) => (
          <li key={w.id}>
            <button type="button" className="sc-worlds__pill" aria-pressed={front === w.id} onClick={() => setFront(w.id)}>{w.name}</button>
          </li>
        ))}
      </ul>
      </div>
      <div className="sc-worlds__stage">
        {order.map((w, i) => (
          <figure key={w.id} className="sc-worlds__screen" data-place={PLACES[i]} data-motion style={{ margin: 0 }}>
            <img src={w.img.src} srcSet={w.img.srcSet} sizes="(min-width: 1024px) 310px, 220px" alt={w.alt} loading="lazy" />
            <div className="sc-worlds__shade" aria-hidden="true" />
            <figcaption className="sc-worlds__names">
              <span className="sc-worlds__couple oi-universe-face--heading" style={{ "--oi-heading-font": w.font.family, fontWeight: w.font.weight }}>Alex<br />&amp; Sam</span>
              <span className="sc-worlds__date">{w.date}</span>
              {PLACES[i] === "front" ? <span className="sc-worlds__reply" aria-hidden="true">Reply</span> : null}
              <span className="sr-only">{`The ${w.name} universe`}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </ShowcasePanel>
  );
}
