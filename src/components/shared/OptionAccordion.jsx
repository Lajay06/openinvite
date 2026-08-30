/**
 * src/components/shared/OptionAccordion.jsx
 *
 * THE ACCORDION PATTERN — the one component. Wave 3.
 *
 * The celebration onboarding step (OnboardingStep5WeddingType.jsx) is the
 * owner's REFERENCE IMPLEMENTATION for options and accordions dashboard-wide,
 * the same standing the Stay page has for guest content layout. Owner:
 *
 *   "please understand how much we love the accordion for the celebration page
 *    and how it needs to translate across the entire dashboard and website
 *    invitation where possible."
 *
 * This file exists BEFORE any propagation, deliberately: a pattern copied
 * twenty times from memory becomes twenty patterns. Full spec in
 * scratchpad/OPEN-TICKETS.md under "WAVE 3 — THE ACCORDION PATTERN".
 *
 * THE SPEC, encoded here so it cannot drift:
 *   1. Collapsed by default. Always. Every instance.       -> openSection = null
 *   2. One section open at a time.                         -> single openKey
 *   3. Heading in the size/weight of THAT page, sentence   -> headingSize/Weight
 *      case, left, chevron right, thin rule between.
 *   4. Collapsed + nothing chosen: "Nothing selected yet", quiet grey.
 *   5. Collapsed + a choice made: THE CHOICE IS SHOWN as a light, borderless,
 *      NON-INTERACTIVE chip. The owner singled this out; it is the rule most
 *      likely to be dropped. A section that collapses and hides the decision
 *      has lost the point of collapsing.
 *   6. Options are PILLS. Unselected OUTLINED, selected solid black on white.
 *   7. Generous vertical rhythm — most of why it reads as expensive.
 *
 * THE SKIN IS NOT UNIVERSAL. Carry the BEHAVIOUR to guest surfaces (collapsed
 * by default, one at a time, the summary chip, the rhythm, the hierarchy) but
 * NEVER the black pill or the Plus Jakarta Sans face — there the universe
 * supplies color, face and weight. Owner: "there is no point if they all run
 * the same and just have slight colors." Hence every color and face below is
 * a prop with a dashboard default, not a hard-coded constant.
 */

import React, { useState, createContext, useContext } from 'react';
import { ChevronDown } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { color, font } from '@/styles/tokens';

const AccordionCtx = createContext(null);

const RULE_COLOR = 'rgba(10,10,10,0.12)'; // rule 3: the thin rule between sections

/**
 * Container. Owns "one section open at a time" and starts with every section
 * collapsed — rules 1 and 2 live here so no instance can opt out of them.
 */
export function OptionAccordion({ children, headingSize = 13, headingWeight = 700, faceFamily = font.family }) {
  const [openKey, setOpenKey] = useState(null); // rule 1: collapsed by default
  const toggle = (key) => setOpenKey((cur) => (cur === key ? null : key)); // rule 2
  return (
    <AccordionCtx.Provider value={{ openKey, toggle, headingSize, headingWeight, faceFamily }}>
      <div style={{ borderTop: `1px solid ${RULE_COLOR}` }}>{children}</div>
    </AccordionCtx.Provider>
  );
}

/**
 * One section. `summary` is the list of choices shown while collapsed (rule 5).
 * Pass [] and it renders "Nothing selected yet" (rule 4) — never nothing at all.
 */
/**
 * `action` renders to the RIGHT of the header, as a SIBLING of the header
 * button rather than inside it — a button nested inside a button is invalid
 * markup and the inner control stops being clickable. A surface that manages a
 * list (delete a question, remove a row) needs that control reachable without
 * opening the section first, which is why it is not simply put in the body.
 */
export function OptionAccordionSection({ sectionKey, title, summary = [], action = null, children }) {
  const ctx = useContext(AccordionCtx);
  if (!ctx) throw new Error('OptionAccordionSection must be inside an OptionAccordion');
  const { openKey, toggle, headingSize, headingWeight, faceFamily } = ctx;
  const isOpen = openKey === sectionKey;

  return (
    <div style={{ borderBottom: `1px solid ${RULE_COLOR}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <button
        type="button"
        onClick={() => toggle(sectionKey)}
        aria-expanded={isOpen}
        style={{
          flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'none', border: 'none', cursor: 'pointer',
          padding: '18px 0',           // rule 7: the rhythm
          textAlign: 'left', fontFamily: faceFamily,
        }}
      >
        {/* rule 3: the page's own size and weight, sentence case, left */}
        <span style={{ fontSize: headingSize, fontWeight: headingWeight, color: color.black }}>{title}</span>
        <ChevronDown
          size={16}
          aria-hidden="true"
          style={{
            color: color.iconMuted, flexShrink: 0,
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
          }}
        />
      </button>
      {action}
      </div>

      {/* rule 5 — a collapsed section must still tell you what you decided */}
      {!isOpen && summary.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, paddingBottom: 16 }}>
          {summary.map((s, i) => <SummaryChip key={i} label={s} faceFamily={faceFamily} />)}
        </div>
      )}
      {/* rule 4 */}
      {!isOpen && summary.length === 0 && (
        <p style={{ fontSize: 12, color: color.textMuted, fontFamily: faceFamily, margin: '0 0 16px' }}>
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

/**
 * Rule 5's chip. Borderless and NON-INTERACTIVE by construction — a span, not a
 * button, so a collapsed section can never read as still-clickable.
 */
export function SummaryChip({ label, faceFamily = font.family }) {
  return (
    <span style={{
      display: 'inline-block', padding: '4px 10px', borderRadius: 999,
      background: 'rgba(10,10,10,0.06)', color: color.textMuted,
      fontSize: 11, fontWeight: 500, fontFamily: faceFamily, whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  );
}

/**
 * Rule 6's pill. Unselected OUTLINED (the top row of the celebration step is
 * the bug, not the model — outlined wins), selected solid black on white.
 *
 * THE HOVER DISTINCTION. Hover on an unselected pill goes black, and selected
 * is also black — they cannot be the same or a couple cannot tell what they
 * chose from what their cursor is touching. Resolving that by making hover
 * subtle is explicitly ruled out: the owner likes that it goes black.
 *
 * So the distinction is carried by a MARK, not by a color. A selected pill
 * shows a leading tick; a hovered-but-unselected pill does not. Hover keeps its
 * full black. The tick slot is always in the layout and merely invisible when
 * unselected, so selecting never reflows the row. ✓ (U+2713) is a
 * text-presentation mark that inherits our face and currentColor — sanctioned
 * by CLAUDE.md, not an emoji.
 *
 * It also fixes what hover alone never could: a selected pill stays legible as
 * chosen with no cursor anywhere near it, including on touch where hover does
 * not exist at all.
 */
export function OptionPill({ label, selected, onClick, faceFamily = font.family, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={`oi-option-pill${selected ? ' oi-option-pill--selected' : ''}`}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '8px 16px',
        borderRadius: 999,
        border: `1px solid ${selected ? color.black : 'rgba(10,10,10,0.18)'}`,
        background: selected ? color.black : 'transparent',
        color: selected ? '#FFFFFF' : color.textMuted,
        fontSize: 12, fontWeight: 500, fontFamily: faceFamily,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.15s',
        whiteSpace: 'nowrap',
      }}
    >
      {/* Reserved slot: present in layout whether or not it is shown, so
          selecting a pill never shifts the pills beside it. */}
      <span aria-hidden="true" style={{ visibility: selected ? 'visible' : 'hidden', fontSize: 11, lineHeight: 1 }}>✓</span>
      {label}
    </button>
  );
}
