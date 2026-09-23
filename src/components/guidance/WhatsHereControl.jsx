import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { HelpCircle } from 'lucide-react';
import { guidanceFor } from '@/lib/pageGuidance';
import { isGuidanceEnabled } from '@/lib/guidanceFlag';
import WhatsHerePanel from './WhatsHerePanel';

/**
 * THE ONE CONTROL, IN THE ONE PLACE.
 *
 * Round two, item 17: the panel is "opened from a consistent control, the way
 * Ava is both global and page-specific."
 *
 * It lives inside DashboardPageHeader, which every dashboard page already uses
 * — a product rule, and the reason this is one change rather than thirty-seven.
 * A control added page by page would be in a slightly different place on each
 * of them within a month.
 *
 * ── THREE REASONS IT RENDERS NOTHING ───────────────────────────────────────
 *
 *   the flag is off        — the default, until guidanceState exists
 *   the path has no entry  — a page nobody wrote guidance for says nothing
 *                            rather than opening an empty panel
 *   there is no router     — the header is rendered in tests and previews
 *                            outside a Router, where useLocation would throw
 *
 * The third is why the hook is wrapped: taking out every dashboard page in a
 * preview would be a far worse failure than the control not appearing.
 */
function usePathname() {
  try {
    return useLocation().pathname;
  } catch {
    return null;
  }
}

export default function WhatsHereControl() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  if (!isGuidanceEnabled() || !pathname) return null;

  const guidance = guidanceFor(pathname);
  if (!guidance) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="What's here"
        title="What's here"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          // iconMuted — an enabled icon-only control, 3:1 against white.
          color: 'rgba(10,10,10,0.45)',
          display: 'flex',
          alignItems: 'center',
          padding: 4,
        }}
      >
        <HelpCircle size={16} />
      </button>
      {open && (
        <WhatsHerePanel guidance={guidance} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
