import React from 'react';

/** A color panel for emphasis. tone: 'ink' | 'neutral' | 'tint'. `mark` renders the ✦ for Ava. */
export default function PanelCard({ tone = 'ink', mark, label, title, body, action, onClick, style, children }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag type={onClick ? 'button' : undefined} className={`oi-m-panel oi-m-panel--${tone}${onClick ? ' oi-m-press' : ''}`} onClick={onClick} style={style}>
      {(mark || label) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {mark && <span className="oi-m-panel__mark" aria-hidden="true">{mark}</span>}
          {label && <span className="oi-m-meta">{label}</span>}
        </div>
      )}
      {title && <div className="oi-m-section" style={{ color: 'inherit' }}>{title}</div>}
      {body && <p className="oi-m-body" style={{ opacity: tone === 'ink' ? 0.88 : 1 }}>{body}</p>}
      {children}
      {action && <div className="oi-m-meta oi-m-strong" style={{ marginTop: 4, color: 'inherit' }}>{action}</div>}
    </Tag>
  );
}
