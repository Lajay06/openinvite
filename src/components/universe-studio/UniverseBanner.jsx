/**
 * UniverseBanner (fix/design-studio-banners) — a full-width photographic
 * banner in the universe wall, replacing UniverseTile.jsx's poster grid.
 * Reference: microsoft.design/wallpapers — the image IS the design, type
 * stays quiet, generous spacing between rows. Every colour/type/motif
 * value still comes from the universe object (UNIVERSE_CONFIGS via
 * universeCatalog.js) — no hardcoded palette.
 *
 * Universes with a real photo (imageUrl set) get the full-bleed treatment
 * with a bottom-only scrim. Universes without one (imageUrl null — just
 * Aman today, the only universe with no source photo yet) get a designed
 * composition instead of a flat block: a gradient wash in the universe's
 * own palette, oversized type in its own display face, and its actual
 * documented signature motif (not a fake illustration) as a real accent
 * element — reusing the same primitives the guest-facing site itself
 * renders.
 */
import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { loadUniverseFont } from '@/lib/lazyUniverseFonts';
import { Crown } from 'lucide-react';
import HairlineRule from '@/components/guest-website/layouts/HairlineRule';
import EnsoRing from '@/components/guest-website/layouts/EnsoRing';
import CitrusScallop from '@/components/guest-website/layouts/CitrusScallop';
import TicketStub from '@/components/guest-website/layouts/TicketStub';
import CubeBlock from '@/components/guest-website/layouts/CubeBlock';
import SunRayArc from '@/components/guest-website/layouts/SunRayArc';
import AmalfiWave from '@/components/guest-website/layouts/AmalfiWave';
import SedonaContour from '@/components/guest-website/layouts/SedonaContour';
import AspenPine from '@/components/guest-website/layouts/AspenPine';
import TajArch from '@/components/guest-website/layouts/TajArch';
import HavanaSunburst from '@/components/guest-website/layouts/HavanaSunburst';
import EdinburghThistle from '@/components/guest-website/layouts/EdinburghThistle';
import MonacoMast from '@/components/guest-website/layouts/MonacoMast';
import FlorenceVine from '@/components/guest-website/layouts/FlorenceVine';
import SeoulOrb from '@/components/guest-website/layouts/SeoulOrb';
import ShanghaiCloud from '@/components/guest-website/layouts/ShanghaiCloud';

const PJS = "'Plus Jakarta Sans', sans-serif";

// Each universe's real documented motif element, sized as a banner accent
// rather than a thin rule — still the actual generated primitive, never a
// blown-up "loud" version that would violate the design system's own
// "woven, not printed" bar.
const MOTIF_ACCENT = {
  aman: (color) => <HairlineRule color={color} opacity={0.5} width={120} thickness={1} />,
  tulum: (color) => <SunRayArc color={color} opacity={0.5} width={140} height={36} />,
  kyoto: (color) => <EnsoRing color={color} opacity={0.7} size={56} />,
  capri: (color) => <CitrusScallop color={color} bumpSize={9} style={{ maxWidth: 200 }} />,
  brooklyn: (color) => <TicketStub color={color} width={120} height={16} notchSize={7} />,
  paris: (color) => <HairlineRule color={color} opacity={0.6} width={140} thickness={1} />,
  mykonos: (color) => <CubeBlock color={color} width={44} height={44} />,
  amalfi: (color) => <AmalfiWave color={color} opacity={0.5} width={140} height={28} />,
  sedona: (color) => <SedonaContour color={color} opacity={0.5} width={160} height={32} />,
  aspen: (color) => <AspenPine color={color} opacity={0.55} size={40} />,
  taj: (color) => <TajArch color={color} opacity={0.5} width={70} height={58} />,
  havana: (color) => <HavanaSunburst color={color} opacity={0.45} width={130} height={64} />,
  edinburgh: (color) => <EdinburghThistle color={color} opacity={0.55} size={38} />,
  monaco: (color) => <MonacoMast color={color} opacity={0.5} width={60} height={42} />,
  florence: (color) => <FlorenceVine color={color} opacity={0.45} width={140} height={30} />,
  seoul: (color) => <SeoulOrb color={color} opacity={0.45} size={52} />,
  shanghai: (color) => <ShanghaiCloud color={color} opacity={0.5} width={120} height={42} />,
};

