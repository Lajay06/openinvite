/**
 * UniverseWorldView — the entered-world detail view (fix/design-studio-
 * entrance). Built in the universe's OWN layout idiom rather than a
 * neutral template: the brand-reveal masthead reuses the exact same
 * production primitives the real guest-facing wedding site renders
 * (src/components/guest-website/layouts/*Masthead.jsx) — Marrakech gets
 * its real editorial Nº-kicker masthead, Capri its real citrus-scallop
 * masthead, and so on. Tulum has no dedicated layout yet (still the
 * shared baseline in UNIVERSE_CONFIGS), so it falls back to a plain
 * centred treatment rather than borrowing another universe's idiom.
 *
 * Ultra-locked worlds are fully enterable — the whole world view renders
 * exactly the same as an unlocked one; only the final action differs
 * (upgrade path instead of "make this my universe").
 */
import React from 'react';
import { Crown, ExternalLink } from 'lucide-react';
import MinimalMasthead from '@/components/guest-website/layouts/MinimalMasthead';
import KyotoMasthead from '@/components/guest-website/layouts/KyotoMasthead';
import CapriMasthead from '@/components/guest-website/layouts/CapriMasthead';
import EditorialMasthead from '@/components/guest-website/layouts/EditorialMasthead';
import BrooklynMasthead from '@/components/guest-website/layouts/BrooklynMasthead';
import BaliMasthead from '@/components/guest-website/layouts/BaliMasthead';
import ParisMasthead from '@/components/guest-website/layouts/ParisMasthead';
import CapeTownMasthead from '@/components/guest-website/layouts/CapeTownMasthead';
import MykonosMasthead from '@/components/guest-website/layouts/MykonosMasthead';
import SaveTheDatePreview from '@/components/universe-studio/assets/SaveTheDatePreview';
import MenuCardPreview from '@/components/universe-studio/assets/MenuCardPreview';
import SeatingChartPreview from '@/components/universe-studio/assets/SeatingChartPreview';

const PJS = "'Plus Jakarta Sans', sans-serif";

const MASTHEAD_BY_LAYOUT = {
  'aman-minimal': MinimalMasthead,
  'kyoto-vertical': KyotoMasthead,
  'capri-citrus': CapriMasthead,
  'editorial-masthead': EditorialMasthead,
  'brooklyn-offgrid': BrooklynMasthead,
  'bali-organic': BaliMasthead,
  'paris-couture': ParisMasthead,
  'capetown-estate': CapeTownMasthead,
  'mykonos-whitewash': MykonosMasthead,
};

function GenericMasthead({ coupleNames, kicker, theme, typography, textColor }) {
  return (
    <div style={{ textAlign: 'center' }}>
      {kicker && (
        <p style={{ fontFamily: typography.bodyFont, fontSize: 13, fontWeight: 600, letterSpacing: '0.08em', color: textColor, opacity: 0.75, margin: '0 0 20px' }}>{kicker}</p>
      )}
      <h1 style={{ fontFamily: typography.headingFont, fontWeight: typography.headingWeight, fontSize: 'clamp(2.4rem, 6vw, 4.6rem)', color: textColor, margin: 0, lineHeight: 1.1 }}>{coupleNames}</h1>
    </div>
  );
}

function MiniLinkCard({ label, sublabel, href, colors }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" style={{
      width: '100%', height: '100%', textDecoration: 'none', background: colors.darkBg,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 16, gap: 8,
    }}>
      <div style={{ width: 32, height: 32, border: '1px solid rgba(255,255,255,0.25)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <ExternalLink size={14} color="rgba(255,255,255,0.7)" />
      </div>
      <p style={{ color: colors.lightBg, fontSize: 12, fontWeight: 600, fontFamily: PJS, textAlign: 'center', margin: 0 }}>{label}</p>
      <p style={{ color: colors.lightBg, opacity: 0.5, fontSize: 10, textAlign: 'center', margin: 0 }}>{sublabel}</p>
    </a>
  );
}

function PaletteSwatches({ colors }) {
  const entries = [
    ['Dark ground', colors.darkBg], ['Light ground', colors.lightBg],
    ['Accent', colors.accent], ['Accent secondary', colors.accentSecondary],
  ].filter(([, v]) => v);
  return (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
      {entries.map(([label, hex]) => (
        <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 72 }}>
          <div style={{ width: 56, height: 56, background: hex, border: '1px solid rgba(0,0,0,0.08)' }} />
          <span style={{ fontSize: 10, fontWeight: 600, fontFamily: PJS, opacity: 0.6 }}>{label}</span>
          <span style={{ fontSize: 10, fontFamily: PJS, opacity: 0.4 }}>{hex}</span>
        </div>
      ))}
    </div>
  );
}

