import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

const CHECKLIST_ITEMS = [
  { id: 1, label: 'Wedding details saved' },
  { id: 2, label: 'Dashboard personalised' },
  { id: 3, label: 'Ava is ready' }
];

export default function OnboardingCompletion({ onDone, data }) {
  const [completedItems, setCompletedItems] = useState([]);
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    CHECKLIST_ITEMS.forEach((item, i) => {
      setTimeout(() => {
        setCompletedItems(prev => [...prev, item.id]);
      }, (i + 1) * 600);
    });

    setTimeout(() => {
      setShowButton(true);
    }, CHECKLIST_ITEMS.length * 600 + 300);
  }, []);

  return (
    <div className="w-full max-w-2xl text-center">
      {/* Animated gradient orb */}
      <motion.div
        initial={{ scale: 0, rotate: 0 }}
        animate={{ scale: 1, rotate: 360 }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        className="w-20 h-20 mx-auto mb-12 relative"
      >
        <motion.div
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 2.5, repeat: Infinity }}
          className="absolute inset-0 rounded-full bg-gradient-to-r from-[#E03553] to-[#803D81] opacity-20 blur-xl"
        />
        <div className="absolute inset-0 rounded-full flex items-center justify-center text-white text-3xl" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800 }}>
          ✦
        </div>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="font-bold text-white mb-3"
        style={{ fontSize: 'clamp(32px, 5vw, 56px)' }}
      >
        You're all set, {data.couple1Name || 'friend'}.
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-[#AAAAAA] text-base mb-12"
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
        {CHECKLIST_ITEMS.map((item, i) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: -20 }}
            animate={completedItems.includes(item.id) ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
            transition={{ duration: 0.4 }}
            className="flex items-center gap-4 bg-[#111111] border border-[#333] rounded-none p-4"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={completedItems.includes(item.id) ? { scale: 1 } : { scale: 0 }}
              className="flex-shrink-0"
            >
              <Check className="w-5 h-5 text-green-500" />
            </motion.div>
            <span className="text-white text-sm">{item.label}</span>
          </motion.div>
        ))}
      </motion.div>

      {/* Button */}
      {showButton && (
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={onDone}
          className="px-8 py-3 rounded-full text-white text-sm font-medium tracking-widest bg-gradient-to-r from-[#E03553] to-[#803D81] hover:brightness-110 transition-all"
        >
          Let's go →
        </motion.button>
      )}
    </div>
  );
}