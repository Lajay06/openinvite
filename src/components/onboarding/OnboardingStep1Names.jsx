import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

const PJS = "'Plus Jakarta Sans', sans-serif";

// The sentence this step has always asked. A caller that passes no `lines`
// gets exactly these, in this order, with these placeholders, seeded from the
// same draft fields, and onNext receives the same object as before.
const NAMES_LINES = [
  { key: 'couple1Name', text: 'Hi, my name is', placeholder: 'Your name' },
  { key: 'couple2Name', text: "and my partner's name is", placeholder: "Partner's name" },
];

/**
 * `lines` (optional, gifting v2 page 2, owner ruling 2026-10-13: "page 2 must
 * be onboarding step 1, not a lookalike"): the same inline sentence with other
 * words. Each line is { key, text, placeholder, type?, valid?, hint? }; the
 * values seed from `data[key]` and onNext receives { [key]: value }. `valid`
 * (default: non-empty) decides when Continue appears, as an empty field does
 * today; `hint` is shown under a line whose field has been left holding
 * something not valid. Without `lines`, nothing about this step changes.
 *
 * A line may also set `fit` (gifting v2, owner ruling 2026-10-13: every word
 * fits, nothing cut off): its field grows to its value, taking a row of its
 * own when it needs one, and if the value is still wider than the row the
 * type steps down from 32px, never below 12px. Lines without it, which is
 * every onboarding line, are unchanged.
 *
 * `size` (optional, default 32, the size onboarding has always used) sets the
 * whole sentence, labels and fields alike. Gift page 2 sets it smaller (owner
 * ruling 2026-10-14) so "and goes to" and an ordinary address share one line
 * at 1440; a `fit` field then stays on its label's row while the row has room
 * (it wraps below the label on a phone) and steps down from `size` when its
 * value is longer than the room left.
 */
export default function OnboardingStep1Names({ onNext, data, lines = NAMES_LINES, size = 32 }) {
  // SEEDED FROM THE DRAFT, like every other step. This one alone took no
  // `data` prop and started both fields empty, so a couple resuming an
  // unfinished sign-up stepped back to "Hi, my name is" and found their own
  // names gone — the record still held them, the wizard just never asked.
  // Invisible until c832e9e declared onboardingDraft and resume began to
  // work at all.
  const [values, setValues] = useState(() => Object.fromEntries(lines.map((l) => [l.key, data?.[l.key] || ''])));
  const [focused, setFocused] = useState(null);
  const [left, setLeft] = useState({});
  const fieldRefs = useRef({});
  const [fitSize, setFitSize] = useState({});
  // A field measured before the web font arrives, or before a resize, is
  // measured again after it: the fallback face is narrower, so a value that
  // fitted in it can be cut in Plus Jakarta Sans.
  const [, remeasure] = useState(0);
  const anyFit = lines.some((l) => l.fit);
  useEffect(() => {
    if (!anyFit) return undefined;
    const again = () => remeasure((n) => n + 1);
    window.addEventListener('resize', again);
    document.fonts?.addEventListener?.('loadingdone', again);
    document.fonts?.ready?.then(again);
    return () => { window.removeEventListener('resize', again); document.fonts?.removeEventListener?.('loadingdone', again); };
  }, [anyFit]);
  // Steps a `fit` field's type down until its value shows whole.
  useLayoutEffect(() => {
    const next = {};
    for (const l of lines) {
      const el = fieldRefs.current[l.key];
      if (!l.fit || !el) continue;
      let px = size;
      el.style.fontSize = `${px}px`;
      while (px > 12 && el.scrollWidth > el.clientWidth + 1) { px -= 1; el.style.fontSize = `${px}px`; }
      next[l.key] = px;
    }
    setFitSize((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
  });

  const labelColor = 'rgba(10,10,10,0.6)';
  const inputColor = '#0A0A0A';
  const inputBorderDefault = 'rgba(10,10,10,0.18)';
  const inputBorderActive = 'rgba(10,10,10,0.55)';

  const isValid = (l) => (l.valid ? l.valid(values[l.key]) : !!values[l.key].trim());
  const allValid = lines.every(isValid);

  const handleSubmit = () => {
    if (allValid) {
      onNext(Object.fromEntries(lines.map((l) => [l.key, values[l.key]])));
    }
  };

  const sentenceStyle = {
    fontSize: size, fontWeight: 400,
    color: labelColor, fontFamily: PJS,
    margin: 0, flexShrink: 0,
  };

  const inputStyle = (value, isFocused) => ({
    background: 'transparent',
    border: 'none',
    // No pink in any state (owner ruling 2026-10-13): empty keeps the faint
    // line; focused or filled darkens the same 2px line, so focus stays visible.
    borderBottom: (value || isFocused)
      ? `2px solid ${inputBorderActive}`
      : `1px solid ${inputBorderDefault}`,
    minWidth: 200,
    maxWidth: 300,
    width: '100%',
    fontSize: size,
    fontWeight: 700,
    color: inputColor,
    fontFamily: PJS,
    padding: '4px 8px',
    outline: 'none',
    textAlign: 'left',
    flex: '1 1 200px',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 24, width: '100%', maxWidth: 700 }}>
      <style>{`
        .s1-input::placeholder { color: rgba(10,10,10,0.58); }
      `}</style>

      {lines.map((l) => {
        const showHint = l.hint && left[l.key] && values[l.key].trim() !== '' && !isValid(l);
        return (
          <React.Fragment key={l.key}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 12, width: '100%', flexWrap: 'wrap' }}>
              <span style={sentenceStyle}>{l.text}</span>
              <input
                type={l.type || 'text'}
                value={values[l.key]}
                onChange={e => setValues((v) => ({ ...v, [l.key]: e.target.value }))}
                placeholder={l.placeholder}
                className="s1-input"
                ref={(el) => { fieldRefs.current[l.key] = el; }}
                style={l.fit
                  ? { ...inputStyle(values[l.key], focused === l.key), minWidth: 0, maxWidth: '100%', flex: '1 1 220px', fontSize: fitSize[l.key] || size }
                  : inputStyle(values[l.key], focused === l.key)}
                onFocus={() => setFocused(l.key)}
                onBlur={() => { setFocused(null); if (l.hint) setLeft((s) => ({ ...s, [l.key]: true })); }}
                onKeyDown={e => e.key === 'Enter' && allValid && handleSubmit()}
                {...(l.hint ? { 'aria-invalid': showHint || undefined, 'aria-describedby': showHint ? `s1-hint-${l.key}` : undefined } : {})}
              />
            </div>
            {showHint && (
              <p id={`s1-hint-${l.key}`} data-s1-hint={l.key} style={{ fontSize: 14, color: labelColor, fontFamily: PJS, margin: '-12px 0 0' }}>{l.hint}</p>
            )}
          </React.Fragment>
        );
      })}

      {/* Continue button */}
      {allValid && (
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={handleSubmit}
          style={{ marginTop: 48 }}
          className="px-8 py-3 rounded-full text-white text-sm font-medium bg-[#E03553] hover:bg-black active:bg-neutral-900 transition-colors duration-150"
        >
          Continue →
        </motion.button>
      )}
    </div>
  );
}
