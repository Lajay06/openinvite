import React from 'react';

/**
 * A flat white block on the page background. Optional heading row with a
 * text action on the right (the action gets a 44px hit area).
 */
export default function Block({ title, action, onAction, flush = false, children, style }) {
  return (
    <section className={`oi-m-block${flush ? ' oi-m-block--flush' : ''}`} style={style}>
      {(title || action) && (
        <div className="oi-m-block__head" style={flush ? { padding: '16px 16px 0' } : undefined}>
          {title ? <h2 className="oi-m-section">{title}</h2> : <span />}
          {action && (
            <button type="button" className="oi-m-block__link" onClick={onAction}>
              {action}
            </button>
          )}
        </div>
      )}
      {children}
    </section>
  );
}
