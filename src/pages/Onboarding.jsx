import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';
import { WeddingDetails } from '@/entities/WeddingDetails';
import { Guest } from '@/entities/Guest';
import { Budget } from '@/entities/Budget';
import { Vendor } from '@/entities/Vendor';
import { MoodboardItem } from '@/entities/MoodboardItem';

// Step components
import OnboardingStep1Names from '@/components/onboarding/OnboardingStep1Names';
import OnboardingStep2Date from '@/components/onboarding/OnboardingStep2Date';
import OnboardingStep3Location from '@/components/onboarding/OnboardingStep3Location';
import OnboardingStep4GuestCount from '@/components/onboarding/OnboardingStep4GuestCount';
import OnboardingStep5WeddingType from '@/components/onboarding/OnboardingStep5WeddingType';
import OnboardingStep6Priorities from '@/components/onboarding/OnboardingStep6Priorities';
import OnboardingStep7Ava from '@/components/onboarding/OnboardingStep7Ava';
import OnboardingStepUniverse from '@/components/onboarding/OnboardingStepUniverse';
import OnboardingStep8Fork from '@/components/onboarding/OnboardingStep8Fork';
import OnboardingPathAGuestList from '@/components/onboarding/OnboardingPathAGuestList';
import OnboardingPathABudget from '@/components/onboarding/OnboardingPathABudget';
import OnboardingPathAVendors from '@/components/onboarding/OnboardingPathAVendors';
import OnboardingPathACultural from '@/components/onboarding/OnboardingPathACultural';
import OnboardingPathAInspiration from '@/components/onboarding/OnboardingPathAInspiration';
import OnboardingCompletion from '@/components/onboarding/OnboardingCompletion';

const STEPS = [
  'names',
  'date',
  'location',
  'guestCount',
  'weddingType',
  'priorities',
  'ava',
  'universe',
  'fork',
  'pathA-guestList',
  'pathA-budget',
  'pathA-vendors',
  'pathA-cultural',
  'pathA-inspiration',
  'completion'
];

const PATH_A_STEPS = [
  'pathA-guestList',
  'pathA-budget',
  'pathA-vendors',
  'pathA-cultural',
  'pathA-inspiration'
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [user, setUser] = useState(null);
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
  const progress = ((currentStepIndex) / (STEPS.length - 1)) * 100;
  const showBackArrow = currentStepIndex > 0;

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
    setOnboardingData(prev => ({ ...prev, ...data }));
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
          budgeted_amount: onboardingData.budget
        });
      }

      if (onboardingData.vendors.length > 0) {
        await Promise.all(onboardingData.vendors.map(v =>
          Vendor.create({
            name: v.name,
            category: v.category,
            contact_person: v.contact,
            status: 'researching'
          })
        ));
      }

      if (onboardingData.inspirationPhotos.length > 0) {
        await Promise.all(onboardingData.inspirationPhotos.map(photo =>
          MoodboardItem.create({
            title: 'Inspiration',
            image_url: photo,
            category: 'other'
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

  return (
    <div className="min-h-screen bg-[#0A0A0A] overflow-hidden">
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 h-[2px] bg-[#1a1a1a] z-50">
        <motion.div
          className="h-full bg-gradient-to-r from-[#E03553] to-[#803D81]"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>

      {/* Back arrow */}
      {showBackArrow && (
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={goBack}
          className="fixed top-8 left-8 z-40 text-[#666666] hover:text-white transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </motion.button>
      )}

      {/* Step counter */}
      <motion.div
        className="fixed top-8 right-8 z-40 label-caps text-[#666666]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {currentStepIndex + 1} of {STEPS.length - 1}
      </motion.div>

      {/* Steps container */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="min-h-screen flex items-center justify-center px-6"
        >
          {currentStep === 'names' && <OnboardingStep1Names onNext={goNext} />}
          {currentStep === 'date' && <OnboardingStep2Date onNext={goNext} data={onboardingData} />}
          {currentStep === 'location' && <OnboardingStep3Location onNext={goNext} data={onboardingData} />}
          {currentStep === 'guestCount' && <OnboardingStep4GuestCount onNext={goNext} data={onboardingData} />}
          {currentStep === 'weddingType' && <OnboardingStep5WeddingType onNext={goNext} data={onboardingData} />}
          {currentStep === 'priorities' && <OnboardingStep6Priorities onNext={goNext} data={onboardingData} />}
          {currentStep === 'ava' && <OnboardingStep7Ava onNext={goNext} data={onboardingData} />}
          {currentStep === 'universe' && <OnboardingStepUniverse onNext={goNext} data={onboardingData} />}
          {currentStep === 'fork' && (
            <OnboardingStep8Fork
              onPathA={handlePathA}
              onPathB={handlePathB}
              data={onboardingData}
            />
          )}
          {currentStep === 'pathA-guestList' && <OnboardingPathAGuestList onNext={goNext} data={onboardingData} />}
          {currentStep === 'pathA-budget' && <OnboardingPathABudget onNext={goNext} data={onboardingData} />}
          {currentStep === 'pathA-vendors' && <OnboardingPathAVendors onNext={goNext} data={onboardingData} />}
          {currentStep === 'pathA-cultural' && <OnboardingPathACultural onNext={goNext} data={onboardingData} />}
          {currentStep === 'pathA-inspiration' && <OnboardingPathAInspiration onNext={goNext} data={onboardingData} />}
          {currentStep === 'completion' && <OnboardingCompletion onDone={handleCompletion} data={onboardingData} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}