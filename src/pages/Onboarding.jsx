import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { getMyWeddingDetails, isOnboardingComplete } from '@/lib/resolveMyWedding';
import { buildWeddingDetailsPayload, verifyOnboardingSave } from '@/lib/onboardingSave';
import { captureException } from '@/lib/sentry';
import { motion, AnimatePresence } from 'framer-motion';

// TASK 1: entity references via authenticated client (no @/entities/* imports)
const WeddingDetails = base44.entities.WeddingDetails;
const Guest = base44.entities.Guest;
const Budget = base44.entities.Budget;
const Vendor = base44.entities.Vendor;

// Step components
import OnboardingWelcome from '@/components/onboarding/OnboardingWelcome';
import OnboardingStep1Names from '@/components/onboarding/OnboardingStep1Names';
import OnboardingStep2Date from '@/components/onboarding/OnboardingStep2Date';
import OnboardingStep3Location from '@/components/onboarding/OnboardingStep3Location';
import OnboardingStep4GuestCount from '@/components/onboarding/OnboardingStep4GuestCount';
import OnboardingStep5WeddingType from '@/components/onboarding/OnboardingStep5WeddingType';
import OnboardingStep7Ava from '@/components/onboarding/OnboardingStep7Ava';
import OnboardingStepUniverse from '@/components/onboarding/OnboardingStepUniverse';
import OnboardingStep8Fork from '@/components/onboarding/OnboardingStep8Fork';
import OnboardingPathAGuestList from '@/components/onboarding/OnboardingPathAGuestList';
import OnboardingPathABudget from '@/components/onboarding/OnboardingPathABudget';
import OnboardingPathAVendors from '@/components/onboarding/OnboardingPathAVendors';
import OnboardingPathACultural from '@/components/onboarding/OnboardingPathACultural';
import OnboardingPathAInspiration from '@/components/onboarding/OnboardingPathAInspiration';
import OnboardingCompletion from '@/components/onboarding/OnboardingCompletion';
import OnboardingShell from '@/components/onboarding/OnboardingShell';

// TASK 6+7: 'welcome' added as step 0; 'priorities' removed
const STEPS = [
  'welcome',
  'names',
  'date',
  'location',
  'guestCount',
  'weddingType',
  'ava',
  'universe',
  'fork',
  'pathA-guestList',
  'pathA-budget',
  'pathA-vendors',
  'pathA-cultural',
  'pathA-inspiration',
  'completion',
];

const PATH_A_STEPS = [
  'pathA-guestList',
  'pathA-budget',
  'pathA-vendors',
  'pathA-cultural',
  'pathA-inspiration',
];

const LOGO_URL = 'https://static.wixstatic.com/media/d2df22_ed803ca7c6de491a90af0df6d06a8e54~mv2.png';
const PJS = "'Plus Jakarta Sans', sans-serif";

// Core steps counted in the progress indicator (excludes welcome, pathA, and completion)
const CORE_STEPS = ['names', 'date', 'location', 'guestCount', 'weddingType', 'ava', 'universe', 'fork'];

// [5] universe-step-rebuild: Universes (Design Studio / custom wedding
// website) are Ultra-only (planFeatures.js's ULTRA_EXTRAS) — an account
// that has already bought Pro specifically has nothing to pick here. Trial
// accounts (plan: null) get full Ultra access for the 14-day trial and
// haven't foreclosed Ultra yet, and Ultra accounts obviously qualify, so
// both of those still see the step — only 'pro' skips.
//
// Single source of truth for what's visible, so forward-nav, back-nav, the
// resume/mount path, and the progress-bar math can never disagree about it
// — every one of them calls this or nextVisibleIndex() below rather than
// re-deriving "is this a Pro account" separately.
function isStepVisible(step, plan) {
  if (step === 'universe') return plan !== 'pro';
  return true;
}

