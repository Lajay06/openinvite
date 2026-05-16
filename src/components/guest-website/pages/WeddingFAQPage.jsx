import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Minus } from 'lucide-react';

export default function WeddingFAQPage({ weddingDetails, theme, typography }) {
  const qna = weddingDetails.qna || [];
  const [openIndex, setOpenIndex] = useState(null);

  return (
    <div style={{ backgroundColor: theme.lightBg, color: theme.lightText, minHeight: '100vh', padding: '60px 24px' }}>
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          style={{
            fontFamily: typography.headingFont,
            fontSize: 'clamp(2rem, 5vw, 3rem)',
            fontWeight: typography.headingWeight,
            marginBottom: '60px',
            textAlign: 'center'
          }}
        >
          FAQ
        </motion.h1>

        {qna.length > 0 ? (
          <div style={{ space: '12px' }}>
            {qna.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: i * 0.05 }}
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
                  <span>{item.question}</span>
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
              </motion.div>
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
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
          </motion.div>
        )}
      </div>
    </div>
  );
}