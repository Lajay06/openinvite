import React from 'react';
import SectionReveal from '../SectionReveal';
import { isMotionEnabled } from '@/lib/universeStyling';
import EditorialSectionKicker from '../layouts/EditorialSectionKicker';
import MinimalSectionMark from '../layouts/MinimalSectionMark';
import KyotoSectionMark from '../layouts/KyotoSectionMark';
import VerticalRule from '../layouts/VerticalRule';
import BrooklynSectionMark from '../layouts/BrooklynSectionMark';
import BaliSectionMark from '../layouts/BaliSectionMark';
import WaveDivider from '../layouts/WaveDivider';
import ParisSectionMark from '../layouts/ParisSectionMark';
import CapriSectionMark from '../layouts/CapriSectionMark';
import MykonosSectionMark from '../layouts/MykonosSectionMark';
import CubeBlock from '../layouts/CubeBlock';
import CapeTownSectionMark from '../layouts/CapeTownSectionMark';
import VineRule from '../layouts/VineRule';
import UniverseBlocks from '../blocks/UniverseBlocks';
import AmalfiSectionMark from '../layouts/AmalfiSectionMark';
import SedonaSectionMark from '../layouts/SedonaSectionMark';
import AspenSectionMark from '../layouts/AspenSectionMark';
import TajSectionMark from '../layouts/TajSectionMark';
import HavanaSectionMark from '../layouts/HavanaSectionMark';
import EdinburghSectionMark from '../layouts/EdinburghSectionMark';
import MonacoSectionMark from '../layouts/MonacoSectionMark';
import FlorenceSectionMark from '../layouts/FlorenceSectionMark';
import SeoulSectionMark from '../layouts/SeoulSectionMark';
import ShanghaiSectionMark from '../layouts/ShanghaiSectionMark';

/**
 * GenericStoryComposition (feat/universes-expansion-10) — the shared
 * single-column story composition Capri/Mykonos already use: SectionMark
 * → story text → photo grid → milestones. Same rationale as
 * GenericMastheadHero in WeddingHomePage.jsx — the universe's own
 * SectionMark carries the visual distinctness, not a bespoke DOM shape.
 */
