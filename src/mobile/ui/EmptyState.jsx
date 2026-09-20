import React from 'react';
import PillButton from './PillButton';

/** One icon, one sentence, one action. */
export default function EmptyState({ icon: Icon, text, actionLabel, onAction }) {
  return (
    <div className="oi-m-empty">
      {Icon && <Icon size={32} strokeWidth={1.5} className="oi-m-empty__icon" />}
      <p className="oi-m-body" style={{ color: 'var(--m-text-2)', maxWidth: 280 }}>{text}</p>
      {actionLabel && onAction && (
        <PillButton variant="secondary" onClick={onAction}>{actionLabel}</PillButton>
      )}
    </div>
  );
}
