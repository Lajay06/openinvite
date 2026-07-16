/**
 * UniverseWorldView (fix/design-studio-banners) — the entered-world
 * experience, rebuilt from a single "normal page with sections" into a
 * scroll-driven sequence of full-bleed chapters, each with its own
 * background treatment (alternating dark/light fields in the universe's
 * own palette) rather than one white page with headings.
 *
 * The brand-reveal hero still reuses the exact production masthead
 * primitives the real guest-facing site renders
 * (src/components/guest-website/layouts/*Masthead.jsx) — see
 * fix/design-studio-entrance's original comment for why. New here: the
 * hero background (photo or palette/motif composition) gets a subtle
 * parallax as you scroll past it, and every later chapter reveals on
 * scroll — both entirely opacity/transform (no layout thrash) and both
 * fully gated behind prefers-reduced-motion, which collapses everything
 * to its static end-state with no animation at all.
 *
 * Ultra-locked worlds are still fully enterable — every chapter renders
 * identically to an unlocked world; only the closing chapter's action
 * differs (upgrade path instead of a locked door).
 */
import React, { useRef, useState, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import { Crown, ExternalLink } from 'lucide-react';
import { loadUniverseFont } from '@/lib/lazyUniverseFonts';
import MinimalMasthead from '@/components/guest-website/layouts/MinimalMasthead';
import KyotoMasthead from '@/components/guest-website/layouts/KyotoMasthead';
import CapriMasthead from '@/components/guest-website/layouts/CapriMasthead';
import EditorialMasthead from '@/components/guest-website/layouts/EditorialMasthead';
import BrooklynMasthead from '@/components/guest-website/layouts/BrooklynMasthead';
import BaliMasthead from '@/components/guest-website/layouts/BaliMasthead';
import ParisMasthead from '@/components/guest-website/layouts/ParisMasthead';
import CapeTownMasthead from '@/components/guest-website/layouts/CapeTownMasthead';
import MykonosMasthead from '@/components/guest-website/layouts/MykonosMasthead';
import HairlineRule from '@/components/guest-website/layouts/HairlineRule';
import EnsoRing from '@/components/guest-website/layouts/EnsoRing';
import CitrusScallop from '@/components/guest-website/layouts/CitrusScallop';
import TicketStub from '@/components/guest-website/layouts/TicketStub';
import VineRule from '@/components/guest-website/layouts/VineRule';
import CubeBlock from '@/components/guest-website/layouts/CubeBlock';
import WaveDivider from '@/components/guest-website/layouts/WaveDivider';
import LeafCurve from '@/components/guest-website/layouts/LeafCurve';
import SunRayArc from '@/components/guest-website/layouts/SunRayArc';
import ZelligeDivider from '@/components/guest-website/layouts/ZelligeDivider';
import AmalfiMasthead from '@/components/guest-website/layouts/AmalfiMasthead';
import AmalfiWave from '@/components/guest-website/layouts/AmalfiWave';
import SedonaMasthead from '@/components/guest-website/layouts/SedonaMasthead';
import SedonaContour from '@/components/guest-website/layouts/SedonaContour';
import AspenMasthead from '@/components/guest-website/layouts/AspenMasthead';
import AspenPine from '@/components/guest-website/layouts/AspenPine';
import TajMasthead from '@/components/guest-website/layouts/TajMasthead';
import TajArch from '@/components/guest-website/layouts/TajArch';
import HavanaMasthead from '@/components/guest-website/layouts/HavanaMasthead';
import HavanaSunburst from '@/components/guest-website/layouts/HavanaSunburst';
import EdinburghMasthead from '@/components/guest-website/layouts/EdinburghMasthead';
import EdinburghThistle from '@/components/guest-website/layouts/EdinburghThistle';
import MonacoMasthead from '@/components/guest-website/layouts/MonacoMasthead';
import MonacoMast from '@/components/guest-website/layouts/MonacoMast';
import FlorenceMasthead from '@/components/guest-website/layouts/FlorenceMasthead';
import FlorenceVine from '@/components/guest-website/layouts/FlorenceVine';
import SeoulMasthead from '@/components/guest-website/layouts/SeoulMasthead';
import SeoulOrb from '@/components/guest-website/layouts/SeoulOrb';
import ShanghaiMasthead from '@/components/guest-website/layouts/ShanghaiMasthead';
import ShanghaiCloud from '@/components/guest-website/layouts/ShanghaiCloud';
import SaveTheDatePreview from '@/components/universe-studio/assets/SaveTheDatePreview';
import MenuCardPreview from '@/components/universe-studio/assets/MenuCardPreview';
import SeatingChartPreview from '@/components/universe-studio/assets/SeatingChartPreview';
import PlaceCardsPreview from '@/components/universe-studio/assets/PlaceCardsPreview';
import WelcomeSignagePreview from '@/components/universe-studio/assets/WelcomeSignagePreview';
import ThankYouPreview from '@/components/universe-studio/assets/ThankYouPreview';
import InstagramKitPreview from '@/components/universe-studio/assets/InstagramKitPreview';
import MotionGraphicPreview from '@/components/universe-studio/assets/MotionGraphicPreview';

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
  'amalfi-citrus': AmalfiMasthead,
  'sedona-mesa': SedonaMasthead,
  'aspen-lodge': AspenMasthead,
  'taj-pavilion': TajMasthead,
  'havana-deco': HavanaMasthead,
  'edinburgh-estate': EdinburghMasthead,
  'monaco-marina': MonacoMasthead,
  'florence-editorial': FlorenceMasthead,
  'seoul-glass': SeoulMasthead,
  'shanghai-glamour': ShanghaiMasthead,
};

