/**
 * src/components/marketing/showcase/ShowcasePanel.jsx
 *
 * THE ONE GRAMMAR THE FIVE PRODUCT SHOWCASES SHARE (goals/2026-10-15-
 * consumer-launch-website.md, the brand contract). Every showcase is a
 * full-bleed panel 900px tall at desktop on a black or white ground, or a
 * photograph edge to edge, with a big left-aligned Plus Jakarta Sans headline
 * under the site's red rule, and at most one red pill.
 *
 * The type is the home app section's (src/components/home/AppPhoneSection.jsx):
 * the 56 by 4 red rule, a 700 weight headline at -0.03em, the body at 400, the
 * 5.56vw gutter. The headline steps down from 84px to 72px because these carry
 * a product picture beside them where the app section has only a photograph.
 *
 * WHOLE PIXELS. Every height and line height here is a whole number of pixels
 * (memory: a fractional section height moves the footer onto a half pixel and
 * test:logo-lockup reads the wordmark short). Desktop panels are exactly 900px;
 * below 1024px a panel is its content, and its content is built from px
 * heights only.
 *
 * The product pictures are drawn in the site's card: square corners, no
 * shadow, a hairline where a card meets a ground of its own color. The concept
 * artboards drew rounded, shadowed cards and phone frames; where the concept and
 * the site differ, the site wins (the goal's rule).
 */
import React from "react";

export const SHOWCASE_PJS = "'Plus Jakarta Sans', sans-serif";
export const SHOWCASE_RED = "#E03553";
export const SHOWCASE_BLACK = "#0A0A0A";

const CSS = `
  .showcase { position: relative; width: 100%; overflow: hidden; font-family: ${SHOWCASE_PJS}; box-sizing: border-box; }
  .showcase *, .showcase *::before, .showcase *::after { box-sizing: border-box; }
  .showcase--black { background: ${SHOWCASE_BLACK}; color: #FFFFFF; }
  .showcase--white { background: #FFFFFF; color: ${SHOWCASE_BLACK}; }
  .showcase--photo { background: ${SHOWCASE_BLACK}; color: #FFFFFF; }
  .showcase__rule { width: 56px; height: 4px; background: ${SHOWCASE_RED}; margin: 0 0 28px; }
  .showcase__heading { margin: 0; font-size: 72px; line-height: 74px; letter-spacing: -0.03em; font-weight: 700; }
  .showcase__body { margin: 28px 0 0; font-size: 20px; line-height: 30px; font-weight: 400; }
  .showcase--black .showcase__body, .showcase--photo .showcase__body { color: rgba(255,255,255,0.78); }
  .showcase--white .showcase__body { color: rgba(10,10,10,0.6); }
  .showcase__cta { display: inline-flex; align-items: center; height: 52px; margin-top: 36px; padding: 0 32px; border-radius: 999px; background: ${SHOWCASE_RED}; color: #FFFFFF; font-size: 15px; line-height: 20px; font-weight: 600; text-decoration: none; }
  .showcase__cta:hover { background: #C92A47; }
  .showcase__cta:focus-visible { outline: 2px solid ${SHOWCASE_RED}; outline-offset: 3px; }
  .showcase__card { background: #FFFFFF; color: ${SHOWCASE_BLACK}; }
  .showcase--white .showcase__card { border: 1px solid rgba(10,10,10,0.12); }
  .showcase__muted { color: rgba(10,10,10,0.6); }
  @media (min-width: 1024px) {
    .showcase { height: 900px; }
  }
  @media (max-width: 1023px) {
    .showcase__heading { font-size: 44px; line-height: 48px; }
    .showcase__body { margin-top: 20px; font-size: 17px; line-height: 26px; }
    .showcase__rule { margin-bottom: 20px; }
    .showcase__cta { margin-top: 28px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .showcase [data-motion] { animation: none !important; transition: none !important; }
  }
`;

/**
 * @param {{ ground: 'black'|'white'|'photo', name: string, label: string, children: React.ReactNode, className?: string }} p
 */
export function ShowcasePanel({ ground, name, label, children, className = "" }) {
  return (
    <section data-showcase={name} aria-label={label} className={`showcase showcase--${ground} ${className}`.trim()}>
      <style>{CSS}</style>
      {children}
    </section>
  );
}

/**
 * The copy block: rule, headline, body and the optional single red pill.
 * @param {{ heading: React.ReactNode, body?: string, cta?: { label: string, href: string }, className?: string, as?: string }} p
 */
export function ShowcaseCopy({ heading, body, cta, className = "", as: Tag = "h2" }) {
  return (
    <div className={`showcase__copy ${className}`.trim()} data-showcase-copy>
      <div aria-hidden="true" className="showcase__rule" />
      <Tag className="showcase__heading" data-showcase-heading>{heading}</Tag>
      {body ? <p className="showcase__body" data-showcase-body>{body}</p> : null}
      {cta ? <a className="showcase__cta" href={cta.href} data-showcase-cta>{cta.label}</a> : null}
    </div>
  );
}

const CLOUD = "https://res.cloudinary.com/dsr84xknv/image/upload";

/**
 * The owned Higgsfield photographs the showcases use, by Cloudinary public id.
 * The goal names them by their Higgsfield file names; on Cloudinary those are
 * each asset's display name, and the public id is the pin_ name below (read
 * off the asset list, 2026-10-14). 038 and 107 kept their file names as ids.
 */
export const SHOWCASE_PHOTOS = {
  phone: { id: "hf_20260905_124238_2e0981ad-2b66-46cc-948d-a8db441b4929_whdhah", w: 1536 }, // 038
  chips: { id: "pin_edinburgh_couple", w: 1664 }, // 048
  courtyard: { id: "pin_florence_party", w: 1664 }, // 049
  torii: { id: "pin_kyoto_married", w: 1664 }, // 051
  confetti: { id: "pin_london_party", w: 1664 }, // 054
  gettingReady: { id: "pin2_bali_ready", w: 1664 }, // 070
  sparklers: { id: "pin2_capetown_sendoff", w: 1664 }, // 074
  lemons: { id: "pin2_capri_dance", w: 1664 }, // 080
  airport: { id: "hf_20260921_234435_574beb4c-4fd7-4b47-948d-35721b323d3d_nxxjhz", w: 1536 }, // 107
};

/** src and srcSet for a showcase photo, never past the master's own width. */
export function showcasePhoto(key, widths = [480, 800, 1200, 1600]) {
  const p = SHOWCASE_PHOTOS[key];
  const ws = widths.filter((w) => w <= p.w);
  const url = (w) => `${CLOUD}/f_auto,q_auto,w_${w},c_limit/${p.id}`;
  return { src: url(ws[Math.min(1, ws.length - 1)]), srcSet: ws.map((w) => `${url(w)} ${w}w`).join(", ") };
}
