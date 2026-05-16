import React, { useState } from 'react';
import { motion } from 'framer-motion';

export default function OnboardingStep1Names({ onNext }) {
  const [name1, setName1] = useState('');
  const [name2, setName2] = useState('');

  const handleSubmit = () => {
    if (name1.trim() && name2.trim()) {
      onNext({ couple1Name: name1, couple2Name: name2 });
    }
  };

  return (
    <div className="w-full max-w-2xl">
      <div className="space-y-8 text-center">
        <div className="flex items-baseline gap-3 justify-center flex-wrap">
          <span style={{ fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 400, color: '#fff', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Hi, my name is
          </span>
          <div className="relative">
            <input
              type="text"
              value={name1}
              onChange={(e) => setName1(e.target.value)}
              placeholder="Your name"
              className="bg-transparent border-0 border-b-2 border-[#333] px-3 py-2 text-white placeholder-[#444444] focus:outline-none focus:border-b-2"
              style={{
                fontSize: 'clamp(24px, 3vw, 36px)',
                fontFamily: 'Plus Jakarta Sans',
                fontWeight: 600,
                borderBottomColor: name1 ? '#E03553' : '#333'
              }}
              onKeyDown={(e) => e.key === 'Enter' && name2.trim() && handleSubmit()}
            />
            {name1 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -right-6 top-1/2 transform -translate-y-1/2 text-[#E03553] text-xl"
              >
                ✓
              </motion.span>
            )}
          </div>
        </div>

        <div className="flex items-baseline gap-3 justify-center flex-wrap">
          <span style={{ fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 400, color: '#fff', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            and my partner's name is
          </span>
          <div className="relative">
            <input
              type="text"
              value={name2}
              onChange={(e) => setName2(e.target.value)}
              placeholder="Partner's name"
              className="bg-transparent border-0 border-b-2 border-[#333] px-3 py-2 text-white placeholder-[#444444] focus:outline-none focus:border-b-2"
              style={{
                fontSize: 'clamp(24px, 3vw, 36px)',
                fontFamily: 'Plus Jakarta Sans',
                fontWeight: 600,
                borderBottomColor: name2 ? '#E03553' : '#333'
              }}
              onKeyDown={(e) => e.key === 'Enter' && name1.trim() && handleSubmit()}
            />
            {name2 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -right-6 top-1/2 transform -translate-y-1/2 text-[#E03553] text-xl"
              >
                ✓
              </motion.span>
            )}
          </div>
        </div>

        {name1.trim() && name2.trim() && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={handleSubmit}
            className="mt-12 px-8 py-3 rounded-full text-white text-sm font-medium tracking-widest bg-gradient-to-r from-[#E03553] to-[#803D81] hover:brightness-110 transition-all"
          >
            Continue →
          </motion.button>
        )}
      </div>
    </div>
  );
}