import React from 'react';

/**
 * Horizontally scrolling filter pills. options: [{ key, label, count? }].
 * Selected is black, unselected is the outlined white pill.
 */
export default function FilterPills({ options, value, onChange, className = 'oi-m-filters' }) {
  return (
    <div className={className} role="tablist">
      {options.map((o) => {
        const on = o.key === value;
        return (
          <button
            key={o.key}
            type="button"
            role="tab"
            aria-selected={on}
            className={`oi-m-filter${on ? ' oi-m-filter--on' : ''}`}
            onClick={() => onChange(o.key)}
          >
            {o.label}
            {typeof o.count === 'number' ? ` ${o.count}` : ''}
          </button>
        );
      })}
    </div>
  );
}
