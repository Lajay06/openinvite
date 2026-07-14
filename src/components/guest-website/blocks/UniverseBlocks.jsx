/**
 * UniverseBlocks — renders a couple's ordered list of content blocks
 * ("freedom within beauty"). This is NOT a parallel render tree: it's a
 * plain component imported directly by the real page components
 * (WeddingHomePage.jsx, WeddingOurStoryPage.jsx, WeddingCelebrationPage.jsx),
 * so it renders identically wherever those components render — published
 * site, builder canvas, full-screen preview — because it's the same
 * component instance running inside the same render, not a second one fed
 * the same data independently. See BUILDER_BLOCK_SCOPE.md.
 *
 * Every block resolves colour + typography from the SAME theme/typography
 * objects the page component already received from resolveColors/
 * resolveTypography — a block cannot look off-brand because it never
 * chooses its own colours or fonts. Two block types additionally pick a
 * per-universe *shape* accent (the divider on `spacer`, the kicker mark on
 * `heading`), reusing already-built primitives from ../layouts — never a
 * hardcoded block style, and never a couple-chosen manual override (no
 * per-block background/colour/alignment picker — that escape hatch is
 * exactly what made the old section builder able to go off-brand).
 */
import React from 'react';
import SectionReveal from '../SectionReveal';
import { isMotionEnabled } from '@/lib/universeStyling';

import HairlineRule from '../layouts/HairlineRule';
import ZelligeDivider from '../layouts/ZelligeDivider';
import EnsoRing from '../layouts/EnsoRing';
import TicketStub from '../layouts/TicketStub';
import WaveDivider from '../layouts/WaveDivider';
import CitrusScallop from '../layouts/CitrusScallop';
import VineRule from '../layouts/VineRule';
import CubeBlock from '../layouts/CubeBlock';

import MinimalSectionMark from '../layouts/MinimalSectionMark';
import KyotoSectionMark from '../layouts/KyotoSectionMark';
import EditorialSectionKicker from '../layouts/EditorialSectionKicker';
import BrooklynSectionMark from '../layouts/BrooklynSectionMark';
import BaliSectionMark from '../layouts/BaliSectionMark';
import ParisSectionMark from '../layouts/ParisSectionMark';
import CapriSectionMark from '../layouts/CapriSectionMark';
import CapeTownSectionMark from '../layouts/CapeTownSectionMark';
import MykonosSectionMark from '../layouts/MykonosSectionMark';

// Per-universe divider accent for the `spacer` block's 'rule' variant.
// Every entry here is one of the already-built, reused-as-is primitives
// from ../layouts — no new shapes invented for this feature.
const DIVIDER_BY_LAYOUT = {
  'aman-minimal': HairlineRule,
  'kyoto-vertical': EnsoRing,
  'editorial-masthead': ZelligeDivider,
  'brooklyn-offgrid': TicketStub,
  'bali-organic': WaveDivider,
  'paris-couture': HairlineRule,
  'capri-citrus': CitrusScallop,
  'capetown-estate': VineRule,
  'mykonos-whitewash': CubeBlock,
};

// Per-universe kicker mark for a `heading` block's optional kicker label.
const KICKER_BY_LAYOUT = {
  'aman-minimal': MinimalSectionMark,
  'kyoto-vertical': KyotoSectionMark,
  'editorial-masthead': EditorialSectionKicker,
  'brooklyn-offgrid': BrooklynSectionMark,
  'bali-organic': BaliSectionMark,
  'paris-couture': ParisSectionMark,
  'capri-citrus': CapriSectionMark,
  'capetown-estate': CapeTownSectionMark,
  'mykonos-whitewash': MykonosSectionMark,
};

function UniverseDivider({ universeConfig, theme }) {
  const Divider = DIVIDER_BY_LAYOUT[universeConfig?.layout] || HairlineRule;
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
      <Divider color={theme.accent} />
    </div>
  );
}

function UniverseKicker({ text, universeConfig, theme, typography }) {
  const Kicker = KICKER_BY_LAYOUT[universeConfig?.layout];
  if (Kicker) {
    return <Kicker kicker={text} theme={theme} typography={typography} textColor={theme.lightText} accentColor={theme.accent} />;
  }
  // No matching universe layout (e.g. Tulum, or no universe set) — a plain,
  // sentence-case label, never uppercase (house rule).
  return (
    <p style={{ fontFamily: typography.bodyFont, fontSize: 13, fontWeight: 600, letterSpacing: '0.04em', color: theme.accent, margin: '0 0 8px' }}>
      {text}
    </p>
  );
}

