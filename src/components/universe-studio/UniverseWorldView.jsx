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
 *
 * feat/universe-world-persistent-fullscreen: previously this rendered as
 * an ordinary in-flow child of Layout.jsx's .page-content — the entrance
 * transition (UniverseEntranceOverlay.jsx) portals to document.body and
 * genuinely covers the sidebar, but once phase flips to 'world' that
 * portal unmounts and THIS view took over with no such technique, so the
 * sidebar reappeared beside it (a windowed layout, not an escape). The
 * owner wanted persistent full-screen — this now uses the exact same
 * document.body portal + position:fixed;inset:0 technique
 * UniverseEntranceOverlay already proved out, but for the WHOLE 'world'
 * phase, not just the transient wash. Gated behind `escapeLayout` (default
 * true) rather than applied unconditionally: OnboardingStepUniverse.jsx
 * renders this same component inside its own Dialog/DialogContent (which
 * already IS its own scrollable, portalled overlay) — portalling a SECOND
 * time there would escape the Dialog itself, not just the sidebar, and
 * break its close/backdrop behaviour. That caller passes
 * escapeLayout={false} and keeps its existing (pre-this-change) rendering
 * untouched.
 *
 * Double-mount safety (same reasoning as UniverseEntranceOverlay.jsx):
 * Layout.jsx mounts every page twice (desktop + mobile trees, CSS-
 * toggled), so UniverseStudio.jsx — and this component's `phase==='world'`
 * gate that controls whether it renders at all — exists as two independent
 * component-local state instances. Only the tree that actually received
 * the click can ever transition its own phase to 'world', so only one
 * instance of this view (and its portal) is ever mounted at a time.
 */
