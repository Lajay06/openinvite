// Shared keyboard-accessibility helper for interactive div/span rows.
// Spreads role="button", tabIndex, and an Enter/Space onKeyDown handler
// that mirrors onClick — same pattern already proven in AnimatedSidebar.jsx.
export function interactiveDivProps(onClick, { disabled = false, label } = {}) {
  if (!onClick || disabled) {
    return {
      role: 'button',
      'aria-disabled': disabled || undefined,
      tabIndex: -1,
      ...(label ? { 'aria-label': label } : {}),
    };
  }
  return {
    role: 'button',
    tabIndex: 0,
    ...(label ? { 'aria-label': label } : {}),
    onKeyDown: (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick(e);
      }
    },
  };
}
