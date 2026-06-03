import React, { useState } from 'react';
import { motion } from 'framer-motion';
import DatePicker, { formatDateDisplay } from '@/components/shared/DatePicker';

const PJS = "'Plus Jakarta Sans', sans-serif";

export default function OnboardingStep2Date({ onNext, data, theme }) {
  const [date, setDate] = useState(data?.weddingDate || '');
  const isDark = theme !== 'light';
  const textPrimary = isDark ? '#FFFFFF' : '#0A0A0A';
  const textMuted = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.45)';
  const skipColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)';

  const handleSubmit = () => {
    if (date) onNext({ weddingDate: date });
  };

  return (
    <div className="w-full max-w-2xl text-center">
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 700, color: textPrimary, fontFamily: PJS, marginBottom: 12 }}
      >
        When's the big day?
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={{ color: textMuted, fontSize: 14, marginBottom: 48, fontFamily: PJS }}
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
          dark={isDark}
        />
        {date && (
          <p style={{ color: textMuted, fontSize: 13, marginTop: 8, textAlign: 'center', fontFamily: PJS }}>
            {formatDateDisplay(date)}
          </p>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="space-y-6"
      >
        {date && (
          <button
            onClick={handleSubmit}
            className="px-8 py-3 rounded-full text-white text-sm font-medium bg-[#E03553] hover:bg-black active:bg-neutral-900 transition-colors duration-150"
          >
            Continue →
          </button>
        )}
        <button
          onClick={() => onNext({ weddingDate: null })}
          style={{ display: 'block', margin: '0 auto', color: skipColor, fontSize: 14, background: 'none', border: 'none', cursor: 'pointer', fontFamily: PJS }}
        >
          We haven't set a date yet →
        </button>
      </motion.div>
    </div>
  );
}
