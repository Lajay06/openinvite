import React from 'react';
import SectionReveal from '../SectionReveal';
import GuestPageHeading from '../GuestPageHeading';
import { isMotionEnabled } from '@/lib/universeStyling';
import { OptionAccordion, OptionAccordionSection } from '@/components/shared/OptionAccordion';

/**
 * WAVE 3 — the accordion pattern, CORE ONLY.
 *
 * The owner's instruction came from a mobile walk-through of a wedding site:
 * "fix the faq page to be simple accordion and do good to know the same as
 * that." This page used to render every question as a filled card on
 * theme.darkBg with a plus/minus toggle; it is now the same simple accordion
 * the celebration step established — a thin rule between questions, a chevron,
 * and room to breathe.
 *
 * CORE ONLY, and that is the correct adoption rather than a compromised one:
 * an FAQ has questions and answers and nothing to select, so pills, the summary
 * chip and "Nothing selected yet" have no referent here. Structure is the core;
 * that periphery only applies where there is something to choose.
 *
 * SKIN COMES FROM THE UNIVERSE, NOT THE DASHBOARD. Every colour and face below
 * is read from `theme`/`typography` and handed to the component as its skin.
 * The couple's universe supplies colour, face and weight — there is no black
 * pill and no Plus Jakarta Sans anywhere on this page.
 *
 * Collapsed-by-default and one-at-a-time were already true here (a single
 * `openIndex` starting null); the component now owns both so they cannot drift.
 */
export default function WeddingFAQPage({ weddingDetails, theme, typography, universeConfig }) {
  const qna = weddingDetails.qna || [];
  const motionOn = isMotionEnabled(weddingDetails);

  return (
    <div style={{ backgroundColor: theme.lightBg, color: theme.lightText, minHeight: '100vh', padding: '60px 24px' }}>
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>
        <SectionReveal universeConfig={universeConfig} disabled={!motionOn}>
          <GuestPageHeading title={"FAQ"} theme={theme} typography={typography} universeConfig={universeConfig} />
        </SectionReveal>

        {qna.length > 0 ? (
          <SectionReveal universeConfig={universeConfig} disabled={!motionOn}>
            <OptionAccordion
              headingSize="1.125rem"
              headingWeight={typography.headingWeight}
              headingStyle={typography.headingStyle || 'normal'}
              faceFamily={typography.headingFont}
              bodyFamily={typography.bodyFont}
              skin={{
                ruleColor: `${theme.accent}33`,
                headingColor: theme.lightText,
                chevronColor: theme.accent,
                mutedColor: theme.lightText,
              }}
            >
              {qna.map((item, i) => (
                <OptionAccordionSection key={i} sectionKey={`q${i}`} title={item.question}>
                  <div style={{
                    fontFamily: typography.bodyFont,
                    fontSize: '1rem',
                    lineHeight: 1.7,
                    whiteSpace: 'pre-wrap',
                    color: theme.lightText,
                  }}>
                    {item.answer}
                  </div>
                </OptionAccordionSection>
              ))}
            </OptionAccordion>
          </SectionReveal>
        ) : (
          <SectionReveal universeConfig={universeConfig} disabled={!motionOn}>
            <p style={{ fontFamily: typography.bodyFont, fontSize: '1.125rem', textAlign: 'center', padding: '60px 40px' }}>
              No FAQs added yet.
            </p>
          </SectionReveal>
        )}
      </div>
    </div>
  );
}