function GenericStoryComposition({ SectionMark, weddingDetails, theme, typography, universeConfig, copy, storyText, photos, milestones }) {
  const motionEnabled = isMotionEnabled(weddingDetails);
  return (
    <div style={{ backgroundColor: theme.lightBg, color: theme.lightText, minHeight: '100vh', padding: '90px 32px' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <SectionReveal universeConfig={universeConfig} disabled={!motionEnabled}>
          <SectionMark kicker={copy.storyKicker} theme={theme} typography={typography} accentColor={theme.accent} />
        </SectionReveal>

        {storyText && (
          <SectionReveal universeConfig={universeConfig} disabled={!motionEnabled} style={{ fontFamily: typography.headingFont, fontSize: 'clamp(1.15rem, 2.2vw, 1.375rem)', lineHeight: 1.7, marginBottom: 56, whiteSpace: 'pre-wrap' }}>
            {storyText}
          </SectionReveal>
        )}

        {photos.length > 0 && (
          <div style={{ marginBottom: 56 }}>
            <h2 style={{ fontFamily: typography.headingFont, fontWeight: typography.headingWeight, fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', marginBottom: 36 }}>Moments</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '20px' }}>
              {photos.map((photo, i) => (
                <SectionReveal key={i} universeConfig={universeConfig} disabled={!motionEnabled}>
                  <img src={photo} alt="Wedding moment" style={{ width: '100%', height: '280px', objectFit: 'cover' }} />
                </SectionReveal>
              ))}
            </div>
          </div>
        )}

        {milestones.length > 0 && (
          <div>
            <h2 style={{ fontFamily: typography.headingFont, fontWeight: typography.headingWeight, fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', marginBottom: 36 }}>Our journey</h2>
            {milestones.map((milestone, i) => (
              <SectionReveal key={i} universeConfig={universeConfig} disabled={!motionEnabled} style={{ marginBottom: 28 }}>
                <div style={{ fontFamily: typography.bodyFont, fontSize: '0.875rem', fontWeight: 700, color: theme.accent, marginBottom: 6 }}>{milestone.date}</div>
                <div style={{ fontFamily: typography.bodyFont, fontSize: '1rem', lineHeight: 1.65 }}>{milestone.text}</div>
              </SectionReveal>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function WeddingOurStoryPageContent({ weddingDetails, theme, typography, universeConfig }) {
  const content = weddingDetails.ourStoryContent || {};
  const storyText = content.storyText || '';
  const photos = content.photos || [];
  const milestones = content.milestones || [];
  const isEditorial = universeConfig?.layout === 'editorial-masthead';
  const isMinimal = universeConfig?.layout === 'aman-minimal';
  const isKyoto = universeConfig?.layout === 'kyoto-vertical';
  const isBrooklyn = universeConfig?.layout === 'brooklyn-offgrid';
  const isBali = universeConfig?.layout === 'bali-organic';
  const isParis = universeConfig?.layout === 'paris-couture';
  const isCapri = universeConfig?.layout === 'capri-citrus';
  const isMykonos = universeConfig?.layout === 'mykonos-whitewash';
  const isCapeTown = universeConfig?.layout === 'capetown-estate';
  const isAmalfi = universeConfig?.layout === 'amalfi-citrus';
  const isSedona = universeConfig?.layout === 'sedona-mesa';
  const isAspen = universeConfig?.layout === 'aspen-lodge';
  const isTaj = universeConfig?.layout === 'taj-pavilion';
  const isHavana = universeConfig?.layout === 'havana-deco';
  const isEdinburgh = universeConfig?.layout === 'edinburgh-estate';
  const isMonaco = universeConfig?.layout === 'monaco-marina';
  const isFlorence = universeConfig?.layout === 'florence-editorial';
  const isSeoul = universeConfig?.layout === 'seoul-glass';
  const isShanghai = universeConfig?.layout === 'shanghai-glamour';
  const copy = universeConfig?.copy || {};

  const genericStoryProps = { weddingDetails, theme, typography, universeConfig, copy, storyText, photos, milestones };
  if (isAmalfi) return <GenericStoryComposition SectionMark={AmalfiSectionMark} {...genericStoryProps} />;
  if (isSedona) return <GenericStoryComposition SectionMark={SedonaSectionMark} {...genericStoryProps} />;
  if (isAspen) return <GenericStoryComposition SectionMark={AspenSectionMark} {...genericStoryProps} />;
  if (isTaj) return <GenericStoryComposition SectionMark={TajSectionMark} {...genericStoryProps} />;
  if (isHavana) return <GenericStoryComposition SectionMark={HavanaSectionMark} {...genericStoryProps} />;
  if (isEdinburgh) return <GenericStoryComposition SectionMark={EdinburghSectionMark} {...genericStoryProps} />;
  if (isMonaco) return <GenericStoryComposition SectionMark={MonacoSectionMark} {...genericStoryProps} />;
  if (isFlorence) return <GenericStoryComposition SectionMark={FlorenceSectionMark} {...genericStoryProps} />;
  if (isSeoul) return <GenericStoryComposition SectionMark={SeoulSectionMark} {...genericStoryProps} />;
  if (isShanghai) return <GenericStoryComposition SectionMark={ShanghaiSectionMark} {...genericStoryProps} />;

  if (isParis) {
    return (
      <div style={{ backgroundColor: theme.lightBg, color: theme.lightText, minHeight: '100vh', padding: '110px 40px' }}>
        <div style={{ maxWidth: 680, margin: '0 auto', textAlign: 'center' }}>
          <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
            <ParisSectionMark kicker={copy.storyKicker} theme={theme} typography={typography} />
          </SectionReveal>

          {storyText && (
            <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)} style={{ fontFamily: typography.bodyFont, fontSize: 'clamp(1rem, 2vw, 1.1875rem)', lineHeight: 1.85, marginBottom: 72, whiteSpace: 'pre-wrap' }}>
              {storyText}
            </SectionReveal>
          )}

          {photos.length > 0 && (
            <div style={{ marginBottom: 72 }}>
              <h2 style={{ fontFamily: typography.headingFont, fontWeight: typography.headingWeight, fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', marginBottom: 40 }}>Moments</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
                {photos.map((photo, i) => (
                  <SectionReveal key={i} universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
                    <img src={photo} alt="Wedding moment" style={{ width: '100%', height: '290px', objectFit: 'cover' }} />
                  </SectionReveal>
                ))}
              </div>
            </div>
          )}

          {milestones.length > 0 && (
            <div style={{ textAlign: 'left', maxWidth: 480, margin: '0 auto' }}>
              <h2 style={{ fontFamily: typography.headingFont, fontWeight: typography.headingWeight, fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', marginBottom: 40, textAlign: 'center' }}>Our journey</h2>
              {milestones.map((milestone, i) => (
                <SectionReveal key={i} universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)} style={{ marginBottom: 28, paddingBottom: 28, borderBottom: i < milestones.length - 1 ? `1px solid ${theme.lightText}14` : 'none' }}>
                  <div style={{ fontFamily: typography.bodyFont, fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: theme.accent, marginBottom: 6 }}>{milestone.date}</div>
                  <div style={{ fontFamily: typography.bodyFont, fontSize: '1rem', lineHeight: 1.6 }}>{milestone.text}</div>
                </SectionReveal>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (isCapri) {
    return (
      <div style={{ backgroundColor: theme.lightBg, color: theme.lightText, minHeight: '100vh', padding: '90px 32px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
            <CapriSectionMark kicker={copy.storyKicker} theme={theme} typography={typography} accentColor={theme.accent} />
          </SectionReveal>

          {storyText && (
            <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)} style={{ fontFamily: typography.headingFont, fontSize: 'clamp(1.15rem, 2.2vw, 1.375rem)', lineHeight: 1.7, marginBottom: 56, whiteSpace: 'pre-wrap' }}>
              {storyText}
            </SectionReveal>
          )}

          {photos.length > 0 && (
            <div style={{ marginBottom: 56 }}>
              <h2 style={{ fontFamily: typography.headingFont, fontWeight: typography.headingWeight, fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', marginBottom: 36 }}>Moments</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '20px' }}>
                {photos.map((photo, i) => (
                  <SectionReveal key={i} universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
                    <img src={photo} alt="Wedding moment" style={{ width: '100%', height: '280px', objectFit: 'cover' }} />
                  </SectionReveal>
                ))}
              </div>
            </div>
          )}

          {milestones.length > 0 && (
            <div>
              <h2 style={{ fontFamily: typography.headingFont, fontWeight: typography.headingWeight, fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', marginBottom: 36 }}>Our journey</h2>
              {milestones.map((milestone, i) => (
                <SectionReveal key={i} universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)} style={{ marginBottom: 28 }}>
                  <div style={{ fontFamily: typography.bodyFont, fontSize: '0.875rem', fontWeight: 700, color: theme.accent, marginBottom: 6 }}>{milestone.date}</div>
                  <div style={{ fontFamily: typography.bodyFont, fontSize: '1rem', lineHeight: 1.65 }}>{milestone.text}</div>
                </SectionReveal>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (isMykonos) {
    return (
      <div style={{ backgroundColor: theme.lightBg, color: theme.lightText, minHeight: '100vh', padding: '130px 48px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
            <MykonosSectionMark kicker={copy.storyKicker} theme={theme} typography={typography} accentColor={theme.accent} />
          </SectionReveal>

          {storyText && (
            <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)} style={{ fontFamily: typography.bodyFont, fontSize: 'clamp(1rem, 2vw, 1.1875rem)', lineHeight: 1.8, marginBottom: 88, whiteSpace: 'pre-wrap' }}>
              {storyText}
            </SectionReveal>
          )}

          {photos.length > 0 && (
            <div style={{ marginBottom: 88 }}>
              <h2 style={{ fontFamily: typography.headingFont, fontWeight: typography.headingWeight, fontSize: 'clamp(1.5rem, 3.5vw, 2.25rem)', letterSpacing: '-0.01em', marginBottom: 40 }}>Moments</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
                {photos.map((photo, i) => (
                  <SectionReveal key={i} universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
                    <img src={photo} alt="Wedding moment" style={{ width: '100%', height: '300px', objectFit: 'cover' }} />
                  </SectionReveal>
                ))}
              </div>
            </div>
          )}

          {milestones.length > 0 && (
            <div>
              <h2 style={{ fontFamily: typography.headingFont, fontWeight: typography.headingWeight, fontSize: 'clamp(1.5rem, 3.5vw, 2.25rem)', letterSpacing: '-0.01em', marginBottom: 40 }}>Our journey</h2>
              {milestones.map((milestone, i) => (
                <SectionReveal key={i} universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)} style={{ display: 'flex', gap: 18, marginBottom: 36 }}>
                  <CubeBlock color={theme.accent} width={8} height={8} style={{ marginTop: 6, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontFamily: typography.bodyFont, fontSize: '0.8125rem', fontWeight: 600, color: theme.accent, marginBottom: 6 }}>{milestone.date}</div>
                    <div style={{ fontFamily: typography.bodyFont, fontSize: '1rem', lineHeight: 1.7 }}>{milestone.text}</div>
                  </div>
                </SectionReveal>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (isCapeTown) {
    return (
      <div style={{ backgroundColor: theme.lightBg, color: theme.lightText, minHeight: '100vh', padding: '100px 48px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
            <CapeTownSectionMark kicker={copy.storyKicker} theme={theme} typography={typography} />
          </SectionReveal>

          {storyText && (
            <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)} style={{ fontFamily: typography.headingFont, fontSize: 'clamp(1.1rem, 2.2vw, 1.3rem)', lineHeight: 1.85, marginBottom: 72, whiteSpace: 'pre-wrap' }}>
              {storyText}
            </SectionReveal>
          )}

          {photos.length > 0 && (
            <div style={{ marginBottom: 72 }}>
              <h2 style={{ fontFamily: typography.headingFont, fontWeight: typography.headingWeight, fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', marginBottom: 40 }}>Moments</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
                {photos.map((photo, i) => (
                  <SectionReveal key={i} universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
                    <img src={photo} alt="Wedding moment" style={{ width: '100%', height: '300px', objectFit: 'cover' }} />
                  </SectionReveal>
                ))}
              </div>
            </div>
          )}

          {milestones.length > 0 && (
            <div style={{ maxWidth: 520 }}>
              <h2 style={{ fontFamily: typography.headingFont, fontWeight: typography.headingWeight, fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', marginBottom: 40 }}>Our journey</h2>
              {milestones.map((milestone, i) => (
                <SectionReveal key={i} universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
                  {i > 0 && <VineRule color={theme.lightText} opacity={0.35} style={{ maxWidth: 140, margin: '28px 0' }} />}
                  <div style={{ fontFamily: typography.bodyFont, fontSize: '0.8125rem', fontWeight: 600, letterSpacing: '0.04em', color: theme.accent, marginBottom: 6 }}>{milestone.date}</div>
                  <div style={{ fontFamily: typography.bodyFont, fontSize: '1rem', lineHeight: 1.7 }}>{milestone.text}</div>
                </SectionReveal>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (isKyoto) {
    return (
      <div style={{ backgroundColor: theme.lightBg, color: theme.lightText, minHeight: '100vh', padding: '120px 48px' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
            <KyotoSectionMark kicker={copy.storyKicker} theme={theme} typography={typography} />
          </SectionReveal>

          {storyText && (
            <SectionReveal
              universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}
              style={{ fontFamily: typography.headingFont, fontSize: 'clamp(1.05rem, 2vw, 1.3rem)', lineHeight: 2.1, marginBottom: 96, whiteSpace: 'pre-wrap' }}
            >
              {storyText}
            </SectionReveal>
          )}

          {photos.length > 0 && (
            <div style={{ marginBottom: 96 }}>
              <h2 style={{ fontFamily: typography.headingFont, fontWeight: typography.headingWeight, fontSize: 'clamp(1.5rem, 3vw, 2rem)', letterSpacing: '0.01em', marginBottom: 48 }}>Moments</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '32px' }}>
                {photos.map((photo, i) => (
                  <SectionReveal key={i} universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
                    <img src={photo} alt="Wedding moment" style={{ width: '100%', height: '300px', objectFit: 'cover' }} />
                  </SectionReveal>
                ))}
              </div>
            </div>
          )}

          {milestones.length > 0 && (
            <div>
              <h2 style={{ fontFamily: typography.headingFont, fontWeight: typography.headingWeight, fontSize: 'clamp(1.5rem, 3vw, 2rem)', letterSpacing: '0.01em', marginBottom: 48 }}>Our journey</h2>
              {milestones.map((milestone, i) => (
                <SectionReveal key={i} universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)} style={{ display: 'flex', gap: 24, marginBottom: 40 }}>
                  <VerticalRule color={theme.accent} opacity={0.5} height={44} thickness={1} style={{ flexShrink: 0, marginTop: 4 }} />
                  <div>
                    <div style={{ fontFamily: typography.headingFont, fontSize: '0.875rem', color: theme.accent, marginBottom: 6 }}>{milestone.date}</div>
                    <div style={{ fontFamily: typography.bodyFont, fontSize: '1rem', lineHeight: 1.7 }}>{milestone.text}</div>
                  </div>
                </SectionReveal>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (isBrooklyn) {
    return (
      <div style={{ backgroundColor: theme.lightBg, color: theme.lightText, minHeight: '100vh', padding: '80px 32px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
            <BrooklynSectionMark kicker={copy.storyKicker} theme={theme} typography={typography} accentColor={theme.accent} />
          </SectionReveal>

          {storyText && (
            <SectionReveal
              universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}
              style={{ fontFamily: typography.bodyFont, fontSize: 'clamp(1.05rem, 2vw, 1.25rem)', lineHeight: 1.75, marginBottom: 64, maxWidth: 640, whiteSpace: 'pre-wrap' }}
            >
              {storyText}
            </SectionReveal>
          )}

          {photos.length > 0 && (
            <div style={{ marginBottom: 64 }}>
              <h2 style={{ fontFamily: typography.headingFont, fontWeight: typography.headingWeight, fontSize: 'clamp(2rem, 5vw, 3rem)', marginBottom: 32 }}>Moments</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                {photos.map((photo, i) => (
                  <SectionReveal key={i} universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
                    <img src={photo} alt="Wedding moment" style={{ width: '100%', height: '280px', objectFit: 'cover' }} />
                  </SectionReveal>
                ))}
              </div>
            </div>
          )}

          {milestones.length > 0 && (
            <div>
              <h2 style={{ fontFamily: typography.headingFont, fontWeight: typography.headingWeight, fontSize: 'clamp(2rem, 5vw, 3rem)', marginBottom: 32 }}>The story so far</h2>
              <div style={{ maxWidth: 640 }}>
                {milestones.map((milestone, i) => (
                  <SectionReveal
                    key={i} universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}
                    style={{ paddingLeft: 20, borderLeft: `4px solid ${theme.accent}`, marginBottom: 28, paddingBottom: 4 }}
                  >
                    <div style={{ fontFamily: typography.bodyFont, fontSize: '0.8125rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: theme.accent, marginBottom: 6 }}>{milestone.date}</div>
                    <div style={{ fontFamily: typography.bodyFont, fontSize: '1rem', lineHeight: 1.6 }}>{milestone.text}</div>
                  </SectionReveal>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (isBali) {
    return (
      <div style={{ backgroundColor: theme.lightBg, color: theme.lightText, minHeight: '100vh', padding: '90px 40px' }}>
        <div style={{ maxWidth: 780, margin: '0 auto' }}>
          <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
            <BaliSectionMark kicker={copy.storyKicker} theme={theme} typography={typography} />
          </SectionReveal>

          {storyText && (
            <SectionReveal
              universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}
              style={{ fontFamily: typography.headingFont, fontSize: 'clamp(1.1rem, 2.2vw, 1.375rem)', lineHeight: 1.85, marginBottom: 56, whiteSpace: 'pre-wrap' }}
            >
              {storyText}
            </SectionReveal>
          )}

          {(storyText || photos.length > 0) && <WaveDivider color={theme.lightText} opacity={0.3} height={18} style={{ maxWidth: 160, marginBottom: 56 }} />}

          {photos.length > 0 && (
            <div style={{ marginBottom: 56 }}>
              <h2 style={{ fontFamily: typography.headingFont, fontWeight: typography.headingWeight, fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', marginBottom: 40 }}>Moments</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
                {photos.map((photo, i) => (
                  <SectionReveal key={i} universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
                    <img src={photo} alt="Wedding moment" style={{ width: '100%', height: '300px', objectFit: 'cover' }} />
                  </SectionReveal>
                ))}
              </div>
            </div>
          )}

          {milestones.length > 0 && (
            <div>
              <h2 style={{ fontFamily: typography.headingFont, fontWeight: typography.headingWeight, fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', marginBottom: 40 }}>Our journey</h2>
              {milestones.map((milestone, i) => (
                <SectionReveal key={i} universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)} style={{ marginBottom: 32 }}>
                  <div style={{ fontFamily: typography.bodyFont, fontSize: '0.875rem', color: theme.accent, marginBottom: 6 }}>{milestone.date}</div>
                  <div style={{ fontFamily: typography.bodyFont, fontSize: '1rem', lineHeight: 1.7 }}>{milestone.text}</div>
                </SectionReveal>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  const containerMaxWidth = isMinimal ? '620px' : isEditorial ? '900px' : '800px';
  const containerMargin = isEditorial ? '0 0 0 auto' : '0 auto';
  const containerPadding = isMinimal ? '110px 40px' : isEditorial ? '90px 40px' : '60px 24px';

  return (
    <div style={{ backgroundColor: theme.lightBg, color: theme.lightText, minHeight: '100vh', padding: containerPadding }}>
      <div style={{ maxWidth: containerMaxWidth, margin: containerMargin }}>
        {isMinimal && (
          <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
            <MinimalSectionMark kicker={copy.storyKicker} theme={theme} typography={typography} />
          </SectionReveal>
        )}
        {isEditorial && (
          <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
            <EditorialSectionKicker kicker={copy.storyKicker} theme={theme} typography={typography} />
          </SectionReveal>
        )}

        {/* Story text */}
        {storyText && (
          <SectionReveal
            universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}
            style={{
              fontFamily: isMinimal ? typography.headingFont : isEditorial ? typography.headingFont : typography.bodyFont,
              fontSize: isMinimal ? 'clamp(1.15rem, 2.2vw, 1.5rem)' : isEditorial ? 'clamp(1.25rem, 2.6vw, 1.75rem)' : 'clamp(1rem, 2vw, 1.125rem)',
              fontStyle: isEditorial ? 'italic' : 'normal',
              lineHeight: isMinimal ? 1.75 : isEditorial ? 1.55 : 1.8,
              textAlign: isMinimal ? 'center' : 'left',
              marginBottom: isMinimal ? '88px' : '60px',
              whiteSpace: 'pre-wrap'
            }}
          >
            {storyText}
          </SectionReveal>
        )}

        {/* Photo gallery */}
        {photos.length > 0 && (
          <div style={{ marginBottom: isMinimal ? '88px' : '60px' }}>
            {isMinimal ? (
              <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
                <h2 style={{ fontFamily: typography.headingFont, fontWeight: typography.headingWeight, fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)', marginBottom: 48, textAlign: 'center' }}>
                  Moments
                </h2>
              </SectionReveal>
            ) : isEditorial ? (
              <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
                <h2 style={{ fontFamily: typography.headingFont, fontWeight: typography.headingWeight, fontSize: 'clamp(2rem, 5vw, 3.25rem)', marginBottom: 40, textAlign: 'left' }}>
                  Moments
                </h2>
              </SectionReveal>
            ) : (
              <h2
                style={{
                  fontFamily: typography.headingFont,
                  fontSize: 'clamp(1.5rem, 4vw, 2.25rem)',
                  fontWeight: typography.headingWeight,
                  marginBottom: '40px',
                  textAlign: 'center'
                }}
              >
                Moments
              </h2>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px' }}>
              {photos.map((photo, i) => (
                <SectionReveal key={i} universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
                  <img
                    src={photo}
                    alt="Wedding moment"
                    style={{ width: '100%', height: '300px', objectFit: 'cover', borderRadius: '4px' }}
                  />
                </SectionReveal>
              ))}
            </div>
          </div>
        )}

        {/* Timeline */}
        {milestones.length > 0 && (
          <div>
            {isMinimal ? (
              <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
                <h2 style={{ fontFamily: typography.headingFont, fontWeight: typography.headingWeight, fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)', marginBottom: 48, textAlign: 'center' }}>
                  Our journey
                </h2>
              </SectionReveal>
            ) : isEditorial ? (
              <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
                <h2 style={{ fontFamily: typography.headingFont, fontWeight: typography.headingWeight, fontSize: 'clamp(2rem, 5vw, 3.25rem)', marginBottom: 40, textAlign: 'left' }}>
                  Our journey
                </h2>
              </SectionReveal>
            ) : (
              <h2
                style={{
                  fontFamily: typography.headingFont,
                  fontSize: 'clamp(1.5rem, 4vw, 2.25rem)',
                  fontWeight: typography.headingWeight,
                  marginBottom: '40px',
                  textAlign: 'center'
                }}
              >
                Our Journey
              </h2>
            )}
            <div style={{ maxWidth: '500px', margin: isEditorial ? '0' : '0 auto' }}>
              {milestones.map((milestone, i) => (
                <SectionReveal
                  key={i}
                  universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}
                  style={{
                    display: 'flex',
                    gap: '24px',
                    marginBottom: '32px',
                    position: 'relative',
                    paddingLeft: '40px'
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      width: '12px',
                      height: '12px',
                      backgroundColor: theme.accent,
                      borderRadius: '50%',
                      marginTop: '4px'
                    }}
                  />
                  <div>
                    <div
                      style={{
                        fontFamily: typography.headingFont,
                        fontSize: '0.875rem',
                        fontWeight: typography.headingWeight,
                        color: theme.accent,
                        marginBottom: '4px'
                      }}
                    >
                      {milestone.date}
                    </div>
                    <div
                      style={{
                        fontFamily: typography.bodyFont,
                        fontSize: '1rem',
                        fontWeight: typography.bodyWeight,
                        lineHeight: 1.6
                      }}
                    >
                      {milestone.text}
                    </div>
                  </div>
                </SectionReveal>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// See WeddingHomePage.jsx for why this wraps at the export boundary rather
// than editing every isXxx branch above.
export default function WeddingOurStoryPage(props) {
  return (
    <>
      <WeddingOurStoryPageContent {...props} />
      <UniverseBlocks
        blocks={props.weddingDetails?.ourStoryContent?.blocks}
        weddingDetails={props.weddingDetails}
        theme={props.theme}
        typography={props.typography}
        universeConfig={props.universeConfig}
        editable={props.editable}
        onRequestInsert={props.onRequestInsert}
        onMoveBlock={props.onMoveBlock}
        onDeleteBlock={props.onDeleteBlock}
        onSelectBlock={props.onSelectBlock}
        selectedBlockId={props.selectedBlockId}
      />
    </>
  );
}
