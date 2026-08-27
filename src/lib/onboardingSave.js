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
    // NO slug. This built one by lowercasing and collapsing whitespace and
    // nothing else — no accent stripping, no punctuation handling, no reserved
    // check, no collision check. "O'Brien & Zoe" became o'brien-zoe, and an
    // apostrophe went into a live URL. It had been doing that since the
    // beginning. The address is derived once, after the record exists, by
    // src/lib/weddingAddress.js.
    mainCeremony: {
      venueName: typeof data.venue === 'object' ? data.venue?.name : data.venue,
      address: typeof data.venue === 'object' ? data.venue?.address : data.location,
    },
    // guestCount written as string to match EventDetails.jsx (e.target.value from a number input)
    // guestType uses lowercase tile ids matching the enum: 'intimate' | 'celebration' | 'grand'
    guestCount: data.guestCount != null ? String(data.guestCount) : undefined,
    guestType:  data.guestType  || undefined,
    // weddingStyle (OnboardingStep5WeddingType's style+ceremony+vibe pills,
    // merged into one flat tag array) is an existing WeddingDetails schema
    // field with real downstream consumers — Considerations.jsx's
    // buildProfile(), EventDetails.jsx's ThemeSection migration
    // (_STYLE_TO_AESTHETIC/_STYLE_TO_FAITH/_STYLE_TO_ATMOSPHERE), the guest
    // website's WeddingStylePage.jsx, and AvaStudioWebsite.jsx's love-story
    // prompt — but the field was never included in this payload, so every
    // onboarding answer to "tell us about your celebration" was collected
    // and then silently discarded on save.
    weddingStyle: data.weddingStyle || [],
    activeUniverse: data.activeUniverse || 'london',
    websiteMode: data.websiteMode || 'dark',
    activeTheme: (data.websiteMode || 'dark') === 'light' ? 'ivory' : 'still',
    // OnboardingPathACultural now presents the same FAITH_OPTIONS/
    // CULTURE_REGIONS/CULTURE_CROSS_CUTTING pills as Event Details'
    // ThemeSection.jsx (src/lib/weddingThemeOptions.js), writing directly to
    // the structured theme.faith/theme.faithSecondary/theme.culture[]/
    // theme.cultureOther fields ThemeSection.jsx itself reads — which is
    // also what buildWeddingContext() (src/lib/avaContext.js) reads for
    // Ava's prompts. Previously this only ever wrote a free-text
    // theme.cultureOther from a bare textarea, discarding faith entirely.
    ...(data.theme ? { theme: data.theme } : {}),
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
