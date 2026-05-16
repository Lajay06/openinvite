import React, { useState } from 'react';
import { motion } from 'framer-motion';

const CURRENCIES = [
  { code: 'AUD', symbol: '$' },
  { code: 'USD', symbol: '$' },
  { code: 'GBP', symbol: '£' },
  { code: 'EUR', symbol: '€' },
  { code: 'NZD', symbol: '$' }
];

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
        className="font-bold text-white mb-3"
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
            className="bg-transparent border border-[#333] rounded px-4 py-3 text-white font-semibold appearance-none cursor-pointer"
          >
            {CURRENCIES.map(c => (
              <option key={c.code} value={c.code} className="bg-[#0A0A0A] text-white">
                {c.symbol} {c.code}
              </option>
            ))}
          </select>

          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount"
            className="bg-transparent border border-[#333] rounded px-4 py-3 text-white text-2xl font-semibold placeholder-[#444444] focus:outline-none focus:border-[#E03553] transition-colors flex-1"
          />
        </div>

        {amount && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#111111] border border-[#333] rounded-none p-6"
          >
            <p className="text-white text-3xl font-bold">
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
          className="px-8 py-3 rounded-full text-white text-sm font-medium tracking-widest bg-gradient-to-r from-[#E03553] to-[#803D81] hover:brightness-110 transition-all"
        >
          Continue →
        </button>

        <button
          onClick={() => onNext({ budget: null })}
          className="block mx-auto text-[#666666] hover:text-white text-sm transition-colors"
        >
          Not sure yet →
        </button>
      </motion.div>
    </div>
  );
}