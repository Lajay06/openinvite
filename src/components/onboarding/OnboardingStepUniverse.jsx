import React, { useState } from 'react';
import { motion } from 'framer-motion';
import UniverseWorldView from '@/components/universe-studio/UniverseWorldView';
import { interactiveDivProps } from '@/lib/a11y';
import { UNIVERSE_CATALOG } from '@/lib/universeCatalog';
import { buildWeddingDetailsPayload } from '@/lib/onboardingSave';
import { Dialog, DialogContent } from '@/components/ui/dialog';

// Cards are built straight from UNIVERSE_CATALOG (src/lib/universeCatalog.js
// — itself sourced from UNIVERSE_CONFIGS in websiteThemes.js) instead of a
// second, independently-maintained array. The old array here had its own
// display names ("CAPRI") and taglines ("Italian Coast") that had drifted
// from the catalog's own name ("Capri") and tagline ("Mediterranean
// summer") — confirmed live: tapping the old "Classical Grandeur" card
// opened a preview titled "LONDON — Quiet Luxury", and picking "Italian
// Coast" made Ava's own intro copy call it "Capri". It also only listed
// the original 10 universes — the 10 "Ultra" universes added later
// (feat/universes-expansion-10) never appeared here at all. Deriving from
// the catalog means both problems are structurally impossible going
// forward: this list can never show a name/tagline the rest of the app
// doesn't also show, and a new universe appears here the moment it's
// added to UNIVERSE_CONFIGS, with no second place to remember to update.
const UNIVERSES = UNIVERSE_CATALOG.map((u, i) => ({
  ...u,
  number: String(i + 1).padStart(2, '0'),
  photo: u.imageUrl || `/universes/${u.id}.jpg`,
}));

