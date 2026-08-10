import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { getMyWeddingDetails } from '@/lib/resolveMyWedding';
import { JOURNEY_STEPS, getJourneyCounts, getJourneyProgress } from '@/lib/setupJourney';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import { interactiveDivProps } from '@/lib/a11y';

const PJS = "'Plus Jakarta Sans', sans-serif";

export default function AvaStudio() {
  const navigate = useNavigate();
  const [wedding, setWedding] = useState(null);
  const [progress, setProgress] = useState(null);
  const [activeIndex, setActiveIndex] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let stale = false;
    (async () => {
      const [details, counts] = await Promise.all([getMyWeddingDetails(), getJourneyCounts()]);
      if (stale) return;
      setWedding(details || null);
      const p = getJourneyProgress(details, counts);
      setProgress(p);
      setActiveIndex(p.nextIndex);
      setLoading(false);
    })();
    return () => { stale = true; };
  }, []);

  const firstName = wedding?.couple1Name || 'there';

  if (loading || !progress) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#FFFFFF', fontFamily: PJS }}>
        <DashboardPageHeader title="Ava Studio" subtitle="Your guided path to a launched wedding" />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(10,10,10,0.6)', fontSize: 14 }}>
          Loading your progress…
        </div>
      </div>
    );
  }

  const step = progress.steps[activeIndex];
  const goTo = (i) => setActiveIndex(Math.min(Math.max(i, 0), progress.steps.length - 1));

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#FFFFFF', fontFamily: PJS }}>
      <DashboardPageHeader title="Ava Studio" subtitle="Your guided path to a launched wedding" />

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ maxWidth: 640, width: '100%' }}>

          {/* Ava intro */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg, #E03553, #803D81)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, color: '#FFFFFF',
            }}>✦</div>
            <div>
              <p style={{ fontSize: 16, fontWeight: 700, color: '#0A0A0A', margin: 0 }}>Hi {firstName}, I'm Ava.</p>
              <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.6)', margin: 0 }}>
                {progress.allDone
                  ? "You've made it through every step — nice work."
                  : "Let's take this one step at a time. No overwhelm."}
              </p>
            </div>
          </div>

          {/* Progress stepper */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              {progress.steps.map((s, i) => {
                const isActive = i === activeIndex;
                return (
                  <div
                    key={s.key}
                    onClick={() => goTo(i)}
                    {...interactiveDivProps(() => goTo(i), { label: `Step ${i + 1}: ${s.title}` })}
                    style={{
                      flex: 1, height: 6, borderRadius: 999, cursor: 'pointer',
                      background: s.done ? '#E03553' : isActive ? 'rgba(224,53,83,0.35)' : 'rgba(10,10,10,0.1)',
                      transition: 'background 0.2s ease',
                    }}
                  />
                );
              })}
            </div>
            <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.6)', margin: 0 }}>
              {progress.doneCount} of {progress.steps.length} done
            </p>
          </div>

          {/* Step card */}
          <AnimatePresence mode="wait">
            <motion.div
              key={step.key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              style={{ border: '1px solid rgba(10,10,10,0.1)', padding: 32, marginBottom: 20 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.45)', textTransform: 'uppercase' }}>
                  Step {activeIndex + 1} of {progress.steps.length}
                </span>
                {step.done && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    fontSize: 11, fontWeight: 700, color: '#22C55E',
                    background: 'rgba(34,197,94,0.1)', padding: '2px 10px', borderRadius: 999,
                  }}>
                    <Check size={11} strokeWidth={3} /> Done
                  </span>
                )}
              </div>

              <h2 style={{ fontSize: 24, fontWeight: 700, color: '#0A0A0A', margin: '0 0 12px', letterSpacing: '-0.01em' }}>
                {step.title}
              </h2>

              <p style={{ fontSize: 14, color: '#0A0A0A', lineHeight: 1.6, margin: '0 0 16px' }}>
                {step.done ? step.avaLineDone : step.avaLine}
              </p>

              <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.6)', lineHeight: 1.6, margin: '0 0 24px' }}>
                {step.purpose}
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
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
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
              disabled={activeIndex === progress.steps.length - 1}
              style={{
                display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none',
                cursor: activeIndex === progress.steps.length - 1 ? 'default' : 'pointer',
                color: activeIndex === progress.steps.length - 1 ? 'rgba(10,10,10,0.3)' : 'rgba(10,10,10,0.6)',
                fontSize: 13, fontFamily: PJS, padding: '8px 0',
              }}
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
