/**
 * src/components/marketing/TitleBanner.jsx
 *
 * A TITLE BANNER, IN THE AVA SECTION'S STRUCTURE.
 *
 * Site fixes batch 2, item 2 (owner ruling 2026-10-10): the app section on /,
 * /features and /app opens on the same kind of banner the Ava section does on
 * the home page, a full-width gradient band with one line of large white type,
 * rather than running straight in from the section above. Same gradient, same
 * minimum heights, same type as that banner (src/pages/Home.jsx), so no new
 * color or size enters the site.
 *
 * lineHeight is set to 1.25 so the band's height lands on whole pixels at the
 * sizes the site is measured at (36px at 390, 72px at 1440): a fractional
 * height above the footer moves the footer onto a half pixel and
 * test:logo-lockup reads the logo a pixel short.
 *
 * @param {{ children: React.ReactNode, as?: 'h1' | 'h2', id?: string }} props
 */
export default function TitleBanner({ children, as = "h2" }) {
  const Heading = as;
  return (
    <div data-title-banner className="min-h-[140px] md:min-h-[180px]" style={{
      background: "linear-gradient(to right, #DDF762, #F0A050, #D4896A, #C99BBF, #9B59CC)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "40px 24px",
    }}>
      <Heading style={{
        fontSize: "clamp(36px, 6vw, 72px)", fontWeight: 800, color: "#FFFFFF", letterSpacing: "-0.02em",
        lineHeight: 1.25, fontFamily: "'Plus Jakarta Sans', sans-serif", textAlign: "center", margin: 0,
      }}>
        {children}
      </Heading>
    </div>
  );
}