// Accept-pass round 2 — reverses the PR B light-card treatment below.
// Owner call: this step should match the LIVE marketing /universes page's
// grid tile (Universes.jsx's UniverseTile — full-bleed dark photo,
// gradient scrim, italic tagline, bold white name, hover-reveal worldStory
// + palette swatches), not the wizard's own light-card language. The
// picker is the couple's first real look at what a universe feels like;
// diluting it into a plain white thumbnail undersold it. This IS the one
// deliberate dark-tile exception in the wizard now — see DESIGN_SPEC.md.
// Same visual language as the marketing tile, plus a selection checkmark
// badge the marketing page has no reason to need.
//
// Accept-pass round 3 (follow-up #1/#2): the tile itself used to be the
// ONLY tap target, and tapping it just opened the full-screen preview
// (setPreviewUniverse) — it never called setSelectedUniverse. The real
// "select" action lived at the bottom of that preview's own scrollable
// world-view (UniverseWorldView's "Make this my universe" button), so a
// couple who tapped a few tiles to compare, looked at the previews, and
// closed them had selected nothing — Continue silently defaulted to
// 'london'. Not a persistence bug (activeUniverse writes and reads
// correctly everywhere downstream); the pick just never registered.
// Explore/Select are now explicit per-tile buttons instead of one
// ambiguous tap: Explore opens the same preview as before, Select calls
// setSelectedUniverse directly — no detour through the preview required.
// Both funnel into the same selectedUniverse state the preview's own
// "Make this my universe" button already used, so the two stay in sync
// automatically; whichever path a couple takes, every tile's checkmark
// reflects the current choice.
function UniverseGridTile({ universe, index, isSelected, onExplore, onSelectTile }) {
  const [hovered, setHovered] = useState(false);
  const swatches = [
    { color: universe.colors.darkBg, label: 'Ground' },
    { color: universe.colors.lightBg, label: 'Paper' },
    { color: universe.colors.accent, label: 'Accent' },
    { color: universe.colors.accentSecondary, label: 'Secondary' },
  ].filter(s => !!s.color);
  const isActive = isSelected || hovered;

  return (
    <article
      onClick={onExplore}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      {...interactiveDivProps(onExplore, { label: `Preview the ${universe.name} universe` })}
      style={{
        position: 'relative', aspectRatio: '3 / 4', overflow: 'hidden', cursor: 'pointer',
        outline: isSelected ? '2px solid #E03553' : 'none', outlineOffset: -2,
      }}
    >
      <img
        src={universe.photo}
        alt={`The ${universe.name} universe: ${universe.tagline || 'a full wedding aesthetic'}`}
        loading={index < 5 ? 'eager' : 'lazy'}
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
          transform: hovered ? 'scale(1.04)' : 'scale(1)', transition: 'transform 0.6s cubic-bezier(0.16,1,0.3,1)',
        }}
      />
      <div style={{
        position: 'absolute', inset: 0,
        background: isActive
          ? 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.55) 55%, rgba(0,0,0,0.15) 100%)'
          : 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.15) 60%, rgba(0,0,0,0) 100%)',
        transition: 'background 0.4s ease',
      }} />

      {isSelected && (
        <div style={{
          position: 'absolute', top: 10, right: 10, width: 20, height: 20, borderRadius: '50%',
          background: '#E03553', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2,
        }}>
          <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
            <path d="M2.5 7L5.5 10L11.5 4" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}

      <div style={{ position: 'absolute', inset: 0, zIndex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: 14 }}>
        <p style={{ fontSize: 10, fontStyle: 'italic', color: 'rgba(255,255,255,0.6)', margin: '0 0 4px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          {universe.tagline}
        </p>
        <h3 style={{ fontSize: 'clamp(16px, 1.4vw, 20px)', fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.01em', margin: '0 0 6px', lineHeight: 1.1 }}>
          {universe.name}
        </h3>

        {universe.worldStory && (
          <p style={{
            fontSize: 11, color: 'rgba(255,255,255,0.75)', lineHeight: 1.5, margin: '0 0 8px', fontFamily: "'Plus Jakarta Sans', sans-serif",
            maxHeight: hovered ? 80 : 0, opacity: hovered ? 1 : 0, overflow: 'hidden',
            transition: 'max-height 0.35s ease, opacity 0.3s ease',
          }}>
            {universe.worldStory}
          </p>
        )}

        <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
          {swatches.map((s, i) => (
            <span key={i} title={s.label} style={{ width: 10, height: 10, background: s.color, border: s.color === '#FFFFFF' ? '1px solid rgba(255,255,255,0.3)' : 'none', flexShrink: 0 }} />
          ))}
        </div>

        {/* Explicit per-tile actions (accept-pass round 3) — always visible,
            not hover-gated, since the whole point is that the old single
            ambiguous tap was easy to miss. stopPropagation on both: without
            it, a click bubbles to the article's own onClick=onExplore,
            which would immediately reopen the preview right after Select
            was pressed. */}
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onExplore(); }}
            style={{
              flex: 1, padding: '6px 0', borderRadius: 999, fontSize: 10, fontWeight: 600,
              fontFamily: "'Plus Jakarta Sans', sans-serif", cursor: 'pointer', whiteSpace: 'nowrap',
              background: 'rgba(255,255,255,0.12)', color: '#FFFFFF', border: '1px solid rgba(255,255,255,0.3)',
            }}
          >
            Explore
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); if (!isSelected) onSelectTile(); }}
            disabled={isSelected}
            style={{
              flex: 1, padding: '6px 0', borderRadius: 999, fontSize: 10, fontWeight: 700,
              fontFamily: "'Plus Jakarta Sans', sans-serif", cursor: isSelected ? 'default' : 'pointer', whiteSpace: 'nowrap',
              background: isSelected ? 'rgba(255,255,255,0.15)' : '#E03553', color: '#FFFFFF', border: 'none',
            }}
          >
            {isSelected ? 'Selected' : 'Select'}
          </button>
        </div>
      </div>
    </article>
  );
}

