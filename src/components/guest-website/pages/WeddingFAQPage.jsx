import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Minus } from 'lucide-react';
import SectionReveal from '../SectionReveal';
import GuestPageHeading from '../GuestPageHeading';
import { isMotionEnabled } from '@/lib/universeStyling';

export default function WeddingFAQPage({ weddingDetails, theme, typography, universeConfig }) {
  const qna = weddingDetails.qna || [];
  const [openIndex, setOpenIndex] = useState(null);

  return (
    <div style={{ backgroundColor: theme.lightBg, color: theme.lightText, minHeight: '100vh', padding: '60px 24px' }}>
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>
        <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
          <GuestPageHeading title={"FAQ"} theme={theme} typography={typography} universeConfig={universeConfig} />
        </SectionReveal>

        {qna.length > 0 ? (
          <div style={{ space: '12px' }}>
            {qna.map((item, i) => (
              <SectionReveal
                key={i}
                universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}
                style={{
                  backgroundColor: theme.darkBg,
                  borderRadius: '4px',
                  overflow: 'hidden',
                  marginBottom: '12px'
                }}
              >
                <button
                  onClick={() => setOpenIndex(openIndex === i ? null : i)}
                  style={{
                    width: '100%',
                    padding: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: theme.darkBg,
                    border: 'none',
                    color: theme.darkText,
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    fontFamily: typography.headingFont,
                    fontSize: '1.125rem',
                    fontWeight: typography.headingWeight,
                    textAlign: 'left'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = `${theme.accent}10`}
                  onMouseLeave={(e) => e.target.style.backgroundColor = theme.darkBg}
                >
                  {/* A card title, and now marked as one — the pattern ruled
                      and shipped in #552. It is also what keeps the universe's
                      display face on this page once the serif title goes. */}
                  <h2 style={{ font: 'inherit', margin: 0, fontWeight: 'inherit' }}>{item.question}</h2>
                  {openIndex === i ? (
                    <Minus size={20} style={{ color: theme.accent, flexShrink: 0 }} />
                  ) : (
                    <Plus size={20} style={{ color: theme.accent, flexShrink: 0 }} />
                  )}
                </button>

                {openIndex === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    style={{
                      borderTop: `1px solid ${theme.accent}20`,
                      padding: '20px',
                      backgroundColor: `${theme.accent}05`,
                      fontFamily: typography.bodyFont,
                      fontSize: '1rem',
                      lineHeight: 1.7,
                      whiteSpace: 'pre-wrap'
                    }}
                  >
                    {item.answer}
                  </motion.div>
                )}
              </SectionReveal>
            ))}
          </div>
        ) : (
          <SectionReveal
            universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}
            style={{
              backgroundColor: theme.darkBg,
              color: theme.darkText,
              padding: '60px 40px',
              borderRadius: '4px',
              textAlign: 'center'
            }}
          >
            <p style={{ fontFamily: typography.bodyFont, fontSize: '1.125rem' }}>
              No FAQs added yet.
            </p>
          </SectionReveal>
        )}
      </div>
    </div>
  );
}