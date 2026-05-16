import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Users2, UsersRound } from 'lucide-react';

const CARDS = [
  { id: 'intimate', label: 'Intimate', range: 'Under 50', icon: Users },
  { id: 'celebration', label: 'Celebration', range: '50 – 150', icon: Users2 },
  { id: 'grand', label: 'Grand', range: '150+', icon: UsersRound }
];

export default function OnboardingStep4GuestCount({ onNext, data }) {
  const [selected, setSelected] = useState('');
  const [customCount, setCustomCount] = useState('');

  const handleSubmit = () => {
    const count = customCount ? parseInt(customCount) : (
      selected === 'intimate' ? 50 :
      selected === 'celebration' ? 100 :
      200
    );
    onNext({ guestCount: count });
  };

  const isReady = selected || customCount;

  return (
    <div className="w-full max-w-3xl text-center">
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="font-bold text-white mb-3"
        style={{ fontSize: 'clamp(28px, 4vw, 48px)' }}
      >
        How many guests are you expecting?
      </motion.h1>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-3 gap-4 mb-12"
      >
        {CARDS.map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.button
              key={card.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.1 }}
              onClick={() => setSelected(card.id)}
              className={`p-6 rounded-none border-2 transition-all ${
                selected === card.id
                  ? 'bg-[#1A1A1A] border-transparent bg-gradient-to-br from-[#E03553] to-[#803D81]'
                  : 'bg-[#111111] border-[#333] hover:border-[#555]'
              }`}
            >
              <Icon className={`w-8 h-8 mb-3 mx-auto ${
                selected === card.id ? 'text-white' : 'text-[#888888]'
              }`} />
              <div className={`font-semibold ${selected === card.id ? 'text-white' : 'text-white'}`}>
                {card.label}
              </div>
              <div className={`text-xs ${selected === card.id ? 'text-white/80' : 'text-[#666666]'}`}>
                {card.range}
              </div>
            </motion.button>
          );
        })}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="mb-12"
      >
        <p className="text-[#666666] text-sm mb-4">Or enter a number:</p>
        <div className="flex justify-center gap-3">
          <input
            type="number"
            value={customCount}
            onChange={(e) => setCustomCount(e.target.value)}
            placeholder="Enter count"
            className="bg-transparent border border-[#333] rounded px-4 py-2 text-white text-center w-32 placeholder-[#444444] focus:outline-none focus:border-[#E03553] transition-colors"
          />
        </div>
      </motion.div>

      {isReady && (
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={handleSubmit}
          className="px-8 py-3 rounded-full text-white text-sm font-medium tracking-widest bg-gradient-to-r from-[#E03553] to-[#803D81] hover:brightness-110 transition-all"
        >
          Continue →
        </motion.button>
      )}
    </div>
  );
}