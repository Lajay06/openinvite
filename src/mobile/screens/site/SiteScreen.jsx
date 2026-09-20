import React from 'react';
import { ExternalLink, Share2, Palette, LayoutTemplate, Sparkles, Clock, HelpCircle, Gift, Hotel, Car, MapPin, ScrollText, BarChart2, Monitor } from 'lucide-react';
import Screen from '../../shell/Screen';
import { Block, Row, PillButton, StatusPill, Skeleton, ErrorState } from '../../ui';

/**
 * Site: the universe, the guest site status, a preview image, view and
 * share, then rows into the parts of the site that are reasonable to edit
 * on a phone (they hand off to the desktop pages) and a row that says the
 * builder itself is a desktop tool.
 */
export default function SiteScreen({ universeName, isLive, slug, previewImage, siteUrl, onView, onShare, onOpenDesktop, loading, error, onRetry }) {
  return (
    <Screen title="Site">
      <div className="oi-m-stack oi-m-stack--16">
        {error && !loading ? <ErrorState onRetry={onRetry} /> : loading ? (
          <Skeleton kind="block" style={{ height: 260 }} />
        ) : (
          <div className="oi-m-block oi-m-block--flush">
            <div style={{ position: 'relative', aspectRatio: '4 / 3', background: 'var(--m-text)', overflow: 'hidden' }}>
              {previewImage && <img src={previewImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
            </div>
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ minWidth: 0 }}>
                  <p className="oi-m-meta">Universe</p>
                  <p className="oi-m-section" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{universeName || 'Not chosen yet'}</p>
                </div>
                <StatusPill tone={isLive ? 'ok' : 'neutral'}>{isLive ? 'Live' : 'Draft'}</StatusPill>
              </div>
              {siteUrl ? (
                <p className="oi-m-meta" style={{ overflowWrap: 'anywhere' }}>{siteUrl.replace(/^https?:\/\//, '')}</p>
              ) : (
                <p className="oi-m-meta">Your site does not have an address yet. Choose one in the studio on desktop.</p>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <PillButton variant="primary" icon={ExternalLink} onClick={onView} disabled={!siteUrl} style={{ flex: 1 }}>View site</PillButton>
                <PillButton variant="secondary" icon={Share2} onClick={onShare} disabled={!siteUrl} style={{ flex: 1 }}>Share link</PillButton>
              </div>
            </div>
          </div>
        )}

        <section>
          <h2 className="oi-m-section" style={{ marginBottom: 8 }}>Guest suite</h2>
          <div className="oi-m-block oi-m-block--flush">
            <Row icon={Clock} label="Schedule" sub="What guests see on the day" onClick={() => onOpenDesktop('/GuestSuiteSchedule')} />
            <Row icon={HelpCircle} label="Q&A" sub="Dress code, parking, the small questions" onClick={() => onOpenDesktop('/QandA')} />
            <Row icon={Gift} label="Registry" onClick={() => onOpenDesktop('/GuestSuiteRegistry')} />
            <Row icon={Hotel} label="Accommodation" onClick={() => onOpenDesktop('/GuestSuiteAccommodation')} />
            <Row icon={Car} label="Transport" onClick={() => onOpenDesktop('/GuestSuiteTransport')} />
            <Row icon={MapPin} label="Experience guide" onClick={() => onOpenDesktop('/GuestSuiteExperience')} />
            <Row icon={ScrollText} label="Good to know" onClick={() => onOpenDesktop('/GuestSuitePolicies')} />
            <Row icon={BarChart2} label="Guest polls" onClick={() => onOpenDesktop('/GuestSuitePolls')} />
          </div>
        </section>

        <section>
          <h2 className="oi-m-section" style={{ marginBottom: 8 }}>Design</h2>
          <div className="oi-m-block oi-m-block--flush">
            <Row icon={Palette} label="Choose a universe" sub="The look of your whole suite" onClick={() => onOpenDesktop('/studio/universe')} />
            <Row icon={LayoutTemplate} label="Website builder" sub="Best on desktop" onClick={() => onOpenDesktop('/studio/website')} />
            <Row icon={Sparkles} label="Ava studio" sub="Best on desktop" onClick={() => onOpenDesktop('/studio/ava')} />
          </div>
          <Block style={{ marginTop: 8 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <Monitor size={20} strokeWidth={1.75} style={{ flexShrink: 0, marginTop: 2, color: 'var(--m-text-2)' }} />
              <p className="oi-m-meta">The builder and Ava studio need a bigger screen. Open them on a laptop and everything you change shows up here.</p>
            </div>
          </Block>
        </section>
      </div>
    </Screen>
  );
}
