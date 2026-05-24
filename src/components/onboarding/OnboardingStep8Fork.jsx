import React from 'react';
import { motion } from 'framer-motion';

const PJS = "'Plus Jakarta Sans', sans-serif";

export default function OnboardingStep8Fork({ onPathA, onPathB, data, theme }) {
  return (
    <div
      className="w-full max-w-5xl text-center"
      style={{ background: 'transparent' }}
    >
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          fontSize: 'clamp(28px, 4vw, 48px)',
          fontWeight: 800,
          color: '#0A0A0A',
          fontFamily: PJS,
          marginBottom: 12,
        }}
      >
        One last thing.
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={{ color: '#555555', fontSize: 16, marginBottom: 64, fontFamily: PJS }}
      >
        Would you like to add more details now or jump straight in?
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-8"
      >
        {/* Card A — Tell us more */}
        <motion.button
          whileHover={{ borderColor: '#E03553' }}
          onClick={onPathA}
          style={{
            textAlign: 'left',
            padding: 32,
            background: '#FFFFFF',
            border: '1px solid #E5E5E5',
            cursor: 'pointer',
            transition: 'border-color 0.2s ease',
          }}
        >
          <h3 style={{ color: '#0A0A0A', fontSize: 18, fontWeight: 700, marginBottom: 12, fontFamily: PJS }}>Tell us more</h3>
          <p style={{ color: '#555555', fontSize: 14, marginBottom: 24, lineHeight: 1.6, fontFamily: PJS }}>
            Upload your guest list, add vendors, set your budget, and give Ava everything she needs to hit the ground running.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
            {['Upload guest list (CSV or manual)', 'Add cultural/religious details', 'Set your budget', 'Add known vendors', 'Upload inspiration photos'].map(item => (
              <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(10,10,10,0.5)', fontSize: 14, fontFamily: PJS }}>
                <span style={{ color: '#E03553', fontWeight: 700, fontSize: 14, lineHeight: 1 }}>—</span> {item}
              </div>
            ))}
          </div>
          <div style={{
            display: 'inline-block',
            background: '#E03553',
            color: '#FFFFFF',
            borderRadius: 999,
            padding: '10px 24px',
            fontSize: 14,
            fontWeight: 600,
            fontFamily: PJS,
          }}>
            Let's do it
          </div>
        </motion.button>

        {/* Card B — Get started now */}
        <motion.button
          whileHover={{ borderColor: '#0A0A0A' }}
          onClick={onPathB}
          style={{
            textAlign: 'left',
            padding: 32,
            background: '#FFFFFF',
            border: '1px solid #E5E5E5',
            cursor: 'pointer',
            transition: 'border-color 0.2s ease',
          }}
        >
          <h3 style={{ color: '#0A0A0A', fontSize: 18, fontWeight: 700, marginBottom: 12, fontFamily: PJS }}>Get started now</h3>
          <p style={{ color: '#555555', fontSize: 14, marginBottom: 24, lineHeight: 1.6, fontFamily: PJS }}>
            Jump straight into your dashboard. Ava will guide you through the key details as you go — no overwhelm.
          </p>
          <p style={{ color: 'rgba(10,10,10,0.35)', fontSize: 13, marginBottom: 24, fontFamily: PJS }}>
            You can always add more later.
          </p>
          <div style={{
            display: 'inline-block',
            background: '#FFFFFF',
            color: '#0A0A0A',
            borderRadius: 999,
            border: '1px solid #0A0A0A',
            padding: '10px 24px',
            fontSize: 14,
            fontWeight: 600,
            fontFamily: PJS,
          }}>
            Let's go
          </div>
        </motion.button>
      </motion.div>
    </div>
  );
}
