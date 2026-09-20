import React from 'react';
import { AlertCircle } from 'lucide-react';
import PillButton from './PillButton';

/** Something did not load. One sentence and a retry. */
export default function ErrorState({ text = 'This did not load. Check your connection and try again.', onRetry }) {
  return (
    <div className="oi-m-empty" role="alert">
      <AlertCircle size={32} strokeWidth={1.5} className="oi-m-empty__icon" />
      <p className="oi-m-body" style={{ color: 'var(--m-text-2)', maxWidth: 280 }}>{text}</p>
      {onRetry && <PillButton variant="secondary" onClick={onRetry}>Try again</PillButton>}
    </div>
  );
}
