import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, X } from 'lucide-react';
import { FAITH_OPTIONS, FAITH_FOR_INTERFAITH, CULTURE_REGIONS, CULTURE_CROSS_CUTTING } from '@/lib/weddingThemeOptions';

const PJS = "'Plus Jakarta Sans', sans-serif";

function Pill({ label, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '6px 16px',
        borderRadius: 999,
        border: `1px solid ${selected ? '#0A0A0A' : 'rgba(10,10,10,0.18)'}`,
        background: selected ? '#0A0A0A' : 'transparent',
        color: selected ? '#FFFFFF' : '#0A0A0A',
        fontSize: 12,
        fontWeight: 600,
        fontFamily: PJS,
        cursor: 'pointer',
        transition: 'all 0.15s',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  );
}

// Points at the same FAITH_OPTIONS/CULTURE_REGIONS/CULTURE_CROSS_CUTTING
// source as EventDetails' ThemeSection.jsx (src/lib/weddingThemeOptions.js)
// instead of the free-text-only textarea this step used to be — the couple's
// answer here now lands in the same structured theme.faith/theme.culture[]
// fields ThemeSection.jsx itself reads/writes, not just theme.cultureOther.
export default function OnboardingPathACultural({ onNext, data }) {
  const [faith, setFaithState] = useState('');
  const [interfaithPicks, setInterfaithPicks] = useState([]);
  const [culture, setCulture] = useState([]);
  const [cultureOther, setCultureOther] = useState('');
  const [showCultureInput, setShowCultureInput] = useState(false);

  const setFaith = (value) => {
    setFaithState(prev => (prev === value ? '' : value));
    if (value !== 'Interfaith') setInterfaithPicks([]);
  };

  const toggleInterfaithPick = (value) => {
    setInterfaithPicks(prev => {
      if (prev.includes(value)) return prev.filter(v => v !== value);
      if (prev.length >= 2) return prev;
      return [...prev, value];
    });
  };

  const toggleCulture = (value) =>
    setCulture(prev => (prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]));

  const handleSubmit = () => {
    onNext({
      theme: {
        faith,
        faithSecondary: faith === 'Interfaith' ? interfaithPicks.join(' and ') : '',
        culture,
        cultureOther,
      },
    });
  };

  const handleSkip = () => onNext({ theme: null });

  return (
    <div className="w-full max-w-3xl">
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="font-bold text-[#0A0A0A] mb-3"
        style={{ fontSize: 'clamp(28px, 4vw, 48px)' }}
      >
        Any cultural or religious traditions?
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.05 }}
        style={{ fontSize: 14, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, margin: '0 0 32px' }}
      >
        Separate questions — you can be culturally Indian and non-religious, for example. This shapes Ava's suggestions later.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-left mb-8"
      >
        <p style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS, margin: '0 0 12px' }}>Faith or religion</p>
        <div className="flex flex-wrap gap-2">
          {FAITH_OPTIONS.map(opt => (
            <Pill key={opt} label={opt} selected={faith === opt} onClick={() => setFaith(opt)} />
          ))}
        </div>
        {faith === 'Interfaith' && (
          <div style={{ marginTop: 14, padding: '12px 14px', border: '1px solid rgba(10,10,10,0.08)', background: '#FAFAFA' }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: 'rgba(10,10,10,0.6)', fontFamily: PJS, margin: '0 0 8px' }}>
              Select the two faiths — {interfaithPicks.length}/2 selected
            </p>
            <div className="flex flex-wrap gap-2">
              {FAITH_FOR_INTERFAITH.map(opt => (
                <Pill key={opt} label={opt} selected={interfaithPicks.includes(opt)} onClick={() => toggleInterfaithPick(opt)} />
              ))}
            </div>
          </div>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="text-left mb-10"
      >
        <p style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS, margin: '0 0 12px' }}>Cultures and traditions</p>
        <div className="flex flex-col gap-4 mb-3" style={{ maxHeight: 260, overflowY: 'auto', paddingRight: 4 }}>
          {CULTURE_REGIONS.map(r => (
            <div key={r.region}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: 'rgba(10,10,10,0.6)', fontFamily: PJS, margin: '0 0 8px' }}>{r.region}</p>
              <div className="flex flex-wrap gap-2">
                {r.items.map(opt => (
                  <Pill key={opt} label={opt} selected={culture.includes(opt)} onClick={() => toggleCulture(opt)} />
                ))}
              </div>
            </div>
          ))}
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: 'rgba(10,10,10,0.6)', fontFamily: PJS, margin: '0 0 8px' }}>Also relevant</p>
            <div className="flex flex-wrap gap-2">
              {CULTURE_CROSS_CUTTING.map(opt => (
                <Pill key={opt} label={opt} selected={culture.includes(opt)} onClick={() => toggleCulture(opt)} />
              ))}
            </div>
          </div>
        </div>

        {!showCultureInput && !cultureOther ? (
          <button
            type="button"
            onClick={() => setShowCultureInput(true)}
            className="flex items-center gap-1"
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'rgba(10,10,10,0.45)', fontFamily: PJS, fontWeight: 600, padding: 0 }}
          >
            <Plus size={13} /> Add your own
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <input
              value={cultureOther}
              onChange={(e) => setCultureOther(e.target.value)}
              placeholder="e.g. Nigerian, Filipino-Australian…"
              className="bg-transparent border-b border-[rgba(10,10,10,0.18)] focus:outline-none focus:border-[#E03553] transition-colors"
              style={{ maxWidth: 280, padding: '6px 2px', fontSize: 13, fontFamily: PJS, color: '#0A0A0A' }}
            />
            <button
              type="button"
              onClick={() => { setCultureOther(''); setShowCultureInput(false); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.45)', padding: 0, display: 'flex', alignItems: 'center' }}
            >
              <X size={14} />
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
          className="px-8 py-3 rounded-full text-white text-sm font-medium tracking-widest bg-[#E03553] hover:bg-black active:bg-neutral-900 transition-colors duration-150"
        >
          Continue →
        </button>

        <button
          onClick={handleSkip}
          className="block text-[rgba(10,10,10,0.6)] hover:text-[#0A0A0A] text-sm transition-colors"
        >
          Skip for now →
        </button>
      </motion.div>
    </div>
  );
}
