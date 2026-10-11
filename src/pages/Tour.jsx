/**
 * Tour, at /tour: four moments of the product.
 *
 * Site fixes batch 3, item 5 (owner walkthrough 2026-10-11): the morning page,
 * replies, the seating chart and the guest suite, each full width with one
 * line in the owner's voice and nothing else. The eight-scene page this
 * replaces (numbers, labels, alternating columns, a cross-fading theme layer,
 * a photo pair between scenes) is gone; what is left is the shape of every
 * other marketing page: the shared hero, the moments, the shared end cap.
 *
 * The moments and their media live in src/lib/tourMoments.js. Each is the
 * product at its own size, cut to the site's 3:2 (the guest site at its own
 * 16:10), with no dashboard chrome.
 *
 * Live and unlisted: out of the nav, the footer and the sitemap, noindexed by
 * header (vercel.json), until the owner rules it reads like the rest of the
 * site and the nav link returns.
 */
import React from "react";
import PublicNav from "@/components/public/PublicNav";
import PublicFooter from "@/components/public/PublicFooter";
import MarketingEndCap from "@/components/marketing/MarketingEndCap";
import MarketingHero from "@/components/marketing/MarketingHero";
import ProductVideo from "@/components/shared/ProductVideo";
import { TOUR_MOMENTS } from "@/lib/tourMoments";
import { responsivePhoto } from "@/lib/marketingImage";
import { useIsMobile } from "@/hooks/use-mobile";
import { useMarketingSeo } from "@/hooks/useMarketingSeo";

const PJS = "'Plus Jakarta Sans', sans-serif";

// Both masters are web exports, not print originals: 1600x1065 and 2048x1152.
// The hero keeps its height-only crop and its 37% anchor, unchanged by the
// rebuild: the couple sit high in the source, and a 640 tall crop makes cover
// height-driven so their heads clear the fixed 65px nav (measured at 390,
// 1440 and 1892 when the crop was set).
const HERO = responsivePhoto("DTS_Tradition_Chris_Abatzis_Photos_ID9181_erzsi2", 1600, {
  transform: "c_crop,x_0,y_0,w_1600,h_640",
  croppedWidth: 1600,
});
const END_CAP = responsivePhoto("hf_20260903_230645_48b55428-c800-49a3-98eb-01afc61a473e_hnoru8", 2048);

// The page's two grounds, alternating: Features.jsx's white and #F5F5F3.
const GROUNDS = ["#FFFFFF", "#F5F5F3"];

// The product's own white needs an edge on white: the 1px hairline the
// /features stills use (src/components/marketing/FeatureStill.jsx).
const FRAME = { display: "block", width: "100%", border: "1px solid #E8E8E8", background: "#FFFFFF" };

function MomentMedia({ moment, isMobile }) {
  const m = isMobile ? moment.phone : moment;
  const still = m.still;
  const clip = m.clip;
  const aspect = clip?.portrait ? "390 / 844" : clip?.aspect || "3 / 2";
  if (still) {
    return (
      <img src={still.src} srcSet={still.srcSet} sizes="(min-width: 1205px) 1125px, calc(100vw - 2 * clamp(24px, 6vw, 80px))"
        alt={still.alt} loading="lazy" decoding="async" style={{ ...FRAME, aspectRatio: aspect, objectFit: "cover" }} />
    );
  }
  return (
    <div style={{ ...FRAME, aspectRatio: aspect, maxWidth: clip.portrait ? 390 : undefined, margin: clip.portrait ? "0 auto" : undefined }}>
      <ProductVideo mp4={clip.mp4} webm={clip.webm} poster={clip.poster} alt={clip.alt} />
    </div>
  );
}

function Moment({ moment, index, isMobile }) {
  return (
    <section data-tour-moment={moment.key} style={{ background: GROUNDS[index % 2], padding: "120px clamp(24px, 6vw, 80px)" }}>
      <div style={{ maxWidth: 1125, margin: "0 auto" }}>
        <MomentMedia moment={moment} isMobile={isMobile} />
        <h2 style={{ margin: "40px 0 0", maxWidth: 900, fontFamily: PJS, fontSize: "clamp(22px, 2.6vw, 34px)", fontWeight: 700, lineHeight: 1.25, letterSpacing: "-0.01em", color: "#0A0A0A" }}>
          {moment.line}
        </h2>
      </div>
    </section>
  );
}

export default function Tour() {
  const isMobile = useIsMobile();
  useMarketingSeo();

  return (
    <div className="min-h-screen bg-[#0A0A0A] font-sans">
      <PublicNav />
      <MarketingHero
        image={HERO.src}
        srcSet={HERO.srcSet}
        imagePosition="37% center"
        title="This is what planning looks like now."
        maxWidth={1000}
      />
      {TOUR_MOMENTS.map((moment, i) => (
        <Moment key={moment.key} moment={moment} index={i} isMobile={isMobile} />
      ))}
      <MarketingEndCap
        image={END_CAP.src}
        srcSet={END_CAP.srcSet}
        alt="A couple on a coastal rock at dusk, one crouched at the edge and the other balancing with arms outstretched"
        // 2048x1152, so the box matches the photo and cover shows both people.
        aspectRatio="16/9"
        // Owner override of the no-scrim rule, this slot only, below 768
        // (2026-09-18): at 390 the headline's right-hand words sit over a
        // cream skirt.
        scrim={isMobile ? 0.2 : 0}
        title="All that. And we're still just getting started."
      />
      <PublicFooter />
    </div>
  );
}
