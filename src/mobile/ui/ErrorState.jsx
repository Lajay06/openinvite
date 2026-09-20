import React from 'react';
import { AlertCircle } from 'lucide-react';
import PillButton from './PillButton';

export default function ErrorState({ text = 'This did not load. Check your connection and try again.', onRetry }) {
  return (
    <div className="oi-m-empty" role="alert">
      <span className="oi-m-empty__icon"><AlertCircle size={24} strokeWidth={1.5} /></span>
      <p className="oi-m-body" style={{ color: 'var(--m-text-2)', maxWidth: 280 }}>{text}</p>
      {onRetry && <PillButton variant="secondary" size="sm" onClick={onRetry}>Try again</PillButton>}
    </div>
  );
}