function HeadingBlock({ content, theme, typography, universeConfig }) {
  return (
    <div style={{ textAlign: 'center', maxWidth: 720, margin: '0 auto' }}>
      {content.kicker && (
        <UniverseKicker text={content.kicker} universeConfig={universeConfig} theme={theme} typography={typography} />
      )}
      <h2 style={{ fontFamily: typography.headingFont, fontWeight: typography.headingWeight, fontStyle: typography.headingStyle || 'normal', fontSize: 'clamp(1.5rem, 4vw, 2.25rem)', color: theme.lightText, margin: 0, lineHeight: 1.2 }}>
        {content.text}
      </h2>
    </div>
  );
}

function ParagraphBlock({ content, theme, typography }) {
  return (
    <p style={{ fontFamily: typography.bodyFont, fontWeight: typography.bodyWeight, fontSize: 'clamp(0.9375rem, 1.6vw, 1.0625rem)', lineHeight: 1.8, color: theme.lightText, maxWidth: 640, margin: '0 auto', whiteSpace: 'pre-wrap' }}>
      {content.text}
    </p>
  );
}

function PhotoBlock({ content, theme }) {
  if (!content.url) return null;
  return (
    <figure style={{ margin: 0, maxWidth: 720, marginLeft: 'auto', marginRight: 'auto' }}>
      <img src={content.url} alt={content.caption || ''} style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'cover' }} />
      {content.caption && (
        <figcaption style={{ fontSize: 13, color: theme.lightText, opacity: 0.6, textAlign: 'center', marginTop: 10 }}>
          {content.caption}
        </figcaption>
      )}
    </figure>
  );
}

function GalleryBlock({ content }) {
  const photos = content.photos || [];
  if (photos.length === 0) return null;
  // auto-fit + a minmax derived from the chosen column count: approximates
  // that count on wide viewports, but naturally collapses to fewer columns
  // on mobile instead of squeezing a fixed column count into a narrow
  // screen (a fixed `repeat(N, 1fr)` would do exactly that).
  const columns = content.columns || 3;
  const minWidth = Math.round(720 / columns) - 16;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(${minWidth}px, 1fr))`, gap: 16 }}>
      {photos.map((url, i) => (
        <div key={i} style={{ aspectRatio: '1', overflow: 'hidden' }}>
          <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        </div>
      ))}
    </div>
  );
}

function QuoteBlock({ content, theme, typography }) {
  return (
    <div style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto' }}>
      <p style={{ fontFamily: typography.headingFont, fontWeight: typography.headingWeight, fontStyle: 'italic', fontSize: 'clamp(1.125rem, 2.4vw, 1.5rem)', color: theme.lightText, lineHeight: 1.5, margin: '0 0 12px' }}>
        “{content.text}”
      </p>
      {content.attribution && (
        <p style={{ fontFamily: typography.bodyFont, fontSize: 13, color: theme.accent, margin: 0 }}>
          — {content.attribution}
        </p>
      )}
    </div>
  );
}

function SpacerBlock({ content, theme, universeConfig }) {
  if (content.variant === 'rule') {
    return <UniverseDivider universeConfig={universeConfig} theme={theme} />;
  }
  return <div style={{ height: content.height || 40 }} />;
}

const RENDERERS = {
  heading: HeadingBlock,
  paragraph: ParagraphBlock,
  photo: PhotoBlock,
  gallery: GalleryBlock,
  quote: QuoteBlock,
  spacer: SpacerBlock,
};

export default function UniverseBlocks({ blocks, weddingDetails, theme, typography, universeConfig }) {
  if (!blocks || blocks.length === 0) return null;
  const sorted = [...blocks].sort((a, b) => (a.order || 0) - (b.order || 0));
  const motionDisabled = !isMotionEnabled(weddingDetails);

  return (
    <div style={{ backgroundColor: theme.lightBg, display: 'flex', flexDirection: 'column', gap: 40, padding: '64px 24px' }}>
      {sorted.map(block => {
        const Renderer = RENDERERS[block.type];
        if (!Renderer) return null;
        return (
          <SectionReveal key={block.id} universeConfig={universeConfig} disabled={motionDisabled}>
            <Renderer content={block.content || {}} theme={theme} typography={typography} universeConfig={universeConfig} />
          </SectionReveal>
        );
      })}
    </div>
  );
}
