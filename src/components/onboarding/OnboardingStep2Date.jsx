import React, { useState } from 'react';
import { motion } from 'framer-motion';
import DatePicker, { formatDateDisplay } from '@/components/shared/DatePicker';

export default function OnboardingStep2Date({ onNext, data }) {
  const [date, setDate] = useState(data?.weddingDate || '');

  const handleSubmit = () => {
    if (date) onNext({ weddingDate: date });
  };

  return (
    <div className="w-full max-w-2xl text-center">
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="font-bold text-white mb-3"
        style={{ fontSize: 'clamp(28px, 4vw, 48px)' }}
      >
        When's the big day?
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-[#666666] text-sm mb-12"
      >
        Don't worry if you haven't set a date yet.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-12 max-w-xs mx-auto"
      >
        <DatePicker
          value={date}
          onChange={setDate}
          placeholder="Select your wedding date"
          dark
        />
        {date && (
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 8, textAlign: 'center' }}>
            {formatDateDisplay(date)}
          </p>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="space-y-4"
      >
        {date && (
          <button
            onClick={handleSubmit}
            className="px-8 py-3 rounded-full text-white text-sm font-medium uppercase tracking-widest bg-gradient-to-r from-[#E03553] to-[#803D81] hover:brightness-110 transition-all"
          >
            Continue →
          </button>
        )}
        <button
          onClick={() => onNext({ weddingDate: null })}
          className="block mx-auto text-[#666666] hover:text-white text-sm transition-colors"
        >
          We haven't set a date yet →
        </button>
      </motion.div>
    </div>
  );
}