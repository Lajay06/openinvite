import React from 'react';
import SectionReveal from '../SectionReveal';
import { isMotionEnabled } from '@/lib/universeStyling';
import { visibleSections } from '@/lib/goodToKnow';

/**
 * WeddingGoodToKnowPage — the guest-facing side of Guest Suite → Good to know
 * (formerly "Policies").
 *
 * D-1b. The dashboard has promised, in its own helper text, that policies
 * marked "Display on website" would appear in "the Policies section of your
 * wedding website and Experience Guide". NEITHER DESTINATION EXISTED.
 * `weddingPolicies` was read by exactly two files in the repo — this page's
 * absence, and `WeddingStylePage` reading `stylingQuestionnaire.enabled` — and
 * nothing anywhere read a policy's `display` flag. A couple could toggle
 * Children, Dress code and Gifts on and none of them reached a single guest.
 *
 * Named "Good to know" rather than "Policies" (owner ruling): policies is the
 * wrong register for a wedding, and "Guest considerations" was unavailable —
 * `PageConsiderations` already means OUR planning advice TO the couple, and
 * `pageKey="guests"` already literally means "considerations about guests".
 * Two different things, opposite directions, deliberately not named alike.
 *
 * The couple's own words lead wherever they wrote any: the option they picked
 * becomes a sentence, and their custom message follows it. Where they wrote
 * nothing, the chosen option still says something useful on its own.
 */

export default function WeddingGoodToKnowPage({ weddingDetails, theme, typography, universeConfig }) {
  const sections = visibleSections(weddingDetails?.weddingPolicies);

  const heading = {
    fontFamily: typography.headingFont,
    fontWeight: typography.headingWeight,
    fontStyle: typography.headingStyle || 'normal',
    color: theme.lightText,
  };
  const body = {
    fontFamily: typography.bodyFont,
    fontSize: '0.9375rem',
    lineHeight: 1.7,
    color: theme.lightText,
    opacity: 0.8,
  };
  const reveal = { universeConfig, disabled: !isMotionEnabled(weddingDetails) };

  return (
    <div style={{ backgroundColor: theme.lightBg, minHeight: '100dvh', padding: '60px 24px' }}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <SectionReveal {...reveal}>
          <h1 style={{ ...heading, fontSize: 'clamp(2rem,5vw,3.5rem)', textAlign: 'center', marginBottom: 48 }}>
            Good to know
          </h1>
        </SectionReveal>

        {sections.map(section => (
          <SectionReveal key={section.key} {...reveal} style={{ marginBottom: 36 }}>
            <h2 style={{ ...heading, fontSize: 'clamp(1.125rem,2.5vw,1.5rem)', margin: '0 0 10px' }}>
              {section.title}
            </h2>
            {section.lines.map((line, i) => (
              <p key={i} style={{ ...body, margin: i === section.lines.length - 1 ? 0 : '0 0 8px' }}>
                {line}
              </p>
            ))}
          </SectionReveal>
        ))}

        {sections.length === 0 && (
          <SectionReveal {...reveal} style={{ textAlign: 'center', padding: '40px 24px' }}>
            <p style={{ ...body, opacity: 0.4, fontStyle: 'italic' }}>
              The couple has not added anything here yet.
            </p>
          </SectionReveal>
        )}
      </div>
    </div>
  );
}
