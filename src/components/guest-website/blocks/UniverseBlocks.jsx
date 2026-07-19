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
 * chooses its own colours or fonts. Several block types additionally pick
 * a per-universe *shape* accent, reusing already-built primitives from
 * ../layouts — never a hardcoded block style, and never a couple-chosen
 * manual override.
 *
 * feat/canvas-builder: `editable` is optional and OFF by default — the
 * published site (MultiPageWeddingWebsite.jsx) never passes it, so guests
 * never see editing chrome. The builder's inline canvas
 * (StudioWebsite.jsx -> RealWebsitePreview) passes `editable` bound to its
 * own Edit/Preview toggle; the full-screen "Preview" always renders with it
 * off. The SAME content renderers run in every case; only this extra
 * overlay (dotted outlines, insert points, selection) is conditional, so the
 * hard render-parity constraint holds (grep-confirmed in the PR: one
 * PAGE_COMPONENTS map, one UniverseBlocks).
 *
 * Root-caused bug this rebuild fixes: a couple could add a new block from
 * the library, but many renderers return null on empty content (correct
 * guest-facing behaviour — never show a broken empty photo/gallery/etc. to
 * a guest) — a freshly-inserted block starts with empty content, so on the
 * canvas it silently rendered nothing, looking exactly like "adding did
 * nothing." Every renderer that can return null now takes `editable` and
 * renders a visible placeholder instead when editable and empty, so a
 * couple can always see what they added and click it to fill it in.
 */
import React from 'react';
import { Plus, ChevronUp, ChevronDown, Trash2 } from 'lucide-react';
import SectionReveal from '../SectionReveal';
import { isMotionEnabled } from '@/lib/universeStyling';
import { detectHeroVideoType, youtubeEmbedUrl, vimeoEmbedUrl } from '@/lib/heroVideo';
import { blockLabel } from './blockTypes';
import { interactiveDivProps } from '@/lib/a11y';

import HairlineRule from '../layouts/HairlineRule';
import ZelligeDivider from '../layouts/ZelligeDivider';
import EnsoRing from '../layouts/EnsoRing';
import TicketStub from '../layouts/TicketStub';
import WaveDivider from '../layouts/WaveDivider';
import CitrusScallop from '../layouts/CitrusScallop';
import VineRule from '../layouts/VineRule';
import CubeBlock from '../layouts/CubeBlock';
import AmalfiWave from '../layouts/AmalfiWave';
import SedonaContour from '../layouts/SedonaContour';
import AspenPine from '../layouts/AspenPine';
import TajArch from '../layouts/TajArch';
import HavanaSunburst from '../layouts/HavanaSunburst';
import EdinburghThistle from '../layouts/EdinburghThistle';
import MonacoMast from '../layouts/MonacoMast';
import FlorenceVine from '../layouts/FlorenceVine';
import SeoulOrb from '../layouts/SeoulOrb';
import ShanghaiCloud from '../layouts/ShanghaiCloud';

import MinimalSectionMark from '../layouts/MinimalSectionMark';
import KyotoSectionMark from '../layouts/KyotoSectionMark';
import EditorialSectionKicker from '../layouts/EditorialSectionKicker';
import BrooklynSectionMark from '../layouts/BrooklynSectionMark';
import BaliSectionMark from '../layouts/BaliSectionMark';
import ParisSectionMark from '../layouts/ParisSectionMark';
import CapriSectionMark from '../layouts/CapriSectionMark';
import CapeTownSectionMark from '../layouts/CapeTownSectionMark';
import MykonosSectionMark from '../layouts/MykonosSectionMark';
import AmalfiSectionMark from '../layouts/AmalfiSectionMark';
import SedonaSectionMark from '../layouts/SedonaSectionMark';
import AspenSectionMark from '../layouts/AspenSectionMark';
import TajSectionMark from '../layouts/TajSectionMark';
import HavanaSectionMark from '../layouts/HavanaSectionMark';
import EdinburghSectionMark from '../layouts/EdinburghSectionMark';
import MonacoSectionMark from '../layouts/MonacoSectionMark';
import FlorenceSectionMark from '../layouts/FlorenceSectionMark';
import SeoulSectionMark from '../layouts/SeoulSectionMark';
import ShanghaiSectionMark from '../layouts/ShanghaiSectionMark';

// Per-universe divider accent for `spacer` (variant 'rule') — every entry
// here is one of the already-built, reused-as-is primitives from
// ../layouts, keyed off universeConfig.layout.
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
  'amalfi-citrus': AmalfiWave,
  'sedona-mesa': SedonaContour,
  'aspen-lodge': AspenPine,
  'taj-pavilion': TajArch,
  'havana-deco': HavanaSunburst,
  'edinburgh-estate': EdinburghThistle,
  'monaco-marina': MonacoMast,
  'florence-editorial': FlorenceVine,
  'seoul-glass': SeoulOrb,
  'shanghai-glamour': ShanghaiCloud,
};

