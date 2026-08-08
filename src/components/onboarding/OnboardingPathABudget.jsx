import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CURRENCIES } from '@/contexts/CurrencyContext';

export default function OnboardingPathABudget({ onNext, data }) {
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('AUD');

  const handleSubmit = () => {
    if (amount) {
      onNext({ budget: parseFloat(amount), currency });
    } else {
      onNext({ budget: null });
    }
  };

  return (
    <div className="w-full max-w-2xl text-center">
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="font-bold text-[#0A0A0A] mb-3"
        style={{ fontSize: 'clamp(28px, 4vw, 48px)' }}
      >
        What's your total wedding budget?
      </motion.h1>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-8 mb-12"
      >
        <div className="flex gap-4 justify-center">
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="bg-transparent border border-[rgba(10,10,10,0.18)] rounded px-4 py-3 text-[#0A0A0A] font-semibold appearance-none cursor-pointer"
          >
            {CURRENCIES.map(c => (
              <option key={c.code} value={c.code} className="bg-[#FFFFFF] text-[#0A0A0A]">
                {c.symbol} {c.code}
              </option>
            ))}
          </select>

          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount"
            className="bg-transparent border border-[rgba(10,10,10,0.18)] rounded px-4 py-3 text-[#0A0A0A] text-2xl font-semibold placeholder-[rgba(10,10,10,0.58)] focus:outline-none focus:border-[#E03553] transition-colors flex-1"
          />
        </div>

        {amount && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#FFFFFF] border border-[rgba(10,10,10,0.18)] rounded-none p-6"
          >
            <p className="text-[#0A0A0A] text-3xl font-bold">
              {CURRENCIES.find(c => c.code === currency)?.symbol}{parseFloat(amount).toLocaleString()}
            </p>
          </motion.div>
        )}
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
          onClick={() => onNext({ budget: null })}
          className="block mx-auto text-[rgba(10,10,10,0.6)] hover:text-[#0A0A0A] text-sm transition-colors"
        >
          Not sure yet →
        </button>
      </motion.div>
    </div>
  );
}