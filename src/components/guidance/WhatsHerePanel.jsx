import React from 'react';
import { X } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';

const PJS = "'Plus Jakarta Sans', sans-serif";

/**
 * "WHAT'S HERE" — one page, explained in the couple's words.
 *
 * Round two, item 17: "a page-specific 'What's here' panel on every page,
 * opened from a consistent control, the way Ava is both global and
 * page-specific."
 *
 * ── IT IS THE SAME SHAPE ON EVERY PAGE ─────────────────────────────────────
 *
 * Purpose, then three actions, then — on four pages only — the reason to come
 * back. A couple who reads one of these knows how to read all of them, which
 * is the whole value of a consistent control: the second time they open it
 * they are looking for a specific line, not reading a new layout.
 *
 * ── DISMISS IS NOT CLOSE ───────────────────────────────────────────────────
 *
 * Closing puts the panel away for now. "Do not show this again" is a separate,
 * quieter control, because those are different intentions and a panel that
 * never returned after one glance would be a help system that helps once.
 *
 * Dismissal needs somewhere to live — WeddingDetails.guidanceState — which is
 * the owner's to add. Until it exists, `onDismiss` is not passed and the
 * control is not rendered: an offer the product cannot keep is worse than no
 * offer.
 */
export default function WhatsHerePanel({ guidance, onClose, onDismiss }) {
  if (!guidance) return null;
  const { purpose, actions = [], loop, helpHref } = guidance;

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent hideClose title="What's here" className="max-w-[460px] p-0 gap-0">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid rgba(10,10,10,0.12)' }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS }}>What&apos;s here</span>
          <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.6)', display: 'flex', padding: 4 }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 22 }}>
          <p style={{ fontSize: 14, color: '#0A0A0A', fontFamily: PJS, margin: 0, lineHeight: 1.65 }}>
            {purpose}
          </p>

          <div>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, display: 'block', marginBottom: 10 }}>
              What most people do here
            </span>
            <ol style={{ margin: 0, padding: '0 0 0 18px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {actions.map((a) => (
                <li key={a} style={{ fontSize: 13, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, lineHeight: 1.6 }}>{a}</li>
              ))}
            </ol>
          </div>

          {loop && (
            <div style={{ borderTop: '1px solid rgba(10,10,10,0.12)', paddingTop: 16 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, display: 'block', marginBottom: 8 }}>
                Worth coming back for
              </span>
              <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, margin: 0, lineHeight: 1.6 }}>{loop}</p>
            </div>
          )}
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(10,10,10,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          {/* Dismissal is offered only when there is somewhere to record it. */}
          {onDismiss ? (
            <button onClick={onDismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, padding: 0 }}>
              Do not show this again
            </button>
          ) : <span />}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {helpHref && (
              <a href={helpHref} style={{ fontSize: 12, fontWeight: 600, color: 'rgba(10,10,10,0.6)', fontFamily: PJS }}>
                Help center
              </a>
            )}
            <button onClick={onClose} className="btn-primary" style={{ fontSize: 13 }}>Got it</button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
