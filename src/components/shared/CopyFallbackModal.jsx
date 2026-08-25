/**
 * The links, shown plainly, when the clipboard is unavailable.
 *
 * This is the safety net for the primary path, NOT an error state, and it is
 * styled as something deliberate. A couple who cannot get RSVP links cannot
 * invite anyone, so that ability must never depend on a browser permission a
 * user may have refused months ago and forgotten.
 *
 * The textarea is pre-selected so the next keystroke is a copy.
 */
import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

const PJS = "'Plus Jakarta Sans', sans-serif";

export default function CopyFallbackModal({ open, onClose, title, text, hint }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const id = setTimeout(() => { ref.current?.focus(); ref.current?.select(); }, 60);
    return () => clearTimeout(id);
  }, [open, text]);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent style={{ maxWidth: 560 }}>
        <DialogHeader>
          <DialogTitle style={{ fontFamily: PJS, fontSize: 18, fontWeight: 700 }}>
            {title || 'Your links'}
          </DialogTitle>
        </DialogHeader>
        <p style={{ fontFamily: PJS, fontSize: 13, color: 'rgba(10,10,10,0.6)', margin: '0 0 12px', lineHeight: 1.6 }}>
          {hint || 'Selected and ready — copy these, then paste them wherever you need.'}
        </p>
        <textarea
          ref={ref}
          readOnly
          value={text}
          rows={Math.min(10, Math.max(3, String(text || '').split('\n').length))}
          style={{
            width: '100%', padding: '12px 14px', border: '1px solid rgba(10,10,10,0.18)',
            borderRadius: 0, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            fontSize: 13, lineHeight: 1.7, color: '#0A0A0A', background: '#FFFFFF',
            boxSizing: 'border-box', resize: 'vertical',
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
          <button type="button" onClick={onClose} className="btn-primary" style={{ padding: '10px 22px', fontSize: 13 }}>
            <X size={13} /> Done
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
