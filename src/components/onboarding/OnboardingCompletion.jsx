import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import confetti from 'canvas-confetti';

const PJS = "'Plus Jakarta Sans', sans-serif";

const CHECKLIST_ITEMS = [
  { id: 1, label: 'Wedding details saved' },
  { id: 2, label: 'Dashboard personalized' },
  { id: 3, label: 'Ava is ready' },
];

export default function OnboardingCompletion({ onDone, data }) {
  const [completedItems, setCompletedItems] = useState([]);
  const [showButton, setShowButton] = useState(false);
  const textPrimary = '#0A0A0A';
  const textMuted = 'rgba(10,10,10,0.6)';
  const itemBg = '#FFFFFF';
  const itemBorder = 'rgba(10,10,10,0.18)';
  // First token only, in case a full name ever ends up in this field —
  // this heading is a first-name greeting, not a full-name one.
  const firstName = data.couple1Name?.trim().split(/\s+/)[0] || '';

  useEffect(() => {
    // AUDIT_2026-07.md N4: none of these were captured/cleared before — if
    // this component unmounts early (user navigates away mid-animation),
    // any still-pending timer called setState on an unmounted component.
    const timers = [];

    CHECKLIST_ITEMS.forEach((item, i) => {
      timers.push(setTimeout(() => {
        setCompletedItems(prev => [...prev, item.id]);
      }, (i + 1) * 600));
    });

    const buttonDelay = CHECKLIST_ITEMS.length * 600 + 300;
    timers.push(setTimeout(() => setShowButton(true), buttonDelay));

    // Confetti burst when the checklist finishes
    timers.push(setTimeout(() => {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.55 },
        colors: ['#E03553', '#ec4899', '#9333ea', '#DDF762', '#FFFFFF'],
      });
      // Second smaller burst 400ms later
      timers.push(setTimeout(() => {
        confetti({
          particleCount: 60,
          spread: 100,
          origin: { x: 0.2, y: 0.6 },
          colors: ['#E03553', '#ec4899', '#9333ea'],
        });
        confetti({
          particleCount: 60,
          spread: 100,
          origin: { x: 0.8, y: 0.6 },
          colors: ['#DDF762', '#FFFFFF', '#9333ea'],
        });
      }, 400));
    }, buttonDelay - 200));

    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="w-full max-w-2xl">
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        style={{ fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 700, color: textPrimary, fontFamily: PJS, marginBottom: 12 }}
      >
        {firstName ? `You're all set, ${firstName}.` : "You're all set."}
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        style={{ color: textMuted, fontSize: 16, marginBottom: 48, fontFamily: PJS }}
      >
        Ava is setting up your dashboard now.
      </motion.p>

      {/* Checklist */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="space-y-4 mb-12"
      >
        {CHECKLIST_ITEMS.map(item => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: -20 }}
            animate={completedItems.includes(item.id) ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
            transition={{ duration: 0.4 }}
            style={{
              display: 'flex', alignItems: 'center', gap: 16,
              background: itemBg,
              border: `1px solid ${itemBorder}`,
              padding: 16,
            }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={completedItems.includes(item.id) ? { scale: 1 } : { scale: 0 }}
              style={{ flexShrink: 0 }}
            >
              <Check style={{ width: 20, height: 20, color: '#22c55e' }} />
            </motion.div>
            <span style={{ color: textPrimary, fontSize: 14, fontFamily: PJS }}>{item.label}</span>
          </motion.div>
        ))}
      </motion.div>

      {showButton && (
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={onDone}
          className="px-8 py-3 rounded-full text-white text-sm font-medium bg-[#E03553] hover:bg-black active:bg-neutral-900 transition-colors duration-150"
        >
          Let's go →
        </motion.button>
      )}
    </div>
  );
}