// Walks from startIndex in `direction` (+1/-1) until landing on a step
// isStepVisible allows for `plan`, then clamps to the array bounds. STEPS
// itself is never reordered or filtered — draft.onboardingStepIndex stays
// a plain absolute STEPS index, so existing drafts need no migration.
function nextVisibleIndex(startIndex, direction, plan) {
  let i = startIndex;
  while (i >= 0 && i < STEPS.length && !isStepVisible(STEPS[i], plan)) {
    i += direction;
  }
  return Math.min(Math.max(i, 0), STEPS.length - 1);
}

// Group A shell redesign — every step except 'universe' and 'fork' adopts
// the split-with-image OnboardingShell. Universe and Fork stay full-bleed:
// Universe's horizontal card rail + full-screen preview Dialog and Fork's
// side-by-side 2-column grid both assume more horizontal room than a
// ~50%-viewport-width split panel leaves, and Universe already has its own
// separate redesign coming (marketing-grid style) — building a split-shell
// treatment for its current layout now would just be thrown away then.
const SHELL_STEPS = new Set([
  'welcome', 'names', 'date', 'location', 'guestCount', 'weddingType', 'ava',
  'pathA-guestList', 'pathA-budget', 'pathA-vendors', 'pathA-cultural', 'pathA-inspiration',
  'completion',
]);
// pathA-cultural's region-grouped culture pills (with their own internal
// scroll box) want a bit more room than the other shell steps' default.
// names' 32px inline-sentence layout ("Hi, my name is ___ and my
// partner's name is ___") was built for its original unconstrained
// maxWidth:700 — the shell's 600px default squeezed its second input
// below its own 200px minWidth, clipping "Partner's name"'s placeholder.
const SHELL_CONTENT_WIDTH = { 'pathA-cultural': 640, 'names': 700 };