import React, { useRef, useState, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import { ExternalLink } from 'lucide-react';
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

import { coupleDisplayName } from '@/lib/coupleNames';
import { sampleHeroImage } from '@/lib/sampleContent/mergeSample';
const PJS = "'Plus Jakarta Sans', sans-serif";

const MASTHEAD_BY_LAYOUT = {
  'london-minimal': MinimalMasthead,
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
  london: (color) => <HairlineRule color={color} opacity={0.6} width={220} thickness={1} />,
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

/**
 * The two surfaces a couple actually has. Renders as a LINK when the site is
 * published and as an INERT CARD when it is not — never as a link to an address
 * that does not exist. `href={null}` is the unpublished state, and it changes
 * the element, not merely the styling: there is nothing to click, so nothing
 * offers to be clicked.
 */
function RealSurfaceTile({ label, sublabel, href, colors }) {
  const inner = (
    <>
      <div style={{ width: 40, height: 40, border: `1px solid ${href ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.12)'}`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <ExternalLink size={16} color={href ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.3)'} />
      </div>
      <p style={{ color: colors.lightBg, fontSize: 14, fontWeight: 600, fontFamily: PJS, textAlign: 'center', margin: 0 }}>{label}</p>
      <p style={{ color: colors.lightBg, opacity: href ? 0.5 : 0.35, fontSize: 11, textAlign: 'center', margin: 0, fontFamily: PJS }}>{sublabel}</p>
    </>
  );
  const box = {
    width: '100%', minHeight: 180, background: colors.darkBg, textDecoration: 'none',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    padding: 24, gap: 10,
  };
  if (!href) return <div style={{ ...box, opacity: 0.72 }}>{inner}</div>;
  return <a href={href} target="_blank" rel="noopener noreferrer" style={box}>{inner}</a>;
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

function HeroChapter({ universe, isCurrent, prefersReducedMotion, scrollContainerRef }) {
  const ref = useRef(null);
  // Without an explicit `container`, useScroll tracks progress against
  // document/window scroll — correct when this chapter is an ordinary
  // in-flow page element, but the full-screen portal below is its own
  // position:fixed, internally-scrolling element, and window itself no
  // longer scrolls once escapeLayout is active. scrollContainerRef is only
  // passed in that case; omitted (undefined) preserves the original
  // window-scroll-tracking behaviour for the non-escaping (onboarding
  // Dialog) caller, unchanged.
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
    ...(scrollContainerRef ? { container: scrollContainerRef } : {}),
  });
  const parallaxY = useTransform(scrollYProgress, [0, 1], ['0%', '22%']);
  const Masthead = MASTHEAD_BY_LAYOUT[universe.layout] || GenericMasthead;
  // WHERE A UNIVERSE HAS SAMPLE CONTENT, ITS HERO IS THE BETTER PICTURE.
  //
  // The picker draws /universes/<id>.jpg, a static asset from the universe
  // config. That config is a token file and is not touched here. But a
  // universe with sample content has a hero photograph the couple is about to
  // see filling their own preview, and showing them a different image here
  // meant the picker promised one thing and the preview delivered another.
  //
  // Falls back to the static asset for every universe without sample content,
  // which is eighteen of the twenty today.
  const heroUrl = sampleHeroImage(universe.id) || universe.imageUrl;
  // The -800 companion exists only for the static assets; a Cloudinary URL
  // carries its own width in the transform, so there is no second file to
  // point at and srcSet is dropped rather than pointed at a 404.
  const smallUrl = heroUrl && heroUrl === universe.imageUrl && /\.jpg$/.test(heroUrl)
    ? heroUrl.replace(/\.jpg$/, '-800.jpg')
    : null;

  return (
    <div ref={ref} style={{ position: 'relative', minHeight: '82vh', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {heroUrl ? (
        <motion.img
          src={heroUrl}
          {...(smallUrl ? { srcSet: `${smallUrl} 800w, ${heroUrl} 1600w`, sizes: '100vw' } : {})}
          alt=""
          style={{
            position: 'absolute', inset: '-10% 0', width: '100%', height: '120%', objectFit: 'cover',
            y: prefersReducedMotion ? 0 : parallaxY,
          }}
        />
      ) : (
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(160deg, ${universe.colors.darkBg} 0%, ${universe.colors.darkBg} 55%, ${universe.colors.accent}2E 100%)` }} />
      )}
      <div style={{ position: 'absolute', inset: 0, background: heroUrl ? 'rgba(0,0,0,0.38)' : 'transparent' }} />

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
  // backButtonStyle: overrides the fixed "← All universes" button's
  // position. Defaults to the Design Studio placement (clears its
  // 200px sidebar + 48px top bar + trial banner) when escapeLayout is
  // true — see below, the sidebar is covered either way, but the button
  // still sits at the content-area edge rather than the raw viewport edge,
  // matching where a couple's eye already expects dashboard chrome.
  // Onboarding renders this view with none of that chrome present at all,
  // so it passes its own offset — see OnboardingStepUniverse.jsx.
  backButtonStyle,
  // escapeLayout: portals the whole view to document.body as a persistent
  // position:fixed;inset:0 layer (same technique UniverseEntranceOverlay.jsx
  // already uses for the transient entrance wash), so it stays full-screen
  // for as long as the couple is exploring rather than rendering as an
  // ordinary windowed page beside the dashboard sidebar. Defaults true —
  // the Design Studio caller (UniverseStudio.jsx) wants this. Defaults to
  // false only for OnboardingStepUniverse.jsx, which already renders this
  // component inside its own Dialog/DialogContent (an existing scrollable
  // overlay) — portalling a second, independent full-screen layer there
  // would escape the Dialog itself, not just a sidebar that isn't present
  // in that context anyway.
  escapeLayout = true,
}) {
  const prefersReducedMotion = useReducedMotion();
  const coupleNames = coupleDisplayName(weddingDetails, 'Your names');
  // PUBLISHED IS websiteEnabled, NOT slug — and the difference is not academic.
  //
  // A slug is DERIVED FROM THE COUPLE'S NAMES AND CLAIMED AT ONBOARDING
  // (Onboarding.jsx calls syncWeddingAddress, long before anything is
  // published), so nearly every couple has one from the day they sign up.
  // Measured 2026-08-31 against the live records: 16 of 19 carry a slug, and
  // 11 of those have websiteEnabled false. Gating on the slug alone would have
  // shown two live tiles to eleven couples who have published nothing — the
  // exact defect this state exists to prevent, wearing the fix's clothes.
  //
  // BOTH are required, which is the pattern StudioShareTab.jsx:134 already
  // uses: websiteEnabled says the couple chose to go live, the slug says there
  // is an address to go live AT. Two records have websiteEnabled true with an
  // empty slug, so the second half is load-bearing too.
  //
  // The 'your-wedding' fallback below stays a DISPLAY placeholder and must
  // never become an href — a placeholder wearing the clothes of an address is
  // the same family as an invented business or a fabricated place id.
  const isPublished = Boolean(weddingDetails?.websiteEnabled && weddingDetails?.slug);
  const slug = weddingDetails?.slug || 'your-wedding';
  const showUpgrade = universe.isUltra && !canAccessUltra && !isCurrent;
  const motifLarge = MOTIF_LARGE[universe.id];
  const { colors, typography } = universe;
  const scrollContainerRef = useRef(null);

  // Opening a world is a deliberate, immediate need for its real font (not
  // a "might scroll into view" case like the banner wall) — load it as
  // soon as this view mounts, deduped against whatever's already loaded.
  useEffect(() => {
    loadUniverseFont(universe);
  }, [universe]);

  // The world view mounts wherever the banner wall happened to be
  // scrolled to (entering a world is a same-page conditional swap, not a
  // real route change — nothing else resets scroll position on its own).
  // Resetting here, in useLayoutEffect, runs synchronously before the
  // browser paints this component's first frame, so the hero is always
  // what's actually shown first — never a visible jump from a mid-page
  // landing back up to the top. Targets the new fixed scroll container
  // when escapeLayout is active (window itself no longer scrolls — the
  // portal covers it); otherwise unchanged (window.scrollTo, exactly as
  // before this change) for the non-escaping caller.
  useLayoutEffect(() => {
    if (escapeLayout) scrollContainerRef.current?.scrollTo(0, 0);
    else window.scrollTo(0, 0);
  }, [escapeLayout]);

  // Locks the underlying dashboard's own scroll while the full-screen
  // portal is open — without this, a wheel/touch gesture that runs past
  // the portal's own scroll extent can scroll-chain into whatever's
  // sitting behind it (still fully mounted, just visually covered),
  // producing a jarring peek of the sidebar mid-scroll. Restores on
  // unmount unconditionally, not just when escapeLayout — cheap, and
  // guarantees this can never leave the dashboard permanently unscrollable
  // if escapeLayout's value somehow changes across a re-render.
  useEffect(() => {
    if (!escapeLayout) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prevOverflow; };
  }, [escapeLayout]);

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

  const backButton = (
    <button
      onClick={onBack}
      style={{
        // top clears the app's fixed 48px top bar (plus the 36px trial
        // banner, when present) with room to spare — 20px collided with
        // both. A dark scrim + blur (rather than a light pill) reads
        // legibly over every chapter background, light or dark, without
        // needing to know which chapter is currently in view.
        //
        // zIndex must clear whatever this view's own full-screen container
        // uses (2000, when escapeLayout — see below) as well as the
        // sidebar (60 was only ever chosen to beat the sidebar's own 40;
        // see the escapeLayout history note above the component for how
        // that stacking-context bug was originally found and fixed).
        position: 'fixed', top: 96, left: 232, zIndex: escapeLayout ? 2001 : 60,
        display: 'flex', alignItems: 'center', gap: 6,
        background: 'rgba(10,10,10,0.55)', backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255,255,255,0.18)', borderRadius: 999, padding: '7px 16px',
        cursor: 'pointer', fontFamily: PJS, fontSize: 12, fontWeight: 600, color: '#FFFFFF',
        ...backButtonStyle,
      }}
    >
      ← All universes
    </button>
  );

  const chapters = (
    <>
      {/* Chapter 1 — hero, full-bleed, parallax */}
      <HeroChapter
        universe={universe}
        isCurrent={isCurrent}
        prefersReducedMotion={prefersReducedMotion}
        scrollContainerRef={escapeLayout ? scrollContainerRef : undefined}
      />

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

      {/* Nº 05 (the hero is unnumbered, so this is the sixth <Chapter>
            but the fifth numbered section — the heading a couple reads is
            correct and this comment used to disagree with it).

            Your wedding in this world. This is where the
          couple's real names belong (per the hero-title consistency
          fix — the hero above always shows the universe's own name, this
          chapter shows the world carrying their actual names).

          THESE ARE ILLUSTRATIONS, NOT DELIVERABLES. The asset feature — the
          tool a couple used to make and edit these pieces — was removed in
          Wave 2. This chapter kept its previews because their SECOND job is
          showing someone what a universe looks like at the moment they choose
          one, which is also why they still render in onboarding.

          The framing had to change with the deletion: a labelled inventory of
          pieces, under the couple's own names, on the first screen they see,
          would be the interface reporting a state the system does not have —
          created by our own subtraction. The website and RSVP tiles are the
          exception and remain real: they are live links to /w/:slug.

          Passes the FULL universe object (not universe.id) to every asset
          preview below — was passing just the id, which is why every
          universe's assets rendered identically: none of the 8 preview
          components could reach universe.colors/typography from an id
          string alone, so each hardcoded its own styling instead. The
          colors/typography themselves already existed for all 20
          universes in UNIVERSE_CONFIGS — this was a wiring gap, not
          missing design data. */}
      <Chapter background={colors.lightBg} minHeight="70vh">
        <Reveal prefersReducedMotion={prefersReducedMotion}>
          <p style={{ fontFamily: PJS, fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: colors.accent, margin: '0 0 12px', textAlign: 'center' }}>
            Nº 05 — Your wedding in this world
          </p>
          {/* Says what the tiles ARE. Without it the labels below read as an
              inventory of pieces the couple will be given. */}
          <p style={{ fontFamily: PJS, fontSize: 13, color: colors.lightText, opacity: 0.55, margin: '0 0 20px', textAlign: 'center', maxWidth: 520, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>
            Your wedding site and RSVP page, in this world.
          </p>
          <p style={{ fontFamily: typography.headingFont, fontWeight: typography.headingWeight, fontSize: 'clamp(1.4rem, 3vw, 2rem)', color: colors.lightText, margin: '0 0 40px', textAlign: 'center' }}>
            {coupleNames}
          </p>
            {/* TWO REAL SURFACES, NOT TEN ILLUSTRATIONS.
                This grid used to carry eight speculative asset tiles beside
                these two. The asset feature was removed in Wave 2, so those
                eight showed a couple pieces the product would never produce —
                under their own names, on the first screen they see. The two
                that were always real are promoted in their place.

                The eight preview COMPONENTS stay alive and are untouched:
                UniverseStudio.jsx still uses them for choosing a universe,
                where the identical tile is honest. The same image is an
                illustration in one place and a promise in another; context
                decides, so this is placement, not deletion.

                minmax(200px) was sized for a ten-item inventory — two items in
                it would read as leftovers. Two columns, because these are the
                product rather than thumbnails of it. */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, maxWidth: 780, margin: '0 auto' }}>
              <RealSurfaceTile
                label="Invitation website"
                sublabel={isPublished ? `/w/${slug}` : 'Not published yet'}
                href={isPublished ? `/w/${slug}` : null}
                colors={colors}
              />
              <RealSurfaceTile
                label="RSVP page"
                sublabel={isPublished ? `/w/${slug}/rsvp` : 'Not published yet'}
                href={isPublished ? `/w/${slug}/rsvp` : null}
                colors={colors}
              />
            </div>
            {!isPublished && (
              <p style={{ fontFamily: PJS, fontSize: 12, color: colors.lightText, opacity: 0.55, margin: '18px 0 0', textAlign: 'center' }}>
                Publish your site to give these an address.{' '}
                <a href="/website-editor" style={{ color: colors.lightText, opacity: 0.9 }}>Open the website editor</a>
              </p>
            )}
        </Reveal>
      </Chapter>

      {/* Chapter 7 — closing finale */}
      <Chapter background={colors.darkBg} minHeight="55vh">
        <Reveal prefersReducedMotion={prefersReducedMotion} style={{ textAlign: 'center', maxWidth: 560, margin: '0 auto' }}>
          {showUpgrade ? (
            <>
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
    </>
  );

  if (!escapeLayout) {
    // Was a second, independent createPortal call for just this button,
    // separate from the Dialog's own DialogPortal (the caller here
    // is OnboardingStepUniverse.jsx's Dialog/DialogContent). Radix sets
    // pointer-events:none on <body> while a modal Dialog is open (its
    // focus-lock) and only re-enables it for the Dialog's own portalled
    // subtree — a button portalled separately to document.body sits as a
    // sibling to that subtree, never gets pointer-events restored, and is
    // silently unclickable despite rendering visually on top (confirmed via
    // getComputedStyle: pointer-events: none on the button itself). That
    // silently-dead button is what pushed a user to the browser's own Back
    // button instead — which, since opening the preview never pushes a
    // history entry, exits the wizard entirely rather than returning to the
    // grid. Rendering backButton as a normal child here (already inside the
    // Dialog's own subtree, since escapeLayout=false means no second
    // full-screen portal wraps it) fixes that: same fixed positioning
    // (backButtonStyle is unchanged), now correctly inside the scope Radix
    // keeps interactive.
    return (
      <div>
        {backButton}
        {chapters}
      </div>
    );
  }

  // escapeLayout: the whole view — chapters AND back button — portals to
  // document.body as one persistent position:fixed;inset:0 layer, so it
  // genuinely covers the sidebar (still mounted underneath, per the
  // double-mount note above) for as long as this phase is active, not just
  // during the transient entrance wash. overflowY:auto makes this div the
  // real scrolling element from here on — window itself no longer scrolls
  // (see the body-scroll-lock effect above), which is exactly why
  // HeroChapter's useScroll() above was given this same ref as its
  // `container`.
  return createPortal(
    <div
      ref={scrollContainerRef}
      style={{ position: 'fixed', inset: 0, zIndex: 2000, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}
    >
      {backButton}
      {chapters}
    </div>,
    document.body
  );
}
