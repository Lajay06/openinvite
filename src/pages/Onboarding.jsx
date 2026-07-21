import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { getMyWeddingDetails } from '@/lib/resolveMyWedding';
import { buildWeddingDetailsPayload, verifyOnboardingSave } from '@/lib/onboardingSave';
import { motion, AnimatePresence } from 'framer-motion';

// TASK 1: entity references via authenticated client (no @/entities/* imports)
const WeddingDetails = base44.entities.WeddingDetails;
const Guest = base44.entities.Guest;
const Budget = base44.entities.Budget;
const Vendor = base44.entities.Vendor;
const MoodboardItem = base44.entities.MoodboardItem;

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
const DISPLAY_STEP_COUNT = CORE_STEPS.length; // 8

export default function Onboarding() {
  const navigate = useNavigate();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [user, setUser] = useState(null);
  // TASK 2: theme state
  const [theme, setTheme] = useState('dark');
  const [hydrating, setHydrating] = useState(true);

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
    currency: 'AUD',
    vendors: [],
    culturalNotes: '',
    inspirationPhotos: [],
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
  const isDark = theme !== 'light';

  // Progress: 0 on welcome, fills across the 8 core steps, 100 on completion
  const coreIndex = CORE_STEPS.indexOf(currentStep); // -1 if not a core step
  const progress = currentStep === 'welcome' ? 0
    : currentStep === 'completion' ? 100
    : coreIndex >= 0 ? ((coreIndex + 1) / DISPLAY_STEP_COUNT) * 100
    : 100; // pathA steps show full bar

  // Step counter: only shown on core steps ("Step 1 of 8")
  const showStepCounter = coreIndex >= 0;
  const stepNum = coreIndex + 1;
  const showBack = currentStepIndex > 0 && currentStep !== 'completion';

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await base44.auth.me();
        // Resolved once, up front, so both guard checks below (and the
        // resume-after-refresh rehydration further down) share one fetch.
        const draft = await getMyWeddingDetails().catch(() => null);

        // If already onboarded, skip straight to dashboard. Also guard on
        // the account already owning a real (non-draft) wedding even when
        // onboardingCompleted is somehow unset — this is the actual fix
        // for the "Alex & Sam" incident: an incomplete onboarding run
        // (often against a preview deployment, which shares the same
        // production Base44 backend as the live site) landing back on
        // this page for an account that already has a finished wedding
        // used to fall through and silently create a second WeddingDetails
        // record for the same account. Never trust onboardingCompleted
        // alone for this — a real, non-draft record is the stronger
        // signal a wedding already exists.
        if (currentUser?.onboardingCompleted || (draft && !draft.onboardingDraft)) {
          navigate('/Dashboard', { replace: true });
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
          const resumeIndex = typeof draft.onboardingStepIndex === 'number'
            ? Math.min(Math.max(draft.onboardingStepIndex, 0), STEPS.length - 1)
            : 0;
          setCurrentStepIndex(resumeIndex);
        }
      } catch (err) {
        navigate('/');
      }
      setHydrating(false);
    };
    checkAuth();
  }, [navigate]);

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
    const nextIndex = Math.min(currentStepIndex + 1, STEPS.length - 1);
    setCurrentStepIndex(nextIndex);
    window.scrollTo(0, 0);
    // Only worth persisting once there's a name to identify the draft by —
    // avoids creating an empty placeholder record from the welcome step.
    if (merged.couple1Name || merged.couple2Name) {
      persistDraftStep(merged, nextIndex);
    }
  };

  const goBack = () => {
    setCurrentStepIndex(prev => Math.max(prev - 1, 0));
    window.scrollTo(0, 0);
  };

  const goToStep = (stepIndex) => {
    setCurrentStepIndex(stepIndex);
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
    const completed = { weddingDetails: false, guests: false, budget: false, vendors: false, moodboard: false, userFlag: false };
    try {
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

      if (onboardingData.inspirationPhotos.length > 0) {
        await Promise.all(onboardingData.inspirationPhotos.map(photo =>
          MoodboardItem.create({
            title: 'Inspiration',
            image_url: photo,
            category: 'other',
          })
        ));
      }
      completed.moodboard = true;

      await base44.auth.updateMe({ onboardingCompleted: true, onboardingPath: path });
      completed.userFlag = true;

      // Verify — re-fetch fresh rather than trusting the write call's own
      // response, and confirm the couple names we just sent actually match
      // what comes back before telling the couple they're done.
      const verified = await getMyWeddingDetails();
      const expectedNames = `${onboardingData.couple1Name || ''} & ${onboardingData.couple2Name || ''}`;
      if (!verifyOnboardingSave({ weddingId, expectedNames, verified })) {
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
      navigate('/Dashboard');
      return;
    }
    setLastAttemptedPath('detailed');
    const result = await saveOnboarding('detailed');
    if (result.success) {
      setSaveError(null);
      navigate('/Dashboard');
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

  const stepProps = { theme };

  // Fork step always renders on a light background
  const isForkStep = currentStep === 'fork';
  const pageBg = isForkStep ? '#F5F4F0' : (isDark ? '#0A0A0A' : '#FAFAFA');
  const pageIsLight = isForkStep || !isDark;

  if (hydrating) {
    return <div style={{ minHeight: '100vh', background: '#0A0A0A' }} />;
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: pageBg,
      overflow: 'hidden',
      transition: 'background 0.3s ease',
    }}>

      {/* TASK 4: Progress bar — fixed top, 2px */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0,
        height: 2, zIndex: 100,
        background: pageIsLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)',
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

      {/* TASK 3+4+5: Top-left fixed column — logo, step counter, back */}
      <div style={{
        position: 'fixed', top: 20, left: 24, zIndex: 50,
        display: 'flex', flexDirection: 'column', gap: 6,
      }}>
        {/* Logo */}
        <img
          src={LOGO_URL}
          alt="openinvite"
          style={{
            height: 20, width: 'auto', display: 'block',
            filter: pageIsLight ? 'brightness(0)' : 'brightness(0) invert(1)',
          }}
        />

        {/* Step counter */}
        {showStepCounter && (
          <span style={{
            fontSize: 11, fontFamily: PJS,
            color: pageIsLight ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.4)',
          }}>
            Step {stepNum} of {DISPLAY_STEP_COUNT}
          </span>
        )}

        {/* Back button */}
        {showBack && (
          <button
            onClick={goBack}
            className={`border-none cursor-pointer text-[13px] text-left bg-transparent rounded-full px-2 py-1 transition-colors duration-150 hover:bg-black hover:text-white active:bg-neutral-900 ${
              pageIsLight ? 'text-[rgba(0,0,0,0.4)]' : 'text-[rgba(255,255,255,0.4)]'
            }`}
            style={{ fontFamily: PJS }}
          >
            ← Back
          </button>
        )}
      </div>

      {/* Steps container */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          style={{
            minHeight: '100vh',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '80px 24px',
          }}
        >
          {currentStep === 'welcome' && (
            <OnboardingWelcome onNext={goNext} {...stepProps} />
          )}
          {currentStep === 'names' && (
            <OnboardingStep1Names onNext={goNext} {...stepProps} />
          )}
          {currentStep === 'date' && (
            <OnboardingStep2Date onNext={goNext} data={onboardingData} {...stepProps} />
          )}
          {currentStep === 'location' && (
            <OnboardingStep3Location onNext={goNext} data={onboardingData} {...stepProps} />
          )}
          {currentStep === 'guestCount' && (
            <OnboardingStep4GuestCount onNext={goNext} data={onboardingData} {...stepProps} />
          )}
          {currentStep === 'weddingType' && (
            <OnboardingStep5WeddingType onNext={goNext} data={onboardingData} {...stepProps} />
          )}
          {currentStep === 'ava' && (
            <OnboardingStep7Ava onNext={goNext} data={onboardingData} {...stepProps} />
          )}
          {currentStep === 'universe' && (
            <OnboardingStepUniverse onNext={goNext} data={onboardingData} {...stepProps} />
          )}
          {currentStep === 'fork' && (
            <OnboardingStep8Fork
              onPathA={handlePathA}
              onPathB={handlePathB}
              data={onboardingData}
              {...stepProps}
            />
          )}
          {currentStep === 'pathA-guestList' && (
            <OnboardingPathAGuestList onNext={goNext} data={onboardingData} {...stepProps} />
          )}
          {currentStep === 'pathA-budget' && (
            <OnboardingPathABudget onNext={goNext} data={onboardingData} {...stepProps} />
          )}
          {currentStep === 'pathA-vendors' && (
            <OnboardingPathAVendors onNext={goNext} data={onboardingData} {...stepProps} />
          )}
          {currentStep === 'pathA-cultural' && (
            <OnboardingPathACultural onNext={goNext} data={onboardingData} {...stepProps} />
          )}
          {currentStep === 'pathA-inspiration' && (
            <OnboardingPathAInspiration onNext={goNext} data={onboardingData} {...stepProps} />
          )}
          {currentStep === 'completion' && (
            <OnboardingCompletion onDone={handleCompletion} data={onboardingData} {...stepProps} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