function TypeSpecimen({ typography }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div>
        <p style={{ fontSize: 10, fontWeight: 600, fontFamily: PJS, opacity: 0.5, margin: '0 0 4px' }}>Heading — {typography.headingFont?.replace(/["']/g, '').split(',')[0]}</p>
        <p style={{ fontFamily: typography.headingFont, fontSize: 32, margin: 0, lineHeight: 1.1 }}>Aa Bb Cc</p>
      </div>
      <div>
        <p style={{ fontSize: 10, fontWeight: 600, fontFamily: PJS, opacity: 0.5, margin: '0 0 4px' }}>Body — {typography.bodyFont?.replace(/["']/g, '').split(',')[0]}</p>
        <p style={{ fontFamily: typography.bodyFont, fontSize: 15, margin: 0, opacity: 0.85 }}>The quick brown fox jumps over the lazy dog.</p>
      </div>
    </div>
  );
}

export default function UniverseWorldView({
  universe, weddingDetails, guests, isCurrent, canAccessUltra,
  onBack, onSwitchUniverse, onUpgrade, motifNote,
}) {
  const Masthead = MASTHEAD_BY_LAYOUT[universe.layout] || GenericMasthead;
  const coupleNames = weddingDetails?.coupleNames || 'Your names';
  const slug = weddingDetails?.slug || 'your-wedding';
  const showUpgrade = universe.isUltra && !canAccessUltra && !isCurrent;

  return (
    <div>
      <div style={{ padding: '20px 32px 0' }}>
        <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: '1px solid rgba(10,10,10,0.15)', borderRadius: 999, padding: '7px 16px', cursor: 'pointer', fontFamily: PJS, fontSize: 12, fontWeight: 600, color: '#0A0A0A' }}>
          ← All worlds
        </button>
      </div>

      {/* Brand reveal — the universe's own layout idiom */}
      <div style={{
        margin: '20px 32px 0', minHeight: 340, background: universe.colors.darkBg,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: 'clamp(28px, 5vw, 64px)', position: 'relative',
      }}>
        <Masthead
          coupleNames={coupleNames}
          kicker={universe.copy.heroKicker}
          theme={universe.colors}
          typography={universe.typography}
          textColor={universe.colors.lightBg}
          accentColor={universe.colors.accent}
        />
        {isCurrent && (
          <span style={{ position: 'absolute', top: 20, right: 20, fontSize: 10, fontWeight: 700, fontFamily: PJS, letterSpacing: '0.06em', color: universe.colors.darkBg, background: universe.colors.accent, padding: '5px 12px', borderRadius: 999 }}>
            Your current universe
          </span>
        )}
      </div>

      <div style={{ padding: 'clamp(24px, 4vw, 40px) 32px', display: 'flex', flexDirection: 'column', gap: 32 }}>
        <p style={{ fontFamily: PJS, fontSize: 13, color: 'rgba(10,10,10,0.55)', margin: 0, maxWidth: 640 }}>
          <strong style={{ color: '#0A0A0A' }}>Signature motif — </strong>{motifNote}
        </p>

        <div style={{ display: 'flex', gap: 48, flexWrap: 'wrap' }}>
          <PaletteSwatches colors={universe.colors} />
          <TypeSpecimen typography={universe.typography} />
        </div>

        <div>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)', margin: '0 0 12px' }}>
            How your pieces look in this world
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ height: 200, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.08)' }}>
                <SaveTheDatePreview universe={universe.id} weddingDetails={weddingDetails} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, fontFamily: PJS, opacity: 0.6 }}>Invitation</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ height: 200, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.08)' }}>
                <MiniLinkCard label="Invitation website" sublabel={`/w/${slug}`} href={`/w/${slug}`} colors={universe.colors} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, fontFamily: PJS, opacity: 0.6 }}>Website</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ height: 200, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.08)' }}>
                <MiniLinkCard label="RSVP page" sublabel={`/w/${slug}/rsvp`} href={`/w/${slug}/rsvp`} colors={universe.colors} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, fontFamily: PJS, opacity: 0.6 }}>RSVP page</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ height: 200, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.08)' }}>
                <MenuCardPreview universe={universe.id} weddingDetails={weddingDetails} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, fontFamily: PJS, opacity: 0.6 }}>Menu</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ height: 200, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.08)' }}>
                <SeatingChartPreview universe={universe.id} weddingDetails={weddingDetails} guests={guests} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, fontFamily: PJS, opacity: 0.6 }}>Seating chart</span>
            </div>
          </div>
        </div>

        {showUpgrade ? (
          <div style={{ border: '1px solid rgba(10,10,10,0.1)', padding: 24, display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg,#FBBF24,#F59E0B)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Crown size={18} color="#FFFFFF" />
            </div>
            <div style={{ flex: 1, minWidth: 220 }}>
              <p style={{ fontFamily: PJS, fontSize: 14, fontWeight: 700, color: '#0A0A0A', margin: '0 0 4px' }}>{universe.name} is part of Ultra</p>
              <p style={{ fontFamily: PJS, fontSize: 12, color: 'rgba(10,10,10,0.5)', margin: 0 }}>Upgrade to make this your universe — it restyles your existing invitations, website and RSVP, non-destructively.</p>
            </div>
            <button onClick={onUpgrade} style={{ padding: '10px 22px', borderRadius: 999, border: 'none', background: '#E03553', color: '#FFFFFF', fontFamily: PJS, fontSize: 13, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
              Upgrade to Ultra
            </button>
          </div>
        ) : (
          <div>
            <button
              onClick={() => onSwitchUniverse(universe.id)}
              disabled={isCurrent}
              style={{ padding: '12px 28px', borderRadius: 999, border: 'none', background: universe.colors.accent, color: universe.colors.darkBg, fontFamily: PJS, fontSize: 14, fontWeight: 700, cursor: isCurrent ? 'default' : 'pointer', opacity: isCurrent ? 0.6 : 1 }}
            >
              {isCurrent ? 'This is your current universe' : 'Make this my universe'}
            </button>
            <p style={{ fontFamily: PJS, fontSize: 11, color: 'rgba(10,10,10,0.4)', margin: '8px 0 0' }}>
              Restyles your existing invitations, website and RSVP — switching is never destructive.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
