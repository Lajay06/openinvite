import React from 'react';
import PillButton from './PillButton';
import SmartImage from './SmartImage';

/** One icon (or a photo), one sentence, one action. */
export default function EmptyState({ icon: Icon, image, text, actionLabel, onAction }) {
  return (
    <div className="oi-m-empty">
      {image ? (
        <SmartImage src={image} alt="" width={320} ratio="16/9" style={{ width: '100%', margin: '-16px 0 4px' }} />
      ) : Icon ? (
        <span className="oi-m-empty__icon"><Icon size={24} strokeWidth={1.5} /></span>
      ) : null}
      <p className="oi-m-body" style={{ color: 'var(--m-text-2)', maxWidth: 280 }}>{text}</p>
      {actionLabel && onAction && <PillButton variant="secondary" size="sm" onClick={onAction}>{actionLabel}</PillButton>}
    </div>
  );
}
