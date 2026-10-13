import React, { useEffect, useState } from 'react';
import { ExternalLink, Palette, LayoutTemplate, Sparkles, Clock, HelpCircle, Gift, Hotel, Car, MapPin, ScrollText, BarChart2, Monitor, Lock, X } from 'lucide-react';
import Screen from '../../shell/Screen';
import { Row, RowGroup, PillButton, StatusPill, Skeleton, ErrorState, Switch } from '../../ui';
import { SitePreviewFrame, SitePreviewSheet } from './SitePreview';
import { prefGet, prefSet } from '../../native';
import { PUBLISH_STATE, PUBLISH_LABEL, PUBLISH_SENTENCE } from '@/lib/publishState';

/** The desktop-only note at the top (goal 8): closed once, hidden for good on this device. */
const NOTE_PREF = 'suite_desktop_note_closed';

/**
 * Guest Suite: a large preview of it in a rounded frame, the universe
 * and live status and a way to view it, then rows into the Guest Suite editors
 * (in the app) and the design tools (desktop). A slim note under the title
 * says the builder and Ava's Studio happen on a laptop; it closes once and
 * stays closed, and a small row at the bottom keeps the reminder.
 *
 * NO ADDRESS AND NO SHARE, as the web's share tab since #923: email from the
 * studio is the only way guests receive the site, so the screen neither
 * prints the address nor hands it to a share sheet or the clipboard.
 * View Guest Suite opens it for the couple themselves.
 */
export default function SiteScreen({ details, universeName, state = PUBLISH_STATE.NO_ADDRESS, siteUrl, coupleName, onView, onOpen, onOpenDesktop, onTogglePublish, passwordOn = false, onPassword, loading, error, onRetry }) {
  // src/lib/publishState.js: live is an address AND the switch on; no address never reads as hidden.
  const isLive = state === PUBLISH_STATE.LIVE;
  const [noteClosed, setNoteClosed] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);
  useEffect(() => { let live = true; prefGet(NOTE_PREF).then((v) => { if (live) setNoteClosed(v === '1'); }).catch(() => { if (live) setNoteClosed(false); }); return () => { live = false; }; }, []);
  const closeNote = () => { setNoteClosed(true); prefSet(NOTE_PREF, '1').catch(() => {}); };
  return (
    <Screen title="Guest Suite" root>
      <div className="oi-m-stack oi-m-stack--24">
        {!noteClosed && (
          <div className="oi-m-note" role="note">
            <Monitor size={18} strokeWidth={1.75} className="oi-m-note__icon" aria-hidden="true" />
            <p className="oi-m-note__text">Editing your Guest Suite and Ava's Studio happens on a laptop. Changes you make there show up here.</p>
            <button type="button" className="oi-m-note__close" onClick={closeNote} aria-label="Close this note"><X size={18} strokeWidth={1.75} /></button>
          </div>
        )}
        {error && !loading ? <ErrorState onRetry={onRetry} /> : loading ? <Skeleton kind="hero" /> : (
          <div className="oi-m-card oi-m-card--flush">
            {/* The desktop renderer, scaled into the tile (SitePreview.jsx); tap for the full preview. */}
            <div style={{ position: 'relative', padding: '12px 12px 0' }}>
              <SitePreviewFrame details={details} width={342} onOpen={() => setPreviewOpen(true)} />
              <div style={{ position: 'absolute', top: 24, right: 24 }} data-publish-state={state}><StatusPill tone={isLive ? 'ok' : 'light'}>{PUBLISH_LABEL[state]}</StatusPill></div>
            </div>
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <div className="oi-m-row__label">{coupleName || 'Your wedding'}</div>
                <div className="oi-m-row__sub">{universeName ? `${universeName} universe` : 'Choose a universe'}</div>
              </div>
              {!siteUrl && <p className="oi-m-meta">Your Guest Suite does not have an address yet. Choose one in the studio on desktop.</p>}
              <div className="oi-m-row" style={{ padding: 0, minHeight: 44, background: 'transparent' }}>
                <div className="oi-m-row__body"><div className="oi-m-row__label" data-publish-sentence={state}>{PUBLISH_SENTENCE[state]}</div><div className="oi-m-row__sub">{isLive ? 'Guests receive it by email when you send invites' : siteUrl ? 'Only you can see it until you go live' : 'Choose an address first'}</div></div>
                <Switch on={isLive} onChange={onTogglePublish} label={PUBLISH_SENTENCE[PUBLISH_STATE.LIVE]} />
              </div>
              <PillButton variant="primary" icon={ExternalLink} onClick={onView} disabled={!siteUrl} block>View Guest Suite</PillButton>
            </div>
          </div>
        )}

        {!loading && !error && (
          <section>
            <h2 className="oi-m-section" style={{ marginBottom: 12 }}>Privacy</h2>
            <RowGroup>
              <Row icon={Lock} tile="neutral" label="Password protection" sub={passwordOn ? 'On. Guests enter a password to open the Guest Suite' : 'Off. Guests open it from their invitation with no password'} onClick={onPassword} />
            </RowGroup>
          </section>
        )}

        <section>
          <h2 className="oi-m-section" style={{ marginBottom: 12 }}>Guest Suite</h2>
          <RowGroup>
            <Row icon={Clock} tile="neutral" label="Schedule" sub="What guests see on the day" onClick={() => onOpen('suite-schedule')} />
            <Row icon={HelpCircle} tile="neutral" label="Q&A" sub="Dress code, parking, the small questions" onClick={() => onOpen('qna')} />
            <Row icon={Gift} tile="neutral" label="Registry" onClick={() => onOpen('registry')} />
            <Row icon={Hotel} tile="neutral" label="Stay" onClick={() => onOpen('suite-accommodation')} />
            <Row icon={Car} tile="neutral" label="Getting here" onClick={() => onOpen('suite-transport')} />
            <Row icon={MapPin} tile="neutral" label="Experience guide" onClick={() => onOpen('experience')} />
            <Row icon={ScrollText} tile="neutral" label="Good to know" onClick={() => onOpen('good-to-know')} />
            <Row icon={BarChart2} tile="neutral" label="Guest polls" onClick={() => onOpen('polls')} />
          </RowGroup>
        </section>

        <section>
          <h2 className="oi-m-section" style={{ marginBottom: 12 }}>Design</h2>
          <RowGroup>
            <Row icon={Palette} tile="tint" label="Choose a universe" sub="The look of your whole suite" onClick={() => onOpenDesktop('/studio/universe')} />
            <Row icon={LayoutTemplate} tile="tint" label="Guest Suite" sub="Best on desktop" onClick={() => onOpenDesktop('/studio/website')} />
            <Row icon={Sparkles} tile="tint" label="Ava studio" sub="Best on desktop" onClick={() => onOpenDesktop('/studio/ava')} />
          </RowGroup>
        </section>
        <RowGroup>
          <Row icon={Monitor} tile="neutral" label="Edit on a laptop" sub="The builder and Ava's Studio need a bigger screen" onClick={() => onOpenDesktop('/studio/website')} />
        </RowGroup>
      </div>
      <SitePreviewSheet details={details} open={previewOpen} onClose={() => setPreviewOpen(false)} />
    </Screen>
  );
}
