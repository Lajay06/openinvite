/**
 * src/lib/onboardingSave.js
 *
 * Pure logic shared by Onboarding.jsx's write-as-you-go draft persistence
 * and its final saveOnboarding — extracted to a plain .js module (no JSX)
 * so it's importable both from the React page and directly from
 * scripts/test-persistence.mjs under plain Node.
 */

/**
 * Maps onboardingData's in-memory shape to the WeddingDetails fields it
 * persists to. Shared by the incremental write-as-you-go draft save (every
 * step advance) and the final saveOnboarding — one place owns this mapping
 * so the two can never drift apart.
 */
export function buildWeddingDetailsPayload(data) {
  return {
    coupleNames: `${data.couple1Name || ''} & ${data.couple2Name || ''}`,
    couple1Name: data.couple1Name,
    couple2Name: data.couple2Name,
    weddingDate: data.weddingDate,
    slug: data.couple1Name?.toLowerCase().replace(/\s+/g, '-') + '-' +
          data.couple2Name?.toLowerCase().replace(/\s+/g, '-'),
    mainCeremony: {
      venueName: typeof data.venue === 'object' ? data.venue?.name : data.venue,
      address: typeof data.venue === 'object' ? data.venue?.address : data.location,
    },
    // guestCount written as string to match EventDetails.jsx (e.target.value from a number input)
    // guestType uses lowercase tile ids matching the enum: 'intimate' | 'celebration' | 'grand'
    guestCount: data.guestCount != null ? String(data.guestCount) : undefined,
    guestType:  data.guestType  || undefined,
    activeUniverse: data.activeUniverse || 'london',
    websiteMode: data.websiteMode || 'dark',
    activeTheme: (data.websiteMode || 'dark') === 'light' ? 'ivory' : 'still',
    // culturalNotes (OnboardingPathACultural's free-text "any cultural or
    // religious traditions?" question) had no home in the payload before —
    // silently discarded on save. Event Details' ThemeSection.jsx uses the
    // structured theme.culture[]/theme.cultureOther fields instead, which is
    // what buildWeddingContext() (src/lib/avaContext.js) reads for Ava's
    // prompts — routing it there means an onboarding-only couple's answer
    // still reaches Ava instead of vanishing.
    ...(data.culturalNotes ? { theme: { cultureOther: data.culturalNotes } } : {}),
  };
}

/**
 * The exact predicate saveOnboarding uses to decide success vs failure after
 * re-fetching the record fresh. Exported so the "a mismatch is correctly
 * treated as failure, not silently as success" behavior is directly
 * testable without needing to trigger a real Base44 write failure.
 */
export function verifyOnboardingSave({ weddingId, expectedNames, verified }) {
  return !!verified && verified.id === weddingId && verified.coupleNames === expectedNames;
}
