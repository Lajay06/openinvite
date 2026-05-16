import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Upload } from 'lucide-react';

export default function OnboardingPathAGuestList({ onNext, data }) {
  const [file, setFile] = useState(null);
  const [manualMode, setManualMode] = useState(false);
  const [preview, setPreview] = useState([]);

  const handleFileUpload = async (e) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    
    // Simple CSV parsing (in production, use Papa Parse)
    const text = await uploadedFile.text();
    const lines = text.split('\n').slice(0, 4);
    setPreview(lines);
  };

  const handleSubmit = () => {
    if (file) {
      // Parse CSV and extract guest data
      onNext({ guestList: preview.map(line => ({ name: line })) });
    } else {
      onNext({ guestList: [] });
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
        Let's add your guests.
      </motion.h1>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-8 mb-12"
      >
        {!manualMode && (
          <div>
            <label className="block mb-4">
              <div className="border-2 border-dashed border-[#333] rounded-none p-12 cursor-pointer hover:border-[#E03553] transition-colors">
                <Upload className="w-8 h-8 text-[#888888] mx-auto mb-3" />
                <p className="text-white font-medium">Upload CSV or Excel file</p>
                <p className="text-[#666666] text-sm mt-1">Expected columns: Name, Email, Phone, Group</p>
              </div>
              <input
                type="file"
                accept=".csv,.xlsx"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            {preview.length > 0 && (
              <div className="bg-[#111111] border border-[#333] rounded-none p-4 text-left">
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.4)', marginBottom: 12, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Preview</p>
                {preview.map((line, i) => (
                  <p key={i} className="text-white text-sm py-1 border-b border-[#222] last:border-0">
                    {line.substring(0, 50)}...
                  </p>
                ))}
              </div>
            )}

            <button
              onClick={() => setManualMode(true)}
              className="text-[#666666] hover:text-white text-sm transition-colors mt-6"
            >
              I'll add them manually →
            </button>
          </div>
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
          className="px-8 py-3 rounded-full text-white text-sm font-medium uppercase tracking-widest bg-gradient-to-r from-[#E03553] to-[#803D81] hover:brightness-110 transition-all"
        >
          Continue →
        </button>

        <button
          onClick={() => onNext({ guestList: [] })}
          className="block mx-auto text-[#666666] hover:text-white text-sm transition-colors"
        >
          Skip for now →
        </button>
      </motion.div>
    </div>
  );
}