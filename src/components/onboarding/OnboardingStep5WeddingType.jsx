import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import {
  FAITH_OPTIONS, FAITH_FOR_INTERFAITH, CULTURE_REGIONS, CULTURE_CROSS_CUTTING,
  AESTHETIC_OPTIONS, ATMOSPHERE_OPTIONS, SETTING_OPTIONS,
} from '@/lib/weddingThemeOptions';
import { color } from '@/styles/tokens';

const PJS = "'Plus Jakarta Sans', sans-serif";

/**
 * THE SAME FIVE QUESTIONS THE DASHBOARD ASKS, IN THE SAME ORDER.
 *
 * Round two, item 7: "Onboarding must match. It currently asks a subset
 * (aesthetic, faith, culture). It must ask the same five, in the same order,
 * with the same options, writing to the same fields, so a couple never answers
 * the same question twice."
 *
 * This step used to ask Style and Vibe — two multi-select pill groups with
 * their own vocabulary ('Traditional', 'Maximalist', 'Party & dancing') that
 * landed in the flat `weddingStyle` array, NOT in the structured theme fields
 * Event details reads and writes. So a couple answered "what kind of wedding"
 * here, opened Event details, and was asked what looked like the same question
 * again in different words — because it WAS the same question, and neither
 * answer could see the other. ThemeSection carries a migration
 * (_STYLE_TO_AESTHETIC and friends) whose whole job was guessing across that
 * gap. It is now one question, asked once, in one vocabulary.
 *
 * weddingStyle is still written, from the same picks, because it has real
 * downstream readers (Considerations' buildProfile, the guest site's
 * WeddingStylePage, Ava's love-story prompt) and dropping it would take the
 * signal away from all three. It is now a derived echo of the real answer
 * rather than a separate answer of its own.
 *
 * SEASON IS NOT ASKED HERE EITHER. It is derived from the date and the venue.
 */
