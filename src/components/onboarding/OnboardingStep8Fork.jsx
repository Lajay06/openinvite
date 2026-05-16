import React from 'react';
import { motion } from 'framer-motion';
import { Clipboard, Zap } from 'lucide-react';

export default function OnboardingStep8Fork({ onPathA, onPathB, data }) {
  return (
    <div className="w-full max-w-5xl text-center">
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="font-bold text-white mb-3"
        style={{ fontSize: 'clamp(28px, 4vw, 48px)' }}
      >
        One last thing.
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-[#888888] text-base mb-16"
      >
        Would you like to add more details now or jump straight in?
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-8"
      >
        {/* Card A - Tell us more */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          onClick={onPathA}
          className="text-left p-8 rounded-none bg-[#111111] border border-[#333] hover:border-[#E03553] transition-all"
        >
          <Clipboard className="w-8 h-8 text-[#DDF762] mb-4" />
          <h3 className="text-white text-lg font-bold mb-3">Tell us more</h3>
          <p className="text-[#666666] text-sm mb-6">
            Upload your guest list, add vendors, set your budget, and give Ava everything she needs to hit the ground running.
          </p>
          <div className="space-y-2 mb-6">
            <div className="flex items-center gap-2 text-[#AAAAAA] text-sm">
              <span>✓</span> Upload guest list (CSV or manual)
            </div>
            <div className="flex items-center gap-2 text-[#AAAAAA] text-sm">
              <span>✓</span> Add cultural/religious details
            </div>
            <div className="flex items-center gap-2 text-[#AAAAAA] text-sm">
              <span>✓</span> Set your budget
            </div>
            <div className="flex items-center gap-2 text-[#AAAAAA] text-sm">
              <span>✓</span> Add known vendors
            </div>
            <div className="flex items-center gap-2 text-[#AAAAAA] text-sm">
              <span>✓</span> Upload inspiration photos
            </div>
          </div>
          <div className="px-6 py-3 rounded-full text-white text-sm font-medium tracking-widest bg-gradient-to-r from-[#E03553] to-[#803D81] hover:brightness-110 transition-all inline-block">
            Let's do it →
          </div>
        </motion.button>

        {/* Card B - Get started now */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          onClick={onPathB}
          className="text-left p-8 rounded-2xl bg-gradient-to-br from-[#1a0a0e] to-[#2d1033] border border-[#3a1a4d] hover:border-[#E03553] transition-all"
        >
          <Zap className="w-8 h-8 text-[#E03553] mb-4" />
          <h3 className="text-white text-lg font-bold mb-3">Get started now</h3>
          <p className="text-[#AAAAAA] text-sm mb-6">
            Jump straight into your dashboard. Ava will guide you through the key details as you go — no overwhelm.
          </p>
          <p className="text-[#666666] text-xs mb-6">
            You can always add more later.
          </p>
          <div className="px-6 py-3 rounded-full text-[#0A0A0A] text-sm font-medium tracking-widest bg-white hover:bg-gray-200 transition-all inline-block">
            Let's go →
          </div>
        </motion.button>
      </motion.div>
    </div>
  );
}