/**
 * Shared, read-only helpers for the /mocks/universe/{a,b,c} Design Studio
 * redesign mocks. Mock-only — nothing here is imported by any production
 * page. Deliberately side-effect-free: these mocks read real wedding/guest
 * data (getMyWeddingDetails/getMyRecords are GET-only) but never write to
 * it — "Make this my universe" and asset editing are visually real but
 * intentionally inert, since a design mock reachable only by a raw URL is
 * the wrong place to let someone silently repaint or edit their actual
 * wedding's live configuration.
 */
import React, { useEffect } from 'react';
import { ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import AssetGrid from '@/components/universe-studio/AssetGrid';
import SaveTheDatePreview from '@/components/universe-studio/assets/SaveTheDatePreview';
import MenuCardPreview from '@/components/universe-studio/assets/MenuCardPreview';
import SeatingChartPreview from '@/components/universe-studio/assets/SeatingChartPreview';

const PJS = "'Plus Jakarta Sans', sans-serif";

// Real, documented signature motif per universe — drawn from the code
// comments in src/lib/websiteThemes.js and UNIVERSE_DESIGN_SYSTEM.md §4,
// not invented for this mock.
export const MOTIF_NOTES = {
  aman: 'Fine cross-hatch linen-weave grain, barely visible on dark sections.',
  tulum: 'Warm canvas-weave texture across section grounds.',
  kyoto: 'Fine washi-paper grain; a single ensō ring as the only ornament.',
  capri: 'A scalloped citrus-pith rule (repeating semicircle bumps) under kickers and names.',
  marrakech: 'Zellige interlocking-star weave, woven into rules and borders at low opacity.',
  brooklyn: 'A bold TicketStub rule — a solid block with a perforated tear-line edge.',
  bali: 'A generated WaveDivider curve in place of every straight rule, plus a small LeafCurve accent.',
  paris: 'A fine framed HairlineRule above and below the kicker, like a fashion-plate caption card.',
  capetown: 'A VineRule — a fine estate-stationery botanical rule beneath the kicker.',
  mykonos: 'A solid CubeBlock — plain rectangular architecture, no line, no pattern.',
};

function MiniLinkCard({ label, sublabel, href, theme }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        width: '100%', height: '100%', textDecoration: 'none',
        background: theme?.darkBg || '#0A0A0A',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: 16, gap: 8,
      }}
    >
      <div style={{ width: 32, height: 32, border: '1px solid rgba(255,255,255,0.25)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <ExternalLink size={14} color="rgba(255,255,255,0.7)" />
      </div>
      <p style={{ color: theme?.darkText || '#FFFFFF', fontSize: 12, fontWeight: 600, fontFamily: PJS, textAlign: 'center', margin: 0 }}>{label}</p>
      <p style={{ color: theme?.darkText || '#FFFFFF', opacity: 0.5, fontSize: 10, textAlign: 'center', margin: 0 }}>{sublabel}</p>
    </a>
  );
}

/** The five assets the CONTEXT calls out for a universe's opened/detail
 *  view: invitation, website, RSVP page, menu, seating chart. Real preview
 *  components + a real live link (weddingDetails.slug), not placeholders. */
export function UniverseAssetQuintet({ universeId, weddingDetails, guests, colors }) {
  const slug = weddingDetails?.slug || 'your-wedding';
  const cards = [
    { key: 'invitation', label: 'Invitation', node: <SaveTheDatePreview universe={universeId} weddingDetails={weddingDetails} /> },
    { key: 'website', label: 'Website', node: <MiniLinkCard label="Invitation website" sublabel={`/w/${slug}`} href={`/w/${slug}`} theme={colors} /> },
    { key: 'rsvp', label: 'RSVP page', node: <MiniLinkCard label="RSVP page" sublabel={`/w/${slug}/rsvp`} href={`/w/${slug}/rsvp`} theme={colors} /> },
    { key: 'menu', label: 'Menu', node: <MenuCardPreview universe={universeId} weddingDetails={weddingDetails} /> },
    { key: 'seating', label: 'Seating chart', node: <SeatingChartPreview universe={universeId} weddingDetails={weddingDetails} guests={guests} /> },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
      {cards.map(c => (
        <div key={c.key} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ height: 200, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.08)' }}>{c.node}</div>
          <span style={{ fontSize: 11, fontWeight: 600, fontFamily: PJS, opacity: 0.6 }}>{c.label}</span>
        </div>
      ))}
    </div>
  );
}

