import React from 'react';

/** The one button shape: a pill. variant 'primary' | 'secondary' | 'ghost'. */
export default function PillButton({ variant = 'primary', block = false, icon: Icon, children, ...rest }) {
  return (
    <button
      type="button"
      className={`oi-m-pill oi-m-pill--${variant}${block ? ' oi-m-pill--block' : ''}`}
      {...rest}
    >
      {Icon && <Icon size={18} strokeWidth={2} />}
      {children}
    </button>
  );
}