// PR C dedup (#14) — this used to be a third multi-select "Ceremony type"
// tag group (Christian/Catholic/.../Cultural Fusion/Civil) whose picks only
// ever landed in the generic weddingStyle array — never theme.faith. The
// couple's real faith answer lived on the later "Any cultural or religious
// traditions?" page instead, using a completely different vocabulary
// (FAITH_OPTIONS, the same one the dashboard's own ThemeSection.jsx reads/
// writes) — so the same question got asked twice, in two different forms,
// and only the second one actually persisted anywhere. Owner call: keep
// faith capture here, drop it from the later page. This section now IS
// that same canonical FAITH_OPTIONS single-select (+ Interfaith sub-pick),
// ported over, writing directly to theme.faith/theme.faithSecondary.
function Pill({ label, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '8px 16px',
        borderRadius: 999,
        border: `1px solid ${selected ? '#0A0A0A' : 'rgba(10,10,10,0.18)'}`,
        background: selected ? '#0A0A0A' : 'transparent',
        color: selected ? '#FFFFFF' : 'rgba(10,10,10,0.6)',
        fontSize: 12,
        fontWeight: 500,
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

// Read-only chip used in a collapsed section's summary row — visually
// distinct from the interactive Pill/s5-pill above (no border, no hover
// affordance) so a collapsed section never reads as still-clickable.
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

/**
 * THREE STATES, ONE RULE, ALL THREE SECTIONS.
 *
 * The border used to be a single hardcoded `rgba(10,10,10,0.12)` on every
 * section in every state, so a couple could not tell from the edge of a row
 * whether they had answered it. The owner's rule gives the border a job:
 *
 *   untouched              the border token — this row is waiting
 *   open                   #0A0A0A — this row is the one you are answering
 *   answered and collapsed borderStrong — this row is done, and still legible
 *
 * Written as one map rather than three inline ternaries, because the defect
 * being fixed was three rows disagreeing, and a rule spelled out once cannot.
 * The token is `color.border` from src/styles/tokens.js, not a literal: a
 * hardcoded copy of a token is how the three drifted apart in the first place.
 */
const SECTION_BORDER = {
  open: '#0A0A0A',
  answered: color.borderStrong,
  untouched: color.border,
};

const sectionStateOf = (isOpen, summary) =>
  (isOpen ? 'open' : (summary && summary.length > 0 ? 'answered' : 'untouched'));

function AccordionSection({ title, isOpen, onToggle, summary, children }) {
  const state = sectionStateOf(isOpen, summary);
  return (
    <div data-section-state={state} style={{ borderBottom: `1px solid ${SECTION_BORDER[state]}` }}>
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'none', border: 'none', cursor: 'pointer', padding: '18px 0',
          textAlign: 'left', fontFamily: PJS,
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A' }}>{title}</span>
        <ChevronDown
          size={16}
          style={{
            color: 'rgba(10,10,10,0.45)', flexShrink: 0,
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
          }}
        />
      </button>

      {!isOpen && summary.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, paddingBottom: 16 }}>
          {summary.map((s, i) => <SummaryChip key={i} label={s} />)}
        </div>
      )}
      {!isOpen && summary.length === 0 && (
        <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, margin: '0 0 16px' }}>
          Nothing added yet
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
            <div style={{ paddingBottom: 20 }}>{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function OnboardingStep5WeddingType({ onNext, data }) {
  const t = data?.theme || {};
  const [openSection, setOpenSection] = useState(null);
  const [aesthetic, setAesthetic] = useState(t.aesthetic || []);
  const [atmosphere, setAtmosphere] = useState(t.atmosphere || []);
  const [setting, setSetting] = useState(t.setting || '');
  const [culture, setCulture] = useState(t.culture || []);
  const [cultureOther, setCultureOther] = useState(t.cultureOther || '');
  const [faith, setFaithState] = useState(t.faith || '');
  const [interfaithPicks, setInterfaithPicks] = useState(
    t.faith === 'Interfaith' && t.faithSecondary ? t.faithSecondary.split(' and ').filter(Boolean) : [],
  );
  const textPrimary = '#0A0A0A';
  const textMuted = 'rgba(10,10,10,0.6)';

  const toggleSection = key => setOpenSection(prev => prev === key ? null : key);

  const toggleIn = (setter) => (value) =>
    setter(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]);
  const toggleAesthetic = toggleIn(setAesthetic);
  const toggleAtmosphere = toggleIn(setAtmosphere);
  const toggleCulture = toggleIn(setCulture);

  // Single-select, and tapping the chosen one again clears it — the same
  // behaviour ThemeSection's setSingle has, so the two feel identical.
  const pickSetting = value => setSetting(prev => (prev === value ? '' : value));

  const setFaith = value => {
    setFaithState(prev => (prev === value ? '' : value));
    if (value !== 'Interfaith') setInterfaithPicks([]);
  };

  const toggleInterfaithPick = value => {
    setInterfaithPicks(prev => {
      if (prev.includes(value)) return prev.filter(v => v !== value);
      if (prev.length >= 2) return prev;
      return [...prev, value];
    });
  };

  const cultureSummary = [...culture, ...(cultureOther ? [cultureOther] : [])];
  const faithSummary = faith
    ? [faith === 'Interfaith' && interfaithPicks.length === 2 ? `Interfaith: ${interfaithPicks.join(' and ')}` : faith]
    : [];

  const hasSelection = aesthetic.length > 0 || atmosphere.length > 0 || !!setting
    || cultureSummary.length > 0 || !!faith;

  const handleSubmit = () => {
    onNext({
      // A DERIVED ECHO, NOT A SECOND ANSWER. See the note at the top of this
      // file: weddingStyle still has readers, so it is kept in step with the
      // real answer rather than collected separately.
      weddingStyle: [...aesthetic, ...atmosphere],
      // Spreads data.theme first — Onboarding.jsx's goNext does a shallow
      // top-level merge, so an un-spread { theme: {...} } would wipe anything
      // another step wrote there.
      theme: {
        ...data.theme,
        aesthetic,
        atmosphere,
        setting,
        culture,
        cultureOther,
        faith,
        faithSecondary: faith === 'Interfaith' ? interfaithPicks.join(' and ') : '',
      },
    });
  };

  const pillRow = (options, isSelected, onPick) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {options.map(opt => (
        <Pill key={opt} label={opt} selected={isSelected(opt)} onClick={() => onPick(opt)} />
      ))}
    </div>
  );

  return (
    <div className="w-full max-w-2xl">
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 700, color: textPrimary, fontFamily: PJS, marginBottom: 12 }}
      >
        Tell us about your celebration.
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={{ color: textMuted, fontSize: 14, marginBottom: 32, fontFamily: PJS }}
      >
        Tap a section to open it. Select all that apply, and skip anything you have not decided.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        style={{ marginBottom: 32, borderTop: `1px solid ${color.border}` }}
      >
        {/* 1 ── What's the aesthetic? */}
        <AccordionSection
          title="What's the aesthetic?"
          isOpen={openSection === 'aesthetic'}
          onToggle={() => toggleSection('aesthetic')}
          summary={aesthetic}
        >
          {pillRow(AESTHETIC_OPTIONS, opt => aesthetic.includes(opt), toggleAesthetic)}
        </AccordionSection>

        {/* 2 ── Atmosphere */}
        <AccordionSection
          title="Atmosphere"
          isOpen={openSection === 'atmosphere'}
          onToggle={() => toggleSection('atmosphere')}
          summary={atmosphere}
        >
          {pillRow(ATMOSPHERE_OPTIONS, opt => atmosphere.includes(opt), toggleAtmosphere)}
        </AccordionSection>

        {/* 3 ── Setting */}
        <AccordionSection
          title="Setting"
          isOpen={openSection === 'setting'}
          onToggle={() => toggleSection('setting')}
          summary={setting ? [setting] : []}
        >
          {pillRow(SETTING_OPTIONS, opt => setting === opt, pickSetting)}
        </AccordionSection>

        {/* 4 ── Cultures and traditions */}
        <AccordionSection
          title="Cultures and traditions"
          isOpen={openSection === 'culture'}
          onToggle={() => toggleSection('culture')}
          summary={cultureSummary}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {CULTURE_REGIONS.map(r => (
              <div key={r.region}>
                <span style={{ fontSize: 11, fontWeight: 700, color: textMuted, fontFamily: PJS, display: 'block', marginBottom: 10 }}>
                  {r.region}
                </span>
                {pillRow(r.items, opt => culture.includes(opt), toggleCulture)}
              </div>
            ))}
            <div>
              <span style={{ fontSize: 11, fontWeight: 700, color: textMuted, fontFamily: PJS, display: 'block', marginBottom: 10 }}>
                Also relevant
              </span>
              {pillRow(CULTURE_CROSS_CUTTING, opt => culture.includes(opt), toggleCulture)}
            </div>
            <div>
              <span style={{ fontSize: 11, fontWeight: 700, color: textMuted, fontFamily: PJS, display: 'block', marginBottom: 10 }}>
                Anything else
              </span>
              <input
                type="text"
                value={cultureOther}
                onChange={e => setCultureOther(e.target.value)}
                placeholder="Tell us in your own words"
                style={{
                  background: 'transparent', border: 'none',
                  borderBottom: `1px solid ${color.border}`, color: '#0A0A0A',
                  fontFamily: PJS, fontSize: 13, padding: '6px 2px', width: 280, outline: 'none',
                }}
              />
            </div>
          </div>
        </AccordionSection>

        {/* 5 ── Faith or religion. LAST, and that is the point of the order:
                the owner does not want a religion question among the first
                things anyone sees. */}
        <AccordionSection
          title="Faith or religion"
          isOpen={openSection === 'faith'}
          onToggle={() => toggleSection('faith')}
          summary={faithSummary}
        >
          {pillRow(FAITH_OPTIONS, opt => faith === opt, setFaith)}
          {faith === 'Interfaith' && (
            <div style={{ marginTop: 14, padding: '12px 14px', border: `1px solid ${color.border}`, background: '#FAFAFA' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: textMuted, fontFamily: PJS, margin: '0 0 8px' }}>
                Select the two faiths ({interfaithPicks.length}/2 selected)
              </p>
              {pillRow(FAITH_FOR_INTERFAITH, opt => interfaithPicks.includes(opt), toggleInterfaithPick)}
            </div>
          )}
        </AccordionSection>
      </motion.div>

      {hasSelection && (
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={handleSubmit}
          className="px-8 py-3 rounded-full text-white text-sm font-medium bg-[#E03553] hover:bg-black active:bg-neutral-900 transition-colors duration-150"
        >
          Continue →
        </motion.button>
      )}
    </div>
  );
}