function ImageBanner({ universe, isCurrent, prefersReducedMotion }) {
  const { name, tagline, tileDescription, tags, isUltra, colors, typography, imageUrl } = universe;
  const smallUrl = imageUrl.replace(/\.jpg$/, '-800.jpg');

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <motion.img
        src={imageUrl}
        srcSet={`${smallUrl} 800w, ${imageUrl} 1600w`}
        sizes="100vw"
        loading="lazy"
        decoding="async"
        alt=""
        initial={false}
        whileHover={prefersReducedMotion ? undefined : { scale: 1.045 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
      />
      {/* Scrim only where text sits — not a full-image darken */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 45%, rgba(0,0,0,0.58) 100%)', pointerEvents: 'none' }} />

      <BannerContent {...{ name, tagline, tileDescription, tags, isUltra, isCurrent, colors, typography }} textColor="#FFFFFF" accent={colors.accent} />
    </div>
  );
}

function CompositionBanner({ universe, isCurrent }) {
  const { id, name, tagline, tileDescription, tags, isUltra, colors, typography } = universe;
  const motif = MOTIF_ACCENT[id];

  return (
    <div style={{
      position: 'relative', width: '100%', height: '100%', overflow: 'hidden',
      background: `linear-gradient(135deg, ${colors.darkBg} 0%, ${colors.darkBg} 60%, ${colors.accent}26 100%)`,
    }}>
      <div style={{ position: 'absolute', right: 'clamp(24px, 6vw, 96px)', top: '50%', transform: 'translateY(-50%)', opacity: 0.9 }}>
        {motif ? motif(colors.accent) : null}
      </div>
      <BannerContent {...{ name, tagline, tileDescription, tags, isUltra, isCurrent, colors, typography }} textColor={colors.lightBg} accent={colors.accent} />
    </div>
  );
}

function BannerContent({ name, tagline, tileDescription, tags, isUltra, isCurrent, colors, typography, textColor, accent }) {
  return (
    <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 'clamp(20px, 3vw, 40px)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        {isCurrent && (
          <span style={{ fontSize: 11, fontWeight: 600, fontFamily: PJS, letterSpacing: '0.04em', color: textColor, opacity: 0.85 }}>
            ✦ Your universe
          </span>
        )}
        {isUltra && (
          <span style={{ marginLeft: isCurrent ? 0 : 'auto', display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, fontFamily: PJS, letterSpacing: '0.06em', color: '#FFFFFF', background: 'rgba(0,0,0,0.45)', padding: '4px 10px', borderRadius: 999 }}>
            <Crown size={10} /> Ultra
          </span>
        )}
      </div>

      <div style={{ maxWidth: 640 }}>
        <p style={{ fontFamily: PJS, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: accent, margin: '0 0 8px' }}>
          {tagline}
        </p>
        <h3 style={{ fontFamily: typography.headingFont, fontWeight: typography.headingWeight, fontSize: 'clamp(2rem, 4.2vw, 3.2rem)', color: textColor, margin: '0 0 10px', lineHeight: 1.02 }}>
          {name}
        </h3>
        <p style={{ fontFamily: typography.bodyFont, fontSize: 13.5, color: textColor, opacity: 0.78, margin: '0 0 12px', lineHeight: 1.55, maxWidth: 480 }}>
          {tileDescription}
        </p>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {tags.map(tag => (
            <span key={tag} style={{ fontSize: 9.5, fontWeight: 600, fontFamily: PJS, letterSpacing: '0.04em', color: textColor, opacity: 0.6, border: `1px solid ${textColor}33`, borderRadius: 999, padding: '2px 8px' }}>
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function UniverseBanner({ universe, isCurrent, onClick }) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.button
      onClick={onClick}
      initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      onViewportEnter={() => loadUniverseFont(universe)}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      style={{
        display: 'block', width: '100%', height: 'clamp(280px, 30vw, 460px)',
        border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left',
        borderRadius: 0,
      }}
    >
      {universe.imageUrl
        ? <ImageBanner universe={universe} isCurrent={isCurrent} prefersReducedMotion={prefersReducedMotion} />
        : <CompositionBanner universe={universe} isCurrent={isCurrent} />
      }
    </motion.button>
  );
}
