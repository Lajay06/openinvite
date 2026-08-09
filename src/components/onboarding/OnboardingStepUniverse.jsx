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

// Light-card treatment (PR B on-brand pass) — previously a full-bleed dark
// photo tile with a gradient scrim and white caption text, ported straight
// from Universes.jsx's marketing-grid tile. DESIGN_SPEC.md used to carve
// out an explicit exception for that (white-on-photo "fixed property of
// the image-card treatment"), but next to the rest of this wizard's light,
// left-aligned, sentence-case steps, a wall of 20 dense dark tiles read as
// a different product dropped into the middle of it. Now matches the
// wizard's own card language (see OnboardingStep4GuestCount's Intimate/
// Celebration/Grand tiles): white background, a thin default border that
// darkens on hover/selection (same affordance as OnboardingStep8Fork's
// cards), photo confined to its own panel instead of filling the tile,
// name/tagline in dark text below it. Selection badge and the hover-reveal
// palette swatches are unchanged in spirit, just recomposed onto a light
// ground.
function UniverseGridTile({ universe, index, isSelected, onSelect }) {
  const [hovered, setHovered] = useState(false);
  const swatches = [
    { color: universe.colors.darkBg, label: 'Ground' },
    { color: universe.colors.lightBg, label: 'Paper' },
    { color: universe.colors.accent, label: 'Accent' },
    { color: universe.colors.accentSecondary, label: 'Secondary' },
  ].filter(s => !!s.color);
  const isActive = isSelected || hovered;

  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      {...interactiveDivProps(onSelect, { label: `Preview the ${universe.name} universe` })}
      style={{
        display: 'flex', flexDirection: 'column',
        background: '#FFFFFF', cursor: 'pointer',
        border: `1px solid ${isActive ? '#0A0A0A' : 'rgba(10,10,10,0.12)'}`,
        transition: 'border-color 0.2s ease',
      }}
    >
      <div style={{ position: 'relative', aspectRatio: '4 / 3', overflow: 'hidden' }}>
        <img
          src={universe.photo}
          alt={`The ${universe.name} universe: ${universe.tagline || 'a full wedding aesthetic'}`}
          loading={index < 4 ? 'eager' : 'lazy'}
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
            transform: hovered ? 'scale(1.04)' : 'scale(1)', transition: 'transform 0.6s cubic-bezier(0.16,1,0.3,1)',
          }}
        />
        {isSelected && (
          <div style={{
            position: 'absolute', top: 8, right: 8, width: 18, height: 18, borderRadius: '50%',
            background: '#E03553', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="9" height="9" viewBox="0 0 14 14" fill="none">
              <path d="M2.5 7L5.5 10L11.5 4" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}
      </div>

      <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <p style={{ fontSize: 10, fontStyle: 'italic', color: 'rgba(10,10,10,0.5)', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          {universe.tagline}
        </p>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A', letterSpacing: '-0.01em', margin: 0, lineHeight: 1.2 }}>
          {universe.name}
        </h3>

        <div style={{
          display: 'flex', gap: 4, marginTop: hovered ? 6 : 0,
          maxHeight: hovered ? 12 : 0, opacity: hovered ? 1 : 0, overflow: 'hidden',
          transition: 'max-height 0.35s ease, opacity 0.3s ease, margin-top 0.35s ease',
        }}>
          {swatches.map((s, i) => (
            <span key={i} title={s.label} style={{ width: 10, height: 10, background: s.color, border: s.color === '#FFFFFF' ? '1px solid rgba(10,10,10,0.18)' : 'none', flexShrink: 0 }} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function OnboardingStepUniverse({ onNext, data }) {
  const [selectedUniverse, setSelectedUniverse] = useState(data.activeUniverse || null);
  const [websiteMode, setWebsiteMode] = useState(data.websiteMode || 'dark');
  const [previewUniverse, setPreviewUniverse] = useState(null);
  const [continueHovered, setContinueHovered] = useState(false);
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
      <div style={{ width: '100%', maxWidth: 960, margin: '0 auto', paddingTop: 40, paddingBottom: 60, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        {/* Ava prompt */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 12, paddingLeft: 4 }}
        >
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, #E03553, #803D81)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#FFF', flexShrink: 0, marginTop: 2, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>A</div>
          <div>
            <p style={{ fontSize: 16, color: textPrimary, lineHeight: 1.6, margin: 0, maxWidth: 560 }}>
              "Now let's choose the aesthetic for your entire wedding — your invitations, website, and every piece of design will follow this style."
            </p>
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          style={{ fontSize: 13, color: textMuted, marginBottom: 28, paddingLeft: 42 }}
        >
          Tap any universe to preview it. You can change this at any time from your Design Studio.
        </motion.p>

        {/* Universe grid — light UniverseGridTile cards (see above), scaled
            to the wizard's content column instead of a full marketing
            section width. gap bumped from the marketing grid's dense 3px —
            the wizard elsewhere uses generous whitespace, and 3px between
            20 tiles read as a wall, not a picker. */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}
        >
          {UNIVERSES.map((u, i) => (
            <UniverseGridTile
              key={u.id}
              universe={u}
              index={i}
              isSelected={selectedUniverse === u.id}
              onSelect={() => setPreviewUniverse(u)}
            />
          ))}
        </motion.div>

        {/* Website mode */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          style={{ marginTop: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}
        >
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: textMuted, fontFamily: 'Plus Jakarta Sans, sans-serif', margin: 0 }}>
            Wedding website appearance
          </p>
          {/* Relabelled — round of onboarding-content-refresh feedback found
              this read as a live preview toggle for the wizard itself
              (it visibly does nothing when tapped), when it actually only
              sets the theme of the couple's own published wedding website,
              set later. Caption makes that explicit instead of building a
              live wizard-theme preview, which is out of scope here. */}
          <p style={{ fontSize: 11, color: textMuted, fontFamily: 'Plus Jakarta Sans, sans-serif', margin: '0 0 4px', maxWidth: 320, textAlign: 'center' }}>
            Applies to your wedding website once it's published — not this setup.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            {['Dark', 'Light'].map(mode => (
              <button
                key={mode}
                onClick={() => setWebsiteMode(mode.toLowerCase())}
                style={{
                  padding: '8px 24px',
                  borderRadius: 999,
                  border: `1px solid ${websiteMode === mode.toLowerCase() ? '#0A0A0A' : 'rgba(10,10,10,0.18)'}`,
                  background: websiteMode === mode.toLowerCase() ? '#0A0A0A' : 'transparent',
                  color: websiteMode === mode.toLowerCase() ? '#FFFFFF' : textMuted,
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  fontFamily: 'Plus Jakarta Sans, sans-serif',
                  transition: 'all 0.2s ease',
                }}
              >
                {mode}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Continue */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, marginTop: 40 }}
        >
          <button
            onClick={handleContinue}
            disabled={!selectedUniverse}
            onMouseEnter={() => selectedUniverse && setContinueHovered(true)}
            onMouseLeave={() => setContinueHovered(false)}
            style={{
              padding: '14px 48px',
              borderRadius: 999,
              background: !selectedUniverse
                ? 'transparent'
                : continueHovered
                  ? '#0A0A0A'
                  : '#E03553',
              border: selectedUniverse ? 'none' : '1px solid rgba(10,10,10,0.18)',
              color: selectedUniverse ? '#FFFFFF' : 'rgba(10,10,10,0.3)',
              cursor: selectedUniverse ? 'pointer' : 'default',
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              transition: 'background 0.15s ease',
            }}
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
