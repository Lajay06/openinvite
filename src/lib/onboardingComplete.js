/**
 * src/lib/onboardingComplete.js — HAS THIS ACCOUNT FINISHED THE WIZARD?
 *
 * One question, asked in two places that must never disagree: Onboarding.jsx's
 * skip-if-already-done guard and PaymentSuccess.jsx's post-payment routing.
 *
 * ── WHY THIS IS ITS OWN FILE ───────────────────────────────────────────────
 *
 * It used to live in resolveMyWedding.js, which imports the authenticated
 * Base44 client, which cannot be loaded outside a browser. So the one
 * predicate that decides whether a couple is allowed into onboarding had no
 * test that could run. It is pure — two objects in, a boolean out — and now
 * it sits where a guard can reach it.
 *
 * ── WHAT IT USED TO ASK, AND WHY THAT LOCKED COUPLES OUT ───────────────────
 *
 * `user.onboardingCompleted || (draft && !draft.onboardingDraft)`
 *
 * The second clause was meant to read "already owns a real, non-draft wedding",
 * covering accounts created before the flag existed. It could not: BASE44 HAS
 * NO onboardingDraft FIELD. Onboarding.jsx:321 sends it on every step advance
 * and Base44 accepts the write with 200 and discards it — the platform's
 * documented behavior for an unknown field. Probed against the live backend on
 * 2026-09-06: onboardingDraft and onboardingStepIndex both read back undefined
 * after a successful write; activeUniverse, websiteMode and guestType, written
 * in the same call, all persisted.
 *
 * `!draft.onboardingDraft` is therefore `!undefined` — always true. The clause
 * said "a real, non-draft wedding" and meant "a wedding".
 *
 * That was harmless while a record only appeared at the end. It stopped being
 * harmless when write-as-you-go landed: persistDraftStep (Onboarding.jsx:314)
 * CREATES the record on the first step advance. So a couple who types their
 * names, clicks Continue, and then refreshes is redirected out of the wizard
 * at Onboarding.jsx:247 — for good, with a wedding record holding two names,
 * no date, no venue and no universe. Every downstream universe read falls to
 * its default.
 *
 * ── WHAT IT ASKS NOW ───────────────────────────────────────────────────────
 *
 * The address. Not a new marker — one the code already maintains for its own
 * reasons, and maintains in exactly the shape this needs:
 *
 *   - persistDraftStep deletes `slug` from every draft write, on purpose:
 *     "A DRAFT DOES NOT OWN AN ADDRESS" (Onboarding.jsx:326).
 *   - the address is claimed once, at the end, through the server, by
 *     syncWeddingAddress (Onboarding.jsx:452).
 *
 * A record with an address is therefore a record that reached the end. It is
 * the finished-ness signal onboardingDraft was supposed to be, and unlike
 * onboardingDraft it survives the round trip. Legacy accounts predating the
 * User flag keep working: their wedding has an address, because their guests
 * can visit it.
 *
 * If the address claim fails, the comment at Onboarding.jsx:450 says a wedding
 * with no address is still a wedding and the next load derives one. In that
 * case the User flag — written moments later in the same function — carries
 * the answer. Both failing means the final save did not finish, and returning
 * to the wizard is the right outcome rather than a lockout.
 *
 * @param {object|null} user   result of base44.auth.me()
 * @param {object|null} draft  result of getMyWeddingDetails()
 * @returns {boolean}
 */
export function isOnboardingComplete(user, draft) {
  return !!(user?.onboardingCompleted || (draft && draft.slug));
}
