import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { HelpCircle } from 'lucide-react';
import { isGuidanceEnabled } from '@/lib/guidanceFlag';
import { useGuidanceState } from '@/hooks/useGuidanceState';
import { chapterKeyForRoute, chapterProgressKey } from '@/lib/studioTour';
import WhatsHerePanel from './WhatsHerePanel';
import { useTourContext } from './TourContext';

/**
 * THE ONE CONTROL, IN THE ONE PLACE, AND NOW IT OPENS THE TOUR.
 *
 * It lives inside DashboardPageHeader, which every dashboard page already uses,
 * a product rule and the reason this is one change rather than thirty-seven.
 *
 * ── TWO REASONS IT RENDERS NOTHING, DOWN FROM FOUR ─────────────────────────
 *
 *   the flag is off        an off switch for the whole guidance system
 *   there is no router     the header renders in tests and previews outside a
 *                          Router, where useLocation would throw
 *
 * THE OTHER TWO ARE GONE, AND DELIBERATELY:
 *
 *   "the path has no entry" was right when the panel read per-page guidance and
 *   a page nobody had written would have opened empty. Every page maps to a
 *   chapter now, with the welcome chapter as the fallback, so there is always
 *   something to open.
 *
 *   "the couple dismissed it" has to go, because chapter 8 of the tour is
 *   titled "The question mark is always there." and its lead reads "Every page
 *   has one." A control that hides itself after a dismissal would make the
 *   tour's own copy false on the pages where it had been hidden. The dismissed
 *   list is untouched and its path entries are simply no longer read here;
 *   tour progress uses "tour:" prefixed keys, so nothing collides.
 */
function usePathname() {
  try {
    return useLocation().pathname;
  } catch {
    return null;
  }
}

export default function WhatsHereControl({ tourContext = null }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  // The hook runs unconditionally, React requires that, and its own guards mean
  // it writes nothing until the record has loaded.
  const { ready, state, dismiss } = useGuidanceState();
  // MERGED, NOT REPLACED. The shell knows the names, the page knows its
  // numbers, and passing only one of them showed a personalized lead beside a
  // nameless welcome.
  // onOpenAva TRAVELS IN THE CONTEXT, not in an import. See StudioTour's note:
  // importing the opener here would put it in every page's import graph through
  // DashboardPageHeader. It is separated from the personalisation values so
  // resolveChapter is never handed a function.
  const { onOpenAva, ...context } = useTourContext(tourContext);

  if (!isGuidanceEnabled() || !pathname) return null;

  const startChapterKey = chapterKeyForRoute(pathname);
  const dismissed = state?.dismissed || [];
  // Chapter progress is recorded the same way a panel dismissal was, behind a
  // prefix, so no schema field was added for the tour.
  const onChapterComplete = ready
    ? (key) => { if (!dismissed.includes(chapterProgressKey(key))) dismiss(chapterProgressKey(key)); }
    : undefined;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Studio tour for this page"
        title="What's here"
        data-tour-target="whats-here-control"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          // iconMuted, an enabled icon-only control, 3:1 against white.
          color: 'rgba(10,10,10,0.45)',
          display: 'flex',
          alignItems: 'center',
          padding: 4,
        }}
      >
        <HelpCircle size={16} />
      </button>
      {open && (
        <WhatsHerePanel
          startChapterKey={startChapterKey}
          context={context}
          dismissed={dismissed}
          onClose={() => setOpen(false)}
          onChapterComplete={onChapterComplete}
          onOpenAva={onOpenAva}
        />
      )}
    </>
  );
}