// The large-format motif treatment per universe for the Motifs chapter —
// same real generated primitives the guest site itself uses, just sized
// up for a chapter-scale moment rather than a thin rule. Marrakech reuses
// its own real editorial-masthead motif (ZelligeDivider) rather than a
// second, redundant primitive.
const MOTIF_LARGE = {
  aman: (color) => <HairlineRule color={color} opacity={0.6} width={220} thickness={1} />,
  tulum: (color) => <SunRayArc color={color} opacity={0.55} width={260} height={64} />,
  kyoto: (color) => <EnsoRing color={color} opacity={0.8} size={140} />,
  capri: (color) => <CitrusScallop color={color} bumpSize={16} style={{ maxWidth: 360 }} />,
  brooklyn: (color) => <TicketStub color={color} width={260} height={28} notchSize={10} />,
  bali: (color) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
      <WaveDivider color={color} opacity={0.7} height={40} style={{ width: 220 }} />
      <LeafCurve color={color} opacity={0.8} size={48} />
    </div>
  ),
  paris: (color) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
      <HairlineRule color={color} opacity={0.6} width={220} thickness={1} />
      <HairlineRule color={color} opacity={0.6} width={220} thickness={1} />
    </div>
  ),
  capetown: (color) => <VineRule color={color} opacity={0.75} height={24} style={{ width: 260 }} />,
  mykonos: (color) => <CubeBlock color={color} width={110} height={110} />,
  marrakech: (color) => <ZelligeDivider color={color} opacity={0.6} style={{ width: 260 }} />,
  amalfi: (color) => <AmalfiWave color={color} opacity={0.55} width={260} height={52} />,
  sedona: (color) => <SedonaContour color={color} opacity={0.55} width={280} height={60} />,
  aspen: (color) => <AspenPine color={color} opacity={0.6} size={90} />,
  taj: (color) => <TajArch color={color} opacity={0.55} width={140} height={116} />,
  havana: (color) => <HavanaSunburst color={color} opacity={0.5} width={220} height={110} />,
  edinburgh: (color) => <EdinburghThistle color={color} opacity={0.6} size={80} />,
  monaco: (color) => <MonacoMast color={color} opacity={0.55} width={110} height={78} />,
  florence: (color) => <FlorenceVine color={color} opacity={0.5} width={260} height={56} />,
  seoul: (color) => <SeoulOrb color={color} opacity={0.5} size={120} />,
  shanghai: (color) => <ShanghaiCloud color={color} opacity={0.55} width={240} height={86} />,
};

