import React from 'react';
import { motion } from 'framer-motion';
import { ExternalLink } from 'lucide-react';

export default function WeddingRegistryPage({ weddingDetails, theme, typography }) {
  const content = weddingDetails.registryContent || {};
  const registryLinks = content.registryLinks || [];

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
            marginBottom: '40px',
            textAlign: 'center'
          }}
        >
          Registry
        </motion.h1>

        {content.noGiftsPlease ? (
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
            <p style={{ fontFamily: typography.bodyFont, fontSize: '1.25rem', lineHeight: 1.8 }}>
              Your presence is the greatest gift. No gifts, please.
            </p>
          </motion.div>
        ) : (
          <>
            {content.registryMessage && (
              <motion.p
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                style={{
                  fontFamily: typography.bodyFont,
                  fontSize: '1rem',
                  lineHeight: 1.8,
                  marginBottom: '40px',
                  textAlign: 'center'
                }}
              >
                {content.registryMessage}
              </motion.p>
            )}

            {registryLinks.length > 0 && (
              <div style={{ display: 'grid', gap: '16px' }}>
                {registryLinks.map((registry, i) => (
                  <motion.a
                    key={i}
                    href={registry.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: i * 0.1 }}
                    style={{
                      backgroundColor: theme.darkBg,
                      color: theme.darkText,
                      padding: '24px',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      textDecoration: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.3s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = theme.accent;
                      e.currentTarget.style.color = theme.darkBg;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = theme.darkBg;
                      e.currentTarget.style.color = theme.darkText;
                    }}
                  >
                    <span style={{
                      fontFamily: typography.headingFont,
                      fontSize: '1.125rem',
                      fontWeight: typography.headingWeight
                    }}>
                      {registry.name}
                    </span>
                    <ExternalLink size={18} />
                  </motion.a>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}