// Per-universe kicker mark for `heading`'s optional kicker label.
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
  'amalfi-citrus': AmalfiSectionMark,
  'sedona-mesa': SedonaSectionMark,
  'aspen-lodge': AspenSectionMark,
  'taj-pavilion': TajSectionMark,
  'havana-deco': HavanaSectionMark,
  'edinburgh-estate': EdinburghSectionMark,
  'monaco-marina': MonacoSectionMark,
  'florence-editorial': FlorenceSectionMark,
  'seoul-glass': SeoulSectionMark,
  'shanghai-glamour': ShanghaiSectionMark,
};

export function UniverseDivider({ universeConfig, theme }) {
  const Divider = DIVIDER_BY_LAYOUT[universeConfig?.layout] || HairlineRule;
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
      <Divider color={theme.accent} />
    </div>
  );
}

export function UniverseKicker({ text, universeConfig, theme, typography }) {
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

const bodyStyle = (typography, theme, overrides = {}) => ({
  fontFamily: typography.bodyFont, fontWeight: typography.bodyWeight, color: theme.lightText, lineHeight: 1.8,
  fontSize: 'clamp(0.9375rem, 1.6vw, 1.0625rem)', ...overrides,
});

const headingStyle = (typography, theme, overrides = {}) => ({
  fontFamily: typography.headingFont, fontWeight: typography.headingWeight, fontStyle: typography.headingStyle || 'normal',
  color: theme.lightText, margin: 0, lineHeight: 1.2, ...overrides,
});

// Curated size steps (feat/block-styling-curated) — preset clamp() bands,
// never a free px value. 'M' in each row is the exact clamp() that block
// type already hardcoded before per-block sizing existed, so an unset
// size (the default for every existing block) looks byte-identical to
// before.
const SIZE_PRESETS = {
  heading: { XS: 'clamp(0.9375rem, 2.2vw, 1.125rem)', S: 'clamp(1.125rem, 2.6vw, 1.5rem)', M: 'clamp(1.5rem, 4vw, 2.25rem)', L: 'clamp(2rem, 5vw, 3rem)', XL: 'clamp(2.5rem, 6.5vw, 4rem)' },
  subheading: { XS: 'clamp(0.8125rem, 1.7vw, 1rem)', S: 'clamp(0.9375rem, 2vw, 1.25rem)', M: 'clamp(1.125rem, 2.6vw, 1.5rem)', L: 'clamp(1.375rem, 3.2vw, 1.875rem)', XL: 'clamp(1.75rem, 4vw, 2.25rem)' },
  quote: { XS: 'clamp(0.8125rem, 1.5vw, 1rem)', S: 'clamp(0.9375rem, 1.8vw, 1.25rem)', M: 'clamp(1.125rem, 2.4vw, 1.5rem)', L: 'clamp(1.375rem, 3vw, 1.875rem)', XL: 'clamp(1.75rem, 3.8vw, 2.25rem)' },
  body: { XS: 'clamp(0.75rem, 1.1vw, 0.8125rem)', S: 'clamp(0.8125rem, 1.3vw, 0.9375rem)', M: 'clamp(0.9375rem, 1.6vw, 1.0625rem)', L: 'clamp(1.0625rem, 1.9vw, 1.25rem)', XL: 'clamp(1.25rem, 2.4vw, 1.5rem)' },
};
const sizeStep = (style) => (style?.size && SIZE_PRESETS.heading[style.size] ? style.size : 'M');

// feat/block-styling-v2: paragraph/two-column-text additionally accept
// 'justify' for align — everything else (headings, quotes, lists) stays
// left/center/right only, since justified short lines/headings looks broken.
export const JUSTIFY_CAPABLE_TYPES = ['paragraph', 'two-column-text'];
export function resolveAlign(style, blockType, fallback) {
  const align = style?.align || fallback;
  if (align === 'justify' && !JUSTIFY_CAPABLE_TYPES.includes(blockType)) return fallback;
  return align;
}

// Shown in place of a renderer's real output when the block is empty AND
// we're in the builder's edit mode — never shown to guests (editable is
// only ever true on the builder's own canvas).
function EmptyPlaceholder({ theme, typography, label }) {
  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '20px', border: `1px dashed ${theme.lightText}35`, textAlign: 'center' }}>
      <p style={{ fontFamily: typography.bodyFont, fontSize: 13, color: `${theme.lightText}80`, margin: 0 }}>{label}</p>
    </div>
  );
}

// ── Text ──────────────────────────────────────────────────────────
function HeadingBlock({ content, theme, typography, universeConfig, editable, style }) {
  if (!content.text && editable) {
    return <EmptyPlaceholder theme={theme} typography={typography} label="Heading — click to add text" />;
  }
  const align = style?.align || 'center';
  return (
    <div style={{ textAlign: align, maxWidth: 720, margin: align === 'center' ? '0 auto' : 0 }}>
      {content.kicker && <UniverseKicker text={content.kicker} universeConfig={universeConfig} theme={theme} typography={typography} />}
      <h2 style={headingStyle(typography, theme, { fontSize: SIZE_PRESETS.heading[sizeStep(style)] })}>{content.text}</h2>
    </div>
  );
}

