import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, ChevronDown } from 'lucide-react';
import { CULTURE_REGIONS, CULTURE_CROSS_CUTTING } from '@/lib/weddingThemeOptions';

const PJS = "'Plus Jakarta Sans', sans-serif";

function Pill({ label, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '6px 16px',
        borderRadius: 999,
        border: `1px solid ${selected ? '#0A0A0A' : 'rgba(10,10,10,0.18)'}`,
        background: selected ? '#0A0A0A' : 'transparent',
        color: selected ? '#FFFFFF' : '#0A0A0A',
        fontSize: 12,
        fontWeight: 600,
        fontFamily: PJS,
        cursor: 'pointer',
        transition: 'all 0.15s',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  );
}

// Same read-only chip OnboardingStep5WeddingType.jsx's collapsed-section
// summary uses — kept in sync by eye since the two files don't share a
// component module, but the visual language (no border, muted grey pill)
// must match: both are "a collapsed section's contents, summarized".
function SummaryChip({ label }) {
  return (
    <span style={{
      display: 'inline-block', padding: '4px 10px', borderRadius: 999,
      background: 'rgba(10,10,10,0.06)', color: 'rgba(10,10,10,0.6)',
      fontSize: 11, fontWeight: 500, fontFamily: PJS, whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  );
}

// Ported from OnboardingStep5WeddingType.jsx's AccordionSection (same
// collapsed-by-default, tap-to-open, summary-chips-when-closed treatment)
// so this page reads as one continuation of Step 5's accordion, not a
// different pattern one screen later.
function AccordionSection({ title, isOpen, onToggle, summary, children }) {
  return (
    <div style={{ borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'none', border: 'none', cursor: 'pointer', padding: '14px 0',
          textAlign: 'left', fontFamily: PJS,
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', color: 'rgba(10,10,10,0.6)' }}>{title}</span>
        <ChevronDown
          size={15}
          style={{
            color: 'rgba(10,10,10,0.45)', flexShrink: 0,
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
          }}
        />
      </button>

      {!isOpen && summary.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, paddingBottom: 14 }}>
          {summary.map((s, i) => <SummaryChip key={i} label={s} />)}
        </div>
      )}
      {!isOpen && summary.length === 0 && (
        <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.35)', fontFamily: PJS, margin: '0 0 14px' }}>
          Nothing selected yet
        </p>
      )}

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ paddingBottom: 18 }}>{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// PR C dedup (#14) — this page used to also ask Faith or religion
// (FAITH_OPTIONS + an Interfaith sub-pick), duplicating the question
// OnboardingStep5WeddingType.jsx's "Ceremony type & faith" accordion
// section now owns. Owner call: keep faith capture in Step 5, this page is
// heritage-only from here on, just the regional Cultures & traditions
// list. No question asked twice.
//
// Accept-pass round 2: region groups (Asia & Middle East, Africa, Europe,
// North & South America, Oceania & Pacific, plus "Also relevant") are now
// their own AccordionSection each, collapsed by default, same as Step 5's
// three sections, instead of one long always-open scrolling list.
export default function OnboardingPathACultural({ onNext, data }) {
  const [culture, setCulture] = useState([]);
  const [cultureOther, setCultureOther] = useState('');
  const [showCultureInput, setShowCultureInput] = useState(false);
  const [openSection, setOpenSection] = useState(null);

  const toggleSection = key => setOpenSection(prev => prev === key ? null : key);

  const toggleCulture = (value) =>
    setCulture(prev => (prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]));

  // Spreads data.theme first — Step 5 already wrote theme.faith/
  // faithSecondary earlier in the flow, and Onboarding.jsx's goNext does a
  // shallow top-level merge, so an un-spread { theme: {...} } here would
  // silently overwrite (not merge with) that earlier write.
  const handleSubmit = () => {
    onNext({
      theme: {
        ...data.theme,
        culture,
        cultureOther,
      },
    });
  };

  const handleSkip = () => onNext({ theme: data.theme || null });

  return (
    <div className="w-full max-w-3xl">
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="font-bold text-[#0A0A0A] mb-3"
        style={{ fontSize: 'clamp(28px, 4vw, 48px)' }}
      >
        Any cultural traditions?
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.05 }}
        style={{ fontSize: 14, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, margin: '0 0 32px' }}
      >
        This shapes Ava's suggestions later. Tap a region to open it.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-left mb-10"
        style={{ borderTop: '1px solid rgba(10,10,10,0.08)' }}
      >
        {CULTURE_REGIONS.map(r => (
          <AccordionSection
            key={r.region}
            title={r.region}
            isOpen={openSection === r.region}
            onToggle={() => toggleSection(r.region)}
            summary={culture.filter(c => r.items.includes(c))}
          >
            <div className="flex flex-wrap gap-2">
              {r.items.map(opt => (
                <Pill key={opt} label={opt} selected={culture.includes(opt)} onClick={() => toggleCulture(opt)} />
              ))}
            </div>
          </AccordionSection>
        ))}
        <AccordionSection
          title="Also relevant"
          isOpen={openSection === '__cross_cutting'}
          onToggle={() => toggleSection('__cross_cutting')}
          summary={culture.filter(c => CULTURE_CROSS_CUTTING.includes(c))}
        >
          <div className="flex flex-wrap gap-2">
            {CULTURE_CROSS_CUTTING.map(opt => (
              <Pill key={opt} label={opt} selected={culture.includes(opt)} onClick={() => toggleCulture(opt)} />
            ))}
          </div>
        </AccordionSection>

        <div style={{ marginTop: 16 }}>
          {!showCultureInput && !cultureOther ? (
            <button
              type="button"
              onClick={() => setShowCultureInput(true)}
              className="flex items-center gap-1"
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'rgba(10,10,10,0.45)', fontFamily: PJS, fontWeight: 600, padding: 0 }}
            >
              <Plus size={13} /> Add your own
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <input
                value={cultureOther}
                onChange={(e) => setCultureOther(e.target.value)}
                placeholder="e.g. Nigerian, Filipino-Australian…"
                className="bg-transparent border-b border-[rgba(10,10,10,0.18)] focus:outline-none focus:border-[#E03553] transition-colors"
                style={{ maxWidth: 280, padding: '6px 2px', fontSize: 13, fontFamily: PJS, color: '#0A0A0A' }}
              />
              <button
                type="button"
                onClick={() => { setCultureOther(''); setShowCultureInput(false); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.45)', padding: 0, display: 'flex', alignItems: 'center' }}
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="space-y-4"
      >
        <button
          onClick={handleSubmit}
          className="px-8 py-3 rounded-full text-white text-sm font-medium tracking-widest bg-[#E03553] hover:bg-black active:bg-neutral-900 transition-colors duration-150"
        >
          Continue →
        </button>

        <button
          onClick={handleSkip}
          className="block text-[rgba(10,10,10,0.6)] hover:text-[#0A0A0A] text-sm transition-colors"
        >
          Skip for now →
        </button>
      </motion.div>
    </div>
  );
}
