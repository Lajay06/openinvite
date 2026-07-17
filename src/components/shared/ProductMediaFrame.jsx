/**
 * src/components/shared/ProductMediaFrame.jsx
 *
 * THE one media-frame treatment for every real product still/video on the
 * marketing site — one definition, used everywhere, so product media reads
 * as a single consistent visual language instead of each insertion
 * improvising its own container. Composes with the browser-chrome bar
 * already baked into the pixels by scripts/capture/frame.mjs: this wrapper
 * rounds and borders the whole composited unit (bar + screenshot/video
 * together), not just the screenshot underneath it.
 *
 * Rounded corners are a deliberate, scoped exception to DESIGN_SPEC.md's
 * sitewide 0px-radius rule — documented there alongside the existing
 * onboarding/tips-carousel exception. Real product media reads like a
 * screen sitting in the page, not a flat printed card; a slight radius is
 * what makes that read correctly. Nothing else on the marketing site gets
 * this exception.
 */
const RADIUS = 14;

export default function ProductMediaFrame({ children, aspectRatio = "16/10", maxWidth = 720, dark = true, style }) {
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        maxWidth,
        margin: "0 auto",
        aspectRatio,
        overflow: "hidden",
        borderRadius: RADIUS,
        border: dark ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(10,10,10,0.1)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
