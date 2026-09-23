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
/**
 * The ceremony venue as onboarding knows it.
 *
 * A picked Places result is an object with all five fields. A typed answer is
 * a bare string with the city in `data.location` beside it and no place to
 * fetch a photo from — null for the three, not undefined, so a couple who
 * re-answers with a typed venue clears a photo of the venue they left rather
 * than keeping it under a new name.
 */
export function buildCeremonyVenue(data) {
  const v = data?.venue;
  // NOTHING ANSWERED YET, SO NOTHING WRITTEN. This payload is also the
  // write-as-you-go draft, sent on every step advance including the ones
  // before the venue is asked for. Returning a filled-out object of blanks
  // there would send empty strings and nulls over a venue the couple already
  // has — undefined drops the key from the request body instead.
  if (!v && !data?.location) return undefined;
  if (v && typeof v === 'object') {
    return {
      venueName: v.name || '',
      address: v.address || '',
      placeId: v.placeId || null,
      mapsUrl: v.mapsUrl || null,
      photoUrl: v.photoUrl || null,
    };
  }
  return {
    venueName: v || '',
    address: data?.location || '',
    placeId: null,
    mapsUrl: null,
    photoUrl: null,
  };
}

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
    // THE WHOLE VENUE, NOT TWO OF ITS FIVE FIELDS. OnboardingStep3Location
    // uses the same VenueSearchPanel the Event details form does, so
    // `data.venue` arrives as { name, address, placeId, mapsUrl, photoUrl }.
    // This wrote venueName and address and dropped the other three on the
    // floor — every couple's ceremony venue lost its Google Places photo, its
    // maps link and the place id that could have fetched either back, at the
    // one moment the ceremony venue is ever set. The reception venue is only
    // ever set from the Event details form, which keeps all five, which is
    // exactly why Reception showed a picture and Ceremony never did.
    //
    // The photo is not only the event card's. mainCeremony.photoUrl is the
    // invitation email's venue banner (SendInvitesModal, EmailTemplates) and
    // the Universe studio's venue image, so this dropped three features at
    // once and none of them could report it — an absent photo looks like a
    // couple who did not pick one.
    mainCeremony: buildCeremonyVenue(data),
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
