import React from 'react';
import { ExternalLink, Share2, Palette, LayoutTemplate, Sparkles, Clock, HelpCircle, Gift, Hotel, Car, MapPin, ScrollText, BarChart2, Monitor } from 'lucide-react';
import Screen from '../../shell/Screen';
import { Row, RowGroup, PillButton, StatusPill, Skeleton, ErrorState, SmartImage, PanelCard } from '../../ui';

/**
 * Site: a large preview of the guest site in a rounded frame, the universe
 * and live status, share and view, then rows into the guest-suite editors
 * (in the app) and the design tools (desktop).
 */
export default function SiteScreen({ universeName, isLive, siteUrl, previewImage, coupleName, onView, onShare, onOpen, onOpenDesktop, loading, error, onRetry }) {
  return (
    <Screen title="Site" bell>
      <div className="oi-m-stack oi-m-stack--24">
        {error && !loading ? <ErrorState onRetry={onRetry} /> : loading ? <Skeleton kind="hero" /> : (
          <div className="oi-m-card oi-m-card--flush">
            <div style={{ position: 'relative', padding: '12px 12px 0' }}>
              <div style={{ position: 'relative', borderRadius: 'var(--m-r-image)', overflow: 'hidden', background: 'var(--m-ink)', aspectRatio: '4 / 5' }}>
                <SmartImage src={previewImage} alt={universeName ? `${universeName} universe` : 'Your site'} width={340} ratio="4/5" square eager tone="ink" />
                <div className="oi-m-hero__scrim" />
                <div style={{ position: 'absolute', left: 20, right: 20, bottom: 20, color: '#FFFFFF' }}>
                  <div className="oi-m-hero__label">{universeName || 'Choose a universe'}</div>
                  <div className="oi-m-hero__title" style={{ fontSize: 26, lineHeight: '32px' }}>{coupleName || 'Your wedding'}</div>
                </div>
                <div style={{ position: 'absolute', top: 12, right: 12 }}><StatusPill tone={isLive ? 'ok' : 'light'}>{isLive ? 'Live' : 'Draft'}</StatusPill></div>
              </div>
            </div>
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {siteUrl ? <p className="oi-m-meta" style={{ overflowWrap: 'anywhere' }}>{siteUrl.replace(/^https?:\/\//, '')}</p> : <p className="oi-m-meta">Your site does not have an address yet. Choose one in the studio on desktop.</p>}
              <div style={{ display: 'flex', gap: 8 }}>
                <PillButton variant="primary" icon={ExternalLink} onClick={onView} disabled={!siteUrl} style={{ flex: 1 }}>View site</PillButton>
                <PillButton variant="secondary" icon={Share2} onClick={onShare} disabled={!siteUrl} style={{ flex: 1 }}>Share link</PillButton>
              </div>
            </div>
          </div>
        )}

        <section>
          <h2 className="oi-m-section" style={{ marginBottom: 12 }}>Guest suite</h2>
          <RowGroup>
            <Row icon={Clock} tile="sand" label="Schedule" sub="What guests see on the day" onClick={() => onOpen('suite-schedule')} />
            <Row icon={HelpCircle} tile="sand" label="Q&A" sub="Dress code, parking, the small questions" onClick={() => onOpen('qna')} />
            <Row icon={Gift} tile="sand" label="Registry" onClick={() => onOpen('registry')} />
            <Row icon={Hotel} tile="sand" label="Accommodation" onClick={() => onOpen('suite-accommodation')} />
            <Row icon={Car} tile="sand" label="Transport" onClick={() => onOpen('suite-transport')} />
            <Row icon={MapPin} tile="sand" label="Experience guide" onClick={() => onOpen('experience')} />
            <Row icon={ScrollText} tile="sand" label="Good to know" onClick={() => onOpen('good-to-know')} />
            <Row icon={BarChart2} tile="sand" label="Guest polls" onClick={() => onOpen('polls')} />
          </RowGroup>
        </section>

        <section>
          <h2 className="oi-m-section" style={{ marginBottom: 12 }}>Design</h2>
          <RowGroup>
            <Row icon={Palette} tile="blush" label="Choose a universe" sub="The look of your whole suite" onClick={() => onOpenDesktop('/studio/universe')} />
            <Row icon={LayoutTemplate} tile="blush" label="Website builder" sub="Best on desktop" onClick={() => onOpenDesktop('/studio/website')} />
            <Row icon={Sparkles} tile="blush" label="Ava studio" sub="Best on desktop" onClick={() => onOpenDesktop('/studio/ava')} />
          </RowGroup>
        </section>
        <PanelCard tone="sand" body="The builder and Ava studio need a bigger screen. Open them on a laptop and everything you change shows up here.">
          <Monitor size={18} strokeWidth={1.75} style={{ color: 'var(--m-text-2)' }} />
        </PanelCard>
      </div>
    </Screen>
  );
}
