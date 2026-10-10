import React from 'react';

/** tone: 'ok' | 'warn' | 'no' | 'neutral' */
export default function StatusPill({ tone = 'neutral', children }) {
  return <span className={`oi-m-status oi-m-status--${tone}`}>{children}</span>;
}
