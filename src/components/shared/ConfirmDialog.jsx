import React, { useCallback, useRef, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';

const PJS = "'Plus Jakarta Sans', sans-serif";

/**
 * THE PRODUCT'S OWN CONFIRM, for a delete that asks first.
 *
 * Vendors, expenses, seating tables and registry links ask with
 * window.confirm before they delete. That is the right moment and the right
 * question, but a native dialog is the one piece of interface we do not draw,
 * and the owner ruled them out (tests/persistence/no-native-dialog.mjs holds
 * the old sites as a ratchet that may only shrink). So a new delete keeps the
 * pattern, the same words asked before the write, through this instead.
 *
 * `const [askToConfirm, confirmDialog] = useConfirm();` then render
 * `{confirmDialog}` once and `if (!(await askToConfirm('Delete this task?'))) return;`
 * where window.confirm would have been. Closing the dialog any other way
 * answers no. Rounding comes from the shared DialogContent, never set here.
 *
 * The web twin of src/mobile/ui/ConfirmSheet.jsx's useConfirm.
 */
export function useConfirm() {
  const [state, setState] = useState(null);
  const resolver = useRef(null);
  const askToConfirm = useCallback((question, { action = 'Delete' } = {}) => new Promise((resolve) => {
    resolver.current?.(false);
    resolver.current = resolve;
    setState({ question, action });
  }), []);
  const answer = (value) => {
    resolver.current?.(value);
    resolver.current = null;
    setState(null);
  };
  const element = (
    <Dialog open={!!state} onOpenChange={(open) => { if (!open) answer(false); }}>
      <DialogContent hideClose title={state?.question || 'Confirm'} className="oi-modal-scale p-0 gap-0" style={{ width: 'min(90vw, 380px)', maxWidth: 'min(90vw, 380px)', fontFamily: PJS }}>
        <div data-confirm-dialog style={{ padding: '24px 24px 20px' }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#0A0A0A', margin: 0, lineHeight: 1.5 }}>{state?.question}</p>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '14px 24px', borderTop: '1px solid rgba(10,10,10,0.12)' }}>
          <button type="button" className="btn-editorial-secondary" onClick={() => answer(false)}>Cancel</button>
          <button type="button" className="btn-primary" data-confirm-action onClick={() => answer(true)}>{state?.action}</button>
        </div>
      </DialogContent>
    </Dialog>
  );
  return [askToConfirm, element];
}
