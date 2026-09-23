import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { PAGE_GUIDANCE } from '@/lib/pageGuidance';

const PJS = "'Plus Jakarta Sans', sans-serif";

/**
 * "QUICK TIPS" — the one-time walk of the dashboard, after onboarding.
 *
 * Round two, item 17: "A global first-run tour — 'Quick tips' — shown once
 * after onboarding completes, walking the dashboard."
 *
 * ── SIX STOPS, NOT THIRTY-SEVEN ────────────────────────────────────────────
 *
 * There is guidance for every page, and a tour that visited all of them would
 * be a manual nobody finishes. The tour walks the six a couple has to
 * understand to use the product at all — where the wedding stands, where the
 * facts live, who is coming, what is happening when, what it costs, and what
 * the guests see. Every other page explains itself through "What's here", from
 * the same content, at the moment the couple is actually on it.
 *
 * The stops are PATHS into PAGE_GUIDANCE, not a second copy of the words. A
 * tour that restated the panels would be two things to keep in step.
 *
 * ── IT DOES NOT NAVIGATE ───────────────────────────────────────────────────
 *
 * A tour that drags the couple through six routes leaves them somewhere they
 * did not choose, with five pages of half-loaded state behind them. This reads
 * as a sequence in one place, and the couple goes where they want afterwards.
 */

/** The six stops, in the order the product is learned. */
export const TOUR_STOPS = [
  { path: '/DailyUpdate', title: 'Daily update' },
  { path: '/event-details', title: 'Event details' },
  { path: '/Guests', title: 'Guest list' },
  { path: '/Schedule', title: 'Schedule' },
  { path: '/Budget', title: 'Budget' },
  { path: '/studio', title: 'Design studio' },
];

export default function QuickTipsTour({ onClose, onFinish }) {
  const [at, setAt] = useState(0);
  const stop = TOUR_STOPS[at];
  const guidance = PAGE_GUIDANCE[stop.path] || {};
  const last = at === TOUR_STOPS.length - 1;

  const finish = () => { if (onFinish) onFinish(); onClose(); };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent hideClose title="Quick tips" className="max-w-[460px] p-0 gap-0">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid rgba(10,10,10,0.12)' }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS }}>Quick tips</span>
          <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.6)', display: 'flex', padding: 4 }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Where you are in the six. Square, not rounded — this is not a pill. */}
          <div style={{ display: 'flex', gap: 5 }}>
            {TOUR_STOPS.map((s, i) => (
              <div
                key={s.path}
                style={{ height: 3, flex: 1, background: i <= at ? '#E03553' : 'rgba(10,10,10,0.12)' }}
              />
            ))}
          </div>

          <div>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, display: 'block', marginBottom: 6 }}>
              {at + 1} of {TOUR_STOPS.length}
            </span>
            <p style={{ fontSize: 17, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS, margin: '0 0 10px' }}>{stop.title}</p>
            <p style={{ fontSize: 14, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, margin: 0, lineHeight: 1.65 }}>{guidance.purpose}</p>
          </div>

          <ol style={{ margin: 0, padding: '0 0 0 18px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {(guidance.actions || []).map((a) => (
              <li key={a} style={{ fontSize: 13, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, lineHeight: 1.6 }}>{a}</li>
            ))}
          </ol>
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(10,10,10,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <button
            onClick={finish}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, padding: 0 }}
          >
            Skip
          </button>
          <div style={{ display: 'flex', gap: 10 }}>
            {at > 0 && (
              <button onClick={() => setAt((i) => i - 1)} className="btn-editorial-secondary" style={{ fontSize: 13 }}>Back</button>
            )}
            <button onClick={() => (last ? finish() : setAt((i) => i + 1))} className="btn-primary" style={{ fontSize: 13 }}>
              {last ? 'Done' : 'Next'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
