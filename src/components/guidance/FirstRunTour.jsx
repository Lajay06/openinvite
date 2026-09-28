import React, { useEffect, useState } from 'react';
import { isGuidanceEnabled } from '@/lib/guidanceFlag';
import { hasSeenTour } from '@/lib/guidanceState';
import { useGuidanceState } from '@/hooks/useGuidanceState';
import { chapterProgressKey } from '@/lib/studioTour';
import StudioTour from './StudioTour';

/**
 * THE TOUR, SHOWN ONCE, AND THE THING THAT DECIDES "ONCE".
 *
 * ── THREE CONDITIONS, AND WHAT EACH ONE DECIDES ────────────────────────────
 *
 * Owner ruling, 2026-09-28: "First-run takeover is decided by
 * guidanceState.tourSeenAt only. A couple with tourSeenAt set never sees it
 * again, even if the tour has new chapters later." THAT RULING GOVERNS
 * RE-SHOW: nothing but tourSeenAt may ever bring this back, and in particular
 * no count of completed chapters may, so adding a tenth chapter later does not
 * reopen the takeover for a couple who has finished the nine.
 *
 * The other two conditions decide WHEN IT FIRST APPEARS, never whether it
 * returns:
 *
 *   the flag is on      'off' in this browser turns the guidance system off
 *                       entirely, and removing that would remove the escape
 *                       hatch for every surface that uses it
 *   onboarding is done  a couple still inside the wizard is being walked
 *                       through the product already
 *
 * ── IT WRITES BEFORE IT CLOSES, AND ON BOTH EXITS ──────────────────────────
 *
 * Owner ruling: "The 'Later' button writes tourSeenAt the same as finishing
 * does. No nagging, no 'remind me'." That was already this file's behavior and
 * its reasoning, kept: a tour a couple skipped and then met again on the next
 * load is worse than one they never saw, because the second time they know it
 * is not listening.
 */
export default function FirstRunTour({ onboardingComplete, context = {} }) {
  const { ready, state, markTourSeen, dismiss } = useGuidanceState();
  const [dismissedThisSession, setDismissedThisSession] = useState(false);

  // WRITE ONCE, EVEN IF THE COUPLE NAVIGATES MID-TOUR. Without this, closing
  // the tour by changing page would leave tourSeenAt null and bring it back.
  const [opened, setOpened] = useState(false);
  useEffect(() => {
    if (ready && !hasSeenTour(state) && onboardingComplete) setOpened(true);
  }, [ready, state, onboardingComplete]);

  if (!isGuidanceEnabled()) return null;
  if (!ready || !onboardingComplete) return null;
  if (hasSeenTour(state) || dismissedThisSession || !opened) return null;

  const dismissedKeys = state?.dismissed || [];

  return (
    <StudioTour
      mode="takeover"
      context={context}
      dismissed={dismissedKeys}
      onChapterComplete={(key) => {
        if (!dismissedKeys.includes(chapterProgressKey(key))) dismiss(chapterProgressKey(key));
      }}
      onFinish={markTourSeen}
      onClose={() => { markTourSeen(); setDismissedThisSession(true); }}
    />
  );
}
