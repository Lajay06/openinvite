import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { FAITH_OPTIONS, FAITH_FOR_INTERFAITH } from '@/lib/weddingThemeOptions';

const PJS = "'Plus Jakarta Sans', sans-serif";

// Style/Vibe stay multi-select tag groups feeding the generic weddingStyle
// array (unchanged purpose — aesthetic/atmosphere derivation elsewhere:
// Considerations.jsx's buildProfile(), WeddingStylePage.jsx, Ava's love-
// story prompt). Faith is its own thing below, not one of these two.
const STYLE_VIBE_GROUPS = [
  {
    key: 'style',
    label: 'Style',
    pills: ['Traditional', 'Modern', 'Minimalist', 'Maximalist', 'Bohemian', 'Luxury'],
  },
  {
    key: 'vibe',
    label: 'Vibe',
    pills: ['Intimate & romantic', 'Party & dancing', 'Outdoor & nature', 'Destination', 'Multi-day', 'Elopement'],
  },
];

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

function AccordionSection({ title, isOpen, onToggle, summary, children }) {
  return (
    <div style={{ borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
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
        <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.35)', fontFamily: PJS, margin: '0 0 16px' }}>
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
            <div style={{ paddingBottom: 20 }}>{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function OnboardingStep5WeddingType({ onNext, data }) {
  const [openSection, setOpenSection] = useState(null);
  const [selected, setSelected] = useState([]);
  const [otherText, setOtherText] = useState({ style: '', vibe: '' });
  const [faith, setFaithState] = useState(data?.theme?.faith || '');
  const [interfaithPicks, setInterfaithPicks] = useState([]);
  const textPrimary = '#0A0A0A';
  const textMuted = 'rgba(10,10,10,0.6)';
  const otherInputBorder = 'rgba(10,10,10,0.18)';

  const toggleSection = key => setOpenSection(prev => prev === key ? null : key);

  const otherKey = key => `__other_${key}`;

  const toggle = pill =>
    setSelected(prev => prev.includes(pill) ? prev.filter(p => p !== pill) : [...prev, pill]);

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

  const handleSubmit = () => {
    const extras = STYLE_VIBE_GROUPS
      .filter(g => selected.includes(otherKey(g.key)) && otherText[g.key].trim())
      .map(g => otherText[g.key].trim());
    onNext({
      weddingStyle: [...selected.filter(s => !s.startsWith('__other_')), ...extras],
      // Spreads data.theme first — PathACultural's own onNext also writes
      // theme (culture/cultureOther) later in the flow, and Onboarding.jsx's
      // goNext does a shallow top-level merge, so an un-spread { theme: {...} }
      // from either step would silently wipe out whatever the other step
      // already wrote there.
      theme: {
        ...data.theme,
        faith,
        faithSecondary: faith === 'Interfaith' ? interfaithPicks.join(' and ') : '',
      },
    });
  };

  const hasSelection = selected.length > 0 || STYLE_VIBE_GROUPS.some(g => otherText[g.key].trim()) || !!faith;

  const summaryFor = group => {
    const picks = selected.filter(s => group.pills.includes(s));
    if (otherText[group.key].trim()) picks.push(otherText[group.key].trim());
    return picks;
  };

  const faithSummary = faith
    ? [faith === 'Interfaith' && interfaithPicks.length ? `Interfaith (${interfaithPicks.join(' & ')})` : faith]
    : [];

  return (
    <div className="w-full max-w-2xl">
      <style>{`
        .s5-other::placeholder { color: rgba(10,10,10,0.58); }
        .s5-pill:not(.s5-active):hover {
          background: #0A0A0A !important;
          color: #FFFFFF !important;
          border-color: #0A0A0A !important;
        }
        .s5-pill:not(.s5-active):active { background: #111111 !important; }
      `}</style>

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
        Tap a section to open it. Select all that apply.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        style={{ marginBottom: 32, borderTop: '1px solid rgba(10,10,10,0.08)' }}
      >
        {/* Style */}
        <AccordionSection
          title="Style"
          isOpen={openSection === 'style'}
          onToggle={() => toggleSection('style')}
          summary={summaryFor(STYLE_VIBE_GROUPS[0])}
        >
          <StyleVibePills
            group={STYLE_VIBE_GROUPS[0]}
            selected={selected}
            toggle={toggle}
            otherKey={otherKey}
            otherText={otherText}
            setOtherText={setOtherText}
            pillBorder={otherInputBorder}
          />
        </AccordionSection>

        {/* Ceremony type & Faith */}
        <AccordionSection
          title="Ceremony type & faith"
          isOpen={openSection === 'faith'}
          onToggle={() => toggleSection('faith')}
          summary={faithSummary}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {FAITH_OPTIONS.map(opt => (
              <Pill key={opt} label={opt} selected={faith === opt} onClick={() => setFaith(opt)} />
            ))}
          </div>
          {faith === 'Interfaith' && (
            <div style={{ marginTop: 14, padding: '12px 14px', border: '1px solid rgba(10,10,10,0.08)', background: '#FAFAFA' }}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: 'rgba(10,10,10,0.6)', fontFamily: PJS, margin: '0 0 8px' }}>
                Select the two faiths ({interfaithPicks.length}/2 selected)
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {FAITH_FOR_INTERFAITH.map(opt => (
                  <Pill key={opt} label={opt} selected={interfaithPicks.includes(opt)} onClick={() => toggleInterfaithPick(opt)} />
                ))}
              </div>
            </div>
          )}
        </AccordionSection>

        {/* Vibe */}
        <AccordionSection
          title="Vibe"
          isOpen={openSection === 'vibe'}
          onToggle={() => toggleSection('vibe')}
          summary={summaryFor(STYLE_VIBE_GROUPS[1])}
        >
          <StyleVibePills
            group={STYLE_VIBE_GROUPS[1]}
            selected={selected}
            toggle={toggle}
            otherKey={otherKey}
            otherText={otherText}
            setOtherText={setOtherText}
            pillBorder={otherInputBorder}
          />
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

// Shared pill-grid + "Other" free-text renderer for the Style/Vibe groups —
// identical behaviour to before this PR, just extracted so AccordionSection
// can wrap it without duplicating the Other-input logic twice.
function StyleVibePills({ group, selected, toggle, otherKey, otherText, setOtherText, pillBorder }) {
  const isOtherSelected = selected.includes(otherKey(group.key));
  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {group.pills.map(pill => {
          const isActive = selected.includes(pill);
          return (
            <motion.button
              key={pill}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={() => toggle(pill)}
              className={`s5-pill${isActive ? ' s5-active' : ''}`}
              style={{
                padding: '8px 16px',
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 500,
                fontFamily: PJS,
                cursor: 'pointer',
                transition: 'all 0.15s',
                background: isActive ? '#0A0A0A' : 'transparent',
                color: isActive ? '#FFFFFF' : 'rgba(10,10,10,0.6)',
                border: `1px solid ${isActive ? '#0A0A0A' : pillBorder}`,
              }}
            >
              {pill}
            </motion.button>
          );
        })}

        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={() => toggle(otherKey(group.key))}
          className={`s5-pill${isOtherSelected ? ' s5-active' : ''}`}
          style={{
            padding: '8px 16px',
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 500,
            fontFamily: PJS,
            cursor: 'pointer',
            transition: 'all 0.15s',
            background: isOtherSelected ? '#0A0A0A' : 'transparent',
            color: isOtherSelected ? '#FFFFFF' : 'rgba(10,10,10,0.6)',
            border: `1px solid ${isOtherSelected ? '#0A0A0A' : pillBorder}`,
          }}
        >
          Other
        </motion.button>
      </div>

      {isOtherSelected && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          style={{ marginTop: 12 }}
        >
          <input
            type="text"
            className="s5-other"
            value={otherText[group.key]}
            onChange={e => setOtherText(prev => ({ ...prev, [group.key]: e.target.value }))}
            placeholder={`Describe your ${group.label.toLowerCase()}…`}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: `1px solid ${pillBorder}`,
              color: '#0A0A0A',
              fontFamily: PJS,
              fontSize: 13,
              padding: '6px 2px',
              width: 280,
              outline: 'none',
            }}
          />
        </motion.div>
      )}
    </div>
  );
}