function GenericMasthead({ coupleNames, kicker, typography, textColor }) {
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

/** Fades/lifts its children into view once as they cross into the
 *  viewport, via a plain IntersectionObserver + CSS opacity/transform
 *  transition — no scroll-linked calculation running every frame, just a
 *  single one-shot callback per chapter. Reveals once and stays revealed
 *  (observer disconnects itself on first intersection, so scrolling back
 *  up never re-hides a chapter). Reduced motion skips the observer
 *  entirely — chapters start (and stay) fully visible, no fade, no drift. */
function Reveal({ children, prefersReducedMotion, style }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(prefersReducedMotion);

  useEffect(() => {
    if (prefersReducedMotion || visible) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') { setVisible(true); return; }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [prefersReducedMotion, visible]);

  return (
    <div
      ref={ref}
      style={{
        ...style,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(14px)',
        transition: prefersReducedMotion ? 'none' : 'opacity 0.6s ease-out, transform 0.6s ease-out',
      }}
    >
      {children}
    </div>
  );
}

function Chapter({ background, children, minHeight = '60vh' }) {
  return (
    <div style={{ background, minHeight, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 'clamp(40px, 8vw, 96px) clamp(24px, 6vw, 64px)' }}>
      {children}
    </div>
  );
}

function HeroChapter({ universe, isCurrent, prefersReducedMotion }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const parallaxY = useTransform(scrollYProgress, [0, 1], ['0%', '22%']);
  const Masthead = MASTHEAD_BY_LAYOUT[universe.layout] || GenericMasthead;
  const smallUrl = universe.imageUrl ? universe.imageUrl.replace(/\.jpg$/, '-800.jpg') : null;

  return (
    <div ref={ref} style={{ position: 'relative', minHeight: '82vh', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {universe.imageUrl ? (
        <motion.img
          src={universe.imageUrl}
          srcSet={`${smallUrl} 800w, ${universe.imageUrl} 1600w`}
          sizes="100vw"
          alt=""
          style={{
            position: 'absolute', inset: '-10% 0', width: '100%', height: '120%', objectFit: 'cover',
            y: prefersReducedMotion ? 0 : parallaxY,
          }}
        />
      ) : (
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(160deg, ${universe.colors.darkBg} 0%, ${universe.colors.darkBg} 55%, ${universe.colors.accent}2E 100%)` }} />
      )}
      <div style={{ position: 'absolute', inset: 0, background: universe.imageUrl ? 'rgba(0,0,0,0.38)' : 'transparent' }} />

      <div style={{ position: 'relative', textAlign: 'center', padding: '0 24px' }}>
        {/* This is the world's own showcase, not the couple's real wedding
            site — the hero shows the universe's own name (reusing the
            Masthead's coupleNames slot, since every Masthead just renders
            whatever string it's given) + tagline. The couple's real names
            appear in the "your wedding in this world" chapter below,
            where their actual pieces are shown. */}
        <Masthead
          coupleNames={universe.name}
          kicker={universe.copy.heroKicker}
          theme={universe.colors}
          typography={universe.typography}
          textColor={universe.colors.lightBg}
          accentColor={universe.colors.accent}
        />
        <p style={{ fontFamily: PJS, fontSize: 13, color: universe.colors.lightBg, opacity: 0.7, margin: '20px 0 0' }}>
          {universe.tagline}
        </p>
      </div>

      {isCurrent && (
        <span style={{ position: 'absolute', top: 24, right: 24, fontSize: 10, fontWeight: 700, fontFamily: PJS, letterSpacing: '0.06em', color: universe.colors.darkBg, background: universe.colors.accent, padding: '5px 12px', borderRadius: 999 }}>
          Your current universe
        </span>
      )}
    </div>
  );
}

export default function UniverseWorldView({
  universe, weddingDetails, guests, isCurrent, canAccessUltra,
  onBack, onSwitchUniverse, onUpgrade, motifNote,
}) {
  const prefersReducedMotion = useReducedMotion();
  const coupleNames = weddingDetails?.coupleNames || 'Your names';
  const slug = weddingDetails?.slug || 'your-wedding';
  const showUpgrade = universe.isUltra && !canAccessUltra && !isCurrent;
  const motifLarge = MOTIF_LARGE[universe.id];
  const { colors, typography } = universe;

  // Opening a world is a deliberate, immediate need for its real font (not
  // a "might scroll into view" case like the banner wall) — load it as
  // soon as this view mounts, deduped against whatever's already loaded.
  useEffect(() => {
    loadUniverseFont(universe);
  }, [universe]);

  // The world view mounts wherever the banner wall happened to be
  // scrolled to (entering a world is a same-page conditional swap, not a
  // real route change — nothing else resets window.scrollY on its own).
  // Resetting here, in useLayoutEffect, runs synchronously before the
  // browser paints this component's first frame, so the hero is always
  // what's actually shown first — never a visible jump from a mid-page
  // landing back up to the top.
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Escape is a second way back, alongside the fixed "All universes"
  // button below — both call the same onBack, which restores the wall's
  // scroll position (see UniverseStudio.jsx).
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') onBack();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onBack]);

  return (
    <div>
      {/* Portalled to document.body — root cause of an earlier invisible/
          unclickable bug: this button lives inside .page-content, which
          (per the same fix applied to UniverseEntranceOverlay.jsx) gets
          its own stacking context the moment any animation with
          animation-fill-mode:forwards is applied to it (pageFadeIn is
          opacity-only, but that's still enough to trigger this). Trapped
          inside that context, this button's zIndex:60 was never compared
          directly against the sidebar (zIndex:40, a sibling outside
          .page-content, promoted to its own stacking context by its own
          `contain: layout` CSS) — the sidebar's outer-level effective
          zIndex beat .page-content's (which has none set, so effectively
          0), and its opaque white background painted straight over this
          button. Confirmed via a real browser: before this fix,
          elementFromPoint at the button's centre returned the sidebar div;
          after portalling, it returns the button itself.

          left is offset from the CONTENT area, not the viewport — the
          sidebar is a constant, non-responsive, non-collapsible 200px
          (AnimatedSidebar.jsx; no breakpoint/collapsed state exists), so
          200 (sidebar width) + 32 (8px-grid offset) = 232 always lands
          just inside the content edge, never over the sidebar, at every
          viewport width. */}
      {createPortal(
        <button
          onClick={onBack}
          style={{
            // top clears the app's fixed 48px top bar (plus the 36px trial
            // banner, when present) with room to spare — 20px collided with
            // both. A dark scrim + blur (rather than a light pill) reads
            // legibly over every chapter background, light or dark, without
            // needing to know which chapter is currently in view.
            position: 'fixed', top: 96, left: 232, zIndex: 60,
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'rgba(10,10,10,0.55)', backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.18)', borderRadius: 999, padding: '7px 16px',
            cursor: 'pointer', fontFamily: PJS, fontSize: 12, fontWeight: 600, color: '#FFFFFF',
          }}
        >
          ← All universes
        </button>,
        document.body
      )}

      {/* Chapter 1 — hero, full-bleed, parallax */}
      <HeroChapter universe={universe} isCurrent={isCurrent} prefersReducedMotion={prefersReducedMotion} />

      {/* Chapter 2 — the world's story */}
      <Chapter background={colors.lightBg} minHeight="50vh">
        <Reveal prefersReducedMotion={prefersReducedMotion} style={{ maxWidth: 760, margin: '0 auto', textAlign: 'center' }}>
          <p style={{ fontFamily: PJS, fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: colors.accent, margin: '0 0 20px' }}>
            Nº 01 — The world
          </p>
          <p style={{ fontFamily: typography.headingFont, fontWeight: typography.headingWeight, fontSize: 'clamp(1.6rem, 3.4vw, 2.6rem)', color: colors.lightText, margin: 0, lineHeight: 1.35 }}>
            {universe.worldStory}
          </p>
        </Reveal>
      </Chapter>

      {/* Chapter 3 — palette, big and physical */}
      <Chapter background={colors.darkBg}>
        <Reveal prefersReducedMotion={prefersReducedMotion}>
          <p style={{ fontFamily: PJS, fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: colors.accent, margin: '0 0 32px', textAlign: 'center' }}>
            Nº 02 — Palette
          </p>
          <div style={{ display: 'flex', gap: 'clamp(16px, 3vw, 40px)', flexWrap: 'wrap', justifyContent: 'center' }}>
            {[
              ['Dark ground', colors.darkBg], ['Light ground', colors.lightBg],
              ['Accent', colors.accent], ['Accent secondary', colors.accentSecondary],
            ].filter(([, v]) => v).map(([label, hex]) => (
              <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
                <div style={{ width: 'clamp(90px, 12vw, 160px)', height: 'clamp(90px, 12vw, 160px)', background: hex, border: '1px solid rgba(255,255,255,0.12)' }} />
                <span style={{ fontSize: 12, fontWeight: 600, fontFamily: PJS, color: colors.lightBg, opacity: 0.8 }}>{label}</span>
                <span style={{ fontSize: 11, fontFamily: PJS, color: colors.lightBg, opacity: 0.5 }}>{hex}</span>
              </div>
            ))}
          </div>
        </Reveal>
      </Chapter>

      {/* Chapter 4 — type specimen at scale */}
      <Chapter background={colors.lightBg}>
        <Reveal prefersReducedMotion={prefersReducedMotion} style={{ maxWidth: 820, margin: '0 auto' }}>
          <p style={{ fontFamily: PJS, fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: colors.accent, margin: '0 0 32px', textAlign: 'center' }}>
            Nº 03 — Typography
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 11, fontWeight: 600, fontFamily: PJS, color: colors.lightText, opacity: 0.5, margin: '0 0 12px' }}>
                Heading — {typography.headingFont?.replace(/["']/g, '').split(',')[0]}
              </p>
              <p style={{ fontFamily: typography.headingFont, fontWeight: typography.headingWeight, fontSize: 'clamp(2.4rem, 6vw, 4.4rem)', color: colors.lightText, margin: 0, lineHeight: 1.05 }}>
                Aa Bb Cc
              </p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 11, fontWeight: 600, fontFamily: PJS, color: colors.lightText, opacity: 0.5, margin: '0 0 12px' }}>
                Body — {typography.bodyFont?.replace(/["']/g, '').split(',')[0]}
              </p>
              <p style={{ fontFamily: typography.bodyFont, fontSize: 18, color: colors.lightText, opacity: 0.85, margin: 0, lineHeight: 1.6 }}>
                The quick brown fox jumps over the lazy dog.
              </p>
            </div>
          </div>
        </Reveal>
      </Chapter>

      {/* Chapter 5 — motifs & textures, large */}
      <Chapter background={colors.darkBg}>
        <Reveal prefersReducedMotion={prefersReducedMotion} style={{ textAlign: 'center' }}>
          <p style={{ fontFamily: PJS, fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: colors.accent, margin: '0 0 32px' }}>
            Nº 04 — Motifs & textures
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
            {motifLarge ? motifLarge(colors.accent) : (
              <span style={{ fontFamily: PJS, fontSize: 13, color: colors.lightBg, opacity: 0.5 }}>
                No dedicated motif yet for this world — the shared baseline styling applies.
              </span>
            )}
          </div>
          <p style={{ fontFamily: PJS, fontSize: 14, color: colors.lightBg, opacity: 0.7, maxWidth: 560, margin: '0 auto', lineHeight: 1.6 }}>
            {motifNote}
          </p>
        </Reveal>
      </Chapter>

      {/* Chapter 6 — your wedding in this world. This is where the
          couple's real names belong (per the hero-title consistency
          fix — the hero above always shows the universe's own name, this
          chapter is where their actual pieces, in their actual names,
          are shown). Every asset type the product has, not a subset. */}
      <Chapter background={colors.lightBg} minHeight="70vh">
        <Reveal prefersReducedMotion={prefersReducedMotion}>
          <p style={{ fontFamily: PJS, fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: colors.accent, margin: '0 0 12px', textAlign: 'center' }}>
            Nº 05 — Your wedding in this world
          </p>
          <p style={{ fontFamily: typography.headingFont, fontWeight: typography.headingWeight, fontSize: 'clamp(1.4rem, 3vw, 2rem)', color: colors.lightText, margin: '0 0 40px', textAlign: 'center' }}>
            {coupleNames}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 18, maxWidth: 1040, margin: '0 auto' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ height: 220, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.08)' }}>
                <SaveTheDatePreview universe={universe.id} weddingDetails={weddingDetails} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, fontFamily: PJS, color: colors.lightText, opacity: 0.6 }}>Save the date</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ height: 220, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.08)' }}>
                <MiniLinkCard label="Invitation website" sublabel={`/w/${slug}`} href={`/w/${slug}`} colors={colors} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, fontFamily: PJS, color: colors.lightText, opacity: 0.6 }}>Website</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ height: 220, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.08)' }}>
                <MiniLinkCard label="RSVP page" sublabel={`/w/${slug}/rsvp`} href={`/w/${slug}/rsvp`} colors={colors} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, fontFamily: PJS, color: colors.lightText, opacity: 0.6 }}>RSVP page</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ height: 220, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.08)' }}>
                <MenuCardPreview universe={universe.id} weddingDetails={weddingDetails} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, fontFamily: PJS, color: colors.lightText, opacity: 0.6 }}>Menu</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ height: 220, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.08)' }}>
                <SeatingChartPreview universe={universe.id} weddingDetails={weddingDetails} guests={guests} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, fontFamily: PJS, color: colors.lightText, opacity: 0.6 }}>Seating chart</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ height: 220, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.08)' }}>
                <PlaceCardsPreview universe={universe.id} weddingDetails={weddingDetails} guests={guests} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, fontFamily: PJS, color: colors.lightText, opacity: 0.6 }}>Place cards</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ height: 220, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.08)' }}>
                <WelcomeSignagePreview universe={universe.id} weddingDetails={weddingDetails} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, fontFamily: PJS, color: colors.lightText, opacity: 0.6 }}>Welcome sign</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ height: 220, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.08)' }}>
                <ThankYouPreview universe={universe.id} weddingDetails={weddingDetails} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, fontFamily: PJS, color: colors.lightText, opacity: 0.6 }}>Thank you card</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ height: 220, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.08)' }}>
                <InstagramKitPreview universe={universe.id} weddingDetails={weddingDetails} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, fontFamily: PJS, color: colors.lightText, opacity: 0.6 }}>Instagram kit</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ height: 220, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.08)' }}>
                <MotionGraphicPreview universe={universe.id} weddingDetails={weddingDetails} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, fontFamily: PJS, color: colors.lightText, opacity: 0.6 }}>Motion graphic</span>
            </div>
          </div>
        </Reveal>
      </Chapter>

      {/* Chapter 7 — closing finale */}
      <Chapter background={colors.darkBg} minHeight="55vh">
        <Reveal prefersReducedMotion={prefersReducedMotion} style={{ textAlign: 'center', maxWidth: 560, margin: '0 auto' }}>
          {showUpgrade ? (
            <>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg,#FBBF24,#F59E0B)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <Crown size={22} color="#FFFFFF" />
              </div>
              <p style={{ fontFamily: typography.headingFont, fontWeight: typography.headingWeight, fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', color: colors.lightBg, margin: '0 0 12px' }}>
                {universe.name} is part of Ultra
              </p>
              <p style={{ fontFamily: PJS, fontSize: 13, color: colors.lightBg, opacity: 0.7, margin: '0 0 28px' }}>
                Upgrade to make this your universe — it restyles your existing invitations, website and RSVP, non-destructively.
              </p>
              <button onClick={onUpgrade} style={{ padding: '12px 28px', borderRadius: 999, border: 'none', background: '#E03553', color: '#FFFFFF', fontFamily: PJS, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                Upgrade to Ultra
              </button>
            </>
          ) : (
            <>
              <p style={{ fontFamily: typography.headingFont, fontWeight: typography.headingWeight, fontSize: 'clamp(1.8rem, 3.6vw, 2.6rem)', color: colors.lightBg, margin: '0 0 24px' }}>
                {isCurrent ? "You're already here" : `Step into ${universe.name}`}
              </p>
              <button
                onClick={() => onSwitchUniverse(universe.id)}
                disabled={isCurrent}
                style={{ padding: '14px 32px', borderRadius: 999, border: 'none', background: colors.accent, color: colors.darkBg, fontFamily: PJS, fontSize: 15, fontWeight: 700, cursor: isCurrent ? 'default' : 'pointer', opacity: isCurrent ? 0.6 : 1 }}
              >
                {isCurrent ? 'This is your current universe' : 'Make this my universe'}
              </button>
              <p style={{ fontFamily: PJS, fontSize: 12, color: colors.lightBg, opacity: 0.55, margin: '16px 0 0' }}>
                Restyles your existing invitations, website and RSVP — switching is never destructive.
              </p>
            </>
          )}
        </Reveal>
      </Chapter>
    </div>
  );
}
