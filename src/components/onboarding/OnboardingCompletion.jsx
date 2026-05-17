import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

const PJS = "'Plus Jakarta Sans', sans-serif";

const CHECKLIST_ITEMS = [
  { id: 1, label: 'Wedding details saved' },
  { id: 2, label: 'Dashboard personalised' },
  { id: 3, label: 'Ava is ready' },
];

export default function OnboardingCompletion({ onDone, data, theme }) {
  const [completedItems, setCompletedItems] = useState([]);
  const [showButton, setShowButton] = useState(false);
  const isDark = theme !== 'light';
  const textPrimary = isDark ? '#FFFFFF' : '#0A0A0A';
  const textMuted = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.45)';
  const itemBg = isDark ? '#111111' : '#FFFFFF';
  const itemBorder = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

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
        <div
          className="absolute inset-0 rounded-full flex items-center justify-center text-3xl"
          style={{ fontFamily: PJS, fontWeight: 800, color: textPrimary }}
        >
          ✦
        </div>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        style={{ fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 700, color: textPrimary, fontFamily: PJS, marginBottom: 12 }}
      >
        You're all set, {data.couple1Name || 'friend'}.
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
          className="px-8 py-3 rounded-full text-white text-sm font-medium bg-gradient-to-r from-[#E03553] to-[#803D81] hover:brightness-110 transition-all"
        >
          Let's go →
        </motion.button>
      )}
    </div>
  );
}