export default function OnboardingStepUniverse({ onNext, data }) {
  const [selectedUniverse, setSelectedUniverse] = useState(data.activeUniverse || null);
  const websiteMode = data.websiteMode || 'dark';
  const [previewUniverse, setPreviewUniverse] = useState(null);
  const textPrimary = '#0A0A0A';
  const textMuted = 'rgba(10,10,10,0.6)';

  const handleContinue = () => {
    onNext({ activeUniverse: selectedUniverse || 'london', websiteMode });
  };

  const handleSkip = () => {
    onNext({ activeUniverse: selectedUniverse || 'london', websiteMode });
  };

  // Draft-shaped weddingDetails for the preview only — no WeddingDetails
  // record exists yet at this point in onboarding (it's created in
  // saveOnboarding once the whole wizard completes). Reuses the exact same
  // mapping the real save uses, so the preview shows the couple's actual
  // names/date instead of the generic "Your names" placeholder.
  const previewWeddingDetails = buildWeddingDetailsPayload(data);

  const handleSelectFromPreview = (universeId) => {
    setSelectedUniverse(universeId);
    setPreviewUniverse(null);
  };

  return (
    <>
      <div style={{ width: '100%', maxWidth: 1400, margin: '0 auto', paddingTop: 40, paddingBottom: 60, paddingLeft: 24, paddingRight: 24, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        {/* Intro line — accept-pass round 2: dropped the "A"-in-a-circle
            quote-bubble avatar and quotation marks (old branding, out of
            place next to the rest of the wizard's plain sentence-case
            copy). Just a normal paragraph now, same voice as every other
            step's subtext. */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ fontSize: 16, color: textPrimary, lineHeight: 1.6, margin: '0 0 8px', maxWidth: 640 }}
        >
          Now let's choose the aesthetic for your entire wedding, your invitations, website, and every piece of design will follow this style.
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          style={{ fontSize: 13, color: textMuted, marginBottom: 28 }}
        >
          Tap any universe to preview it. You can change this at any time from your Design Studio.
        </motion.p>

        {/* Universe grid — matches the live marketing /universes page's
            grid tile exactly (see UniverseGridTile above). Forced to 5
            columns so 20 universes lay out as 4 rows of 5, not an
            auto-fill count that varies with viewport width. gap:3 matches
            the marketing grid's own dense spacing — this tile treatment
            reads as premium BECAUSE the tiles sit edge to edge, the same
            reason the marketing page uses it. */}
        <style>{`
          .universe-grid { grid-template-columns: repeat(2, 1fr); }
          @media (min-width: 700px) { .universe-grid { grid-template-columns: repeat(3, 1fr); } }
          @media (min-width: 1000px) { .universe-grid { grid-template-columns: repeat(5, 1fr); } }
        `}</style>
        <motion.div
          className="universe-grid"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={{ display: 'grid', gap: 3 }}
        >
          {UNIVERSES.map((u, i) => (
            <UniverseGridTile
              key={u.id}
              universe={u}
              index={i}
              isSelected={selectedUniverse === u.id}
              onExplore={() => setPreviewUniverse(u)}
              onSelectTile={() => setSelectedUniverse(u.id)}
            />
          ))}
        </motion.div>

        {/* Continue — standard wizard button size (px-8 py-3 rounded-full),
            matching every other step's CTA instead of this step's old
            oversized 14px/48px one-off. websiteMode still defaults to
            'dark' and flows through unchanged; the Dark/Light picker UI
            is gone (accept-pass round 2 — it read as a live preview toggle
            for the wizard itself and, per BASE44_PLATFORM_NOTES.md,
            resolveColors() gives universe colors unconditional priority
            over it anyway, so it never had a visible effect here). */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, marginTop: 40 }}
        >
          <button
            onClick={handleContinue}
            disabled={!selectedUniverse}
            className="px-8 py-3 rounded-full text-white text-sm font-medium tracking-widest bg-[#E03553] hover:bg-black active:bg-neutral-900 transition-colors duration-150 disabled:opacity-30 disabled:cursor-default disabled:bg-[rgba(10,10,10,0.18)] disabled:hover:bg-[rgba(10,10,10,0.18)]"
          >
            Continue →
          </button>
          <button
            onClick={handleSkip}
            style={{
              background: 'none', border: 'none', padding: 0, cursor: 'pointer',
              fontSize: 13, color: textMuted, fontFamily: 'Plus Jakarta Sans, sans-serif',
            }}
          >
            Skip for now →
          </button>
        </motion.div>
      </div>

      {/* Universe preview — every card opens the same full UniverseWorldView
          experience Design Studio itself uses (src/pages/UniverseStudio.jsx),
          not just London. canAccessUltra is hardcoded true here: every
          account is on some form of full access during onboarding itself
          (the free trial's own copy promises "Full Ultra access for 14
          days"), so gating Ultra universes in the picker before a plan is
          even chosen would add friction with no real entitlement behind
          it. onSwitchUniverse only updates local wizard state — no
          WeddingDetails record exists yet to write to; the real write
          happens once in saveOnboarding when the whole wizard completes. */}
      <Dialog open={!!previewUniverse} onOpenChange={(next) => { if (!next) setPreviewUniverse(null); }}>
        <DialogContent fullBleed hideClose title="Universe preview" className="overflow-y-auto">
          {previewUniverse && (
            <UniverseWorldView
              universe={previewUniverse}
              weddingDetails={previewWeddingDetails}
              guests={[]}
              isCurrent={selectedUniverse === previewUniverse.id}
              canAccessUltra={true}
              onBack={() => setPreviewUniverse(null)}
              onSwitchUniverse={handleSelectFromPreview}
              onUpgrade={() => {}}
              motifNote={previewUniverse.motifNote}
              backButtonStyle={{ top: 20, left: 'auto', right: 24 }}
              // This view already renders inside a Dialog/DialogContent —
              // its own scrollable, already-portalled overlay. Escaping to
              // a SECOND document.body portal here (the Design Studio
              // default) would break out of the Dialog itself, not just a
              // sidebar that isn't present in this context anyway.
              escapeLayout={false}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
