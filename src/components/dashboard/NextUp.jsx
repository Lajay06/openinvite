/**
 * src/components/dashboard/NextUp.jsx
 *
 * The orientation layer — variant A, the lead block. Sits between the daily
 * update's headline and its editorial grid and answers one question: what do I
 * do now?
 *
 * WHAT IT IS NOT (dashboard council verdict, 2026-08-13):
 *   Orientation, not motivation. No streaks, no points, no percentage complete,
 *   no progress bar. "Step N of 7" is a POSITION, not a score. Framing is
 *   timeline-scoped — days to the wedding — never feature-scoped completeness.
 *   It points; it never celebrates (confetti stays with avaStudioMilestones).
 *
 * WHAT IT REFUSES TO DO:
 *   Render on absent data. DailyUpdate can now tell loading from error from
 *   genuinely-new, and this inherits that: with no wedding record there is no
 *   block at all. A "next step" computed from nothing would be the
 *   empty-account lie in a new costume — the exact defect #486/#487 fixed.
 *
 *   Point a free-plan couple at a step they cannot action. Orientation must
 *   never become upsell pressure, so a plan-locked step is never proposed. It
 *   stays visible in the disclosed list, marked, stated once.
 *
 * Presentational only: it computes nothing about completeness. The caller
 * passes the journey, which must come from getMyWeddingDetails() — the
 * server-DECRYPTING reader. A raw WeddingDetails read hands isComplete
 * ciphertext and the budget step reports incomplete forever, silently, looking
 * exactly like a couple who has not set a budget. Pinned in CI.
 */
import React, { useState } from 'react';

const PJS = "'Plus Jakarta Sans', sans-serif";
const INK = '#0A0A0A';
const MUTED = 'rgba(10,10,10,0.6)';
const ICON = 'rgba(10,10,10,0.45)';
const RULE = 'rgba(10,10,10,0.12)';

const wrapStyle = {
  borderTop: `1px solid ${RULE}`, borderBottom: `1px solid ${RULE}`,
  borderLeft: '3px solid #E03553', padding: '28px 40px', background: '#FFFFFF',
};
const eyebrow = { fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: MUTED, fontFamily: PJS };
const titleStyle = { fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', color: INK, fontFamily: PJS, margin: '10px 0 6px' };
const whyStyle = { fontSize: 14, color: MUTED, lineHeight: 1.6, maxWidth: 560, margin: 0, fontFamily: PJS };
const rowStyle = { display: 'flex', alignItems: 'center', gap: 14, padding: '11px 0', borderBottom: `1px solid ${RULE}`, fontSize: 14, fontFamily: PJS, color: INK };
const lockStyle = { fontSize: 11, borderRadius: 999, padding: '3px 9px', border: `1px solid ${RULE}`, color: MUTED, fontFamily: PJS };

function Dot({ done }) {
  return (
    <span style={{
      width: 9, height: 9, borderRadius: 999, flex: '0 0 9px',
      background: done ? INK : 'transparent',
      border: done ? 'none' : `1.5px solid ${ICON}`,
    }} />
  );
}

export default function NextUp({ journey, daysUntil, onGo }) {
  // Dismissal is SESSION-ONLY and deliberately not persisted. A stored
  // dismissal would be a second source of truth about progress, which is
  // exactly what setupJourney's derived-completeness model exists to avoid.
  const [dismissed, setDismissed] = useState(false);

  // No journey means no wedding record reached us. Render nothing rather than
  // guess — see the header.
  if (!journey || !Array.isArray(journey.steps) || journey.steps.length === 0) return null;
  if (dismissed) return null;

  const { steps, nextIndex, doneCount, allDone, nothingProposable } = journey;
  const step = nextIndex >= 0 ? steps[nextIndex] : null;
  const total = steps.length;

  const closing = allDone
    ? 'Everything on your list is done. New steps will appear here as your day gets closer.'
    : "You're on top of everything for now. New steps will appear here as your day gets closer.";

  return (
    <div style={wrapStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 20, flexWrap: 'wrap' }}>
        <span style={eyebrow}>Next up</span>
        <span style={{ ...eyebrow, color: ICON }}>
          {step ? `Step ${nextIndex + 1} of ${total}` : `${doneCount} of ${total} done`}
          {typeof daysUntil === 'number' ? ` · ${daysUntil} days to go` : ''}
        </span>
      </div>

      {step ? (
        <>
          <h3 style={titleStyle}>{step.title}</h3>
          <p style={whyStyle}>{step.purpose}</p>
          <div style={{ display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap', alignItems: 'center' }}>
            <button onClick={() => onGo?.(step)} className="btn-primary" style={{ fontSize: 13 }}>
              {step.title}
            </button>
            <button onClick={() => setDismissed(true)} className="btn-editorial-secondary" style={{ fontSize: 13 }}>
              Not now
            </button>
          </div>
        </>
      ) : (
        // Nothing proposable. For a free-plan couple this is NOT "all done" and
        // must not read as an upgrade prompt.
        <p style={{ ...whyStyle, marginTop: 12, fontSize: 15, color: INK }}>{closing}</p>
      )}

      <details style={{ marginTop: 22, borderTop: `1px solid ${RULE}`, paddingTop: 18 }}>
        <summary style={{ cursor: 'pointer', fontSize: 13, color: MUTED, fontFamily: PJS }}>
          {step ? 'Everything else on your list' : `Your list (${doneCount} of ${total} done)`}
        </summary>
        <div style={{ marginTop: 18 }}>
          {steps.map((s) => (
            <div key={s.key} style={rowStyle}>
              <Dot done={s.done} />
              <span style={{ flex: 1, minWidth: 0 }}>{s.title}</span>
              {s.planLocked && <span style={lockStyle}>Ultra</span>}
              {!s.done && !s.planLocked && s.blockedBy?.length > 0 && (
                <span style={{ fontSize: 12, color: MUTED, fontFamily: PJS }}>
                  after {steps.find((x) => x.key === s.blockedBy[0])?.title?.toLowerCase()}
                </span>
              )}
            </div>
          ))}
          {steps.some((s) => s.planLocked) && (
            // Stated ONCE. No countdown, no "unlock", no repetition.
            <p style={{ ...whyStyle, marginTop: 14, fontSize: 13 }}>
              Building and publishing your website is part of Ultra.
            </p>
          )}
        </div>
      </details>
    </div>
  );
}
