import React, { useState, useMemo } from 'react';
import { Check } from 'lucide-react';
import { getWeddingEvents } from '@/lib/weddingEvents';
import { STYLE_OPTIONS, BUDGET_BANDS, resolveOutfitGuidance } from '@/lib/stylingRules';

/**
 * The lightweight, deterministic alternative to the AI-generated style
 * questionnaire (roadmap D2) — no LLM calls, no external APIs, guest
 * answers are not persisted anywhere. Rendered by WeddingStylePage.jsx
 * when the couple has enabled it via Guest Suite → Policies.
 */
export default function RulesBasedStyleQuestionnaire({ weddingDetails, theme, typography }) {
  const events = useMemo(() => getWeddingEvents(weddingDetails), [weddingDetails]);

  const [step, setStep] = useState(0); // 0: events, 1: style, 2: budget, 3: results
  const [attendingIds, setAttendingIds] = useState([]);
  const [styleId, setStyleId] = useState('');
  const [budgetId, setBudgetId] = useState('');

  const bfont = typography.bodyFont;
  const hfont = typography.headingFont;
  const hweight = typography.headingWeight;

  const toggleEvent = (eventId) => {
    setAttendingIds(prev =>
      prev.includes(eventId) ? prev.filter(id => id !== eventId) : [...prev, eventId]
    );
  };

  const attendingEvents = events.filter(e => attendingIds.includes(e.event_id));
  const guidance = useMemo(
    () => resolveOutfitGuidance({ styleId, budgetId, attendingEvents }),
    [styleId, budgetId, attendingEvents]
  );

  const handleRetake = () => {
    setStep(0);
    setAttendingIds([]);
    setStyleId('');
    setBudgetId('');
  };

  const shellStyle = { minHeight: '100vh', background: theme.lightBg, fontFamily: bfont };
  const containerStyle = { maxWidth: 560, margin: '0 auto', padding: '60px 24px 80px' };

  // ── Step 0: which events are you attending? ─────────────────────────────────
  if (step === 0) {
    return (
      <div style={shellStyle}>
        <div style={containerStyle}>
          <h1 style={{ fontFamily: hfont, fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: hweight, color: theme.lightText, margin: '0 0 12px', textAlign: 'center' }}>
            What will you wear?
          </h1>
          <p style={{ fontSize: 14, color: `${theme.lightText}70`, textAlign: 'center', margin: '0 0 40px', lineHeight: 1.6 }}>
            Tell us which events you're attending and we'll suggest what to wear.
          </p>

          {events.length === 0 ? (
            <p style={{ fontSize: 14, color: `${theme.lightText}60`, textAlign: 'center' }}>
              No events have been added to this wedding yet.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
              {events.map(ev => {
                const selected = attendingIds.includes(ev.event_id);
                return (
                  <button
                    key={ev.event_id}
                    type="button"
                    onClick={() => toggleEvent(ev.event_id)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '15px 20px', textAlign: 'left',
                      background: selected ? theme.darkBg : 'transparent',
                      border: `1px solid ${selected ? theme.accent : `${theme.lightText}18`}`,
                      cursor: 'pointer', fontFamily: bfont, fontSize: 14,
                      color: selected ? theme.darkText : theme.lightText,
                      fontWeight: selected ? 600 : 400,
                    }}
                  >
                    <span>{ev.name}{ev.dressCode ? ` — ${ev.dressCode}` : ''}</span>
                    {selected && <Check size={14} color={theme.accent} />}
                  </button>
                );
              })}
            </div>
          )}

          <button
            type="button"
            onClick={() => setStep(1)}
            disabled={attendingIds.length === 0}
            style={{
              width: '100%', padding: '14px 24px', borderRadius: 999,
              background: theme.accent, color: '#FFFFFF', border: 'none',
              fontSize: 15, fontWeight: 700, fontFamily: bfont,
              cursor: attendingIds.length === 0 ? 'default' : 'pointer',
              opacity: attendingIds.length === 0 ? 0.5 : 1,
            }}
          >
            Next
          </button>
        </div>
      </div>
    );
  }

  // ── Step 1: style preference ────────────────────────────────────────────────
  if (step === 1) {
    return (
      <div style={shellStyle}>
        <div style={containerStyle}>
          <h2 style={{ fontFamily: hfont, fontSize: 'clamp(1.5rem, 4vw, 2.4rem)', fontWeight: hweight, color: theme.lightText, margin: '0 0 28px' }}>
            What's your style vibe?
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {STYLE_OPTIONS.map(opt => {
              const selected = styleId === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => { setStyleId(opt.id); setTimeout(() => setStep(2), 160); }}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '15px 20px', textAlign: 'left',
                    background: selected ? theme.darkBg : 'transparent',
                    border: `1px solid ${selected ? theme.accent : `${theme.lightText}18`}`,
                    cursor: 'pointer', fontFamily: bfont, fontSize: 14,
                    color: selected ? theme.darkText : theme.lightText,
                    fontWeight: selected ? 600 : 400,
                  }}
                >
                  <span>{opt.label}</span>
                  {selected && <Check size={14} color={theme.accent} />}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => setStep(0)}
            style={{ marginTop: 24, background: 'none', border: 'none', color: `${theme.lightText}45`, fontSize: 13, fontFamily: bfont, cursor: 'pointer', padding: 0 }}
          >
            ← Back
          </button>
        </div>
      </div>
    );
  }

  // ── Step 2: budget band ──────────────────────────────────────────────────────
  if (step === 2) {
    return (
      <div style={shellStyle}>
        <div style={containerStyle}>
          <h2 style={{ fontFamily: hfont, fontSize: 'clamp(1.5rem, 4vw, 2.4rem)', fontWeight: hweight, color: theme.lightText, margin: '0 0 28px' }}>
            What's your budget for this outfit?
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {BUDGET_BANDS.map(opt => {
              const selected = budgetId === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => { setBudgetId(opt.id); setTimeout(() => setStep(3), 160); }}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '15px 20px', textAlign: 'left',
                    background: selected ? theme.darkBg : 'transparent',
                    border: `1px solid ${selected ? theme.accent : `${theme.lightText}18`}`,
                    cursor: 'pointer', fontFamily: bfont, fontSize: 14,
                    color: selected ? theme.darkText : theme.lightText,
                    fontWeight: selected ? 600 : 400,
                  }}
                >
                  <span>{opt.label}</span>
                  {selected && <Check size={14} color={theme.accent} />}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => setStep(1)}
            style={{ marginTop: 24, background: 'none', border: 'none', color: `${theme.lightText}45`, fontSize: 13, fontFamily: bfont, cursor: 'pointer', padding: 0 }}
          >
            ← Back
          </button>
        </div>
      </div>
    );
  }

  // ── Step 3: results — render immediately, nothing persisted ─────────────────
  return (
    <div style={{ minHeight: '100vh', background: theme.lightBg, color: theme.lightText, fontFamily: bfont }}>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '60px 24px 80px' }}>
        <h1 style={{ fontFamily: hfont, fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: hweight, margin: '0 0 8px', textAlign: 'center' }}>
          Your style guide
        </h1>
        <p style={{ fontSize: 13, color: `${theme.lightText}60`, textAlign: 'center', margin: '0 0 40px' }}>
          Based on your answers — nothing here is saved
        </p>

        {/* Main guidance */}
        <div style={{ background: theme.darkBg, padding: 32, marginBottom: 20 }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: `${theme.darkText}50`, margin: '0 0 14px' }}>
            What to wear
          </p>
          <p style={{ fontSize: 15, color: `${theme.darkText}CC`, lineHeight: 1.75, margin: '0 0 20px' }}>
            {guidance.outfitBase}
          </p>
          <p style={{ fontSize: 13, color: `${theme.darkText}90`, lineHeight: 1.6, margin: '0 0 24px' }}>
            {guidance.silhouetteNote}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: `${theme.darkText}50`, margin: '0 0 10px' }}>
                Colour palette
              </p>
              <p style={{ fontSize: 13, color: `${theme.darkText}CC`, margin: 0, lineHeight: 1.6 }}>
                {guidance.colorPalette.join(', ')}
              </p>
            </div>
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: `${theme.darkText}50`, margin: '0 0 10px' }}>
                Fabric
              </p>
              <p style={{ fontSize: 13, color: `${theme.darkText}CC`, margin: 0, lineHeight: 1.6 }}>
                {guidance.fabricNote}
              </p>
            </div>
          </div>
        </div>

        {/* Per-event formality (when it varies) */}
        {guidance.variesAcrossEvents && (
          <div style={{ marginBottom: 20, border: `1px solid ${theme.lightText}15`, padding: '20px 24px' }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: `${theme.lightText}50`, margin: '0 0 14px' }}>
              Formality by event
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {guidance.perEventFormality.map(e => (
                <div key={e.event_id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: theme.lightText }}>{e.name}</span>
                  <span style={{ color: `${theme.lightText}70` }}>{e.label}</span>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 12, color: `${theme.lightText}55`, margin: '14px 0 0', lineHeight: 1.5 }}>
              Dress for the most formal event you're attending — you'll be appropriately dressed for the rest too.
            </p>
          </div>
        )}

        {/* What to avoid */}
        <div style={{ marginBottom: 20, border: `1px solid ${theme.lightText}10`, padding: '20px 24px' }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: `${theme.lightText}50`, margin: '0 0 14px' }}>
            What to avoid
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {guidance.avoid.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span style={{ fontSize: 13, color: '#E03553', fontWeight: 700, flexShrink: 0 }}>✗</span>
                <span style={{ fontSize: 13, color: `${theme.lightText}75`, lineHeight: 1.5 }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Budget note */}
        <div style={{ marginBottom: 40, background: `${theme.lightText}05`, padding: '20px 24px' }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: `${theme.lightText}50`, margin: '0 0 14px' }}>
            Budget tip
          </p>
          <p style={{ fontSize: 13, color: `${theme.lightText}75`, margin: 0, lineHeight: 1.6 }}>
            {guidance.budgetNote}
          </p>
        </div>

        <button
          type="button"
          onClick={handleRetake}
          style={{ padding: '10px 20px', borderRadius: 999, background: 'transparent', border: `1px solid ${theme.lightText}20`, color: `${theme.lightText}55`, cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: bfont }}
        >
          Retake questionnaire
        </button>
      </div>
    </div>
  );
}
