import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';

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

// Content steps = everything between welcome and completion
const CONTENT_STEP_COUNT = STEPS.length - 2; // 13

export default function Onboarding() {
  const navigate = useNavigate();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [user, setUser] = useState(null);
  // TASK 2: theme state
  const [theme, setTheme] = useState('dark');

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
    activeUniverse: 'aman',
    websiteMode: 'dark',
  });

  const currentStep = STEPS[currentStepIndex];
  const isDark = theme !== 'light';

  // Progress: starts at names (index 1), 0 on welcome, 100 on completion
  const progress = currentStep === 'welcome' ? 0
    : currentStep === 'completion' ? 100
    : ((currentStepIndex - 1) / CONTENT_STEP_COUNT) * 100;

  // Step counter display (shown from names through last content step)
  const showStepCounter = currentStep !== 'welcome' && currentStep !== 'completion';
  const stepNum = currentStepIndex; // welcome=0, names=1, date=2…
  const showBack = currentStepIndex > 0 && currentStep !== 'completion';

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (err) {
        navigate('/');
      }
    };
    checkAuth();
  }, [navigate]);

  const goNext = (data) => {
    setOnboardingData(prev => ({ ...prev, ...(data || {}) }));
    setCurrentStepIndex(prev => Math.min(prev + 1, STEPS.length - 1));
    window.scrollTo(0, 0);
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
    await saveOnboarding('quick');
    goToStep(STEPS.indexOf('completion'));
  };

  const saveOnboarding = async (path) => {
    try {
      const activeUniverse = onboardingData.activeUniverse || 'aman';
      const websiteMode = onboardingData.websiteMode || 'dark';
      const activeTheme = websiteMode === 'light' ? 'ivory' : 'still';

      const weddingDetails = {
        coupleNames: `${onboardingData.couple1Name} & ${onboardingData.couple2Name}`,
        couple1Name: onboardingData.couple1Name,
        couple2Name: onboardingData.couple2Name,
        weddingDate: onboardingData.weddingDate,
        slug: onboardingData.couple1Name?.toLowerCase().replace(/\s+/g, '-') + '-' +
              onboardingData.couple2Name?.toLowerCase().replace(/\s+/g, '-'),
        mainCeremony: {
          venueName: typeof onboardingData.venue === 'object' ? onboardingData.venue?.name : onboardingData.venue,
          address: typeof onboardingData.venue === 'object' ? onboardingData.venue?.address : onboardingData.location,
        },
        foodAndBeverage: {
          guestCount: onboardingData.guestCount?.toString()
        },
        websiteEnabled: false,
        activeUniverse,
        websiteMode,
        activeTheme,
      };

      await WeddingDetails.create(weddingDetails);

      if (onboardingData.guestList.length > 0) {
        await Guest.bulkCreate(onboardingData.guestList);
      }

      if (onboardingData.budget) {
        await Budget.create({
          category: 'miscellaneous',
          item_name: 'Total Budget',
          budgeted_amount: onboardingData.budget,
        });
      }

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

      if (onboardingData.inspirationPhotos.length > 0) {
        await Promise.all(onboardingData.inspirationPhotos.map(photo =>
          MoodboardItem.create({
            title: 'Inspiration',
            image_url: photo,
            category: 'other',
          })
        ));
      }

      await base44.auth.updateMe({ onboardingCompleted: true, onboardingPath: path });
    } catch (err) {
      console.error('Error saving onboarding:', err);
    }
  };

  const handleCompletion = async () => {
    if (onboardingData.path === 'detailed') {
      await saveOnboarding('detailed');
    }
    navigate('/Dashboard');
  };

  const stepProps = { theme, setTheme };

  return (
    <div style={{
      minHeight: '100vh',
      background: isDark ? '#0A0A0A' : '#FAFAFA',
      overflow: 'hidden',
      transition: 'background 0.3s ease',
    }}>

      {/* TASK 4: Progress bar — fixed top, 2px */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0,
        height: 2, zIndex: 100,
        background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
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
            filter: isDark ? 'brightness(0) invert(1)' : 'brightness(0)',
          }}
        />

        {/* Step counter */}
        {showStepCounter && (
          <span style={{
            fontSize: 11, fontFamily: PJS,
            color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)',
          }}>
            Step {stepNum} of {CONTENT_STEP_COUNT}
          </span>
        )}

        {/* Back button */}
        {showBack && (
          <button
            onClick={goBack}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 13, fontFamily: PJS, padding: 0,
              color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)',
              textAlign: 'left',
            }}
          >
            ← Back
          </button>
        )}
      </div>

      {/* TASK 2: Theme toggle — fixed top-right */}
      <button
        onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
        style={{
          position: 'fixed', top: 20, right: 24, zIndex: 50,
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 14px', borderRadius: 999,
          fontSize: 12, fontFamily: PJS, cursor: 'pointer',
          background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
          color: isDark ? '#FFFFFF' : '#0A0A0A',
          border: isDark ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(0,0,0,0.12)',
          transition: 'all 0.2s ease',
        }}
      >
        {isDark
          ? <Moon size={14} />
          : <Sun size={14} />
        }
        {isDark ? 'Dark' : 'Light'}
      </button>

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