function SubheadingBlock({ content, theme, typography, editable, style }) {
  if (!content.text && editable) {
    return <EmptyPlaceholder theme={theme} typography={typography} label="Subheading — click to add text" />;
  }
  const align = style?.align || 'center';
  return (
    <h3 style={{ ...headingStyle(typography, theme, { fontSize: SIZE_PRESETS.subheading[sizeStep(style)] }), textAlign: align, maxWidth: 640, margin: align === 'center' ? '0 auto' : 0 }}>
      {content.text}
    </h3>
  );
}

function ParagraphBlock({ content, theme, typography, editable, style }) {
  if (!content.text && editable) {
    return <EmptyPlaceholder theme={theme} typography={typography} label="Paragraph — click to add text" />;
  }
  const align = resolveAlign(style, 'paragraph', 'left');
  return <p style={{ ...bodyStyle(typography, theme, { fontSize: SIZE_PRESETS.body[sizeStep(style)] }), maxWidth: 640, margin: align === 'center' ? '0 auto' : 0, textAlign: align, whiteSpace: 'pre-wrap' }}>{content.text}</p>;
}

function QuoteBlock({ content, theme, typography, editable, style }) {
  if (!content.text && editable) {
    return <EmptyPlaceholder theme={theme} typography={typography} label="Quote — click to add text" />;
  }
  const align = style?.align || 'center';
  return (
    <div style={{ textAlign: align, maxWidth: 640, margin: align === 'center' ? '0 auto' : 0 }}>
      <p style={headingStyle(typography, theme, { fontStyle: 'italic', fontSize: SIZE_PRESETS.quote[sizeStep(style)], lineHeight: 1.5, marginBottom: 12 })}>“{content.text}”</p>
      {content.attribution && <p style={{ fontFamily: typography.bodyFont, fontSize: 13, color: theme.accent, margin: 0 }}>— {content.attribution}</p>}
    </div>
  );
}

function TwoColumnTextBlock({ content, theme, typography, editable, style }) {
  if (!content.left && !content.right && editable) {
    return <EmptyPlaceholder theme={theme} typography={typography} label="Two-column text — click to add text" />;
  }
  const align = resolveAlign(style, 'two-column-text', 'left');
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 32, maxWidth: 900, margin: '0 auto', textAlign: align }}>
      <p style={{ ...bodyStyle(typography, theme), whiteSpace: 'pre-wrap' }}>{content.left}</p>
      <p style={{ ...bodyStyle(typography, theme), whiteSpace: 'pre-wrap' }}>{content.right}</p>
    </div>
  );
}

function ListBlock({ content, theme, typography, editable, style }) {
  const items = content.items || [];
  if (items.length === 0 && editable) {
    return <EmptyPlaceholder theme={theme} typography={typography} label="List — click to add items" />;
  }
  const align = style?.align || 'left';
  return (
    <div style={{ maxWidth: 560, margin: '0 auto', textAlign: align }}>
      {content.title && <h3 style={{ ...headingStyle(typography, theme, { fontSize: 'clamp(1.125rem, 2.4vw, 1.5rem)' }), textAlign: align, marginBottom: 20 }}>{content.title}</h3>}
      <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
        {items.map((item, i) => (
          <li key={i} style={{ ...bodyStyle(typography, theme), display: 'flex', gap: 10, marginBottom: 10, alignItems: 'baseline', justifyContent: align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start' }}>
            <span style={{ color: theme.accent, flexShrink: 0 }}>—</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Media ─────────────────────────────────────────────────────────
function PhotoBlock({ content, theme, typography, editable }) {
  if (!content.url) {
    return editable ? <EmptyPlaceholder theme={theme} typography={typography} label="Image — click to choose a photo" /> : null;
  }
  return (
    <figure style={{ margin: 0, maxWidth: 720, marginLeft: 'auto', marginRight: 'auto' }}>
      <img src={content.url} alt={content.caption || ''} loading="lazy" style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'cover' }} />
      {content.caption && <figcaption style={{ fontSize: 13, color: theme.lightText, opacity: 0.6, textAlign: 'center', marginTop: 10 }}>{content.caption}</figcaption>}
    </figure>
  );
}

function FullWidthImageBlock({ content, theme, typography, editable }) {
  if (!content.url) {
    return editable ? <EmptyPlaceholder theme={theme} typography={typography} label="Full-width image — click to choose a photo" /> : null;
  }
  return (
    <figure style={{ margin: '0 -24px' }}>
      <img src={content.url} alt={content.caption || ''} loading="lazy" style={{ width: '100%', height: 'auto', maxHeight: 560, display: 'block', objectFit: 'cover' }} />
      {content.caption && <figcaption style={{ fontSize: 13, textAlign: 'center', marginTop: 10, opacity: 0.6 }}>{content.caption}</figcaption>}
    </figure>
  );
}

function ImageWithTextBlock({ content, theme, typography, editable }) {
  if (!content.url && !content.text) {
    return editable ? <EmptyPlaceholder theme={theme} typography={typography} label="Image + text — click to add a photo and text" /> : null;
  }
  const imageFirst = (content.imageSide || 'left') === 'left';
  const image = content.url && (
    <div style={{ flex: 1, minWidth: 240 }}>
      <img src={content.url} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', aspectRatio: '4/3' }} />
    </div>
  );
  const text = (
    <div style={{ flex: 1, minWidth: 240, display: 'flex', alignItems: 'center' }}>
      <p style={{ ...bodyStyle(typography, theme), whiteSpace: 'pre-wrap' }}>{content.text}</p>
    </div>
  );
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32, maxWidth: 900, margin: '0 auto' }}>
      {imageFirst ? <>{image}{text}</> : <>{text}{image}</>}
    </div>
  );
}

function GalleryBlock({ content, theme, typography, editable }) {
  const photos = content.photos || [];
  if (photos.length === 0) {
    return editable ? <EmptyPlaceholder theme={theme} typography={typography} label="Gallery grid — click to add photos" /> : null;
  }
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
          <img src={url} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        </div>
      ))}
    </div>
  );
}

