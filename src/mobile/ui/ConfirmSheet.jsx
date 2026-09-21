import React, { useCallback, useState } from 'react';
import BottomSheet from './BottomSheet';
import PillButton from './PillButton';

/**
 * A sheet-based confirm for destructive actions, in place of window.confirm.
 * `useConfirm()` returns [confirm, element]: `await confirm({ title, body, action })`
 * resolves true when the couple taps the action.
 */
export function useConfirm() {
  const [state, setState] = useState(null);
  const confirm = useCallback((opts) => new Promise((resolve) => setState({ ...opts, resolve })), []);
  const done = (v) => { state?.resolve(v); setState(null); };
  const element = (
    <BottomSheet open={!!state} onClose={() => done(false)} title={state?.title || 'Are you sure'} footer={(
      <>
        <PillButton variant="secondary" onClick={() => done(false)}>Cancel</PillButton>
        <PillButton variant="primary" onClick={() => done(true)} style={{ flex: 1 }}>{state?.action || 'Remove'}</PillButton>
      </>
    )}>
      {state?.body && <p className="oi-m-body">{state.body}</p>}
    </BottomSheet>
  );
  return [confirm, element];
}

export default function ConfirmSheet({ open, title, body, action = 'Remove', onClose, onConfirm }) {
  return (
    <BottomSheet open={open} onClose={onClose} title={title} footer={(
      <>
        <PillButton variant="secondary" onClick={onClose}>Cancel</PillButton>
        <PillButton variant="primary" onClick={onConfirm} style={{ flex: 1 }}>{action}</PillButton>
      </>
    )}>
      {body && <p className="oi-m-body">{body}</p>}
    </BottomSheet>
  );
}
