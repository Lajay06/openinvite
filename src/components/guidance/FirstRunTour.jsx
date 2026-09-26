import React, { useEffect, useState } from 'react';
import { isGuidanceEnabled } from '@/lib/guidanceFlag';
import { hasSeenTour } from '@/lib/guidanceState';
import { useGuidanceState } from '@/hooks/useGuidanceState';
import QuickTipsTour from './QuickTipsTour';

/**
 * THE TOUR, SHOWN ONCE, AND THE THING THAT DECIDES "ONCE".
 *
 * Round two item 17 built QuickTipsTour and mounted it nowhere, because
 * "shown once after onboarding completes" was not keepable without somewhere
 * to record that it had been. WeddingDetails.guidanceState.tourSeenAt exists
 * now, so this is the mount.
 *
 * ── FOUR CONDITIONS, ALL OF THEM NECESSARY ─────────────────────────────────
 *
 *   the flag is on      — 'off' in this browser turns the system off entirely
 *   the record loaded   — no id, no memory; showing a once-only tour that
 *                         cannot be recorded is showing it every time
 *   tourSeenAt is null  — the whole point
 *   onboarding is done  — "after onboarding completes". A couple still in the
 *                         wizard is being walked through the product already.
 *
 * ── IT WRITES BEFORE IT CLOSES, AND ON BOTH EXITS ──────────────────────────
 *
 * Done and Skip both count as seen. A tour a couple skipped and then met again
 * on the next load is worse than one they never saw, because the second time
 * they know it is not listening. QuickTipsTour calls onFinish for both.
 *
 * ── WHY A SEPARATE COMPONENT ───────────────────────────────────────────────
 *
 * Layout.jsx is the shell every page renders inside. Putting the four
 * conditions and a hook in it would put guidance's load on every page's
 * critical path; here it is one mount that renders null until it has reason
 * not to.
 */
export default function FirstRunTour({ onboardingComplete }) {
  const { ready, state, markTourSeen } = useGuidanceState();
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

  return (
    <QuickTipsTour
      onFinish={markTourSeen}
      onClose={() => { markTourSeen(); setDismissedThisSession(true); }}
    />
  );
}
