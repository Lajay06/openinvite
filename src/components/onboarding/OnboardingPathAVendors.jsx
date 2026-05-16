import React, { useState } from 'react';
import { motion } from 'framer-motion';

const VENDOR_TYPES = [
  'Photographer', 'Florist', 'Caterer', 'Band/DJ', 'Celebrant', 'Videographer', 'Hair & Makeup', 'Transport'
];

export default function OnboardingPathAVendors({ onNext, data }) {
  const [selected, setSelected] = useState([]);
  const [formData, setFormData] = useState({});

  const toggle = (type) => {
    setSelected(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const handleSubmit = () => {
    const vendors = selected.map(type => ({
      name: formData[type]?.name || '',
      category: type.toLowerCase(),
      contact: formData[type]?.contact || ''
    })).filter(v => v.name);

    onNext({ vendors });
  };

  return (
    <div className="w-full max-w-2xl text-center">
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="font-bold text-white mb-3"
        style={{ fontSize: 'clamp(28px, 4vw, 48px)' }}
      >
        Any vendors already booked?
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-[#666666] text-sm mb-12"
      >
        Add what you know — you can fill in details later.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-2 gap-3 mb-12"
      >
        {VENDOR_TYPES.map((type, i) => (
          <motion.button
            key={type}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.25 + i * 0.05 }}
            onClick={() => toggle(type)}
            className={`p-4 rounded-none border-2 transition-all text-sm font-medium ${
              selected.includes(type)
                ? 'bg-gradient-to-r from-[#E03553] to-[#803D81] border-transparent text-white'
                : 'bg-transparent border-[#333] text-[#888888] hover:border-[#555]'
            }`}
          >
            <input
              type="checkbox"
              checked={selected.includes(type)}
              onChange={() => {}}
              className="mr-2"
            />
            {type}
          </motion.button>
        ))}
      </motion.div>

      {selected.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4 mb-12"
        >
          {selected.map((type, i) => (
            <div key={type} className="bg-[#111111] border border-[#333] rounded-none p-4">
              <input
                type="text"
                placeholder="Vendor name"
                value={formData[type]?.name || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  [type]: { ...prev[type], name: e.target.value }
                }))}
                className="w-full bg-transparent border-b border-[#333] px-0 py-2 text-white placeholder-[#444444] focus:outline-none focus:border-[#E03553] transition-colors text-sm mb-3"
              />
              <input
                type="text"
                placeholder="Contact (optional)"
                value={formData[type]?.contact || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  [type]: { ...prev[type], contact: e.target.value }
                }))}
                className="w-full bg-transparent border-b border-[#333] px-0 py-2 text-white placeholder-[#444444] focus:outline-none focus:border-[#E03553] transition-colors text-sm"
              />
            </div>
          ))}
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="space-y-4"
      >
        <button
          onClick={handleSubmit}
          className="px-8 py-3 rounded-full text-white text-sm font-medium tracking-widest bg-gradient-to-r from-[#E03553] to-[#803D81] hover:brightness-110 transition-all"
        >
          Continue →
        </button>

        <button
          onClick={() => onNext({ vendors: [] })}
          className="block mx-auto text-[#666666] hover:text-white text-sm transition-colors"
        >
          Skip for now →
        </button>
      </motion.div>
    </div>
  );
}