/** Injects every visible universe's real Google Fonts once, so type
 *  specimens render in the actual heading/body faces rather than falling
 *  back to generic serif/sans-serif. */
export function useGoogleFontsFor(universes) {
  useEffect(() => {
    const families = universes.map(u => u.typography?.googleFonts).filter(Boolean);
    if (families.length === 0) return;
    const id = 'mock-universe-fonts';
    let link = document.getElementById(id);
    if (!link) {
      link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
    link.href = `https://fonts.googleapis.com/css2?${families.map(f => `family=${f}`).join('&')}&display=swap`;
  }, [universes]);
}

export function mockActionToast(label) {
  toast(`${label} — this is a design mock, so nothing was actually changed on your wedding.`, { icon: '\u{1F4A1}' });
}

/** Real palette values, rendered as swatches — never invented colours. */
export function PaletteSwatches({ colors = {}, textOn }) {
  const entries = [
    ['Dark ground', colors.darkBg],
    ['Light ground', colors.lightBg],
    ['Accent', colors.accent],
    ['Accent secondary', colors.accentSecondary],
  ].filter(([, v]) => v);
  return (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
      {entries.map(([label, hex]) => (
        <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 72 }}>
          <div style={{ width: 56, height: 56, background: hex, border: '1px solid rgba(255,255,255,0.15)' }} />
          <span style={{ fontSize: 10, fontWeight: 600, fontFamily: PJS, color: textOn || 'inherit', opacity: 0.7 }}>{label}</span>
          <span style={{ fontSize: 10, fontFamily: PJS, color: textOn || 'inherit', opacity: 0.5 }}>{hex}</span>
        </div>
      ))}
    </div>
  );
}

/** Real type pairing, rendered in the actual faces (via useGoogleFontsFor). */
export function TypeSpecimen({ typography = {}, textOn }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div>
        <p style={{ fontSize: 10, fontWeight: 600, fontFamily: PJS, color: textOn || 'inherit', opacity: 0.6, margin: '0 0 4px' }}>Heading — {typography.headingFont?.replace(/["']/g, '').split(',')[0]}</p>
        <p style={{ fontFamily: typography.headingFont, fontSize: 32, margin: 0, color: textOn || 'inherit', lineHeight: 1.1 }}>Aa Bb Cc</p>
      </div>
      <div>
        <p style={{ fontSize: 10, fontWeight: 600, fontFamily: PJS, color: textOn || 'inherit', opacity: 0.6, margin: '0 0 4px' }}>Body — {typography.bodyFont?.replace(/["']/g, '').split(',')[0]}</p>
        <p style={{ fontFamily: typography.bodyFont, fontSize: 15, margin: 0, color: textOn || 'inherit', opacity: 0.85 }}>The quick brown fox jumps over the lazy dog.</p>
      </div>
    </div>
  );
}

/** The real "Your design assets" grid — genuine preview components, genuine
 *  John & Suzanne data. Editing is a no-op toast (see file header); Preview/
 *  Share still work since those are read-only. */
export function RealAssetsSection({ universe, weddingDetails, guests }) {
  return (
    <AssetGrid
      universe={universe}
      weddingDetails={weddingDetails}
      guests={guests}
      onEdit={() => mockActionToast('Edit asset')}
    />
  );
}

export function MockDataNotice({ loading, weddingDetails }) {
  if (loading) return null;
  return (
    <p style={{ fontSize: 11, fontFamily: PJS, color: 'rgba(10,10,10,0.35)', margin: 0 }}>
      Showing live data for {weddingDetails?.coupleNames || 'your wedding'} — a design mock, read-only: nothing here writes back.
    </p>
  );
}