export default function Onboarding() {
  const navigate = useNavigate();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [user, setUser] = useState(null);
  const [hydrating, setHydrating] = useState(true);
  // Distinct from saveError (which guards the final-save step) — this
  // guards the initial auth/draft-resolution fetch that must succeed
  // before the wizard can render at all. See checkAuth below.
  const [authCheckError, setAuthCheckError] = useState(false);

  const [onboardingData, setOnboardingData] = useState({
    couple1Name: '',
    couple2Name: '',
    weddingDate: null,
    venue: '',
    location: '',
    guestCount: null,
    weddingStyle: [],
    priorities: [],
    guestList: [],
    budget: null,
    currency: 'USD',
    vendors: [],
    theme: null,
    activeUniverse: 'london',
    websiteMode: 'dark',
  });

  // The draft WeddingDetails record write-as-you-go persistence writes to —
  // null until the first step with real data advances, or hydrated from an
  // existing unfinished draft on mount (resume-after-refresh).
  const [draftWeddingId, setDraftWeddingId] = useState(null);

  // Final-save state: never show the completion screen or navigate to
  // Dashboard on a failed save — show an honest error with retry instead.
  const [saveError, setSaveError] = useState(null);
  const [savingFinal, setSavingFinal] = useState(false);
  const [lastAttemptedPath, setLastAttemptedPath] = useState(null);

  // Serialises draft persistence calls so a slow earlier step's write can
  // never land after and clobber a faster later step's write.
  const draftSaveChain = useRef(Promise.resolve());
  const draftWeddingIdRef = useRef(null);
  useEffect(() => { draftWeddingIdRef.current = draftWeddingId; }, [draftWeddingId]);

  const currentStep = STEPS[currentStepIndex];
  const isShellStep = SHELL_STEPS.has(currentStep);

  // Same isStepVisible a Pro account's nav routes through — "Step X of N"
  // shows N=7 for Pro (no phantom 8th step), N=8 for everyone else.
  const effectiveCoreSteps = CORE_STEPS.filter(step => isStepVisible(step, user?.plan));

  // Progress: 0 on welcome, fills across the core steps, 100 on completion
  const coreIndex = effectiveCoreSteps.indexOf(currentStep); // -1 if not a core step
  const progress = currentStep === 'welcome' ? 0
    : currentStep === 'completion' ? 100
    : coreIndex >= 0 ? ((coreIndex + 1) / effectiveCoreSteps.length) * 100
    : 100; // pathA steps show full bar

  // Step counter: only shown on core steps ("Step 1 of 8")
  const showStepCounter = coreIndex >= 0;
  const stepNum = coreIndex + 1;
  const showBack = currentStepIndex > 0 && currentStep !== 'completion';

  // useCallback (not a plain effect-local function) so the error-state
  // "Try again" button below can re-invoke the exact same check, not just
  // a copy — one code path for both the initial mount and manual retry.
  const checkAuth = useCallback(async () => {
    setAuthCheckError(false);
    setHydrating(true);
    try {
      const currentUser = await base44.auth.me();
      // Resolved once, up front, so both guard checks below (and the
      // resume-after-refresh rehydration further down) share one fetch.
      const draft = await getMyWeddingDetails().catch(() => null);

      // If already onboarded, skip straight to dashboard — isOnboardingComplete
      // also guards on the account already owning a real (non-draft) wedding
      // even when onboardingCompleted is somehow unset. This is the actual
      // fix for the "Alex & Sam" incident: an incomplete onboarding run
      // (often against a preview deployment, which shares the same
      // production Base44 backend as the live site) landing back on
      // this page for an account that already has a finished wedding
      // used to fall through and silently create a second WeddingDetails
      // record for the same account. Never trust onboardingCompleted
      // alone for this — a real, non-draft record is the stronger
      // signal a wedding already exists. Shared with PaymentSuccess.jsx's
      // post-payment routing decision so the two can never disagree.
      if (isOnboardingComplete(currentUser, draft)) {
        navigate('/DailyUpdate', { replace: true });
        return;
      }
      setUser(currentUser);

      // Resume-after-refresh: if an unfinished draft exists for this user,
      // rehydrate onboardingData and jump back to where they left off
      // instead of restarting from welcome.
      if (draft?.onboardingDraft) {
        setDraftWeddingId(draft.id);
        setOnboardingData(prev => ({
          ...prev,
          couple1Name: draft.couple1Name || prev.couple1Name,
          couple2Name: draft.couple2Name || prev.couple2Name,
          weddingDate: draft.weddingDate || prev.weddingDate,
          venue: draft.mainCeremony?.venueName || prev.venue,
          location: draft.mainCeremony?.address || prev.location,
          guestCount: draft.guestCount != null ? draft.guestCount : prev.guestCount,
          guestType: draft.guestType || prev.guestType,
          activeUniverse: draft.activeUniverse || prev.activeUniverse,
          websiteMode: draft.websiteMode || prev.websiteMode,
        }));
        // currentUser (not React state — that hasn't committed yet) is what
        // isStepVisible needs here: correcting resumeIndex before this
        // synchronous block ends means 'universe' never renders even for
        // one frame for a resuming Pro account, no separate effect needed.
        const rawResumeIndex = typeof draft.onboardingStepIndex === 'number'
          ? Math.min(Math.max(draft.onboardingStepIndex, 0), STEPS.length - 1)
          : 0;
        const resumeIndex = nextVisibleIndex(rawResumeIndex, 1, currentUser?.plan);
        setCurrentStepIndex(resumeIndex);
      }
    } catch (err) {
      // Previously: navigate('/') here silently dumped the user to the
      // marketing homepage on ANY failure (network blip, a bad deploy,
      // anything) with zero visibility — the exact bug this replaces
      // (a missing isOnboardingComplete import threw here, unnoticed,
      // for every account until caught manually). Surface it instead:
      // report to Sentry and show a real error state with retry, same
      // pattern as the final-save error banner (saveError) below.
      captureException(err, { context: 'Onboarding.checkAuth' });
      setAuthCheckError(true);
    }
    setHydrating(false);
  }, [navigate]);

  useEffect(() => { checkAuth(); }, [checkAuth]);

  // Write-as-you-go: best-effort, non-blocking persistence of WeddingDetails
  // fields on every step advance, so a refresh mid-onboarding resumes rather
  // than restarts. Chained through a ref so writes always apply in the order
  // steps were taken, never out of order under variable network timing.
  const persistDraftStep = (mergedData, stepIndex) => {
    draftSaveChain.current = draftSaveChain.current
      .then(async () => {
        const payload = { ...buildWeddingDetailsPayload(mergedData), onboardingDraft: true, onboardingStepIndex: stepIndex };
        if (draftWeddingIdRef.current) {
          await WeddingDetails.update(draftWeddingIdRef.current, payload);
        } else {
          const created = await WeddingDetails.create(payload);
          draftWeddingIdRef.current = created.id;
          setDraftWeddingId(created.id);
        }
      })
      .catch(err => {
        // Best-effort — a couple should never be blocked from continuing
        // onboarding because the resume-draft write hiccuped. The final
        // save (saveOnboarding) is the one place failures must be surfaced.
        console.error('Onboarding draft persistence error:', err);
      });
  };

  const goNext = (data) => {
    const merged = { ...onboardingData, ...(data || {}) };
    setOnboardingData(merged);
    const rawNext = Math.min(currentStepIndex + 1, STEPS.length - 1);
    const nextIndex = nextVisibleIndex(rawNext, 1, user?.plan);
    setCurrentStepIndex(nextIndex);
    window.scrollTo(0, 0);
    // Only worth persisting once there's a name to identify the draft by —
    // avoids creating an empty placeholder record from the welcome step.
    if (merged.couple1Name || merged.couple2Name) {
      persistDraftStep(merged, nextIndex);
    }
  };

  const goBack = () => {
    setCurrentStepIndex(prev => nextVisibleIndex(Math.max(prev - 1, 0), -1, user?.plan));
    window.scrollTo(0, 0);
  };

  const goToStep = (stepIndex) => {
    setCurrentStepIndex(nextVisibleIndex(stepIndex, 1, user?.plan));
    window.scrollTo(0, 0);
  };

  const handlePathA = () => {
    goNext({ path: 'detailed' });
  };

  const handlePathB = async () => {
    setLastAttemptedPath('quick');
    const result = await saveOnboarding('quick');
    if (result.success) {
      setSaveError(null);
      goToStep(STEPS.indexOf('completion'));
    } else {
      setSaveError(result.error || 'Something went wrong saving your details.');
    }
  };

  /**
   * Saves everything onboarding collected, in phases so a retry after a
   * partial failure never re-runs (and duplicates) a phase that already
   * succeeded. Returns { success, error } — never throws, never silently
   * swallows a failure into a false "done" state. On success, re-fetches
   * the record fresh to verify it actually round-tripped before reporting
   * success.
   */
  // Two couples with the same or similar names would otherwise collide on
  // the exact same /w/:slug — checks the candidate, and every "-2", "-3", …
  // suffix in turn, against real (non-draft-of-this-record) WeddingDetails
  // records, until one is free.
  const resolveUniqueSlug = async (baseSlug, excludeId) => {
    if (!baseSlug) return baseSlug;
    let candidate = baseSlug;
    let suffix = 1;
    // Bounded — collisions on a second or third attempt are already an edge
    // case; this only loops further if several couples share the same name.
    while (suffix < 50) {
      const matches = await WeddingDetails.filter({ slug: candidate });
      const collision = (matches || []).some(w => w.id !== excludeId);
      if (!collision) return candidate;
      suffix += 1;
      candidate = `${baseSlug}-${suffix}`;
    }
    return `${baseSlug}-${Date.now()}`; // pathological fallback, guaranteed unique
  };

  const saveOnboarding = async (path) => {
    setSavingFinal(true);
    const completed = { weddingDetails: false, guests: false, budget: false, vendors: false, userFlag: false };
    try {
      // Drain every already-enqueued persistDraftStep write before this
      // function's own WeddingDetails write. Without this, the two write
      // paths race: persistDraftStep sets onboardingDraft:true on every step
      // transition (fire-and-forget, chained onto draftSaveChain), this
      // function sets onboardingDraft:false directly and unchained — Base44
      // updates are partial merges, so whichever lands on the server LAST
      // wins. If a still-queued draft write (e.g. from the step transition
      // that landed on 'completion') resolves after this write, the record
      // is left permanently stuck at onboardingDraft:true even though
      // onboardingCompleted is correctly true on the User record —
      // Incident-1-class silent corruption. Awaiting the chain here
      // guarantees nothing is left pending by the time this write fires, so
      // this write is deterministically last.
      await draftSaveChain.current;

      const payload = { ...buildWeddingDetailsPayload(onboardingData), onboardingDraft: false };
      payload.slug = await resolveUniqueSlug(payload.slug, draftWeddingId);

      let weddingId = draftWeddingId;
      if (weddingId) {
        await WeddingDetails.update(weddingId, payload);
      } else {
        const created = await WeddingDetails.create(payload);
        weddingId = created.id;
        setDraftWeddingId(weddingId);
      }
      completed.weddingDetails = true;

      if (onboardingData.guestList.length > 0) {
        await Guest.bulkCreate(onboardingData.guestList);
      }
      completed.guests = true;

      if (onboardingData.budget) {
        await Budget.create({
          category: 'miscellaneous',
          item_name: 'Total Budget',
          budgeted_amount: onboardingData.budget,
        });
      }
      completed.budget = true;

      if (onboardingData.vendors.length > 0) {
        await Promise.all(onboardingData.vendors.map(v =>
          Vendor.create({
            name: v.name,
            category: v.category,
            contact_person: v.contact,
            status: 'researching',
          })
        ));
      }
      completed.vendors = true;

      // Inspiration photos (OnboardingPathAInspiration) create their own
      // MoodboardItem records immediately on upload now, matching
      // Moodboard.jsx's own pattern — no deferred batch-create here anymore.

      // /api/on-signup existed but was never actually called from anywhere
      // in the app (PR B4 email audit) — no user has ever received the
      // welcome email. Guarded by the pre-save onboardingCompleted value
      // (per the endpoint's own doc comment) so a user who was already
      // onboarded when this page loaded never gets a second one.
      const wasAlreadyOnboarded = !!user?.onboardingCompleted;

      await base44.auth.updateMe({ onboardingCompleted: true, onboardingPath: path });
      completed.userFlag = true;

      if (!wasAlreadyOnboarded) {
        const token = localStorage.getItem('base44_access_token') || '';
        fetch('/api/on-signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: user?.email, name: user?.full_name || '', token }),
        }).catch(() => {}); // never blocks onboarding completion on an email failure
      }

      // Verify — re-fetch fresh rather than trusting the write call's own
      // response, and confirm the couple names we just sent actually match
      // what comes back before telling the couple they're done. Retried a
      // few times with a short backoff first: a fresh write not yet visible
      // to a subsequent read is a transient replication-lag race, not a
      // real failure, and re-fetching immediately after write is exactly
      // the shape of request that race shows up in. Only report failure
      // (surfacing the manual "Retry" UI) once every attempt has come back
      // still mismatched.
      const expectedNames = `${onboardingData.couple1Name || ''} & ${onboardingData.couple2Name || ''}`;
      const VERIFY_ATTEMPTS = 3;
      const VERIFY_BACKOFF_MS = 500;
      let verifiedOk = false;
      for (let attempt = 1; attempt <= VERIFY_ATTEMPTS; attempt++) {
        const verified = await getMyWeddingDetails();
        if (verifyOnboardingSave({ weddingId, expectedNames, verified })) {
          verifiedOk = true;
          break;
        }
        if (attempt < VERIFY_ATTEMPTS) {
          await new Promise(resolve => setTimeout(resolve, VERIFY_BACKOFF_MS * attempt));
        }
      }
      if (!verifiedOk) {
        return { success: false, error: "We couldn't confirm your details saved correctly. Please try again." };
      }

      return { success: true };
    } catch (err) {
      console.error('Error saving onboarding:', err, 'completed phases:', completed);
      return { success: false, error: err.message || 'Something went wrong saving your details.' };
    } finally {
      setSavingFinal(false);
    }
  };

  const handleCompletion = async () => {
    if (onboardingData.path !== 'detailed') {
      navigate('/DailyUpdate');
      return;
    }
    setLastAttemptedPath('detailed');
    const result = await saveOnboarding('detailed');
    if (result.success) {
      setSaveError(null);
      navigate('/DailyUpdate');
    } else {
      setSaveError(result.error || 'Something went wrong saving your details.');
    }
  };

  const retrySave = async () => {
    if (!lastAttemptedPath) return;
    setSaveError(null);
    if (lastAttemptedPath === 'quick') {
      await handlePathB();
    } else {
      await handleCompletion();
    }
  };

  if (authCheckError) {
    return (
      <div
        style={{
          minHeight: '100vh', background: '#FFFFFF',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 24, fontFamily: PJS, textAlign: 'center',
        }}
      >
        <div style={{ width: '100%', maxWidth: 420 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0A0A0A', letterSpacing: '-0.02em', margin: '0 0 12px', fontFamily: PJS }}>
            Something went wrong.
          </h1>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: 'rgba(10,10,10,0.6)', margin: '0 0 32px', fontFamily: PJS }}>
            We couldn't load your wedding setup. This is usually temporary — try again, or contact us if it keeps happening.
          </p>
          <button
            onClick={checkAuth}
            style={{
              background: '#0A0A0A', color: '#FFFFFF', border: 'none', borderRadius: 999,
              padding: '14px 40px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: PJS,
            }}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (hydrating) {
    return <div style={{ minHeight: '100vh', background: '#FFFFFF' }} />;
  }

  // Coloured logo: the source PNG's wordmark text is baked in white (built
  // for dark backgrounds — see AuthLayout.jsx's own comment on the same
  // asset), so flattening the whole lockup to black (the old approach here)
  // was the only way to make it legible on white, at the cost of the icon's
  // real color gradient. PublicFooter.jsx already solved this exact problem
  // on its own white background: crop to just the icon (background-position,
  // no filter) to keep its color, real "Openinvite" text alongside it
  // instead of relying on the image's own (white) text. Reused verbatim
  // here, scaled from PublicFooter's 41×48 icon crop down to a 20px-tall
  // mark (20/48 of every dimension).
  const stepChrome = (
    <>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <div
          aria-hidden="true"
          style={{
            width: 17, height: 20, flexShrink: 0,
            backgroundImage: `url(${LOGO_URL})`,
            backgroundSize: '87px 20px',
            backgroundPosition: '0 0',
            backgroundRepeat: 'no-repeat',
          }}
        />
        <span style={{ fontSize: 14, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS, letterSpacing: '-0.01em' }}>
          Openinvite
        </span>
      </div>

      {showStepCounter && (
        <span style={{
          fontSize: 11, fontFamily: PJS,
          color: 'rgba(10,10,10,0.4)',
        }}>
          Step {stepNum} of {effectiveCoreSteps.length}
        </span>
      )}

      {showBack && (
        <button
          onClick={goBack}
          className="border-none cursor-pointer text-[13px] text-left bg-transparent rounded-full px-2 py-1 transition-colors duration-150 hover:bg-black hover:text-white active:bg-neutral-900 text-[rgba(10,10,10,0.4)]"
          style={{ fontFamily: PJS, alignSelf: 'flex-start' }}
        >
          ← Back
        </button>
      )}
    </>
  );

  const stepContent = (
    <>
      {currentStep === 'welcome' && (
        <OnboardingWelcome onNext={goNext} />
      )}
      {currentStep === 'names' && (
        <OnboardingStep1Names onNext={goNext} />
      )}
      {currentStep === 'date' && (
        <OnboardingStep2Date onNext={goNext} data={onboardingData} />
      )}
      {currentStep === 'location' && (
        <OnboardingStep3Location onNext={goNext} data={onboardingData} />
      )}
      {currentStep === 'guestCount' && (
        <OnboardingStep4GuestCount onNext={goNext} data={onboardingData} />
      )}
      {currentStep === 'weddingType' && (
        <OnboardingStep5WeddingType onNext={goNext} data={onboardingData} />
      )}
      {currentStep === 'ava' && (
        <OnboardingStep7Ava onNext={goNext} data={onboardingData} />
      )}
      {currentStep === 'universe' && (
        <OnboardingStepUniverse onNext={goNext} data={onboardingData} />
      )}
      {currentStep === 'fork' && (
        <OnboardingStep8Fork
          onPathA={handlePathA}
          onPathB={handlePathB}
          data={onboardingData}
        />
      )}
      {currentStep === 'pathA-guestList' && (
        <OnboardingPathAGuestList onNext={goNext} data={onboardingData} />
      )}
      {currentStep === 'pathA-budget' && (
        <OnboardingPathABudget onNext={goNext} data={onboardingData} />
      )}
      {currentStep === 'pathA-vendors' && (
        <OnboardingPathAVendors onNext={goNext} data={onboardingData} />
      )}
      {currentStep === 'pathA-cultural' && (
        <OnboardingPathACultural onNext={goNext} data={onboardingData} />
      )}
      {currentStep === 'pathA-inspiration' && (
        <OnboardingPathAInspiration onNext={goNext} data={onboardingData} />
      )}
      {currentStep === 'completion' && (
        <OnboardingCompletion onDone={handleCompletion} data={onboardingData} />
      )}
    </>
  );

  return (
    <div style={{
      minHeight: '100vh',
      background: '#FFFFFF',
      overflow: 'hidden',
    }}>

      {/* TASK 4: Progress bar — fixed top, 2px */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0,
        height: 2, zIndex: 100,
        background: 'rgba(10,10,10,0.08)',
      }}>
        <motion.div
          style={{
            height: '100%',
            background: 'linear-gradient(90deg, #ec4899, #9333ea)',
          }}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>

      {/* Save-error banner — never advance past a failed save, always offer retry */}
      {saveError && (
        <div style={{
          position: 'fixed', top: 8, left: '50%', transform: 'translateX(-50%)', zIndex: 200,
          display: 'flex', alignItems: 'center', gap: 12, maxWidth: '90vw',
          background: '#FFFFFF', border: '1px solid rgba(224,53,83,0.3)',
          padding: '10px 16px', borderRadius: 999, boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
        }}>
          <span style={{ fontSize: 13, color: '#E03553', fontFamily: PJS, fontWeight: 600 }}>
            {saveError}
          </span>
          <button
            onClick={retrySave}
            disabled={savingFinal}
            style={{
              fontSize: 12, fontWeight: 700, color: '#FFFFFF', background: '#E03553',
              border: 'none', borderRadius: 999, padding: '6px 14px', cursor: 'pointer',
              fontFamily: PJS, flexShrink: 0, opacity: savingFinal ? 0.6 : 1,
            }}
          >
            {savingFinal ? 'Retrying…' : 'Retry'}
          </button>
        </div>
      )}

      {/* TASK 3+4+5: logo, step counter, back. Full-bleed steps (Universe/
          Fork) keep this as a page-fixed top-left overlay, unchanged.
          Shell steps render the same block inline at the top of
          OnboardingShell's own panel instead (see below) — position:fixed
          at left:24 would land on top of the shell's left-hand image panel
          on desktop, so it can't be reused as-is there. */}
      {!isShellStep && (
        <div style={{
          position: 'fixed', top: 20, left: 24, zIndex: 50,
          display: 'flex', flexDirection: 'column', gap: 6,
        }}>
          {stepChrome}
        </div>
      )}

      {/* Steps container */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          style={isShellStep ? { height: '100vh' } : {
            minHeight: '100vh',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '80px 24px',
          }}
        >
          {isShellStep ? (
            <OnboardingShell contentMaxWidth={SHELL_CONTENT_WIDTH[currentStep] || 600}>
              <div style={{ marginBottom: 32, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {stepChrome}
              </div>
              {stepContent}
            </OnboardingShell>
          ) : stepContent}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
