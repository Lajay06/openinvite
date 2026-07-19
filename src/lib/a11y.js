import { useEffect, useRef } from 'react';

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

const FOCUSABLE_SELECTOR = [
  'a[href]', 'button:not([disabled])', 'textarea:not([disabled])',
  'input:not([disabled])', 'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

function getFocusable(container) {
  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR))
    .filter((el) => el.offsetParent !== null); // skip hidden/display:none descendants
}

/**
 * Standard modal focus-management contract, applied once per modal so
 * every one behaves identically: on mount, focus moves into the dialog
 * (first focusable element, or the dialog itself as a fallback); Tab is
 * trapped inside it; Escape calls onClose (the same path as a backdrop
 * click — never a destructive action); on unmount, focus returns to
 * whatever triggered the modal.
 *
 * Assumes the conditional-mount pattern already used everywhere in this
 * codebase ({showModal && <Modal onClose={...} />}) — mount = open,
 * unmount = close — so this only needs one mount effect, no open/close
 * toggle prop.
 *
 * Usage: const dialogRef = useModalFocusTrap(onClose); then
 * <div ref={dialogRef} tabIndex={-1}>...modal content...</div>
 */
export function useModalFocusTrap(onClose) {
  const dialogRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const trigger = document.activeElement;
    const container = dialogRef.current;

    if (container) {
      const focusable = getFocusable(container);
      (focusable[0] || container).focus();
    }

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current?.();
        return;
      }
      if (e.key !== 'Tab' || !container || !container.contains(document.activeElement)) return;
      const focusable = getFocusable(container);
      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (trigger && document.contains(trigger) && typeof trigger.focus === 'function') {
        trigger.focus();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount/unmount only, see doc comment
  }, []);

  return dialogRef;
}
