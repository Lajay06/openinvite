import React from 'react';

/** The one button shape: a pill. variant 'primary' | 'secondary' | 'ghost' | 'light'; size 'md' | 'sm'. */
export default function PillButton({ variant = 'primary', size = 'md', block = false, icon: Icon, children, className = '', ...rest }) {
  return (
    <button
      type="button"
      className={`oi-m-pill oi-m-pill--${variant}${size === 'sm' ? ' oi-m-pill--sm' : ''}${block ? ' oi-m-pill--block' : ''} ${className}`}
      {...rest}
    >
      {Icon && <Icon size={18} strokeWidth={2} />}
      {children}
    </button>
  );
}
