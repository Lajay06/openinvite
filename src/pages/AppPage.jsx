/**
 * AppPage, the page about the app at /app.
 *
 * Item 4 of goals/2026-10-10-app-on-the-marketing-site.md, and the page the
 * store badges will point at once the app is in the stores. Its hero is the
 * Features page's app section, one screen tall and larger here (site fixes
 * batch 3, item 3, FeaturesAppSection.jsx), then whether guests need it, then
 * the store line.
 *
 * Public: in scripts/marketingRoutes.mjs, so prerendered, in sitemap.xml and
 * under test:marketing-routes; title and description from
 * src/lib/marketingSeo.js through the shared hook.
 */
import PublicNav from "@/components/public/PublicNav";
import PublicFooter from "@/components/public/PublicFooter";
import FeaturesAppSection, { APP_STORE_LINE } from "@/components/marketing/FeaturesAppSection";
import { useMarketingSeo } from "@/hooks/useMarketingSeo";

const PJS = "'Plus Jakarta Sans', sans-serif";

export default function AppPage() {
  useMarketingSeo();
  // Apple Smart App Banner meta tag goes here once the App Store link exists.
  return (
    // NO TOP OFFSET: the hero is one screen tall and clears the fixed nav
    // inside itself (AppTwinSection.jsx), as the home page's hero does.
    <div className="min-h-screen bg-[#0A0A0A] font-sans">
      <PublicNav />
      <FeaturesAppSection headingLevel="h1" large showStoreLine={false} />
      <div style={{ height: 96 }} />
      <section data-app-guests style={{ background: "#0A0A0A", padding: "0 clamp(24px, 6vw, 80px) 120px" }}>
        <div style={{ maxWidth: 640, margin: "0 auto", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 48 }}>
          <h2 style={{ fontSize: "clamp(24px, 3vw, 36px)", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: "44px", color: "#FFFFFF", margin: "0 0 16px", fontFamily: PJS }}>
            Do my guests need it?
          </h2>
          <p style={{ fontSize: 18, lineHeight: "30px", color: "rgba(255,255,255,0.72)", margin: 0, fontFamily: PJS }}>
            No. Your guests open a link and reply in a browser. Nobody has to make an account or install anything to come to your wedding.
          </p>
          <p data-app-store-line style={{ fontSize: 14, lineHeight: "22px", color: "rgba(255,255,255,0.5)", margin: "48px 0 0", fontFamily: PJS }}>
            {APP_STORE_LINE}
          </p>
        </div>
      </section>
      <PublicFooter />
    </div>
  );
}
