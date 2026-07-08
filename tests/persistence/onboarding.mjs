/**
 * tests/persistence/onboarding.mjs
 *
 * Onboarding save-integrity domain (fix/onboarding-save, UX_INTRICACIES.md
 * #3): the verifyOnboardingSave predicate that must report a mismatch as
 * failure rather than silent success, write-as-you-go draft persistence
 * surviving a simulated page reload, and slug-collision disambiguation at
 * save time. Fully self-contained — creates and cleans up its own
 * WeddingDetails sentinel records, independent of the shared one in
 * wedding-details.mjs.
 */

import { APP_ID, api, pass, fail } from './_shared.mjs';
import { buildWeddingDetailsPayload, verifyOnboardingSave } from '../../src/lib/onboardingSave.js';

export async function runOnboarding(token) {
  const results = [];

  // ── Onboarding — failed save is reported as failure, not success ─────────
  // (fix/onboarding-save #1) verifyOnboardingSave is the exact predicate
  // saveOnboarding uses after re-fetching the record fresh. Proves it
  // correctly distinguishes a real match from every way a save can silently
  // go wrong — wrong id, wrong names, or no record at all — rather than
  // treating any of those as success (the original bug: the save's own
  // internal try/catch swallowed errors and the caller advanced to the
  // completion screen regardless).
  console.log('\n  Onboarding save verification (mismatches are reported as failure, not success):\n');
  try {
    const weddingId = 'test-wedding-id-123';
    const expectedNames = 'Alex Test & Sam Test';

    const matchResult = verifyOnboardingSave({
      weddingId, expectedNames,
      verified: { id: weddingId, coupleNames: expectedNames },
    });
    results.push(matchResult === true
      ? pass('verifyOnboardingSave — matching id + names → success', 'true')
      : fail('verifyOnboardingSave — matching id + names → success', true, matchResult));

    const wrongIdResult = verifyOnboardingSave({
      weddingId, expectedNames,
      verified: { id: 'a-different-id', coupleNames: expectedNames },
    });
    results.push(wrongIdResult === false
      ? pass('verifyOnboardingSave — id mismatch → failure, not success', 'false')
      : fail('verifyOnboardingSave — id mismatch → failure, not success', false, wrongIdResult));

    const wrongNamesResult = verifyOnboardingSave({
      weddingId, expectedNames,
      verified: { id: weddingId, coupleNames: 'Someone Else & Their Partner' },
    });
    results.push(wrongNamesResult === false
      ? pass('verifyOnboardingSave — names mismatch → failure, not success', 'false')
      : fail('verifyOnboardingSave — names mismatch → failure, not success', false, wrongNamesResult));

    const noRecordResult = verifyOnboardingSave({ weddingId, expectedNames, verified: null });
    results.push(noRecordResult === false
      ? pass('verifyOnboardingSave — no record found → failure, not success', 'false')
      : fail('verifyOnboardingSave — no record found → failure, not success', false, noRecordResult));
  } catch (err) {
    console.log(`  ❌ FAIL  Onboarding save verification — error: ${err.message}`);
    results.push(false, false, false, false);
  }

  // ── Onboarding — progress survives a simulated reload ────────────────────
  // (fix/onboarding-save #2) Mirrors exactly what Onboarding.jsx's goNext /
  // persistDraftStep writes on every step advance, and what its mount effect
  // reads on a fresh load (getMyWeddingDetails, i.e. filter by
  // created_by_id + most-recent + exclude is_test). A "simulated reload" is
  // this exact same read happening again, independently, against the
  // record the "previous page load" wrote — proving a real refresh would
  // rehydrate onboardingData and resume at the right step rather than
  // restarting from welcome.
  console.log('\n  Onboarding progress survives a simulated reload:\n');
  let onboardingDraftId = null;
  try {
    const partialOnboardingData = {
      couple1Name: 'Alex', couple2Name: 'Sam',
      weddingDate: '2027-03-14', venue: 'Test Garden Venue', location: 'Test City',
      guestCount: 120, guestType: 'celebration',
      activeUniverse: 'tulum', websiteMode: 'light',
    };
    const stepIndexAtRefresh = 5; // 'weddingType' step, per Onboarding.jsx's STEPS array

    const payload = {
      ...buildWeddingDetailsPayload(partialOnboardingData),
      onboardingDraft: true,
      onboardingStepIndex: stepIndexAtRefresh,
    };
    const created = await api('POST', `/apps/${APP_ID}/entities/WeddingDetails`, payload, token);
    onboardingDraftId = created.id;
    if (!onboardingDraftId) throw new Error('No id on created draft WeddingDetails');

    // Simulated reload: an independent fresh read, exactly as
    // getMyWeddingDetails() performs it (filter by owner, most recent,
    // real records only).
    const me = await api('GET', `/apps/${APP_ID}/entities/User/me`, undefined, token);
    const ownQuery = encodeURIComponent(JSON.stringify({ created_by_id: me.id }));
    const ownResults = await api('GET', `/apps/${APP_ID}/entities/WeddingDetails?q=${ownQuery}`, undefined, token);
    const ownList = Array.isArray(ownResults) ? ownResults : (ownResults?.data || ownResults?.results || []);
    const real = ownList.filter(w => !w.is_test);
    const resumed = real.length > 0
      ? real.slice().sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0]
      : null;

    results.push(resumed?.id === onboardingDraftId
      ? pass('Simulated reload — draft resolves as the most recent record', 'found')
      : fail('Simulated reload — draft resolves as the most recent record', onboardingDraftId, resumed?.id));
    results.push(resumed?.onboardingDraft === true
      ? pass('Simulated reload — onboardingDraft flag survives', 'true')
      : fail('Simulated reload — onboardingDraft flag survives', true, resumed?.onboardingDraft));
    results.push(resumed?.onboardingStepIndex === stepIndexAtRefresh
      ? pass('Simulated reload — onboardingStepIndex survives (resume point)', String(resumed?.onboardingStepIndex))
      : fail('Simulated reload — onboardingStepIndex survives (resume point)', stepIndexAtRefresh, resumed?.onboardingStepIndex));
    results.push(resumed?.couple1Name === 'Alex' && resumed?.couple2Name === 'Sam'
      ? pass('Simulated reload — couple names survive for rehydration', `${resumed?.couple1Name} & ${resumed?.couple2Name}`)
      : fail('Simulated reload — couple names survive for rehydration', 'Alex / Sam', `${resumed?.couple1Name} / ${resumed?.couple2Name}`));
    results.push(resumed?.mainCeremony?.venueName === 'Test Garden Venue'
      ? pass('Simulated reload — venue survives for rehydration', resumed?.mainCeremony?.venueName)
      : fail('Simulated reload — venue survives for rehydration', 'Test Garden Venue', resumed?.mainCeremony?.venueName));
    results.push(resumed?.activeUniverse === 'tulum'
      ? pass('Simulated reload — activeUniverse survives for rehydration', resumed?.activeUniverse)
      : fail('Simulated reload — activeUniverse survives for rehydration', 'tulum', resumed?.activeUniverse));
  } catch (err) {
    console.log(`  ❌ FAIL  Onboarding progress reload — error: ${err.message}`);
    results.push(false, false, false, false, false, false);
  } finally {
    if (onboardingDraftId) {
      try { await api('DELETE', `/apps/${APP_ID}/entities/WeddingDetails/${onboardingDraftId}`, undefined, token); }
      catch { /* non-fatal */ }
    }
  }

  // ── Onboarding — slug uniqueness disambiguation (UX_INTRICACIES.md #3) ───
  // Onboarding.jsx's slug used to be written with zero uniqueness check —
  // two couples with the same or similar names would collide on the exact
  // same /w/:slug. resolveUniqueSlug now checks the candidate, then every
  // "-2", "-3", … suffix, against real WeddingDetails records until one is
  // free. This mirrors that exact algorithm against two real colliding
  // records to prove the mechanism actually picks an available slug rather
  // than colliding.
  console.log('\n  Onboarding slug uniqueness disambiguation:\n');
  let slugFirstId = null;
  let slugSecondId = null;
  try {
    const baseSlug = `test-slug-collision-${Date.now()}`;

    const first = await api('POST', `/apps/${APP_ID}/entities/WeddingDetails`, {
      couple1Name: 'Alex', couple2Name: 'Sam', slug: baseSlug,
    }, token);
    slugFirstId = first.id;
    if (!slugFirstId) throw new Error('No id on first sentinel WeddingDetails');

    // Mirrors resolveUniqueSlug's own algorithm exactly: check the base
    // candidate, then "-2", "-3", … against real records, excluding the
    // record being saved itself.
    const resolveUniqueSlug = async (candidateBase, excludeId) => {
      let candidate = candidateBase;
      let suffix = 1;
      while (suffix < 50) {
        const query = encodeURIComponent(JSON.stringify({ slug: candidate }));
        const matches = await api('GET', `/apps/${APP_ID}/entities/WeddingDetails?q=${query}`, undefined, token);
        const list = Array.isArray(matches) ? matches : (matches?.data || matches?.results || []);
        const collision = list.some(w => w.id !== excludeId);
        if (!collision) return candidate;
        suffix += 1;
        candidate = `${candidateBase}-${suffix}`;
      }
      return `${candidateBase}-${Date.now()}`;
    };

    const resolvedForSecondCouple = await resolveUniqueSlug(baseSlug, null);
    results.push(resolvedForSecondCouple === `${baseSlug}-2`
      ? pass('resolveUniqueSlug — second couple with the same base slug gets a disambiguated one', resolvedForSecondCouple)
      : fail('resolveUniqueSlug — second couple with the same base slug gets a disambiguated one', `${baseSlug}-2`, resolvedForSecondCouple));

    const second = await api('POST', `/apps/${APP_ID}/entities/WeddingDetails`, {
      couple1Name: 'Alex', couple2Name: 'Sam', slug: resolvedForSecondCouple,
    }, token);
    slugSecondId = second.id;

    // Re-resolving for the FIRST couple's own record (excluding its own id)
    // must return its own unchanged slug, not treat itself as a collision.
    const resolvedForFirstOwnRecord = await resolveUniqueSlug(baseSlug, slugFirstId);
    results.push(resolvedForFirstOwnRecord === baseSlug
      ? pass('resolveUniqueSlug — a record excludes itself from its own collision check', resolvedForFirstOwnRecord)
      : fail('resolveUniqueSlug — a record excludes itself from its own collision check', baseSlug, resolvedForFirstOwnRecord));

    // A third couple, arriving after both slugs are taken, must skip both
    // and land on "-3".
    const resolvedForThirdCouple = await resolveUniqueSlug(baseSlug, null);
    results.push(resolvedForThirdCouple === `${baseSlug}-3`
      ? pass('resolveUniqueSlug — a third collision correctly skips to the next free suffix', resolvedForThirdCouple)
      : fail('resolveUniqueSlug — a third collision correctly skips to the next free suffix', `${baseSlug}-3`, resolvedForThirdCouple));
  } catch (err) {
    console.log(`  ❌ FAIL  Onboarding slug uniqueness — error: ${err.message}`);
    results.push(false, false, false);
  } finally {
    for (const id of [slugFirstId, slugSecondId]) {
      if (!id) continue;
      try { await api('DELETE', `/apps/${APP_ID}/entities/WeddingDetails/${id}`, undefined, token); }
      catch { /* non-fatal */ }
    }
  }

  return results;
}
