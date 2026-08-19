import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Check, ChevronLeft, ChevronRight, Crown, Lock } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { getMyWeddingDetails } from '@/lib/resolveMyWedding';
import { getJourneyCounts, getJourneyProgress } from '@/lib/setupJourney';
import { personalizeStep } from '@/lib/avaStudioCopy';
import { useAuth } from '@/lib/AuthContext';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import { interactiveDivProps } from '@/lib/a11y';

const PJS = "'Plus Jakarta Sans', sans-serif";
const CONFETTI_COLORS = ['#E03553', '#ec4899', '#9333ea', '#DDF762', '#FFFFFF'];
const WeddingDetails = base44.entities.WeddingDetails;

function fireConfetti(big) {
  confetti({ particleCount: big ? 120 : 70, spread: big ? 80 : 65, origin: { y: 0.55 }, colors: CONFETTI_COLORS });
  if (big) {
    setTimeout(() => {
      confetti({ particleCount: 60, spread: 100, origin: { x: 0.2, y: 0.6 }, colors: CONFETTI_COLORS });
      confetti({ particleCount: 60, spread: 100, origin: { x: 0.8, y: 0.6 }, colors: CONFETTI_COLORS });
    }, 350);
  }
}

export default function AvaStudio() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [wedding, setWedding] = useState(null);
  const [primarySteps, setPrimarySteps] = useState(null);
  const [ultraSteps, setUltraSteps] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [celebrationOverlay, setCelebrationOverlay] = useState(null); // null | 'allDone'

  const isProPlan = (user?.plan || 'free') === 'pro';

  useEffect(() => {
    let stale = false;
    (async () => {
      const [details, counts] = await Promise.all([getMyWeddingDetails(), getJourneyCounts()]);
      if (stale) return;

      const { steps } = getJourneyProgress(details, counts);
      const primary = isProPlan ? steps.filter((s) => !s.ultraGated) : steps;
      const ultra = isProPlan ? steps.filter((s) => s.ultraGated) : [];
      const primaryDone = primary.filter((s) => s.done).length;
      const primaryNext = primary.findIndex((s) => !s.done);

      setWedding(details || null);
      setPrimarySteps(primary);
      setUltraSteps(ultra);
      setActiveIndex(primaryNext === -1 ? primary.length - 1 : primaryNext);
      setLoading(false);

      // Milestone celebration — server-side one-time guard on the
      // WeddingDetails record itself (not localStorage), so "you're live"
      // fires once per wedding, not once per browser. Detected here, right
      // after load, rather than on every render.
      const milestones = details?.avaStudioMilestones || {};
      const publishStep = steps.find((s) => s.key === 'publish');
      const allPrimaryDone = primaryDone === primary.length;
      const patch = {};

      if (allPrimaryDone && !milestones.allDoneCelebrated) {
        patch.allDoneCelebrated = true;
        setCelebrationOverlay('allDone');
        fireConfetti(true);
      } else if (publishStep?.done && !milestones.publishCelebrated) {
        patch.publishCelebrated = true;
        fireConfetti(false);
      }

      if (details?.id && Object.keys(patch).length > 0) {
        WeddingDetails.update(details.id, { avaStudioMilestones: { ...milestones, ...patch } }).catch(() => {});
      }
    })();
    return () => { stale = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isProPlan]);

  if (loading || !primarySteps) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#FFFFFF', fontFamily: PJS }}>
        <DashboardPageHeader title="Ava Studio" subtitle="Your guided path to a launched wedding" />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(10,10,10,0.6)', fontSize: 14 }}>
          Loading your progress…
        </div>
      </div>
    );
  }

  const firstName = wedding?.couple1Name || 'there';
  const step = primarySteps[activeIndex];
  const copy = personalizeStep(step.key, wedding, null);
  const doneCount = primarySteps.filter((s) => s.done).length;
  const goTo = (i) => setActiveIndex(Math.min(Math.max(i, 0), primarySteps.length - 1));

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#FFFFFF', fontFamily: PJS }}>
      <DashboardPageHeader title="Ava Studio" subtitle="Your guided path to a launched wedding" />

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* LEFT — photography, one image per step, matching the onboarding
            wizard's own per-step photo shell (OnboardingShell.jsx). Hidden
            below md, same breakpoint AuthLayout.jsx uses. */}
        <div className="hidden md:block" style={{ width: '42%', flexShrink: 0, position: 'relative', overflow: 'hidden', background: '#0A0A0A' }}>
          <AnimatePresence mode="wait">
            <motion.img
              key={step.image}
              src={step.image}
              alt=""
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </AnimatePresence>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(10,10,10,0) 60%, rgba(10,10,10,0.75) 100%)' }} />
          <div style={{ position: 'absolute', left: 32, bottom: 28, right: 32 }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.7)', margin: '0 0 4px', textTransform: 'uppercase' }}>
              Step {activeIndex + 1} of {primarySteps.length}
            </p>
            <p style={{ fontSize: 20, fontWeight: 700, color: '#FFFFFF', margin: 0, letterSpacing: '-0.01em' }}>
              {step.title}
            </p>
          </div>
        </div>

        {/* RIGHT — content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '48px 56px' }}>
          <div style={{ maxWidth: 560 }}>

            {celebrationOverlay === 'allDone' ? (
              <CelebrationOverlay
                firstName={firstName}
                onDone={() => setCelebrationOverlay(null)}
              />
            ) : (
              <>
                {/* Ava intro — once per page, not repeated per step */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                    background: 'linear-gradient(135deg, #E03553, #803D81)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 17, color: '#FFFFFF',
                  }}>✦</div>
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 700, color: '#0A0A0A', margin: 0 }}>Hi {firstName}, I'm Ava.</p>
                    <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.6)', margin: 0 }}>
                      {doneCount === primarySteps.length ? "You've made it through every step — nice work." : "Let's take this one step at a time. No overwhelm."}
                    </p>
                  </div>
                </div>

                {/* Progress — thin gradient bar + jumpable dot row, replacing
                    the old chunky segmented block bar. */}
                <div style={{ height: 2, background: 'rgba(10,10,10,0.08)', marginBottom: 16 }}>
                  <motion.div
                    style={{ height: '100%', background: 'linear-gradient(90deg, #ec4899, #9333ea)' }}
                    initial={{ width: 0 }}
                    animate={{ width: `${(doneCount / primarySteps.length) * 100}%` }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
                  {primarySteps.map((s, i) => {
                    const isActive = i === activeIndex;
                    return (
                      <div
                        key={s.key}
                        onClick={() => goTo(i)}
                        {...interactiveDivProps(() => goTo(i), { label: `Step ${i + 1}: ${s.title}` })}
                        title={s.title}
                        style={{
                          width: 24, height: 24, borderRadius: '50%', flexShrink: 0, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          border: isActive ? '2px solid #E03553' : s.done ? 'none' : '1.5px solid rgba(10,10,10,0.2)',
                          background: s.done ? '#E03553' : 'transparent',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {s.done
                          ? <Check size={11} color="#FFFFFF" strokeWidth={3} />
                          : <span style={{ fontSize: 10, fontWeight: 700, color: isActive ? '#E03553' : 'rgba(10,10,10,0.4)' }}>{i + 1}</span>}
                      </div>
                    );
                  })}
                </div>

                {/* Step card */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={step.key}
                    initial={{ y: 40, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -40, opacity: 0 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    style={{ marginBottom: 28 }}
                  >
                    {step.done && (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 12,
                        fontSize: 11, fontWeight: 700, color: '#22C55E',
                        background: 'rgba(34,197,94,0.1)', padding: '2px 10px', borderRadius: 999,
                      }}>
                        <Check size={11} strokeWidth={3} /> Done
                      </span>
                    )}

                    <h1 style={{ fontSize: 'clamp(28px, 3.6vw, 42px)', fontWeight: 700, color: '#0A0A0A', margin: '0 0 16px', letterSpacing: '-0.01em', lineHeight: 1.1 }}>
                      {step.title}
                    </h1>

                    <p style={{ fontSize: 16, color: '#0A0A0A', lineHeight: 1.65, margin: '0 0 32px', maxWidth: 480 }}>
                      {step.done ? copy.done : copy.todo}
                    </p>

                    <button
                      onClick={() => navigate(step.route)}
                      className="px-8 py-3 rounded-full text-white text-sm font-medium tracking-widest bg-[#E03553] hover:bg-black active:bg-neutral-900 transition-colors duration-150"
                    >
                      Take me there →
                    </button>
                  </motion.div>
                </AnimatePresence>

                {/* Prev / next */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: ultraSteps.length > 0 ? 8 : 0 }}>
                  <button
                    onClick={() => goTo(activeIndex - 1)}
                    disabled={activeIndex === 0}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none',
                      cursor: activeIndex === 0 ? 'default' : 'pointer',
                      color: activeIndex === 0 ? 'rgba(10,10,10,0.3)' : 'rgba(10,10,10,0.6)',
                      fontSize: 13, fontFamily: PJS, padding: '8px 0',
                    }}
                  >
                    <ChevronLeft size={16} /> Back
                  </button>
                  <button
                    onClick={() => goTo(activeIndex + 1)}
                    disabled={activeIndex === primarySteps.length - 1}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none',
                      cursor: activeIndex === primarySteps.length - 1 ? 'default' : 'pointer',
                      color: activeIndex === primarySteps.length - 1 ? 'rgba(10,10,10,0.3)' : 'rgba(10,10,10,0.6)',
                      fontSize: 13, fontFamily: PJS, padding: '8px 0',
                    }}
                  >
                    Next <ChevronRight size={16} />
                  </button>
                </div>

                {/* "What Ultra adds" — Pro-plan only. The 3 Ultra-gated
                    steps, grouped as a tasteful upgrade nudge, never as
                    to-dos a Pro user can act on, never auto-landed on. */}
                {ultraSteps.length > 0 && <UltraCluster steps={ultraSteps} navigate={navigate} />}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function UltraCluster({ steps, navigate }) {
  return (
    <div style={{ marginTop: 40, paddingTop: 32, borderTop: '1px solid rgba(10,10,10,0.12)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
        <Crown size={14} style={{ color: '#F59E0B' }} />
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.6)', textTransform: 'uppercase', margin: 0 }}>
          What Ultra adds
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 22, maxWidth: 480 }}>
        {steps.map((s) => (
          <div key={s.key} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <Lock size={13} style={{ color: 'rgba(10,10,10,0.45)', flexShrink: 0, marginTop: 2 }} />
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A', margin: '0 0 2px' }}>{s.title}</p>
              <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.6)', margin: 0, lineHeight: 1.5 }}>{s.purpose}</p>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => navigate('/account')}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 22px',
          background: 'linear-gradient(135deg, #FBBF24, #F59E0B)', color: '#FFFFFF',
          border: 'none', borderRadius: 999, fontSize: 13, fontWeight: 700, fontFamily: PJS, cursor: 'pointer',
        }}
      >
        <Crown size={13} /> Unlock with Ultra →
      </button>
    </div>
  );
}

function CelebrationOverlay({ firstName, onDone }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{ paddingTop: 40 }}>
      <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', color: '#E03553', textTransform: 'uppercase', margin: '0 0 12px' }}>
        Milestone
      </p>
      <h1 style={{ fontSize: 'clamp(30px, 4.4vw, 48px)', fontWeight: 700, color: '#0A0A0A', margin: '0 0 16px', letterSpacing: '-0.01em', lineHeight: 1.1 }}>
        {firstName && firstName !== 'there' ? `You've launched your wedding, ${firstName}.` : "You've launched your wedding."}
      </h1>
      <p style={{ fontSize: 16, color: 'rgba(10,10,10,0.6)', lineHeight: 1.65, margin: '0 0 32px', maxWidth: 460 }}>
        Every step is done — your website, your guests, your budget, your day. Ava's still here whenever you want to revisit any of it.
      </p>
      <button
        onClick={onDone}
        className="px-8 py-3 rounded-full text-white text-sm font-medium tracking-widest bg-[#E03553] hover:bg-black active:bg-neutral-900 transition-colors duration-150"
      >
        Continue →
      </button>
    </motion.div>
  );
}
