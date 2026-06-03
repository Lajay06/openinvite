import React, { useState } from 'react';
import { motion } from 'framer-motion';

export default function OnboardingPathACultural({ onNext, data }) {
  const [notes, setNotes] = useState('');

  const handleSubmit = () => {
    onNext({ culturalNotes: notes });
  };

  return (
    <div className="w-full max-w-2xl text-center">
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="font-bold text-white mb-3"
        style={{ fontSize: 'clamp(28px, 4vw, 48px)' }}
      >
        Any cultural or religious traditions?
      </motion.h1>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-12"
      >
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Tell us what's important to you..."
          className="w-full bg-[#111111] border border-[#333] rounded-none px-6 py-4 text-white placeholder-[#444444] focus:outline-none focus:border-[#E03553] transition-colors text-sm h-32 resize-none"
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="space-y-4"
      >
        <button
          onClick={handleSubmit}
          className="px-8 py-3 rounded-full text-white text-sm font-medium tracking-widest bg-[#E03553] hover:bg-black active:bg-neutral-900 transition-colors duration-150"
        >
          Continue →
        </button>

        <button
          onClick={() => onNext({ culturalNotes: '' })}
          className="block mx-auto text-[#666666] hover:text-white text-sm transition-colors"
        >
          Skip for now →
        </button>
      </motion.div>
    </div>
  );
}