function VideoBlock({ content, theme, typography, editable }) {
  const video = content.url ? detectHeroVideoType(content.url) : null;
  if (!video) {
    return editable ? <EmptyPlaceholder theme={theme} typography={typography} label="Video — click to add a YouTube, Vimeo, or .mp4 URL" /> : null;
  }
  if (video.type === 'file') {
    return (
      <video controls playsInline preload="metadata" style={{ width: '100%', maxWidth: 900, display: 'block', margin: '0 auto' }}>
        <source src={video.url} />
      </video>
    );
  }
  const embedUrl = video.type === 'youtube' ? youtubeEmbedUrl(video.id) : vimeoEmbedUrl(video.id);
  return (
    <div style={{ maxWidth: 900, margin: '0 auto', aspectRatio: '16/9', position: 'relative' }}>
      <iframe src={embedUrl} title="Video" allow="autoplay; encrypted-media" allowFullScreen style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }} />
    </div>
  );
}

// ── Layout ────────────────────────────────────────────────────────
function SpacerBlock({ content, theme, universeConfig }) {
  if (content.variant === 'rule') return <UniverseDivider universeConfig={universeConfig} theme={theme} />;
  return <div style={{ height: content.height || 40 }} />;
}

function ColumnsBlock({ content, theme, typography, editable }) {
  const columns = content.columns || [];
  const hasText = columns.some(c => c.text);
  if (columns.length === 0 || (!hasText && editable)) {
    return editable ? <EmptyPlaceholder theme={theme} typography={typography} label="Columns — click to add text" /> : null;
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(${Math.max(180, Math.round(720 / columns.length))}px, 1fr))`, gap: 28, maxWidth: 900, margin: '0 auto' }}>
      {columns.map((col, i) => (
        <p key={i} style={{ ...bodyStyle(typography, theme), whiteSpace: 'pre-wrap' }}>{col.text}</p>
      ))}
    </div>
  );
}

function ButtonBlock({ content, theme, typography, editable }) {
  if (!content.label) {
    return editable ? <EmptyPlaceholder theme={theme} typography={typography} label="Button — click to set the text and link" /> : null;
  }
  return (
    <div style={{ textAlign: 'center' }}>
      <a
        href={content.url || '#'}
        style={{ display: 'inline-block', padding: '13px 32px', borderRadius: 999, background: theme.accent, color: theme.darkBg, fontFamily: typography.bodyFont, fontWeight: 600, fontSize: 14, textDecoration: 'none' }}
      >
        {content.label}
      </a>
    </div>
  );
}

function QuoteBannerBlock({ content, theme, typography, editable }) {
  if (!content.text && editable) {
    return <EmptyPlaceholder theme={theme} typography={typography} label="Quote banner — click to add text" />;
  }
  return (
    <div style={{ background: theme.darkBg, padding: '48px 24px', textAlign: 'center', margin: '0 -24px' }}>
      <p style={headingStyle(typography, theme, { color: theme.darkText, fontStyle: 'italic', fontSize: 'clamp(1.25rem, 3vw, 1.75rem)', maxWidth: 720, marginLeft: 'auto', marginRight: 'auto' })}>
        “{content.text}”
      </p>
      {content.attribution && <p style={{ fontFamily: typography.bodyFont, fontSize: 13, color: theme.accent, marginTop: 12 }}>— {content.attribution}</p>}
    </div>
  );
}

function DressCodeBlock({ content, theme, typography, editable, style }) {
  if (!content.text) {
    return editable ? <EmptyPlaceholder theme={theme} typography={typography} label="Dress code — click to add text" /> : null;
  }
  const align = style?.align || 'center';
  return (
    <div style={{ maxWidth: 520, margin: align === 'center' ? '0 auto' : 0, textAlign: align, border: `1px solid ${theme.accent}40`, padding: '24px 20px' }}>
      <p style={{ fontFamily: typography.bodyFont, fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', color: theme.accent, margin: '0 0 8px' }}>Dress code</p>
      <p style={{ ...bodyStyle(typography, theme), margin: 0 }}>{content.text}</p>
    </div>
  );
}

// ── Wedding ───────────────────────────────────────────────────────
function CountdownBlock({ theme, typography, weddingDetails, editable }) {
  const weddingDate = weddingDetails?.weddingDate;
  const target = weddingDate ? new Date(weddingDate + 'T00:00:00') : null;
  if (!target || isNaN(target.getTime())) {
    return editable ? <EmptyPlaceholder theme={theme} typography={typography} label="Countdown — set your wedding date in the Content tab to activate" /> : null;
  }
  const daysLeft = Math.ceil((target.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const label = daysLeft > 0 ? `${daysLeft} day${daysLeft === 1 ? '' : 's'} to go` : daysLeft === 0 ? 'Today is the day!' : 'We got married!';
  return (
    <div style={{ textAlign: 'center' }}>
      <p style={headingStyle(typography, theme, { fontSize: 'clamp(1.75rem, 5vw, 3rem)' })}>{label}</p>
    </div>
  );
}

function TimelineBlock({ content, theme, typography, editable }) {
  const items = content.items || [];
  if (items.length === 0) {
    return editable ? <EmptyPlaceholder theme={theme} typography={typography} label="Timeline — click to add events" /> : null;
  }
  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>
      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex', gap: 20, marginBottom: 24, paddingBottom: 24, borderBottom: i < items.length - 1 ? `1px solid ${theme.lightText}14` : 'none' }}>
          <div style={{ flexShrink: 0, minWidth: 80, fontFamily: typography.bodyFont, fontSize: 13, fontWeight: 600, color: theme.accent }}>{item.time}</div>
          <div>
            <p style={{ ...headingStyle(typography, theme, { fontSize: 16, marginBottom: 4 }) }}>{item.title}</p>
            {item.description && <p style={{ ...bodyStyle(typography, theme, { fontSize: 14 }) }}>{item.description}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

// Read-only — pulls from the planner's canonical ceremony/reception fields
// rather than duplicating them as editable block content, matching the
// same decision made for the Content tab's "Ceremony & reception" reference
// (see WBRightPanel.jsx / BUILDER_BLOCK_SCOPE.md): the real address/maps/
// place-id data comes from a Google Places lookup that only exists in the
// planner (EventDetails.jsx), so a block-level free-text duplicate would
// risk drifting out of sync.
function EventDetailsBlock({ theme, typography, weddingDetails, editable }) {
  const ceremony = weddingDetails?.mainCeremony || {};
  const reception = weddingDetails?.reception || {};
  if (!ceremony.venueName && !reception.venueName) {
    return editable ? <EmptyPlaceholder theme={theme} typography={typography} label="Event details — add your ceremony/reception venue in the wedding planner to activate" /> : null;
  }
  const Row = ({ label, venue }) => venue.venueName ? (
    <div style={{ marginBottom: 16 }}>
      <p style={{ fontFamily: typography.bodyFont, fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', color: theme.accent, margin: '0 0 4px' }}>{label}</p>
      <p style={{ ...headingStyle(typography, theme, { fontSize: 18 }) }}>{venue.venueName}</p>
      {venue.startTime && <p style={{ ...bodyStyle(typography, theme, { fontSize: 14, margin: '2px 0 0' }) }}>{venue.startTime}</p>}
      {venue.address && <p style={{ ...bodyStyle(typography, theme, { fontSize: 13, margin: '2px 0 0', opacity: 0.7 }) }}>{venue.address}</p>}
    </div>
  ) : null;
  return (
    <div style={{ maxWidth: 480, margin: '0 auto', textAlign: 'center' }}>
      <Row label="Ceremony" venue={ceremony} />
      <Row label="Reception" venue={reception} />
    </div>
  );
}

function FaqBlock({ content, theme, typography, editable }) {
  const items = content.items || [];
  if (items.length === 0) {
    return editable ? <EmptyPlaceholder theme={theme} typography={typography} label="FAQ — click to add questions" /> : null;
  }
  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      {items.map((item, i) => (
        <div key={i} style={{ marginBottom: 20, paddingBottom: 20, borderBottom: i < items.length - 1 ? `1px solid ${theme.lightText}14` : 'none' }}>
          <p style={{ ...headingStyle(typography, theme, { fontSize: 16, marginBottom: 6 }) }}>{item.question}</p>
          <p style={{ ...bodyStyle(typography, theme, { fontSize: 14 }) }}>{item.answer}</p>
        </div>
      ))}
    </div>
  );
}

// ── People ────────────────────────────────────────────────────────
function PersonCard({ name, role, bio, photoUrl, theme, typography }) {
  return (
    <div style={{ textAlign: 'center', maxWidth: 260 }}>
      {photoUrl ? (
        <img src={photoUrl} alt={name} loading="lazy" style={{ width: 120, height: 120, borderRadius: '50%', objectFit: 'cover', margin: '0 auto 16px' }} />
      ) : (
        <div style={{ width: 120, height: 120, borderRadius: '50%', background: `${theme.lightText}0d`, margin: '0 auto 16px' }} />
      )}
      <p style={{ ...headingStyle(typography, theme, { fontSize: 18, marginBottom: 2 }) }}>{name}</p>
      {role && <p style={{ fontFamily: typography.bodyFont, fontSize: 12, color: theme.accent, margin: '0 0 8px' }}>{role}</p>}
      {bio && <p style={{ ...bodyStyle(typography, theme, { fontSize: 13 }) }}>{bio}</p>}
    </div>
  );
}

function CoupleIntroBlock({ content, theme, typography, editable }) {
  const p1 = content.partner1 || {};
  const p2 = content.partner2 || {};
  if (!p1.name && !p2.name) {
    return editable ? <EmptyPlaceholder theme={theme} typography={typography} label="Couple intro — click to add names, bios, and photos" /> : null;
  }
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 48 }}>
      <PersonCard name={p1.name} bio={p1.bio} photoUrl={p1.photoUrl} theme={theme} typography={typography} />
      <PersonCard name={p2.name} bio={p2.bio} photoUrl={p2.photoUrl} theme={theme} typography={typography} />
    </div>
  );
}

function SinglePersonBlock({ content, theme, typography, editable }) {
  if (!content.name) {
    return editable ? <EmptyPlaceholder theme={theme} typography={typography} label="Single person — click to add a name and photo" /> : null;
  }
  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <PersonCard name={content.name} role={content.role} bio={content.bio} photoUrl={content.photoUrl} theme={theme} typography={typography} />
    </div>
  );
}

function WeddingPartyBlock({ content, theme, typography, editable }) {
  const people = content.people || [];
  if (people.length === 0) {
    return editable ? <EmptyPlaceholder theme={theme} typography={typography} label="Wedding party — click to add people" /> : null;
  }
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 32 }}>
      {people.map((p, i) => <PersonCard key={i} name={p.name} role={p.role} photoUrl={p.photoUrl} theme={theme} typography={typography} />)}
    </div>
  );
}

export const RENDERERS = {
  heading: HeadingBlock,
  subheading: SubheadingBlock,
  paragraph: ParagraphBlock,
  quote: QuoteBlock,
  'two-column-text': TwoColumnTextBlock,
  list: ListBlock,
  photo: PhotoBlock,
  'image-with-text': ImageWithTextBlock,
  gallery: GalleryBlock,
  'full-width-image': FullWidthImageBlock,
  video: VideoBlock,
  spacer: SpacerBlock,
  columns: ColumnsBlock,
  button: ButtonBlock,
  'quote-banner': QuoteBannerBlock,
  'dress-code': DressCodeBlock,
  countdown: CountdownBlock,
  timeline: TimelineBlock,
  'event-details': EventDetailsBlock,
  faq: FaqBlock,
  'couple-intro': CoupleIntroBlock,
  'single-person': SinglePersonBlock,
  'wedding-party': WeddingPartyBlock,
};

// Always-visible insert affordance (feat/canvas-builder — no longer
// hover-only) sitting on the dotted boundary between/around blocks. Clicking
// calls onRequestInsert with the exact index to insert at; the actual
// library modal lives in the builder (StudioWebsite.jsx), not here — this
// stays a pure content renderer plus an optional, inert-by-default overlay
// hook.
function InsertPoint({ index, onRequestInsert, theme }) {
  return (
    <div style={{ position: 'relative', height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', borderTop: `1px dashed ${theme.lightText}30` }} />
      <button
        onClick={() => onRequestInsert(index)}
        style={{ position: 'relative', zIndex: 1, width: 26, height: 26, borderRadius: '50%', border: 'none', background: theme.accent, color: theme.darkBg, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }}
        title="Add a section"
        aria-label="Add a section"
      >
        <Plus size={15} />
      </button>
    </div>
  );
}

// A block's canvas wrapper in edit mode: always shows a dim dotted outline;
// clicking it selects the block (onSelectBlock), which is how the right
// panel's block editor opens (WBRightPanel.jsx) — this component only ever
// emits the selection event, it doesn't render a form of its own. The
// currently-selected block gets a solid accent outline plus its own
// always-visible move-up/move-down/delete controls (feat/canvas-builder —
// no longer hover-only, and no longer a hover-revealed edit icon since
// clicking the block itself is what edits it).
function BlockCanvasWrapper({ block, index, count, isSelected, onSelectBlock, onMoveBlock, onDeleteBlock, theme, children }) {
  return (
    <div
      onClick={() => onSelectBlock(block.id)}
      {...interactiveDivProps(() => onSelectBlock(block.id), { label: `Edit ${blockLabel(block.type)}` })}
      style={{
        position: 'relative', cursor: 'pointer',
        outline: isSelected ? `2px solid ${theme.accent}` : `1px dashed ${theme.lightText}30`,
        outlineOffset: -1,
      }}
    >
      {children}
      {isSelected && (
        <div
          onClick={e => e.stopPropagation()}
          style={{ position: 'absolute', top: 8, right: 8, zIndex: 5, display: 'flex', gap: 2, background: theme.darkBg, borderRadius: 4, padding: 3 }}
        >
          <button onClick={() => onMoveBlock(block.id, 'up')} disabled={index === 0} title="Move up" aria-label="Move up" style={{ background: 'none', border: 'none', cursor: index === 0 ? 'default' : 'pointer', color: index === 0 ? `${theme.darkText}40` : theme.darkText, padding: 4, display: 'flex' }}><ChevronUp size={13} /></button>
          <button onClick={() => onMoveBlock(block.id, 'down')} disabled={index === count - 1} title="Move down" aria-label="Move down" style={{ background: 'none', border: 'none', cursor: index === count - 1 ? 'default' : 'pointer', color: index === count - 1 ? `${theme.darkText}40` : theme.darkText, padding: 4, display: 'flex' }}><ChevronDown size={13} /></button>
          <button onClick={() => onDeleteBlock(block.id)} title="Delete" aria-label="Delete" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#E03553', padding: 4, display: 'flex' }}><Trash2 size={13} /></button>
        </div>
      )}
    </div>
  );
}

// Resolves a block's curated style overrides against the ACTIVE UNIVERSE's
// own tokens — never a free colour/size. textColor becomes an "effective
// theme" with `lightText` swapped, since every renderer already derives its
// text colour from theme.lightText (never a hardcoded literal) — so
// substituting it here changes the real rendered colour with zero changes
// needed inside any individual renderer. background/align/size are passed
// through to renderers that support them (see WBRightPanel.jsx's
// ALIGN_CAPABLE_TYPES / SIZE_CAPABLE_TYPES / NO_TEXT_COLOR_TYPES — kept in
// sync with which renderers actually read `style`).
// feat/block-styling-v2: textColor/background expand from 3 fixed values
// to a full swatch grid of tints/shades of the universe's OWN tokens
// (lightText, accent, accentSecondary) — still never a free hex value.
// Hex alpha suffixes below are exact: FF/no-suffix=100%, B3=~70%, 66=~40%,
// 30=~19%, 18=~9%, 0d=~5%.
// Exported (with labels) so WBRightPanel.jsx's swatch grid renders the
// EXACT same colours these renderers use — one source of truth, no drift.
export const TEXT_COLOR_OPTIONS = [
  { value: 'text-100', label: 'Text', resolve: (t) => t.lightText },
  { value: 'text-70', label: 'Text · muted', resolve: (t) => `${t.lightText}B3` },
  { value: 'text-40', label: 'Text · faint', resolve: (t) => `${t.lightText}66` },
  { value: 'accent-100', label: 'Accent', resolve: (t) => t.accent },
  { value: 'accent-70', label: 'Accent · muted', resolve: (t) => `${t.accent}B3` },
  { value: 'accent-40', label: 'Accent · tint', resolve: (t) => `${t.accent}66` },
  { value: 'accent2-100', label: 'Accent 2', resolve: (t) => t.accentSecondary || t.accent },
  { value: 'accent2-70', label: 'Accent 2 · muted', resolve: (t) => `${t.accentSecondary || t.accent}B3` },
  { value: 'accent2-40', label: 'Accent 2 · tint', resolve: (t) => `${t.accentSecondary || t.accent}66` },
];
export const BACKGROUND_OPTIONS = [
  { value: 'none', label: 'None', resolve: () => null },
  { value: 'text-subtle', label: 'Subtle tint', resolve: (t) => `${t.lightText}0d` },
  { value: 'text-soft', label: 'Soft tint', resolve: (t) => `${t.lightText}1a` },
  { value: 'accent-subtle', label: 'Accent · subtle', resolve: (t) => `${t.accent}18` },
  { value: 'accent-soft', label: 'Accent · soft', resolve: (t) => `${t.accent}30` },
  { value: 'accent2-subtle', label: 'Accent 2 · subtle', resolve: (t) => `${t.accentSecondary || t.accent}18` },
  { value: 'accent2-soft', label: 'Accent 2 · soft', resolve: (t) => `${t.accentSecondary || t.accent}30` },
];
const TEXT_COLOR_TOKENS = Object.fromEntries(TEXT_COLOR_OPTIONS.map(o => [o.value, o.resolve]));
const BACKGROUND_TOKENS = Object.fromEntries(BACKGROUND_OPTIONS.filter(o => o.value !== 'none').map(o => [o.value, o.resolve]));
// PR #101 shipped a 3-value enum for each — these values may already be
// saved on real weddings, so they're aliased forward rather than dropped.
// The 'surface'/'accent' backgrounds and 'secondary'/'accent' text colours
// alias to tokens that render the exact same hex, so existing blocks look
// byte-identical after this upgrade.
const LEGACY_TEXT_COLOR_ALIASES = { primary: 'text-100', secondary: 'text-70', accent: 'accent-100' };
const LEGACY_BACKGROUND_ALIASES = { none: 'none', surface: 'text-subtle', accent: 'accent-subtle' };
export const SPACING_OPTIONS = [
  { value: 'tight', label: 'Tight', padding: '16px 24px' },
  { value: 'normal', label: 'Normal', padding: '32px 24px' },
  { value: 'roomy', label: 'Roomy', padding: '56px 24px' },
];
const SPACING_PRESETS = Object.fromEntries(SPACING_OPTIONS.map(o => [o.value, o.padding]));

function resolveBlockStyle(style, theme) {
  const s = style || {};
  const textColorKey = LEGACY_TEXT_COLOR_ALIASES[s.textColor] || s.textColor;
  const textColor = (textColorKey && TEXT_COLOR_TOKENS[textColorKey]) ? TEXT_COLOR_TOKENS[textColorKey](theme) : theme.lightText;

  const backgroundKey = s.background != null && LEGACY_BACKGROUND_ALIASES[s.background] !== undefined ? LEGACY_BACKGROUND_ALIASES[s.background] : s.background;
  const backgroundColor = (backgroundKey && backgroundKey !== 'none' && BACKGROUND_TOKENS[backgroundKey]) ? BACKGROUND_TOKENS[backgroundKey](theme) : null;

  const spacingPadding = (s.spacing && SPACING_PRESETS[s.spacing]) || null;

  return { effectiveTheme: { ...theme, lightText: textColor }, backgroundColor, spacingPadding };
}

export default function UniverseBlocks({ blocks, weddingDetails, theme, typography, universeConfig, editable = false, onRequestInsert, onMoveBlock, onDeleteBlock, onSelectBlock, selectedBlockId }) {
  const list = blocks || [];
  if (list.length === 0 && !editable) return null;
  const sorted = [...list].sort((a, b) => (a.order || 0) - (b.order || 0));
  const motionDisabled = !isMotionEnabled(weddingDetails);

  return (
    <div style={{ backgroundColor: theme.lightBg, display: 'flex', flexDirection: 'column', gap: editable ? 0 : 40, padding: '64px 24px' }}>
      {editable && <InsertPoint index={0} onRequestInsert={onRequestInsert} theme={theme} />}
      {sorted.map((block, i) => {
        const Renderer = RENDERERS[block.type];
        if (!Renderer) return null;
        const { effectiveTheme, backgroundColor, spacingPadding } = resolveBlockStyle(block.style, theme);
        const wrapperStyle = { color: effectiveTheme.lightText };
        if (backgroundColor) wrapperStyle.background = backgroundColor;
        // Unset spacing preserves the pre-existing behaviour exactly: padding
        // only appeared when a background was also set. An explicit spacing
        // choice now applies regardless of background.
        if (spacingPadding) wrapperStyle.padding = spacingPadding;
        else if (backgroundColor) wrapperStyle.padding = '32px 24px';
        const rendered = (
          <SectionReveal universeConfig={universeConfig} disabled={motionDisabled || editable}>
            <div style={wrapperStyle}>
              <Renderer content={block.content || {}} theme={effectiveTheme} typography={typography} universeConfig={universeConfig} weddingDetails={weddingDetails} editable={editable} style={block.style} />
            </div>
          </SectionReveal>
        );
        return (
          <React.Fragment key={block.id}>
            <div style={{ margin: editable ? '4px 0' : 0 }}>
              {editable ? (
                <BlockCanvasWrapper
                  block={block} index={i} count={sorted.length}
                  isSelected={selectedBlockId === block.id}
                  onSelectBlock={onSelectBlock} onMoveBlock={onMoveBlock} onDeleteBlock={onDeleteBlock}
                  theme={theme}
                >
                  {rendered}
                </BlockCanvasWrapper>
              ) : rendered}
            </div>
            {editable && <InsertPoint index={i + 1} onRequestInsert={onRequestInsert} theme={theme} />}
          </React.Fragment>
        );
      })}
    </div>
  );
}
