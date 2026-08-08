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

        {/* Universe cards */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 16, scrollbarWidth: 'none' }}
        >
          {UNIVERSES.map((u) => {
            const isSelected = selectedUniverse === u.id;
            return (
              <div
                key={u.id}
                onClick={() => setPreviewUniverse(u)}
                {...interactiveDivProps(() => setPreviewUniverse(u))}
                style={{
                  width: 220, flexShrink: 0, height: 280,
                  position: 'relative', overflow: 'hidden',
                  cursor: 'pointer',
                  border: isSelected ? '1px solid rgba(255,255,255,0.6)' : '1px solid transparent',
                  transition: 'border 0.2s ease',
                  opacity: 1,
                  background: '#111',
                }}
              >
                <img
                  src={u.photo}
                  alt={u.name}
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.45 }}
                />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #0A0A0A 0%, rgba(10,10,10,0.6) 50%, transparent 100%)' }} />

                {/* Bottom info */}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '16px 16px 18px' }}>
                  <p style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontWeight: 300, fontSize: 11, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.2em', margin: '0 0 4px' }}>{u.number}</p>
                  <p style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontStyle: 'italic', fontSize: 11, color: 'rgba(255,255,255,0.45)', margin: 0, letterSpacing: '0.05em' }}>{u.tagline || u.name}</p>
                </div>
              </div>
            );
          })}
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
          style={{ display: 'flex', justifyContent: 'center', marginTop: 40 }}
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

      <style>{`div::-webkit-scrollbar { display: none; }`}</style>
    </>
  );
}
