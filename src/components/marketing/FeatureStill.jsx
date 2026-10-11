/**
 * src/components/marketing/FeatureStill.jsx
 *
 * ONE FRAMED PIECE OF THE PRODUCT, UNDER A FEATURE SECTION'S BULLETS.
 * Site fixes batch 3, item 4. It goes in space the section already has (the
 * text column, or an accordion row's open panel) and changes nothing around
 * it: no new type size, no new spacing step. 32px above, as the body text
 * keeps above its bullets; the caption at the bullets' own 14px and color.
 *
 * Square corners and no shadow, like every card on the site. The 1px hairline
 * is the bullets' divider color: the stills are mostly white product on a
 * white or #F5F5F3 section, and without an edge they would have none.
 *
 * `clip` is the seating row's video: muted, looped, inline, poster first. With
 * reduced motion it is the poster alone, never autoplay.
 */
const PJS = "'Plus Jakarta Sans', sans-serif";
const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// `aspect` and `margin` are for the one still that is a band, not a card: the
// morning page at the top of the dashboard section, full width at 2:1.
export default function FeatureStill({ still, clip, dark = false, sizes = "(min-width: 1024px) 552px, 100vw", aspect = "3 / 2", margin = "32px 0 0" }) {
  const item = still || clip;
  if (!item) return null;
  const frame = {
    display: "block",
    width: "100%",
    aspectRatio: aspect,
    objectFit: "cover",
    border: `1px solid ${dark ? "rgba(255,255,255,0.12)" : "#E8E8E8"}`,
    background: dark ? "#141414" : "#FFFFFF",
  };
  return (
    <figure data-feature-still={still ? "still" : "clip"} style={{ margin }}>
      {still ? (
        <img src={still.src} srcSet={still.srcSet} sizes={sizes} alt={still.alt} loading="lazy" decoding="async" style={frame} />
      ) : reducedMotion() ? (
        <img src={clip.poster} alt={clip.alt} loading="lazy" decoding="async" style={frame} />
      ) : (
        <video autoPlay muted loop playsInline preload="metadata" poster={clip.poster} aria-label={clip.alt} style={frame}>
          <source src={clip.webm} type="video/webm" />
          <source src={clip.mp4} type="video/mp4" />
        </video>
      )}
      <figcaption style={{ marginTop: 12, fontSize: 14, lineHeight: 1.5, fontFamily: PJS, color: dark ? "rgba(255,255,255,0.6)" : "#444444" }}>
        {item.caption}
      </figcaption>
    </figure>
  );
}
