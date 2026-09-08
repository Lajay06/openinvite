import React from 'react';

/**
 * The builder's DARK-PANEL switch, 28x16 in strawberry. One implementation,
 * because there are now two panels using it: the left panel's page rows and
 * the right panel's hero switches.
 *
 * It was written in WBLeftPanel.jsx and lifted here rather than copied — a
 * second pill hand-written beside the first is the drift this repo has
 * already paid for twice (two copies of the preview device widths, two copies
 * of the guard's z-index).
 *
 * NOT the same control as `Toggle` in SectionEditorFields.jsx, which is the
 * larger 38x21 switch with a `#333` label for LIGHT surfaces. Two controls,
 * two surfaces, different names — which is why this one is not called Toggle.
 */
export default function PillSwitch({ enabled, onToggle, label }) {
  return (
    <button
      onClick={e => { e.stopPropagation(); onToggle(); }}
      aria-label={label ? `Toggle ${label}` : 'Toggle'}
      aria-pressed={enabled}
      style={{
        width: 28, height: 16, borderRadius: 999, border: 'none', cursor: 'pointer',
        background: enabled ? '#E03553' : '#2C2C2E',
        position: 'relative', flexShrink: 0, padding: 0, outline: 'none',
        transition: 'background 0.2s ease',
      }}
    >
      <div style={{
        position: 'absolute',
        width: 12, height: 12, borderRadius: '50%',
        background: '#FFFFFF',
        top: 2, left: 2,
        transform: enabled ? 'translateX(12px)' : 'translateX(0)',
        transition: 'transform 0.2s ease',
      }} />
    </button>
  );
}
