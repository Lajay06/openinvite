import React from 'react';
import { useAuth } from '@/lib/AuthContext';
import UltraGate from '@/components/shared/UltraGate';
import { canAccessUltra } from '@/lib/trialStatus';

/**
 * THE GUEST SUITE PLAN GATE, in one place for every route into the builder.
 *
 * /studio/guest-suite gated on canAccessUltra(user) and /website-editor, the
 * same StudioWebsite builder on its own route, gated on nothing, so an
 * account the studio turned away could edit its site by typing the other
 * address. Both routes now render through this: the same expression
 * (src/lib/trialStatus.js, the source of the plan rule; nothing here reads
 * pricing) and the same paywall copy.
 */
export function GuestSuiteUltraGate() {
  return (
    <UltraGate
      heading="Guest Suite is an Ultra feature"
      description="Build your Guest Suite, manage where guests stay, create your experience guide, and share it with your guests, all in one place."
    />
  );
}

export default function GuestSuiteGate({ children }) {
  const { user } = useAuth();
  if (!canAccessUltra(user)) return <GuestSuiteUltraGate />;
  return children;
}
